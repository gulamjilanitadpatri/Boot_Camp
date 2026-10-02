// ============================================================
// STUDENT DASHBOARD
// Displays the logged-in student information, tests, attendance,
// and public test-score information.
// ============================================================

const session = getSession("studentSession");

if (!session) {
  location.href = "login.html";
} else {
  document.getElementById("studentName").textContent = session.name || "Student";
  document.getElementById("welcomeName").textContent = (session.name || "Student").split(" ")[0];

  document.getElementById("logoutBtn").addEventListener("click", () => {
    clearSession("studentSession");
    location.href = "login.html";
  });

  loadDashboard();
}

function escapeHtml(v) {
  return String(v ?? "").replace(/[&<>"']/g, c => ({
    "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#039;"
  }[c]));
}

function renderProfile(s) {
  const student = s || {};
  const items = [
    ["Name", student.name],
    ["Email", student.email],
    ["Mobile", student.mobile],
    ["SY Roll Number", student.syRoll],
    ["TY Roll Number", student.tyRoll],
    ["Department", student.department],
    ["Year", student.year],
    ["Division", student.division],
    ["College", student.college]
  ];

  document.getElementById("profile").innerHTML = items.map(([k,v]) =>
    `<div><span>${escapeHtml(k)}</span><strong>${escapeHtml(v || "-")}</strong></div>`
  ).join("");
}

async function loadDashboard() {
  // Load each dashboard part separately. If one part has a problem,
  // aptitude tests and attendance can still appear.
  await Promise.all([
    loadStudent(),
    loadTests(),
    loadResults(),
    loadAttendance()
  ]);
}

async function loadStudent() {
  try {
    const data = await api("getStudent", {email: session.email});
    renderProfile(data.student);
  } catch (err) {
    document.getElementById("profile").innerHTML =
      `<div class="empty error-text">${escapeHtml(err.message)}</div>`;
  }
}

async function loadTests() {
  const box = document.getElementById("tests");
  box.innerHTML = `<div class="loading">Loading aptitude tests…</div>`;

  try {
    const data = await api("getTests", {email: session.email});
    renderTests(data.tests || []);
  } catch (err) {
    box.innerHTML = `<div class="empty error-text">${escapeHtml(err.message)}</div>`;
  }
}

function renderTests(tests) {
  const box = document.getElementById("tests");

  if (!tests.length) {
    box.innerHTML = `<div class="empty">No aptitude tests are available yet.</div>`;
    return;
  }

  box.innerHTML = tests.map(t => `
    <article class="test-card">
      <div class="test-number">${escapeHtml(t.testId)}</div>
      <h3>${escapeHtml(t.testName)}</h3>
      <p>${escapeHtml(t.description || "Aptitude assessment")}</p>
      <div class="test-meta">
        <span>⏱ ${Number(t.duration || 0)} min</span>
        <span>✦ ${Number(t.questionCount || 0)} questions</span>
        <span>★ ${Number(t.maxScore || 0)} marks</span>
      </div>
      ${t.completed
        ? `<button class="btn disabled-btn" disabled>✓ Completed</button>`
        : Number(t.questionCount || 0) === 0
          ? `<button class="btn disabled-btn" disabled>No Questions</button>`
          : `<a class="btn primary" href="aptitude.html?test=${encodeURIComponent(t.testId)}">Start Test</a>`
      }
    </article>
  `).join("");
}

async function loadResults() {
  const box = document.getElementById("results");
  box.innerHTML = `<div class="loading">Loading test results…</div>`;

  try {
    const data = await api("getStudentResults", {email: session.email});
    renderResults(data.results || []);
  } catch (err) {
    box.innerHTML = `<div class="empty error-text">${escapeHtml(err.message)}</div>`;
  }
}

function renderResults(results) {
  const box = document.getElementById("results");

  if (!results.length) {
    box.innerHTML = `<div class="empty">No test results yet.</div>`;
    return;
  }

  box.innerHTML = `
    <table>
      <thead>
        <tr>
          <th>Test</th>
          <th>Score</th>
          <th>Max</th>
          <th>Percentage</th>
          <th>Correct</th>
          <th>Wrong</th>
          <th>Date</th>
        </tr>
      </thead>
      <tbody>
        ${results.map(r => `
          <tr>
            <td>${escapeHtml(r.testName)}</td>
            <td>${Number(r.score || 0)}</td>
            <td>${Number(r.maxScore || 0)}</td>
            <td>${Number(r.percentage || 0)}%</td>
            <td>${Number(r.correct || 0)}</td>
            <td>${Number(r.wrong || 0)}</td>
            <td>${escapeHtml(r.timestamp)}</td>
          </tr>
        `).join("")}
      </tbody>
    </table>`;
}

async function loadAttendance() {
  const box = document.getElementById("studentAttendance");
  box.innerHTML = `<div class="loading">Loading attendance…</div>`;

  try {
    const data = await api("getStudentAttendance", {email: session.email});
    renderAttendance(data.attendance || [], data.summary || {});
  } catch (err) {
    box.innerHTML = `<div class="empty error-text">${escapeHtml(err.message)}</div>`;
  }
}

function renderAttendance(records, summary) {
  const summaryBox = document.getElementById("attendanceSummary");
  const box = document.getElementById("studentAttendance");

  summaryBox.innerHTML = `
    <div><b>${Number(summary.total || 0)}</b><span>Total Days</span></div>
    <div><b>${Number(summary.present || 0)}</b><span>Present</span></div>
    <div><b>${Number(summary.absent || 0)}</b><span>Absent</span></div>
    <div><b>${Number(summary.late || 0)}</b><span>Late</span></div>
    <div><b>${Number(summary.percentage || 0)}%</b><span>Attendance</span></div>
  `;

  if (!records.length) {
    box.innerHTML = `<div class="empty">No attendance records yet.</div>`;
    return;
  }

  box.innerHTML = `
    <table>
      <thead>
        <tr>
          <th>Date</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        ${records.map(a => `
          <tr>
            <td>${escapeHtml(a.date)}</td>
            <td><span class="pill attendance-${escapeHtml(String(a.status).toLowerCase())}">${escapeHtml(a.status)}</span></td>
          </tr>
        `).join("")}
      </tbody>
    </table>`;
}
