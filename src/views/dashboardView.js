// Dashboard, metrics, Kanban and workload views.

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
