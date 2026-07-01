// Dialog form view helpers.

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
