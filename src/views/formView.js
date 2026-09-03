// Dialog form view helpers.

function renderForm(store, record) {
  $("#form-fields").innerHTML = fieldConfig[store].map((field) => {
    const value = record[field.name] ?? defaultValue(field);
    const classes = `field ${field.full ? "full" : ""}`;
    if (["select", "member", "testCase", "spMigration", "microservicio"].includes(field.type)) {
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
  if (store === "tasks") {
    $("#form-fields").insertAdjacentHTML("beforeend", taskStatusChangeFieldsHtml(record));
    if (record.id) bindTaskStatusCommentRequirement();
  }
}

function taskStatusChangeFieldsHtml(record) {
  if (!record.id) return "";
  const historyHtml = taskStatusHistoryHtml(record.statusHistory);
  const reviewEnteredAt = taskReviewEntryAt(record);
  return `
    <div class="field full">
      <label>Iteraciones</label>
      <div class="static-value" id="task-iterations-value">${record.iterations || 0}</div>
    </div>
    <div class="field full">
      <label>Entrada a revision</label>
      <div class="static-value">${escapeHtml(formatHistoryDate(reviewEnteredAt) || "Sin entrada registrada")}</div>
    </div>
    <div class="field full" id="status-comment-field">
      <label for="statusChangeComment">Comentario del cambio de estado</label>
      <textarea id="statusChangeComment" name="statusChangeComment"></textarea>
      <p class="field-hint">Obligatorio si cambias el estado.</p>
    </div>
    ${historyHtml}
  `;
}

function taskStatusHistoryHtml(statusHistory) {
  if (!statusHistory?.length) return "";
  const items = statusHistory.slice().reverse().map((entry) => `
    <li>
      <strong>${escapeHtml(statusLabels[entry.from] || entry.from || "Sin estado")} &rarr; ${escapeHtml(statusLabels[entry.to] || entry.to || "Sin estado")}</strong>
      <span class="card-meta">${escapeHtml(formatHistoryDate(entry.at))}</span>
      <p>${escapeHtml(entry.comment || "Sin comentario")}</p>
    </li>
  `).join("");
  return `
    <div class="field full">
      <label>Historial de cambios de estado</label>
      <ul class="status-history-list">${items}</ul>
    </div>
  `;
}

function formatHistoryDate(isoDate) {
  if (!isoDate) return "";
  const date = new Date(isoDate);
  return Number.isNaN(date.getTime()) ? isoDate : date.toLocaleString();
}

function bindTaskStatusCommentRequirement() {
  const statusSelect = $("#status");
  const commentField = $("#statusChangeComment");
  const commentWrapper = $("#status-comment-field");
  if (!statusSelect || !commentField) return;
  const syncRequirement = () => {
    const changed = statusSelect.value !== (state.editing?.originalStatus ?? null);
    commentField.required = changed;
    commentWrapper?.classList.toggle("is-required", changed);
  };
  statusSelect.addEventListener("change", syncRequirement);
  syncRequirement();
}

function optionsFor(field, value, record = {}) {
  let options = [];
  if (field.type === "member") {
    const emptyLabel = field.name === "qaId" ? "Sin QA" : "Sin responsable";
    const members = state.data.members ?? [];
    options = [{ value: "", label: emptyLabel }, ...members.map((item) => ({ value: item.id, label: item.name }))];
  }
  if (field.type === "testCase") {
    const selectedMicroservicio = record.microservicio || "";
    const testCases = field.filterByMicroservicio && selectedMicroservicio
      ? (state.data.testCases ?? []).filter((item) => effectiveMicroservicio("testCases", item) === selectedMicroservicio)
      : (state.data.testCases ?? []);
    const emptyLabel = field.filterByMicroservicio && !selectedMicroservicio
      ? "Seleccione un microservicio primero"
      : "Sin caso de prueba";
    options = [{ value: "", label: emptyLabel }, ...testCases.map((item) => ({ value: item.id, label: `${item.code} - ${item.name}` }))];
  }
  if (field.type === "spMigration") {
    const spMigrations = state.data.spMigrations ?? [];
    options = [{ value: "", label: "Sin SP" }, ...spMigrations.map((item) => ({ value: item.id, label: item.spName }))];
  }
  if (field.type === "microservicio") {
    options = [{ value: "", label: "Ninguno" }, ...microservicioOptions().map((name) => ({ value: name, label: name }))];
  }
  if (field.type === "select") {
    options = (field.options ?? []).map((option) => typeof option === "string" ? { value: option, label: option } : option);
    if (field.emptyLabel) options = [{ value: "", label: field.emptyLabel }, ...options];
  }
  return options.map((option) => `<option value="${escapeHtml(option.value)}" ${option.value === value ? "selected" : ""}>${escapeHtml(option.label)}</option>`).join("");
}
