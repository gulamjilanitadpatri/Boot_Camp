// ============================================================
// ADMIN FORGOT PASSWORD
// Verifies the admin account and updates its password.
// ============================================================

const form = document.getElementById("adminForgotForm");
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const status = document.getElementById("status");
  const newPassword = document.getElementById("newPassword").value;
  const confirmPassword = document.getElementById("confirmPassword").value;
  if (newPassword !== confirmPassword) return setStatus(status, "Passwords do not match.", "error");
  try {
    const r = await api("adminForgotPassword", {
      email: document.getElementById("email").value.trim().toLowerCase(),
      newPassword
    });
    setStatus(status, r.message || "Password updated.", "success");
    setTimeout(() => location.href = "admin.html", 900);
  } catch (err) { setStatus(status, err.message, "error"); }
});