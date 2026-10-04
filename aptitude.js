// ============================================================
// STUDENT TEST / APTITUDE PAGE
// Loads a selected test, displays questions, runs the timer, and
// submits the student answers to the server.
// ============================================================

const session = getSession("studentSession");
if (!session) location.href = "login.html";

const params = new URLSearchParams(location.search);
const testId = params.get("test");
let testData = null;
let remaining = 0;
let timerId = null;
let submitted = false;

function esc(v) {
  return String(v).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
}

async function init() {
  if (!testId) {
    document.getElementById("status").textContent = "Test not selected.";
    return;
  }
  try {
    const result = await api("getTest", {testId, email: session.email});
    testData = result.test;
    document.getElementById("testTitle").textContent = testData.testName;
    document.getElementById("testDescription").textContent = testData.description || "";
    document.getElementById("questionCount").textContent = testData.questions.length;
    renderQuestions(testData.questions);
    remaining = Number(testData.duration) * 60;
    startTimer();
  } catch (err) {
    setStatus(document.getElementById("status"), err.message, "error");
  }
}

function renderQuestions(questions) {
  document.getElementById("questions").innerHTML = questions.map((q, i) => `
    <article class="question-card panel">
      <div class="question-top"><span>Question ${i + 1}</span><small>${q.marks} mark${q.marks == 1 ? "" : "s"}</small></div>
      <h3>${esc(q.question)}</h3>
      <div class="options">
        ${["A","B","C","D"].map(letter => `
          <label class="option"><input type="radio" name="${esc(q.questionId)}" value="${letter}"><span><b>${letter}</b>${esc(q["option" + letter])}</span></label>
        `).join("")}
      </div>
    </article>`).join("");
}

function startTimer() {
  updateTimer();
  timerId = setInterval(() => {
    remaining--;
    updateTimer();
    if (remaining <= 0) {
      clearInterval(timerId);
      submitExam(true);
    }
  }, 1000);
}

function updateTimer() {
  const m = Math.floor(Math.max(remaining, 0) / 60);
  const s = Math.max(remaining, 0) % 60;
  const el = document.getElementById("timer");
  el.textContent = `${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`;
  if (remaining <= 60) el.classList.add("danger");
}

document.getElementById("examForm").addEventListener("submit", e => {
  e.preventDefault();
  submitExam(false);
});

async function submitExam(auto = false) {
  if (submitted || !testData) return;
  if (!auto && !confirm("Submit this test now? You cannot submit it again.")) return;
  submitted = true;
  clearInterval(timerId);
  const answers = {};
  testData.questions.forEach(q => {
    const selected = document.querySelector(`input[name="${CSS.escape(q.questionId)}"]:checked`);
    answers[q.questionId] = selected ? selected.value : "";
  });
  const status = document.getElementById("status");
  setStatus(status, auto ? "Time is over. Submitting…" : "Submitting…", "info");
  try {
    const result = await api("submitTest", {
      testId, email: session.email, answers,
      timeTaken: Math.max(0, Number(testData.duration) * 60 - remaining)
    });
    status.innerHTML = `<strong>Test submitted!</strong> Score: ${result.score}/${result.maxScore} (${result.percentage}%).`;
    status.className = "status success result-big";
    document.querySelector(".submit-test").disabled = true;
    setTimeout(() => location.href = "dashboard.html", 1800);
  } catch (err) {
    submitted = false;
    setStatus(status, err.message, "error");
  }
}
init();
