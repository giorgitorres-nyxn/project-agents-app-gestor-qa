// Main application navigation and global event controller.

function bindEvents() {
  applyUiPreferences();
  $("#login-form").addEventListener("submit", handleLoginSubmit);
  document.querySelectorAll(".nav-item").forEach((button) => {
    button.addEventListener("click", () => setView(button.dataset.view));
  });

  $("#sidebar-toggle").addEventListener("click", toggleSidebar);
  $("#theme-toggle").addEventListener("click", toggleTheme);
  $("#new-item").addEventListener("click", () => openEditor(state.activeView === "dashboard" ? "tasks" : state.listView));
  $("#quick-task").addEventListener("click", () => openEditor("tasks"));
  $("#expand-kanban").addEventListener("click", () => $("#kanban-expand-dialog").showModal());
  $("#close-kanban-expand").addEventListener("click", () => $("#kanban-expand-dialog").close());
  $("#global-search").addEventListener("input", (event) => {
    state.search = event.target.value.trim().toLowerCase();
    resetAllPages();
    render();
  });
  $("#export-data").addEventListener("click", exportData);
  $("#bulk-import").addEventListener("click", () => openBulkImport(state.listView));
  $("#import-form").addEventListener("submit", handleBulkImportSubmit);
  $("#choose-import-file").addEventListener("click", () => $("#import-file").click());
  $("#load-import-example").addEventListener("click", loadBulkImportExample);
  $("#import-file").addEventListener("change", handleImportFileChange);
  $("#item-form").addEventListener("submit", handleFormSubmit);
  $("#delete-item").addEventListener("click", handleDelete);
  $("#logout").addEventListener("click", handleLogout);
}

function toggleSidebar() {
  state.ui.sidebarCollapsed = !state.ui.sidebarCollapsed;
  writeBooleanPreference(uiPreferenceKeys.sidebarCollapsed, state.ui.sidebarCollapsed);
  applySidebarPreference();
}

function toggleTheme() {
  state.ui.darkMode = !state.ui.darkMode;
  writeBooleanPreference(uiPreferenceKeys.darkMode, state.ui.darkMode);
  applyThemePreference();
}

function applyUiPreferences() {
  applySidebarPreference();
  applyThemePreference();
}

function applySidebarPreference() {
  document.body.classList.toggle("sidebar-collapsed", Boolean(state.ui.sidebarCollapsed));
  const toggle = $("#sidebar-toggle");
  const icon = $("#sidebar-toggle-icon");
  if (!toggle || !icon) return;
  toggle.setAttribute("aria-expanded", state.ui.sidebarCollapsed ? "false" : "true");
  toggle.setAttribute("aria-label", state.ui.sidebarCollapsed ? "Desplegar menu" : "Plegar menu");
  icon.textContent = state.ui.sidebarCollapsed ? ">>" : "<<";
}

function applyThemePreference() {
  document.body.classList.toggle("dark-mode", Boolean(state.ui.darkMode));
  const toggle = $("#theme-toggle");
  const label = $("#theme-toggle-label");
  const icon = document.querySelector("#theme-toggle .theme-toggle-icon");
  if (!toggle || !label || !icon) return;
  toggle.setAttribute("aria-pressed", state.ui.darkMode ? "true" : "false");
  label.textContent = state.ui.darkMode ? "Modo claro" : "Modo oscuro";
  icon.textContent = state.ui.darkMode ? "CL" : "OS";
}

function setView(view) {
  const stop = startLoading("Cargando menu", { immediate: true });
  window.setTimeout(() => {
    state.activeView = view;
    if (!["dashboard", "indicators", "configuration"].includes(view)) {
      state.listView = view;
    }
    document.querySelectorAll(".nav-item").forEach((item) => item.classList.toggle("active", item.dataset.view === view));
    render();
    window.setTimeout(stop, 240);
  }, 0);
}
