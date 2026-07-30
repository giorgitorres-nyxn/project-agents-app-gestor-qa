const { stores, validateSpTransition } = require("../src/domain/projectConfig");
const {
  clearCookieHeader,
  cookieHeader,
  currentUser,
  defaultPassword,
  signSession,
  userFromEmail
} = require("./_lib/auth");
const { apiParts, recordRoute, sendJson } = require("./_lib/http");
const {
  deleteRecord,
  getAllData,
  getRecord,
  saveRecord
} = require("./_lib/recordsRepository");
const { canUseSqlConsole, runSqlConsole } = require("./_lib/sqlConsole");

module.exports = async function handler(req, res) {
  try {
    const parts = apiParts(req);
    if (parts.join("/") === "auth/login" && req.method === "POST") return handleLogin(req, res);
    if (parts.join("/") === "auth/logout" && req.method === "POST") return handleLogout(res);
    if (parts.join("/") === "auth/me" && req.method === "GET") return handleMe(req, res);

    const user = await currentUser(req);
    if (!user) return sendJson(res, 401, { error: "No autenticado" });

    if (parts.join("/") === "sql-console" && req.method === "POST") return handleSqlConsole(req, res, user);

    if (req.method === "GET") return handleGet(res, parts);
    if (req.method === "POST") return handleCreate(req, res, parts);
    if (req.method === "PUT") return handleUpdate(req, res, parts);
    if (req.method === "DELETE") return handleDelete(req, res, parts);
    return sendJson(res, 405, { error: "Metodo no permitido" });
  } catch (error) {
    return sendJson(res, 500, { error: error.message || "Error interno" });
  }
};

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

async function handleGet(res, parts) {
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
  await deleteRecord(route.store, route.recordId);
  return res.status(204).end();
}

async function handleSqlConsole(req, res, user) {
  if (!canUseSqlConsole(user)) {
    return sendJson(res, 403, { error: "Solo roles administrativos pueden usar la consola Supabase." });
  }

  const query = String(req.body?.query || "").trim();
  if (!query) return sendJson(res, 400, { error: "Escribe una consulta SQL para ejecutar." });
  if (query.length > 20000) return sendJson(res, 400, { error: "La consulta supera el limite de 20000 caracteres." });

  return sendJson(res, 200, await runSqlConsole(query));
}
