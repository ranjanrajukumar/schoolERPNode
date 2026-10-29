# Learning Management (LMS): process guide

Written for the implementation team, school admins and teachers. It describes the LMS from first setup to year end: who does what, on which screen, which endpoint carries it, the states each record moves through, the rules the server enforces and what is left out. It extends section 6 of [PROCESS_GUIDE.md](PROCESS_GUIDE.md); [NORTHSTAR_LMS_DESIGN.md](NORTHSTAR_LMS_DESIGN.md) is the visual design brief and does not describe what is built.

Conventions: roles are **A** admin, **T** teacher, **S** student, **P** parent. Staff endpoints are under `/api/lms` (mounted with `writeRoles('admin','teacher')`); student and parent endpoints are under `/api/portal/children/:studentId/lms`. Rules live in `server/src/modules/academics/lms.service.js`.

---

## 1. The map

Learning Management sidebar: **Courses & Lessons** (courses, modules, lessons, files), **Enrollment**, **Announcements**, **Assignments**, **Quizzes & Tests**, **Student Progress**. The four middle screens each start with a course picker; Courses & Lessons also still shows the same sections for its selected course.

```
Class + Subject map ─► COURSE ─► Enrol students ─► MODULES ─► LESSONS ─► Attachments
   (Academics)            │            │                                    │
                          │            │                    PUBLISH course + content ─► push notice
                          │            │                                    │
                          │            └──────────────────────────────────► STUDENT PORTAL
                          │                                    read ─ complete ─ assignment ─ quiz
                          ├─► Announcements                                  │
                          ├─► Assignments ◄── submit text / link / file ◄────┤
                          │        └─► review ─► score + feedback ─► push notice
                          ├─► Quizzes ◄── attempt (objective auto-scored) ◄──┘
                          │        └─► written answers: review ─► final score ─► push notice
                          └─► Gradebook / Student Progress ─► CSV export
```

| # | Process | Owner | Screen |
|---|---|---|---|
| 1 | Prerequisites | A | Academics → Subject map |
| 2 | Create a course and enrol students | A, T | Courses & Lessons (create); Enrollment (roster) |
| 3 | Build content: modules, lessons, files | A, T | same |
| 4 | Publish | A, T | same |
| 5 | Announce | A, T | Learning Management → Announcements |
| 6 | Learn: read and complete | S (P views) | Portal → Courses & Lessons |
| 7 | Assignments | A, T create and grade; S submits | Learning Management → Assignments; Portal |
| 8 | Quizzes and tests | A, T create and review; S attempts | Learning Management → Quizzes & Tests; Portal |
| 9 | Track progress and report | A, T | Learning Management → Student Progress |
| 10 | Notifications | system | browser push |
| 11 | Files and storage | A (ops) | server |
| 12 | Year end and clean-up | A | Promotion, course delete |

---

## 2. Roles and access

| Role | Can do | Cannot do |
|---|---|---|
| **A** admin | Every course: create, edit, delete, enrol, grade, report | |
| **T** teacher | Courses for classes where they are class teacher, or for class-subject pairs assigned to them in the subject map | Courses of other teachers; courses at all if the login is not linked to a staff profile (list is empty) |
| **S** student | Own enrolled, published courses: read, mark complete, submit, take quizzes, see scores and feedback | Any staff screen; seeing drafts; seeing other students |
| **P** parent | Linked child's courses, results and notices, read-only | Recording progress, submitting work, taking quizzes |

Enforcement: `mayManage()` checks every staff call (admin always; teacher only through class teacher or subject map, matched by the staff profile linked to the login email). Student calls resolve through `ownChild`, then `isEnrolled()`: the student must be `active`, in the course's class, and have an active enrolment. A failed check answers 404 so other students' records are not revealed. Students' portal is otherwise read-only; the only student writes allowed are lesson view and complete, assignment submit and file upload, and quiz attempts. Accounts and roles stay in Users and Roles; the LMS adds no login of its own.

---

## 3. Prerequisites

Before the first course:

1. School profile and current academic year exist.
2. Classes exist, with a class teacher where wanted.
3. Subjects exist, and each is mapped to the class in the **Subject map** with a teacher.
4. Students are enrolled in the class with status `active`.
5. Teacher logins use the same email as their staff profile.
6. Parents and students have portal accounts, and opt in to browser push if they want notices.
7. `LMS_STORAGE_DIR` (default `uploads/lms`) points to persistent storage.

---

## 4. Create a course and enrol students

**Owner:** A or the assigned T. **Screens:** Courses & Lessons → Create a course; Enrollment for the roster.

| Step | Rule |
|---|---|
| Choose class, subject and title | All three required. The subject must be mapped to the class. Title up to 160 characters, description up to 1000 |
| Duplicate check | The same title cannot exist twice for one class and subject (409) |
| Authorisation | A teacher can create only where they teach |
| Tags | The create form asks for at least 1 tag (up to 10, each up to 30 characters, typed and confirmed with Enter, with suggestions). A leading `#` is dropped and repeats are ignored in any case. The server itself keeps tags optional so older courses and API calls still work |
| Banner image | Optional PNG, JPG or WebP up to 200 KB (800×400 recommended), sent with the course and shown on course cards. Anything else is refused (400) |
| Certificate | A switch, off by default: when on, a student who completes every published lesson can view and print a completion certificate (see section 8) |
| On create | The course starts as a **draft**. Every active student of the class is enrolled automatically, in one transaction |
| Edit roster | The **Enrollment** screen (choose the course first; also reachable from Courses & Lessons → Manage enrollment) lists active students of the class with a switch each. Saving replaces the roster. Every student must be active and in the course's class (400 otherwise) |
| Unenrol | Sets the enrolment inactive; history is kept, and re-enrolling reactivates it |

Students who join the class later are not enrolled automatically: open the roster and switch them on.

Course fields beyond the title: `tags` (list), `bannerImage` (data URL) and `certificateEnabled` (true or false), sent on create and edit.

**Endpoints:** `GET/POST /lms/courses`, `PUT/DELETE /lms/courses/:id`, `GET/PUT /lms/courses/:id/enrollments`.

---

## 5. Build content

Content hangs off the course in this order: **module → lesson → attachment**. Everything is created unpublished unless the publish box is ticked.

### 5.1 Modules

Title (required, up to 160), optional description, order 1 to 10000, published flag. A module cannot be deleted while it holds lessons: move or delete them first (409). Lessons may also sit outside any module.

### 5.2 Lessons

| Field | Rule |
|---|---|
| Title | Required, up to 160 |
| Module | Optional; must belong to this course |
| Notes | Up to 12000 characters |
| Video and resource links | Must be valid `http` or `https` URLs |
| Order | Whole number, minimum 1. Students see lessons by module order, then lesson order |
| Published | Visible to students only when the lesson, its module (if any) and the course are all published |

### 5.3 Attachments

One protected file per lesson, up to 25 MB. Allowed: PDF, JPEG/PNG/WebP, Word, Excel, PowerPoint (old and new), TXT, CSV, Markdown, MP4, M4V, MOV, WebM. The type is checked from the file's bytes, not its name; anything else is refused. The file is stored outside the database under an opaque key; replacing it removes the old file. Download is always through an authenticated route, never a public URL.

### 5.4 Topic parts (section → topic → parts)

The course reads as **Section** (module) → **Topic** (lesson) → **Parts**. On a lesson row choose **Topic parts** and add the topic one part at a time, in the order students should meet them:

| Part type | Holds |
|---|---|
| Text | Written explanation (up to 12000 characters) |
| Video link | An `http(s)` link to a video |
| Web link | An `http(s)` link to a page |
| File | One protected upload (same types and 25 MB limit as 5.3), with an optional short note |

Each part has a title, an order number and its own publish switch. A part is visible to students only when it, its lesson, the lesson's section and the course are all published. Create a file part first, then upload its file (the form does both when you choose a file). Deleting a lesson or course removes its parts and files.

### 5.5 Content Library (documents, files and links)

For reference material that is not part of one topic, use Learning Management → **Content Library**: choose the course, then **Add learning material**.

| Type | Holds |
|---|---|
| Document or file | One protected upload (same types and 25 MB limit as 5.3). Add the file in the same form |
| Web link | An `http(s)` page |
| Video link | An `http(s)` video |

Each material has a title, an optional description and a publish switch. Students see published materials in the course's **Course materials** list and in **Recent materials** on their dashboard; files download through the portal, links open in a new tab. Unpublish or delete hides it at once. Deleting a course removes its materials and files.

**Endpoints:** `…/courses/:id/materials` (and `/:materialId`, `/:materialId/file`); student file `…/lms/materials/:materialId/file`.

**Endpoints:** `…/modules`, `…/lessons`, `POST/GET …/lessons/:lessonId/file`, `…/lessons/:lessonId/parts` (and `/:partId`, `/:partId/file`); student file `…/lms/parts/:partId/file`.

---

## 6. Publish

States of each record: **Draft** → **Published** → back to Draft at any time. A student sees an item only when the course and the item are both published.

| Order | Action |
|---|---|
| 1 | Finish modules, lessons and files while the course is a draft |
| 2 | Check the roster |
| 3 | Publish the course: enrolled students and linked parents with push enabled get "LMS course published" |
| 4 | Publish further items at any time. Each first publish sends one notice (module, lesson, resource, assignment, quiz, announcement) |

Notices are sent only when the item and the course are both published. Unpublishing hides the item immediately; progress and submissions already recorded are kept.

---

## 7. Announce

Learning Management → **Announcements** (choose the course first): title and message (up to 12000). Published announcements appear at the top of the student's course and send a push notice with the first 240 characters. Delete removes it.

---

## 8. Learn: read and complete (student)

| Step | What happens |
|---|---|
| Open | Portal → Courses & Lessons lists the student's published, enrolled courses with a status: **Not started**, **In progress**, **Completed**, plus completed/total lessons and a percentage |
| Follow the course | Lessons are grouped under their section heading in order. Inside a topic, work down its numbered parts: read the text, watch the video, open the link, download or play the file |
| Read | Opening a lesson records a view (count and last viewed time) |
| Resources | Links open in a new tab; the attachment downloads through the portal |
| Mark complete | Records the completion time. Completing without a prior view also counts as viewed |
| Progress | Completed lessons ÷ published lessons the student can see |
| Outline | Each course has an outline on the left: sections with their lessons and a green **Done** mark on each completed lesson, then an **Assessments** group listing assignments (marks, due date) and quizzes (question count, best score). Clicking an entry scrolls to it. On a narrow screen the outline sits above the content |
| Certificate | If the course has the certificate switch on, the course shows how many lessons remain. Once every published lesson is complete, **View certificate** opens a certificate with the student's name, course, subject, class, completion date and the school name from Settings, with **Print or save as PDF**. It is built live and not stored, so switching the course switch off hides it. Assignments and quizzes do not affect it |

Parents see the same course list for their child and cannot read-track or complete: those calls are blocked in the portal.

---

## 9. Assignments

### 9.1 Teacher

Title (required), instructions, **due date** (valid `YYYY-MM-DD`, optional), **maximum score** (1 to 10000, default 100), published flag. Lowering the maximum below an existing score is refused (409). Deleting an assignment removes its submissions and their files.

### 9.2 Student

| State | Meaning |
|---|---|
| Not submitted | No work yet. Shown as **overdue** when the due date has passed |
| Submitted | Text, an `http(s)` link, or a file (PDF, JPEG, PNG or WebP, up to the portal upload limit), or a mix. Can be resubmitted until graded |
| Late | Submitted after the due date; flagged, but still accepted |
| Graded | Score and feedback returned. **Locked**: no more changes (409) |

At least one of response, link or file is required.

### 9.3 Review and grade

On Learning Management → **Assignments** (choose the course first), staff open Review to see the submissions list for every enrolled student (including those not yet submitted), read the answer or download the file, enter a score from 0 to the maximum and feedback (up to 1000), and save. Grading sends "LMS assignment graded" with score and feedback to the student and linked parents. A score can be changed by saving again.

**Endpoints:** `…/assignments`, `…/assignments/:id/submissions`, `PUT …/submissions/:studentId`; student `…/assignments/:id/submit`, `…/file`.

---

## 10. Quizzes and tests

### 10.1 Teacher

Title, description, **attempts allowed** (1 to 10, default 3), optional due date, published flag, and 1 to 50 questions of four types:

| Type | Setup | Scoring |
|---|---|---|
| Single choice | 2 to 6 choices, one correct | Automatic |
| Multiple choice | 2 to 6 choices, one or more correct | Automatic, all-or-nothing |
| True / false | Correct answer true or false | Automatic |
| Written response | Optional expected answer (teacher reference only) | Manual review |

Each question has points from 0.01 to 1000 (two decimals). Once any attempt exists, questions can no longer be changed (409); title, due date and publish state still can.

### 10.2 Student

Answer **every** question and submit once per attempt; incomplete submissions are refused. A due date in the past blocks new attempts, as does reaching the attempt limit (409). Answer keys are never sent before submission; after submission the student sees the latest attempt with per-question result, the best score, and teacher feedback.

### 10.3 Result states

| Review status | Meaning |
|---|---|
| `reviewed` | Only objective questions: score final at once |
| `pending_review` | Has written answers: score so far is the objective part only |

### 10.4 Review written answers

On Learning Management → **Quizzes & Tests**, staff choose Review attempts, read each written answer, give 0 to the question's points, add overall feedback (up to 1000), and save. The total is recalculated, status becomes `reviewed`, and "LMS quiz reviewed" goes to the student and linked parents.

**Endpoints:** `…/quizzes`, `…/quizzes/:quizId/attempts`, `PUT …/attempts/:attemptId/review`; student `…/quizzes/:quizId/attempts`.

---

## 11. Track progress and report

**Screen:** Learning Management → Student Progress. Choose a course; the gradebook lists every active enrolled student with: lessons viewed, total views, lessons completed of total, status (Not started, In progress, Completed), each assignment's score or "submitted", and each quiz's attempts and best score. Filter by student name and status; **Export CSV** writes the filtered rows. Teachers see only their own courses.

Use it weekly to find: students who have not started, assignments with ungraded submissions, quizzes with `pending_review` attempts.

---

## 12. Notifications

Web push to the student's and linked parents' devices that opted in. Events: course published, new module, lesson, resource, assignment, quiz, announcement; assignment graded; quiz reviewed. Push failure never blocks the save. There is no in-app inbox, email or SMS for LMS.

---

## 13. Files and storage

- Lesson and submission files live under `LMS_STORAGE_DIR`; the database holds only an opaque key and metadata (name, type, size). Older records may still hold data in the database; both are read.
- Files are served only through authenticated routes with `no-store` and `nosniff`.
- Deleting a lesson, assignment or course removes its files after the records are removed.
- JSON backups include the referenced LMS files. Put the folder on persistent disk and in the off-site backup. With several API instances, share one secured volume. There is no S3 adapter yet.

---

## 14. Year end and clean-up

1. Export the Student Progress CSV for each course you need to keep.
2. After promotion, students sit in a new class and fall out of the old course (the class check fails), so they lose access automatically.
3. Create the new year's courses; delete the old ones if no longer needed. Deleting a course removes its modules, lessons, assignments, submissions, quizzes, attempts, announcements, enrolments and files. It cannot be undone.

---

## 15. Controls that apply everywhere

- Server is the authority: menu hiding is cosmetic.
- Students and parents get 404 for anything outside their enrolment.
- Graded work is locked; quizzes with attempts keep their questions.
- Links must be `http(s)`; files are validated by content and size.
- Titles, text and scores are length and range checked.
- All course data is deleted with the course.

---

## 16. Daily routine

| Who | When | Do |
|---|---|---|
| Teacher | Before term | Create courses, build modules and lessons, check roster, publish |
| Teacher | Weekly | Post announcement; open Student Progress; grade new submissions; review written quiz answers |
| Admin | Term start and new joiners | Confirm every active student is enrolled |
| Admin | Monthly | Check storage free space and the LMS folder backup |

---

## 17. Verification

`npm run test:lms --prefix server` (needs a migrated running API and a seeded admin) runs the LMS workflow: course, roster, modules, lessons, files, assignments, quizzes, grading and student visibility, then cleans up. `server/test/lms.test.mjs` is the suite; `server/test/env.test.mjs` covers the storage setting.

---

## 18. Not included yet

- Badges, discussion boards, blog and event management, and per-quiz duration and pass percentage (planned, not built).
- Self-service password recovery.
- In-app notification inbox, email or SMS for LMS events.
- Timed quizzes, question randomisation, proctoring.
- Several files per lesson; S3-compatible storage.
- Automatic enrolment of students who join a class after the course was created.
- Mobile (staff, Learning Management → Learning courses): courses, modules, lessons, topic parts (add, upload, order, publish) and files, enrollment, announcements, assignments with grading, quizzes with attempt review and written-answer scoring, publish toggles and the gradebook. The progress CSV export is web only.
