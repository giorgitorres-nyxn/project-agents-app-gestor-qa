// Shared frontend configuration and in-memory state.

const {
  stores,
  catalogDefinitions,
  isTaskIterationTransition,
  isTaskOverdue
} = window.GestorQAProject;

const sqlConsoleSection = "sqlConsole";
const configurationSections = ["tasks", "spMigrations", "testCases", "bugs", "members", sqlConsoleSection];
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
function currentWeekRange() {
  const now = new Date();
  const day = now.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + mondayOffset);
  const sunday = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 6);
  const toIso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  return { dateFrom: toIso(monday), dateTo: toIso(sunday) };
}

let catalogs = defaultCatalogs();
let statusLabels = taskStatusLabels();
let spMigrationStatuses = catalogValues("spMigrations", "status");

const viewConfig = {
  tasks: {
    title: "Tareas",
    kicker: "Asignacion",
    store: "tasks",
    columns: [
      { label: "Titulo", key: "title" },
      { label: "Microservicio", key: "microservicio" },
      { label: "Responsable", key: "member" },
      { label: "Estado", key: "status" },
      { label: "Iteraciones", key: "iterations" },
      { label: "Prioridad", key: "priority" },
      { label: "Vence", key: "dueDate" },
      { label: "", key: null }
    ]
  },
  spMigrations: {
    title: "Lotes y funcionalidades",
    kicker: "Seguimiento tecnico",
    store: "spMigrations",
    columns: [
      { label: "Lote", key: "numeroLote" },
      { label: "Funcionalidad", key: "funcionalidad" },
      { label: "Microservicio", key: "nombreMicroservicio" },
      { label: "SP", key: "spName" },
      { label: "Dev", key: "devName" },
      { label: "QA", key: "qa" },
      { label: "Estado", key: "status" },
      { label: "Matriz", key: "matrix" },
      { label: "QMetry", key: "qmetry" },
      { label: "", key: null }
    ]
  },
  testCases: {
    title: "Casos de prueba",
    kicker: "Validacion",
    store: "testCases",
    columns: [
      { label: "Microservicio", key: "microservicio" },
      { label: "Codigo", key: "code" },
      { label: "Nombre", key: "name" },
      { label: "Estado", key: "status" },
      { label: "Ejecucion", key: "executionStatus" },
      { label: "Aprobado Banco", key: "bankApproval" },
      { label: "Prioridad", key: "priority" },
      { label: "Observacion", key: "observation" },
      { label: "", key: null }
    ]
  },
  bugs: {
    title: "Errores detectados",
    kicker: "Incidencias",
    store: "bugs",
    columns: [
      { label: "Titulo", key: "title" },
      { label: "Microservicio", key: "microservicio" },
      { label: "Caso de prueba", key: "testCase" },
      { label: "Severidad", key: "severity" },
      { label: "Estado", key: "status" },
      { label: "Responsable", key: "member" },
      { label: "", key: null }
    ]
  },
  members: {
    title: "Miembros QA",
    kicker: "Equipo",
    store: "members",
    columns: ["Nombre", "Rol", "Estado", "Carga", "Correo", ""]
  }
};

const sortableStores = new Set(["tasks", "spMigrations", "testCases", "bugs"]);
const microservicioFilterableStores = new Set(["tasks", "spMigrations", "testCases", "bugs"]);

function emptyMicroFilter() {
  return { dateFrom: "", dateTo: "", lote: "", funcionalidad: "", microservicio: "" };
}

const bulkImportStores = new Set(["spMigrations", "testCases", "bugs"]);
const bulkImportGroupStores = ["spMigrations", "testCases", "bugs"];
const defaultPageSize = 25;
const pageSizeOptions = [10, 25, 50, 100];
const inlineEditableFields = {
  testCases: new Set(["status", "executionStatus", "bankApproval"])
};

let fieldConfig = {
  tasks: [
    { name: "title", label: "Titulo", type: "text", required: true, full: true },
    { name: "microservicio", label: "Microservicio", type: "microservicio" },
    { name: "memberId", label: "Responsable", type: "member" },
    { name: "status", label: "Estado", type: "select", catalogStore: "tasks", catalogField: "status", options: catalogOptions("tasks", "status") },
    { name: "priority", label: "Prioridad", type: "select", catalogStore: "tasks", catalogField: "priority", options: catalogOptions("tasks", "priority") },
    { name: "dueDate", label: "Fecha limite", type: "date" },
    { name: "kind", label: "Tipo", type: "select", catalogStore: "tasks", catalogField: "kind", options: catalogOptions("tasks", "kind") },
    { name: "description", label: "Descripcion", type: "textarea", full: true }
  ],
  spMigrations: [
    { name: "numeroLote", label: "Numero de Lote", type: "text" },
    { name: "funcionalidad", label: "Funcionalidad", type: "text" },
    { name: "nombreMicroservicio", label: "Nombre del Microservicio", type: "text" },
    { name: "spName", label: "Nombre del SP", type: "text", required: true },
    { name: "devName", label: "Dev asignado", type: "text", required: true },
    { name: "qaId", label: "QA asignado", type: "member" },
    { name: "status", label: "Estado", type: "select", catalogStore: "spMigrations", catalogField: "status", options: catalogOptions("spMigrations", "status") },
    { name: "equivalenceMatrixReady", label: "Matriz de equivalencia lista", type: "checkbox" },
    { name: "qmetryEvidenceReady", label: "Evidencia cargada a QMetry", type: "checkbox" },
    { name: "notes", label: "Notas QA", type: "textarea", full: true }
  ],
  testCases: [
    { name: "microservicio", label: "Microservicio", type: "microservicio" },
    { name: "code", label: "Codigo", type: "text", required: true },
    { name: "name", label: "Nombre", type: "text", required: true },
    { name: "status", label: "Estado", type: "select", catalogStore: "testCases", catalogField: "status", options: catalogOptions("testCases", "status") },
    { name: "executionStatus", label: "Ejecucion", type: "select", catalogStore: "testCases", catalogField: "executionStatus", options: catalogOptions("testCases", "executionStatus"), default: "", emptyLabel: "Sin ejecutar" },
    { name: "bankApproval", label: "Aprobado Banco", type: "select", catalogStore: "testCases", catalogField: "bankApproval", options: catalogOptions("testCases", "bankApproval"), default: "No Aprobado" },
    { name: "priority", label: "Prioridad", type: "select", catalogStore: "testCases", catalogField: "priority", options: catalogOptions("testCases", "priority") },
    { name: "observation", label: "Observacion", type: "textarea", full: true },
    { name: "steps", label: "Pasos", type: "textarea", full: true },
    { name: "expected", label: "Resultado esperado", type: "textarea", full: true }
  ],
  bugs: [
    { name: "title", label: "Titulo", type: "text", required: true, full: true },
    { name: "microservicio", label: "Microservicio", type: "microservicio" },
    { name: "testCaseId", label: "Caso de prueba", type: "testCase", filterByMicroservicio: true },
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
    { key: "microservicio", label: "Microservicio" },
    { key: "member", label: "Responsable" },
    { key: "status", label: "Estado" },
    { key: "priority", label: "Prioridad" },
    { key: "dueDate", label: "Vence" },
    { key: "kind", label: "Tipo" },
    { key: "description", label: "Descripcion" }
  ],
  spMigrations: [
    { key: "numeroLote", label: "Lote" },
    { key: "funcionalidad", label: "Funcionalidad" },
    { key: "microservicio", label: "Microservicio" },
    { key: "spName", label: "SP" },
    { key: "devName", label: "Dev" },
    { key: "qa", label: "QA" },
    { key: "status", label: "Estado" },
    { key: "testCase", label: "Caso de prueba" },
    { key: "matrix", label: "Matriz" },
    { key: "qmetry", label: "QMetry" },
    { key: "notes", label: "Notas" }
  ],
  testCases: [
    { key: "microservicio", label: "Microservicio" },
    { key: "code", label: "Codigo" },
    { key: "name", label: "Nombre" },
    { key: "status", label: "Estado" },
    { key: "executionStatus", label: "Ejecucion" },
    { key: "bankApproval", label: "Aprobado Banco" },
    { key: "priority", label: "Prioridad" },
    { key: "observation", label: "Observacion" },
    { key: "steps", label: "Pasos" },
    { key: "expected", label: "Resultado esperado" }
  ],
  bugs: [
    { key: "title", label: "Titulo" },
    { key: "microservicio", label: "Microservicio" },
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
  indicatorsTab: "operational",
  kpiPeriod: "",
  indicatorsFilters: { lote: "", funcionalidad: "", microservicio: "" },
  riskFilters: { dateFrom: "", dateTo: "", lote: "", funcionalidad: "", microservicio: "" },
  listMicroFilters: {
    tasks: emptyMicroFilter(),
    spMigrations: emptyMicroFilter(),
    testCases: emptyMicroFilter(),
    bugs: emptyMicroFilter()
  },
  editing: null,
  kanbanFilters: { memberId: "", lote: "", funcionalidad: "", microservicio: "", ...currentWeekRange() },
  showOnlyOverdueTasks: false,
  sort: {},
  loading: {
    activeCount: 0,
    message: "",
    visible: false,
    timer: null
  },
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

function startLoading(message = "Procesando informacion", options = {}) {
  state.loading.activeCount += 1;
  state.loading.message = message;
  if (options.immediate) {
    window.clearTimeout(state.loading.timer);
    state.loading.timer = null;
    state.loading.visible = true;
  } else if (!state.loading.timer) {
    state.loading.timer = window.setTimeout(() => {
      state.loading.visible = state.loading.activeCount > 0;
      updateLoadingView();
    }, 120);
  }
  updateLoadingView();
  return () => stopLoading();
}

function stopLoading() {
  state.loading.activeCount = Math.max(0, state.loading.activeCount - 1);
  if (state.loading.activeCount > 0) {
    updateLoadingView();
    return;
  }
  window.clearTimeout(state.loading.timer);
  state.loading.timer = null;
  state.loading.visible = false;
  state.loading.message = "";
  updateLoadingView();
}

async function withLoading(message, action) {
  const stop = startLoading(message);
  try {
    return await action();
  } finally {
    stop();
  }
}

function updateLoadingView() {
  const overlay = $("#app-loading");
  if (!overlay) return;
  const isVisible = state.loading.visible && state.loading.activeCount > 0;
  overlay.classList.toggle("is-visible", isVisible);
  overlay.setAttribute("aria-hidden", isVisible ? "false" : "true");
  overlay.style.opacity = isVisible ? "1" : "0";
  overlay.style.pointerEvents = isVisible ? "auto" : "none";
  overlay.style.transform = isVisible ? "translateY(0)" : "translateY(-10px)";
  document.body.classList.toggle("is-busy", state.loading.activeCount > 0);
  const message = $("#app-loading-message");
  if (message) message.textContent = state.loading.message || "Procesando informacion";
}
