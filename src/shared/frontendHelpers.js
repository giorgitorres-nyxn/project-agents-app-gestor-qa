// Shared lookup, formatting and export helpers used by controllers and views.

function filterRecords(records) {
  if (!state.search) return records;
  return records.filter((record) => JSON.stringify(record).toLowerCase().includes(state.search));
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
