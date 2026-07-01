// Dialog editor controller.

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

function bindBugSpTestCaseSelector() {
  const spSelect = $("#spMigrationId");
  const testCaseSelect = $("#testCaseId");
  const testCaseField = fieldConfig.bugs.find((field) => field.name === "testCaseId");
  if (!spSelect || !testCaseSelect || !testCaseField) return;
  spSelect.addEventListener("change", () => {
    testCaseSelect.innerHTML = optionsFor(testCaseField, "", { spMigrationId: spSelect.value });
  });
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
