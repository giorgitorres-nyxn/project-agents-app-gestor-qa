// API client and persistence helpers for the Vercel serverless backend.

async function api(path, options = {}) {
  const {
    headers,
    loadingMessage,
    skipLoading,
    ...requestOptions
  } = options;
  const stop = skipLoading ? null : startLoading(loadingMessage || loadingMessageForRequest(path, requestOptions));
  try {
    const response = await fetch(path, {
      ...requestOptions,
      headers: { "Content-Type": "application/json", ...(headers || {}) },
      credentials: requestOptions.credentials || "same-origin"
    });
    if (!response.ok) {
      const message = await readErrorMessage(response);
      if (response.status === 401 && !path.startsWith("/api/auth/")) {
        showLogin();
      }
      throw new Error(message || `Error HTTP ${response.status}`);
    }
    if (response.status === 204) return null;
    return await response.json();
  } finally {
    stop?.();
  }
}

async function readErrorMessage(response) {
  const text = await response.text();
  if (!text) return "";
  try {
    return JSON.parse(text).error || text;
  } catch {
    return text;
  }
}

async function refreshData() {
  state.data = await api("/api/data", { loadingMessage: "Consultando informacion" });
  state.data.catalogs ||= [];
  catalogs = loadCatalogsFromRecords(state.data.catalogs);
  refreshCatalogDerivedState();
}

async function saveRecord(store, record) {
  const editing = Boolean(record.id);
  const url = editing ? `/api/${store}?id=${encodeURIComponent(record.id)}` : `/api/${store}`;
  const method = editing ? "PUT" : "POST";

  return api(url, { method, body: JSON.stringify(record), loadingMessage: editing ? "Guardando cambios" : "Creando registro" });
}

async function deleteRecord(store, recordId) {
  return api(`/api/${store}?id=${encodeURIComponent(recordId)}`, { method: "DELETE", loadingMessage: "Eliminando registro" });
}

function loadingMessageForRequest(path, options = {}) {
  const method = String(options.method || "GET").toUpperCase();
  if (path.includes("/auth/login")) return "Validando acceso";
  if (path.includes("/auth/logout")) return "Cerrando sesion";
  if (path.includes("/sql-console")) return "Ejecutando consulta";
  if (method === "GET") return "Consultando informacion";
  if (method === "POST") return "Procesando solicitud";
  if (method === "PUT") return "Guardando cambios";
  if (method === "DELETE") return "Eliminando registro";
  return "Procesando informacion";
}
