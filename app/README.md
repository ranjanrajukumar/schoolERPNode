# School ERP mobile app

A React Native (Expo) app that uses the same API as the web app. It sits next to `client/` (web) and `server/` (API).

**One app for every school.** With `EXPO_PUBLIC_GLOBAL_URL` set to the [global registry](../global/README.md), a **student, teacher or parent** signs in with a **mobile number (or email) and password**; students can also use the admission number. The registry works out which school and role the login belongs to, the app connects to that school's own server and signs in with a short-lived ticket, and the home screen, menu and data all come from that school. If one number is a login at more than one school or role, the app asks which account. The phone remembers the school; **Profile, Switch account** signs out so someone else can sign in. Cached menus and "Frequently Used" counts are kept per school. Without the registry address the app serves a single school, as before.

The home page of both apps is an icon menu: a navy bar with the person's greeting (search the menu, notices, sign out), **Frequently Used** (the four tiles this person opens most, learned on the phone), a summary card for today, and every area as a four-column icon grid. Staff see one grid of modules. Parents and students see titled sections (Academic, Exam, Fees, Library, Administration, Other services), each with its icons, under a swipeable pair of cards: attendance as a ring, and payment due. The bottom bar holds the main tabs and Profile (change password, sign out); for a parent or student it is Home, Time Table, Ask Query (feedback and grievances) and Profile.

| Who signs in | What they get |
|---|---|
| **Parent or student** | Tabs: Home, Time Table, Ask Query, Profile. The Home sections hold **Academic** (timetable, calendar, homework, courses and lessons with completion tracking, course assignments and quizzes, learning materials, live classes, attendance, student leave, leave balance), **Exam** (results with report cards, revaluation requests), **Fees**, **Library**, **Administration** (certificate requests, feedback and grievances, messages) and **Other services** (transport, notices, activities with consent, change password). A parent with several children switches between them at the top of each screen. |
| **Teacher** | Tabs: Home, My class, Attendance, Profile. The Home grid has a tile for each area a teacher may open: students, academics, attendance and leave, examinations (enter regular or theory/practical marks), transport, hostel, library (books, cards, loans and reservations), inventory requests, activities, communication. Admins can create, edit and delete exams in the app. |
| **LMS** | Staff can author courses, lessons, digital documents and video files, announcements, due dated assignments and quizzes; grade submissions and see student lesson reads and course completion in the gradebook. Students can mark lessons read or complete, see course announcements and deadlines, open lesson resources, submit assignment documents and view scores in the app. Active students in the course's class are enrolled automatically. |
| **Inventory** | Teachers can submit and withdraw item requests. Admins can maintain items and suppliers, record stock movements, create and receive purchase orders, and track assets and maintenance. |
| **Admin** | Everything a teacher has, plus admissions (enquiries, applications, offers, **enrol**), fees and finance (**take a payment**), staff and HR (leave decisions, **payroll approval**), certificates (issue or reject), health and safety, notices and messaging, parent accounts, users and login history. |
| **Accountant** | Home with tiles for fees and finance, payroll and the staff directory. |

**The menu is stored in the database.** Every home tile and every page inside a module has a row in `app_menu_items`: its label, icon (an Ionicons name, or an uploaded picture kept in the database so backups carry it), order, the roles that may see it, and whether it is shown. The app reads it from `GET /api/app-menu` when it opens, keeps the last copy on the phone, and uses the built-in menu if the server has none. An admin edits it on the website under **Settings, Mobile App Menu**: rename, change icon, upload a picture, reorder, limit to roles, hide, or reset to defaults. What a page *does* (its API path, how a row reads, its actions) stays in the app, so a tile can be changed or hidden but not invented from the website.

Modules are defined in `src/registry/staff.js` and `src/registry/family.js`: each page names its API path, how a row reads, and the actions on a record. One set of generic screens (list with search and filters, record detail with Call buttons and actions, summary tiles) draws all of them, so adding a page is a few lines.

Actions in the app: enrol an applicant, take a fee payment, approve or reject student and staff leave, approve or reject item requests and revaluations, issue or reject certificates, check a visitor out, mark a book returned, approve a payslip, publish a notice, message parents by SMS or email, request a certificate, send feedback, give or decline consent for an activity.

Not in the app (use the website): creating or editing records such as classes, staff, fee structure, rooms and routes; the timetable grid; theory plus practical marks; bulk import and export; backup and restore; ID card and certificate printing; settings.

Everyone with a temporary password (new student and teacher logins) must choose their own first, exactly as on the web. A student can sign in with the admission number.

## Run it

1. Start the API: `npm run server` from the project root (it listens on all network interfaces, port 4000).
2. In `app/`: `npm install`, then `npm start`.
3. Tell the app where the API is. **A phone cannot reach `localhost`.**
   - Real phone on the same Wi-Fi: use this computer's address, for example `http://192.168.1.20:4000/api`. Find it with `ipconfig` (IPv4 address). Windows Firewall may ask to allow Node on private networks: allow it.
   - Android emulator: `http://10.0.2.2:4000/api` (the default).
   - Set it in `app/.env` (copy `.env.example`) as `EXPO_PUBLIC_API_URL`, or type it under **Server address** on the sign-in screen; the app remembers it.
4. Open **Expo Go** on the phone and scan the QR code from `npm start`, or press `a` for an Android emulator.

Try it with the demo data (`npm run seed:demo --prefix server`) or create a student account under Students, Student Accounts on the web.

## Check it

`npm run gen:menu` regenerates `server/src/modules/appmenu/defaults.json`, the default menu the server seeds the database with, from the registry; run it (and restart the API) after adding or renaming a page. `npm run gen:menu -- --check` fails when the file is out of date.

`npm run check:registry` (API running) also checks that the menu in the database matches the app's pages, and runs every module page against the live API and reports a path that errors, a row with an empty title or a tile with no value.

`npm run check:api` (API running) makes the same calls the app makes as a student and as a teacher and checks every field the screens read. It creates its own class, student and exam and removes them afterwards. Run it after changing the API.

## Layout

```
app/
  App.js                    providers and navigation
  src/api.js                one fetch wrapper: token and server address kept in the phone's secure store, 401 signs out
  src/auth.js               sign in, sign out, change password, who is signed in
  src/navigation.js         tabs per audience; temporary password and "use the web" states
  src/ui.js, src/theme.js   small shared components and the same blue as the web app
  src/screens/family/       parent and student screens
  src/screens/staff/        teacher and admin screens
  scripts/check-api.mjs     the API contract check
```

## Build an installable app

Install `eas-cli`, run `eas build` and follow the prompts (an Expo account is needed). Before a real release, point `EXPO_PUBLIC_API_URL` at the school's https address: browsers and phones should not send passwords over plain http outside the school network.

## Summary and process
Expo app for parents, students and teachers (and admins and accountants) that serves many schools with one install.
1. **Sign in:** mobile number, email or admission number plus password go to the global registry, which returns the school, role, the school's API address and a one-time two-minute ticket (the app asks which account if there is more than one match).
2. **Connect:** the app sends the ticket to that school's `POST /api/auth/sso` and receives the school's session token. A temporary password must be changed first.
3. **Home:** the menu comes from `GET /api/app-menu` (edited on the web under Settings, Mobile App Menu), cached on the phone; tiles depend on role.
4. **Work:** pages defined in `src/registry/` call the school's API with the token: attendance, marks, leave, fees, certificates, LMS and so on.
5. **Switch or sign out:** Profile, Switch account clears the session so another person can sign in.

The school processes behind each tile are in [../docs/PROCESS_GUIDE.md](../docs/PROCESS_GUIDE.md); the app's own summary is [../docs/MOBILE_APP_SUMMARY.md](../docs/MOBILE_APP_SUMMARY.md).
