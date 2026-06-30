const { createClient } = require("@supabase/supabase-js");
const crypto = require("crypto");

const stores = ["members", "useCases", "testCases", "bugs", "tasks", "spMigrations", "catalogs"];
const defaultPassword = "BbQAGestor";
const sessionCookie = "qa_session";
const sessionTtlSeconds = 8 * 60 * 60;

const spMigrationTransitions = {
  "SQL recibido": ["REST/gRPC recibido", "Finalizado"],
  "REST/gRPC recibido": ["En QA", "Finalizado"],
  "En QA": ["Matriz lista", "En revision por banco", "Finalizado"],
  "Matriz lista": ["Evidencia QMetry", "En revision por banco", "Finalizado"],
  "Evidencia QMetry": ["En revision por banco", "Finalizado"],
  "En revision por banco": ["Finalizado"],
  "Finalizado": []
};

function supabase() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Faltan SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en variables de entorno.");
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
}

module.exports = async function handler(req, res) {
  try {
    const parts = apiParts(req);
    if (parts.join("/") === "auth/login" && req.method === "POST") return handleLogin(req, res);
    if (parts.join("/") === "auth/logout" && req.method === "POST") return handleLogout(res);
    if (parts.join("/") === "auth/me" && req.method === "GET") return handleMe(req, res);

    const user = await currentUser(req);
    if (!user) return sendJson(res, 401, { error: "No autenticado" });

    if (req.method === "GET") return handleGet(req, res, parts);
    if (req.method === "POST") return handleCreate(req, res, parts);
    if (req.method === "PUT") return handleUpdate(req, res, parts);
    if (req.method === "DELETE") return handleDelete(req, res, parts);
    return sendJson(res, 405, { error: "Metodo no permitido" });
  } catch (error) {
    return sendJson(res, 500, { error: error.message || "Error interno" });
  }
};
const defaultSpMigrationStatuses = new Set(Object.keys(spMigrationTransitions));

async function handleLogin(req, res) {
  const { email = "", password = "" } = req.body || {};
  if (password !== defaultPassword) {
    return sendJson(res, 401, { error: "Credenciales invalidas" });
  }

  const user = await userFromEmail(email);
  if (!user) return sendJson(res, 401, { error: "Credenciales invalidas" });

  res.setHeader("Set-Cookie", cookieHeader(signSession(user.email)));
  return sendJson(res, 200, { user });
}

function handleLogout(res) {
  res.setHeader("Set-Cookie", clearCookieHeader());
  return sendJson(res, 200, { ok: true });
}

async function handleMe(req, res) {
  const user = await currentUser(req);
  if (!user) return sendJson(res, 401, { error: "No autenticado" });
  return sendJson(res, 200, { user });
}

async function handleGet(req, res, parts) {
  if (parts.length === 1 && parts[0] === "data") {
    return sendJson(res, 200, await getAllData());
  }
  if (parts.length === 1 && parts[0] === "export") {
    const data = await getAllData();
    const filename = `gestor-qa-${new Date().toISOString().slice(0, 10)}.json`;
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    return res.status(200).send(JSON.stringify(data, null, 2));
  }
  return sendJson(res, 404, { error: "Ruta GET no encontrada" });
}

async function handleCreate(req, res, parts) {
  if (parts.length !== 1 || !stores.includes(parts[0])) {
    return sendJson(res, 400, { error: "Ruta de escritura invalida" });
  }
  const payload = { ...(req.body || {}) };
  delete payload.id;
  const record = await saveRecord(parts[0], payload);
  return sendJson(res, 201, record);
}

async function handleUpdate(req, res, parts) {
  const route = recordRoute(req, parts);
  if (!route || !stores.includes(route.store)) {
    return sendJson(res, 400, { error: "Ruta de escritura invalida" });
  }
  const { store, recordId } = route;
  const existing = await getRecord(store, recordId);

  const payload = { ...(existing || {}), ...(req.body || {}), id: recordId };
  if (store === "spMigrations" && existing && existing.status !== payload.status) {
    validateSpTransition(existing.status, payload.status);
  }

  const record = await saveRecord(store, payload, recordId);
  return sendJson(res, 200, record);
}

async function handleDelete(req, res, parts) {
  const route = recordRoute(req, parts);
  if (!route || !stores.includes(route.store)) {
    return sendJson(res, 400, { error: "Ruta DELETE invalida" });
  }
  const { store, recordId } = route;
  const { error } = await supabase().from(store).delete().eq("id", recordId);
  if (error) throw error;
  return res.status(204).end();
}

async function currentUser(req) {
  const token = parseCookies(req.headers.cookie || "")[sessionCookie];
  const email = verifySession(token || "");
  return email ? userFromEmail(email) : null;
}

async function userFromEmail(email) {
  const normalizedEmail = String(email || "").trim().toLowerCase();
  if (!normalizedEmail) return null;
  const members = await listRecords("members");
  const member = members.find((item) => String(item.email || "").trim().toLowerCase() === normalizedEmail);
  if (!member) return null;
  return {
    id: member.id || "",
    name: member.name || "",
    email: member.email || "",
    role: member.role || ""
  };
}

function signSession(email) {
  const expiresAt = Math.floor(Date.now() / 1000) + sessionTtlSeconds;
  const payload = `${String(email).trim().toLowerCase()}|${expiresAt}`;
  const signature = crypto.createHmac("sha256", defaultPassword).update(payload).digest("hex");
  return Buffer.from(`${payload}|${signature}`, "utf8").toString("base64url");
}

function verifySession(token) {
  try {
    const decoded = Buffer.from(token, "base64url").toString("utf8");
    const parts = decoded.split("|");
    if (parts.length !== 3) return null;
    const [email, expiresAt, signature] = parts;
    if (Number(expiresAt) < Math.floor(Date.now() / 1000)) return null;
    const payload = `${email}|${expiresAt}`;
    const expected = crypto.createHmac("sha256", defaultPassword).update(payload).digest("hex");
    const signatureBytes = Buffer.from(signature);
    const expectedBytes = Buffer.from(expected);
    if (signatureBytes.length !== expectedBytes.length) return null;
    return crypto.timingSafeEqual(signatureBytes, expectedBytes) ? email : null;
  } catch {
    return null;
  }
}

function parseCookies(header) {
  return Object.fromEntries(
    String(header || "")
      .split(";")
      .map((part) => part.trim())
      .filter((part) => part.includes("="))
      .map((part) => {
        const [key, ...value] = part.split("=");
        return [key, value.join("=")];
      })
  );
}

function cookieHeader(token) {
  return `${sessionCookie}=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${sessionTtlSeconds}`;
}

function clearCookieHeader() {
  return `${sessionCookie}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0`;
}

async function getAllData() {
  const entries = await Promise.all(stores.map(async (store) => [store, await listRecords(store)]));
  return Object.fromEntries(entries);
}

async function listRecords(store) {
  const { data, error } = await supabase()
    .from(store)
    .select("id,payload,created_at,updated_at")
    .order("created_at", { ascending: true });
  if (error && store === "catalogs" && isMissingTableError(error)) return [];
  if (error) throw error;
  return data.map(rowToRecord);
}

async function getRecord(store, recordId) {
  const { data, error } = await supabase()
    .from(store)
    .select("id,payload,created_at,updated_at")
    .eq("id", recordId)
    .maybeSingle();
  if (error) throw error;
  return data ? rowToRecord(data) : null;
}

async function saveRecord(store, record, recordId = null) {
  const row = { payload: record };
  if (recordId) row.id = recordId;

  const query = recordId
    ? supabase().from(store).upsert({ ...row, id: recordId })
    : supabase().from(store).insert(row);

  const { data, error } = await query.select("id,payload,created_at,updated_at").single();
  if (error && store === "catalogs" && isMissingTableError(error)) {
    throw new Error("Falta ejecutar la migracion de Supabase para crear la tabla catalogs.");
  }
  if (error) throw error;
  return rowToRecord(data);
}

function isMissingTableError(error) {
  return error?.code === "42P01" || /relation .* does not exist/i.test(error?.message || "");
}

function rowToRecord(row) {
  return {
    ...(row.payload || {}),
    id: row.id,
    createdAt: row.payload?.createdAt || row.created_at,
    updatedAt: row.payload?.updatedAt || row.updated_at
  };
}

function validateSpTransition(oldStatus, newStatus) {
  if (oldStatus === newStatus || !oldStatus) return;
  if (!defaultSpMigrationStatuses.has(oldStatus) || !defaultSpMigrationStatuses.has(newStatus)) return;
  const allowed = spMigrationTransitions[oldStatus] || [];
  if (!allowed.includes(newStatus)) {
    throw new Error(`Transicion invalida: no se puede ir de "${oldStatus}" a "${newStatus}"`);
  }
}

function apiParts(req) {
  const raw = req.query?.path;
  if (Array.isArray(raw)) return raw.filter(Boolean);
  if (typeof raw === "string") return raw.split("/").filter(Boolean);
  if (req.query?.store && req.query?.id) return [req.query.store, req.query.id].filter(Boolean);
  if (req.query?.store) return [req.query.store].filter(Boolean);
  return req.url.split("?")[0].replace(/^\/api\/?/, "").split("/").filter(Boolean);
}

function recordRoute(req, parts) {
  if (parts.length === 2) return { store: parts[0], recordId: parts[1] };
  const recordId = queryParam(req, "id");
  if (parts.length === 1 && recordId) return { store: parts[0], recordId };
  return null;
}

function queryParam(req, name) {
  const value = req.query?.[name];
  return Array.isArray(value) ? value[0] : value;
}

function sendJson(res, status, payload) {
  return res.status(status).json(payload);
}
