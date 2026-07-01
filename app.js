// Frontend bootstrap. Feature code lives in src/services, src/views and src/controllers.
document.addEventListener("DOMContentLoaded", async () => {
  bindEvents();
  await initializeAuth();
});
