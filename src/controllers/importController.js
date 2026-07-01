// Bulk import controller and normalization helpers.

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
  bulkImportGroupStores.forEach((groupStore) => {
    if (Array.isArray(source?.[groupStore])) groups[groupStore] = source[groupStore];
  });
  if (Object.keys(groups).length) return groups;

  throw new Error(`Usa un arreglo JSON o un objeto con alguna propiedad: "spMigrations", "useCases", "testCases" o "bugs".`);
}

async function importRecordGroups(groups) {
  const result = { created: 0, errors: [] };
  const context = buildImportContext(groups);
  for (const store of bulkImportGroupStores) {
    const records = groups[store] || [];
    for (const [index, rawRecord] of records.entries()) {
      try {
        const record = normalizeImportRecord(store, rawRecord, context);
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

function buildImportContext(groups) {
  const aliases = Object.fromEntries(bulkImportGroupStores.map((store) => [store, new Map()]));
  bulkImportGroupStores.forEach((store) => {
    (groups[store] || []).forEach((record) => {
      if (!record || typeof record !== "object" || Array.isArray(record) || !record.id) return;
      const rawId = String(record.id).trim();
      if (!rawId || aliases[store].has(rawId)) return;
      aliases[store].set(rawId, resolveImportRecordId(store, rawId));
    });
  });
  return { aliases };
}

function resolveImportRecordId(store, rawId) {
  if (isUuid(rawId)) return rawId;
  const existing = (state.data[store] ?? []).find((record) => record.importKey === rawId || record.id === rawId);
  return existing?.id || createUuid();
}

function createUuid() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (char) => {
    const random = Math.floor(Math.random() * 16);
    const value = char === "x" ? random : (random & 0x3) | 0x8;
    return value.toString(16);
  });
}

function isUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value || "").trim());
}

function normalizeImportRecord(store, rawRecord, context = { aliases: {} }) {
  if (!rawRecord || typeof rawRecord !== "object" || Array.isArray(rawRecord)) {
    throw new Error("cada registro debe ser un objeto");
  }

  const record = {};
  const rawId = rawRecord.id ? String(rawRecord.id).trim() : "";
  if (rawId) {
    record.id = context.aliases?.[store]?.get(rawId) || resolveImportRecordId(store, rawId);
    if (!isUuid(rawId)) record.importKey = rawId;
  }
  if (rawRecord.importKey && !record.importKey) record.importKey = String(rawRecord.importKey).trim();
  const config = fieldConfig[store] ?? [];
  config.forEach((field) => {
    const hasValue = Object.prototype.hasOwnProperty.call(rawRecord, field.name) && rawRecord[field.name] !== null;
    const value = hasValue ? rawRecord[field.name] : defaultValue(field);
    record[field.name] = normalizeFieldValue(field, value);
  });
  record.spMigrationId = resolveImportReference("spMigrations", record.spMigrationId, context);
  if (store === "testCases") record.useCaseId = resolveImportReference("useCases", record.useCaseId, context);
  if (store === "bugs") {
    record.testCaseId = resolveImportReference("testCases", record.testCaseId, context);
    record.memberId = resolveImportReference("members", record.memberId, context);
  }

  const missingRequired = config
    .filter((field) => field.required && !String(record[field.name] ?? "").trim())
    .map((field) => field.label);
  if (missingRequired.length) {
    throw new Error(`faltan campos obligatorios (${missingRequired.join(", ")})`);
  }

  validateImportRelations(store, record);
  return record;
}

function resolveImportReference(store, value, context = { aliases: {} }) {
  const normalizedValue = String(value || "").trim();
  if (!normalizedValue) return "";
  const mappedId = context.aliases?.[store]?.get(normalizedValue);
  if (mappedId) return mappedId;
  const existing = (state.data[store] ?? []).find((record) => record.id === normalizedValue || record.importKey === normalizedValue);
  if (existing) return existing.id;
  if (store === "spMigrations") return resolveImportSpMigrationId(normalizedValue);
  return normalizedValue;
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
    spMigrations: {
      spMigrations: [
        {
          id: "sp-consulta-saldo",
          spName: "sp_consulta_saldo",
          sqlReceivedDate: "",
          sqlReceived: true,
          devName: "Equipo migracion",
          qaId: "",
          status: "En QA",
          restReceivedDate: "",
          restReceived: true,
          grpcReceivedDate: "",
          grpcReceived: true,
          equivalenceMatrixReady: false,
          qmetryEvidenceReady: false,
          notes: "Los IDs legibles se convierten automaticamente a UUID durante la importacion."
        }
      ]
    },
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
          executionStatus: "Exitoso",
          bankApproval: "No Aprobado",
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
