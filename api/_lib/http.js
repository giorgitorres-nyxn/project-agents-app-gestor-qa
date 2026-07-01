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

module.exports = {
  apiParts,
  parseCookies,
  recordRoute,
  sendJson
};
