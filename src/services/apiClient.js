// API client and persistence helpers for the Vercel serverless backend.

async function api(path, options = {}) {
  const response = await fetch(path, {
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    credentials: "same-origin",
    ...options
  });
  if (!response.ok) {
    const message = await readErrorMessage(response);
    if (response.status === 401 && !path.startsWith("/api/auth/")) {
      showLogin();
    }
    throw new Error(message || `Error HTTP ${response.status}`);
  }
  if (response.status === 204) return null;
  return response.json();
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
  state.data = await api("/api/data");
  state.data.catalogs ||= [];
  catalogs = loadCatalogsFromRecords(state.data.catalogs);
  refreshCatalogDerivedState();
}

async function saveRecord(store, record) {
  const editing = Boolean(record.id);
  const url = editing ? `/api/${store}?id=${encodeURIComponent(record.id)}` : `/api/${store}`;
  const method = editing ? "PUT" : "POST";

  return api(url, { method, body: JSON.stringify(record) });
}

async function deleteRecord(store, recordId) {
  return api(`/api/${store}?id=${encodeURIComponent(recordId)}`, { method: "DELETE" });
}
