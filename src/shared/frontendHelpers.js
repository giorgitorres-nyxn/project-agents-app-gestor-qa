// Shared lookup, formatting and export helpers used by controllers and views.

function filterRecords(records) {
  if (!state.search) return records;
  return records.filter((record) => JSON.stringify(record).toLowerCase().includes(state.search));
}

function todayIso() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

function taskIsOverdue(task) {
  return isTaskOverdue(task, todayIso());
}

function taskReviewEntryAt(task) {
  const explicitDate = String(task?.reviewEnteredAt ?? "").trim();
  if (explicitDate) return explicitDate;
  const history = Array.isArray(task?.statusHistory) ? task.statusHistory : [];
  const reviewEntry = history.slice().reverse().find((entry) => isTaskReviewStatus(entry?.to));
  if (reviewEntry?.at) return reviewEntry.at;
  const completedDate = String(task?.completedAt ?? "").trim();
  if (completedDate) return completedDate;
  return isTaskReviewStatus(task?.status) ? (task?.updatedAt || "") : "";
}

function defaultValue(field) {
  if (!field) return "";
  if (field.default !== undefined) return field.default;
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
  return testCase.spMigrationId || "";
}

function findTestCaseSp(testCase) {
  return findSpMigration(testCaseSpMigrationId(testCase));
}

function legacySpMigrationId(store, record) {
  if (!record) return "";
  if (record.spMigrationId) return record.spMigrationId;
  if (store === "bugs") {
    const testCase = (state.data.testCases ?? []).find((item) => item.id === record.testCaseId);
    return testCase ? legacySpMigrationId("testCases", testCase) : "";
  }
  return "";
}

function effectiveMicroservicio(store, record) {
  if (record?.microservicio) return record.microservicio;
  if (store === "spMigrations") return record?.nombreMicroservicio || "";
  const legacyId = legacySpMigrationId(store, record);
  if (!legacyId) return "";
  return (state.data.spMigrations ?? []).find((item) => item.id === legacyId)?.nombreMicroservicio || "";
}

function withEffectiveMicroservicio(store, record) {
  return { ...record, microservicio: record.microservicio || effectiveMicroservicio(store, record) };
}

function singular(store) {
  return {
    tasks: "tarea",
    spMigrations: "microservicio",
    testCases: "caso de prueba",
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
