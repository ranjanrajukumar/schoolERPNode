# Student processes: merge plan (SIM university demo into SchoolErp)

Source: the 110 Student pages of the SIM demo (see [student.md](student.md)). Status below was checked by searching the SchoolErp client and server code, not only by page name. Page-level fields are in student.md.

## 1. The student lifecycle in the demo

1. **Lead / Enquiry**: Quick Enquiry Form, Enquiry, Lead Management, Lead Assign, Quick Leads Analysis, Source-Sub Source, Admission Consultant.
2. **Registration**: Registration, Registration Authentication (approval), Registration Fee, Entrance Test Master, Reporting (Registered Student).
3. **Admission**: Admission, Admission No Formula, Confirm Offer Letter, Admission Under Rights (quota), Reporting (Admitted Student), Document Pendency.
4. **Academic setup per student**: Session / Session Master, Student Degree, Group Combination, Elective Subject Mapping, Student Subject Registration (with an open/close window), House Management, Assign Mentor.
5. **Daily running**: Time Table Setup, Time Slot, Day Def, Extra Classes, Attendance (daily, monthly, substitution, transfer, suspend, additional), Continuous Absent, Student Leave Apply, Student Diary, Student (PTM), Counselling.
6. **Exams**: Exam Setup/Definition, Date Sheet, Exam Attendance, Marks Entry, Marks Verification, Grace Marks, Back Paper Registration, Mark Sheet Generation with column formulas, Result Publish For Web.
7. **Exit / status changes**: Promotion, Student Freeze, Branch Change, No Dues Master and verification, Transfer Certificate, Provisional Certificate.

## 2. What SchoolErp already has (no merge needed)

Enquiries, applications, offers and admission reports; enrolled students; academic years and calendar; class subjects and timetable (with a generator); daily, monthly, period and biometric attendance, attendance corrections; student leave and leave balance; exam groups, exams, marks and results; promotion with eligibility; documents and certificates (transfer certificate templates exist); student behaviour and health records; the student/parent portal.

## 3. Real gaps worth merging (found by code search: no matches)

| Priority | Process | What to build | Fits into |
|---|---|---|---|
| High | **No Dues clearance** | Per-student clearance checklist across Fee, Library, Hostel, Transport, Inventory; each department approves; Transfer Certificate is blocked until all clear | documents + new `noDues` model |
| High | **Student Freeze / status change** | Freeze, withdraw, re-activate with reason and date; frozen students are skipped by attendance, dues and promotion | students service |
| High | **Exam Date Sheet** | Schedule exams by date, slot and room, clash check, publish to portal | exams module |
| High | **Grace Marks and back paper / re-exam registration** | Rule-based grace, supplementary registration and result merge | exams + grading.js |
| Medium | **Continuous Absent alert** | Flag students absent N days in a row; notify parent via existing push/messaging | attendance service |
| Medium | **Lead management** | Source/sub-source, assign lead to counsellor, follow-up status, conversion analysis | admissions enquiries |
| Medium | **Student Counselling and Mentor-Mentee** | Assign mentor teacher; log sessions and activities | new small module + portal view |
| Medium | **Mark Sheet column formula** | Configurable mark sheet columns and weights per exam group | report card |
| Low | **House Management** | Houses, student-to-house assignment, house points | activities module |
| Low | **Dress Distribution** | Uniform issue record per student | inventory |
| Low | **Student Performance Tracker** | Cross-term trend per student | progress module |

## 4. Not recommended for a school

PhD/MPhil progress form, Internship (internal), Project Report, Student Job Fair, TNP result update, Conference registration, NAD data export, credit-based timetable. These are university-only.

## 5. Suggested build order

1. No Dues + Student Freeze (small, unlock Transfer Certificate and clean promotion).
2. Exam Date Sheet, then Grace Marks and back paper.
3. Continuous Absent alert (cheap, high parent value).
4. Lead management, then Counselling and Mentor.
5. House, Dress, Performance Tracker.

## 6. Caveats

- Based on page structure only; form submissions and business rules (for example the grace-marks formula) were not exercised in the demo.
- Names in the demo are university terms (semester, branch, credit). Map them to SchoolErp's class, section and term.
