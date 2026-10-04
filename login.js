// ============================================================
// STUDENT LOGIN
// Handles student login and creates the browser session.
// ============================================================

const form = document.getElementById("loginForm");
const statusEl = document.getElementById("status");

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const btn = form.querySelector("button");
  btn.disabled = true;
  btn.textContent = "Logging in…";
  try {
    const result = await api("login", {
      email: document.getElementById("email").value.trim().toLowerCase(),
      password: document.getElementById("password").value
    });
    saveSession("studentSession", result.student);
    location.href = "dashboard.html";
  } catch (err) {
    setStatus(statusEl, err.message, "error");
  } finally {
    btn.disabled = false;
    btn.textContent = "Login";
  }
});
