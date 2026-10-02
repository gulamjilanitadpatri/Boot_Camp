# Python Boot Camp Website

A lightweight, framework-free Python Boot Camp platform for V.V.P.I.E.T. Solapur.

## Modules
- Landing page
- Student registration
- Student login
- Student dashboard
- Python learning topics
- Multiple aptitude tests (Test 1, Test 2, Test 3…)
- Timed tests
- Automatic evaluation
- Student result history
- Admin login
- Admin test creation
- Admin question creation
- Student management
- Result management
- Google Sheets + Apps Script backend

## Performance
This version uses plain HTML/CSS/JavaScript with no React, npm, build step or heavy UI framework, so the pages load quickly.

## Folder
Python_Boot_Camp/
  index.html
  login.html
  login.js
  register.html
  register.js
  dashboard.html
  dashboard.js
  aptitude.html
  aptitude.js
  admin.html
  admin-login.js
  admin-dashboard.html
  admin.js
  config.js
  style.css
  Code.gs
  SETUP.md
  SHEET_STRUCTURE.txt
  README.md
  assets/
    logo_final.jpeg
    python.png


Attendance feature: Admin can add Present/Absent/Late attendance for registered students. Students can view their attendance records and attendance percentage on the Student Dashboard.


STUDENT ATTENDANCE
- Admin opens Attendance in the Admin Dashboard.
- Select Date, Student and Present/Absent/Late, then click Add Attendance.
- Student opens the Student Dashboard and sees only their own attendance and attendance percentage.

APTITUDE TESTS ON STUDENT DASHBOARD
- Admin creates a test in Create Test.
- Admin adds questions using Add Questions.
- The active test automatically appears under Aptitude Tests on the Student Dashboard.
- Student clicks Start Test, completes the timed test, and submits once.
- The score is automatically saved in TestResults and shown under My Results.

IMPORTANT
Use the same Google Spreadsheet. Keep Registration unchanged. The support tabs are Admin, AptitudeTests, AptitudeQuestions, TestResults and Attendance.


## New updates
- Student and Admin Forgot Password pages.
- Reset password overwrites the existing Password column; login uses the new password.
- Registration now stores separate SYRoll and TYRoll values.
- Student dashboard shows SY and TY roll numbers.
- Admin attendance uses checkboxes: checked = Present, unchecked = Absent.
- Attendance for a date is saved for every registered student in one action.

## Academic year and roll management
- Registration supports FY Roll, SY Roll, TY Roll, B-Tech Roll and Academic Year.
- Admin Dashboard has **Academic Year & Shift** after Students.
- Shift Student moves FY → SY → TY and updates the Year automatically.
- Admin can delete a student's B-Tech Roll without deleting the student account.
- Student Forgot Password accepts FY/SY/TY/B-Tech roll for verification.
