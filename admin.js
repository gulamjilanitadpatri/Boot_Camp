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
        case "certificates": loadCertificates(); break;
        case "feedback": loadFeedback(); break;
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
              <td><button class="btn secondary student-pdf-btn" type="button" data-email="${esc(s.email)}">Download PDF</button></td>
            </tr>
          `).join("")}
        </tbody>
      </table>`;
    box.querySelectorAll(".student-pdf-btn").forEach(btn => {
      btn.addEventListener("click", () => downloadStudentPerformancePdf(btn.dataset.email));
    });
  } catch(e) {
    box.innerHTML = `<div class="empty error-text">${esc(e.message)}</div>`;
  }
}

async function downloadStudentPerformancePdf(email) {
  if (!window.jspdf || !window.jspdf.jsPDF) {
    alert("PDF library could not be loaded. Please check your internet connection and try again.");
    return;
  }

  const button = document.querySelector(`.student-pdf-btn[data-email="${CSS.escape(email)}"]`);
  if (button) { button.disabled = true; button.textContent = "Preparing…"; }

  try {
    const data = await api("getStudentPerformance", {email});
    const s = data.student || {};
    const results = data.results || [];
    const attendance = data.attendance || [];
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({unit:"mm", format:"a4"});
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    let y = 18;

    const ensureSpace = (needed=10) => {
      if (y + needed > pageHeight - 18) {
        doc.addPage();
        y = 18;
        drawHeader();
      }
    };
    const drawHeader = () => {
      doc.setFillColor(65,32,160);
      doc.rect(0,0,pageWidth,28,"F");
      doc.setTextColor(255,255,255);
      doc.setFontSize(17);
      doc.setFont(undefined,"bold");
      doc.text("PYTHON BOOT CAMP", pageWidth/2, 12, {align:"center"});
      doc.setFontSize(9);
      doc.setFont(undefined,"normal");
      doc.text("Student Performance Report", pageWidth/2, 20, {align:"center"});
      doc.setTextColor(30,30,30);
      y = 38;
    };

    drawHeader();
    doc.setFontSize(14); doc.setFont(undefined,"bold"); doc.text("1. Student Details", 14, y); y += 8;
    doc.setFontSize(10); doc.setFont(undefined,"normal");
    const details = [
      ["Name", s.name], ["Email", s.email], ["Class", s.className],
      ["FY Roll", s.fyRoll || "-"], ["SY Roll", s.syRoll || "-"], ["TY Roll", s.tyRoll || "-"],
      ["Department", s.department], ["Year", s.year], ["Academic Year", s.academicYear || "-"],
      ["Division", s.division], ["College", s.college]
    ];
    details.forEach(([k,v]) => { ensureSpace(7); doc.setFont(undefined,"bold"); doc.text(k + ":", 16, y); doc.setFont(undefined,"normal"); doc.text(String(v || "-"), 55, y); y += 6; });

    ensureSpace(15); y += 4; doc.setFontSize(14); doc.setFont(undefined,"bold"); doc.text("2. Test Performance", 14, y); y += 8;
    doc.setFontSize(9);
    const headers = ["Test", "Score", "Max", "%", "Correct", "Wrong", "Date"];
    const xs = [14, 82, 102, 120, 138, 158, 176];
    doc.setFillColor(230,230,230); doc.rect(12,y-5,186,8,"F");
    headers.forEach((h,i)=>doc.text(h,xs[i],y)); y += 7;
    results.forEach(r=>{ ensureSpace(7); const vals=[r.testName,r.score,r.maxScore,(r.percentage||0)+"%",r.correct,r.wrong,r.timestamp]; vals.forEach((v,i)=>doc.text(String(v||"-"),xs[i],y,{maxWidth:i===0?65:20})); y+=6; });
    if (!results.length) { doc.text("No test results available.", 14, y); y += 6; }

    const totalScore = results.reduce((n,r)=>n+Number(r.score||0),0);
    const totalMax = results.reduce((n,r)=>n+Number(r.maxScore||0),0);
    const overall = totalMax ? ((totalScore/totalMax)*100).toFixed(2) : "0.00";
    ensureSpace(18); y += 4; doc.setFontSize(11); doc.setFont(undefined,"bold");
    doc.text(`Overall Score: ${totalScore}/${totalMax}    Overall Percentage: ${overall}%`, 14, y); y += 10;

    ensureSpace(15); doc.setFontSize(14); doc.text("3. Attendance",14,y); y+=8; doc.setFontSize(9); doc.setFont(undefined,"normal");
    const present=attendance.filter(a=>String(a.status).toLowerCase()==="present").length;
    const absent=attendance.filter(a=>String(a.status).toLowerCase()==="absent").length;
    const late=attendance.filter(a=>String(a.status).toLowerCase()==="late").length;
    const total=attendance.length; const attPct=total?(((present+late)/total)*100).toFixed(2):"0.00";
    doc.setFont(undefined,"bold"); doc.text(`Total Days: ${total}   Present: ${present}   Absent: ${absent}   Late: ${late}   Attendance: ${attPct}%`,14,y); y+=8; doc.setFont(undefined,"normal");
    doc.setFillColor(230,230,230); doc.rect(12,y-5,186,8,"F");
    ["Date","Status"].forEach((h,i)=>doc.text(h,[14,80][i],y)); y+=7;
    attendance.forEach(a=>{ ensureSpace(7); doc.text(String(a.date||"-"),14,y); doc.text(String(a.status||"-"),80,y); y+=6; });
    if (!attendance.length) { doc.text("No attendance records available.",14,y); y+=6; }

    ensureSpace(25); y += 8; doc.setFontSize(9); doc.text("Generated on: " + new Date().toLocaleString(), 14, y);
    doc.text("Admin Signature: __________________________", 125, y);
    y += 8; doc.setFontSize(8); doc.setTextColor(100,100,100); doc.text("Python Boot Camp - Official Student Performance Report", pageWidth/2, pageHeight-8, {align:"center"});
    doc.save(`Boot_Camp_Performance_${(s.name||"Student").replace(/[^a-z0-9]+/gi,"_")}.pdf`);
  } catch (err) {
    alert(err.message);
  } finally {
    if (button) { button.disabled = false; button.textContent = "Download PDF"; }
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


// ---------------- PERFORMANCE DOWNLOAD ----------------

document.getElementById("downloadAdminPerformanceBtn")?.addEventListener("click", downloadAdminPerformance);

async function downloadAdminPerformance() {
  const button = document.getElementById("downloadAdminPerformanceBtn");
  button.disabled = true;
  button.textContent = "Preparing…";

  try {
    const data = await api("adminGetPerformance");
    const rows = [["BOOT CAMP COMPLETE PERFORMANCE REPORT"], []];

    rows.push(["STUDENT DETAILS"]);
    rows.push(["Name", "Email", "Class", "FY Roll", "SY Roll", "TY Roll", "B-Tech Roll", "Department", "Year", "Academic Year", "Division", "College"]);
    (data.students || []).forEach(s => rows.push([
      s.name, s.email, s.className, s.fyRoll, s.syRoll, s.tyRoll, s.btechRoll,
      s.department, s.year, s.academicYear, s.division, s.college
    ]));

    rows.push([]);
    rows.push(["TEST RESULTS"]);
    rows.push(["Student", "Email", "Test", "Score", "Max Score", "Percentage", "Correct", "Wrong", "Date"]);
    (data.results || []).forEach(r => rows.push([
      r.studentName, r.studentEmail, r.testName, r.score, r.maxScore,
      r.percentage + "%", r.correct, r.wrong, r.timestamp
    ]));

    rows.push([]);
    rows.push(["ATTENDANCE"]);
    rows.push(["Date", "Student", "Email", "Status"]);
    (data.attendance || []).forEach(a => rows.push([
      a.date, a.studentName, a.studentEmail, a.status
    ]));

    downloadAdminCsv(rows, "boot_camp_complete_performance.csv");
  } catch (err) {
    alert(err.message);
  } finally {
    button.disabled = false;
    button.textContent = "Download Performance";
  }
}

function downloadAdminCsv(rows, filename) {
  const csv = rows.map(row => row.map(value => {
    const text = String(value ?? "");
    return '"' + text.replace(/"/g, '""') + '"';
  }).join(",")).join("\r\n");

  const blob = new Blob(["\ufeff" + csv], {type:"text/csv;charset=utf-8;"});
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

// ---------------- CERTIFICATE CONTROL ----------------

async function loadCertificates() {
  const box=document.getElementById("certificateStudents");
  if(!box) return;
  if(String(admin.email||"").toLowerCase() !== "jeelani0960@zohomail.in") { box.innerHTML='<div class="empty error-text">Certificate control is restricted to the authorized administrator.</div>'; return; }
  box.innerHTML='<div class="loading">Loading certificate requests…</div>';
  try {
    const data=await api("adminGetCertificates",{adminEmail:admin.email});
    box.innerHTML=`<table><thead><tr><th>Student</th><th>Email</th><th>Status</th><th>Decision</th></tr></thead><tbody>${(data.students||[]).map(s=>`<tr><td>${esc(s.name)}</td><td>${esc(s.email)}</td><td><span class="pill">${esc(s.status)}</span></td><td><button class="btn primary cert-approve" data-email="${esc(s.email)}">Approve</button> <button class="btn danger cert-reject" data-email="${esc(s.email)}">Reject</button></td></tr>`).join("")}</tbody></table>`;
    box.querySelectorAll('.cert-approve').forEach(b=>b.addEventListener('click',()=>setCertificateStatus(b.dataset.email,'Approved')));
    box.querySelectorAll('.cert-reject').forEach(b=>b.addEventListener('click',()=>setCertificateStatus(b.dataset.email,'Rejected')));
  } catch(err) { box.innerHTML=`<div class="empty error-text">${esc(err.message)}</div>`; }
}

async function setCertificateStatus(email,status) {
  if(String(admin.email||"").toLowerCase() !== "jeelani0960@zohomail.in") { alert("Only the authorized administrator can decide certificate status."); return; }
  if(!confirm(`${status} certificate for this student?`)) return;
  try { await api("adminSetCertificateStatus",{adminEmail:admin.email,studentEmail:email,status}); await loadCertificates(); }
  catch(err){ alert(err.message); }
}



// ---------------- PRIVATE STUDENT FEEDBACK ----------------
async function loadFeedback(){
  const box=document.getElementById('adminFeedback');
  if(!box) return;
  if(String(admin.email||'').toLowerCase() !== 'jeelani0960@zohomail.in'){
    box.innerHTML='<div class="empty error-text">Feedback access is restricted to the authorized administrator.</div>'; return;
  }
  box.innerHTML='<div class="loading">Loading feedback…</div>';
  try{
    const data=await api('adminGetFeedback',{adminEmail:admin.email});
    const items=data.feedback||[];
    if(!items.length){box.innerHTML='<div class="empty">No student feedback has been submitted yet.</div>';return;}
    box.innerHTML=`<table class="data-table"><thead><tr><th>Date</th><th>Student</th><th>Email</th><th>Rating</th><th>Feedback</th></tr></thead><tbody>${items.map(x=>`<tr><td>${esc(x.submittedAt||x.timestamp)}</td><td>${esc(x.name)}</td><td>${esc(x.email)}</td><td>${'★'.repeat(Math.max(0,Math.min(5,Number(x.rating||0))))}</td><td>${esc(x.feedback)}</td></tr>`).join('')}</tbody></table>`;
  }catch(err){box.innerHTML=`<div class="empty error-text">${esc(err.message)}</div>`;}
}
