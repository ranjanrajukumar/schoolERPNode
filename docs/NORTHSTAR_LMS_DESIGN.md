# Northstar LMS interface design

This specification carries the existing School ERP's clean, card based layout into a Northstar LMS visual language: warm off-white surfaces, deep plum text, violet actions, rounded cards and readable progress. It describes current workflows as **Existing** and labels product additions as **Suggestion**. It is a design brief, not a claim that every described screen is implemented.

The supplied local prototype (`lms-project/index.html#students`) was reviewed as a visual and interaction reference. Its left navigation, breadcrumb header, friendly overview, course cards, search-first student table, progress bars and compact action controls inform this specification. Its browser-local demo data and unrestricted role switch are prototype-only patterns; production screens must use server-authorized accounts and course-scoped data.

## Product and role boundaries

Current LMS work is split between the staff LMS workspace, student/parent portal, existing Users and Roles administration, and shared ERP pages such as Calendar and Change Password. Students and parents read LMS content in the portal; only student accounts can record completion, submit assignments and take quizzes. Parents can review their linked child's work. Teachers can manage courses for assigned subjects/classes. Administrators can manage all LMS courses and enrollments. User accounts and roles remain in the existing administration pages.

The product currently has no self service password recovery. A forgotten password is reset by the school office. There is no dedicated LMS dashboard, course catalog route, standalone lesson route, dedicated calendar/notification center, account profile editor, or LMS user administration route. The designs below show how the existing functions can be arranged as a coherent Northstar experience. A self service recovery workflow is marked **Suggestion**; other proposed page shells reuse existing capabilities.

## 1. Design system

### Color tokens

| Token | Value | Use |
|---|---|---|
| Canvas | `#F7F3F0` | Warm page background |
| Surface | `#FFFFFF` | Cards, menus, form fields |
| Surface muted | `#F2ECE8` | Secondary panels, selected navigation |
| Plum 900 | `#342238` | Main text, headings |
| Plum 700 | `#59445D` | Secondary text and quiet controls |
| Violet 700 | `#6941A5` | Primary actions, links, focus |
| Violet 100 | `#EEE6F7` | Selected state, progress track accent |
| Success | `#24785C` | Complete, published, saved |
| Warning | `#9A620B` | Due soon, late, draft attention |
| Danger | `#B33D53` | Errors, destructive actions |
| Border | `#E7DEE5` | Dividers, card edges |

Maintain WCAG AA contrast for text and controls. Pair status color with text and/or an icon; never rely on color alone. Dark mode uses a deep plum canvas, lighter text, and the same semantic status tokens with contrast checked separately.

### Typography

- Use the project's bundled DM Sans as the primary family. Keep a system sans-serif fallback.
- Page title: 28/34 px, weight 700. Section title: 19/26 px, weight 650. Body: 15/23 px. Supporting labels: 13/18 px. Button text: 14/20 px, weight 600.
- Use sentence case, short labels and explicit dates such as “Due 12 Nov 2026”. Avoid all caps as a required way to distinguish labels.
- Long lesson text uses a comfortable 65–75 character line length and 1.6 line height.

### Spacing, shape and elevation

- Base spacing unit: 4 px. Use 4, 8, 12, 16, 24, 32 and 40 px steps.
- Desktop page gutter: 32 px; tablet: 24 px; phone: 16 px. Card padding: 20–24 px desktop, 16 px mobile.
- Card radius: 16 px; input/button radius: 10 px; pill radius: 999 px. Use thin borders and a restrained shadow only for overlays.
- Keep content width near 1200 px. Avoid nested cards where a divider or section heading is enough.

### Buttons and forms

- Primary violet filled button for the main next action; one primary action per panel. Secondary outlined button for alternate actions. Tertiary text action for low frequency actions. Destructive actions use danger color and a confirmation dialog.
- Minimum interactive target: 44×44 px on touch screens. Show visible hover, pressed, disabled, loading and keyboard focus states.
- Every field has a persistent visible label, required/optional indication, help text where useful, and inline validation. Preserve entered values on errors. Use native date/file/select controls where they remain usable.
- Announce saves and errors with `role=status` / `role=alert`; focus the first invalid field after submit. Do not rely on placeholder text as a label.

### Tables, cards and status

- Data tables have a clear caption or heading, semantic column headers and row actions grouped at the end. Make the table horizontally scrollable on narrow screens, and provide a stacked list treatment for the most important roster and submission views.
- Cards use a white surface, thin border, plum title, muted secondary metadata and a clear primary action. Clickable cards must expose a single button or link, not nested interactive elements.
- Badges use short text: “Published”, “Draft”, “In progress”, “Completed”, “Late”, “Needs review”. Progress is a labeled bar plus a numeric value (for example, “3 of 8 lessons · 38%”).

### Navigation and mobile behavior

- Desktop: persistent left rail with Northstar mark, role relevant links, active violet indicator and account menu. Main page has a title, optional breadcrumbs and actions. Keep existing ERP navigation available outside LMS.
- Phone: compact top bar with page title and menu button; navigation opens as a labeled drawer. Course tabs become a horizontally scrollable tab row with keyboard support. Tables become stacked rows/cards; filters open in a sheet. Keep primary action visible without covering content.
- At 768 px and below, collapse two-column forms and dashboards to one column. At 420 px, keep buttons full width where a row would wrap awkwardly. Avoid fixed-width tables and horizontal page overflow.

### Keyboard and assistive technology

- All actions work with Tab/Shift+Tab, Enter/Space and Escape. Focus order follows reading order and focus is visible against both canvas and violet surfaces.
- Use landmarks (`header`, `nav`, `main`), one page-level `h1`, nested headings, labeled dialogs, `fieldset`/`legend` for quiz questions, and descriptive link/button names.
- On dialog open, move focus inside; keep focus within while open; Escape closes non-destructive dialogs; return focus to the opener. Confirmation dialogs default focus to the safe action.
- Progress values are exposed with `progressbar` value text; status changes are announced. Respect reduced motion. Do not convey table selection, errors or quiz correctness by color alone.

## 2. Page designs

### 1. Sign in and account recovery

**Purpose and layout.** A calm, centered sign-in card on the warm canvas, with Northstar name, school identity, short welcome line, email/password fields, show-password button, and “Sign in”. Keep school context visible if the shared mobile app has already selected a school. The desktop card is about 420 px wide; mobile uses the full viewport with 16 px gutters.

**Actions and states.** Sign in, reveal/hide password, and show field-level errors plus a form-level “Email or password is incorrect.” Loading changes the button label to “Signing in…” and disables duplicate submits. Network errors retain entered email and offer Retry. No account creation is shown; school administrators provision users. Existing temporary-password behavior directs the user to choose a new password after sign-in.

**Recovery.** Existing behavior is an instruction: “Forgot your password? Contact the school office to request a reset.” The page may link to school contact details already configured by the school. **Suggestion:** add a self-service recovery screen only after a verified email/phone delivery and token-expiry workflow exists. Do not present an email-entry recovery form until that backend exists.

**Roles, responsive and keyboard.** Same sign-in form for all roles; post-login navigation is role based. On mobile, stack fields and use a full-width submit. Inputs have persistent labels; Enter submits; password visibility is a named toggle; errors are announced and associated with fields.

### 2. Role-based home dashboards

**Purpose and layout.** A role-specific landing view with a greeting, one prominent “Continue learning” / “Open course workspace” action, compact status cards, and a short prioritized list. Desktop uses a 12-column grid; mobile stacks cards and places the next action first.

- **Student:** “Good morning, Maya”; course card “Fractions and decimals · 3/8 lessons · 38%”; next due item “Equivalent fractions · Due 12 Nov”; recent teacher feedback. Show only the signed-in student's courses, scores and deadlines.
- **Teacher:** course workload such as “Grade 5 Mathematics · 24 students”, “4 submissions to review”, and course progress. Link to LMS workspace and filtered review list. Existing teacher authorization limits managed courses to assigned subjects/classes.
- **Administrator:** course count, courses in draft, enrollment totals, and progress requiring attention. Link to course management, enrollment roster and existing Users/Roles. Do not expose student details in summary cards.

**Actions and states.** Open course, review work, view progress, manage courses (staff) or manage user access (admin). Loading uses short skeleton cards; no-course state explains the next permitted action; errors give Retry without replacing the rest of the ERP home. Student with no enrollment sees “Your courses will appear here when the school enrolls you.”

**Role and accessibility.** The same shell changes its cards and primary links by role; permissions are enforced by the server. Use labeled progress bars and headings, not unlabeled decorative charts. Mobile shows two summary cards per row only when each remains readable; otherwise one per row.

### 3. Course catalog and course details

**Purpose and layout.** Student “My courses” is the existing active enrollment list, not an open catalog. Present a search field, optional subject filter, and course cards with class/subject, teacher (if available), published status, lesson progress, pending work count and “Open course”. Course details uses a left course outline and right overview on desktop; one stacked column on mobile.

**Realistic example.** “Fractions and decimals” · Grade 5A · Mathematics · 3/8 lessons complete · 1 assignment due 12 Nov · “Continue”. Details show description, modules/lessons, announcements, assignments and quizzes in labeled sections.

**Actions and states.** Open, continue, see due work and view announcement. Empty state distinguishes no enrolled/published courses from a temporary loading failure. Loading shows course-card placeholders; errors have Retry. If an enrollment is inactive or course unpublished, it is omitted from the student's list. **Suggestion:** add catalog search and subject filters if course volume makes them useful; current student API returns the signed-in student's published enrollments without those filters.

**Role variation.** Student sees enrolled, published courses and personal progress/results. Parent sees only linked child's course work in read-only mode. Teacher/admin open the staff course workspace rather than the student catalog; teachers see only courses they can manage, admins see all.

**Responsive and keyboard.** Cards are one column on phones. Course outline becomes a collapsible “Course contents” section. Cards are links with descriptive names; tabs/sections can be traversed without a pointer.

### 4. Course builder: modules, lessons and materials

**Purpose and layout.** Existing staff LMS workspace supports course creation, module/lesson ordering, publish state, lesson notes, video/resource links and protected file attachments. Use a clear three-stage flow: course details → content outline → publish/review. Desktop has course list (narrow column) and selected course builder (wide column). Mobile uses a course picker followed by a single-column builder.

**Components and example.** Course header “Fractions and decimals · Grade 5A · Mathematics · Draft”, “Manage enrollment”, “Preview as student”, and Publish action. Outline groups “1. Fractions” with “Equivalent fractions” and “Compare fractions”; each lesson row shows draft/published state and material chips. Lesson editor has title, module, order, notes, video URL, resource URL, file picker (PDF, common Office, text/image/video formats within current 25 MB limit), and publish checkbox.

**Actions and states.** Create/edit course; create/edit/delete module and lesson; upload/replace resource; publish/unpublish; delete with confirmation. Empty outline suggests “Add a module” and “Add a lesson”. Loading preserves the selected course and shows placeholders. Upload/save errors remain next to the relevant control and retain field state. Successful publish confirms who can now view the course.

**Role variation and accessibility.** Teacher creates/edits assigned courses; admin can manage all. Students/parents do not see editing controls and do not use this page. Use heading levels for modules, buttons with explicit labels (“Move lesson…” only if reorder controls exist), and file input labels that announce file name and size. **Suggestion:** “Preview as student” is a design convenience only; do not expose it until implemented.

### 5. Student roster, profiles, enrollment and individual progress

**Purpose and layout.** Follow the reference prototype's Students page: page heading and concise “Manage enrollment and keep an eye on each learner's progress” description, primary action, then a searchable roster table. Show student identity, enrolled courses, average progress bar, submitted assessment count, joined date (where available) and a labeled row action. Selecting a student opens an enrollment/progress detail panel. Include course scope/filter before listing records so teacher access never becomes a school-wide student directory.

**Example.** “Grade 5A Mathematics · 24 active students”; Maya Patel · `STU-052` · Enrolled · 3/8 lessons · 1 of 2 assignments graded. Use student ID/admission number only where the school's existing role rules allow it.

**Actions and states.** Search by name/admission number, enroll/unenroll active students in a selected course, open progress, and export filtered report (report page). The product already supports student records in ERP administration; **Suggestion:** surface “Add student” here only for admins and route it to the existing student registration flow, without duplicating profile creation inside LMS. Empty roster explains there are no active students in the selected course. Loading uses roster rows; save error leaves selections intact and explains that no change was saved.

**Role variation.** Teacher sees only students enrolled in courses they manage. Admin can use the school student directory and manage all course enrollments; profile creation/editing remains in the existing student administration workflow. Student/parent cannot open the roster and can only see self/linked child progress. Do not show unrelated profile particulars such as address, national ID or health information in this LMS panel.

**Responsive and keyboard.** Desktop table columns: student, enrolled, lesson progress, assignment status, quiz status. Phone uses cards and a visible enrollment switch. Search, filter and switches have labels; selected state is announced; use a semantic table on desktop and preserve equivalent reading order on mobile.

### 6. Lesson view and completion tracking

**Purpose and layout.** A focused reading surface within course details. Desktop: course breadcrumb and module outline on the left; lesson title, content, resource list and completion action in the main column. Mobile: course contents collapses above the lesson, with Previous/Next only when a sequence is known. Use a thin progress header such as “Lesson 3 of 8”.

**Example.** “Equivalent fractions”; learning notes; video link; downloadable `fraction-models.pdf`; status “Read 2 times · last opened 10 Nov”; “Mark complete”. Keep video and external resource labels explicit.

**Actions and states.** Mark as read, mark complete, open/download resources, return to course. A read/completion failure leaves content visible and offers Retry. Missing attachment has a recoverable message; unavailable or unpublished content follows the existing not-found behavior. Empty state: “This lesson has no published materials yet.”

**Role variation.** Student records reads/completion for self. Parent can view linked child's published lessons and progress, read-only. Teacher/admin preview the lesson in the course builder; their preview does not count as student progress. No autoplay or forced completion is added.

**Accessibility.** Content headings form a hierarchy; files include type and size; completion status is text and icon. Focus remains stable after marking complete and an announcement confirms the saved state.

### 7. Assignments: create, submit, review and grade

**Purpose and layout.** One assignment detail presentation with role-specific controls. Student/parent view shows title, instructions, due date, late state, text/link/file submission, and returned score/feedback. Teacher builder list shows due date, submitted/graded counts and Review. Review view puts student work beside score/feedback fields; mobile stacks work before grading fields.

**Examples.** “Explain equivalent fractions” · Due 12 Nov 2026 · 20 points; student status “Submitted 13 Nov · Late”; teacher feedback “Good use of the number line.”

**Actions and states.** Teacher creates/edits, publishes/unpublishes and deletes an assignment; opens submissions; downloads protected student files; records score and feedback. Student writes text, provides an HTTP(S) work link or uploads an allowed PDF/image (5 MB max); may update until graded. Parent reviews but cannot submit. Show “Not submitted”, “Submitted”, “Late”, “Awaiting grade” and “Returned” explicitly.

**States.** No assignments: “Your teacher has not posted an assignment yet.” No submissions: roster with “Not submitted”. Upload/save failure preserves text/link and selected filename if possible. Grading errors stay in the row; successful grading announces the returned score. Due dates use the configured school timezone in display; current backend date handling is date-based and timezone policy should be verified before release.

**Role and keyboard.** Server remains the permission source. Use table headers on desktop; on mobile each submission becomes a labeled card. Score input has min/max and feedback label; submission download button includes the student's name and file name.

### 8. Quizzes and tests: instructions, question flow, results and review

**Purpose and layout.** Existing quiz types are single choice, multiple choice, true/false and written response; objective items auto-grade, written items require teacher review. Student flow: instructions and due/attempts → one scrollable question sequence → review answers → submit confirmation → score/review. Teacher flow: quiz editor and attempt review.

**Example.** “Fractions check · 10 points · 2 attempts · Due 15 Nov”; Q1 “Is 2/4 equivalent to 1/2?” · True/False · 2 points. Show attempt number, objective score and “Written response awaiting teacher review”.

**Actions and states.** Teacher configures questions, answer choices, points, due date, attempts and published state; reviews/scorers written responses with feedback. Student answers all questions and submits; may see latest attempt, best score, correct objective answers and reviewed written response. Attempt limit and expired due date are shown before starting. Empty quiz and no-attempt states explain what happens next.

**Role variation.** Students see their attempt and results only; parents see linked child results; teachers/admins see attempts and can review. Never expose answer keys before attempt submission. No timer, randomization or proctoring is specified or implied.

**Accessibility and mobile.** Each item is a `fieldset` with `legend`; radio/checkbox groups use native controls. A visible question index links to each question; keyboard users can move through the whole sequence. On mobile avoid one-question-per-screen unless a future product decision supports save/resume; current submission is a single submit flow.

### 9. Calendar, announcements and notifications

**Purpose and layout.** Reuse the existing school Calendar, course announcements and browser push subscriptions. The current product does not have a persistent LMS notification inbox; LMS notices are push events delivered to opted-in devices. Desktop calendar month/list split; mobile defaults to agenda list. LMS announcement cards are grouped by course and date. **Suggestion:** add an in-app notification inbox with unread state and history only after notification persistence is implemented.

**Example.** “New assignment · Fractions and decimals · Equivalent fractions · Due 12 Nov”; “Teacher feedback · Fractions check · Score 9/10”. Existing push notices are sent for published material/assessments and grade/feedback to enrolled students and linked parents who opted into push.

**Actions and states.** Open the relevant course/assignment, move month or agenda date, and enable/disable browser push for this device. An LMS calendar filter is a proposed presentation over available course dates. Empty calendar says “No upcoming LMS dates.” Loading shows agenda placeholders. Push delivery failure does not block the underlying assignment or grade save. If an inbox is later added, its load errors and retry state must be explicit.

**Role variation.** Student sees own enrolled course deadlines and notices. Parent sees linked children's events and notices. Teacher sees managed course schedules and announcements. Admin sees all courses. No email/SMS delivery is implied; those integrations are configured separately.

**Accessibility.** Calendar has a synchronized agenda/list alternative, keyboardable date controls, full date names and text labels for event type. Notification updates announce concise summaries without moving focus.

### 10. Reports and exports

**Purpose and layout.** Existing LMS Student Progress page has course selector, student search, status filter, progress table and filtered CSV export. **Suggestion:** add report landing cards composed from the existing gradebook/progress data, not as new data. Desktop uses a filter bar above a wide table; mobile uses one student summary card at a time with a “View assessments” disclosure.

**Example.** “Fractions and decimals · Grade 5A”; filters “Search Maya” and “In progress”; columns lessons read, reads, completed, completion, status, assignment grades, quiz best scores.

**Actions and states.** Select course, filter by student/status, export current filtered rows to CSV. Loading preserves filters; empty course prompts course creation (staff) or enrollment (student); no filter matches gives “No students match these filters.” Export errors are announced and do not reset the current table.

**Role variation.** Teacher sees reports only for managed courses; admin sees all. Student/parent sees their own course progress, not a downloadable roster report. Export contains only the currently authorized course rows; avoid personal data outside LMS scope.

**Accessibility/mobile.** Table has caption and headers, sticky first column only when it does not obscure content. Export button names the report and course. Mobile cards preserve the same values and expose a per-card assessment detail panel.

### 11. Administrator user and role management

**Purpose and layout.** This remains in the existing Users and Roles administration area. A Northstar skin can align it to LMS without creating duplicate accounts. Desktop has user table with search/role/status filters and a separate role-permission editor; mobile uses user cards and a full-screen role editor.

**Example.** `Maya Patel · student · Active`; `A. Singh · teacher · Mathematics, Grade 5A`; custom role “Librarian” based on teacher with narrowed module permissions. Show that permissions are enforced server-side and custom roles cannot exceed their base role.

**Actions and states.** Admin creates/edits users, assigns built-in/custom roles, manages course enrollments in the LMS course roster, resets passwords through existing user management, and disables access when appropriate. Role screens show allowed modules/access levels, not hidden raw permission JSON. Confirm disabling/deleting and explain effects.

**States and role.** Only admin sees management. No users: “Add the first staff or student login.” Loading table skeleton; validation errors remain by field; server errors show a retry/actionable message. Teacher/student/parent must receive a forbidden state if they navigate directly.

**Accessibility/mobile.** Permission matrix is a semantic table or grouped checkboxes, not color-only toggles. Each permission has a readable name and level. Use a sticky save/cancel footer on phone; confirm unsaved changes before leaving.

### 12. Account settings and profile

**Purpose and layout.** Existing signed-in users can change their password; student/parent profile data is read through the portal, and staff profile management belongs to admin pages. Design a settings overview with “Security” and “Profile” sections, but only show editable fields supported by current APIs.

**Existing actions.** Change password with current password and new password confirmation; temporary credentials require a password change before other protected routes. Show signed-in name and role. Students/parents can view their own/linked-child school profile according to existing portal access; teachers/admins use their existing ERP profile management.

**Suggestion.** Self-service avatar, contact editing, notification preferences and account recovery are not part of the current LMS implementation unless backed by existing product APIs. Mark as “Suggestion” in future product planning and do not render inactive controls.

**States and accessibility.** Success confirms “Password updated”; current-password mismatch and minimum length errors are shown inline; loading disables duplicate saves; expired session returns to sign-in with a clear message. Labels are persistent, password visibility controls are keyboardable and named, and mobile forms use a single column.

## 3. Shared sample data and microcopy

Use realistic but fictitious records consistently across mockups: **Northstar Learning**, **Maya Patel**, Grade 5A, **Fractions and decimals**, teacher **Anika Singh**, lesson **Equivalent fractions**, assignment **Explain equivalent fractions**, quiz **Fractions check**. Sample dates should be relative to the design review date or clearly labeled as examples. Avoid using actual student records in design previews.

Prefer “Mark complete”, “Submit assignment”, “Save grade”, “Publish course”, “Awaiting teacher review”, “No courses yet”, and “Try again”. Confirmation copy names the affected object and consequence. Avoid vague “Done” or error text that only says “Something went wrong.”

## 4. Acceptance checklist for implementation

- Role navigation and every detail endpoint match server permissions; students see only their own course work and parents only linked children.
- Every page has loading, empty, success and error states; failed writes preserve entered data.
- File routes remain authenticated, attachments retain `no-store` and `nosniff`, and the UI never constructs public storage URLs.
- At 320, 375, 768 and 1280 px widths, content has no page-level horizontal scroll; tables have an equivalent mobile card/list presentation.
- Keyboard-only review covers navigation, dialogs, forms, filters, quiz controls, progress and file actions; screen reader labels and status announcements are checked.
- State colors have text labels and accessible contrast; focus ring, reduced motion, zoom and high contrast are reviewed.
- Any added self-service recovery, preview mode, course catalog search or profile editing is treated as a **Suggestion** until backend workflows and authorization are implemented.
