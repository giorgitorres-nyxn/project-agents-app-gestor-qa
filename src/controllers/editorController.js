// Dialog editor controller.

function openEditor(store, recordId = null, overrides = null) {
  const storeData = state.data[store] ?? [];
  const record = recordId ? storeData.find((item) => item.id === recordId) : null;
  const baseRecord = microservicioFilterableStores.has(store) ? withEffectiveMicroservicio(store, record || {}) : (record || {});
  const formRecord = overrides ? { ...baseRecord, ...overrides } : baseRecord;
  state.editing = { store, id: recordId, originalStatus: record?.status ?? null };
  $("#dialog-kicker").textContent = viewConfig[store]?.kicker || "Registro";
  $("#dialog-title").textContent = record ? `Editar ${singular(store)}` : `Nuevo ${singular(store)}`;
  $("#delete-item").classList.toggle("hidden", !record);
  renderForm(store, formRecord);
  $("#item-dialog").showModal();
}

function bindBugSpTestCaseSelector() {
  const microservicioSelect = $("#microservicio");
  const testCaseSelect = $("#testCaseId");
  const testCaseField = fieldConfig.bugs.find((field) => field.name === "testCaseId");
  if (!microservicioSelect || !testCaseSelect || !testCaseField) return;
  microservicioSelect.addEventListener("change", () => {
    testCaseSelect.innerHTML = optionsFor(testCaseField, "", { microservicio: microservicioSelect.value });
  });
}

async function handleFormSubmit(event) {
  event.preventDefault();
  if (event.submitter?.value === "cancel") {
    $("#item-dialog").close();
    return;
  }
  const submitButton = $("#save-item");
  submitButton.disabled = true;
  submitButton.textContent = "Guardando";
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

  if (store === "tasks" && editingId && record.status !== existing.status) {
    const comment = (formData.get("statusChangeComment") || "").trim();
    record.statusHistory = [
      ...(existing.statusHistory || []),
      { at: new Date().toISOString(), from: existing.status, to: record.status, comment }
    ];
    if (isTaskIterationTransition(existing.status, record.status)) {
      record.iterations = (existing.iterations || 0) + 1;
    }
  }

  try {
    await saveRecord(store, record);
    await refreshData();
    $("#item-dialog").close();
    render();
  } catch (error) {
    alert(`Error: ${error.message}`);
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = "Guardar";
  }
}

async function handleDelete() {
  const { store, id: editingId } = state.editing;
  if (!editingId) return;
  const deleteButton = $("#delete-item");
  deleteButton.disabled = true;
  deleteButton.textContent = "Eliminando";
  try {
    await deleteRecord(store, editingId);
    await refreshData();
    $("#item-dialog").close();
    render();
  } catch (error) {
    alert(`Error: ${error.message}`);
  } finally {
    deleteButton.disabled = false;
    deleteButton.textContent = "Eliminar";
  }
}
