// ============================================================
// GOOGLE APPS SCRIPT BACKEND
// This file is the server-side backend for the Boot Camp project.
// It reads and writes Google Sheets data and provides the API used
// by the student and admin frontend pages.
//
// Main areas handled here:
//   1. Student registration and login
//   2. Student/Admin password reset
//   3. Class and roll-number handling (FY/SY/TY/B-Tech)
//   4. Academic-year promotion (FY -> SY -> TY)
//   5. Attendance
//   6. Aptitude tests and test results
//   7. Highest-score/leaderboard information
//   8. Admin dashboard operations
// ============================================================

const SS = SpreadsheetApp.getActiveSpreadsheet();

const SHEETS = {
  REG: "Registration",
  ADMIN: "Admin",
  TESTS: "AptitudeTests",
  QUESTIONS: "AptitudeQuestions",
  RESULTS: "TestResults",
  ATTENDANCE: "Attendance"
};

const HEADERS = {
  [SHEETS.REG]: ["Timestamp","Name","Email","Mobile","Class","FYRoll","SYRoll","TYRoll","BTechRoll","Department","Year","AcademicYear","Division","College","Password"],
  [SHEETS.ADMIN]: ["Timestamp","Email","Password","Name"],
  [SHEETS.TESTS]: ["TestID","TestName","Description","DurationMinutes","MarksPerQuestion","StartDate","EndDate","Status","CreatedAt"],
  [SHEETS.QUESTIONS]: ["QuestionID","TestID","Question","OptionA","OptionB","OptionC","OptionD","CorrectAnswer","Marks"],
  [SHEETS.RESULTS]: ["Timestamp","ResultID","TestID","TestName","StudentEmail","StudentName","TotalQuestions","Attempted","Correct","Wrong","Score","MaxScore","Percentage","TimeTaken"],
  [SHEETS.ATTENDANCE]: ["Timestamp","Date","StudentEmail","StudentName","Status"]
};

function doGet() {
  return json({success:true, message:"Python Boot Camp API is working"});
}

function doPost(e) {
  try {
    ensureSupportSheets();
    if (!e || !e.postData || !e.postData.contents) {
      throw new Error("No request data received.");
    }

    const body = JSON.parse(e.postData.contents || "{}");
    const action = clean(body.action);

    switch (action) {
      case "register": return registerStudent(body);
      case "login": return studentLogin(body);
      case "adminLogin": return adminLogin(body);
      case "studentForgotPassword": return studentForgotPassword(body);
      case "adminForgotPassword": return adminForgotPassword(body);
      case "getStudent": return getStudent(body);
      case "getTests": return getTests(body);
      case "getTest": return getTest(body);
      case "submitTest": return submitTest(body);
      case "getStudentResults": return getStudentResults(body);
      case "adminCreateTest": return adminCreateTest(body);
      case "adminAddQuestion": return adminAddQuestion(body);
      case "adminGetTests": return adminGetTests();
      case "adminGetStudents": return adminGetStudents();
      case "adminShiftStudent": return adminShiftStudent(body);
      case "adminClearBTechRoll": return adminClearBTechRoll(body);
      case "adminGetResults": return adminGetResults();
      case "getLeaderboard": return getLeaderboard();
      case "adminAddAttendance": return adminAddAttendance(body);
      case "adminSaveDailyAttendance": return adminSaveDailyAttendance(body);
      case "adminGetAttendance": return adminGetAttendance();
      case "getStudentAttendance": return getStudentAttendance(body);
      default: return json({success:false, message:"Unknown action: " + action});
    }
  } catch (err) {
    return json({success:false, message:err.message || String(err)});
  }
}

function ensureSupportSheets() {
  Object.keys(HEADERS).forEach(name => {
    let s = SS.getSheetByName(name);
    if (!s) {
      s = SS.insertSheet(name);
      s.getRange(1,1,1,HEADERS[name].length).setValues([HEADERS[name]]);
      s.setFrozenRows(1);
    } else if (s.getLastRow() === 0) {
      s.getRange(1,1,1,HEADERS[name].length).setValues([HEADERS[name]]);
      s.setFrozenRows(1);
    }
  });

  // Migrate the older Registration sheet that used one "Roll" column.
  // Existing SY/2nd-year records go to SYRoll; TY/3rd-year records go to TYRoll.
  const reg = SS.getSheetByName(SHEETS.REG);
  if (reg) {
    const currentHeaders = reg.getRange(1,1,1,reg.getLastColumn()).getValues()[0].map(String);
    const expected = HEADERS[SHEETS.REG];
    if (currentHeaders.join("|") !== expected.join("|")) {
      const lastRow = reg.getLastRow();
      const oldValues = lastRow >= 2
        ? reg.getRange(2,1,lastRow - 1,reg.getLastColumn()).getValues()
        : [];

      const index = {};
      currentHeaders.forEach((h,i) => index[h] = i);
      const migrated = oldValues.map(r => {
        const year = String(r[index.Year] ?? "").toLowerCase();
        const oldRoll = String(r[index.Roll] ?? "").trim();
        const fy = String(r[index.FYRoll] ?? "").trim() || (/1st|fy/.test(year) ? oldRoll : "");
        const sy = String(r[index.SYRoll] ?? "").trim() || (/2nd|sy/.test(year) ? oldRoll : "");
        const ty = String(r[index.TYRoll] ?? "").trim() || (/3rd|ty/.test(year) ? oldRoll : "");
        const btech = String(r[index.BTechRoll] ?? "").trim();
        return [
          r[index.Timestamp] ?? "", r[index.Name] ?? "", r[index.Email] ?? "",
          r[index.Mobile] ?? "", r[index.Class] ?? (/1st|fy/.test(year) ? "FY" : /2nd|sy/.test(year) ? "SY" : /3rd|ty/.test(year) ? "TY" : /4th|b-tech|btech/.test(year) ? "B-Tech" : ""),
          fy, sy, ty, btech, r[index.Department] ?? "", r[index.Year] ?? "", r[index.AcademicYear] ?? "", r[index.Division] ?? "",
          r[index.College] ?? "", r[index.Password] ?? ""
        ];
      });

      reg.clearContents();
      reg.getRange(1,1,1,expected.length).setValues([expected]);
      if (migrated.length) reg.getRange(2,1,migrated.length,expected.length).setValues(migrated);
      reg.setFrozenRows(1);
    }
  }
}

function sheet(name) {
  const s = SS.getSheetByName(name);
  if (!s) throw new Error("Sheet not found: " + name);
  return s;
}

function rows(name) {
  const s = sheet(name);
  const lastRow = s.getLastRow();
  const lastCol = s.getLastColumn();
  if (lastRow < 2 || lastCol < 1) return [];

  const values = s.getRange(1,1,lastRow,lastCol).getValues();
  const headers = values[0].map(String);

  return values.slice(1)
    .filter(r => r.some(v => v !== ""))
    .map(r => {
      const o = {};
      headers.forEach((h,i) => o[h] = r[i]);
      return o;
    });
}

function append(name, obj) {
  const s = sheet(name);
  const headers = s.getRange(1,1,1,s.getLastColumn()).getValues()[0].map(String);
  s.appendRow(headers.map(h => obj[h] !== undefined ? obj[h] : ""));
}

function clean(v) { return String(v == null ? "" : v).trim(); }
function lower(v) { return clean(v).toLowerCase(); }

// ---------------- STUDENT REGISTRATION / LOGIN ----------------

function registerStudent(b) {
  const required = ["name","email","mobile","department","year","division","college","password"];
  required.forEach(k => {
    if (!clean(b[k])) throw new Error("Please fill all required fields.");
  });

  if (!/^\d{10}$/.test(clean(b.mobile))) {
    throw new Error("Mobile number must contain 10 digits.");
  }
  if (clean(b.password).length < 6) {
    throw new Error("Password must be at least 6 characters.");
  }
  const className = clean(b.className);
  const rollFields = [clean(b.fyRoll), clean(b.syRoll), clean(b.tyRoll), clean(b.btechRoll)].filter(Boolean);
  if (!["FY", "SY", "TY", "B-Tech"].includes(className)) {
    throw new Error("Please select a valid class: FY, SY, TY or B-Tech.");
  }
  if (rollFields.length !== 1) {
    throw new Error("Enter only the roll number for the selected class.");
  }
  const classRoll = className === "FY" ? clean(b.fyRoll) : className === "SY" ? clean(b.syRoll) : className === "TY" ? clean(b.tyRoll) : clean(b.btechRoll);
  if (!/^\d+$/.test(classRoll)) throw new Error("Roll number should contain digits only.");

  const existing = rows(SHEETS.REG).find(r =>
    lower(r.Email) === lower(b.email) ||
    (clean(b.fyRoll) && lower(r.FYRoll) === lower(b.fyRoll)) ||
    (clean(b.syRoll) && lower(r.SYRoll) === lower(b.syRoll)) ||
    (clean(b.tyRoll) && lower(r.TYRoll) === lower(b.tyRoll)) ||
    (clean(b.btechRoll) && lower(r.BTechRoll) === lower(b.btechRoll))
  );
  if (existing) throw new Error("Email or Roll Number is already registered.");

  append(SHEETS.REG, {
    Timestamp: new Date(),
    Name: clean(b.name),
    Email: lower(b.email),
    Mobile: clean(b.mobile),
    Class: className,
    FYRoll: clean(b.fyRoll),
    SYRoll: clean(b.syRoll),
    TYRoll: clean(b.tyRoll),
    BTechRoll: clean(b.btechRoll),
    Department: clean(b.department),
    Year: clean(b.year),
    AcademicYear: clean(b.academicYear),
    Division: clean(b.division),
    College: clean(b.college) || "V.V.P.I.E.T. Solapur",
    Password: clean(b.password)
  });

  return json({success:true, message:"Registration successful!"});
}

function studentLogin(b) {
  const r = rows(SHEETS.REG).find(x =>
    lower(x.Email) === lower(b.email) && clean(x.Password) === clean(b.password)
  );
  if (!r) throw new Error("Invalid email or password.");
  return json({success:true, student:studentObject(r)});
}

function studentObject(r) {
  return {
    name: clean(r.Name), email: lower(r.Email), mobile: clean(r.Mobile),
    className: clean(r.Class),
    fyRoll: clean(r.FYRoll),
    syRoll: clean(r.SYRoll),
    tyRoll: clean(r.TYRoll),
    btechRoll: clean(r.BTechRoll),
    roll: clean(r.FYRoll || r.SYRoll || r.TYRoll || r.BTechRoll),
    department: clean(r.Department), year: clean(r.Year),
    academicYear: clean(r.AcademicYear),
    division: clean(r.Division), college: clean(r.College)
  };
}

function validateNewPassword(password) {
  if (clean(password).length < 6) throw new Error("Password must be at least 6 characters.");
}

function studentForgotPassword(b) {
  const email = lower(b.email);
  const fyRoll = lower(b.fyRoll);
  const syRoll = lower(b.syRoll);
  const tyRoll = lower(b.tyRoll);
  const btechRoll = lower(b.btechRoll);
  validateNewPassword(b.newPassword);

  const r = rows(SHEETS.REG).find(x =>
    lower(x.Email) === email &&
    ((fyRoll && lower(x.FYRoll) === fyRoll) || (syRoll && lower(x.SYRoll) === syRoll) || (tyRoll && lower(x.TYRoll) === tyRoll) || (btechRoll && lower(x.BTechRoll) === btechRoll))
  );
  if (!r) throw new Error("Email and roll number do not match any registered student.");

  const s = sheet(SHEETS.REG);
  const headers = s.getRange(1,1,1,s.getLastColumn()).getValues()[0].map(String);
  const row = rows(SHEETS.REG).findIndex(x => lower(x.Email) === email) + 2;
  const passwordCol = headers.indexOf("Password") + 1;
  if (!passwordCol) throw new Error("Password column not found.");
  s.getRange(row, passwordCol).setValue(clean(b.newPassword));
  return json({success:true,message:"Student password updated. Use the new password to login."});
}

function adminForgotPassword(b) {
  const email = lower(b.email);
  validateNewPassword(b.newPassword);
  const s = sheet(SHEETS.ADMIN);
  const headers = s.getRange(1,1,1,s.getLastColumn()).getValues()[0].map(String);
  const data = rows(SHEETS.ADMIN);
  const index = data.findIndex(x => lower(x.Email) === email);
  if (index < 0) throw new Error("Admin email not found.");
  const row = index + 2;
  const passwordCol = headers.indexOf("Password") + 1;
  if (!passwordCol) throw new Error("Password column not found.");
  s.getRange(row, passwordCol).setValue(clean(b.newPassword));
  return json({success:true,message:"Admin password updated. Use the new password to login."});
}

function getStudent(b) {
  const r = rows(SHEETS.REG).find(x => lower(x.Email) === lower(b.email));
  if (!r) throw new Error("Student not found.");
  return json({success:true, student:studentObject(r)});
}

// ---------------- ADMIN LOGIN ----------------

function adminLogin(b) {
  const r = rows(SHEETS.ADMIN).find(x =>
    lower(x.Email) === lower(b.email) && clean(x.Password) === clean(b.password)
  );
  if (!r) throw new Error("Invalid admin email or password.");
  return json({success:true, admin:{name:clean(r.Name), email:lower(r.Email)}});
}

// ---------------- APTITUDE TESTS ----------------

function getTests(b) {
  const email = lower(b && b.email);
  return json({success:true, tests:buildTests(false, email)});
}

function buildTests(adminMode, studentEmail) {
  const testRows = rows(SHEETS.TESTS);
  const qRows = rows(SHEETS.QUESTIONS);
  const resultRows = rows(SHEETS.RESULTS);

  return testRows.map(t => {
    const testId = clean(t.TestID);
    const qs = qRows.filter(q => clean(q.TestID) === testId);
    const max = qs.reduce((sum,q) => sum + Number(q.Marks || t.MarksPerQuestion || 1), 0);
    const completed = studentEmail
      ? resultRows.some(r => clean(r.TestID) === testId && lower(r.StudentEmail) === studentEmail)
      : false;

    return {
      testId: testId,
      testName: clean(t.TestName),
      description: clean(t.Description),
      duration: Number(t.DurationMinutes || 20),
      startDate: clean(t.StartDate),
      endDate: clean(t.EndDate),
      status: clean(t.Status || "Active"),
      questionCount: qs.length,
      maxScore: max,
      completed: completed
    };
  }).filter(t => adminMode || t.status.toLowerCase() === "active");
}

function getTest(b) {
  const testId = clean(b.testId);
  const email = lower(b.email);
  const t = rows(SHEETS.TESTS).find(x => clean(x.TestID) === testId);

  if (!t) throw new Error("Test not found.");
  if (clean(t.Status || "Active").toLowerCase() !== "active") {
    throw new Error("This test is not active.");
  }

  const previous = rows(SHEETS.RESULTS).find(x =>
    clean(x.TestID) === testId && lower(x.StudentEmail) === email
  );
  if (previous) throw new Error("You have already completed this test.");

  const qs = rows(SHEETS.QUESTIONS).filter(q => clean(q.TestID) === testId);
  if (!qs.length) throw new Error("This test has no questions yet.");

  return json({success:true, test:{
    testId: testId,
    testName: clean(t.TestName),
    description: clean(t.Description),
    duration: Number(t.DurationMinutes || 20),
    questions: qs.map(q => ({
      questionId: clean(q.QuestionID),
      question: clean(q.Question),
      optionA: clean(q.OptionA),
      optionB: clean(q.OptionB),
      optionC: clean(q.OptionC),
      optionD: clean(q.OptionD),
      marks: Number(q.Marks || t.MarksPerQuestion || 1)
    }))
  }});
}

function submitTest(b) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);

  try {
    const testId = clean(b.testId);
    const email = lower(b.email);
    const t = rows(SHEETS.TESTS).find(x => clean(x.TestID) === testId);
    if (!t) throw new Error("Test not found.");

    const student = rows(SHEETS.REG).find(x => lower(x.Email) === email);
    if (!student) throw new Error("Student not found.");

    const prior = rows(SHEETS.RESULTS).find(x =>
      clean(x.TestID) === testId && lower(x.StudentEmail) === email
    );
    if (prior) throw new Error("You have already submitted this test.");

    const qs = rows(SHEETS.QUESTIONS).filter(q => clean(q.TestID) === testId);
    if (!qs.length) throw new Error("This test has no questions.");

    const answers = b.answers || {};
    let correct = 0;
    let attempted = 0;
    let score = 0;
    let maxScore = 0;

    qs.forEach(q => {
      const marks = Number(q.Marks || t.MarksPerQuestion || 1);
      maxScore += marks;
      const answer = clean(answers[clean(q.QuestionID)]).toUpperCase();

      if (answer) attempted++;
      if (answer && answer === clean(q.CorrectAnswer).toUpperCase()) {
        correct++;
        score += marks;
      }
    });

    const wrong = attempted - correct;
    const percentage = maxScore
      ? Math.round((score / maxScore) * 10000) / 100
      : 0;
    const resultId = "RES-" + Utilities.getUuid().slice(0,8).toUpperCase();

    append(SHEETS.RESULTS, {
      Timestamp: new Date(),
      ResultID: resultId,
      TestID: testId,
      TestName: clean(t.TestName),
      StudentEmail: student.Email,
      StudentName: student.Name,
      TotalQuestions: qs.length,
      Attempted: attempted,
      Correct: correct,
      Wrong: wrong,
      Score: score,
      MaxScore: maxScore,
      Percentage: percentage,
      TimeTaken: Number(b.timeTaken || 0)
    });

    return json({
      success:true,
      score:score,
      maxScore:maxScore,
      percentage:percentage,
      correct:correct,
      wrong:wrong
    });
  } finally {
    lock.releaseLock();
  }
}

function getStudentResults(b) {
  const email = lower(b.email);
  const out = rows(SHEETS.RESULTS)
    .filter(r => lower(r.StudentEmail) === email)
    .map(resultObject)
    .sort((a,b) => String(b.timestamp).localeCompare(String(a.timestamp)));
  return json({success:true, results:out});
}

function resultObject(r) {
  return {
    timestamp: formatDate(r.Timestamp),
    testId: clean(r.TestID),
    testName: clean(r.TestName),
    studentName: clean(r.StudentName),
    score: Number(r.Score || 0),
    maxScore: Number(r.MaxScore || 0),
    percentage: Number(r.Percentage || 0),
    attempted: Number(r.Attempted || 0),
    correct: Number(r.Correct || 0),
    wrong: Number(r.Wrong || 0),
    totalQuestions: Number(r.TotalQuestions || 0),
    timeTaken: Number(r.TimeTaken || 0)
  };
}

function adminCreateTest(b) {
  validateTestId(b.testId);
  if (!clean(b.testName)) throw new Error("Test name is required.");
  if (rows(SHEETS.TESTS).some(t => clean(t.TestID) === clean(b.testId))) {
    throw new Error("Test ID already exists.");
  }

  append(SHEETS.TESTS, {
    TestID: clean(b.testId),
    TestName: clean(b.testName),
    Description: clean(b.description),
    DurationMinutes: Number(b.duration || 20),
    MarksPerQuestion: Number(b.marksPerQuestion || 1),
    StartDate: clean(b.startDate),
    EndDate: clean(b.endDate),
    Status: clean(b.status || "Active"),
    CreatedAt: new Date()
  });

  return json({success:true,message:"Aptitude test created successfully."});
}

function validateTestId(id) {
  if (!/^[A-Za-z0-9_-]+$/.test(clean(id))) {
    throw new Error("Test ID can use letters, numbers, _ and - only.");
  }
}

function adminAddQuestion(b) {
  if (!rows(SHEETS.TESTS).some(t => clean(t.TestID) === clean(b.testId))) {
    throw new Error("Test ID does not exist. Create the test first.");
  }
  if (!clean(b.questionId)) throw new Error("Question ID is required.");
  if (rows(SHEETS.QUESTIONS).some(q => clean(q.QuestionID) === clean(b.questionId))) {
    throw new Error("Question ID already exists.");
  }

  ["question","optionA","optionB","optionC","optionD","correctAnswer"].forEach(k => {
    if (!clean(b[k])) throw new Error("Fill all question fields.");
  });

  const correct = clean(b.correctAnswer).toUpperCase();
  if (["A","B","C","D"].indexOf(correct) === -1) {
    throw new Error("Correct answer must be A, B, C or D.");
  }

  append(SHEETS.QUESTIONS, {
    QuestionID: clean(b.questionId),
    TestID: clean(b.testId),
    Question: clean(b.question),
    OptionA: clean(b.optionA),
    OptionB: clean(b.optionB),
    OptionC: clean(b.optionC),
    OptionD: clean(b.optionD),
    CorrectAnswer: correct,
    Marks: Number(b.marks || 1)
  });

  return json({success:true,message:"Question added successfully."});
}

function adminGetTests() {
  return json({success:true,tests:buildTests(true, "")});
}

function adminGetStudents() {
  return json({success:true,students:rows(SHEETS.REG).map(studentObject)});
}

function adminShiftStudent(b) {
  const email = lower(b.email);
  if (!email) throw new Error("Student email is required.");
  const s = sheet(SHEETS.REG);
  const headers = s.getRange(1,1,1,s.getLastColumn()).getValues()[0].map(String);
  const data = rows(SHEETS.REG);
  const idx = data.findIndex(x => lower(x.Email) === email);
  if (idx < 0) throw new Error("Student not found.");
  const row = idx + 2;
  const getCol = h => headers.indexOf(h) + 1;
  const fy = clean(data[idx].FYRoll), sy = clean(data[idx].SYRoll), ty = clean(data[idx].TYRoll);
  const year = clean(data[idx].Year).toLowerCase();
  if (clean(b.academicYear) && getCol("AcademicYear")) s.getRange(row,getCol("AcademicYear")).setValue(clean(b.academicYear));
  if (ty) throw new Error("Student is already in TY. No further shift is available.");
  if (sy) {
    s.getRange(row,getCol("TYRoll")).setValue(sy);
    s.getRange(row,getCol("SYRoll")).clearContent();
    s.getRange(row,getCol("Year")).setValue("3rd Year");
  } else if (fy) {
    s.getRange(row,getCol("SYRoll")).setValue(fy);
    s.getRange(row,getCol("FYRoll")).clearContent();
    s.getRange(row,getCol("Year")).setValue("2nd Year");
  } else if (/1st|fy/.test(year)) {
    s.getRange(row,getCol("Year")).setValue("2nd Year");
  } else if (/2nd|sy/.test(year)) {
    s.getRange(row,getCol("Year")).setValue("3rd Year");
  } else {
    throw new Error("Student has no FY/SY roll to shift.");
  }
  return json({success:true,message:"Student shifted to the next academic year successfully."});
}

function adminClearBTechRoll(b) {
  const email = lower(b.email);
  if (!email) throw new Error("Student email is required.");
  const s = sheet(SHEETS.REG);
  const headers = s.getRange(1,1,1,s.getLastColumn()).getValues()[0].map(String);
  const data = rows(SHEETS.REG);
  const idx = data.findIndex(x => lower(x.Email) === email);
  if (idx < 0) throw new Error("Student not found.");
  const col = headers.indexOf("BTechRoll") + 1;
  if (!col) throw new Error("BTechRoll column not found.");
  s.getRange(idx + 2, col).clearContent();
  return json({success:true,message:"B-Tech Roll deleted successfully."});
}

function adminGetResults() {
  return json({success:true,results:rows(SHEETS.RESULTS).map(resultObject)});
}

// Public leaderboard: only student name and score are returned.
// Highest score is calculated separately for each conducted test.
function getLeaderboard() {
  const results = rows(SHEETS.RESULTS).map(resultObject);
  const groups = {};
  results.forEach(r => {
    const key = clean(r.testId) || clean(r.testName) || "GENERAL";
    if (!groups[key]) groups[key] = {testId:r.testId, testName:r.testName, rows:[]};
    groups[key].rows.push(r);
  });

  const leaderboard = Object.values(groups).map(g => {
    const sorted = g.rows.slice().sort((a,b) => Number(b.score||0) - Number(a.score||0));
    const highest = sorted.length ? Number(sorted[0].score || 0) : 0;
    return {
      testId: g.testId,
      testName: g.testName,
      highestScore: highest,
      students: sorted
        .filter(r => Number(r.score||0) === highest)
        .map(r => ({studentName:r.studentName, score:Number(r.score||0)}))
    };
  }).filter(g => g.students.length);

  return json({success:true, leaderboard:leaderboard});
}

// ---------------- ATTENDANCE ----------------

function adminAddAttendance(b) {
  const date = clean(b.date);
  const email = lower(b.studentEmail);
  const status = clean(b.status);

  if (!date || !email || !status) {
    throw new Error("Date, student email and attendance status are required.");
  }

  const allowed = ["Present", "Absent", "Late"];
  if (allowed.indexOf(status) === -1) {
    throw new Error("Attendance status must be Present, Absent or Late.");
  }

  const student = rows(SHEETS.REG).find(r => lower(r.Email) === email);
  if (!student) throw new Error("Student email not found in Registration sheet.");

  const duplicate = rows(SHEETS.ATTENDANCE).find(r =>
    lower(r.StudentEmail) === email && sameAttendanceDate(r.Date, date)
  );
  if (duplicate) {
    throw new Error("Attendance for this student on this date is already added.");
  }

  append(SHEETS.ATTENDANCE, {
    Timestamp: new Date(),
    Date: date,
    StudentEmail: student.Email,
    StudentName: student.Name,
    Status: status
  });

  return json({success:true,message:"Attendance added successfully."});
}

function sameAttendanceDate(sheetValue, inputDate) {
  if (!sheetValue) return false;
  const raw = clean(sheetValue);

  // If Sheets returns a Date object, compare using spreadsheet timezone.
  if (Object.prototype.toString.call(sheetValue) === "[object Date]" && !isNaN(sheetValue)) {
    return Utilities.formatDate(sheetValue, Session.getScriptTimeZone(), "yyyy-MM-dd") === inputDate;
  }

  // If the cell is already yyyy-MM-dd, compare directly.
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw === inputDate;

  try {
    const d = new Date(raw);
    if (!isNaN(d)) {
      return Utilities.formatDate(d, Session.getScriptTimeZone(), "yyyy-MM-dd") === inputDate;
    }
  } catch(e) {}

  return raw === inputDate;
}

function attendanceObject(r) {
  return {
    timestamp: formatDate(r.Timestamp),
    date: formatAttendanceDate(r.Date),
    studentEmail: lower(r.StudentEmail),
    studentName: clean(r.StudentName),
    status: clean(r.Status)
  };
}

function formatAttendanceDate(v) {
  if (!v) return "";
  if (Object.prototype.toString.call(v) === "[object Date]" && !isNaN(v)) {
    return Utilities.formatDate(v, Session.getScriptTimeZone(), "dd-MM-yyyy");
  }
  const raw = clean(v);
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    const p = raw.split("-");
    return p[2] + "-" + p[1] + "-" + p[0];
  }
  try {
    const d = new Date(raw);
    if (!isNaN(d)) return Utilities.formatDate(d, Session.getScriptTimeZone(), "dd-MM-yyyy");
  } catch(e) {}
  return raw;
}

function adminSaveDailyAttendance(b) {
  const date = clean(b.date);
  if (!date) throw new Error("Attendance date is required.");
  const present = new Set((b.presentEmails || []).map(lower));
  const students = rows(SHEETS.REG);
  if (!students.length) throw new Error("No registered students found.");

  // Prevent accidental duplicate submission for the same date.
  const existing = rows(SHEETS.ATTENDANCE).filter(r => sameAttendanceDate(r.Date, date));
  if (existing.length) throw new Error("Attendance for this date is already saved.");

  students.forEach(student => {
    const email = lower(student.Email);
    append(SHEETS.ATTENDANCE, {
      Timestamp: new Date(),
      Date: date,
      StudentEmail: student.Email,
      StudentName: student.Name,
      Status: present.has(email) ? "Present" : "Absent"
    });
  });

  return json({
    success:true,
    message:"Attendance saved. Selected students are Present and all remaining students are Absent."
  });
}

function adminGetAttendance() {
  const out = rows(SHEETS.ATTENDANCE).map(attendanceObject);
  out.sort((a,b) => parseDisplayDate(b.date) - parseDisplayDate(a.date));
  return json({success:true,attendance:out});
}

function parseDisplayDate(s) {
  const p = clean(s).split("-");
  if (p.length === 3) return new Date(Number(p[2]), Number(p[1])-1, Number(p[0])).getTime();
  return 0;
}

function getStudentAttendance(b) {
  const email = lower(b.email);
  if (!email) throw new Error("Student email is required.");

  const records = rows(SHEETS.ATTENDANCE)
    .filter(r => lower(r.StudentEmail) === email)
    .map(attendanceObject);

  records.sort((a,b) => parseDisplayDate(b.date) - parseDisplayDate(a.date));

  let present = 0;
  let absent = 0;
  let late = 0;

  records.forEach(r => {
    if (r.status === "Present") present++;
    else if (r.status === "Absent") absent++;
    else if (r.status === "Late") late++;
  });

  const total = records.length;
  // Late is counted as attended for the percentage.
  const percentage = total
    ? Math.round(((present + late) / total) * 10000) / 100
    : 0;

  return json({
    success:true,
    attendance:records,
    summary:{
      total:total,
      present:present,
      absent:absent,
      late:late,
      percentage:percentage
    }
  });
}

function formatDate(v) {
  if (!v) return "";
  if (Object.prototype.toString.call(v) === "[object Date]" && !isNaN(v)) {
    return Utilities.formatDate(v, Session.getScriptTimeZone(), "dd-MM-yyyy HH:mm");
  }
  try {
    const d = new Date(v);
    if (!isNaN(d)) return Utilities.formatDate(d, Session.getScriptTimeZone(), "dd-MM-yyyy HH:mm");
  } catch(e) {}
  return clean(v);
}

function json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
