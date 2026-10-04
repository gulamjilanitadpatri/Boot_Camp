// ============================================================
// STUDENT REGISTRATION
// Handles class selection, class-specific roll numbers, and
// submission of the registration form.
// ============================================================

const form = document.getElementById("registerForm");
const statusEl = document.getElementById("status");
const classEl = document.getElementById("className");
const rollEl = document.getElementById("studentRoll");
const rollLabel = document.getElementById("rollFieldLabel");
const yearEl = document.getElementById("year");

const classConfig = {
  "FY": { label: "FY Roll Number", placeholder: "Enter FY roll number", year: "1st Year" },
  "SY": { label: "SY Roll Number", placeholder: "Enter SY roll number", year: "2nd Year" },
  "TY": { label: "TY Roll Number", placeholder: "Enter TY roll number", year: "3rd Year" },
  "B-Tech": { label: "B-Tech Roll Number", placeholder: "Enter B-Tech roll number", year: "4th Year" }
};

function updateRollField() {
  const selected = classConfig[classEl.value];
  const labelText = selected ? selected.label : "Student Roll Number";
  rollLabel.childNodes[0].textContent = labelText;
  rollEl.placeholder = selected ? selected.placeholder : "Select class first";
  rollEl.disabled = !selected;
  if (selected) {
    yearEl.value = selected.year;
  } else {
    yearEl.value = "";
  }
}

classEl.addEventListener("change", updateRollField);
updateRollField();

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const mobile = document.getElementById("mobile").value.trim();
  const selectedClass = classEl.value;
  const roll = rollEl.value.trim();

  if (!selectedClass || !classConfig[selectedClass]) {
    setStatus(statusEl, "Please select a class.", "error");
    return;
  }
  if (!roll) {
    setStatus(statusEl, `Enter the ${selectedClass} roll number.`, "error");
    return;
  }
  if (!/^\d+$/.test(roll)) {
    setStatus(statusEl, "Roll number should contain digits only.", "error");
    return;
  }
  if (!/^\d{10}$/.test(mobile)) {
    setStatus(statusEl, "Enter a valid 10-digit mobile number.", "error");
    return;
  }

  const btn = form.querySelector("button");
  btn.disabled = true;
  btn.textContent = "Creating account…";

  const rollPayload = { fyRoll: "", syRoll: "", tyRoll: "", btechRoll: "" };
  if (selectedClass === "FY") rollPayload.fyRoll = roll;
  if (selectedClass === "SY") rollPayload.syRoll = roll;
  if (selectedClass === "TY") rollPayload.tyRoll = roll;
  if (selectedClass === "B-Tech") rollPayload.btechRoll = roll;

  try {
    const result = await api("register", {
      name: document.getElementById("name").value.trim(),
      email: document.getElementById("email").value.trim().toLowerCase(),
      mobile,
      className: selectedClass,
      ...rollPayload,
      department: document.getElementById("department").value.trim(),
      year: yearEl.value,
      academicYear: document.getElementById("academicYear").value.trim(),
      division: document.getElementById("division").value.trim(),
      college: "V.V.P.I.E.T. Solapur",
      password: document.getElementById("password").value
    });
    setStatus(statusEl, result.message || "Registration successful!", "success");
    form.reset();
    document.getElementById("college").value = "V.V.P.I.E.T. Solapur";
    updateRollField();
    setTimeout(() => location.href = "login.html", 900);
  } catch (err) {
    setStatus(statusEl, err.message, "error");
  } finally {
    btn.disabled = false;
    btn.textContent = "Create Account";
  }
});
