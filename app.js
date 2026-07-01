const {
  stores,
  catalogDefinitions,
  spTransitionError
} = window.GestorQAProject;

const sqlConsoleSection = "sqlConsole";
const configurationSections = ["tasks", "spMigrations", "testCases", "useCases", "bugs", "members", sqlConsoleSection];
const sqlConsoleExamples = [
  {
    label: "SPs",
    query: 'select id, payload->>\'spName\' as sp_name, payload->>\'status\' as status, created_at from public."spMigrations" order by created_at desc limit 20'
  },
  {
    label: "Bugs",
    query: "select id, payload->>'title' as title, payload->>'severity' as severity, payload->>'status' as status from public.bugs order by created_at desc limit 20"
  },
  {
    label: "TC01",
    query: "select id, payload from public.\"testCases\" where payload->>'code' = 'TC01' limit 5"
  }
];
let catalogs = defaultCatalogs();
let statusLabels = taskStatusLabels();
let spMigrationStatuses = catalogValues("spMigrations", "status");

const viewConfig = {
  tasks: {
    title: "Tareas",
    kicker: "Asignacion",
    store: "tasks",
    columns: ["Titulo", "SP asignado", "Responsable", "Estado", "Prioridad", "Vence", ""]
  },
  spMigrations: {
    title: "Migracion de SP",
    kicker: "Seguimiento tecnico",
    store: "spMigrations",
    columns: ["SP", "Dev", "QA", "Estado", "SQL", "REST", "gRPC", "Matriz", "QMetry", ""]
  },
  testCases: {
    title: "Casos de prueba",
    kicker: "Validacion",
    store: "testCases",
    columns: ["SP del CP", "Codigo", "Nombre", "Estado", "Ejecucion", "Aprobado Banco", "Prioridad", "Observacion", ""]
  },
  useCases: {
    title: "Casos de uso",
    kicker: "Producto",
    store: "useCases",
    columns: ["SP", "Codigo", "Nombre", "Estado", "Prioridad", "Observacion", ""]
  },
  bugs: {
    title: "Errores detectados",
    kicker: "Incidencias",
    store: "bugs",
    columns: ["Titulo", "SP", "Caso de prueba", "Severidad", "Estado", "Responsable", ""]
  },
  members: {
    title: "Miembros QA",
    kicker: "Equipo",
    store: "members",
    columns: ["Nombre", "Rol", "Estado", "Carga", "Correo", ""]
  }
};

const bulkImportStores = new Set(["spMigrations", "testCases", "useCases", "bugs"]);
const bulkImportGroupStores = ["spMigrations", "useCases", "testCases", "bugs"];
const defaultPageSize = 25;
const pageSizeOptions = [10, 25, 50, 100];
const inlineEditableFields = {
  testCases: new Set(["status", "executionStatus", "bankApproval"])
};

let fieldConfig = {
  tasks: [
    { name: "title", label: "Titulo", type: "text", required: true, full: true },
    { name: "spMigrationId", label: "SP asignado", type: "spMigration" },
    { name: "memberId", label: "Responsable", type: "member" },
    { name: "status", label: "Estado", type: "select", catalogStore: "tasks", catalogField: "status", options: catalogOptions("tasks", "status") },
    { name: "priority", label: "Prioridad", type: "select", catalogStore: "tasks", catalogField: "priority", options: catalogOptions("tasks", "priority") },
    { name: "dueDate", label: "Fecha limite", type: "date" },
    { name: "kind", label: "Tipo", type: "select", catalogStore: "tasks", catalogField: "kind", options: catalogOptions("tasks", "kind") },
    { name: "description", label: "Descripcion", type: "textarea", full: true }
  ],
  spMigrations: [
    { name: "spName", label: "Nombre del SP", type: "text", required: true },
    { name: "sqlReceivedDate", label: "Fecha recepción SQL", type: "date" },
    { name: "sqlReceived", label: "SQL recibido", type: "checkbox" },
    { name: "devName", label: "Dev asignado", type: "text", required: true },
    { name: "qaId", label: "QA asignado", type: "member" },
    { name: "status", label: "Estado", type: "select", catalogStore: "spMigrations", catalogField: "status", options: catalogOptions("spMigrations", "status") },
    { name: "restReceivedDate", label: "Fecha recepción REST", type: "date" },
    { name: "restReceived", label: "REST endpoint recibido", type: "checkbox" },
    { name: "grpcReceivedDate", label: "Fecha recepción gRPC", type: "date" },
    { name: "grpcReceived", label: "gRPC method recibido", type: "checkbox" },
    { name: "equivalenceMatrixReady", label: "Matriz de equivalencia lista", type: "checkbox" },
    { name: "qmetryEvidenceReady", label: "Evidencia cargada a QMetry", type: "checkbox" },
    { name: "notes", label: "Notas QA", type: "textarea", full: true }
  ],
  testCases: [
    { name: "spMigrationId", label: "SP asociado", type: "spMigration" },
    { name: "code", label: "Codigo", type: "text", required: true },
    { name: "name", label: "Nombre", type: "text", required: true },
    { name: "useCaseId", label: "Caso de uso", type: "useCase" },
    { name: "status", label: "Estado", type: "select", catalogStore: "testCases", catalogField: "status", options: catalogOptions("testCases", "status") },
    { name: "executionStatus", label: "Ejecucion", type: "select", catalogStore: "testCases", catalogField: "executionStatus", options: catalogOptions("testCases", "executionStatus"), default: "", emptyLabel: "Sin ejecutar" },
    { name: "bankApproval", label: "Aprobado Banco", type: "select", catalogStore: "testCases", catalogField: "bankApproval", options: catalogOptions("testCases", "bankApproval"), default: "No Aprobado" },
    { name: "priority", label: "Prioridad", type: "select", catalogStore: "testCases", catalogField: "priority", options: catalogOptions("testCases", "priority") },
    { name: "observation", label: "Observacion", type: "textarea", full: true },
    { name: "steps", label: "Pasos", type: "textarea", full: true },
    { name: "expected", label: "Resultado esperado", type: "textarea", full: true }
  ],
  useCases: [
    { name: "spMigrationId", label: "SP asociado", type: "spMigration" },
    { name: "code", label: "Codigo", type: "text", required: true },
    { name: "name", label: "Nombre", type: "text", required: true },
    { name: "actor", label: "Actor", type: "text" },
    { name: "status", label: "Estado", type: "select", catalogStore: "useCases", catalogField: "status", options: catalogOptions("useCases", "status") },
    { name: "priority", label: "Prioridad", type: "select", catalogStore: "useCases", catalogField: "priority", options: catalogOptions("useCases", "priority") },
    { name: "observation", label: "Observacion", type: "textarea", full: true },
    { name: "goal", label: "Objetivo", type: "textarea", full: true },
    { name: "flow", label: "Flujo principal", type: "textarea", full: true }
  ],
  bugs: [
    { name: "title", label: "Titulo", type: "text", required: true, full: true },
    { name: "spMigrationId", label: "SP asociado", type: "spMigration" },
    { name: "testCaseId", label: "Caso de prueba", type: "testCase", filterBySp: true },
    { name: "memberId", label: "Responsable", type: "member" },
    { name: "severity", label: "Severidad", type: "select", catalogStore: "bugs", catalogField: "severity", options: catalogOptions("bugs", "severity") },
    { name: "status", label: "Estado", type: "select", catalogStore: "bugs", catalogField: "status", options: catalogOptions("bugs", "status") },
    { name: "description", label: "Descripcion", type: "textarea", full: true },
    { name: "steps", label: "Como reproducir", type: "textarea", full: true }
  ],
  members: [
    { name: "name", label: "Nombre", type: "text", required: true },
    { name: "role", label: "Rol", type: "select", catalogStore: "members", catalogField: "role", options: catalogOptions("members", "role") },
    { name: "email", label: "Correo", type: "email" },
    { name: "status", label: "Estado", type: "select", catalogStore: "members", catalogField: "status", options: catalogOptions("members", "status") },
    { name: "capacity", label: "Carga de trabajo (%)", type: "number", min: 0, max: 100 },
    { name: "focus", label: "Enfoque actual", type: "textarea", full: true }
  ]
};

const listFilterFields = {
  tasks: [
    { key: "title", label: "Titulo" },
    { key: "spMigration", label: "SP asignado" },
    { key: "member", label: "Responsable" },
    { key: "status", label: "Estado" },
    { key: "priority", label: "Prioridad" },
    { key: "dueDate", label: "Vence" },
    { key: "kind", label: "Tipo" },
    { key: "description", label: "Descripcion" }
  ],
  spMigrations: [
    { key: "spName", label: "SP" },
    { key: "devName", label: "Dev" },
    { key: "qa", label: "QA" },
    { key: "status", label: "Estado" },
    { key: "sql", label: "SQL" },
    { key: "rest", label: "REST" },
    { key: "grpc", label: "gRPC" },
    { key: "matrix", label: "Matriz" },
    { key: "qmetry", label: "QMetry" },
    { key: "notes", label: "Notas" }
  ],
  testCases: [
    { key: "spMigration", label: "SP del CP" },
    { key: "code", label: "Codigo" },
    { key: "name", label: "Nombre" },
    { key: "useCase", label: "Caso de uso" },
    { key: "status", label: "Estado" },
    { key: "executionStatus", label: "Ejecucion" },
    { key: "bankApproval", label: "Aprobado Banco" },
    { key: "priority", label: "Prioridad" },
    { key: "observation", label: "Observacion" },
    { key: "steps", label: "Pasos" },
    { key: "expected", label: "Resultado esperado" }
  ],
  useCases: [
    { key: "spMigration", label: "SP" },
    { key: "code", label: "Codigo" },
    { key: "name", label: "Nombre" },
    { key: "actor", label: "Actor" },
    { key: "status", label: "Estado" },
    { key: "priority", label: "Prioridad" },
    { key: "observation", label: "Observacion" },
    { key: "goal", label: "Objetivo" },
    { key: "flow", label: "Flujo principal" }
  ],
  bugs: [
    { key: "title", label: "Titulo" },
    { key: "spMigration", label: "SP" },
    { key: "testCase", label: "Caso de prueba" },
    { key: "severity", label: "Severidad" },
    { key: "status", label: "Estado" },
    { key: "member", label: "Responsable" },
    { key: "description", label: "Descripcion" },
    { key: "steps", label: "Como reproducir" }
  ],
  members: [
    { key: "name", label: "Nombre" },
    { key: "role", label: "Rol" },
    { key: "status", label: "Estado" },
    { key: "capacity", label: "Carga" },
    { key: "email", label: "Correo" },
    { key: "focus", label: "Enfoque actual" }
  ]
};

let state = {
  activeView: "dashboard",
  listView: "tasks",
  configurationSection: "tasks",
  customFilters: Object.fromEntries(stores.map((store) => [store, []])),
  search: "",
  indicatorsSpMigrationId: "",
  editing: null,
  importingStore: null,
  sqlConsole: {
    query: sqlConsoleExamples[0].query,
    result: null,
    error: "",
    running: false
  },
  currentUser: null,
  pagination: Object.fromEntries(stores.map((store) => [store, { page: 1, pageSize: defaultPageSize }])),
  data: Object.fromEntries(stores.map((store) => [store, []]))
};

const $ = (selector) => document.querySelector(selector);

function defaultCatalogs() {
  return Object.fromEntries(Object.entries(catalogDefinitions).map(([store, section]) => [
    store,
    Object.fromEntries(Object.entries(section.fields).map(([field, config]) => [field, normalizeCatalogItems(config.defaults)]))
  ]));
}

function mergeCatalogs(defaults, saved) {
  const merged = structuredCloneSafe(defaults);
  Object.entries(catalogDefinitions).forEach(([store, section]) => {
    Object.keys(section.fields).forEach((field) => {
      const savedItems = normalizeCatalogItems(saved?.[store]?.[field] || []);
      if (savedItems.length) merged[store][field] = savedItems;
    });
  });
  return merged;
}

function normalizeCatalogItems(items) {
  return (items || [])
    .map((item) => {
      if (typeof item === "string") return { value: item, label: item };
      return {
        value: String(item?.value || item?.label || "").trim(),
        label: String(item?.label || item?.value || "").trim()
      };
    })
    .filter((item) => item.value && item.label);
}

function structuredCloneSafe(value) {
  return JSON.parse(JSON.stringify(value));
}

function loadCatalogsFromRecords(records) {
  const saved = {};
  (records || []).forEach((record) => {
    const store = record.store;
    const field = record.field;
    if (!catalogDefinitions[store]?.fields?.[field]) return;
    saved[store] ||= {};
    saved[store][field] = record.items;
  });
  return mergeCatalogs(defaultCatalogs(), saved);
}

async function saveCatalogField(store, fieldKey) {
  const record = catalogRecordFor(store, fieldKey);
  const payload = {
    ...(record || {}),
    store,
    field: fieldKey,
    items: catalogOptions(store, fieldKey)
  };
  const savedRecord = await saveRecord("catalogs", payload);
  mergeImportedRecord("catalogs", savedRecord);
  refreshCatalogDerivedState();
}

function catalogRecordFor(store, fieldKey) {
  return (state.data.catalogs || []).find((record) => record.store === store && record.field === fieldKey);
}

function refreshCatalogDerivedState() {
  statusLabels = taskStatusLabels();
  spMigrationStatuses = catalogValues("spMigrations", "status");
  fieldConfig = refreshFieldConfigOptions(fieldConfig);
}

function refreshFieldConfigOptions(config) {
  Object.values(config).forEach((fields) => {
    fields.forEach((field) => {
      if (field.catalogStore && field.catalogField) {
        field.options = catalogOptions(field.catalogStore, field.catalogField);
      }
    });
  });
  return config;
}

function catalogOptions(store, field) {
  return catalogs?.[store]?.[field] || defaultCatalogs()[store]?.[field] || [];
}

function catalogValues(store, field) {
  return catalogOptions(store, field).map((item) => item.value);
}

function catalogLabel(store, field, value) {
  const text = String(value ?? "");
  return catalogOptions(store, field).find((item) => item.value === text)?.label || text;
}

function taskStatusLabels() {
  return Object.fromEntries(catalogOptions("tasks", "status").map((item) => [item.value, item.label]));
}

document.addEventListener("DOMContentLoaded", async () => {
  bindEvents();
  await initializeAuth();
});

function validateSPStatusTransition(oldStatus, newStatus) {
  return spTransitionError(oldStatus, newStatus);
}

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

async function initializeAuth() {
  try {
    const session = await api("/api/auth/me");
    state.currentUser = session.user;
    await refreshData();
    showApp();
    render();
  } catch {
    showLogin();
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

  if (editing && store === "spMigrations") {
    const storeData = state.data[store] ?? [];
    const existing = storeData.find((item) => item.id === record.id);
    if (existing && existing.status !== record.status) {
      const error = validateSPStatusTransition(existing.status, record.status);
      if (error) throw new Error(error);
    }
  }

  return api(url, { method, body: JSON.stringify(record) });
}

async function deleteRecord(store, recordId) {
  return api(`/api/${store}?id=${encodeURIComponent(recordId)}`, { method: "DELETE" });
}

function bindEvents() {
  $("#login-form").addEventListener("submit", handleLoginSubmit);
  document.querySelectorAll(".nav-item").forEach((button) => {
    button.addEventListener("click", () => setView(button.dataset.view));
  });

  $("#new-item").addEventListener("click", () => openEditor(state.activeView === "dashboard" ? "tasks" : state.listView));
  $("#quick-task").addEventListener("click", () => openEditor("tasks"));
  $("#global-search").addEventListener("input", (event) => {
    state.search = event.target.value.trim().toLowerCase();
    resetAllPages();
    render();
  });
  $("#export-data").addEventListener("click", exportData);
  $("#bulk-import").addEventListener("click", () => openBulkImport(state.listView));
  $("#import-form").addEventListener("submit", handleBulkImportSubmit);
  $("#choose-import-file").addEventListener("click", () => $("#import-file").click());
  $("#load-import-example").addEventListener("click", loadBulkImportExample);
  $("#import-file").addEventListener("change", handleImportFileChange);
  $("#item-form").addEventListener("submit", handleFormSubmit);
  $("#delete-item").addEventListener("click", handleDelete);
  $("#logout").addEventListener("click", handleLogout);
}

async function handleLoginSubmit(event) {
  event.preventDefault();
  await submitLoginForm();
}

async function submitLoginForm() {
  const form = $("#login-form");
  if (!form.reportValidity()) return;
  const formData = new FormData(form);
  const submitButton = $("#login-submit");
  setLoginError("");
  submitButton.disabled = true;
  submitButton.textContent = "Ingresando";

  try {
    const session = await api("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({
        email: formData.get("email"),
        password: formData.get("password")
      })
    });
    state.currentUser = session.user;
    await refreshData();
    form.reset();
    showApp();
    render();
  } catch (error) {
    setLoginError(error.message || "No se pudo iniciar sesion.");
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = "Ingresar";
  }
}

async function handleLogout() {
  try {
    await api("/api/auth/logout", { method: "POST", body: JSON.stringify({}) });
  } finally {
    state.currentUser = null;
    state.data = Object.fromEntries(stores.map((store) => [store, []]));
    showLogin();
  }
}

function showApp() {
  $("#login-view").classList.add("hidden");
  $("#app-shell").classList.remove("hidden");
  $("#current-user").textContent = state.currentUser?.email || "";
  setLoginError("");
}

function showLogin() {
  $("#app-shell").classList.add("hidden");
  $("#login-view").classList.remove("hidden");
  $("#login-email").focus();
}

function setLoginError(message) {
  const error = $("#login-error");
  error.textContent = message;
  error.classList.toggle("hidden", !message);
}

function setView(view) {
  state.activeView = view;
  if (!["dashboard", "indicators", "configuration"].includes(view)) {
    state.listView = view;
  }
  document.querySelectorAll(".nav-item").forEach((item) => item.classList.toggle("active", item.dataset.view === view));
  render();
}

function render() {
  const isDashboard = state.activeView === "dashboard";
  const isIndicators = state.activeView === "indicators";
  const isConfiguration = state.activeView === "configuration";
  $("#dashboard-view").classList.toggle("active-view", isDashboard);
  $("#indicators-view").classList.toggle("active-view", isIndicators);
  $("#configuration-view").classList.toggle("active-view", isConfiguration);
  $("#list-view").classList.toggle("active-view", !isDashboard && !isIndicators && !isConfiguration);
  $("#new-item").classList.toggle("hidden", isIndicators || isConfiguration);
  $("#bulk-import").classList.toggle("hidden", isDashboard || isIndicators || isConfiguration || !bulkImportStores.has(state.listView));
  $("#new-item").textContent = state.activeView === "dashboard" ? "Nueva tarea" : "Nuevo";
  $("#page-title").textContent = isDashboard ? "Tablero QA" : isIndicators ? "Indicadores" : isConfiguration ? "Configuracion" : viewConfig[state.listView].title;

  if (isDashboard) {
    renderMetrics();
    renderKanban();
  }
  if (isIndicators) renderIndicators();
  if (isConfiguration) renderConfiguration();
  if (!isDashboard && !isIndicators && !isConfiguration) renderList();
}

function renderConfiguration() {
  const sectionKey = state.configurationSection;
  const section = catalogDefinitions[sectionKey];
  const container = $("#configuration-content");
  if (!container || (sectionKey !== sqlConsoleSection && !section)) return;

  container.innerHTML = `
    <div class="configuration-layout">
      <aside class="config-menu" aria-label="Submenus de configuracion">
        ${configurationSections.map((key) => `
          <button class="config-menu-item ${key === sectionKey ? "active" : ""}" type="button" data-config-section="${escapeHtml(key)}">
            ${escapeHtml(configurationSectionTitle(key))}
          </button>
        `).join("")}
      </aside>
      ${sectionKey === sqlConsoleSection ? sqlConsolePanel() : catalogConfigPanel(sectionKey, section)}
    </div>
  `;

  container.querySelectorAll("[data-config-section]").forEach((button) => {
    button.addEventListener("click", () => {
      state.configurationSection = button.dataset.configSection;
      renderConfiguration();
    });
  });
  if (sectionKey === sqlConsoleSection) {
    bindSqlConsole(container);
    return;
  }
  container.querySelectorAll("[data-catalog-add]").forEach((button) => {
    button.addEventListener("click", () => addCatalogItem(button.dataset.store, button.dataset.field));
  });
  container.querySelectorAll("[data-catalog-input]").forEach((input) => {
    input.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        addCatalogItem(input.dataset.store, input.dataset.field);
      }
    });
  });
  container.querySelectorAll("[data-catalog-save]").forEach((button) => {
    button.addEventListener("click", () => updateCatalogItem(button.dataset.store, button.dataset.field, button.dataset.value));
  });
  container.querySelectorAll("[data-catalog-delete]").forEach((button) => {
    button.addEventListener("click", () => deleteCatalogItem(button.dataset.store, button.dataset.field, button.dataset.value));
  });
}

function configurationSectionTitle(key) {
  if (key === sqlConsoleSection) return "Consola Supabase";
  return catalogDefinitions[key]?.title || key;
}

function catalogConfigPanel(sectionKey, section) {
  return `
    <section class="panel config-panel">
      <div class="panel-heading">
        <div>
          <p class="eyebrow">Listas editables</p>
          <h2>${escapeHtml(section.title)}</h2>
        </div>
      </div>
      <div class="config-field-grid">
        ${Object.entries(section.fields).map(([fieldKey, field]) => catalogFieldCard(sectionKey, fieldKey, field)).join("")}
      </div>
    </section>
  `;
}

function sqlConsolePanel() {
  const consoleState = state.sqlConsole;
  return `
    <section class="panel config-panel sql-console-panel">
      <div class="panel-heading">
        <div>
          <p class="eyebrow">Base de datos</p>
          <h2>Consola Supabase</h2>
        </div>
        <div class="sql-console-actions">
          ${sqlConsoleExamples.map((example) => `
            <button class="ghost-button" type="button" data-sql-example="${escapeHtml(example.query)}">${escapeHtml(example.label)}</button>
          `).join("")}
        </div>
      </div>
      <form id="sql-console-form" class="sql-console-editor">
        <label for="sql-console-query">SQL</label>
        <textarea id="sql-console-query" spellcheck="false" autocomplete="off">${escapeHtml(consoleState.query)}</textarea>
        <div class="sql-console-toolbar">
          <button class="ghost-button" type="button" data-sql-clear>Limpiar</button>
          <button class="primary-button" type="submit" ${consoleState.running ? "disabled" : ""}>${consoleState.running ? "Ejecutando" : "Ejecutar"}</button>
        </div>
      </form>
      ${sqlConsoleResult()}
    </section>
  `;
}

function bindSqlConsole(container) {
  const queryInput = $("#sql-console-query");
  container.querySelector("#sql-console-form")?.addEventListener("submit", runSqlConsole);
  queryInput?.addEventListener("input", () => {
    state.sqlConsole.query = queryInput.value;
  });
  container.querySelector("[data-sql-clear]")?.addEventListener("click", () => {
    state.sqlConsole = { ...state.sqlConsole, query: "", result: null, error: "" };
    renderConfiguration();
  });
  container.querySelectorAll("[data-sql-example]").forEach((button) => {
    button.addEventListener("click", () => {
      state.sqlConsole = { ...state.sqlConsole, query: button.dataset.sqlExample || "", result: null, error: "" };
      renderConfiguration();
      $("#sql-console-query")?.focus();
    });
  });
}

async function runSqlConsole(event) {
  event.preventDefault();
  const query = $("#sql-console-query")?.value.trim() || "";
  if (!query) return;

  state.sqlConsole = { ...state.sqlConsole, query, result: null, error: "", running: true };
  renderConfiguration();

  try {
    const result = await api("/api/sql-console", { method: "POST", body: JSON.stringify({ query }) });
    state.sqlConsole = { ...state.sqlConsole, result, error: "" };
    if (["INSERT", "UPDATE", "DELETE"].includes(result.command)) {
      await refreshData();
    }
  } catch (error) {
    state.sqlConsole = { ...state.sqlConsole, result: null, error: error.message || "No se pudo ejecutar la consulta." };
  } finally {
    state.sqlConsole.running = false;
    renderConfiguration();
  }
}

function sqlConsoleResult() {
  const { result, error, running } = state.sqlConsole;
  if (running) {
    return `<div class="sql-console-empty">Ejecutando consulta</div>`;
  }
  if (error) {
    return `<div class="sql-console-error">${escapeHtml(error)}</div>`;
  }
  if (!result) {
    return `<div class="sql-console-empty">Sin resultados</div>`;
  }

  const rows = Array.isArray(result.rows) ? result.rows : [];
  const meta = [
    result.command || "SQL",
    `${Number(result.rowCount || 0)} fila(s)`,
    `${Number(result.durationMs || 0)} ms`
  ].join(" · ");

  return `
    <div class="sql-console-result">
      <div class="sql-console-meta">${escapeHtml(meta)}</div>
      ${rows.length ? sqlConsoleTable(rows) : `<div class="sql-console-empty">Operacion ejecutada</div>`}
    </div>
  `;
}

function sqlConsoleTable(rows) {
  const columns = sqlConsoleColumns(rows);
  return `
    <div class="sql-result-table-wrap">
      <table class="sql-result-table">
        <thead>
          <tr>${columns.map((column) => `<th>${escapeHtml(column)}</th>`).join("")}</tr>
        </thead>
        <tbody>
          ${rows.map((row) => `
            <tr>
              ${columns.map((column) => `<td>${sqlConsoleCell(row?.[column])}</td>`).join("")}
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
  `;
}

function sqlConsoleColumns(rows) {
  const columns = [];
  rows.forEach((row) => {
    Object.keys(row || {}).forEach((key) => {
      if (!columns.includes(key)) columns.push(key);
    });
  });
  return columns;
}

function sqlConsoleCell(value) {
  if (value === null || value === undefined) return `<span class="sql-null">NULL</span>`;
  if (typeof value === "object") return `<code>${escapeHtml(JSON.stringify(value))}</code>`;
  return escapeHtml(String(value));
}

function catalogFieldCard(store, fieldKey, field) {
  const items = catalogOptions(store, fieldKey);
  return `
    <article class="config-field-card">
      <div class="config-field-heading">
        <h3>${escapeHtml(field.label)}</h3>
        <span class="count-pill">${items.length}</span>
      </div>
      <div class="catalog-list">
        ${items.map((item) => catalogItemRow(store, fieldKey, item)).join("")}
      </div>
      <div class="catalog-add-row">
        <input type="text" placeholder="Nuevo valor" data-catalog-input data-store="${escapeHtml(store)}" data-field="${escapeHtml(fieldKey)}">
        <button class="secondary-button" type="button" data-catalog-add data-store="${escapeHtml(store)}" data-field="${escapeHtml(fieldKey)}">Agregar</button>
      </div>
    </article>
  `;
}

function catalogItemRow(store, fieldKey, item) {
  const usageCount = catalogUsageCount(store, fieldKey, item.value);
  const deleteDisabled = usageCount > 0 ? "disabled" : "";
  const usageLabel = usageCount ? `${usageCount} en uso` : "Sin uso";
  return `
    <div class="catalog-row">
      <input type="text" value="${escapeHtml(item.label)}" aria-label="Valor de catalogo" data-catalog-edit="${escapeHtml(item.value)}">
      <span class="catalog-usage">${escapeHtml(usageLabel)}</span>
      <button class="ghost-button" type="button" data-catalog-save data-store="${escapeHtml(store)}" data-field="${escapeHtml(fieldKey)}" data-value="${escapeHtml(item.value)}">Guardar</button>
      <button class="ghost-button danger" type="button" data-catalog-delete data-store="${escapeHtml(store)}" data-field="${escapeHtml(fieldKey)}" data-value="${escapeHtml(item.value)}" ${deleteDisabled}>Eliminar</button>
    </div>
  `;
}

async function addCatalogItem(store, fieldKey) {
  const input = $(`[data-catalog-input][data-store="${store}"][data-field="${fieldKey}"]`);
  const label = input?.value.trim();
  if (!label) return;
  const items = catalogOptions(store, fieldKey);
  if (items.some((item) => normalizeFilterText(item.label) === normalizeFilterText(label))) {
    alert("Ese valor ya existe en la lista.");
    return;
  }
  const previousItems = structuredCloneSafe(items);
  items.push({ value: uniqueCatalogValue(store, fieldKey, label), label });
  catalogs[store][fieldKey] = items;
  try {
    await saveCatalogField(store, fieldKey);
    render();
  } catch (error) {
    catalogs[store][fieldKey] = previousItems;
    refreshCatalogDerivedState();
    render();
    alert(`Error: ${error.message}`);
  }
}

async function updateCatalogItem(store, fieldKey, value) {
  const input = Array.from(document.querySelectorAll("[data-catalog-edit]")).find((element) => element.dataset.catalogEdit === value);
  const label = input?.value.trim();
  if (!label) return;
  const items = catalogOptions(store, fieldKey);
  if (items.some((item) => item.value !== value && normalizeFilterText(item.label) === normalizeFilterText(label))) {
    alert("Ese valor ya existe en la lista.");
    return;
  }
  const item = items.find((entry) => entry.value === value);
  if (!item) return;
  const previousItems = structuredCloneSafe(items);
  item.label = label;
  catalogs[store][fieldKey] = items;
  try {
    await saveCatalogField(store, fieldKey);
    render();
  } catch (error) {
    catalogs[store][fieldKey] = previousItems;
    refreshCatalogDerivedState();
    render();
    alert(`Error: ${error.message}`);
  }
}

async function deleteCatalogItem(store, fieldKey, value) {
  const usageCount = catalogUsageCount(store, fieldKey, value);
  if (usageCount > 0) {
    alert(`No se puede eliminar porque hay ${usageCount} registro(s) usando este valor.`);
    return;
  }
  const items = catalogOptions(store, fieldKey);
  if (items.length <= 1) {
    alert("La lista debe conservar al menos un valor.");
    return;
  }
  const previousItems = structuredCloneSafe(items);
  catalogs[store][fieldKey] = items.filter((item) => item.value !== value);
  try {
    await saveCatalogField(store, fieldKey);
    render();
  } catch (error) {
    catalogs[store][fieldKey] = previousItems;
    refreshCatalogDerivedState();
    render();
    alert(`Error: ${error.message}`);
  }
}

function uniqueCatalogValue(store, fieldKey, label) {
  const base = store === "tasks" && fieldKey === "status" ? cssToken(label) || "estado" : label;
  const values = new Set(catalogValues(store, fieldKey));
  if (!values.has(base)) return base;
  let index = 2;
  while (values.has(`${base}-${index}`)) index += 1;
  return `${base}-${index}`;
}

function catalogUsageCount(store, fieldKey, value) {
  return (state.data[store] ?? []).filter((record) => String(record[fieldKey] ?? "") === value).length;
}

function renderMetrics() {
  const activeBugs = state.data.bugs?.filter((bug) => !["Resuelto", "Cerrado"].includes(bug.status)).length ?? 0;
  const runningTasks = state.data.tasks?.filter((task) => task.status !== "done").length ?? 0;
  const executed = state.data.testCases?.filter((test) => test.status === "Ejecutado").length ?? 0;
  const blocked = state.data.testCases?.filter((test) => test.status === "Bloqueado").length ?? 0;
  const spTotal = state.data.spMigrations?.length ?? 0;
  const spCompleted = state.data.spMigrations?.filter((sp) => sp.status === "Finalizado").length ?? 0;
  const spInProgress = state.data.spMigrations?.filter((sp) => !["Finalizado"].includes(sp.status)).length ?? 0;
  const spPending = state.data.spMigrations?.filter((sp) => ["SQL recibido", "REST/gRPC recibido"].includes(sp.status)).length ?? 0;
  const spReadyQMetry = state.data.spMigrations?.filter((sp) => ["Matriz lista", "Evidencia QMetry"].includes(sp.status)).length ?? 0;
  const spCompletionPct = spTotal > 0 ? Math.round((spCompleted / spTotal) * 100) : 0;
  const metrics = [
    ["Casos de prueba", state.data.testCases?.length ?? 0, `${executed} ejecutados`],
    ["Errores abiertos", activeBugs, "requieren seguimiento"],
    ["Tareas activas", runningTasks, "en el tablero"],
    ["SP en migracion", spTotal, `${spCompletionPct}% completados`],
    ["SP en progreso", spInProgress, `${spPending} esperan entrada`],
    ["SP listos QMetry", spReadyQMetry, "matriz y evidencia"],
    ["Bloqueos", blocked, "casos bloqueados"]
  ];

  $("#metrics").innerHTML = metrics.map(([label, value, detail]) => `
    <article class="metric">
      <span>${escapeHtml(label)}</span>
      <strong>${value}</strong>
      <span>${escapeHtml(detail)}</span>
    </article>
  `).join("");
}

function renderKanban() {
  const board = $("#kanban-board");
  const tasks = state.data.tasks ?? [];
  board.innerHTML = Object.keys(statusLabels).map((status) => {
    const filtered = filterRecords(tasks.filter((task) => task.status === status));
    return `
      <div class="kanban-column" data-status="${status}">
        <div class="column-heading">
          <span>${statusLabels[status]}</span>
          <span class="count-pill">${filtered.length}</span>
        </div>
        ${filtered.length ? filtered.map(taskCard).join("") : `<div class="empty-state">Sin tareas</div>`}
      </div>
    `;
  }).join("");

  board.querySelectorAll(".card").forEach((card) => {
    card.addEventListener("click", () => openEditor("tasks", card.dataset.id));
    card.addEventListener("dragstart", (event) => event.dataTransfer.setData("text/plain", card.dataset.id));
  });

  board.querySelectorAll(".kanban-column").forEach((column) => {
    column.addEventListener("dragover", (event) => event.preventDefault());
    column.addEventListener("drop", async (event) => {
      event.preventDefault();
      const task = state.data.tasks.find((item) => item.id === event.dataTransfer.getData("text/plain"));
      if (!task) return;
      await saveRecord("tasks", { ...task, status: column.dataset.status });
      await refreshData();
      render();
    });
  });
}

function taskCard(task) {
  const member = findName("members", task.memberId);
  const sp = findSpMigration(task.spMigrationId);
  return `
    <article class="card" draggable="true" data-id="${escapeHtml(task.id)}">
      <div class="card-title">
        <strong>${escapeHtml(task.title)}</strong>
        <span class="priority-pill priority-${escapeHtml(task.priority)}">${escapeHtml(task.priority || "Media")}</span>
      </div>
      <div class="card-meta">
        <span>${escapeHtml(sp)}</span>
        <span>${escapeHtml(member || "Sin responsable")}</span>
        <span>${escapeHtml(catalogLabel("tasks", "kind", task.kind) || "Tarea")}</span>
        <span>${escapeHtml(task.dueDate || "Sin fecha")}</span>
      </div>
    </article>
  `;
}

function renderWorkload() {
  const container = $("#workload-list");
  if (!container) return;
  const members = state.data.members ?? [];
  if (!members.length) {
    container.innerHTML = `<div class="empty-state">Agrega miembros QA para ver su carga.</div>`;
    return;
  }

  container.innerHTML = members.map((member) => {
    const tasks = (state.data.tasks ?? []).filter((task) => task.memberId === member.id && task.status !== "done");
    const initials = member.name.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase();
    const capacity = Number(member.capacity || 0);
    return `
      <article class="member-row">
        <div class="member-top">
          <div class="avatar">${escapeHtml(initials)}</div>
          <div>
            <strong>${escapeHtml(member.name)}</strong>
            <div class="card-meta">${escapeHtml(catalogLabel("members", "role", member.role) || "QA")} - ${tasks.length} tarea(s)</div>
          </div>
          <span class="status-pill">${escapeHtml(catalogLabel("members", "status", member.status) || "Disponible")}</span>
        </div>
        <div class="progress" aria-label="Carga ${capacity}%"><span style="width: ${capacity}%"></span></div>
        <p class="card-meta">${escapeHtml(member.focus || "Sin enfoque registrado")}</p>
      </article>
    `;
  }).join("");
}

function renderIndicators() {
  const container = $("#indicators-content");
  const members = filterRecords(state.data.members ?? []);
  const allMembers = state.data.members ?? [];
  const allTasks = state.data.tasks ?? [];
  const allBugs = state.data.bugs ?? [];
  const allTestCases = state.data.testCases ?? [];
  const allUseCases = state.data.useCases ?? [];
  const allSpMigrations = state.data.spMigrations ?? [];
  const selectedSpId = allSpMigrations.some((sp) => sp.id === state.indicatorsSpMigrationId)
    ? state.indicatorsSpMigrationId
    : "";
  state.indicatorsSpMigrationId = selectedSpId;

  const selectedSp = allSpMigrations.find((sp) => sp.id === selectedSpId);
  const tasks = selectedSpId ? allTasks.filter((task) => task.spMigrationId === selectedSpId) : allTasks;
  const testCases = selectedSpId ? allTestCases.filter((test) => testCaseBelongsToSp(test, selectedSpId)) : allTestCases;
  const useCases = selectedSpId ? allUseCases.filter((useCase) => useCase.spMigrationId === selectedSpId) : allUseCases;
  const bugs = selectedSpId
    ? allBugs.filter((bug) => (bug.spMigrationId || findBugSpMigrationId(bug)) === selectedSpId)
    : allBugs;
  const spMigrations = selectedSpId ? allSpMigrations.filter((sp) => sp.id === selectedSpId) : allSpMigrations;
  const activeTasks = tasks.filter((task) => task.status !== "done");
  const activeBugs = bugs.filter((bug) => !["Resuelto", "Cerrado"].includes(bug.status));
  const executedTests = testCases.filter((test) => hasExecutionResult(test)).length;
  const successfulTests = testCases.filter((test) => test.executionStatus === "Exitoso").length;
  const failedTests = testCases.filter((test) => test.executionStatus === "Fallido").length;
  const pendingExecutionTests = testCases.length - executedTests;
  const bankApprovedTests = testCases.filter((test) => test.bankApproval === "Aprobado").length;
  const bankRejectedTests = testCases.filter((test) => test.bankApproval === "No Aprobado").length;
  const bankPendingTests = testCases.length - bankApprovedTests - bankRejectedTests;
  const blockedTests = testCases.filter((test) => test.status === "Bloqueado").length;
  const highPriorityActiveBugs = activeBugs.filter((bug) => ["Critica", "Alta"].includes(bug.severity)).length;
  const completedSp = spMigrations.filter((sp) => sp.status === "Finalizado").length;
  const qmetryReady = spMigrations.filter((sp) => sp.qmetryEvidenceReady || sp.status === "Evidencia QMetry").length;
  const matrixReady = spMigrations.filter((sp) => sp.equivalenceMatrixReady || ["Matriz lista", "Evidencia QMetry", "En revision por banco", "Finalizado"].includes(sp.status)).length;
  const averageCapacity = allMembers.length
    ? Math.round(allMembers.reduce((total, member) => total + Number(member.capacity || 0), 0) / allMembers.length)
    : 0;
  const defectDensity = executedTests > 0 ? Math.round((bugs.length / executedTests) * 100) : 0;
  const blockRate = percentage(blockedTests, testCases.length);
  const successRateExecuted = percentage(successfulTests, executedTests);
  const failedRateExecuted = percentage(failedTests, executedTests);
  const bankReadiness = readinessScore({
    executedPct: percentage(executedTests, testCases.length),
    bankApprovedPct: percentage(bankApprovedTests, testCases.length),
    matrixPct: percentage(matrixReady, spMigrations.length),
    qmetryPct: percentage(qmetryReady, spMigrations.length),
    highPriorityActiveBugs,
    blockedTests
  });
  const health = healthStatus({
    readiness: bankReadiness,
    failedPct: failedRateExecuted,
    blockedPct: blockRate,
    highPriorityActiveBugs
  });

  const memberStats = members.map((member) => {
    const memberTasks = activeTasks.filter((task) => task.memberId === member.id);
    const memberBugs = activeBugs.filter((bug) => bug.memberId === member.id);
    const memberSp = spMigrations.filter((sp) => sp.qaId === member.id && sp.status !== "Finalizado");
    const capacity = Number(member.capacity || 0);
    const riskScore = operationalRiskScore({
      activeTasks: memberTasks.length,
      reviewTasks: memberTasks.filter((task) => task.status === "review").length,
      activeBugs: memberBugs.length,
      activeSp: memberSp.length,
      capacity
    });
    return {
      ...member,
      activeTasks: memberTasks.length,
      reviewTasks: memberTasks.filter((task) => task.status === "review").length,
      activeBugs: memberBugs.length,
      activeSp: memberSp.length,
      capacity,
      riskScore
    };
  }).sort((a, b) => (b.activeTasks + b.activeBugs + b.activeSp) - (a.activeTasks + a.activeBugs + a.activeSp));

  const scopeLabel = selectedSp ? selectedSp.spName : "Todos los SP";
  const riskiestMember = [...memberStats].sort((a, b) => b.riskScore - a.riskScore)[0];
  const spHealthItems = spMigrations.map((sp) => spHealthItem(sp, allTestCases, allBugs));
  const cards = [
    ["Casos ejecutados", `${percentage(executedTests, testCases.length)}%`, `${executedTests} de ${testCases.length} con resultado`],
    ["TC aprobados banco", `${percentage(bankApprovedTests, testCases.length)}%`, `${bankApprovedTests} de ${testCases.length} aprobados`],
    ["Calidad entrega", `${successRateExecuted}%`, `${failedRateExecuted}% fallidos sobre ejecutados`],
    ["Sin ejecutar", `${percentage(pendingExecutionTests, testCases.length)}%`, `${pendingExecutionTests} de ${testCases.length} pendientes`],
    ["Densidad defectos", defectDensity, "errores por 100 TC ejecutados"],
    ["Tasa bloqueo", `${blockRate}%`, `${blockedTests} de ${testCases.length} casos bloqueados`],
    ["Preparacion banco", `${bankReadiness}%`, `${matrixReady} matriz, ${qmetryReady} QMetry`],
    ["Salud SP", health.label, `${health.score}% de salud operativa`],
    ["SP finalizados", `${percentage(completedSp, spMigrations.length)}%`, `${completedSp} de ${spMigrations.length} cerrados`],
    ["Errores activos", activeBugs.length, `${highPriorityActiveBugs} de alta prioridad`],
    ["QMetry listo", qmetryReady, selectedSpId ? "para el SP elegido" : "evidencia o etapa QMetry"],
    ["Riesgo QA", riskiestMember ? riskiestMember.riskScore : 0, riskiestMember ? riskiestMember.name : "sin asignaciones"],
    ["Carga promedio", `${averageCapacity}%`, `${allMembers.length} miembro(s) QA`]
  ];

  container.innerHTML = `
    <section class="panel indicator-toolbar">
      <div class="indicator-scope">
        <div>
          <p class="eyebrow">Filtro</p>
          <h2>${escapeHtml(scopeLabel)}</h2>
        </div>
        <label class="indicator-select" for="indicator-sp-filter">
          <span>SP</span>
          <select id="indicator-sp-filter">
            <option value="">Todos los SP</option>
            ${allSpMigrations.map((sp) => `<option value="${escapeHtml(sp.id)}" ${sp.id === selectedSpId ? "selected" : ""}>${escapeHtml(sp.spName || "Sin nombre")}</option>`).join("")}
          </select>
        </label>
      </div>
    </section>

    <div class="indicator-grid">
      ${cards.map(([label, value, detail]) => `
        <article class="metric indicator-card">
          <span>${escapeHtml(label)}</span>
          <strong>${escapeHtml(value)}</strong>
          <span>${escapeHtml(detail)}</span>
        </article>
      `).join("")}
    </div>

    <div class="detail-grid">
      ${detailBreakdown("Ejecucion de casos", [
        { label: "Exitosos", value: successfulTests },
        { label: "Fallidos", value: failedTests },
        { label: "Sin ejecutar", value: pendingExecutionTests }
      ], testCases.length)}
      ${detailBreakdown("Aprobacion banco", [
        { label: "Aprobados", value: bankApprovedTests },
        { label: "No aprobados", value: bankRejectedTests },
        { label: "Sin decision", value: bankPendingTests }
      ], testCases.length)}
      ${detailBreakdown("Errores por estado", catalogValues("bugs", "status").map((status) => ({
        label: catalogLabel("bugs", "status", status),
        value: bugs.filter((bug) => bug.status === status).length
      })), bugs.length)}
      ${detailBreakdown("Casos por estado", catalogValues("testCases", "status").map((status) => ({
        label: catalogLabel("testCases", "status", status),
        value: testCases.filter((test) => test.status === status).length
      })), testCases.length)}
      ${detailBreakdown("Calidad sobre ejecutados", [
        { label: "Exitosos", value: successfulTests },
        { label: "Fallidos", value: failedTests }
      ], executedTests)}
      ${percentBreakdown("Preparacion banco", [
        { label: "TC ejecutados", value: `${executedTests}/${testCases.length}`, pct: percentage(executedTests, testCases.length) },
        { label: "TC aprobados", value: `${bankApprovedTests}/${testCases.length}`, pct: percentage(bankApprovedTests, testCases.length) },
        { label: "Matriz lista", value: `${matrixReady}/${spMigrations.length}`, pct: percentage(matrixReady, spMigrations.length) },
        { label: "QMetry listo", value: `${qmetryReady}/${spMigrations.length}`, pct: percentage(qmetryReady, spMigrations.length) }
      ])}
    </div>

    <div class="indicators-layout">
      <section class="panel">
        <div class="panel-heading">
          <div>
            <p class="eyebrow">Miembros</p>
            <h2>Indicadores por miembro</h2>
          </div>
        </div>
        <div class="member-indicators">
          ${memberStats.length ? memberStats.map(memberIndicatorRow).join("") : `<div class="empty-state">No hay miembros para mostrar.</div>`}
        </div>
      </section>

      <section class="panel">
        <div class="panel-heading">
          <div>
            <p class="eyebrow">Graficas</p>
            <h2>Distribucion operativa</h2>
          </div>
        </div>
        <div class="chart-grid">
          ${barChart("Tareas por estado", Object.entries(statusLabels).map(([status, label]) => ({
            label,
            value: tasks.filter((task) => task.status === status).length
          })))}
          ${barChart("SP por estado", spMigrationStatuses.map((status) => ({
            label: catalogLabel("spMigrations", "status", status),
            value: spMigrations.filter((sp) => sp.status === status).length
          })))}
          ${barChart("Errores por estado", catalogValues("bugs", "status").map((status) => ({
            label: catalogLabel("bugs", "status", status),
            value: bugs.filter((bug) => bug.status === status).length
          })))}
          ${barChart("Errores activos por severidad", catalogValues("bugs", "severity").map((severity) => ({
            label: catalogLabel("bugs", "severity", severity),
            value: activeBugs.filter((bug) => bug.severity === severity).length
          })))}
          ${barChart("Casos de uso por estado", catalogValues("useCases", "status").map((status) => ({
            label: catalogLabel("useCases", "status", status),
            value: useCases.filter((useCase) => useCase.status === status).length
          })))}
          ${barChart("Salud por SP", spHealthItems.map((item) => ({
            label: `${item.label} (${item.status})`,
            value: item.score,
            suffix: "%"
          })))}
          ${barChart("Riesgo por miembro", memberStats.map((member) => ({
            label: member.name,
            value: member.riskScore
          })))}
          ${barChart("Carga por miembro", memberStats.map((member) => ({
            label: member.name,
            value: member.capacity,
            suffix: "%"
          })))}
        </div>
      </section>
    </div>
  `;

  container.querySelector("#indicator-sp-filter")?.addEventListener("change", (event) => {
    state.indicatorsSpMigrationId = event.target.value;
    renderIndicators();
  });
}

function hasExecutionResult(testCase) {
  return ["Exitoso", "Fallido"].includes(testCase.executionStatus);
}

function readinessScore({ executedPct, bankApprovedPct, matrixPct, qmetryPct, highPriorityActiveBugs, blockedTests }) {
  const penalty = Math.min((highPriorityActiveBugs * 8) + (blockedTests * 4), 35);
  return clampPercent(Math.round(
    (executedPct * 0.25)
    + (bankApprovedPct * 0.35)
    + (matrixPct * 0.2)
    + (qmetryPct * 0.2)
    - penalty
  ));
}

function healthStatus({ readiness, failedPct, blockedPct, highPriorityActiveBugs }) {
  const score = clampPercent(Math.round(readiness - (failedPct * 0.25) - (blockedPct * 0.2) - Math.min(highPriorityActiveBugs * 6, 24)));
  if (score >= 75) return { label: "Verde", score };
  if (score >= 45) return { label: "Amarillo", score };
  return { label: "Rojo", score };
}

function operationalRiskScore({ activeTasks, reviewTasks, activeBugs, activeSp, capacity }) {
  return Math.round((activeSp * 12) + (activeBugs * 8) + (reviewTasks * 4) + (activeTasks * 3) + (clampPercent(capacity) / 5));
}

function spHealthItem(sp, allTestCases, allBugs) {
  const spTests = allTestCases.filter((test) => testCaseBelongsToSp(test, sp.id));
  const spBugs = allBugs.filter((bug) => (bug.spMigrationId || findBugSpMigrationId(bug)) === sp.id);
  const spActiveBugs = spBugs.filter((bug) => !["Resuelto", "Cerrado"].includes(bug.status));
  const spExecuted = spTests.filter((test) => hasExecutionResult(test)).length;
  const spSuccessful = spTests.filter((test) => test.executionStatus === "Exitoso").length;
  const spFailed = spTests.filter((test) => test.executionStatus === "Fallido").length;
  const spApproved = spTests.filter((test) => test.bankApproval === "Aprobado").length;
  const spBlocked = spTests.filter((test) => test.status === "Bloqueado").length;
  const spHighPriorityBugs = spActiveBugs.filter((bug) => ["Critica", "Alta"].includes(bug.severity)).length;
  const matrixPct = sp.equivalenceMatrixReady || ["Matriz lista", "Evidencia QMetry", "En revision por banco", "Finalizado"].includes(sp.status) ? 100 : 0;
  const qmetryPct = sp.qmetryEvidenceReady || sp.status === "Evidencia QMetry" || sp.status === "Finalizado" ? 100 : 0;
  const readiness = readinessScore({
    executedPct: percentage(spExecuted, spTests.length),
    bankApprovedPct: percentage(spApproved, spTests.length),
    matrixPct,
    qmetryPct,
    highPriorityActiveBugs: spHighPriorityBugs,
    blockedTests: spBlocked
  });
  const health = healthStatus({
    readiness,
    failedPct: percentage(spFailed, spExecuted),
    blockedPct: percentage(spBlocked, spTests.length),
    highPriorityActiveBugs: spHighPriorityBugs
  });
  return {
    label: sp.spName || "Sin nombre",
    status: health.label,
    score: health.score,
    successful: spSuccessful,
    failed: spFailed
  };
}

function detailBreakdown(title, items, total) {
  const visibleItems = items.length ? items : [{ label: "Sin datos", value: 0 }];
  return `
    <article class="detail-card">
      <h3>${escapeHtml(title)}</h3>
      <div class="detail-list">
        ${visibleItems.map((item) => {
          const value = Number(item.value || 0);
          const pct = percentage(value, total);
          return `
            <div class="detail-row">
              <div class="detail-label">
                <span>${escapeHtml(item.label)}</span>
                <strong>${escapeHtml(value)} (${pct}%)</strong>
              </div>
              <div class="bar-track"><span style="width: ${Math.max(pct, value ? 4 : 0)}%"></span></div>
            </div>
          `;
        }).join("")}
      </div>
    </article>
  `;
}

function percentBreakdown(title, items) {
  const visibleItems = items.length ? items : [{ label: "Sin datos", value: "0", pct: 0 }];
  return `
    <article class="detail-card">
      <h3>${escapeHtml(title)}</h3>
      <div class="detail-list">
        ${visibleItems.map((item) => {
          const pct = clampPercent(item.pct);
          return `
            <div class="detail-row">
              <div class="detail-label">
                <span>${escapeHtml(item.label)}</span>
                <strong>${escapeHtml(item.value)} (${pct}%)</strong>
              </div>
              <div class="bar-track"><span style="width: ${Math.max(pct, pct ? 4 : 0)}%"></span></div>
            </div>
          `;
        }).join("")}
      </div>
    </article>
  `;
}

function memberIndicatorRow(member) {
  const initials = member.name.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase();
  return `
    <article class="member-indicator-row">
      <div class="member-top">
        <div class="avatar">${escapeHtml(initials)}</div>
        <div>
          <strong>${escapeHtml(member.name)}</strong>
          <div class="card-meta">${escapeHtml(catalogLabel("members", "role", member.role) || "QA")} - ${escapeHtml(catalogLabel("members", "status", member.status) || "Disponible")}</div>
        </div>
        <span class="status-pill">${member.capacity}% carga</span>
      </div>
      <div class="progress" aria-label="Carga ${member.capacity}%"><span style="width: ${clampPercent(member.capacity)}%"></span></div>
      <div class="member-kpis">
        <span><strong>${member.activeTasks}</strong> tareas activas</span>
        <span><strong>${member.reviewTasks}</strong> en revision</span>
        <span><strong>${member.activeBugs}</strong> errores activos</span>
        <span><strong>${member.activeSp}</strong> SP asignados</span>
      </div>
    </article>
  `;
}

function barChart(title, items) {
  const max = Math.max(...items.map((item) => Number(item.value || 0)), 1);
  const visibleItems = items.filter((item) => Number(item.value || 0) > 0);
  return `
    <article class="chart-card">
      <h3>${escapeHtml(title)}</h3>
      <div class="bar-list">
        ${visibleItems.length ? visibleItems.map((item) => {
          const value = Number(item.value || 0);
          const width = Math.max(Math.round((value / max) * 100), 4);
          return `
            <div class="bar-row">
              <div class="bar-label">
                <span>${escapeHtml(item.label)}</span>
                <strong>${escapeHtml(value)}${escapeHtml(item.suffix || "")}</strong>
              </div>
              <div class="bar-track"><span style="width: ${width}%"></span></div>
            </div>
          `;
        }).join("") : `<div class="empty-state compact-empty">Sin datos</div>`}
      </div>
    </article>
  `;
}

function percentage(value, total) {
  return total > 0 ? Math.round((value / total) * 100) : 0;
}

function clampPercent(value) {
  return Math.min(Math.max(Number(value || 0), 0), 100);
}

function renderList() {
  const config = viewConfig[state.listView];
  $("#list-kicker").textContent = config.kicker;
  $("#list-title").textContent = config.title;
  $("#table-head").innerHTML = `<tr>${config.columns.map((column) => `<th>${column}</th>`).join("")}</tr>`;
  renderFilters(config);

  const storeData = state.data[config.store] ?? [];
  const records = applyCustomFilters(filterRecords(storeData), config.store);
  const pagination = paginationFor(config.store);
  const totalPages = Math.max(1, Math.ceil(records.length / pagination.pageSize));
  if (pagination.page > totalPages) pagination.page = totalPages;
  const startIndex = (pagination.page - 1) * pagination.pageSize;
  const pageRecords = records.slice(startIndex, startIndex + pagination.pageSize);

  $("#table-body").innerHTML = pageRecords.length
    ? pageRecords.map((record) => tableRow(config.store, record)).join("")
    : `<tr><td colspan="${config.columns.length}"><div class="empty-state">No hay registros para mostrar.</div></td></tr>`;
  renderPagination(config.store, records.length, pageRecords.length, startIndex);

  $("#table-body").querySelectorAll("[data-edit]").forEach((button) => {
    button.addEventListener("click", () => openEditor(config.store, button.dataset.edit));
  });
  $("#table-body").querySelectorAll("[data-inline-field]").forEach((control) => {
    control.addEventListener("change", () => handleInlineUpdate(config.store, control));
  });
}

function renderPagination(store, totalRecords, visibleRecords, startIndex) {
  const pagination = paginationFor(store);
  const totalPages = Math.max(1, Math.ceil(totalRecords / pagination.pageSize));
  const from = totalRecords ? startIndex + 1 : 0;
  const to = totalRecords ? startIndex + visibleRecords : 0;

  $("#table-pagination").innerHTML = `
    <div class="pagination-summary">${from}-${to} de ${totalRecords}</div>
    <div class="pagination-controls">
      <label>
        Filas
        <select id="page-size" aria-label="Filas por pagina">
          ${pageSizeOptions.map((size) => `<option value="${size}" ${size === pagination.pageSize ? "selected" : ""}>${size}</option>`).join("")}
        </select>
      </label>
      <button class="ghost-button" type="button" data-page-action="prev" ${pagination.page <= 1 ? "disabled" : ""}>Anterior</button>
      <span>Pagina ${pagination.page} de ${totalPages}</span>
      <button class="ghost-button" type="button" data-page-action="next" ${pagination.page >= totalPages ? "disabled" : ""}>Siguiente</button>
    </div>
  `;

  $("#page-size").addEventListener("change", (event) => {
    pagination.pageSize = Number(event.target.value) || defaultPageSize;
    pagination.page = 1;
    renderList();
  });
  $("#table-pagination").querySelectorAll("[data-page-action]").forEach((button) => {
    button.addEventListener("click", () => {
      pagination.page += button.dataset.pageAction === "next" ? 1 : -1;
      renderList();
    });
  });
}

function paginationFor(store) {
  if (!state.pagination[store]) state.pagination[store] = { page: 1, pageSize: defaultPageSize };
  return state.pagination[store];
}

function resetPage(store) {
  paginationFor(store).page = 1;
}

function resetAllPages() {
  Object.keys(state.pagination).forEach(resetPage);
}

function renderFilters(config) {
  const fields = listFilterFields[config.store] ?? [];
  const activeFilters = state.customFilters[config.store] ?? [];
  $("#list-filters").innerHTML = `
    <div class="filter-builder">
      <select id="filter-field" aria-label="Campo para filtrar">
        ${fields.map((field) => `<option value="${escapeHtml(field.key)}">${escapeHtml(field.label)}</option>`).join("")}
      </select>
      <select id="filter-operator" aria-label="Condicion del filtro">
        <option value="contains">Contiene</option>
        <option value="equals">Es igual a</option>
        <option value="notContains">No contiene</option>
        <option value="empty">Esta vacio</option>
        <option value="notEmpty">No esta vacio</option>
      </select>
      <input id="filter-value" type="search" placeholder="Valor del filtro" aria-label="Valor del filtro">
      <button class="secondary-button" id="add-filter" type="button">Agregar filtro</button>
      <button class="ghost-button ${activeFilters.length ? "" : "hidden"}" id="clear-filters" type="button">Limpiar</button>
    </div>
    <div class="filter-chips">
      ${activeFilters.map((filter) => filterChip(config.store, filter)).join("")}
    </div>
  `;

  $("#add-filter").addEventListener("click", () => addCustomFilter(config.store));
  $("#filter-value").addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      addCustomFilter(config.store);
    }
  });
  $("#clear-filters").addEventListener("click", () => {
    state.customFilters[config.store] = [];
    resetPage(config.store);
    renderList();
  });
  $("#list-filters").querySelectorAll("[data-remove-filter]").forEach((button) => {
    button.addEventListener("click", () => {
      state.customFilters[config.store] = activeFilters.filter((filter) => filter.id !== button.dataset.removeFilter);
      resetPage(config.store);
      renderList();
    });
  });
}

function addCustomFilter(store) {
  const fieldKey = $("#filter-field").value;
  const operator = $("#filter-operator").value;
  const value = $("#filter-value").value.trim();
  if (!["empty", "notEmpty"].includes(operator) && !value) return;

  const filters = state.customFilters[store] ?? [];
  state.customFilters[store] = [
    ...filters,
    {
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      fieldKey,
      operator,
      value
    }
  ];
  resetPage(store);
  renderList();
}

function filterChip(store, filter) {
  const field = (listFilterFields[store] ?? []).find((item) => item.key === filter.fieldKey);
  const label = `${field?.label || filter.fieldKey} ${operatorLabel(filter.operator)}${filter.value ? ` "${filter.value}"` : ""}`;
  return `
    <span class="filter-chip">
      ${escapeHtml(label)}
      <button type="button" aria-label="Quitar filtro" data-remove-filter="${escapeHtml(filter.id)}">×</button>
    </span>
  `;
}

function operatorLabel(operator) {
  return {
    contains: "contiene",
    equals: "es igual a",
    notContains: "no contiene",
    empty: "esta vacio",
    notEmpty: "no esta vacio"
  }[operator] || "contiene";
}

function applyCustomFilters(records, store) {
  const activeFilters = state.customFilters[store] ?? [];
  if (!activeFilters.length) return records;
  return records.filter((record) => activeFilters.every((filter) => matchesCustomFilter(store, record, filter)));
}

function matchesCustomFilter(store, record, filter) {
  const values = filterValuesFor(store, record, filter.fieldKey);
  const texts = values.map(normalizeFilterText).filter(Boolean);
  const expected = normalizeFilterText(filter.value);

  if (filter.operator === "empty") return !texts.length;
  if (filter.operator === "notEmpty") return Boolean(texts.length);
  if (filter.operator === "equals") return texts.some((text) => text === expected);
  if (filter.operator === "notContains") return texts.every((text) => !text.includes(expected));
  return texts.some((text) => text.includes(expected));
}

function filterValuesFor(store, record, fieldKey) {
  const values = [filterValueFor(store, record, fieldKey)];
  if (hasCatalogField(store, fieldKey)) {
    values.push(record[fieldKey]);
    values.push(catalogLabel(store, fieldKey, record[fieldKey]));
  }
  return [...new Set(values.map((value) => String(value ?? "").trim()).filter(Boolean))];
}

function filterValueFor(store, record, fieldKey) {
  if (fieldKey === "spMigration") {
    if (store === "bugs") return findBugSpMigration(record);
    if (store === "testCases") return findTestCaseSp(record);
    return findSpMigration(record.spMigrationId);
  }
  if (fieldKey === "member") return findName("members", record.memberId) || "Sin responsable";
  if (fieldKey === "qa") return findName("members", record.qaId) || "Sin QA";
  if (fieldKey === "useCase") return findUseCase(record.useCaseId);
  if (fieldKey === "testCase") return findTestCase(record.testCaseId);
  if (fieldKey === "status" && store === "tasks") return statusLabels[record.status] || record.status;
  if (fieldKey === "status" && hasCatalogField(store, "status")) return catalogLabel(store, "status", record.status);
  if (fieldKey === "priority" && hasCatalogField(store, "priority")) return catalogLabel(store, "priority", record.priority);
  if (fieldKey === "severity" && hasCatalogField(store, "severity")) return catalogLabel(store, "severity", record.severity);
  if (fieldKey === "kind" && hasCatalogField(store, "kind")) return catalogLabel(store, "kind", record.kind);
  if (fieldKey === "role" && hasCatalogField(store, "role")) return catalogLabel(store, "role", record.role);
  if (fieldKey === "executionStatus" && hasCatalogField(store, "executionStatus")) return catalogLabel(store, "executionStatus", record.executionStatus);
  if (fieldKey === "bankApproval" && hasCatalogField(store, "bankApproval")) return catalogLabel(store, "bankApproval", record.bankApproval);
  if (fieldKey === "capacity") return `${record.capacity || 0}%`;
  if (fieldKey === "sql") return artifactFilterText(record.sqlReceived);
  if (fieldKey === "rest") return artifactFilterText(record.restReceived);
  if (fieldKey === "grpc") return artifactFilterText(record.grpcReceived);
  if (fieldKey === "matrix") return artifactFilterText(record.equivalenceMatrixReady);
  if (fieldKey === "qmetry") return artifactFilterText(record.qmetryEvidenceReady);
  return record[fieldKey] ?? "";
}

function hasCatalogField(store, fieldKey) {
  return Boolean(catalogDefinitions[store]?.fields?.[fieldKey]);
}

function artifactFilterText(done) {
  return done ? "Listo" : "Pendiente";
}

function normalizeFilterText(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function tableRow(store, record) {
  const edit = { html: `<div class="row-actions"><button class="ghost-button" type="button" data-edit="${escapeHtml(record.id)}">Editar</button></div>` };
  if (store === "tasks") {
    const statusText = statusLabels[record.status] || record.status;
    return row([
      record.title,
      findSpMigration(record.spMigrationId),
      findName("members", record.memberId) || "Sin responsable",
      { html: statusBadge(statusText) },
      { html: pill(catalogLabel("tasks", "priority", record.priority), `priority-${cssToken(record.priority)}`) },
      record.dueDate || "Sin fecha",
      edit
    ]);
  }
  if (store === "spMigrations") {
    return row([
      record.spName,
      record.devName || "Sin dev",
      findName("members", record.qaId) || "Sin QA",
      { html: statusBadge(catalogLabel("spMigrations", "status", record.status)) },
      { html: artifactBadge(record.sqlReceived, record.sqlReceivedDate) },
      { html: artifactBadge(record.restReceived, record.restReceivedDate) },
      { html: artifactBadge(record.grpcReceived, record.grpcReceivedDate) },
      { html: artifactBadge(record.equivalenceMatrixReady, "Matriz") },
      { html: artifactBadge(record.qmetryEvidenceReady, "QMetry") },
      edit
    ]);
  }
  if (store === "testCases") {
    return row([
      findTestCaseSp(record),
      record.code,
      record.name,
      { html: inlineSelect(store, record, "status") },
      { html: inlineSelect(store, record, "executionStatus") },
      { html: inlineSelect(store, record, "bankApproval") },
      { html: pill(catalogLabel("testCases", "priority", record.priority), `priority-${cssToken(record.priority)}`) },
      record.observation || "Sin observacion",
      edit
    ]);
  }
  if (store === "useCases") {
    return row([
      findSpMigration(record.spMigrationId),
      record.code,
      record.name,
      { html: statusBadge(catalogLabel("useCases", "status", record.status)) },
      { html: pill(catalogLabel("useCases", "priority", record.priority), `priority-${cssToken(record.priority)}`) },
      record.observation || "Sin observacion",
      edit
    ]);
  }
  if (store === "bugs") {
    return row([
      record.title,
      findBugSpMigration(record),
      findTestCase(record.testCaseId),
      { html: pill(catalogLabel("bugs", "severity", record.severity), `severity-${cssToken(record.severity)}`) },
      { html: statusBadge(catalogLabel("bugs", "status", record.status)) },
      findName("members", record.memberId) || "Sin responsable",
      edit
    ]);
  }
  return row([
    record.name,
    catalogLabel("members", "role", record.role),
    { html: statusBadge(catalogLabel("members", "status", record.status)) },
    `${record.capacity || 0}%`,
    record.email || "Sin correo",
    edit
  ]);
}

function row(cells) {
  return `<tr>${cells.map((cell) => `<td>${cell?.html || escapeHtml(cell || "")}</td>`).join("")}</tr>`;
}

function pill(text, className) {
  return `<span class="priority-pill ${escapeHtml(className)}">${escapeHtml(text || "Media")}</span>`;
}

function inlineSelect(store, record, fieldName) {
  if (!inlineEditableFields[store]?.has(fieldName)) return escapeHtml(record[fieldName] || "");
  const field = fieldConfig[store]?.find((item) => item.name === fieldName);
  const value = record[fieldName] ?? defaultValue(field);
  let selectOptions = (field?.options ?? []).map((option) => typeof option === "string" ? { value: option, label: option } : option);
  if (field?.emptyLabel) selectOptions = [{ value: "", label: field.emptyLabel }, ...selectOptions];
  const options = selectOptions.map((item) => {
    return `<option value="${escapeHtml(item.value)}" ${item.value === value ? "selected" : ""}>${escapeHtml(item.label)}</option>`;
  }).join("");
  return `
    <select class="inline-select status-${cssToken(value || "pendiente")}" data-inline-field="${escapeHtml(fieldName)}" data-record-id="${escapeHtml(record.id)}" aria-label="${escapeHtml(field?.label || fieldName)}">
      ${options}
    </select>
  `;
}

async function handleInlineUpdate(store, control) {
  const allowed = inlineEditableFields[store];
  const fieldName = control.dataset.inlineField;
  const recordId = control.dataset.recordId;
  if (!allowed?.has(fieldName) || !recordId) return;

  const storeData = state.data[store] ?? [];
  const record = storeData.find((item) => item.id === recordId);
  if (!record) return;

  const previousValue = record[fieldName] ?? "";
  const nextValue = control.value;
  if (previousValue === nextValue) return;

  control.disabled = true;
  try {
    const savedRecord = await saveRecord(store, { ...record, [fieldName]: nextValue });
    mergeImportedRecord(store, savedRecord);
    renderList();
  } catch (error) {
    control.value = previousValue;
    alert(`Error: ${error.message}`);
  } finally {
    control.disabled = false;
  }
}

function statusBadge(text) {
  return `<span class="status-pill status-${cssToken(text)}">${escapeHtml(text || "Sin estado")}</span>`;
}

function artifactBadge(done, title) {
  const label = done ? "Listo" : "Pendiente";
  return `<span class="artifact-pill ${done ? "complete" : "pending"}" title="${escapeHtml(title || label)}">${label}</span>`;
}

function cssToken(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function openEditor(store, recordId = null) {
  const storeData = state.data[store] ?? [];
  const record = recordId ? storeData.find((item) => item.id === recordId) : null;
  const formRecord = store === "bugs" ? withBugSpMigration(record || {}) : (record || {});
  state.editing = { store, id: recordId };
  $("#dialog-kicker").textContent = viewConfig[store]?.kicker || "Registro";
  $("#dialog-title").textContent = record ? `Editar ${singular(store)}` : `Nuevo ${singular(store)}`;
  $("#delete-item").classList.toggle("hidden", !record);
  renderForm(store, formRecord);
  $("#item-dialog").showModal();
}

function renderForm(store, record) {
  $("#form-fields").innerHTML = fieldConfig[store].map((field) => {
    const value = record[field.name] ?? defaultValue(field);
    const classes = `field ${field.full ? "full" : ""}`;
    if (["select", "member", "useCase", "testCase", "spMigration"].includes(field.type)) {
      return `<div class="${classes}"><label for="${field.name}">${field.label}</label><select id="${field.name}" name="${field.name}">${optionsFor(field, value, record)}</select></div>`;
    }
    if (field.type === "checkbox") {
      return `<div class="${classes}"><label><input type="checkbox" id="${field.name}" name="${field.name}" value="true" ${value ? "checked" : ""}> ${field.label}</label></div>`;
    }
    if (field.type === "textarea") {
      return `<div class="${classes}"><label for="${field.name}">${field.label}</label><textarea id="${field.name}" name="${field.name}">${escapeHtml(value)}</textarea></div>`;
    }
    return `<div class="${classes}"><label for="${field.name}">${field.label}</label><input id="${field.name}" name="${field.name}" type="${field.type}" value="${escapeHtml(value)}" ${field.required ? "required" : ""} ${field.min !== undefined ? `min="${field.min}"` : ""} ${field.max !== undefined ? `max="${field.max}"` : ""}></div>`;
  }).join("");

  if (store === "bugs") bindBugSpTestCaseSelector();
}

function bindBugSpTestCaseSelector() {
  const spSelect = $("#spMigrationId");
  const testCaseSelect = $("#testCaseId");
  const testCaseField = fieldConfig.bugs.find((field) => field.name === "testCaseId");
  if (!spSelect || !testCaseSelect || !testCaseField) return;
  spSelect.addEventListener("change", () => {
    testCaseSelect.innerHTML = optionsFor(testCaseField, "", { spMigrationId: spSelect.value });
  });
}

function optionsFor(field, value, record = {}) {
  let options = [];
  if (field.type === "member") {
    const emptyLabel = field.name === "qaId" ? "Sin QA" : "Sin responsable";
    const members = state.data.members ?? [];
    options = [{ value: "", label: emptyLabel }, ...members.map((item) => ({ value: item.id, label: item.name }))];
  }
  if (field.type === "useCase") {
    const useCases = state.data.useCases ?? [];
    options = [{ value: "", label: "Sin caso de uso" }, ...useCases.map((item) => ({ value: item.id, label: `${item.code} - ${item.name}` }))];
  }
  if (field.type === "testCase") {
    const selectedSpId = record.spMigrationId || "";
    const testCases = field.filterBySp && selectedSpId
      ? (state.data.testCases ?? []).filter((item) => testCaseBelongsToSp(item, selectedSpId))
      : (state.data.testCases ?? []);
    const emptyLabel = field.filterBySp && !selectedSpId
      ? "Seleccione un SP primero"
      : "Sin caso de prueba";
    options = [{ value: "", label: emptyLabel }, ...testCases.map((item) => ({ value: item.id, label: `${item.code} - ${item.name}` }))];
  }
  if (field.type === "spMigration") {
    const spMigrations = state.data.spMigrations ?? [];
    options = [{ value: "", label: "Sin SP" }, ...spMigrations.map((item) => ({ value: item.id, label: item.spName }))];
  }
  if (field.type === "select") {
    options = (field.options ?? []).map((option) => typeof option === "string" ? { value: option, label: option } : option);
    if (field.emptyLabel) options = [{ value: "", label: field.emptyLabel }, ...options];
  }
  return options.map((option) => `<option value="${escapeHtml(option.value)}" ${option.value === value ? "selected" : ""}>${escapeHtml(option.label)}</option>`).join("");
}

async function handleFormSubmit(event) {
  event.preventDefault();
  if (event.submitter?.value === "cancel") {
    $("#item-dialog").close();
    return;
  }
  const { store, id: editingId } = state.editing;
  const storeData = state.data[store] ?? [];
  const existing = editingId ? storeData.find((item) => item.id === editingId) : {};
  const formData = new FormData(event.currentTarget);
  const record = { ...existing };
  const config = fieldConfig[store] ?? [];
  config.forEach((field) => {
    const rawValue = formData.get(field.name);
    if (field.type === "checkbox") {
      record[field.name] = rawValue === "true";
    } else if (field.type === "number") {
      record[field.name] = Number(rawValue || 0);
    } else {
      record[field.name] = rawValue;
    }
  });
  if (editingId) record.id = editingId;

  try {
    await saveRecord(store, record);
    await refreshData();
    $("#item-dialog").close();
    render();
  } catch (error) {
    alert(`Error: ${error.message}`);
  }
}

async function handleDelete() {
  const { store, id: editingId } = state.editing;
  if (!editingId) return;
  await deleteRecord(store, editingId);
  await refreshData();
  $("#item-dialog").close();
  render();
}

function openBulkImport(store) {
  if (!bulkImportStores.has(store)) return;
  state.importingStore = store;
  $("#import-kicker").textContent = viewConfig[store]?.kicker || "Importacion";
  $("#import-title").textContent = `Carga masiva de ${viewConfig[store]?.title || "registros"}`;
  $("#import-json").value = "";
  $("#import-json").placeholder = JSON.stringify(bulkImportExampleFor(store), null, 2);
  setImportSummary("");
  $("#import-dialog").showModal();
}

function loadBulkImportExample() {
  const store = state.importingStore;
  if (!store) return;
  $("#import-json").value = JSON.stringify(bulkImportExampleFor(store), null, 2);
  setImportSummary("");
}

async function handleImportFileChange(event) {
  const [file] = event.target.files || [];
  if (!file) return;
  try {
    $("#import-json").value = await file.text();
    setImportSummary(`Archivo cargado: ${file.name}`);
  } catch (error) {
    setImportSummary(`No se pudo leer el archivo: ${error.message}`, true);
  } finally {
    event.target.value = "";
  }
}

async function handleBulkImportSubmit(event) {
  event.preventDefault();
  if (event.submitter?.value === "cancel") {
    $("#import-dialog").close();
    return;
  }

  const store = state.importingStore;
  const text = $("#import-json").value.trim();
  if (!store || !text) {
    setImportSummary("Pega un JSON o selecciona un archivo para importar.", true);
    return;
  }

  const submitButton = $("#run-import");
  submitButton.disabled = true;
  submitButton.textContent = "Importando";

  try {
    const groups = parseBulkImportPayload(store, text);
    const totalRecords = Object.values(groups).reduce((total, records) => total + records.length, 0);
    if (!totalRecords) throw new Error("El JSON no contiene registros para importar.");

    const result = await importRecordGroups(groups);
    await refreshData();
    render();

    if (result.errors.length) {
      setImportSummary(`${result.created} importado(s). ${result.errors.length} con error: ${result.errors.join(" | ")}`, true);
      return;
    }

    $("#import-dialog").close();
    alert(`${result.created} registro(s) importado(s) correctamente.`);
  } catch (error) {
    setImportSummary(error.message, true);
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = "Importar";
  }
}

function parseBulkImportPayload(store, text) {
  let payload;
  try {
    payload = JSON.parse(text);
  } catch {
    throw new Error("El contenido no es un JSON valido.");
  }

  if (Array.isArray(payload)) return { [store]: payload };

  const source = payload?.data && typeof payload.data === "object" ? payload.data : payload;
  const groups = {};
  bulkImportGroupStores.forEach((groupStore) => {
    if (Array.isArray(source?.[groupStore])) groups[groupStore] = source[groupStore];
  });
  if (Object.keys(groups).length) return groups;

  throw new Error(`Usa un arreglo JSON o un objeto con alguna propiedad: "spMigrations", "useCases", "testCases" o "bugs".`);
}

async function importRecordGroups(groups) {
  const result = { created: 0, errors: [] };
  const context = buildImportContext(groups);
  for (const store of bulkImportGroupStores) {
    const records = groups[store] || [];
    for (const [index, rawRecord] of records.entries()) {
      try {
        const record = normalizeImportRecord(store, rawRecord, context);
        const savedRecord = await saveRecord(store, record);
        mergeImportedRecord(store, savedRecord);
        result.created += 1;
      } catch (error) {
        result.errors.push(`${singular(store)} ${index + 1}: ${error.message}`);
      }
    }
  }
  return result;
}

function buildImportContext(groups) {
  const aliases = Object.fromEntries(bulkImportGroupStores.map((store) => [store, new Map()]));
  bulkImportGroupStores.forEach((store) => {
    (groups[store] || []).forEach((record) => {
      if (!record || typeof record !== "object" || Array.isArray(record) || !record.id) return;
      const rawId = String(record.id).trim();
      if (!rawId || aliases[store].has(rawId)) return;
      aliases[store].set(rawId, resolveImportRecordId(store, rawId));
    });
  });
  return { aliases };
}

function resolveImportRecordId(store, rawId) {
  if (isUuid(rawId)) return rawId;
  const existing = (state.data[store] ?? []).find((record) => record.importKey === rawId || record.id === rawId);
  return existing?.id || createUuid();
}

function createUuid() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (char) => {
    const random = Math.floor(Math.random() * 16);
    const value = char === "x" ? random : (random & 0x3) | 0x8;
    return value.toString(16);
  });
}

function isUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value || "").trim());
}

function normalizeImportRecord(store, rawRecord, context = { aliases: {} }) {
  if (!rawRecord || typeof rawRecord !== "object" || Array.isArray(rawRecord)) {
    throw new Error("cada registro debe ser un objeto");
  }

  const record = {};
  const rawId = rawRecord.id ? String(rawRecord.id).trim() : "";
  if (rawId) {
    record.id = context.aliases?.[store]?.get(rawId) || resolveImportRecordId(store, rawId);
    if (!isUuid(rawId)) record.importKey = rawId;
  }
  if (rawRecord.importKey && !record.importKey) record.importKey = String(rawRecord.importKey).trim();
  const config = fieldConfig[store] ?? [];
  config.forEach((field) => {
    const hasValue = Object.prototype.hasOwnProperty.call(rawRecord, field.name) && rawRecord[field.name] !== null;
    const value = hasValue ? rawRecord[field.name] : defaultValue(field);
    record[field.name] = normalizeFieldValue(field, value);
  });
  record.spMigrationId = resolveImportReference("spMigrations", record.spMigrationId, context);
  if (store === "testCases") record.useCaseId = resolveImportReference("useCases", record.useCaseId, context);
  if (store === "bugs") {
    record.testCaseId = resolveImportReference("testCases", record.testCaseId, context);
    record.memberId = resolveImportReference("members", record.memberId, context);
  }

  const missingRequired = config
    .filter((field) => field.required && !String(record[field.name] ?? "").trim())
    .map((field) => field.label);
  if (missingRequired.length) {
    throw new Error(`faltan campos obligatorios (${missingRequired.join(", ")})`);
  }

  validateImportRelations(store, record);
  return record;
}

function resolveImportReference(store, value, context = { aliases: {} }) {
  const normalizedValue = String(value || "").trim();
  if (!normalizedValue) return "";
  const mappedId = context.aliases?.[store]?.get(normalizedValue);
  if (mappedId) return mappedId;
  const existing = (state.data[store] ?? []).find((record) => record.id === normalizedValue || record.importKey === normalizedValue);
  if (existing) return existing.id;
  if (store === "spMigrations") return resolveImportSpMigrationId(normalizedValue);
  return normalizedValue;
}

function mergeImportedRecord(store, record) {
  const storeData = state.data[store] ?? [];
  const index = storeData.findIndex((item) => item.id === record.id);
  if (index >= 0) {
    storeData[index] = record;
  } else {
    storeData.push(record);
  }
  state.data[store] = storeData;
}

function normalizeFieldValue(field, value) {
  if (field.type === "checkbox") return Boolean(value);
  if (field.type === "number") return Number(value || 0);
  return String(value ?? "").trim();
}

function resolveImportSpMigrationId(value) {
  const normalizedValue = String(value || "").trim();
  if (!normalizedValue) return "";
  const spMigrations = state.data.spMigrations ?? [];
  const byId = spMigrations.find((item) => item.id === normalizedValue);
  if (byId) return byId.id;
  const byName = spMigrations.find((item) => normalizeFilterText(item.spName) === normalizeFilterText(normalizedValue));
  return byName?.id || normalizedValue;
}

function validateImportRelations(store, record) {
  if (record.spMigrationId && !state.data.spMigrations?.some((item) => item.id === record.spMigrationId)) {
    throw new Error("el spMigrationId no existe");
  }
  if (store === "testCases" && record.useCaseId && !state.data.useCases?.some((item) => item.id === record.useCaseId)) {
    throw new Error("el useCaseId no existe");
  }
  if (store === "bugs") {
    if (record.testCaseId && !state.data.testCases?.some((item) => item.id === record.testCaseId)) {
      throw new Error("el testCaseId no existe");
    }
    if (record.memberId && !state.data.members?.some((item) => item.id === record.memberId)) {
      throw new Error("el memberId no existe");
    }
  }
}

function bulkImportExampleFor(store) {
  const sp = state.data.spMigrations?.[0]?.id || "";
  const useCase = state.data.useCases?.[0]?.id || "";
  const testCase = state.data.testCases?.[0]?.id || "";
  const member = state.data.members?.[0]?.id || "";

  const examples = {
    spMigrations: {
      spMigrations: [
        {
          id: "sp-consulta-saldo",
          spName: "sp_consulta_saldo",
          sqlReceivedDate: "",
          sqlReceived: true,
          devName: "Equipo migracion",
          qaId: "",
          status: "En QA",
          restReceivedDate: "",
          restReceived: true,
          grpcReceivedDate: "",
          grpcReceived: true,
          equivalenceMatrixReady: false,
          qmetryEvidenceReady: false,
          notes: "Los IDs legibles se convierten automaticamente a UUID durante la importacion."
        }
      ]
    },
    useCases: {
      useCases: [
        {
          spMigrationId: sp,
          code: "CU-010",
          name: "Consultar saldo del cliente",
          actor: "Analista QA",
          status: "Activo",
          priority: "Alta",
          observation: "Validar reglas principales y escenarios alternos.",
          goal: "Permitir la consulta de saldo disponible por cliente.",
          flow: "Ingresar cliente, ejecutar consulta, validar respuesta y trazabilidad."
        }
      ]
    },
    testCases: {
      testCases: [
        {
          spMigrationId: sp,
          code: "CP-010",
          name: "Validar consulta exitosa de saldo",
          useCaseId: useCase,
          status: "Borrador",
          executionStatus: "Exitoso",
          bankApproval: "No Aprobado",
          priority: "Alta",
          observation: "Cubrir datos validos.",
          steps: "1. Preparar cliente activo. 2. Ejecutar consulta. 3. Revisar respuesta.",
          expected: "El servicio retorna saldo, codigo exitoso y datos consistentes con el SP."
        }
      ]
    },
    bugs: {
      bugs: [
        {
          title: "La consulta retorna saldo desactualizado",
          spMigrationId: sp,
          testCaseId: testCase,
          memberId: member,
          severity: "Alta",
          status: "Abierto",
          description: "El saldo retornado no coincide con la salida del SP para el mismo cliente.",
          steps: "1. Ejecutar el caso CP-010. 2. Comparar respuesta REST contra SP. 3. Registrar diferencia."
        }
      ]
    }
  };

  return examples[store] || [];
}

function setImportSummary(message, isError = false) {
  const summary = $("#import-summary");
  summary.textContent = message;
  summary.classList.toggle("hidden", !message);
  summary.classList.toggle("import-error", isError);
}

function filterRecords(records) {
  if (!state.search) return records;
  return records.filter((record) => JSON.stringify(record).toLowerCase().includes(state.search));
}

function defaultValue(field) {
  if (!field) return "";
  if (field.default !== undefined) return field.default;
  if (field.name === "status" && field.options?.[0]) {
    return typeof field.options[0] === "string" ? field.options[0] : field.options[0].value;
  }
  if (field.name === "priority") return "Media";
  if (field.name === "severity") return "Media";
  if (field.name === "capacity") return 0;
  return "";
}

function exportData() {
  window.location.href = "/api/export";
}

function findName(store, itemId) {
  const storeData = state.data[store] ?? [];
  return storeData.find((item) => item.id === itemId)?.name;
}

function findUseCase(itemId) {
  const useCases = state.data.useCases ?? [];
  const item = useCases.find((record) => record.id === itemId);
  return item ? `${item.code} - ${item.name}` : "Sin caso de uso";
}

function findTestCase(itemId) {
  const testCases = state.data.testCases ?? [];
  const item = testCases.find((record) => record.id === itemId);
  return item ? `${item.code} - ${item.name}` : "Sin caso de prueba";
}

function findSpMigration(itemId) {
  const spMigrations = state.data.spMigrations ?? [];
  return spMigrations.find((record) => record.id === itemId)?.spName || "Sin SP";
}

function withBugSpMigration(record) {
  return { ...record, spMigrationId: record.spMigrationId || findBugSpMigrationId(record) };
}

function findBugSpMigration(record) {
  return findSpMigration(record.spMigrationId || findBugSpMigrationId(record));
}

function findBugSpMigrationId(record) {
  const testCases = state.data.testCases ?? [];
  const testCase = testCases.find((item) => item.id === record.testCaseId);
  return testCaseSpMigrationId(testCase);
}

function testCaseBelongsToSp(testCase, spMigrationId) {
  return testCaseSpMigrationId(testCase) === spMigrationId;
}

function testCaseSpMigrationId(testCase) {
  if (!testCase) return "";
  if (testCase.spMigrationId) return testCase.spMigrationId;
  const useCases = state.data.useCases ?? [];
  const useCase = useCases.find((record) => record.id === testCase.useCaseId);
  return useCase?.spMigrationId || "";
}

function findTestCaseSp(testCase) {
  return findSpMigration(testCaseSpMigrationId(testCase));
}

function singular(store) {
  return {
    tasks: "tarea",
    spMigrations: "seguimiento de SP",
    testCases: "caso de prueba",
    useCases: "caso de uso",
    bugs: "error",
    members: "miembro QA"
  }[store];
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
