# Python Boot Camp — Setup

## 1. Create Google Sheet
Create one Google Spreadsheet and add these tabs:
Registration, Admin, AptitudeTests, AptitudeQuestions, TestResults, Attendance.

Use the exact columns listed in SHEET_STRUCTURE.txt.

## 2. Add Apps Script
Open the spreadsheet:
Extensions → Apps Script

Delete the existing code and paste all code from Code.gs.

Save.

## 3. Deploy API
Deploy → New deployment → Web app
- Execute as: Me
- Who has access: Anyone

Deploy and copy the Web App URL ending in /exec.

## 4. Connect website
Open config.js and replace:
PASTE_YOUR_APPS_SCRIPT_EXEC_URL_HERE

with your /exec URL.

## 5. Add an admin
In the Admin sheet put your admin email and password in row 2.

## 6. Run quickly
For a simple local test, open the folder in VS Code and use Live Server.
Do not double-click HTML if your browser blocks local requests.

## 7. Admin workflow
Admin Login → Create Test → Add Questions → Students can see the test → Students submit → automatic result → result appears in dashboard and TestResults.

## 8. Important
This is a learning/project implementation. Passwords are stored in the sheet as plain text in this simple version. For production use, use proper password hashing and stronger authentication.


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
