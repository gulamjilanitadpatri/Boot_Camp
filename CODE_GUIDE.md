# Boot Camp Code Guide

This project is intentionally kept in simple, readable JavaScript, HTML, CSS, and Google Apps Script.
Comments have been added to explain the purpose of each major file and feature.

## Main files

- `index.html` - public home page.
- `register.html` / `register.js` - student registration. The selected class controls the roll-number field.
- `login.html` / `login.js` - student login.
- `student-forgot.html` / `student-forgot.js` - student password reset.
- `dashboard.html` / `dashboard.js` - student dashboard.
- `admin.html` / `admin-login.js` - admin login.
- `admin-forgot.html` / `admin-forgot.js` - admin password reset.
- `admin-dashboard.html` / `admin.js` - admin management area.
- `aptitude.html` / `aptitude.js` - test-taking page.
- `config.js` - Google Apps Script Web App URL and common frontend helpers.
- `style.css` - shared responsive styling.
- `Code.gs` - Google Apps Script backend.

## Class and roll number

The registration form supports FY, SY, TY, and B-Tech. Only the roll-number field for the selected class is submitted.

## Academic-year movement

The admin dashboard supports moving students from FY to SY and from SY to TY. B-Tech roll numbers are kept separate.

## Attendance

The admin checks a student's checkbox to mark the student Present. Students who are not checked are saved as Absent.

## Test results

After a test is submitted, the result is saved. The admin dashboard can view all results and the highest score. The public/main dashboard shows only student name and score for the leaderboard, not student contact or academic details.

## Passwords

Forgot-password forms update the stored password so the new password is used for the next login.

## Google Sheets

Use the sheet names and column order described in `SHEET_STRUCTURE.txt`. After changing `Code.gs`, update/redeploy the Google Apps Script Web App and make sure `config.js` contains the deployed `/exec` URL.
