// Top-level view switcher.

function render() {
  const isDashboard = state.activeView === "dashboard";
  const isIndicators = state.activeView === "indicators";
  const isConfiguration = state.activeView === "configuration";
  $("#dashboard-view").classList.toggle("active-view", isDashboard);
  $("#indicators-view").classList.toggle("active-view", isIndicators);
  $("#configuration-view").classList.toggle("active-view", isConfiguration);
  $("#list-view").classList.toggle("active-view", !isDashboard && !isIndicators && !isConfiguration);
  $("#new-item").classList.toggle("hidden", isIndicators || isConfiguration);
  $("#bulk-import").classList.toggle("hidden", isDashboard || isIndicators || isConfiguration || !bulkImportStores.has(state.listView));
  $("#new-item").textContent = state.activeView === "dashboard" ? "Nueva tarea" : "Nuevo";
  $("#page-title").textContent = isDashboard ? "Tablero QA" : isIndicators ? "Indicadores" : isConfiguration ? "Configuracion" : viewConfig[state.listView].title;

  if (isDashboard) {
    renderMetrics();
    renderKanban();
  }
  if (isIndicators) renderIndicators();
  if (isConfiguration) renderConfiguration();
  if (!isDashboard && !isIndicators && !isConfiguration) renderList();
}
