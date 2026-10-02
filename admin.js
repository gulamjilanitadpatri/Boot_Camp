// ============================================================
// ADMIN DASHBOARD
// Controls students, tests, results, attendance, academic-year
// promotion, and other administrator actions.
// ============================================================

const admin = getSession("adminSession");

if (!admin) {
  location.href = "admin.html";
} else {
  document.getElementById("logoutBtn").addEventListener("click", () => {
    clearSession("adminSession");
    location.href = "admin.html";
  });

  setupAdminNavigation();
  setToday();
  loadAttendanceStudents();
  loadTests();
}

function setupAdminNavigation() {
  document.querySelectorAll(".side-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".side-btn").forEach(x => x.classList.remove("active"));
      document.querySelectorAll(".admin-section").forEach(x => x.classList.remove("active"));

      btn.classList.add("active");
      const section = document.getElementById("section-" + btn.dataset.section);
      if (section) section.classList.add("active");

      switch (btn.dataset.section) {
        case "tests": loadTests(); break;
        case "students": loadStudents(); break;
        case "attendance":
          loadAttendanceStudents();
          loadAttendance();
          break;
        case "academic":
          loadAcademicStudents();
          break;
        case "results": loadResults(); break;
      }
    });
  });
}

function setToday() {
  const dateInput = document.getElementById("attendanceDate");
  if (!dateInput) return;
  const today = new Date();
  const local = new Date(today.getTime() - today.getTimezoneOffset() * 60000)
    .toISOString().slice(0,10);
  dateInput.value = local;
}

function v(id) {
  const el = document.getElementById(id);
  return el ? el.value.trim() : "";
}

function esc(value) {
  return String(value ?? "").replace(/[&<>"']/g, c => ({
    "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#039;"
  }[c]));
}

// ---------------- CREATE TEST ----------------

const createForm = document.getElementById("createTestForm");
if (createForm) {
  createForm.addEventListener("submit", async e => {
    e.preventDefault();
    const status = document.getElementById("createStatus");
    const btn = createForm.querySelector("button");
    btn.disabled = true;

    try {
      const r = await api("adminCreateTest", {
        testId: v("testId"),
        testName: v("testName"),
        description: v("testDescription"),
        duration: Number(v("duration")),
        marksPerQuestion: Number(v("marksPerQuestion")),
        startDate: v("startDate"),
        endDate: v("endDate"),
        status: v("testStatus")
      });

      setStatus(status, r.message, "success");
      createForm.reset();
      document.getElementById("duration").value = 20;
      document.getElementById("marksPerQuestion").value = 1;
      await loadTests();
    } catch (err) {
      setStatus(status, err.message, "error");
    } finally {
      btn.disabled = false;
    }
  });
}

// ---------------- ADD QUESTION ----------------

const qForm = document.getElementById("questionForm");
if (qForm) {
  qForm.addEventListener("submit", async e => {
    e.preventDefault();
    const status = document.getElementById("questionStatus");
    const btn = qForm.querySelector("button");
    btn.disabled = true;

    try {
      const r = await api("adminAddQuestion", {
        testId: v("qTestId"),
        questionId: v("questionId"),
        question: v("question"),
        optionA: v("optionA"),
        optionB: v("optionB"),
        optionC: v("optionC"),
        optionD: v("optionD"),
        correctAnswer: v("correctAnswer"),
        marks: Number(v("qMarks"))
      });

      setStatus(status, r.message, "success");
      qForm.reset();
      document.getElementById("qMarks").value = 1;
      await loadTests();
    } catch (err) {
      setStatus(status, err.message, "error");
    } finally {
      btn.disabled = false;
    }
  });
}

// ---------------- ACADEMIC YEAR / STUDENT SHIFT ----------------

document.getElementById("shiftStudentForm")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = document.getElementById("shiftStudentEmail").value.trim();
  const academicYear = document.getElementById("adminAcademicYear").value.trim();
  const box = document.getElementById("shiftStatus");
  try {
    const r = await api("adminShiftStudent", { email, academicYear });
    setStatus(box, r.message, "success");
    await loadAcademicStudents();
    cachedStudents = [];
  } catch (err) { setStatus(box, err.message, "error"); }
});

document.getElementById("deleteBTechRollBtn")?.addEventListener("click", async () => {
  const email = document.getElementById("shiftStudentEmail").value.trim();
  const box = document.getElementById("shiftStatus");
  if (!email) return setStatus(box, "Enter the student email first.", "error");
  if (!confirm("Delete the B-Tech Roll for this student?")) return;
  try {
    const r = await api("adminClearBTechRoll", { email });
    setStatus(box, r.message, "success");
    await loadAcademicStudents();
  } catch (err) { setStatus(box, err.message, "error"); }
});

async function loadAcademicStudents() {
  const box = document.getElementById("academicStudents");
  if (!box) return;
  box.innerHTML = `<div class="loading">Loading students…</div>`;
  try {
    const r = await api("adminGetStudents");
    const students = r.students || [];
    box.innerHTML = students.length ? `<table><thead><tr><th>Name</th><th>Email</th><th>FY Roll</th><th>SY Roll</th><th>TY Roll</th><th>B-Tech Roll</th><th>Year</th><th>Academic Year</th></tr></thead><tbody>${students.map(s => `<tr><td>${esc(s.name)}</td><td>${esc(s.email)}</td><td>${esc(s.fyRoll || "-")}</td><td>${esc(s.syRoll || "-")}</td><td>${esc(s.tyRoll || "-")}</td><td>${esc(s.btechRoll || "-")}</td><td>${esc(s.year || "-")}</td><td>${esc(s.academicYear || "-")}</td></tr>`).join("")}</tbody></table>` : `<div class="empty">No registered students.</div>`;
  } catch (e) { box.innerHTML = `<div class="empty error-text">${esc(e.message)}</div>`; }
}

// ---------------- ATTENDANCE ----------------

document.getElementById("saveAttendanceBtn")?.addEventListener("click", async () => {
  const date = document.getElementById("attendanceDate").value;
  const statusBox = document.getElementById("attendanceStatusMessage");
  const btn = document.getElementById("saveAttendanceBtn");
  const checks = [...document.querySelectorAll(".attendance-check")];

  if (!date) return setStatus(statusBox, "Please select a date.", "error");
  if (!checks.length) return setStatus(statusBox, "No students are registered.", "error");

  btn.disabled = true;
  try {
    const presentEmails = checks.filter(x => x.checked).map(x => x.value);
    const r = await api("adminSaveDailyAttendance", { date, presentEmails });
    setStatus(statusBox, r.message, "success");
    await loadAttendance();
  } catch (err) {
    setStatus(statusBox, err.message, "error");
  } finally { btn.disabled = false; }
});

async function loadAttendanceStudents() {
  const box = document.getElementById("attendanceChecklist");
  if (!box) return;
  try {
    const r = await api("adminGetStudents");
    const students = r.students || [];
    if (!students.length) {
      box.innerHTML = `<div class="empty">No registered students.</div>`;
      return;
    }
    box.innerHTML = `
      <div class="attendance-actions">
        <button type="button" class="ghost-btn" id="selectAllPresent">Select All Present</button>
        <button type="button" class="ghost-btn" id="clearAllPresent">Clear All</button>
      </div>
      <div class="attendance-grid">
      ${students.map(s => `
        <label class="attendance-student">
          <input class="attendance-check" type="checkbox" value="${esc(s.email)}">
          <span><strong>${esc(s.name)}</strong><small>${esc(s.syRoll || "-")} / ${esc(s.tyRoll || "-")} · ${esc(s.email)}</small></span>
        </label>`).join("")}
      </div>`;
    document.getElementById("selectAllPresent").onclick = () =>
      document.querySelectorAll(".attendance-check").forEach(x => x.checked = true);
    document.getElementById("clearAllPresent").onclick = () =>
      document.querySelectorAll(".attendance-check").forEach(x => x.checked = false);
  } catch (e) { box.innerHTML = `<div class="empty error-text">${esc(e.message)}</div>`; }
}

async function loadAttendance() {
  const box = document.getElementById("adminAttendance");
  if (!box) return;
  box.innerHTML = `<div class="loading">Loading attendance…</div>`;
  try {
    const r = await api("adminGetAttendance");
    const records = r.attendance || [];
    if (!records.length) { box.innerHTML = `<div class="empty">No attendance records yet.</div>`; return; }
    box.innerHTML = `<table><thead><tr><th>Date</th><th>Student</th><th>Roll</th><th>Email</th><th>Status</th></tr></thead>
      <tbody>${records.map(a => `<tr><td>${esc(a.date)}</td><td>${esc(a.studentName)}</td>
      <td>${esc(findRoll(a.studentEmail))}</td><td>${esc(a.studentEmail)}</td>
      <td><span class="pill attendance-${esc(String(a.status).toLowerCase())}">${esc(a.status)}</span></td></tr>`).join("")}</tbody></table>`;
  } catch (e) { box.innerHTML = `<div class="empty error-text">${esc(e.message)}</div>`; }
}

let cachedStudents = [];
async function ensureStudentCache() {
  if (cachedStudents.length) return cachedStudents;
  try { const r = await api("adminGetStudents"); cachedStudents = r.students || []; } catch(e) {}
  return cachedStudents;
}
function findRoll(email) {
  const s = cachedStudents.find(x => String(x.email).toLowerCase() === String(email).toLowerCase());
  return s ? (s.fyRoll || s.syRoll || s.tyRoll || s.btechRoll || "-") : "-";
}

// ---------------- TEST / STUDENT / RESULT LISTS ----------------

async function loadTests() {
  const box = document.getElementById("adminTests");
  if (!box) return;
  box.innerHTML = `<div class="loading">Loading…</div>`;

  try {
    const r = await api("adminGetTests");
    box.innerHTML = (r.tests || []).map(t => `
      <div class="admin-row">
        <div>
          <strong>${esc(t.testId)} · ${esc(t.testName)}</strong>
          <small>${esc(t.description || "")}</small>
        </div>
        <span>${Number(t.questionCount || 0)} questions · ${Number(t.maxScore || 0)} marks · ${esc(t.status)}</span>
      </div>
    `).join("") || `<div class="empty">No tests created.</div>`;
  } catch(e) {
    box.innerHTML = `<div class="empty error-text">${esc(e.message)}</div>`;
  }
}

async function loadStudents() {
  const box = document.getElementById("students");
  if (!box) return;
  box.innerHTML = `<div class="loading">Loading…</div>`;

  try {
    const r = await api("adminGetStudents");
    cachedStudents = r.students || [];
    box.innerHTML = `
      <table>
        <thead><tr><th>Name</th><th>Email</th><th>FY Roll</th><th>SY Roll</th><th>TY Roll</th><th>B-Tech Roll</th><th>Department</th><th>Year</th><th>Academic Year</th></tr></thead>
        <tbody>
          ${cachedStudents.map(s => `
            <tr>
              <td>${esc(s.name)}</td>
              <td>${esc(s.email)}</td>
              <td>${esc(s.fyRoll || "-")}</td>
              <td>${esc(s.syRoll || "-")}</td>
              <td>${esc(s.tyRoll || "-")}</td>
              <td>${esc(s.btechRoll || "-")}</td>
              <td>${esc(s.department)}</td>
              <td>${esc(s.year)}</td>
              <td>${esc(s.academicYear || "-")}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>`;
  } catch(e) {
    box.innerHTML = `<div class="empty error-text">${esc(e.message)}</div>`;
  }
}

async function loadResults() {
  const box = document.getElementById("adminResults");
  if (!box) return;
  box.innerHTML = `<div class="loading">Loading…</div>`;

  try {
    const r = await api("adminGetResults");
    const leaderboardBox = document.getElementById("adminLeaderboard");
    if (leaderboardBox) {
      const groups = {};
      (r.results || []).forEach(x => {
        const key = x.testId || x.testName || "GENERAL";
        if (!groups[key]) groups[key] = {testName:x.testName, rows:[]};
        groups[key].rows.push(x);
      });
      const top = Object.values(groups).map(g => {
        const max = Math.max(...g.rows.map(x => Number(x.score || 0)));
        return {testName:g.testName, students:g.rows.filter(x => Number(x.score || 0) === max), max};
      });
      leaderboardBox.innerHTML = top.length ? top.map(g => `
        <div style="margin-bottom:20px"><h3>${esc(g.testName)}</h3>
        <table><thead><tr><th>Highest Scorer</th><th>Score</th></tr></thead><tbody>
        ${g.students.map(x => `<tr><td>${esc(x.studentName)}</td><td><strong>${Number(x.score || 0)}/${Number(x.maxScore || 0)}</strong></td></tr>`).join("")}
        </tbody></table></div>`).join("") : `<div class="empty">No test results yet.</div>`;
    }
    box.innerHTML = `
      <table>
        <thead><tr><th>Student</th><th>Test</th><th>Score</th><th>%</th><th>Date</th></tr></thead>
        <tbody>
          ${(r.results || []).map(x => `
            <tr>
              <td>${esc(x.studentName)}</td>
              <td>${esc(x.testName)}</td>
              <td>${Number(x.score || 0)}/${Number(x.maxScore || 0)}</td>
              <td>${Number(x.percentage || 0)}%</td>
              <td>${esc(x.timestamp)}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>` || `<div class="empty">No results yet.</div>`;

    if (!(r.results || []).length) {
      box.innerHTML = `<div class="empty">No results yet.</div>`;
    }
  } catch(e) {
    box.innerHTML = `<div class="empty error-text">${esc(e.message)}</div>`;
  }
}
