/**
 * The school's processes mapped to the screens that carry them out. Keep it in step with the menu: every `to` is a real page.
 * who: admin | teacher | accountant | parent | office (the admin or whoever the school lets handle that task)
 */
export const FLOWS = [
  {
    id: 'class-setup',
    title: 'Setting up a class',
    blurb:
      'Do this once per class and section, before the first student is admitted. Class Readiness shows what is still missing.',
    steps: [
      { who: 'admin', title: 'Create the class', note: 'Name and section, e.g. 5-A', to: '/classes' },
      { who: 'admin', title: 'Name a class teacher', note: 'The one person parents go to', to: '/classes' },
      {
        who: 'admin',
        title: 'Assign subjects and teachers',
        note: 'Decides who may enter marks',
        to: '/class-subjects',
      },
      {
        who: 'admin',
        title: 'Build the timetable',
        note: 'Teacher and room clashes are blocked',
        to: '/timetable',
      },
      {
        who: 'accountant',
        title: 'Set the fee structure',
        note: 'Billed to every admission',
        to: '/fee-structures',
      },
      { who: 'admin', title: 'Check Class Readiness', note: 'Green means ready', to: '/class-map' },
    ],
  },
  {
    id: 'admission',
    title: 'Admission to enrolment',
    blurb: "From a family's first enquiry to a student in a class with fees billed.",
    steps: [
      {
        who: 'office',
        title: 'Enquiry',
        note: 'Entered at the office, or by the family on the public /apply form',
        to: '/admissions?new=1',
      },
      { who: 'office', title: 'Entrance test', note: 'Date and marks', to: '/entrance-tests' },
      { who: 'office', title: 'Interview', note: 'Date, panel and result', to: '/interview-schedule' },
      {
        who: 'admin',
        title: 'Approve and make an offer',
        note: 'Waiting list if the class is full; confirm-by date',
        to: '/admission-offers',
      },
      {
        who: 'admin',
        title: 'Enrol',
        note: 'Creates the student, numbers them, bills the class fees',
        to: '/admissions',
      },
      {
        who: 'office',
        title: 'Complete the record',
        note: 'Photo, documents, health, transport, hostel',
        to: '/students',
      },
      {
        who: 'office',
        title: 'Parent login',
        note: "Filled from the student's parent details",
        to: '/parents?new=1',
      },
    ],
  },
  {
    id: 'daily',
    title: 'A school day',
    blurb: 'What happens every day once the term is running.',
    steps: [
      {
        who: 'teacher',
        title: 'Mark attendance',
        note: 'Daily register, or period by period',
        to: '/attendance',
      },
      { who: 'teacher', title: 'Period attendance', note: 'Optional, per subject', to: '/period-attendance' },
      {
        who: 'office',
        title: 'Alert guardians of absences',
        note: "SMS to the guardian's phone",
        to: '/absence-alerts',
      },
      {
        who: 'office',
        title: 'Cover for absent teachers',
        note: 'Only free teachers are offered',
        to: '/substitutions',
      },
      { who: 'teacher', title: 'Set homework', note: 'Parents see it in the portal', to: '/homework' },
      { who: 'teacher', title: 'Record behaviour', note: 'Merits and concerns with points', to: '/behavior' },
      {
        who: 'parent',
        title: 'Apply for leave',
        note: 'From the portal; the office decides',
        to: '/student-leaves',
      },
    ],
  },
  {
    id: 'exams',
    title: 'Examination cycle',
    blurb: "From scheduling an exam to report cards in parents' hands.",
    steps: [
      {
        who: 'admin',
        title: 'Create the exam',
        note: 'Optionally inside an exam group with a weight',
        to: '/exams',
      },
      { who: 'teacher', title: 'Enter marks', note: 'Only for subjects they teach', to: '/exams' },
      {
        who: 'admin',
        title: 'Check results and ranks',
        note: 'Grades come from the grading scale',
        to: '/merit-list',
      },
      { who: 'admin', title: 'Print report cards', note: 'With attendance', to: '/exams' },
      {
        who: 'parent',
        title: 'Query a mark',
        note: 'Revaluation request from the portal',
        to: '/revaluation',
      },
      {
        who: 'admin',
        title: 'Decide revaluations',
        note: 'An accepted one updates the mark',
        to: '/revaluation',
      },
    ],
  },
  {
    id: 'fees',
    title: 'Fee cycle',
    blurb: 'From defining fees to knowing who still owes.',
    steps: [
      {
        who: 'accountant',
        title: 'Fee types and structure',
        note: 'Per class; fee groups for bundles',
        to: '/fee-structures',
      },
      { who: 'accountant', title: 'Bill a class or a student', note: 'Never billed twice', to: '/fees' },
      {
        who: 'accountant',
        title: 'Collect and issue a receipt',
        note: 'Part payments if allowed in Settings',
        to: '/fees',
      },
      {
        who: 'accountant',
        title: 'Send reminders',
        note: 'Overdue guardians, once per cooldown',
        to: '/fee-reminders',
      },
      {
        who: 'accountant',
        title: 'Review defaulters and collections',
        note: 'Reports and the dashboard chart',
        to: '/reports',
      },
      {
        who: 'admin',
        title: 'Refunds and discounts',
        note: 'Recorded, never deleted',
        to: '/payment-history',
      },
    ],
  },
  {
    id: 'staff',
    title: 'Staff cycle',
    blurb: 'From hiring to pay day.',
    steps: [
      { who: 'admin', title: 'Recruit', note: 'Openings, applicants, offer', to: '/recruitment' },
      { who: 'admin', title: 'Hire', note: 'Creates the staff profile', to: '/staff' },
      { who: 'admin', title: 'File documents', note: 'Contracts and certificates', to: '/staff-documents' },
      {
        who: 'admin',
        title: 'Staff attendance and leave',
        note: 'Approved leave feeds substitutions',
        to: '/staff-attendance',
      },
      { who: 'accountant', title: 'Prepare payslips', note: 'Salary and deductions', to: '/payroll' },
      { who: 'admin', title: 'Approve payment', note: 'Only an admin can', to: '/payroll' },
      {
        who: 'admin',
        title: 'Performance review',
        note: 'Final reviews are permanent',
        to: '/performance-reviews',
      },
    ],
  },
  {
    id: 'year-end',
    title: 'Year end and new year',
    blurb: 'Closing one academic year and opening the next.',
    steps: [
      { who: 'admin', title: 'Finish exams and results', note: 'Last report cards', to: '/merit-list' },
      { who: 'admin', title: 'Promote classes', note: 'Move up, hold back or graduate', to: '/promotion' },
      { who: 'admin', title: 'Open the new academic year', note: 'Make it current', to: '/academic-years' },
      {
        who: 'accountant',
        title: 'Fee structure for the new year',
        note: 'Then bill the classes',
        to: '/fee-structures',
      },
      {
        who: 'office',
        title: 'Leaving certificates and alumni',
        note: 'Transfer certificate marks the student inactive',
        to: '/documents',
      },
      { who: 'admin', title: 'Take a backup', note: 'Before and after promotion', to: '/backup-restore' },
    ],
  },
];

/** Everything that hangs off a class, and where to manage it. */
export const CLASS_LINKS = [
  { icon: '🎓', title: 'Students', note: 'Registered into the class; roll numbers', to: '/students' },
  { icon: '📚', title: 'Subjects and teachers', note: 'The curriculum for the class', to: '/class-subjects' },
  { icon: '🗓️', title: 'Timetable', note: 'Periods, teachers and rooms', to: '/timetable' },
  { icon: '💰', title: 'Fee structure', note: 'What each student is billed', to: '/fee-structures' },
  { icon: '✅', title: 'Attendance', note: 'Daily and per period', to: '/attendance' },
  { icon: '🧪', title: 'Exams and results', note: 'Marks, ranks, report cards', to: '/exams' },
  { icon: '📝', title: 'Homework and materials', note: 'Shown to parents and students', to: '/homework' },
  { icon: '🎉', title: 'Activities and trips', note: 'Whole school or one class', to: '/activities' },
  { icon: '📢', title: 'Notices and messages', note: "Send to one class's parents", to: '/send-message' },
  { icon: '🚌', title: 'Transport (per student)', note: 'Route, stop, fee', to: '/transport-assignments' },
  { icon: '🛏️', title: 'Hostel (per student)', note: 'Room, bed, fee', to: '/hostel-allocation' },
  { icon: '📖', title: 'Library (per student)', note: 'Card and loans', to: '/library-members' },
];

/** Who does what. do = does it, see = can view, blank = no access. */
export const ROLES = ['Admin / office', 'Teacher', 'Accountant', 'Parent', 'Student'];
export const RESPONSIBILITIES = [
  ['Set up school, classes, subjects, timetable', ['do', 'see', 'see', '', '']],
  ['Admissions and enrolment', ['do', '', '', '', '']],
  ['Register students and staff', ['do', 'see', 'see', '', '']],
  ['Mark attendance', ['do', 'do', '', 'see', 'see']],
  ['Apply for student leave', ['do', '', '', 'do', '']],
  ['Enter marks', ['do', 'do', '', '', '']],
  ['View results and report cards', ['do', 'see', '', 'see', 'see']],
  ['Set fees and bill', ['do', '', 'do', '', '']],
  ['Collect fees and issue receipts', ['do', '', 'do', 'see', 'see']],
  ['Prepare payroll', ['', '', 'do', '', '']],
  ['Approve payroll payment', ['do', '', '', '', '']],
  ['Library, inventory requests', ['do', 'do', '', '', '']],
  ['Send notices, email and SMS', ['do', '', '', 'see', 'see']],
  ['Users, roles, backups, audit log', ['do', '', '', '', '']],
];
