// ============================================================
// STUDENT FORGOT PASSWORD
// Verifies the student information and updates the password.
// ============================================================

const form = document.getElementById("studentForgotForm");
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const status = document.getElementById("status");
  const newPassword = document.getElementById("newPassword").value;
  const confirmPassword = document.getElementById("confirmPassword").value;
  if (newPassword !== confirmPassword) return setStatus(status, "Passwords do not match.", "error");
  try {
    const r = await api("studentForgotPassword", {
      email: document.getElementById("email").value.trim().toLowerCase(),
      fyRoll: document.getElementById("fyRoll").value.trim(),
      syRoll: document.getElementById("syRoll").value.trim(),
      tyRoll: document.getElementById("tyRoll").value.trim(),
      btechRoll: document.getElementById("btechRoll").value.trim(),
      newPassword
    });
    setStatus(status, r.message || "Password updated.", "success");
    setTimeout(() => location.href = "login.html", 900);
  } catch (err) { setStatus(status, err.message, "error"); }
});