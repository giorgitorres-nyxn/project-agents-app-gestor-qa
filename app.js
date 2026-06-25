const stores = ["members", "useCases", "testCases", "bugs", "tasks", "spMigrations"];

const spMigrationStatuses = ["SQL recibido", "REST/gRPC recibido", "En QA", "Matriz lista", "Evidencia QMetry", "En revision por banco", "Finalizado"];

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
    columns: ["SP del CP", "Codigo", "Nombre", "Estado", "Prioridad", "Observacion", ""]
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

const bulkImportStores = new Set(["testCases", "useCases", "bugs"]);

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
    { name: "status", label: "Estado", type: "select", options: spMigrationStatuses },
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
    { name: "spMigrationId", label: "SP asociado", type: "spMigration" },
    { name: "testCaseId", label: "Caso de prueba", type: "testCase", filterBySp: true },
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
  customFilters: Object.fromEntries(stores.map((store) => [store, []])),
  search: "",
  editing: null,
  importingStore: null,
  currentUser: null,
  data: Object.fromEntries(stores.map((store) => [store, []]))
};

const $ = (selector) => document.querySelector(selector);

document.addEventListener("DOMContentLoaded", async () => {
  bindEvents();
  await initializeAuth();
});

const spMigrationTransitions = {
  "SQL recibido": ["REST/gRPC recibido", "Finalizado"],
  "REST/gRPC recibido": ["En QA", "Finalizado"],
  "En QA": ["Matriz lista", "En revision por banco", "Finalizado"],
  "Matriz lista": ["Evidencia QMetry", "Finalizado"],
  "Evidencia QMetry": ["En revision por banco", "Finalizado"],
  "En revision por banco": ["Finalizado"],
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
  if (!["dashboard", "indicators"].includes(view)) {
    state.listView = view;
  }
  document.querySelectorAll(".nav-item").forEach((item) => item.classList.toggle("active", item.dataset.view === view));
  render();
}

function render() {
  const isDashboard = state.activeView === "dashboard";
  const isIndicators = state.activeView === "indicators";
  $("#dashboard-view").classList.toggle("active-view", isDashboard);
  $("#indicators-view").classList.toggle("active-view", isIndicators);
  $("#list-view").classList.toggle("active-view", !isDashboard && !isIndicators);
  $("#new-item").classList.toggle("hidden", isIndicators);
  $("#bulk-import").classList.toggle("hidden", isDashboard || isIndicators || !bulkImportStores.has(state.listView));
  $("#new-item").textContent = state.activeView === "dashboard" ? "Nueva tarea" : "Nuevo";
  $("#page-title").textContent = isDashboard ? "Tablero QA" : isIndicators ? "Indicadores" : viewConfig[state.listView].title;

  if (isDashboard) {
    renderMetrics();
    renderKanban();
  }
  if (isIndicators) renderIndicators();
  if (!isDashboard && !isIndicators) renderList();
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

function renderIndicators() {
  const container = $("#indicators-content");
  const members = filterRecords(state.data.members ?? []);
  const allMembers = state.data.members ?? [];
  const tasks = state.data.tasks ?? [];
  const bugs = state.data.bugs ?? [];
  const testCases = state.data.testCases ?? [];
  const spMigrations = state.data.spMigrations ?? [];
  const activeTasks = tasks.filter((task) => task.status !== "done");
  const activeBugs = bugs.filter((bug) => !["Resuelto", "Cerrado"].includes(bug.status));
  const executedTests = testCases.filter((test) => test.status === "Ejecutado").length;
  const blockedTests = testCases.filter((test) => test.status === "Bloqueado").length;
  const completedSp = spMigrations.filter((sp) => sp.status === "Finalizado").length;
  const qmetryReady = spMigrations.filter((sp) => sp.qmetryEvidenceReady || sp.status === "Evidencia QMetry").length;
  const averageCapacity = allMembers.length
    ? Math.round(allMembers.reduce((total, member) => total + Number(member.capacity || 0), 0) / allMembers.length)
    : 0;

  const memberStats = members.map((member) => {
    const memberTasks = activeTasks.filter((task) => task.memberId === member.id);
    const memberBugs = activeBugs.filter((bug) => bug.memberId === member.id);
    const memberSp = spMigrations.filter((sp) => sp.qaId === member.id && sp.status !== "Finalizado");
    return {
      ...member,
      activeTasks: memberTasks.length,
      reviewTasks: memberTasks.filter((task) => task.status === "review").length,
      activeBugs: memberBugs.length,
      activeSp: memberSp.length,
      capacity: Number(member.capacity || 0)
    };
  }).sort((a, b) => (b.activeTasks + b.activeBugs + b.activeSp) - (a.activeTasks + a.activeBugs + a.activeSp));

  const cards = [
    ["Ejecucion de casos", `${percentage(executedTests, testCases.length)}%`, `${executedTests} de ${testCases.length} ejecutados`],
    ["SP finalizados", `${percentage(completedSp, spMigrations.length)}%`, `${completedSp} de ${spMigrations.length} cerrados`],
    ["Carga promedio", `${averageCapacity}%`, `${allMembers.length} miembro(s) QA`],
    ["Errores activos", activeBugs.length, `${activeBugs.filter((bug) => ["Critica", "Alta"].includes(bug.severity)).length} de alta prioridad`],
    ["QMetry listo", qmetryReady, "evidencia o etapa QMetry"],
    ["Bloqueos", blockedTests, "casos de prueba bloqueados"]
  ];

  container.innerHTML = `
    <div class="indicator-grid">
      ${cards.map(([label, value, detail]) => `
        <article class="metric indicator-card">
          <span>${escapeHtml(label)}</span>
          <strong>${escapeHtml(value)}</strong>
          <span>${escapeHtml(detail)}</span>
        </article>
      `).join("")}
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
            label: status,
            value: spMigrations.filter((sp) => sp.status === status).length
          })))}
          ${barChart("Errores activos por severidad", ["Critica", "Alta", "Media", "Baja"].map((severity) => ({
            label: severity,
            value: activeBugs.filter((bug) => bug.severity === severity).length
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
}

function memberIndicatorRow(member) {
  const initials = member.name.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase();
  return `
    <article class="member-indicator-row">
      <div class="member-top">
        <div class="avatar">${escapeHtml(initials)}</div>
        <div>
          <strong>${escapeHtml(member.name)}</strong>
          <div class="card-meta">${escapeHtml(member.role || "QA")} - ${escapeHtml(member.status || "Disponible")}</div>
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

  $("#table-body").innerHTML = records.length
    ? records.map((record) => tableRow(config.store, record)).join("")
    : `<tr><td colspan="${config.columns.length}"><div class="empty-state">No hay registros para mostrar.</div></td></tr>`;

  $("#table-body").querySelectorAll("[data-edit]").forEach((button) => {
    button.addEventListener("click", () => openEditor(config.store, button.dataset.edit));
  });
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
    renderList();
  });
  $("#list-filters").querySelectorAll("[data-remove-filter]").forEach((button) => {
    button.addEventListener("click", () => {
      state.customFilters[config.store] = activeFilters.filter((filter) => filter.id !== button.dataset.removeFilter);
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
  const rawValue = filterValueFor(store, record, filter.fieldKey);
  const text = normalizeFilterText(rawValue);
  const expected = normalizeFilterText(filter.value);

  if (filter.operator === "empty") return !text;
  if (filter.operator === "notEmpty") return Boolean(text);
  if (filter.operator === "equals") return text === expected;
  if (filter.operator === "notContains") return !text.includes(expected);
  return text.includes(expected);
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
  if (fieldKey === "capacity") return `${record.capacity || 0}%`;
  if (fieldKey === "sql") return artifactFilterText(record.sqlReceived);
  if (fieldKey === "rest") return artifactFilterText(record.restReceived);
  if (fieldKey === "grpc") return artifactFilterText(record.grpcReceived);
  if (fieldKey === "matrix") return artifactFilterText(record.equivalenceMatrixReady);
  if (fieldKey === "qmetry") return artifactFilterText(record.qmetryEvidenceReady);
  return record[fieldKey] ?? "";
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
    return row([
      record.title,
      findBugSpMigration(record),
      findTestCase(record.testCaseId),
      { html: pill(record.severity, `severity-${record.severity}`) },
      { html: statusBadge(record.status) },
      findName("members", record.memberId) || "Sin responsable",
      edit
    ]);
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
  ["useCases", "testCases", "bugs"].forEach((groupStore) => {
    if (Array.isArray(source?.[groupStore])) groups[groupStore] = source[groupStore];
  });
  if (Object.keys(groups).length) return groups;

  throw new Error(`Usa un arreglo JSON o un objeto con alguna propiedad: "useCases", "testCases" o "bugs".`);
}

async function importRecordGroups(groups) {
  const result = { created: 0, errors: [] };
  for (const store of ["useCases", "testCases", "bugs"]) {
    const records = groups[store] || [];
    for (const [index, rawRecord] of records.entries()) {
      try {
        const record = normalizeImportRecord(store, rawRecord);
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

function normalizeImportRecord(store, rawRecord) {
  if (!rawRecord || typeof rawRecord !== "object" || Array.isArray(rawRecord)) {
    throw new Error("cada registro debe ser un objeto");
  }

  const record = {};
  if (rawRecord.id) record.id = String(rawRecord.id).trim();
  const config = fieldConfig[store] ?? [];
  config.forEach((field) => {
    const hasValue = Object.prototype.hasOwnProperty.call(rawRecord, field.name) && rawRecord[field.name] !== null;
    const value = hasValue ? rawRecord[field.name] : defaultValue(field);
    record[field.name] = normalizeFieldValue(field, value);
  });
  record.spMigrationId = resolveImportSpMigrationId(record.spMigrationId);

  const missingRequired = config
    .filter((field) => field.required && !String(record[field.name] ?? "").trim())
    .map((field) => field.label);
  if (missingRequired.length) {
    throw new Error(`faltan campos obligatorios (${missingRequired.join(", ")})`);
  }

  validateImportRelations(store, record);
  return record;
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
