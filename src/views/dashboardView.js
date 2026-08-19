// Dashboard, metrics, Kanban and workload views.

function renderMetrics() {
  const activeBugs = state.data.bugs?.filter((bug) => !["Resuelto", "Cerrado"].includes(bug.status)).length ?? 0;
  const runningTasks = state.data.tasks?.filter((task) => task.status !== "done").length ?? 0;
  const overdueTasks = state.data.tasks?.filter(taskIsOverdue).length ?? 0;
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
    ["Bloqueos", blocked, "casos bloqueados"],
    ["Tareas vencidas", overdueTasks, "requieren atencion", "indicator-danger"]
  ];

  $("#metrics").innerHTML = metrics.map(([label, value, detail, className = ""]) => `
    <article class="metric ${className}">
      <span>${escapeHtml(label)}</span>
      <strong>${value}</strong>
      <span>${escapeHtml(detail)}</span>
    </article>
  `).join("");
}

function renderKanban() {
  document.querySelectorAll("[data-kanban-root]").forEach(renderKanbanRoot);
}

function renderKanbanRoot(root) {
  renderKanbanFilterBar(root);
  renderKanbanBoard(root);
}

function renderKanbanBoard(root) {
  const board = root.querySelector("[data-kanban-board]");
  if (!board) return;
  const tasks = applyKanbanFilters(filterRecords(state.data.tasks ?? []));
  board.innerHTML = Object.keys(statusLabels).map((status) => {
    const filtered = tasks.filter((task) => task.status === status);
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
    column.addEventListener("drop", (event) => {
      event.preventDefault();
      const task = state.data.tasks.find((item) => item.id === event.dataTransfer.getData("text/plain"));
      if (!task || task.status === column.dataset.status) return;
      openEditor("tasks", task.id, { status: column.dataset.status });
    });
  });
}

function renderKanbanFilterBar(root) {
  const container = root.querySelector("[data-kanban-filters]");
  if (!container) return;
  const filters = state.kanbanFilters ?? {};
  const members = state.data.members ?? [];
  const hasActiveFilters = filters.memberId || filters.lote || filters.funcionalidad || filters.microservicio || filters.dateFrom || filters.dateTo;
  container.innerHTML = `
    <div class="kanban-filter-controls">
      <label class="kanban-filter-field">
        <span>Responsable</span>
        <select data-kf-member aria-label="Filtrar por responsable">
          <option value="">Todos</option>
          ${members.map((member) => `<option value="${escapeHtml(member.id)}" ${member.id === filters.memberId ? "selected" : ""}>${escapeHtml(member.name)}</option>`).join("")}
        </select>
      </label>
      <label class="kanban-filter-field">
        <span>Desde</span>
        <input type="date" data-kf-date-from value="${escapeHtml(filters.dateFrom || "")}" aria-label="Filtrar desde fecha">
      </label>
      <label class="kanban-filter-field">
        <span>Hasta</span>
        <input type="date" data-kf-date-to value="${escapeHtml(filters.dateTo || "")}" aria-label="Filtrar hasta fecha">
      </label>
      <label class="kanban-filter-field">
        <span>Lote</span>
        <select data-kf-lote aria-label="Filtrar por lote">
          <option value="">Todos</option>
          ${loteOptions().map((value) => `<option value="${escapeHtml(value)}" ${value === filters.lote ? "selected" : ""}>${escapeHtml(value)}</option>`).join("")}
        </select>
      </label>
      <label class="kanban-filter-field">
        <span>Funcionalidad</span>
        <select data-kf-funcionalidad aria-label="Filtrar por funcionalidad">
          <option value="">Todas</option>
          ${funcionalidadOptions(filters.lote).map((value) => `<option value="${escapeHtml(value)}" ${value === filters.funcionalidad ? "selected" : ""}>${escapeHtml(value)}</option>`).join("")}
        </select>
      </label>
      <label class="kanban-filter-field">
        <span>Microservicio</span>
        <select data-kf-microservicio aria-label="Filtrar por microservicio">
          <option value="">Todos</option>
          ${microservicioOptions(filters.lote, filters.funcionalidad).map((value) => `<option value="${escapeHtml(value)}" ${value === filters.microservicio ? "selected" : ""}>${escapeHtml(value)}</option>`).join("")}
        </select>
      </label>
      <button class="ghost-button ${hasActiveFilters ? "" : "hidden"}" type="button" data-kf-clear>Limpiar</button>
    </div>
  `;

  container.querySelector("[data-kf-member]").addEventListener("change", (event) => {
    state.kanbanFilters = { ...state.kanbanFilters, memberId: event.target.value };
    renderKanban();
  });
  container.querySelector("[data-kf-date-from]").addEventListener("change", (event) => {
    state.kanbanFilters = { ...state.kanbanFilters, dateFrom: event.target.value };
    renderKanban();
  });
  container.querySelector("[data-kf-date-to]").addEventListener("change", (event) => {
    state.kanbanFilters = { ...state.kanbanFilters, dateTo: event.target.value };
    renderKanban();
  });
  container.querySelector("[data-kf-lote]").addEventListener("change", (event) => {
    const lote = event.target.value;
    const clearedDates = lote ? { dateFrom: "", dateTo: "" } : {};
    state.kanbanFilters = { ...state.kanbanFilters, lote, funcionalidad: "", microservicio: "", ...clearedDates };
    renderKanban();
  });
  container.querySelector("[data-kf-funcionalidad]").addEventListener("change", (event) => {
    const funcionalidad = event.target.value;
    const clearedDates = funcionalidad ? { dateFrom: "", dateTo: "" } : {};
    state.kanbanFilters = { ...state.kanbanFilters, funcionalidad, microservicio: "", ...clearedDates };
    renderKanban();
  });
  container.querySelector("[data-kf-microservicio]").addEventListener("change", (event) => {
    const microservicio = event.target.value;
    const clearedDates = microservicio ? { dateFrom: "", dateTo: "" } : {};
    state.kanbanFilters = { ...state.kanbanFilters, microservicio, ...clearedDates };
    renderKanban();
  });
  container.querySelector("[data-kf-clear]").addEventListener("click", () => {
    state.kanbanFilters = { memberId: "", lote: "", funcionalidad: "", microservicio: "", ...currentWeekRange() };
    renderKanban();
  });
}

function loteOptions() {
  const values = new Set((state.data.spMigrations ?? []).map((sp) => sp.numeroLote).filter(Boolean));
  return [...values].sort();
}

function funcionalidadOptions(lote) {
  const sps = (state.data.spMigrations ?? []).filter((sp) => !lote || sp.numeroLote === lote);
  const values = new Set(sps.map((sp) => sp.funcionalidad).filter(Boolean));
  return [...values].sort();
}

function microservicioOptions(lote, funcionalidad) {
  const sps = (state.data.spMigrations ?? []).filter((sp) => (!lote || sp.numeroLote === lote) && (!funcionalidad || sp.funcionalidad === funcionalidad));
  const values = new Set(sps.map((sp) => sp.nombreMicroservicio).filter(Boolean));
  return [...values].sort();
}

function applyKanbanFilters(records) {
  const { memberId, dateFrom, dateTo, lote, funcionalidad, microservicio } = state.kanbanFilters ?? {};
  const spMigrations = state.data.spMigrations ?? [];
  return records.filter((record) => {
    if (memberId && record.memberId !== memberId) return false;
    if (lote || funcionalidad || microservicio) {
      const recordMicro = effectiveMicroservicio("tasks", record);
      if (microservicio && recordMicro !== microservicio) return false;
      const sp = recordMicro ? spMigrations.find((item) => item.nombreMicroservicio === recordMicro) : null;
      if (lote && sp?.numeroLote !== lote) return false;
      if (funcionalidad && sp?.funcionalidad !== funcionalidad) return false;
    }
    if (dateFrom && (!record.dueDate || record.dueDate < dateFrom)) return false;
    if (dateTo && (!record.dueDate || record.dueDate > dateTo)) return false;
    return true;
  });
}

function taskCard(task) {
  const member = findName("members", task.memberId);
  const microservicio = effectiveMicroservicio("tasks", task);
  const sp = microservicio ? (state.data.spMigrations ?? []).find((item) => item.nombreMicroservicio === microservicio) : null;
  const overdue = taskIsOverdue(task);
  const breadcrumb = sp
    ? `<strong>${escapeHtml(sp.numeroLote || "Sin lote")}</strong> › ${escapeHtml(sp.funcionalidad || "Sin funcionalidad")} › ${escapeHtml(microservicio)}`
    : "Sin microservicio asignado";
  const who = member
    ? `<span class="card-avatar">${escapeHtml(initialsFor(member))}</span> ${escapeHtml(member)}`
    : "Sin responsable";
  return `
    <article class="card ${overdue ? "overdue" : ""}" draggable="true" data-id="${escapeHtml(task.id)}">
      <div class="card-title">
        <strong>${escapeHtml(task.title)}</strong>
        <span class="priority-pill priority-${escapeHtml(task.priority)}">${escapeHtml(task.priority || "Media")}</span>
      </div>
      <div class="card-breadcrumb">${breadcrumb}</div>
      <div class="card-footer">
        <span class="card-who">${who}</span>
        <span class="tag-pill">${escapeHtml(catalogLabel("tasks", "kind", task.kind) || "Tarea")}</span>
      </div>
      <div class="card-footer">
        <span class="card-dates">Creada ${escapeHtml(formatCardDate(task.createdAt))}</span>
        <span class="card-dates">${overdue ? `<span class="overdue-flag">Vencida</span> ` : ""}${escapeHtml(formatCardDate(task.dueDate))}</span>
      </div>
    </article>
  `;
}

function initialsFor(name) {
  return String(name || "").split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase();
}

function formatCardDate(value) {
  if (!value) return "Sin fecha";
  const [year, month, day] = String(value).slice(0, 10).split("-");
  const months = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
  const monthIndex = Number(month) - 1;
  if (!year || !day || Number.isNaN(monthIndex) || monthIndex < 0 || monthIndex > 11) return value;
  return `${day} ${months[monthIndex]} ${year}`;
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
    const initials = initialsFor(member.name);
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
