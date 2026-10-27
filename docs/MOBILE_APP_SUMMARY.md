# Mobile app and registry: one-page summary

Written for staff who must explain the app to others. Full steps are in Parts 20 to 22 of the training manual (`School-ERP-Training-Manual.pdf`).

## What it is
One school app for parents, students, teachers, administrators and accountants. Nobody picks a school: the app finds it from the mobile number.

## How sign-in works
1. The person types a mobile number (or email, or a student's admission number) and a password.
2. The app asks the **global registry** which school and role that belongs to.
3. The registry confirms the password and hands the app a pass valid for two minutes, used once.
4. The app opens a session with that school's own server.
5. If one number belongs to several accounts, the person chooses one.

The school stays the source of truth. A new login or changed password reaches the registry within a moment, and the full list is sent every 15 minutes.

## What each person sees
| Person | Home |
|---|---|
| Parent / student | Attendance ring, fee due, sections for Academic, Exam, Fees, Hostel, Library, Administration, Other services |
| Teacher | Today's summary, My Class, Mark Attendance, Enter Marks, leave decisions |
| Administrator / accountant | Summary and tiles for approvals, fees, payslips, messages |

The tiles, names, icons, order and visibility are edited on the website under Settings, Mobile App Menu.

## For the administrator or IT (Part 21)
- Admin page: `http://<registry>:4100/admin/`, opened with `GLOBAL_ADMIN_KEY`.
- Add a school, copy its key (shown once), put `GLOBAL_URL`, `GLOBAL_CLIENT_CODE` and `GLOBAL_CLIENT_KEY` in the school's `server/.env`, restart it.
- Check the **Last report** time and the number of logins.
- Back up the registry database `school_erp_global` and `global/keys/private.pem`.

## Before launch
- Mobile numbers are correct on every record.
- The school shows a recent Last report.
- One test parent, student and teacher can sign in on a real phone, outside the school Wi-Fi.
- Everything runs over https.

## Where the training manual changed
Part 1 (sign-in note), Parts 7, 8, 9, 11, 15, 16, 17 ("On a phone" notes), Part 13 (hostel in the app), Part 19.2 (registry backups), Parts 20 and 21 (new), Part 22 (trainer's plan, was Part 20).
