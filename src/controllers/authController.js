// Authentication flow controller.

async function initializeAuth() {
  try {
    const session = await api("/api/auth/me");
    state.currentUser = session.user;
    await refreshData();
    showApp();
    render();
  } catch {
    showLogin();
  }
}

async function handleLoginSubmit(event) {
  event.preventDefault();
  await submitLoginForm();
}

async function submitLoginForm() {
  const form = $("#login-form");
  if (!form.reportValidity()) return;
  const formData = new FormData(form);
  const submitButton = $("#login-submit");
  setLoginError("");
  submitButton.disabled = true;
  submitButton.textContent = "Ingresando";

  try {
    const session = await api("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({
        email: formData.get("email"),
        password: formData.get("password")
      })
    });
    state.currentUser = session.user;
    await refreshData();
    form.reset();
    showApp();
    render();
  } catch (error) {
    setLoginError(error.message || "No se pudo iniciar sesion.");
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = "Ingresar";
  }
}

async function handleLogout() {
  try {
    await api("/api/auth/logout", { method: "POST", body: JSON.stringify({}) });
  } finally {
    state.currentUser = null;
    state.data = Object.fromEntries(stores.map((store) => [store, []]));
    showLogin();
  }
}

function showApp() {
  $("#login-view").classList.add("hidden");
  $("#app-shell").classList.remove("hidden");
  $("#current-user").textContent = state.currentUser?.email || "";
  setLoginError("");
}

function showLogin() {
  $("#app-shell").classList.add("hidden");
  $("#login-view").classList.remove("hidden");
  $("#login-email").focus();
}

function setLoginError(message) {
  const error = $("#login-error");
  error.textContent = message;
  error.classList.toggle("hidden", !message);
}
