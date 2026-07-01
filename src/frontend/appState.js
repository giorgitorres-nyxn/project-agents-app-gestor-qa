// Shared frontend configuration and in-memory state.

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
