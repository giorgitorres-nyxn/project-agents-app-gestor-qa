const stores = ["members", "useCases", "testCases", "bugs", "tasks", "spMigrations"];

const statusLabels = {
  backlog: "Pendiente",
  active: "En progreso",
  review: "En revision",
  done: "Finalizado"
};

const viewConfig = {
  tasks: {
    title: "Tareas",
    kicker: "Asignacion",
    store: "tasks",
    filters: ["Todos", "Pendiente", "En progreso", "En revision", "Finalizado"],
    columns: ["Titulo", "SP asignado", "Responsable", "Estado", "Prioridad", "Vence", ""]
  },
  spMigrations: {
    title: "Migracion de SP",
    kicker: "Seguimiento tecnico",
    store: "spMigrations",
    filters: ["Todos", "SQL recibido", "REST/gRPC recibido", "En QA", "Matriz lista", "Evidencia QMetry", "Finalizado"],
    columns: ["SP", "Dev", "QA", "Estado", "SQL", "REST", "gRPC", "Matriz", "QMetry", ""]
  },
  testCases: {
    title: "Casos de prueba",
    kicker: "Validacion",
    store: "testCases",
    filters: ["Todos", "Borrador", "Listo", "Ejecutado", "Bloqueado"],
    columns: ["SP del CP", "Codigo", "Nombre", "Estado", "Prioridad", "Observacion", ""]
  },
  useCases: {
    title: "Casos de uso",
    kicker: "Producto",
    store: "useCases",
    filters: ["Todos", "Activo", "En analisis", "Aprobado", "Retirado"],
    columns: ["SP", "Codigo", "Nombre", "Estado", "Prioridad", "Observacion", ""]
  },
  bugs: {
    title: "Errores detectados",
    kicker: "Incidencias",
    store: "bugs",
    filters: ["Todos", "Abierto", "Asignado", "Resuelto", "Cerrado"],
    columns: ["Titulo", "Severidad", "Estado", "Responsable", "Caso de prueba", ""]
  },
  members: {
    title: "Miembros QA",
    kicker: "Equipo",
    store: "members",
    filters: ["Todos", "Disponible", "Ocupado", "Ausente"],
    columns: ["Nombre", "Rol", "Estado", "Carga", "Correo", ""]
  }
};

const fieldConfig = {
  tasks: [
    { name: "title", label: "Titulo", type: "text", required: true, full: true },
    { name: "spMigrationId", label: "SP asignado", type: "spMigration" },
    { name: "memberId", label: "Responsable", type: "member" },
    { name: "status", label: "Estado", type: "select", options: Object.entries(statusLabels).map(([value, label]) => ({ value, label })) },
    { name: "priority", label: "Prioridad", type: "select", options: ["Alta", "Media", "Baja"] },
    { name: "dueDate", label: "Fecha limite", type: "date" },
    { name: "kind", label: "Tipo", type: "select", options: ["Prueba", "Documentacion", "Automatizacion", "Correccion"] },
    { name: "description", label: "Descripcion", type: "textarea", full: true }
  ],
  spMigrations: [
    { name: "spName", label: "Nombre del SP", type: "text", required: true },
    { name: "sqlReceivedDate", label: "Fecha recepción SQL", type: "date" },
    { name: "sqlReceived", label: "SQL recibido", type: "checkbox" },
    { name: "devName", label: "Dev asignado", type: "text", required: true },
    { name: "qaId", label: "QA asignado", type: "member" },
    { name: "status", label: "Estado", type: "select", options: ["SQL recibido", "REST/gRPC recibido", "En QA", "Matriz lista", "Evidencia QMetry", "Finalizado"] },
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
    { name: "status", label: "Estado", type: "select", options: ["Borrador", "Listo", "Ejecutado", "Bloqueado"] },
    { name: "priority", label: "Prioridad", type: "select", options: ["Alta", "Media", "Baja"] },
    { name: "observation", label: "Observacion", type: "textarea", full: true },
    { name: "steps", label: "Pasos", type: "textarea", full: true },
    { name: "expected", label: "Resultado esperado", type: "textarea", full: true }
  ],
  useCases: [
    { name: "spMigrationId", label: "SP asociado", type: "spMigration" },
    { name: "code", label: "Codigo", type: "text", required: true },
    { name: "name", label: "Nombre", type: "text", required: true },
    { name: "actor", label: "Actor", type: "text" },
    { name: "status", label: "Estado", type: "select", options: ["Activo", "En analisis", "Aprobado", "Retirado"] },
    { name: "priority", label: "Prioridad", type: "select", options: ["Alta", "Media", "Baja"] },
    { name: "observation", label: "Observacion", type: "textarea", full: true },
    { name: "goal", label: "Objetivo", type: "textarea", full: true },
    { name: "flow", label: "Flujo principal", type: "textarea", full: true }
  ],
  bugs: [
    { name: "title", label: "Titulo", type: "text", required: true, full: true },
    { name: "testCaseId", label: "Caso de prueba", type: "testCase" },
    { name: "memberId", label: "Responsable", type: "member" },
    { name: "severity", label: "Severidad", type: "select", options: ["Critica", "Alta", "Media", "Baja"] },
    { name: "status", label: "Estado", type: "select", options: ["Abierto", "Asignado", "Resuelto", "Cerrado"] },
    { name: "description", label: "Descripcion", type: "textarea", full: true },
    { name: "steps", label: "Como reproducir", type: "textarea", full: true }
  ],
  members: [
    { name: "name", label: "Nombre", type: "text", required: true },
    { name: "role", label: "Rol", type: "select", options: ["QA Manual", "QA Automation", "QA Lead", "Analista QA"] },
    { name: "email", label: "Correo", type: "email" },
    { name: "status", label: "Estado", type: "select", options: ["Disponible", "Ocupado", "Ausente"] },
    { name: "capacity", label: "Carga de trabajo (%)", type: "number", min: 0, max: 100 },
    { name: "focus", label: "Enfoque actual", type: "textarea", full: true }
  ]
};

let state = {
  activeView: "dashboard",
  listView: "tasks",
  filter: "Todos",
  search: "",
  editing: null,
  data: Object.fromEntries(stores.map((store) => [store, []]))
};

const $ = (selector) => document.querySelector(selector);

document.addEventListener("DOMContentLoaded", async () => {
  await refreshData();
  bindEvents();
  render();
});

const spMigrationTransitions = {
  "SQL recibido": ["REST/gRPC recibido", "Finalizado"],
  "REST/gRPC recibido": ["En QA", "Finalizado"],
  "En QA": ["Matriz lista", "Finalizado"],
  "Matriz lista": ["Evidencia QMetry", "Finalizado"],
  "Evidencia QMetry": ["Finalizado"],
  "Finalizado": []
};

function validateSPStatusTransition(oldStatus, newStatus) {
  if (oldStatus === newStatus) return null;
  const allowed = spMigrationTransitions[oldStatus] || [];
  if (!allowed.includes(newStatus)) {
    return `Transición inválida: no se puede ir de "${oldStatus}" a "${newStatus}"`;
  }
  return null;
}

async function api(path, options = {}) {
  const response = await fetch(path, {
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options
  });
  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Error HTTP ${response.status}`);
  }
  if (response.status === 204) return null;
  return response.json();
}

async function refreshData() {
  state.data = await api("/api/data");
}

async function saveRecord(store, record) {
  const editing = Boolean(record.id);
  const url = editing ? `/api/${store}/${record.id}` : `/api/${store}`;
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
  return api(`/api/${store}/${recordId}`, { method: "DELETE" });
}

function bindEvents() {
  document.querySelectorAll(".nav-item").forEach((button) => {
    button.addEventListener("click", () => setView(button.dataset.view));
  });

  $("#new-item").addEventListener("click", () => openEditor(state.activeView === "dashboard" ? "tasks" : state.listView));
  $("#quick-task").addEventListener("click", () => openEditor("tasks"));
  $("#global-search").addEventListener("input", (event) => {
    state.search = event.target.value.trim().toLowerCase();
    render();
  });
  $("#export-data").addEventListener("click", exportData);
  $("#item-form").addEventListener("submit", handleFormSubmit);
  $("#delete-item").addEventListener("click", handleDelete);
}

function setView(view) {
  state.activeView = view;
  if (view !== "dashboard") {
    state.listView = view;
    state.filter = "Todos";
  }
  document.querySelectorAll(".nav-item").forEach((item) => item.classList.toggle("active", item.dataset.view === view));
  render();
}

function render() {
  $("#dashboard-view").classList.toggle("active-view", state.activeView === "dashboard");
  $("#list-view").classList.toggle("active-view", state.activeView !== "dashboard");
  $("#new-item").textContent = state.activeView === "dashboard" ? "Nueva tarea" : "Nuevo";
  $("#page-title").textContent = state.activeView === "dashboard" ? "Tablero QA" : viewConfig[state.listView].title;

  renderMetrics();
  renderKanban();
  renderWorkload();
  if (state.activeView !== "dashboard") renderList();
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
        <span>${escapeHtml(task.kind || "Tarea")}</span>
        <span>${escapeHtml(task.dueDate || "Sin fecha")}</span>
      </div>
    </article>
  `;
}

function renderWorkload() {
  const container = $("#workload-list");
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
            <div class="card-meta">${escapeHtml(member.role || "QA")} - ${tasks.length} tarea(s)</div>
          </div>
          <span class="status-pill">${escapeHtml(member.status || "Disponible")}</span>
        </div>
        <div class="progress" aria-label="Carga ${capacity}%"><span style="width: ${capacity}%"></span></div>
        <p class="card-meta">${escapeHtml(member.focus || "Sin enfoque registrado")}</p>
      </article>
    `;
  }).join("");
}

function renderList() {
  const config = viewConfig[state.listView];
  $("#list-kicker").textContent = config.kicker;
  $("#list-title").textContent = config.title;
  $("#table-head").innerHTML = `<tr>${config.columns.map((column) => `<th>${column}</th>`).join("")}</tr>`;
  renderFilters(config);

  const storeData = state.data[config.store] ?? [];
  const records = filterRecords(storeData).filter((record) => {
    if (state.filter === "Todos") return true;
    if (state.listView === "tasks") {
      if (state.filter.startsWith("sp:")) return record.spMigrationId === state.filter.slice(3);
      return statusLabels[record.status] === state.filter;
    }
    return record.status === state.filter;
  });

  $("#table-body").innerHTML = records.length
    ? records.map((record) => tableRow(config.store, record)).join("")
    : `<tr><td colspan="${config.columns.length}"><div class="empty-state">No hay registros para mostrar.</div></td></tr>`;

  $("#table-body").querySelectorAll("[data-edit]").forEach((button) => {
    button.addEventListener("click", () => openEditor(config.store, button.dataset.edit));
  });
}

function renderFilters(config) {
  const filters = filterOptionsFor(config);
  $("#list-filters").innerHTML = filters.map((filter) => `
    <button type="button" class="${state.filter === filter.value ? "active" : ""}" data-filter="${escapeHtml(filter.value)}">${escapeHtml(filter.label)}</button>
  `).join("");
  $("#list-filters").querySelectorAll("button").forEach((button) => {
    button.addEventListener("click", () => {
      state.filter = button.dataset.filter;
      renderList();
    });
  });
}

function filterOptionsFor(config) {
  const baseFilters = config.filters.map((filter) => ({ value: filter, label: filter }));
  if (config.store !== "tasks") return baseFilters;
  const spFilters = (state.data.spMigrations ?? []).map((sp) => ({
    value: `sp:${sp.id}`,
    label: `SP: ${sp.spName}`
  }));
  return [...baseFilters, ...spFilters];
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
      { html: pill(record.priority, `priority-${record.priority}`) },
      record.dueDate || "Sin fecha",
      edit
    ]);
  }
  if (store === "spMigrations") {
    return row([
      record.spName,
      record.devName || "Sin dev",
      findName("members", record.qaId) || "Sin QA",
      { html: statusBadge(record.status) },
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
      { html: statusBadge(record.status) },
      { html: pill(record.priority, `priority-${record.priority}`) },
      record.observation || "Sin observacion",
      edit
    ]);
  }
  if (store === "useCases") {
    return row([
      findSpMigration(record.spMigrationId),
      record.code,
      record.name,
      { html: statusBadge(record.status) },
      { html: pill(record.priority, `priority-${record.priority}`) },
      record.observation || "Sin observacion",
      edit
    ]);
  }
  if (store === "bugs") {
    return row([record.title, { html: pill(record.severity, `severity-${record.severity}`) }, { html: statusBadge(record.status) }, findName("members", record.memberId) || "Sin responsable", findTestCase(record.testCaseId), edit]);
  }
  return row([record.name, record.role, { html: statusBadge(record.status) }, `${record.capacity || 0}%`, record.email || "Sin correo", edit]);
}

function row(cells) {
  return `<tr>${cells.map((cell) => `<td>${cell?.html || escapeHtml(cell || "")}</td>`).join("")}</tr>`;
}

function pill(text, className) {
  return `<span class="priority-pill ${escapeHtml(className)}">${escapeHtml(text || "Media")}</span>`;
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
  state.editing = { store, id: recordId };
  $("#dialog-kicker").textContent = viewConfig[store]?.kicker || "Registro";
  $("#dialog-title").textContent = record ? `Editar ${singular(store)}` : `Nuevo ${singular(store)}`;
  $("#delete-item").classList.toggle("hidden", !record);
  renderForm(store, record || {});
  $("#item-dialog").showModal();
}

function renderForm(store, record) {
  $("#form-fields").innerHTML = fieldConfig[store].map((field) => {
    const value = record[field.name] ?? defaultValue(field);
    const classes = `field ${field.full ? "full" : ""}`;
    if (["select", "member", "useCase", "testCase", "spMigration"].includes(field.type)) {
      return `<div class="${classes}"><label for="${field.name}">${field.label}</label><select id="${field.name}" name="${field.name}">${optionsFor(field, value)}</select></div>`;
    }
    if (field.type === "checkbox") {
      return `<div class="${classes}"><label><input type="checkbox" id="${field.name}" name="${field.name}" value="true" ${value ? "checked" : ""}> ${field.label}</label></div>`;
    }
    if (field.type === "textarea") {
      return `<div class="${classes}"><label for="${field.name}">${field.label}</label><textarea id="${field.name}" name="${field.name}">${escapeHtml(value)}</textarea></div>`;
    }
    return `<div class="${classes}"><label for="${field.name}">${field.label}</label><input id="${field.name}" name="${field.name}" type="${field.type}" value="${escapeHtml(value)}" ${field.required ? "required" : ""} ${field.min !== undefined ? `min="${field.min}"` : ""} ${field.max !== undefined ? `max="${field.max}"` : ""}></div>`;
  }).join("");
}

function optionsFor(field, value) {
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
    const testCases = state.data.testCases ?? [];
    options = [{ value: "", label: "Sin caso de prueba" }, ...testCases.map((item) => ({ value: item.id, label: `${item.code} - ${item.name}` }))];
  }
  if (field.type === "spMigration") {
    const spMigrations = state.data.spMigrations ?? [];
    options = [{ value: "", label: "Sin SP" }, ...spMigrations.map((item) => ({ value: item.id, label: item.spName }))];
  }
  if (field.type === "select") options = (field.options ?? []).map((option) => typeof option === "string" ? { value: option, label: option } : option);
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

function filterRecords(records) {
  if (!state.search) return records;
  return records.filter((record) => JSON.stringify(record).toLowerCase().includes(state.search));
}

function defaultValue(field) {
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

function findTestCaseSp(testCase) {
  if (testCase.spMigrationId) return findSpMigration(testCase.spMigrationId);
  const useCases = state.data.useCases ?? [];
  const useCase = useCases.find((record) => record.id === testCase.useCaseId);
  return findSpMigration(useCase?.spMigrationId);
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
