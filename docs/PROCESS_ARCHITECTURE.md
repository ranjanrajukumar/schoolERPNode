# School ERP: process architecture and delivery review

Written for the school owner and the implementation team. For every process step by step, with states, rules and endpoints, see [PROCESS_GUIDE.md](PROCESS_GUIDE.md). It describes how the school's work flows through the system, who owns each step, what is built and checked, and what is left. It reads the system from four seats: process architect, manager, designer, developer.

---

## 1. Process architect: how the school's work flows

The class is the hub. Almost every process either puts a student in a class or reads what the class holds.

```
ADMISSION                          STUDENT LIFE                      MONEY
Enquiry ─► Application ─► Review ─► Offer ─► Enrol ─► Student ─► Class ─► Fees billed ─► Payment ─► Receipt
  │ follow-up   │ draft,      │ test,   │ class     │ details,      │ attendance,     │ discount, fine,   │ reports
  │ plan        │ documents   │ inter-  │ required  │ documents,    │ exams, marks,   │ late fines,       │
  ▼             ▼             │ view    ▼           ▼ photo         ▼ report card     ▼ reminders         ▼
Soft delete   Consent         ▼       Approve    Carried over     Promotion ─► Leaving certificate ─► Alumni
```

### The five chains and what is handed over at each step

| Chain | Steps | Data handed on | Owner |
|---|---|---|---|
| **Admissions** | Enquiry → Application (4-step form, documents, consent) → Under review → Assessment → Offer → Enrol | One admissions record the whole way. On enrol: every detail, the uploaded documents (as student documents) and the photo go to the student. The family's choices (electives, activities, bus route, fee group) become records, and fees for the class are billed in the same step. A hostel bed is left as a task for the hostel desk. | Admissions officer |
| **Academics** | Academic year → Classes and sections → Subject map (core or elective, theory or practical, periods, teacher) → Student electives → Timetable | Class teacher, room, subject map per class. Electives are chosen per student, in the application or later. Timetable completion is measured against the periods the subject map asks for. | Academic coordinator |
| **Daily teaching** | Attendance → Marks entry → Results and ranks → Report card → Promotion | Attendance with arrival time and a note; marks per subject checked against the class's subjects; results feed report cards and merit lists. | Teachers, exam cell |
| **Finance** | Fee structure → Billing (per student, no double billing) → Payment → Receipt → Discount, fine, late fine → Reminders → Reports | Paid amount always equals the payments recorded; balance and status follow. | Accountant |
| **People** | Staff registration with documents → Attendance and leave → Payroll → Reviews | Required documents checked per role. Staff with payslips cannot be deleted. | HR |

Supporting processes: library, transport, hostel, inventory, health and safety, events, messaging, parent and student portals, certificates and ID cards.

### Controls built into the flow

- **Required documents** are a master list per process (application, student, staff). An application cannot be submitted without its required ones.
- **Soft delete** on enquiries: deleted records can be restored; only an already-deleted one can be removed for good.
- **Corrections are logged:** changing a saved attendance mark records old value, new value, reason and who.
- **No orphan hand-offs:** deleting a student returns an enrolled applicant to "offer"; students with certificate requests and staff with payslips cannot be deleted.
- **Access:** admin, teacher, accountant, parent and student roles, plus custom roles that are a built-in role narrowed to chosen modules. Every request is re-checked in the database.
- **Audit:** sensitive downloads and changes are recorded.

---

## 2. Manager: where the programme stands

### Delivered and checked

- **Screens:** every mockup supplied (School Profile, Enquiries, New enquiry, Application form, Registrations, Admissions, Students, Academics, Attendance, Dashboard) is built. Fees, Master data, Staff and all simple list pages follow the same layout.
- **Process:** the full admission-to-student chain runs end to end and is covered by a test.
- **Quality gates:** 46 integration tests against the running API, 10 browser journeys (`npm run test:ui`), a 12-step process run (`npm run run:process`), plus `npm run check:flow`, which walks the whole process and reports where two modules disagree.
- **Implementation kit:** setup and go-live guide, class readiness, process map, bulk import by spreadsheet, backup and restore, demo data (`npm run seed:demo`).

### Open items, by priority

| # | Item | Why it matters | Effort |
|---|---|---|---|
| 1 | **Seven orphaned database rows** (6 certificate requests, 1 payslip pointing at deleted people). Run `npm run db:orphans -- --delete` from `server`. | The relationship check cannot pass and the database will not enforce those links until they are gone. | 5 minutes, needs your go-ahead |
| 2 | ~~Pages still in the older layout~~ **Done:** every list and workflow page follows the page pattern (tiles, tabs, search, popups). The only files outside it are forms, popups, detail views, certificates, the sign-in page and the help pages, which are not list pages. | | |
| 3 | ~~Uploaded student and staff files on disk~~ **Done:** student and staff files are stored in the database like photos, so the backup carries them. Existing files are copied in automatically at start-up; the old upload folder can be archived once you have checked a backup. | | |
| 4 | **Browser tests cover ten journeys** (`npm run test:ui`): sign in, enquiry, application with documents and siblings, enrolment from the list, attendance, marks and report card, ID cards, fee payment, subject map, staff. Other screens are still checked by hand (`npm run check:pages` opens all 177 menu pages and reports crashes). | A layout regression outside those journeys can slip through. | Add journeys as screens change |

### Rollout order (from the implementation guide)

Foundation (profile, year, classes) → academic structure (subjects, timetable) → finance (fee structure) → people (staff, parents) → rehearse with one class → go live class by class.

---

## 3. Designer: the design system as it stands

- **One language:** flat blue primary, white rounded cards, soft status pills, small uppercase labels, DM Sans, light, dark and automatic themes.
- **One page pattern** (Enquiries, Applications, Registrations, Students, Staff, Fees, Master data, Academics):
  header with title and primary action → summary tiles → tabs with counts → search and filters → table with row actions → paging. Entry forms open in popups.
- **One form pattern:** sectioned cards with an icon, title and one line of help, in a two-column grid (`FormSection`). Used by the enquiry, application, student, staff and parent forms.
- **Shared parts:** `TableCard` (search and paging for any table), `PhotoField`, `DocumentSlots` (required-document checklist), `Modal` (asks before discarding edits), type-ahead search, command palette (Ctrl+K), ID card designer with live preview.
- **Known design debt:** the long registration forms have no placeholders (only the enquiry form does); the sidebar and top bar are the app's own rather than the mockups'; status colours differ slightly between older pages and new ones.

---

## 4. Developer: architecture and how to work on it

```
client/  React 18 + Vite, react-router, no UI library. Design tokens as CSS variables.
server/  Node + Express (ESM) + Sequelize on MySQL.
         src/modules/<area>/<thing>.routes.js   thin routes, validation shared with imports
         src/modules/<area>/<thing>.service.js  the rules; one transaction per business step
         src/models/                            one file per table, associations in models/index.js
         src/config/migration.js                ADDED_COLUMNS list: new columns on existing databases
         test/access.test.mjs                   the regression suite (roles, rules, flows)
         scripts/seed-demo.mjs, check-flow.mjs  demo data and the process check
```

Conventions that keep it safe to change:

- **Rules live in services, not screens.** The same validation serves forms, spreadsheet import and the API.
- **New column = model field + one line in `ADDED_COLUMNS`.** New table = model + register in `models/index.js`; `sync()` creates it.
- **Money is handled in cents.** Dates are plain `YYYY-MM-DD` strings for day values.
- **Large bodies are sent raw** (photos, documents) and checked by their bytes, never by the name or the client's claim.
- **Tests use unique suffixes and clean up after themselves**; run `npm test --prefix server` with the server up. If every test fails at once, the dev server was restarting: wait and run again.
- **Run:** `npm run server` and `npm run client` (client on 5173, API on 4000). Sample data: `npm run seed:demo --prefix server`. Process check: `npm run check:flow --prefix server`.

### Technical risks to watch

- Single server and single database: no failover. A scheduled backup now writes a file to `server/backups` (daily, newest 14 kept; see `BACKUP_*` in `.env.example`), but it is on the same disk: copy that folder off the server too.
- Email, SMS and push delivery depend on the integrations being configured in Settings; confirm they are before relying on reminders.
- The suite shares one database, so tests that count rows across the whole school can be disturbed by data created at the same time; they are written to compare only their own records.

---

## 5. Suggested next 30 days

1. **Week 1:** clear the orphaned rows; decide where uploaded files are backed up; run the process check weekly. Copy `server/backups` off the server.
2. **Weeks 2 to 3:** convert the remaining exam pages and the other modules to the page pattern; add placeholders to the long forms.
3. **Week 3:** extend the browser tests (done for seven journeys) to enrolment, ID cards and the report card.
4. **Week 4:** pilot with one real class using the implementation guide, then fix what the pilot shows before opening more classes.
