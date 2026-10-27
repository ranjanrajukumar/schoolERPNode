# School ERP

- `server/` â€“ Node.js + Express + Sequelize (MySQL) REST API, JWT auth
- `client/` â€“ React (Vite) admin UI

## Mobile app
One app serves many schools: the person signs in with a mobile number (or email) and password, the **global registry** (`global/`, its own small service and database) finds their school and role, and the app signs in at that school's own server with a short-lived signed ticket. See [global/README.md](global/README.md).

`app/` is a React Native (Expo) app for parents, students and teachers that uses the same API. Its menu (labels, icons, order, roles, visibility) is stored in the database and edited under Settings, Mobile App Menu. See [app/README.md](app/README.md) to run it on a phone.

## Structure
```
server/src
  config/       env, database connection, migration (sync + admin seed)
  models/       one Sequelize model per table, wired together in index.js
  middleware/   auth, error handling
  modules/      feature code, one folder per domain
    platform/   auth, dashboard
    academics/  classes, students, attendance
    finance/    fees
  routes/       mounts every module under /api
  utils/        asyncHandler, generic CRUD router
  app.js        Express setup      index.js  startup      sync.js  db:migrate entry
client/src
  modules/      pages grouped by domain (platform, academics, finance)
  components/   shared UI (Sidebar, ResourcePage, ProtectedRoute)
  context/      AuthContext      layouts/  AppLayout
  routes/       route table      services/ api client
```

## Implementing it in a school
See **IMPLEMENTATION_GUIDE.md** for the six-week plan, process maps, roles, data checklist, training plan and go-live checklist. In the app, **Help & Support** has a **Setup & Go-Live Guide** (a checklist that ticks itself from your data, with a nudge on the admin dashboard until it is complete), **Class Readiness** (which classes have a class teacher, subjects with teachers, a timetable and fees) and a clickable **Process Map**. Every class can name a class teacher.

## Setup
1. Create `server/.env` from `server/.env.example` (MySQL credentials and `JWT_SECRET`).
2. `npm run install:all`
3. `npm run db:migrate` (creates the database and tables, seeds the admin)
4. `npm run server` (API on :4000; it restarts when files in `server/src` change, and deliberately ignores `node_modules`, which otherwise made it restart in the middle of test runs) and `npm run client` (UI on :5173)

First login: `admin@school.local` / `admin123` (seeded; change it).

## Adding a module
Add `models/<name>.model.js` and register it in `models/index.js`, create `modules/<domain>/<name>.routes.js`
(use `crudRouter` for plain CRUD, add a `.service.js` for logic), mount it in `routes/index.js`,
then add a page under `client/src/modules/<domain>/` and a route and Sidebar link.

## Process flow
The full process-by-process reference (owners, states, rules, endpoints and checks) is [docs/PROCESS_GUIDE.md](docs/PROCESS_GUIDE.md).

1. **Setup** â€“ academic years, classes, subjects, staff, class-subject-teacher assignments, fee structure per class, timetable.
2. **Admission** â€“ enquiry â†’ applied â†’ approved â†’ *enroll* (creates the student, generates the admission no, bills the class fee structure).
3. **Daily** â€“ attendance (admin, teacher), library issue/return (late fines are billed to the student as a normal fee on return; admins can bill earlier ones with "Bill fines from earlier returns"), notices.
4. **Finance** â€“ fee items â†’ partial/full payments (row-locked, no overpayment) â†’ numbered printable receipts â†’ defaulter and collection reports.
5. **Exams** â€“ create exam â†’ enter marks (validated against max) â†’ results with grade and rank â†’ printable report card with attendance.
6. **Year end** â€“ promotion (move a class up, hold students back, or graduate), then switch the current academic year.

Inventory: categories → items (stock only changes through movements) → suppliers → stock in/out (cannot issue more than in stock, row-locked) → purchase orders (receiving adds every line to stock exactly once) → stock report with low-stock list and value at latest cost. **Asset register** tracks individually tagged assets (location, cost, status) with a maintenance log and a 30-day service-due list; assets with maintenance history cannot be deleted, only marked disposed. Admin only, except **Inventory Requests**: teachers ask for items, an admin approves (which issues the stock through the normal stock-out rules, optionally fewer than asked) or rejects with a reason; teachers see only their own requests.

Messaging: **Staff Messages** emails or texts all active staff (using the email/phone on their staff profile). Email (SMTP) and SMS (Twilio) from **Communication** (send to all parents, one class or one number; templates; history), **Fee Reminders** (overdue guardians, once per 24 h) and **Send SMS** on the absence-alert page. Set the `SMTP_*` / `TWILIO_*` / `DEFAULT_COUNTRY_CODE` values in `server/.env` (see `.env.example`). **Without them the system runs in log-only mode: messages are recorded in the history as "recorded only" and are NOT delivered.** Phone numbers need a country code, or set `DEFAULT_COUNTRY_CODE`.

Student login: admins create a login per student under **Students → Student Accounts**. A `student` sees only their own record in a read-only portal (homework, fees, attendance, results, timetable, notices addressed to all or students); applying for leave and requesting certificates stay with parents. The login stops working when the student is made inactive and is deleted with the student.

Roles: `parent` sees only the Parent Portal (their linked children's fees, attendance, results, timetable, notices); `admin` everything; `teacher` attendance, marks, library, read-only elsewhere; `accountant` fees, fee structure, finance reports.
Assumed defaults to confirm with the school: grade scale and 40% pass mark (`modules/exams/grading.js`), library loan 14 days and fine 2/day (`modules/library/library.service.js`), 75% attendance flag (Reports).

Health & Safety (admin): student health records (blood group, allergies, regular medication, emergency contact), clinic visits, incidents with severity and open/resolved status, safety inspections per area, and a report counting this month's visits, open incidents, and areas whose latest inspection failed or is overdue.

Help & Support: **Help Center** (searchable FAQ), **User Guide** (by role), **Submit a Support Request** (any staff member writes to the administrator, who replies and sets the status there) and **System Updates** / **About** pages. **Custom Reports** (admin) builds a report from a dataset, chosen columns, up to 10 filters and a sort, shown on screen or downloaded as CSV (max 5,000 rows).

Settings (admin): **Branches / Campuses** (first one is the main campus; classes are assigned to a campus); **Notifications** (absence and fee-reminder SMS wording, reminder cooldown) and **Payments** (receipt number prefix, which methods are accepted, whether part payments are allowed) are settings that the system really uses; **Integrations** shows which email/SMS credentials in `.env` are set (never the values) and sends a test message; **Data Import / Export** downloads CSVs (students, staff, fees, payments, books, inventory, applicants) and imports students from a CSV, checking every row first and importing all or nothing; **Backup & Restore** downloads every table as one JSON file and restores it (replaces all data in a single transaction, rolled back on any error; uploaded files are included because they are stored in the database, and the file contains password hashes). A scheduled backup also writes the same file to `server/backups` about daily (see `BACKUP_*` in `.env.example`).

Custom roles (admin): a role is a built-in role (admin, teacher or accountant) narrowed to chosen modules with view-only or view-and-change access, e.g. a Librarian. It can never do more than its base role, and the server enforces it on every request (areas not named are refused, including new ones; the dashboard and basic lookups such as classes and students stay readable). Users, roles, groups, audit log and login history are never grantable. **User Groups** collect staff logins and can be emailed together. Custom-role logins are assigned on the Users page.

Parent portal oversight (admin): **Parent Login Activity** shows each parent account's last sign-in and flags accounts that never signed in; **Parent Requests** gathers leave, certificate and revaluation requests from the portal with a link to decide each; **Login History** (User Management) lists the last 300 sign-in attempts, kept 180 days (email, role, address, browser; never passwords). **Document Templates** edits the wording of each certificate with {{placeholders}}; the wording in force is frozen into a certificate when it is issued, so reprints never change.

Timetable extras (admin): rooms picked per timetable period (a room cannot serve two classes at once) plus one-off room bookings that cannot clash with lessons; substitution management lists the periods of teachers on approved leave and only offers teachers who are free (no lesson, no other cover, not on leave) for cover; a timetable report shows teacher workload, periods per class, room use and periods without a teacher.

Student registration: **Students → Register new student** is one form grouped into admission (admission no, date, class, roll no), student (names, date of birth, gender, nationality, religion, category, mother tongue, national ID), contact and address, parents (names, phones, occupations), guardian (the primary contact that SMS goes to), previous school, and remarks. Only admission no, first name and last name are required; formats (emails, phones, PIN, ID, dates) and lengths are checked. The profile page shows everything, and the CSV import/export carry the same columns. The photo, documents and health record are added from the profile after saving.

Staff registration (admin): **Staff → Register new staff member** collects employment (staff no is generated if blank, designation, department, type, joining date), personal and identity details, contact and address, qualification and experience, emergency contact and bank details. Identity, address and emergency data are visible to admins only and bank details to admins and accountants; other roles see names, designation, department, contact and joining date.

Admission applications use the same detailed form as student registration (names, parents, address, previous school and more); everything collected is copied to the student record when the applicant is enrolled, along with the admission date. The public /apply form takes a shorter set of the same fields.

Parent accounts: a parent profile keeps phone and alternate phone, occupation, employer, ID and address as well as the portal login; **New parent account** can be filled from the father, mother or guardian details already on a student's record and links that child on save.

On registration the admission number is generated when left blank, a student with the same name and date of birth as an existing one asks for confirmation, and the class's fee structure can be billed in the same step. The student profile has a **Create parent login** shortcut.

Hostel allocation also records the bed number (unique within a room), meal plan, local guardian, security deposit and whether the parent consent form was received; transport assignment records which trips the child uses and who is authorised to collect them. Editing a row updates the same allocation.

Master data (Settings → Master Data, admin): central lists for religion, category, nationality, mother tongue, state / UT, relation, occupation, qualification and marital status, filled with defaults on first run. The student, applicant, staff and parent forms offer them as dropdowns. Options can be renamed, hidden, reordered or deleted without changing records that already use them (records keep the text; an older value is still shown when editing). Designations and departments are already managed as lists under Staff & HR.

Enquiries (Admissions → Admission Enquiries): the enquiry desk shows total enquiries (with the change since last month), how many need a follow-up (a follow-up date that has arrived), campus visits scheduled and conversions this month, then a paged table with tabs (All, New, Follow-up, Converted), search by child, parent, phone, email or enquiry number (ENQ-2026-0012), and filters for grade, status, source, dates and scheduled visits. Each row has a menu: edit, plan a follow-up or visit with a note, move to the next stage, enroll, delete. Source is Website (the public form), Walk-in, Phone, Referral, Social media or Other.

Bulk import (Settings → Data Import / Export): ten importers in the order a school needs them (classes, subjects, departments, designations, staff, subjects and teachers per class, fee types, fee structure per class, library books, students). Each has a downloadable template with an example row; a file is checked row by row with every problem explained, and only a fully valid file is imported, in one transaction. Rows already in the system are reported as "already there" and skipped, so a corrected file can be uploaded again safely. Logins, parent accounts and the timetable are deliberately not importable (they involve passwords or decisions).

Entry popups: the registration forms for students, staff, parent accounts and admission applications open as a popup over their list (Esc or ✕ closes it, and asks first if anything was typed; a click on the dim background does not close it). Links such as /students?new=1 or /staff?new=1 open the popup directly, and the student profile edits details and creates the parent login in popups too. The old /students/new style addresses still work as full pages.

Look and feel: every page follows the School Profile design (DM Sans type bundled with the app, a flat blue accent, white cards with soft borders, small uppercase labels over fields, soft pill badges, quiet row actions and a light sidebar; dark mode keeps the same structure). The dashboard has a greeting, quick-action chips, coloured tiles and charts (today's attendance ring, attendance for the last 7 days, fees collected over 6 months); **Ctrl+K** (or the search box in the header) opens a command palette to jump to any page you may open, find a student by name, switch theme or sign out; the header button cycles the theme between light, dark and follow-the-device (remembered per browser); the sidebar has an icon per area. The layout is responsive: under 900px the sidebar becomes a drawer.

Type-ahead search: wherever a form needs one student (fees, library, hostel, transport, leave, certificates, behaviour, health, clinic visits, incidents, student logins, activities, parent links) it shows a search box instead of a dropdown of everyone. Staff pickers (teacher in the curriculum and timetables, leave, performance reviews, staff documents) work the same way. It calls `GET /api/lookup/students|staff|books|parents?q=` (the `typeahead` middleware in `server/src/middleware/typeahead.js`): every word typed must match the name, admission number, roll number or a phone number, results are capped at 25, and the browser never loads the whole student list. Add a new kind of record by adding one `typeahead({...})` route in `modules/lookup/lookup.routes.js`.

Fee groups: reusable bundles of fee items; applying one to a class adds the items to its fee structure and can bill the current students (never twice). Recruitment (admin): openings → applicants (applied → shortlisted → interviewed → offered → hired); hiring creates the staff profile and closes the opening when its vacancies are filled. Performance reviews (admin): four 1-5 ratings with an average; a finalised review is permanent. Staff documents (admin): PDF/image uploads checked by content, 5 MB max. Staff who have reviews or documents cannot be deleted (mark them inactive).

Admissions extras: a public **/apply** form (no sign-in, limited to 5 per address per hour) creates enquiries marked online; staff can schedule an entrance test and record marks, schedule interviews with a result, set an offer-confirmation date for approved applicants (shown as expired once passed), and see a funnel report (stages, conversion, acceptance, by class).

Library cards: **Library Members** issues a card (number, valid-until date, books allowed at a time, active or suspended). A student with a card is held to it when borrowing; a student without one can still borrow unless Settings → Library requires a card.

Library extras: book categories, a reservation queue (only for books with no free copy; a returned copy is held for the first reservation, so someone else cannot take it), a members list (borrowing history, books on loan, fines) and a library report (most borrowed, titles per category).

Hostel: hostels → rooms (beds, monthly fee) → allocation (capacity and boys/girls checks) → night roll call, weekly mess menu, visitor log, monthly hostel fees billed through the normal fee flow, occupancy report.

Files: admins upload a student photo (shown on the profile and ID card) and documents (PDF or image, 5 MB max) from the student profile; staff can view them. Files are stored in the database (`student_files.data`, base64), validated by content, so backups carry them. Files from older versions that are still in `server/uploads` (override with `UPLOAD_DIR`) are copied into the database at start-up and read from disk until then.

**School Profile** (Settings → School Profile, admin) holds the school's identity (name, code, ownership, admission type, board, year established, registration no), contact details (phone, email, website, address), branding (logo as PNG or JPEG up to 1 MB, checked from its bytes; principal; motto) and academic defaults (current academic year, time zone, language, date format), with a view mode and an edit mode. Time zone, language and date format are stored as defaults; screens will adopt them as they are updated. School name, address, principal and policies (attendance threshold, library loan/fine, leave allowances) are edited under **Settings**. `SCHOOL_NAME` in `server/.env` is only the first-run default.

Enquiries and admissions: the Enquiries page (tiles, tabs, search, filters) uses the four-section New enquiry form (student, parent, enquiry details, follow-up plan). Deleting an enquiry is a soft delete: it moves to the Deleted tab, where it can be restored or removed permanently. The Applications page reads the pipeline (Under review, Assessment, Offer sent, Enrolled) from what is already recorded on each applicant, and offers Make offer / Enroll on the row. Registrations lists students with a registration status (complete, pending, under review) and a REG-year-number id.

Photos: students, staff, enquiries and the school logo keep one picture each in the database (`photos` table, base64, JPEG/PNG/WebP up to 1 MB, checked from the file's bytes), so photos travel with backups. Only admins change them; `PUT/DELETE /api/photos/:entity/:id`.

ID cards: Settings → ID Card Design sets one design (header and accent colours, logo, academic year, signature and footer text, and which details show) for student and staff cards. Print a student card from the ⋯ details popup on Enrolled Students, a staff card from the ⋯ on Staff, or a whole class from the ID cards button.

Demo data: `npm run seed:demo --prefix server` (server running) adds sample departments, classes, staff, students, enquiries and applications, then subjects, payroll terms, fees with payments, five days of attendance, exam marks, one enrolment, hostels with boarders, transport routes with riders, and inventory with stock, through the normal API; running it again skips what exists. `npm run seed:demo:remove --prefix server` deletes what it added.

Process check: `npm run check:flow --prefix server` walks enquiry → application → enrolment → student → class → fees → payments → attendance → exams and marks → ID cards → counts through the API and fails when two modules disagree. It also runs the database relationship check.

Page sweep: `npm run check:pages --prefix server` opens every menu page as the admin in a real browser (API and client running, Chrome installed), opens each "+ New" popup, and reports crashes, console errors, server errors and empty pages. Pages that open a full form page instead of a popup (New admission) are reported as such.

Student application: Applications → New admission opens a four-step form (student, guardians, schooling with documents, review and consent) on the same admissions record. A draft can be saved and finished later; Submit moves it to Under review, and an enquiry can be started as an application from its row (Apply). Approve, make an offer and Enroll as before: enrolling copies every detail, the uploaded documents (as student documents) and the photo to the student.

Required documents: Settings → Master data has three document lists (Application, Student and Staff documents) where each item can be marked Required. Those forms show a checklist: a slot per document with Upload / Replace / Remove, what is still needed, and "other" files. An application cannot be submitted until its required documents are uploaded; for students and staff the checklist shows what is missing. Documents picked on a new record upload when it is saved, and an application's documents move to the student on enrolment under the same names.

Dashboard: the overview follows the school mockup: four headline tiles (students, present today, fee collection, new enquiries), the enrolment trend (applications and enquiries over eight months), recent activity, applications to review, and the daily priorities (enquiries to follow up, applications to review, classes whose attendance is not taken, overdue fees). Applicant names and activity are shown to administrators only; the older charts, events and notices stay below.

Fees & payments: tiles for billed, collected, outstanding and overdue, tabs by status, search and a class filter. Add fee, Bill a class, Pay, Discount, Fine, late fines and the printable receipt are all popups.

Library: tiles (titles, on loan, overdue, fines), tabs for Books, On loan, Overdue and Returned, search and paging; Issue a book and Add / Edit book are popups.

Exams: the marks sheet (progress tiles, search, a Save button that tells you when there are unsaved changes and a warning before you leave with unsaved marks) and Results (students, passed, class average, top score; tabs for Pass, Fail and Incomplete; report card per student).

Reports: tabs for Attendance (any date range and class, flags students below the minimum), Income & expenses (with collection by method and expenses by category) and Fee defaulters; each has summary tiles, search and an Export that downloads the report on screen. The money reports are for admins and accountants.

Payroll: tiles (staff on payroll, net payroll, paid, waiting for approval), a month picker, tabs for Payslips and Salary terms, search, and the salary terms in a popup. Only an admin approves a payment.

Hostel allocation: tiles (boarders, beds taken, full rooms, monthly income), search with hostel and consent filters, and allocate / move a boarder in a popup (same capacity and boys/girls rules as before).

Browser tests: `npm run test:ui --prefix server` (API and client running, Chrome installed) drives ten journeys through the real screens: sign in and the dashboard, a new enquiry, a student application with its required documents and a sibling, enrolling an offered applicant, attendance, marks and the report card, the ID card page, paying a fee, the subject map with an elective choice, and adding staff. It checks the result through the API and cleans up after itself.

Full process run: `npm run run:process --prefix server` takes one family through the whole school process against the running API (enquiry, application with documents and consent, test and interview, offer, enrolment, fees paid in two parts, parent portal login, attendance, exam marks and report card, a certificate request, promotion) and says which step breaks. It removes what it creates. The student details popup now carries the document checklist, with a badge when required documents are missing.

Transport assignment: tiles (riders, seats taken, routes and stops, maintenance due), search with a route filter, and assign / move a rider in a popup (a vehicle never carries more than its seats).

Stock in and out: tiles (this month, movements, value or units, items low on stock), search and paging; Add stock and Issue stock are popups, and you cannot issue more than is in stock.

Exam list: tiles (all, upcoming, ongoing, completed), tabs by status from the exam dates, search and a class filter; Marks and Results one click away; create and edit in a popup.

Purchase orders: tiles (orders, waiting for goods, past the expected date, received), tabs by status, search and paging; a new order with several lines is placed in a popup, and Receive adds every line to stock once.

Inventory requests: tiles and status tabs; a request is made in a popup, and an admin approves (choosing how many to issue) or rejects (with a reason) in popups instead of browser prompts.

Revaluation and merit list: revaluation requests have status tabs and tiles, with logging, accepting (revised mark and note) and rejecting (reason) in popups instead of browser prompts; the merit list shows top score, list size and average, and prints without the controls.

Exam groups and grade setup: exam groups show their weighted exams, combined results and a New group popup; grade setup has tiles (pass mark, grades, top grade, scale) and a Save button that reads Saved until you change something.

The whole chain, connected: enquiry → registration (the four-step application) → admission (review, assessment, offer) → enrolment. The application also records what the family asks for: an elective from each group of the class, activities and clubs, a bus route and stop, a hostel bed and a fee group. Enrolling turns those into records: the student's electives, activity registrations, the bus assignment and the fee group items billed next to the class fees; the hostel bed is left as a task because it needs a room. The Subject map (Academics), and the Class map page, set, per class, which subjects are core or elective, taught as theory, practical or both, the periods a week and the teacher, and where students choose electives. Exams, results and report cards then follow it: a student is only expected to have marks in the subjects they take, and is ranked out of those. Subjects can be added, edited and removed on the Class map page as well as the Subject map page, and a subject that does not exist yet can be created in the same popup ("New subject…"). The Class map shows one class on a page: teacher, subjects, fees, activities, transport and hostel.

Theory and practical marks: a theory + practical subject can carry a practical share (30% of an exam out of 100 means 70 theory + 30 practical). The marks sheet then shows a theory box and a practical box with the total beside them, each checked against its own maximum; a practical-only subject is all practical. The subject total is what results, ranks and merit lists use, and the report card shows the two parts. A total entered before the share was set stays as it is until someone enters the two parts.

Student details popup (the ⋯ on Enrolled Students): besides the registration details it shows the subjects the student takes (an admin can change an elective right there), the bus route and stop, the hostel bed, the activities, the document checklist and the ID card, so a student registered directly, not through an application, can be given the same services.

Report card: a printable sheet with the school name and logo, the student with photo, the marks table (theory and practical columns where a subject is split, electives marked), a total row, percentage, grade, rank, result and attendance, and signature lines for the class teacher, parent and principal.

Class teacher: under Users, link a login to a staff member; on Classes, choose that staff member as the class teacher. The teacher then gets a **My class** page (Dashboard menu) with the roll, today's attendance and leave waiting for a decision, and Mark Attendance opens on their own class. A teacher can open only their own classes; an admin can open any.

Library members and reservations: tiles and tabs (cards and borrowers without a card; active, fulfilled and cancelled reservations), search and paging, and issuing a card or reserving a book in popups.

Hostel visitor log and attendance: tiles and tabs (visitors inside now or all; boarders present, absent, on leave), search and paging; checking a visitor in is a popup, and the night roll call saves with one button that says Saved until something changes.

Hostel fees, transport fees and hostel reports: the two monthly fee runs share one page layout with tiles (people billed, amount billed each month) and a confirmation before billing; hostel reports show boarders, income, full rooms, today's roll call and occupancy with an export.

Transport attendance and reports: bus attendance (route, trip and date; boarded, absent, not marked) with tiles, tabs and one Save button; transport reports with riders, vehicle utilisation, route income and maintenance due, and an export of the routes.

List pages: the simple list pages (subjects, fee types, routes and so on) share one layout with a New button, search, paging, Edit/Delete buttons and the entry form in a popup.

## Security and testing
- Every request re-checks the user in the database, so deleting an account or changing its role takes effect immediately (not after the 8 h token expires).
- Sign-in is limited to 8 failed attempts per email per address (40 per address) in 15 minutes; set `TRUST_PROXY=1` behind a reverse proxy. Unknown and known emails take the same time to reject.
- `helmet` security headers; database error text is logged, not sent to clients.
- Before going live: change `JWT_SECRET`, the seeded admin password (`admin123`) and the MySQL password.
- `npm test --prefix server` (47 checks) runs end-to-end checks of the rules that must not regress (token revocation, upload validation, student isolation, custom roles, staff field visibility, student registration, the restore guard, library cards, the audit log, the school profile, the setup guide, bulk import, enquiries and the enquiry form, photos, registrations, the application pipeline, type-ahead search, the class teacher link, hostel capacity and billing, stock concurrency, messaging validation) against the running API. It deletes everything it creates.
- Money rules: a fee with any payment history (even fully refunded) cannot be deleted, moved to another student or re-priced except through discounts/fines; fee amounts must be above zero. Marks and attendance only accept students and subjects that belong to the exam or class, valid statuses and non-future dates; loan periods are limited to 1-90 days.
- Marks entry: admins can enter any subject; a teacher only the subjects assigned to them under **Class subjects**. A teacher login is matched to a staff profile by **email**, so the login email must equal the staff profile email; a login with no matching profile is read-only.
- Data integrity: older tables were created before some relationships existed and have no database foreign keys, so deleting a parent could leave orphaned rows (and crash listings). On every start the server adds each missing foreign key that has no orphans; `npm run db:orphans` lists the ones still blocked by orphaned rows and `npm run db:orphans -- --delete` removes those rows and adds the keys. Payslips and issued certificates are never auto-deleted: staff with payslips and students with certificates cannot be deleted (mark them inactive). Fresh databases get every key from the start.
- Payroll: the accountant sets salaries and generates payslips; only an admin can approve payment ("Approve & mark paid"), and the approver is recorded on the payslip.
- Known, accepted: `npm audit` still reports a moderate `uuid` advisory inside Sequelize (not reachable: Sequelize never passes a buffer) and moderate dev-server advisories in the client toolchain (Vite/esbuild, development only).

## Limits
Push notifications are browser (Web Push) alerts: each person turns them on per device, they need https or localhost, and an admin sends them from Communication → Push Notifications. A VAPID key pair is generated once and stored in the database (or set `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` and `VAPID_SUBJECT` in `.env`). Uploads cover student photos and documents, staff documents and application documents (not study materials or homework).

Every successful create/change/delete is written to `audit_logs` (who, what, when; passwords redacted) and viewable by admins under **Audit log**, together with downloads of full backups and CSV exports (those contain whole tables). The log can be filtered by area, action, dates and free text.

