// Main application navigation and global event controller.

function bindEvents() {
  $("#login-form").addEventListener("submit", handleLoginSubmit);
  document.querySelectorAll(".nav-item").forEach((button) => {
    button.addEventListener("click", () => setView(button.dataset.view));
  });

  $("#new-item").addEventListener("click", () => openEditor(state.activeView === "dashboard" ? "tasks" : state.listView));
  $("#quick-task").addEventListener("click", () => openEditor("tasks"));
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

function setView(view) {
  state.activeView = view;
  if (!["dashboard", "indicators", "configuration"].includes(view)) {
    state.listView = view;
  }
  document.querySelectorAll(".nav-item").forEach((item) => item.classList.toggle("active", item.dataset.view === view));
  render();
}
