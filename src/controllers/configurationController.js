// Configuration event controller and catalog persistence actions.

function bindConfigurationEvents(container, sectionKey) {
  container.querySelectorAll("[data-config-section]").forEach((button) => {
    button.addEventListener("click", () => {
      state.configurationSection = button.dataset.configSection;
      renderConfiguration();
    });
  });
  if (sectionKey === sqlConsoleSection) {
    bindSqlConsole(container);
    return;
  }
  container.querySelectorAll("[data-catalog-add]").forEach((button) => {
    button.addEventListener("click", () => addCatalogItem(button.dataset.store, button.dataset.field));
  });
  container.querySelectorAll("[data-catalog-input]").forEach((input) => {
    input.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        addCatalogItem(input.dataset.store, input.dataset.field);
      }
    });
  });
  container.querySelectorAll("[data-catalog-save]").forEach((button) => {
    button.addEventListener("click", () => updateCatalogItem(button.dataset.store, button.dataset.field, button.dataset.value));
  });
  container.querySelectorAll("[data-catalog-delete]").forEach((button) => {
    button.addEventListener("click", () => deleteCatalogItem(button.dataset.store, button.dataset.field, button.dataset.value));
  });
}

function bindSqlConsole(container) {
  const queryInput = $("#sql-console-query");
  container.querySelector("#sql-console-form")?.addEventListener("submit", runSqlConsole);
  queryInput?.addEventListener("input", () => {
    state.sqlConsole.query = queryInput.value;
  });
  container.querySelector("[data-sql-clear]")?.addEventListener("click", () => {
    state.sqlConsole = { ...state.sqlConsole, query: "", result: null, error: "" };
    renderConfiguration();
  });
  container.querySelectorAll("[data-sql-example]").forEach((button) => {
    button.addEventListener("click", () => {
      state.sqlConsole = { ...state.sqlConsole, query: button.dataset.sqlExample || "", result: null, error: "" };
      renderConfiguration();
      $("#sql-console-query")?.focus();
    });
  });
}

async function runSqlConsole(event) {
  event.preventDefault();
  const query = $("#sql-console-query")?.value.trim() || "";
  if (!query) return;

  state.sqlConsole = { ...state.sqlConsole, query, result: null, error: "", running: true };
  renderConfiguration();

  try {
    const result = await api("/api/sql-console", { method: "POST", body: JSON.stringify({ query }) });
    state.sqlConsole = { ...state.sqlConsole, result, error: "" };
    if (["INSERT", "UPDATE", "DELETE"].includes(result.command)) {
      await refreshData();
    }
  } catch (error) {
    state.sqlConsole = { ...state.sqlConsole, result: null, error: error.message || "No se pudo ejecutar la consulta." };
  } finally {
    state.sqlConsole.running = false;
    renderConfiguration();
  }
}

async function addCatalogItem(store, fieldKey) {
  const input = $(`[data-catalog-input][data-store="${store}"][data-field="${fieldKey}"]`);
  const label = input?.value.trim();
  if (!label) return;
  const items = catalogOptions(store, fieldKey);
  if (items.some((item) => normalizeFilterText(item.label) === normalizeFilterText(label))) {
    alert("Ese valor ya existe en la lista.");
    return;
  }
  const previousItems = structuredCloneSafe(items);
  items.push({ value: uniqueCatalogValue(store, fieldKey, label), label });
  catalogs[store][fieldKey] = items;
  try {
    await saveCatalogField(store, fieldKey);
    render();
  } catch (error) {
    catalogs[store][fieldKey] = previousItems;
    refreshCatalogDerivedState();
    render();
    alert(`Error: ${error.message}`);
  }
}

async function updateCatalogItem(store, fieldKey, value) {
  const input = Array.from(document.querySelectorAll("[data-catalog-edit]")).find((element) => element.dataset.catalogEdit === value);
  const label = input?.value.trim();
  if (!label) return;
  const items = catalogOptions(store, fieldKey);
  if (items.some((item) => item.value !== value && normalizeFilterText(item.label) === normalizeFilterText(label))) {
    alert("Ese valor ya existe en la lista.");
    return;
  }
  const item = items.find((entry) => entry.value === value);
  if (!item) return;
  const previousItems = structuredCloneSafe(items);
  item.label = label;
  catalogs[store][fieldKey] = items;
  try {
    await saveCatalogField(store, fieldKey);
    render();
  } catch (error) {
    catalogs[store][fieldKey] = previousItems;
    refreshCatalogDerivedState();
    render();
    alert(`Error: ${error.message}`);
  }
}

async function deleteCatalogItem(store, fieldKey, value) {
  const usageCount = catalogUsageCount(store, fieldKey, value);
  if (usageCount > 0) {
    alert(`No se puede eliminar porque hay ${usageCount} registro(s) usando este valor.`);
    return;
  }
  const items = catalogOptions(store, fieldKey);
  if (items.length <= 1) {
    alert("La lista debe conservar al menos un valor.");
    return;
  }
  const previousItems = structuredCloneSafe(items);
  catalogs[store][fieldKey] = items.filter((item) => item.value !== value);
  try {
    await saveCatalogField(store, fieldKey);
    render();
  } catch (error) {
    catalogs[store][fieldKey] = previousItems;
    refreshCatalogDerivedState();
    render();
    alert(`Error: ${error.message}`);
  }
}

function uniqueCatalogValue(store, fieldKey, label) {
  const base = store === "tasks" && fieldKey === "status" ? cssToken(label) || "estado" : label;
  const values = new Set(catalogValues(store, fieldKey));
  if (!values.has(base)) return base;
  let index = 2;
  while (values.has(`${base}-${index}`)) index += 1;
  return `${base}-${index}`;
}
