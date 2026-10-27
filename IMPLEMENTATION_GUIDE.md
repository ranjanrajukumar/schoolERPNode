# School ERP: implementation guide

For the person who will set the system up and run it day to day (principal, office manager or IT lead). It maps how a school works to the screens that do each job, and gives a plan to get from an empty system to a school running on it.

You do not have to read all of it. The app has the same plan built in: **Help & Support → Setup & Go-Live Guide** ticks each step itself from your data, **Class Readiness** shows which classes are complete, and **Process Map** lets you click through every process. Use this document for the thinking behind them.

---

## 1. What the system covers

| Area | What it does | Main screens |
|---|---|---|
| Admissions | Enquiry, entrance test, interview, offer, waiting list, enrolment | Admissions, Online Applications, Admission Offers |
| Students | Full registration, profile, documents, health, behaviour, promotion, alumni | Students, Student Profile |
| Academics | Classes, subjects, curriculum, timetable, homework, materials, calendar | Classes, Class Subjects, Timetable |
| Attendance | Daily and per-period, leave, corrections, SMS alerts to guardians | Attendance, Student Leaves |
| Examinations | Exams, marks, grades, ranks, report cards, revaluation | Exams, Merit List, Revaluation |
| Fees & finance | Fee structure, billing, receipts, reminders, expenses, income, reports | Fees, Fee Structures, Payment History |
| Staff & HR | Registration, attendance, leave, payroll, recruitment, reviews, documents | Staff, Payroll, Recruitment |
| Timetable extras | Rooms, room bookings, substitutions, workload reports | Room Schedule, Substitutions |
| Communication | Notices, email, SMS, templates, push notifications | Notices, Send Message |
| Parent and student portal | Fees, attendance, results, homework, timetable, leave and certificate requests | Parent Portal |
| Transport, Hostel, Library, Inventory | Routes and fees, rooms and fees, catalogue and fines, stock and assets | each has its own group |
| Health & safety, Activities | Clinic visits, incidents, inspections; events, clubs, trips | Health & Safety, Activities |
| Documents | Bonafide, transfer, character, fee certificates; ID cards; editable wording | Documents |
| Administration | Users, custom roles, groups, audit log, backups, import/export, settings | User Management, Settings |

## 2. Who does what

Access is enforced by the server on every request, not only hidden in the menu.

| Task | Admin / office | Teacher | Accountant | Parent | Student |
|---|---|---|---|---|---|
| Set up school, classes, subjects, timetable | does | views | views | | |
| Admissions and enrolment | does | | | | |
| Register students and staff | does | views | views | | |
| Mark attendance | does | does | | views | views |
| Apply for student leave | does | | | does | |
| Enter marks | does | does (own subjects only) | | | |
| View results and report cards | does | views | | views | views |
| Set fees and bill | does | | does | | |
| Collect fees and issue receipts | does | | does | views | views |
| Prepare payroll | | | does | | |
| Approve payroll payment | does | | | | |
| Send notices, email and SMS | does | | | views | views |
| Users, roles, backups, audit log | does | | | | |

**Need something narrower?** Create a custom role (User Management → Roles): a built-in role limited to chosen modules, e.g. a *Librarian* (teacher base, Library only) or a *Receptionist* (admin base, Admissions and Students only). A custom role can never do more than its base role.

## 3. The class is the hub

Almost everything in a school hangs off a class and section. Set a class up once and the rest picks it up:

```
                    ┌──────────── Students (roll numbers, parents)
                    ├──────────── Subjects + teachers   (who may enter marks)
                    ├──────────── Timetable             (periods, teachers, rooms)
   CLASS  5-A ──────┼──────────── Fee structure         (what each student is billed)
   class teacher    ├──────────── Attendance            (daily, per period)
                    ├──────────── Exams → marks → results → report cards
                    ├──────────── Homework, study materials, notices
                    └──────────── Activities, trips
   per student:  transport route · hostel bed · library card
```

A class is **ready** when it has a class teacher, subjects with a teacher each, a timetable and a fee structure. **Class Readiness** checks exactly this and links every gap to the screen that fixes it. A class does not need students to be ready: set classes up first, admit second.

## 4. Filling the data: one spreadsheet at a time

Don't type a school in by hand. **Settings → Data Import / Export** has an importer for each kind of data, listed in the order to load it:

1. Classes and sections 2. Subjects 3. Departments 4. Designations 5. Staff 6. Subjects and teachers for each class 7. Fee types 8. Fee structure for each class 9. Library books 10. Students

For each one: **download the template** (it has the exact column names and an example row), fill it in Excel or Google Sheets, save as CSV, **upload**. You then see every row marked *new*, *already there* or *problem* with the reason, and nothing is saved until every row is fine. Uploading the same file twice never creates duplicates, so you can fix a file and send it again. Later kinds refer to earlier ones: a class teacher is a staff number, a fee row names a class like `5-A`, a student names a class too. Students also accept the optional registration columns (parents, address, previous school and so on).

Things you still enter by hand because they involve a password or a decision: logins and parent accounts, the timetable, grading scale, and opening balances.

## 5. Implementation plan

Six weeks is realistic for one school with one person leading. Compress or stretch to suit. Do the phases in order, because each depends on the one before.

### Week 1: Foundation
1. **School profile** (Settings → School Profile): name, code, board, address, phone, logo, principal. These print on every certificate and ID card.
2. **Academic year**: create it and mark it current. Fees, exams and promotion all use the current year.
3. **Campuses**, only if you have more than one site.
4. **Master data** (Settings → Master Data): look over the lists (religion, category, states, relations, occupations, qualifications) and trim them to what you use. They fill the registration dropdowns.
5. **Integrations**: put email and SMS credentials in `server/.env`, then send a test message. Until this is done messages are recorded but never delivered.

### Week 2: Academic structure
1. **Departments and designations**, then **staff** (Register new staff member).
2. **Logins** for teachers and the accountant. A teacher's login email must equal the email on their staff profile, or they cannot enter marks.
3. **Classes and sections**, with a **class teacher** for each.
4. **Subjects**, then **Class Subjects**: which teacher teaches which subject in which class.
5. **Timetable** per class. Clashes (a teacher or a room in two places) are blocked.
6. **Grading scale**: check the default scale and the 40% pass mark against your board (Grade Setup).
7. Open **Class Readiness**: aim for every class green except fee structure.

### Week 3: Finance
1. **Fee types** (tuition, transport, exam fee, …).
2. **Fee structure per class**. Use **Fee Groups** for bundles that repeat (e.g. "Boarding pack").
3. **Payment settings** (Settings → Payments): receipt prefix, accepted methods, whether part payments are allowed.
4. Decide who prepares payroll (accountant) and who approves it (admin).

### Week 4: People
1. **Prepare the student data** (see section 6) and load it with **Data Import / Export**, which checks every row first and imports all or nothing. For small numbers use **Register new student**.
2. **Bill the opening fees**: imported students owe nothing until billed. Use *Fees → bill a class*, or tick "Bill this class's fee structure now" when registering.
3. **Parent logins**: *New parent account → Fill from a student's record* uses the father, mother or guardian details already entered and links the child.
4. Transport routes and hostel rooms, if used; library catalogue and cards.

### Week 5: Rehearse
1. Run a **pilot week** with one or two classes: attendance, homework, one fee collection, one notice, one leave request through the parent portal.
2. Train each role (section 8).
3. Fix gaps in master data, fee structure and timetable that the pilot shows.

### Week 6: Go live
Work through the **Go live** phase of the Setup Guide:
- [ ] Change the default admin password (the guide flags it while it is unchanged).
- [ ] Set a real `JWT_SECRET` in `server/.env` (long and random). The server refuses to start in production with the example value.
- [ ] Change the MySQL password; keep `server/.env` out of version control.
- [ ] Serve the app over HTTPS (needed for push notifications too).
- [ ] Download a backup (Settings → Backup & Restore) and **test the restore on a spare copy** before you rely on it. Uploaded photos and documents are not in the backup file: copy `server/uploads` as well.
- [ ] Schedule `mysqldump` on the database server for automatic nightly protection.
- [ ] Decide who holds the admin login, and create named admin accounts rather than sharing one.

## 6. Getting your data ready

Collect these before the week they are needed. Spreadsheet columns can be pasted into the import template (Data Import / Export → Download template).

| Data | Needed for | Notes |
|---|---|---|
| Class and section list | Week 2 | Written like `5-A`; the import matches classes by this label |
| Staff list: name, designation, department, phone, **email**, joining date | Week 2 | Email must match the teacher's login |
| Subject list and who teaches what in each class | Week 2 | The hardest to gather; ask each head of department |
| Period structure: periods per day, days per week | Week 2 | The timetable screens show 8 periods, Monday to Saturday |
| Fee list per class, with due dates | Week 3 | Amounts must be above zero |
| Students: admission no (or leave blank to generate), name, date of birth, gender, class, **guardian phone** | Week 4 | Phones need a country code, or set `DEFAULT_COUNTRY_CODE` |
| Parent details: father, mother, guardian, occupation, address | Week 4 | Optional but makes parent logins one click |
| Opening balances | Week 4 | Enter as fee items on each student |

## 7. Processes in plain words

**Admission to enrolment.** A family's enquiry arrives (typed at the office, or sent from the public `/apply` page). Optionally record an entrance test and an interview. Approve it and set a confirm-by date: that is the offer. If the class is full, waitlist instead. When the family accepts, press **Enroll**: the student record is created with everything collected, an admission number is generated, and the class fee structure is billed. Then add the photo and documents, and create the parent login.

**A school day.** Teachers mark attendance (daily, or per period). Absent students' guardians can be texted. If a teacher is on approved leave, **Substitutions** lists their periods and offers only teachers who are free. Homework is set and shows in the parent portal. Parents apply for leave there; the office decides.

**Examinations.** Create the exam (inside an exam group if you weight several exams). Teachers enter marks for their own subjects. Results, ranks and the merit list follow, then report cards with attendance. A parent can query a mark; an accepted revaluation updates it.

**Fees.** Fee structure per class is billed to students. Payments get numbered receipts and can never exceed the balance. Reminders go to guardians with overdue fees, no more than once per cooldown period. Refunds and discounts are recorded, never deleted, so receipt numbers stay in order.

**Staff and payroll.** Recruit, hire (this creates the staff profile), file documents, track attendance and leave. The accountant prepares payslips; only an admin can approve payment.

**Year end.** Finish results, **promote** each class (move up, hold back, or graduate), open the new academic year and make it current, set its fee structure, issue leaving certificates (this marks the student inactive), and take a backup before and after.

## 8. Training plan

| Role | Session | Cover |
|---|---|---|
| Office staff (1.5 h) | Admissions, student registration, parent logins, notices | Process Map, the registration form, Ctrl+K search |
| Teachers (45 min) | Attendance, marks, homework, behaviour notes, leave | Mark attendance; entering marks; what a parent sees |
| Accountant (1 h) | Fees, receipts, reminders, payroll preparation | Collect a fee, a part payment, a refund; month-end report |
| Principal (45 min) | Dashboard, reports, approvals, audit log | Dashboard charts, payroll approval, who did what |
| Parents (10 min leaflet) | Sign in, attendance, fees, leave | The portal; turn on notifications |

Tip: give every role the **Help Center** and **User Guide**, which are written per role.

## 9. Running it: a routine

- **Daily:** attendance by the first period; the office clears leave requests and absence alerts.
- **Weekly:** fee reminders; review overdue library books; check Class Readiness if anyone joined or left.
- **Monthly:** payroll prepare → approve; fee collection report; download a backup.
- **Each term:** exams, report cards, parent-teacher notices.
- **Each year:** the year-end routine in section 7. Check the **Audit log** at least termly: it records every change and every full download.

## 10. When something looks wrong

| Symptom | Likely cause |
|---|---|
| A teacher cannot enter marks | They are not assigned that subject in Class Subjects, or their login email differs from their staff profile email |
| A menu item is missing | The user's role (or custom role) does not include that area |
| Messages show "recorded only" | Email/SMS credentials are not set; see Settings → Integrations |
| A student cannot be deleted | They have records that depend on them; mark them inactive instead |
| Student import refuses the file | The preview lists each bad row and why; fix the file and upload again (nothing was imported) |
| A class never turns green in Class Readiness | Open it: each gap is a link to the screen that fixes it |

---

*Where this lives in the application:* Setup Guide `/setup`, Process Map `/process-map`, Class Readiness `/class-map`, Help Center `/help`, User Guide `/user-guide`. Technical setup and rules are in `README.md`.
