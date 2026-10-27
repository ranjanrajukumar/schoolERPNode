# School ERP: process guide

Written for the implementation team and developers. It describes every process the system runs, end to end: who owns it, which screens and endpoints carry it, the states it moves through, the rules the server enforces, what is handed to the next process, and which automated check covers it. [PROCESS_ARCHITECTURE.md](PROCESS_ARCHITECTURE.md) is the shorter owner-level view, [../IMPLEMENTATION_GUIDE.md](../IMPLEMENTATION_GUIDE.md) is the rollout plan, and [../README.md](../README.md) lists features screen by screen. This guide is organised by process, not by screen.

Conventions: screens are named as in the menu (`client/src/config/menu.js`); endpoints are under `/api`; "service" means `server/src/modules/<area>/*.service.js`, where the rules live. Roles: **A** admin, **T** teacher, **Ac** accountant, **P** parent, **S** student.

---

## 1. The map

The class is the hub: almost every process either puts a student in a class or reads what the class holds.

```
ENQUIRY ─► APPLICATION ─► REVIEW ─► ASSESSMENT ─► OFFER ─► ENROL ─► STUDENT ─► CLASS
                                                                       │           │
                                          ┌────────────────────────────┤           ├─► Attendance ─► Absence alerts
                                          │                            │           ├─► Subject map ─► Timetable
                          Fees billed ◄───┘                            │           ├─► Exams ─► Marks ─► Results ─► Report card
                               │                                       │           └─► Promotion ─► Leaving / alumni
                    Payment ─► Receipt ─► Reports                      │
                                                                       └─► Services: bus, hostel bed, activities, library, certificates, parent & student login
```

| # | Process | Owner | Section |
|---|---|---|---|
| 1 | Setup and foundation | A | 3 |
| 2 | Admissions: enquiry to enrolment | A | 4 |
| 3 | Student record and services | A | 5 |
| 4 | Academic structure and timetable | A, T | 6 |
| 5 | Daily teaching: attendance, leave, alerts | T | 7 |
| 6 | Examinations and results | A, T | 8 |
| 7 | Finance: fees, payments, receipts | Ac | 9 |
| 8 | People: staff, payroll, leave, recruitment | A, Ac | 10 |
| 9 | Library, transport, hostel, inventory | A, T | 11 |
| 10 | Certificates, ID cards and documents | A | 12 |
| 11 | Parent and student portal | P, S | 13 |
| 12 | Communication | A | 14 |
| 13 | Year end: promotion and alumni | A | 15 |

---

## 2. Roles and access

| Role | Can do | Cannot do |
|---|---|---|
| **A** admin | Everything, including users, roles, settings, audit log, backup and restore | |
| **T** teacher | Attendance and marks for the classes and subjects assigned to them, homework, library, own inventory requests, read-only elsewhere | Fees, admissions, staff data, settings |
| **Ac** accountant | Fees, fee structure, finance reports, payroll preparation, bank details of staff | Approve payroll payment (admin only), admissions |
| **P** parent | Portal for linked children: fees, attendance, results, timetable, notices; applies for leave; requests certificates | Any staff screen |
| **S** student | Read-only portal for their own record; may apply for leave and withdraw their own request | Everything else |
| Custom role | A built-in role narrowed to chosen modules, view-only or view and change. Never more than its base role | Users, roles, groups, audit log and login history are never grantable |

How it is enforced:

- `server/src/routes/index.js` mounts each area behind `requireRole(...)` (the whole area) or `writeRoles(...)` (reads open to staff, writes limited). Menu roles only hide links; the API is the authority.
- Every request re-reads the user in the database, so deleting an account or changing its role takes effect at once, not when the 8-hour token expires.
- A new user created with a temporary password (student accounts, teacher logins) must change it first. Until then every route except `/auth/*` answers 403 with `mustChangePassword`.
- A teacher login is matched to a staff profile by **email**: the login email must equal the staff profile email, otherwise the login is read-only. Marks can be entered only for subjects assigned to that teacher in the subject map.
- Sign-in is rate limited (8 failed attempts per email and 40 per address in 15 minutes).

---

## 3. Setup and foundation

**Owner:** admin. **Order matters:** later processes read what earlier ones create.

| Step | Screen | Notes |
|---|---|---|
| School profile | Settings → School Profile | Name, code, board, contact, logo (PNG or JPEG up to 1 MB, checked from its bytes), current academic year |
| Academic year | Academics → Academic Years | One year is current; promotion at year end switches it |
| Branches | Settings → Branches | The first campus is the main one and cannot be deleted while classes belong to it |
| Master data | Settings → Master Data | Dropdown lists (religion, category, state, relation and so on) and the three required-document lists (application, student, staff) |
| Classes and sections | Academics → Classes & Sections | Unique by name and section; room and class teacher optional |
| Subjects and the subject map | Academics → Subjects, Subject Map | Per class: core or elective, theory, practical or both, periods a week, teacher |
| Staff | Staff & HR → Staff Directory | Needed before class teachers and subject teachers can be chosen |
| Fee types, fee structure | Fees & Finance | A fee item per class with amount and due date; fee groups are reusable bundles |
| Timetable | Academics → Class Timetable | Completion is measured against the periods the subject map asks for |
| Users and roles | User Management | Teacher logins are linked to staff by email |

Aids:

- **Setup guide** (Help) ticks each step from real data and shows what a class still lacks (`GET /setup/...`, admin only).
- **Bulk import** (Settings → Data Import / Export) loads classes, subjects, departments, designations, staff, curriculum, fee types, fee structure, books and students from spreadsheets, in that order. Each file is checked row by row; only a fully valid file is imported, in one transaction; rows already present are reported and skipped, so a corrected file can be uploaded again. Logins, parents and the timetable are deliberately not importable.
- **Demo data:** `npm run seed:demo --prefix server`, removed with `seed:demo:remove`.

---

## 4. Admissions: enquiry to enrolment

**Owner:** admissions officer (admin). One admissions record carries the family from first call to enrolment; nothing is typed twice.

### 4.1 States

```
draft ──► applied ──► approved ──► (enroll) enrolled
enquiry ─►  │  └────► waitlisted ◄─► applied
   │        └────────► rejected ──► enquiry
   └─► rejected
```

`TRANSITIONS` in `admissions.service.js`:

| From | Can move to |
|---|---|
| draft | applied |
| enquiry | applied, rejected |
| applied | approved, waitlisted, rejected |
| waitlisted | approved, applied, rejected |
| approved | waitlisted, rejected |
| rejected | enquiry |
| enrolled | nothing: reachable only through `enroll()` |

The pipeline on the Applications page is derived from what is recorded, not stored: **Under review** (applied or waitlisted, no test or interview yet), **Assessment** (a test or interview date set), **Offer sent** (approved), **Enrolled**.

### 4.2 Steps

| Step | Screen and endpoint | Rule |
|---|---|---|
| Enquiry | Admission Enquiries; `POST /admissions/enquiries`; website `/apply` (`/public`, 5 per address per hour) | Needs child, guardian name and phone, class, and where the enquiry came from. Source is website, walk-in, phone, referral, social media or other |
| Follow-up | `PUT /admissions/:id/follow-up` | A follow-up date that has arrived puts the enquiry in the Follow-up tab; a visit date schedules a campus visit |
| Application | Admission → New admission (four steps: student, guardians, schooling, review); `POST /admissions/applications`, `PUT .../:id`, `POST .../:id/submit` | A draft can be saved with just a first name. **Submit** needs every required detail, every required document uploaded, a valid academic year, and consent. It moves the record to `applied` and clears the follow-up |
| Documents and photo | `POST /admissions/applications/:id/documents`; `PUT /photos/enquiry/:id` | PDF, JPEG, PNG or WebP, 5 MB, checked by bytes; at most 10 per application. Photos are stored in the database |
| Family's choices | Step 3 of the form (`choices`) | One elective per elective group of the chosen class, activities, bus route and stop (both), hostel room, fee group. Checked against the class |
| Assessment | Entrance Tests, Interview Schedule (`PUT /admissions/:id/test`, `/interview`) | Only for submitted applications. A result cannot be recorded before the date has passed |
| Offer | Admission Offers (`PUT /admissions/:id/offer`, `POST /:id/status`) | Approving needs the class applied for. An offer carries a confirm-by date (14 days by default) and shows as expired once passed |
| Enrol | Row action **Enroll** (two clicks to confirm); `POST /admissions/:id/enroll` | Only `approved` applicants. See 4.3 |

An enquiry cannot be moved to `applied` through the status endpoint: the application form is where required details are collected, so it cannot be skipped.

### 4.3 What enrolment does

`enroll()` runs in one transaction; a failure leaves nothing behind.

1. Creates the student in the class applied for, with a generated admission number (`ADM-<year>-<number>`).
2. Copies every detail collected on the enquiry and application, including the personal, parent, contact, address, official and **sibling** details (`RecordExtra`), to the student.
3. Creates the student login (a starting password the office hands over once; the student must change it at first sign-in).
4. Bills every fee item in the class's fee structure (`billStudents`), never twice.
5. Marks the admission `enrolled` and links the student.

After the transaction commits:

6. The application's documents become student documents under the same names and the photo becomes the student photo. Problems here are reported back, never undo the enrolment.
7. The family's choices become real records: elective subjects, activity registrations, bus assignment, and the fee group's items billed next to the class fees. A hostel bed needs a room and is left as a task for the hostel desk (`followUps` in the response).

### 4.4 Controls

- **Soft delete** on enquiries: Deleted tab, restore, then permanent delete only for an already-deleted one.
- Deleting an enrolled student returns the applicant to `approved` ("offer"), so nothing points at a student who no longer exists.
- Required documents are a master list; an application cannot be submitted without its required ones.

### 4.5 Verified by

`access.test.mjs`: enquiries, enquiry form, applications pipeline, application form, required documents, admission choices, linked records. `ui.test.mjs`: new enquiry, application with documents and siblings, enrolment from the list. `run-process.mjs` steps 2 to 6.

---

## 5. Student record and services

**Owner:** admin. A student exists after enrolment or direct registration (**Students → Register new student**).

| Topic | Rule |
|---|---|
| Registration | Needs admission number (generated when blank), first name, last name. A student with the same name and date of birth asks for confirmation. The class fee structure can be billed in the same step |
| Details | Personal, parent, contact, address, qualification, official details, siblings (Relation, admission no., name, class; at most 10 rows) |
| Status | `active` or `inactive`. Only active students can borrow books, hold a library card, live in a hostel, use transport, apply for leave or have a login |
| Student login | Students → Student Accounts. One login per student; stops working when the student is made inactive; deleted with the student |
| Parent account | Parent Portal → Parent Accounts, or "Create parent login" on the profile. Linked to one or more children |
| Photo and documents | Photo (one per student, in the database). Documents: PDF or image, 5 MB, **stored in the database** so a backup carries them. A required-documents checklist shows what is missing |
| Services on the student | Subjects (electives changed in the details popup), bus route and stop, hostel bed, activities, ID card, fees |
| Health and behaviour | Student Health Records, Clinic Visits, Student Behavior |
| Delete | Soft delete. Refused while the student has certificate requests ("mark inactive instead"). Deleting returns an enrolled applicant to an offer. A permanent removal also clears the student's soft-deleted child rows (see 16) |

Hand-offs: the student's class decides the fees billed, the subjects taken, the exams and marks expected, the timetable, the attendance sheet and the ID card.

---

## 6. Academic structure and timetable

**Owners:** academic coordinator (admin), teachers.

- **Subject map** (`class-subjects`): one row per class and subject: core or elective, component (theory, practical or both), practical share, periods a week, teacher. A student chooses one elective per elective group, in the application or later; changing class or being promoted prunes electives that do not belong to the new class (`pruneElectives`).
- **Theory and practical marks:** a theory plus practical subject carries a practical share (30% of 100 = 70 + 30). The marks sheet then has two boxes, each checked against its own maximum; the total feeds results.
- **Timetable:** class, day, period, subject, teacher, room. A room cannot serve two classes at once. Room bookings cannot clash with lessons. **Substitutions** list the periods of teachers on approved leave and only offer teachers who are free.
- **Teaching tools:** syllabus and lesson plans, homework (with a tracker), study materials, online classes (joining link), academic calendar and holidays.

Verified by: `access.test.mjs` subject map, academics overview, theory and practical marks; `ui.test.mjs` subject map journey.

---

## 7. Daily teaching: attendance, leave and alerts

| Process | Detail |
|---|---|
| **Mark attendance** (A, T) | Per class and date. Status `present`, `absent` or `late`; arrival time (`HH:MM`) and a note of up to 120 characters. Future dates are refused; every student must belong to the class. A teacher opens their own class (My Class), an admin any class |
| **Corrections** | Changing a saved mark records the old value, the new value, a reason and who (Attendance Corrections) |
| **Monthly and period attendance** | Monthly sheet for a class and month; period-wise attendance per class, day and period; biometric devices post marks with their own key (`/device`) |
| **Student leave** | Parent (or student) applies for dates not already over; overlapping pending or approved leave is refused; leave that has started cannot be cancelled. The class teacher or admin approves or rejects (reason needed). Leave types can auto-approve |
| **Absence alerts** | A timer (`startAbsenceAlertTimer`, every 5 minutes) texts or notifies guardians of students marked absent, once per absence. Settings → Notifications sets wording and switches |
| **Reports** | Attendance by class and range, flagging students under the minimum (75% default) |

Verified by: `access.test.mjs` attendance details; `smoke.test.mjs` attendance validation; `ui.test.mjs` attendance journey.

---

## 8. Examinations and results

**Owners:** exam cell (A), teachers (marks).

1. **Grade setup:** a grade scale from 0%; names up to 10 characters, no two starting at the same percentage, pass mark 0 to 100 (40% default).
2. **Exam groups** (optional): weighted exams combined into one result (weight 1 to 1000); an exam can only join a group of its own class.
3. **Create exam:** class, name, maximum marks, dates. The list shows upcoming, ongoing and completed from the dates.
4. **Enter marks** (`POST /exams/:id/marks`): every record needs a student of the exam class and a subject the class studies; a mark cannot exceed its maximum. A student is only expected to have marks in the subjects they take (core plus chosen elective). The sheet warns about unsaved changes.
5. **Results** (`GET /exams/:id/results`): total, percentage, grade, rank (out of the subjects the student takes), result Pass, Fail or Incomplete.
6. **Report card** (`GET /exams/:id/report-card/:studentId`): marks with theory and practical columns, total, percentage, grade, rank, result and attendance, with signature lines. Prints cleanly.
7. **Merit list, holistic progress card, revaluation:** a revaluation request is raised once per subject while pending; an admin accepts (revised mark and note) or rejects (reason).

Verified by: `smoke.test.mjs` exams validation; `access.test.mjs` theory and practical marks, subject map; `ui.test.mjs` marks and report card journey; `check-flow.mjs` exams, marks, results.

---

## 9. Finance

**Owner:** accountant. Money is handled in cents; day values are plain `YYYY-MM-DD` strings.

### 9.1 Flow

```
Fee structure (per class) ─► Billing (per student) ─► Payment ─► Receipt
                                    │                      │
                                    └─ Discount / Fine ────┴─► Refund ─► Reports
```

| Step | Screen and endpoint | Rule |
|---|---|---|
| Bill | Fees → Bill a class (`POST /fees/generate`); automatic at enrolment | One fee row per student per structure item; never doubled. A class with no structure items is refused |
| Add a single fee | `POST /fees` | Needs student, title, amount above zero |
| Pay | `POST /fees/:id/payments` | Amount above zero; no overpayment; accepted methods and whether part payment is allowed come from Settings → Payments. The paid amount always equals the payments recorded |
| Receipt | `GET /fees/receipts/:paymentId` | Every payment has its own number (prefix from settings); printable |
| Discount, fine | `POST /fees/:id/adjustments` | A reason is required; a discount cannot take the fee below what was already paid |
| Refund | `POST /fees/payments/:paymentId/refund` | Recorded against the payment |
| Late fines | `POST /fees/late-fines` | Bills fines for overdue fees |
| Reminders | Fee Reminders | Overdue guardians, at most once per 24 hours (cooldown in Settings) |
| Income, expenses | Other Income, Expenses | Feed the financial reports |

Status is derived, never stored: `paid`, `overdue` (not paid and past due), `partial`, `unpaid`.

### 9.2 Rules that protect the books

- A fee with any payment history, even fully refunded, cannot be deleted, moved to another student or re-priced except through discounts and fines.
- A fee cannot be moved to another student: delete it and bill the right one.
- Fee groups bundle items; applying one to a class adds the items to its structure and can bill current students (never twice).
- Service fees (hostel, transport, library fines) are billed through this same flow, so they appear on the student's balance and reports.

Verified by: `access.test.mjs` fees, hostel billing, library fines; `ui.test.mjs` fee payment; `check-flow.mjs` billing, payments, receipts (paid amount equals the payments recorded, one fee row per structure item).

---

## 10. People

**Owners:** HR (admin), accountant for payroll.

| Process | Detail |
|---|---|
| **Staff registration** | Staff Directory. Staff number generated when blank, designation, department, joining date, personal and identity details, bank details. Identity, address and emergency data are visible to admins only, bank details to admins and accountants |
| **Staff documents** | Required documents by role (master list); PDF or image, 5 MB, stored in the database |
| **Staff attendance and leave** | Staff attendance and monthly sheet; leave types and balances; leave that has started cannot be cancelled; approved leave feeds substitutions |
| **Payroll** | Accountant sets salary terms (`PUT /payroll/salaries/:staffId`) and generates payslips for a month (`POST /payroll/generate`). **Only an admin approves payment** (`POST /payroll/payslips/:id/pay`); the approver is recorded. Deductions cannot exceed gross; a paid payslip cannot be deleted |
| **Recruitment** | Openings, applicants (applied, shortlisted, interviewed, offered, hired). Only offered applicants can be hired; hiring creates the staff profile and closes the opening when vacancies are filled |
| **Performance reviews** | Four ratings from 1 to 5, averaged. A finalised review cannot be changed or deleted |
| **Deleting staff** | Refused for staff with payslips, reviews or documents; mark them inactive |

Verified by: `smoke.test.mjs` payroll, staff records; `access.test.mjs` staff records and field visibility; `ui.test.mjs` staff.

---

## 11. Library, transport, hostel, inventory

### Library

Books and categories (a category in use cannot be deleted) → library cards (number, valid until, books allowed at a time, active or suspended) → issue and return (loan 14 days by default, maximum 90; fine per day from settings) → reservations.

- A reservation is only possible when no copy is free; a returned copy is held for the first reservation.
- A student cannot borrow the same book twice at once; only active students borrow; a card limits books at a time and cannot be withdrawn while books are out; a book with copies on loan cannot be deleted.
- A late return bills the fine to the student as a normal fee, once; earlier returns can be backfilled (`POST /library/issues/bill-fines`).

### Transport

Vehicles (seats), drivers and attendants, routes, stops (a stop belongs to a route) → assignment of a student to a route and stop with trips (both, pickup or drop) and authorised collectors → monthly transport fees → bus attendance (boarded or absent, per route, date and morning or evening trip) → live GPS (`/device` units with their own key; latitude, longitude and speed are range checked) → maintenance. A vehicle never carries more than its seats; a route or stop with riders cannot be deleted.

### Hostel

Hostels → rooms (beds, monthly fee) → allocation (bed number unique within a room, boys or girls rule, capacity, meal plan, security deposit, parent consent) → night roll call (present, absent, leave) → mess menu (a day and meal saved again replaces the entry) → visitor log (check in, check out; only boarders can be visited) → monthly hostel fees through the fee flow → occupancy report. A room with residents cannot be deleted.

### Inventory

Categories → items (stock changes only through movements) → suppliers → stock in and out (never more than in stock; row-locked so simultaneous issues cannot overdraw) → purchase orders (each item once per order; **receive** adds every line to stock exactly once) → asset register with maintenance (an asset with history is marked disposed, not deleted) → stock reports (low stock, value at latest cost). **Inventory requests:** a teacher asks for items with a reason; an admin approves (optionally fewer, issued through the normal stock-out rules) or rejects with a reason; teachers see only their own.

Verified by: `access.test.mjs` hostel, library cards; `smoke.test.mjs` inventory, inventory requests, library fines.

---

## 12. Certificates, ID cards and documents

| Process | Detail |
|---|---|
| **Certificate request** | Requested at the office (A) or from the parent portal (bonafide, character, fee; a transfer certificate only through the parent or the office). Status `requested`, `issued` or `rejected` (reason needed) |
| **Issue** | `POST /documents/:id/issue`. The wording in force (Document Templates, with `{{placeholders}}`) is **frozen into the certificate** at issue, so reprints never change. An issued certificate is part of the register and cannot be deleted. Only one open request per student and type |
| **ID cards** | Settings → ID Card Design (colours, logo, year, signature, which details show) for student and staff cards. Print one from the student details popup, a staff card from Staff, or a whole class from ID Cards: one card per active student |
| **Leaving certificate** | Transfer certificate from Students → Transfer / Leaving Certificate, then the student is made inactive or promoted out (section 15) |

Verified by: `access.test.mjs` linked records (certificate blocks student delete), id card design; `ui.test.mjs` ID cards; `run-process.mjs` step 11.

---

## 13. Parent and student portal

- **Parent** sees each linked child: overview (30-day attendance and fee position), profile, attendance, timetable, homework, online classes, materials, results, fees, library, activities, notices, messages, calendar, transport tracking, feedback, leave, certificates.
- **Student** sees their own record read-only. A student may apply for leave and withdraw their own request, and may request a certificate (the office decides). Every other write is refused (403).
- A child who is not linked to the signed-in parent looks exactly like one that does not exist (404).
- Admin oversight: Parent Login Activity (last sign-in, never-signed-in flag), Parent Requests (leave, certificates and revaluation raised from the portal, with a link to decide each), Login History (last 300 attempts, kept 180 days).

Verified by: `smoke.test.mjs` student login; `run-process.mjs` step 8.

---

## 14. Communication

- **Notices** (A): audience all, students, staff and so on; shown in the portal and dashboard.
- **Email and SMS:** to all parents, one class, one number, staff or a user group; templates; history. SMTP and Twilio credentials and `DEFAULT_COUNTRY_CODE` live in `server/.env`. **With none set the system is in log-only mode: messages are recorded as "recorded only" and are not delivered.** Settings → Integrations shows which credentials are set (never the values) and sends a test.
- **Absence alerts** and **fee reminders** use the same channels (sections 7 and 9).
- **Push notifications:** browser Web Push, per device; needs https or localhost; sent by an admin.
- Phone numbers need a country code, or set `DEFAULT_COUNTRY_CODE`; an invalid number is refused before sending.

---

## 15. Year end: promotion and alumni

`POST /promotion { fromClassId, toClassId, studentIds? }` (admin):

- Moves the active students of a class (or only the listed ones, to hold others back) to the target class. The target must differ from the source.
- With no target class the students are marked **inactive** (graduated or left).
- Runs in one transaction, then prunes electives that do not belong to the new class.
- After the last class is promoted, switch the current academic year (Academic Years).
- The ID card follows the new class; **Alumni** lists former students.

Verified by: `run-process.mjs` step 12.

---

## 16. Controls that apply everywhere

| Control | How it works |
|---|---|
| **Soft delete** | Every table (except photos, logs and push tokens) carries `authadd/authedit/authdel`, `addondt/editondt/delondt` and `delstatus`. A delete sets `delstatus`; reads ignore deleted rows. `src/models/auditSoftDelete.js` |
| **Permanent delete** | `destroy({ force: true })`. Before the parent goes, its children are cleared: cascade children are removed, already soft-deleted restrict children are removed, a live restrict child still blocks, and set-null children are detached. Admission numbers of soft-deleted students are freed this way when reused |
| **Audit log** | Every successful create, change and delete is written to `audit_logs` (who, what, when; passwords redacted), plus downloads of full backups and CSV exports. Admins filter it by area, action, dates and text |
| **Data integrity** | Models declare relationships; on start the server adds each missing foreign key that has no orphans. `npm run db:orphans` lists the blocked ones; `-- --delete` removes the orphaned rows and adds the keys. Payslips and issued certificates are never auto-deleted |
| **Files** | Photos, application documents, student files and staff files are stored in the database as base64, judged by their bytes, never by name or the client's claim. At start-up any file still only on disk is copied into its row (`moveFilesToDatabase`) |
| **Money and dates** | Cents internally, `YYYY-MM-DD` strings for day values, `HH:MM` for times |
| **Validation** | Rules live in services, so one validation serves the form, the spreadsheet import and the API |
| **Safe changes** | One transaction per business step (enrolment, billing, receiving stock, promotion) |

---

## 17. Operations

| Job | Detail |
|---|---|
| **Run** | `npm run server` (API on 4000) and `npm run client` (5173). `npm run build` makes the client bundle in `client/dist`; the API does not serve it, so host it with any static web server and point `CLIENT_ORIGIN` at its address |
| **Migrations** | `migrateDatabase()` runs on every start: `sync()` for new tables, then `ADDED_COLUMNS` in `src/config/migration.js` for new columns on existing databases, then the audit columns, leave types, relationships and file move |
| **Absence alert timer** | Every 5 minutes (`autoAbsence.service.js`) |
| **Scheduled backup** | `autoBackup.service.js`: a first check one minute after start, then every 30 minutes; writes a JSON file to `BACKUP_DIR` (default `server/backups`) when the newest is older than `BACKUP_EVERY_HOURS` (default 24); keeps `BACKUP_KEEP` (default 14); `BACKUP_AUTO=off` disables. It is on the same disk as the database, so **copy the folder off the server** |
| **Manual backup and restore** | Settings → Backup & Restore. A backup is every table as one JSON file, including uploaded files (they are in the database) and password hashes. Restore replaces all data in one transaction, needs the word `RESTORE`, refuses a file with no users and rolls back on any error |
| **Before going live** | Change `JWT_SECRET`, the seeded admin password and the MySQL password; set `TRUST_PROXY=1` behind a reverse proxy |

### Routine

| When | Who | What |
|---|---|---|
| Daily | Teachers | Mark attendance; enter marks and homework |
| Daily | Admissions | Follow up enquiries; review applications |
| Daily | Accountant | Record payments; check the day's receipts |
| Weekly | Admin | `npm run check:flow`; copy `server/backups` off the server; review the audit log |
| Monthly | Accountant | Payslips, hostel and transport fee runs, fee reminders; admin approves payroll |
| Term | Exam cell | Create exams, enter marks, publish results and report cards |
| Year end | Admin | Promotion, new academic year, archive |

---

## 18. Verification

| Check | Command | Covers |
|---|---|---|
| Integration tests | `npm test --prefix server` (API running) | Rules in sections 2 to 15 against the real API, 46 checks; they delete what they create |
| Browser journeys | `npm run test:ui --prefix server` (API and client running, Chrome) | Sign in, enquiry, application with documents and siblings, enrolment, attendance, marks and report card, ID cards, fee payment, subject map, staff |
| Process run | `npm run run:process --prefix server` | One family through 12 steps from enquiry to promotion; says which step breaks |
| Flow check | `npm run check:flow --prefix server` | Where two modules disagree (enrolled applicant is a real student, one fee row per structure item, paid equals payments, receipts, attendance coverage, marks belong to the class, counts agree) and the database relationship check |
| Page sweep | `npm run check:pages --prefix server` | Opens all 177 menu pages in Chrome and reports crashes and console errors |

If every integration test fails at once, the dev server was restarting: wait and rerun. The suites share one database, so tests that count rows across the school compare only their own records.

---

## 19. Open items

| Item | Owner | Note |
|---|---|---|
| Orphaned rows in the live database | A | `npm run db:orphans -- --delete` removes orphaned certificate requests; an orphaned payslip needs a person to decide |
| Email, SMS and push delivery | A | Configure credentials in `server/.env`; until then messages are recorded only |
| Off-server backup copy | A | Copy `server/backups` regularly |
| Pilot with one real class | School | Follow the implementation guide, then fix what the pilot shows before opening more classes |
| Single server and database | Dev | No failover |
