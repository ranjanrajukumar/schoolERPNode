# School ERP — Code Structure

Four code bases live in this repository. Each runs on its own.

| Folder | What it is | Stack |
|---|---|---|
| `client/` | Admin / teacher / parent web UI | React 18 + Vite (JSX) |
| `server/` | School REST API (one per school) | Node.js, Express, Sequelize, MySQL, JWT |
| `app/` | Mobile app for parents, students, staff | React Native (Expo), plain JS |
| `global/` | Registry: finds a person's school from their mobile/email and issues a sign-in ticket | Node.js, Express, Sequelize |

```
Mobile app ──mobile + password──▶ global (registry) ──finds school + role──▶ signed ticket
Mobile app ──ticket──▶ school server (server/) ──JWT──▶ all later API calls
Web UI (client/) ──/api/*──▶ school server (server/)
```

Run from the root: `npm run install:all`, then `npm run dev` ([dev.mjs](../dev.mjs) starts server, client and global).

---

## 1. Node services — `server/`

### Request flow

```
index.js ─▶ app.js (CORS, JSON, uploads) ─▶ routes/index.js
   ─▶ middleware (auth → role check → audit) ─▶ <module>.routes.js
   ─▶ <module>.service.js (business rules) ─▶ models/*.model.js (Sequelize) ─▶ MySQL
```

Every module follows the same three-layer pattern: **routes** (HTTP, validation, role guard) → **service** (logic) → **model** (table).

### Top-level layout

```
server/
├─ src/
│  ├─ index.js            start-up: env, DB connect, migrate, listen
│  ├─ app.js              Express app and global middleware
│  ├─ sync.js             CLI: `npm run db:migrate`
│  ├─ integrity.js        CLI: `npm run db:orphans` (foreign-key audit)
│  ├─ config/             env.js, database.js, migration.js, integrity.js
│  ├─ middleware/         authMiddleware, auditMiddleware, errorMiddleware, loginLimiter, typeahead
│  ├─ routes/index.js     mounts every module router under /api
│  ├─ utils/              asyncHandler, crud (generic CRUD factory), csv, httpError, money, photoFlags, requestContext
│  ├─ models/             131 files — one Sequelize model per table; index.js defines associations
│  └─ modules/            feature code (below)
├─ test/                  access, env, integrity, lms, smoke, ui tests
└─ scripts/               seed-demo, run-process, check-flow, check-pages
```

### Modules (`server/src/modules/`)

| Module | Files (routes / service / helpers) | Purpose |
|---|---|---|
| `platform` | auth, users, roles, userGroups, audit, dashboard, support, access.js, loginActivity.js | Login, users, roles & permissions, audit log, dashboard |
| `academics` | classes, subjects, classSubjects, students, attendance, timetable, scheduling, homework, materials, syllabus, promotion, calendar, onlineClasses, myClass, subjectMap, **lms** (+lmsFiles), studentFields, students.validation | Core academics + the LMS |
| `admissions` | admissions, enquiries, applications, applicationForm, admissionSteps/Choices/Services, public.routes, recordExtras | Enquiry → application → admission, public apply-online |
| `attendance` | attendanceExtras, autoAbsence, monthly, studentLeave | Period/monthly attendance, leave, absence alerts |
| `exams` | exams, examExtras, grading.js | Exams, marks, grade bands, revaluation |
| `finance` | fees, feeStructures, feeGroups, bookkeeping, adjustments, paymentRules | Fees, receipts, expenses, income |
| `hr` | staff, hr, payroll, recruitment, reviews, staffFields, staffFiles | Staff, payroll, hiring, reviews |
| `library` | library, libraryExtras, membership | Books, issue/return, reservations |
| `transport` | transport, tracking | Routes, stops, vehicles, live tracking |
| `hostel` | hostel | Hostels, rooms, allocation, mess, visitors |
| `inventory` | inventory, requests | Items, stock, purchase orders, assets |
| `communication` | notices, feedback | Notices and grievance ladder |
| `messaging` | messaging, providers (SMS/SMTP) | Templates and sending |
| `push` | push | Push notifications for the mobile app |
| `documents` | documents, templates, idCardDesign | Certificates, ID cards |
| `portal` | portal, parents, studentAccounts, studentLogin, hostelPortal, parentFields | Parent / student endpoints |
| `settings` | settings, setup, data, importers, masters, branches, integrations, publicSchool, autoBackup | School profile, master data, import/export, backup |
| `appmenu` | appmenu, defaults.json | Menu shown in the mobile app |
| `globalauth` | globalAuth, globalSync.routes | Talks to the `global/` registry |
| `students`, `safety`, `progress`, `reports`, `leave`, `lookup`, `photos`, `files`, `biometric`, `activities` | routes + service | Student life, clinic/incidents, holistic progress, reports, leave types, typeahead, uploads, biometric devices, activities |

---

## 2. React web UI — `client/`

```
client/
├─ index.html, vite.config.js
├─ public/sw.js                  service worker (push)
└─ src/
   ├─ main.jsx                   React entry
   ├─ App.jsx                    providers + router
   ├─ routes/index.jsx           every page route (lazy-loaded)
   ├─ layouts/                   shell: sidebar + top bar
   ├─ config/menu.js             sidebar menu definition, per role
   ├─ context/                   AuthContext, ThemeContext
   ├─ services/                  api.js (fetch wrapper, token, retry), settings.js
   ├─ hooks/                     useOpenNew, usePhotoSet, useSchoolBrand
   ├─ utils/dates.js
   ├─ components/                26 shared parts
   │    ResourcePage, TableCard, Modal, Pagination, FormSection, MasterSelect,
   │    TypeaheadSelect, Sidebar, CommandPalette, ProtectedRoute, charts,
   │    StudentPhoto/PhotoField, IdCardSheet/Popup, DocumentSlots, SchoolBrand …
   └─ modules/                   one folder per feature, mirrors the server modules
```

### Pages by module (`client/src/modules/`)

| Folder | Pages |
|---|---|
| `academics` (37) | Classes, Subjects, ClassSubjects, Students, StudentForm/Details, Attendance, Timetable (+Teacher/Room/Reports), Substitutions, Homework(+Tracker), Syllabus, StudyMaterials, Promotion, AcademicYears/Calendar, Holidays, OnlineClasses, MyClass, **LMS**: Lms, LmsCourseScreen, LmsParts, LmsEnrollment, LmsMaterials, LmsAssessmentPanel, LmsAnnouncements, LmsProgress, LmsDashboard, LmsStudentHome, lmsUi, lms.css |
| `admissions` | Enquiry, Applications, ApplyOnline, EntranceTests, Interviews, Offers, Reports |
| `attendance` | Monthly, Period, Corrections, Student leaves, Leave balances, Absence alerts, Biometric |
| `exams` | Exams, ExamGroups, MarkEntry, Results, ReportCard, ProgressCards, MeritList, GradeSetup, Revaluation |
| `finance` | Fees, FeeTypes/Groups/Structures, PaymentHistory, FeeReminders, Expenses, Income |
| `hr` | Staff(+Form/Details/Documents/Attendance), Payroll, Recruitment, Reviews, Leave, Departments, Designations |
| `library`, `transport`, `hostel`, `inventory`, `safety`, `activities`, `students` | Feature pages (list + form + reports) |
| `communication`, `documents`, `portal`, `reports`, `settings` | Notices/messages, certificates & ID cards, parent portal admin, report builder, school settings |
| `platform` | Login, Dashboard, Users, Roles, Permissions, AuditLog, ChangePassword |
| `help` | Help center, user guide, process map, setup guide, about |

Typical page = `ResourcePage` (table + search + form modal) calling `api('/…')`, so most pages are small configuration around shared components.

---

## 3. React Native app — `app/`

```
app/
├─ index.js, App.js              Expo entry + root navigator
├─ app.json, eas.json            Expo / EAS build config
├─ scripts/                      check-api, check-registry, gen-menu-defaults
└─ src/
   ├─ api.js, client.js          HTTP to school server; registry client
   ├─ auth.js                    sign-in, ticket, token storage
   ├─ config.js, navigation.js, menu.js, theme.js, ui.js, icons.js, usage.js
   ├─ components/                ActionModal, SchoolBadge
   ├─ registry/                  data-driven screen definitions
   │    index.js, defaultMenu.js, family.js, staff.js, extras.js, format.js
   └─ screens/
        LoginScreen, ChangePasswordScreen, HomeGrid, MoreScreen, homeSummary
        family/   Attendance, Fees, Leave, Notices, Results, Timetable, ChildContext
        staff/    MyClass, MarkAttendance, Marks, Exams, LmsManage, useClasses
        modules/  ModulesHome, ListScreen, DetailScreen, StatsView  (generic registry-driven screens)
```

Design: most module screens are **not hand-written** — `registry/*` describes the endpoint, columns and detail fields, and `ListScreen`/`DetailScreen` render them.

---

## 4. Registry service — `global/`

```
global/src/
├─ index.js, app.js, routes.js, middleware.js
├─ config/    database.js, keys.js (ticket signing), migrate.js
├─ models/    client (school), identity (person), role
├─ services/  auth.service (ticket issue), clients.service, provision.service
└─ utils/     asyncHandler, httpError
```
Plus `global/public/admin` (small admin page) and `global/test/*`.

---

## 5. Unused-code report

Method: scripted import-graph scan (every `import`, `require`, dynamic `import()`, including tests and scripts) over `client/src`, `server/src`, `app/src`, `global/src`.

| Check | Result |
|---|---|
| Source files never imported (client) | **None** |
| Source files never imported (app) | **None** |
| Source files never imported (global) | **None** |
| Source files never imported (server) | `src/sync.js`, `src/integrity.js` — **not dead**: they are CLI scripts run by `npm run db:migrate` / `db:orphans` |
| Exports unused by any other file | 44 constants/helpers (e.g. `DOC_KINDS`, `MAX_TAGS`, `BANNERS`, `ADMISSION_STATUSES`, `DEFAULT_BANDS`, `smtpConfigured`). All are **used inside their own file**, so they only need the `export` keyword removed — optional tidy-up |

I did not run a dead-function (inside-file) analysis or check routes that no screen calls; the scan covers files and exports.

### Clutter to delete (not code)

- `client/err.txt` (empty) and `client/out.txt` (191 bytes) — untracked leftovers.
- Root and client `*.log` files — already ignored by git, safe to delete locally.
- `.vscode/` is untracked; commit it only if you want shared editor settings.

---

## 6. Where to add things

| Task | Touch |
|---|---|
| New table | `server/src/models/x.model.js` + association in `models/index.js` |
| New API | `modules/<area>/x.routes.js` + `x.service.js`, mount in `routes/index.js` |
| New admin page | `client/src/modules/<area>/X.jsx`, route in `routes/index.jsx`, entry in `config/menu.js` |
| New mobile screen | add an entry in `app/src/registry/*.js` (or a screen under `screens/`) |
