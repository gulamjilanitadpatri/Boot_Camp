// ============================================================
// ADMIN LOGIN
// Handles administrator login and creates the admin session.
// ============================================================

const form = document.getElementById("adminLoginForm");
const statusEl = document.getElementById("status");

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const btn = form.querySelector("button");
  btn.disabled = true;
  btn.textContent = "Checking…";
  try {
    const result = await api("adminLogin", {
      email: document.getElementById("email").value.trim().toLowerCase(),
      password: document.getElementById("password").value
    });
    saveSession("adminSession", result.admin);
    location.href = "admin-dashboard.html";
  } catch (err) {
    setStatus(statusEl, err.message, "error");
  } finally {
    btn.disabled = false;
    btn.textContent = "Admin Login";
  }
});
