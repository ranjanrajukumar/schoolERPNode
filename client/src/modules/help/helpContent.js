/** Help text. Keep it in step with the README and the menu: each guide section names the sidebar group it describes. */

export const GUIDE = [
  {
    title: 'Getting started',
    roles: 'everyone',
    steps: [
      'Sign in with the email and password the administrator gave you. After too many wrong passwords the account is locked for 15 minutes.',
      'The left menu shows only what your role can use. Click a group to open its pages.',
      'Pages that change data show their forms only if your role may change that data; otherwise you see a read-only list.',
      'Anything you create, change or delete is recorded in the audit log, which administrators can read.',
    ],
  },
  {
    title: 'First-time setup (administrator)',
    roles: 'admin',
    steps: [
      'Settings → School Profile: enter the school name, address, phone and principal (they print on certificates and ID cards).',
      'Academics → Academic Year, then Classes & Sections, Subjects and Subject Map (which teacher teaches which subject in which class).',
      "Staff & HR → Departments, Designations and Staff. A teacher's login email must match their staff profile email so they can enter marks for their subjects.",
      'Fees & Finance → Fee Types and Fee Structure per class (or Fee Groups, then apply a group to a class).',
      'User Management → Users: create logins. Roles lets you create narrower roles such as a Librarian.',
      'Settings → Integrations: check whether email and SMS are live. Until they are, messages are only recorded, not delivered.',
    ],
  },
  {
    title: 'Admissions',
    roles: 'admin',
    steps: [
      'Enquiries arrive from the office or from the public form at /apply (Admissions → Admission Enquiries, source Website).',
      'Move an applicant through applied → approved. Use Entrance Tests and Interview Schedule to record those steps, and Waiting List when a class is full.',
      'Admission Offers shows approved applicants with a confirm-by date. Press Enroll to create the student and bill the class fee structure.',
    ],
  },
  {
    title: 'Students and attendance',
    roles: 'admin, teacher',
    steps: [
      'Students → Enrolled Students lists students; open a profile for photo, documents, health and behaviour records.',
      "Attendance → Mark Attendance: choose class and date, set each student's status, save. Dates in the future are refused.",
      'Parents can apply for leave from their portal; decide those under Attendance → Student Leave.',
      'Student Promotion at year end moves a class up, holds students back or graduates them.',
    ],
  },
  {
    title: 'Fees and payments',
    roles: 'admin, accountant',
    steps: [
      'Collect Fees: pick the fee, enter the amount and method. Each payment gets a numbered receipt you can print. A payment can never exceed the balance.',
      'Discounts, fines and refunds are adjustments on the fee; a fee that has payments cannot be deleted.',
      'Fee Reminders texts guardians with overdue fees (once per cooldown period).',
      'Settings → Payments controls the receipt prefix, accepted methods and whether part payments are allowed.',
    ],
  },
  {
    title: 'Examinations',
    roles: 'admin, teacher',
    steps: [
      'Create exams (optionally inside an exam group), then enter marks. Marks cannot exceed the maximum. A teacher can enter marks only for subjects assigned to them.',
      'Results, report cards and the merit list are calculated from the marks and the Grade Setup.',
      'Parents can ask for a revaluation from the portal; decide it under Examinations → Revaluation.',
    ],
  },
  {
    title: 'Staff and HR',
    roles: 'admin',
    steps: [
      'Staff attendance, leave applications and payroll live under Staff & HR. The accountant prepares payslips; only an admin approves payment.',
      'Recruitment: openings → applicants → hire (creates the staff profile). Performance reviews, once finalised, are permanent.',
      'Staff Documents stores contracts and certificates (PDF or image up to 5 MB).',
    ],
  },
  {
    title: 'Timetable',
    roles: 'admin',
    steps: [
      "Timetable page: choose a class, then set each period's subject, teacher and room. A teacher or room cannot be in two places in the same period.",
      'Substitution Management shows periods of teachers on approved leave and offers only teachers who are free.',
    ],
  },
  {
    title: 'Communication',
    roles: 'admin',
    steps: [
      'Notices appear on dashboards and the parent portal. Email and SMS can go to all parents, one class, all staff, a user group or one number.',
      'Placeholders such as {{guardian}} and {{student}} are filled per recipient. Communication History shows what was sent, recorded only, or failed.',
    ],
  },
  {
    title: 'Library, inventory, transport, hostel',
    roles: 'admin, teacher',
    steps: [
      'Library: add books (with categories), issue and return them; late fines are billed to the student automatically. Reservations hold a returned copy for the first in line.',
      'Inventory: stock changes only through stock in/out and purchase orders. Teachers raise requests; an admin approves. Asset Register tracks individually tagged items with maintenance.',
      'Transport and Hostel have their own pages for routes, vehicles, rooms, allocation, fees and reports.',
    ],
  },
  {
    title: 'Reports, import/export and backup',
    roles: 'admin',
    steps: [
      'Reports has ready-made reports; Custom Reports lets you choose a dataset, columns and filters and download the result as CSV.',
      'Settings → Data Import / Export downloads tables as CSV and imports students from a CSV (all rows are checked first; nothing is imported if any row is wrong).',
      'Settings → Backup & Restore downloads everything as one file. Uploaded photos and documents are not in it: copy the server/uploads folder too.',
    ],
  },
  {
    title: 'Parent and student portal',
    roles: 'parent, student',
    steps: [
      "Parents see their linked children's fees, attendance, results, timetable, homework and notices, and can apply for leave or request certificates.",
      'Students have a read-only view of their own record. Ask the school office if a login does not work.',
    ],
  },
];

export const FAQ = [
  {
    q: 'I forgot my password.',
    a: 'Ask an administrator to reset it from User Management → Users (staff) or Parent Accounts / Student Accounts. There is no self-service reset yet.',
  },
  {
    q: 'My account is locked after wrong passwords.',
    a: 'Wait 15 minutes and try again. Repeated failures from one address are slowed down on purpose.',
  },
  {
    q: 'A menu item or button is missing.',
    a: 'Your role does not include it. Ask an administrator to check your role under User Management → Roles.',
  },
  {
    q: 'Why does a message say "recorded only"?',
    a: 'Email or SMS delivery has not been configured, so the message was saved in the history but not sent. See Settings → Integrations.',
  },
  {
    q: 'I cannot delete a student, fee, staff member or book.',
    a: 'Records that other records depend on are protected. Mark a student or staff member inactive instead. A fee with payments, a book on loan, or a student with certificates cannot be deleted.',
  },
  {
    q: 'A teacher cannot enter marks.',
    a: 'Marks entry follows the Subject Map page: the teacher must be assigned to that subject and class, and their login email must equal their staff profile email.',
  },
  {
    q: 'Can I undo a payment?',
    a: 'Use a refund (Payment History → Refunds). Payments themselves are never deleted so the receipt numbers stay in order.',
  },
  {
    q: 'How do I give someone limited access?',
    a: 'Create a custom role under User Management → Roles (for example a teacher-based role with only Library), then pick it for the user.',
  },
  {
    q: 'How often should I back up?',
    a: 'Download a backup before any big change such as year-end promotion, and keep regular copies. Also schedule mysqldump on the database server for automatic protection.',
  },
  {
    q: 'Where do I report a problem?',
    a: 'Use Help & Support → Submit a Support Request. The administrator sees it and can reply there.',
  },
];

export const UPDATES = [
  {
    version: '0.1.0',
    date: '2026-10-24',
    title: 'Implementation tools',
    items: [
      'Setup & go-live guide: a checklist that ticks itself from your real data.',
      'Class readiness: which classes have a teacher, subjects, timetable and fees.',
      'Process map: every school process and the screen for each step, plus who does what.',
      'Class teacher on every class.',
    ],
  },
  {
    version: '0.1.0',
    date: '2026-10-24',
    title: 'Roles, settings and data tools',
    items: [
      'Custom roles, permissions overview and user groups.',
      'Settings: campuses, notification wording, payment rules, integrations check, CSV import/export, backup and restore.',
      'Help Center, User Guide, support requests and custom reports.',
      'Parent login activity, parent requests, login history and editable certificate wording.',
    ],
  },
  {
    version: '0.1.0',
    date: '2026-10-23',
    title: 'Admissions, HR, timetable and library additions',
    items: [
      'Online application form, entrance tests, interviews, offers and admission reports; waiting list.',
      'Fee groups, recruitment, performance reviews and staff documents.',
      'Rooms, room bookings, substitution management and timetable reports.',
      'Library categories, reservations, members and reports.',
      'Asset register and maintenance; health and safety records; staff messaging; events and activities menu.',
    ],
  },
];
