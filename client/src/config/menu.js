const ALL = ['admin', 'teacher', 'accountant'];
const ADMIN = ['admin'];
const FINANCE = ['admin', 'accountant'];
const TEACHING = ['admin', 'teacher'];

const slug = (text) => text.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

/**
 * A submenu entry is either a label (planned, not built yet) or [label, route, roles?]
 * pointing at an existing page. Roles only hide links; the API enforces access.
 */
const ICONS = {
  'my-children': '👪', 'my-school': '🏫', dashboard: '🏠', admissions: '📝', students: '🎓', academics: '📚', attendance: '✅', examinations: '🧪',
  'fees-and-finance': '💰', 'staff-and-hr': '👥', timetable: '🗓️', communication: '💬', 'parent-portal': '👨‍👩‍👧', transport: '🚌', library: '📖',
  inventory: '📦', hostel: '🛏️', 'health-and-safety': '🩺', 'events-and-activities': '🎉', 'documents-and-certificates': '📄', reports: '📊',
  'user-management': '🔐', settings: '⚙️', 'help-and-support': '🛟',
};

const module = (label, roles, entries) => ({
  label,
  slug: slug(label),
  icon: ICONS[slug(label)] ?? '•',
  roles,
  items: entries.map((entry) => {
    const [itemLabel, to, itemRoles] = Array.isArray(entry) ? entry : [entry];
    return {
      label: itemLabel,
      to: to ?? `/planned/${slug(label)}/${slug(itemLabel)}`,
      built: Boolean(to),
      roles: itemRoles ?? roles,
    };
  }),
});

// What a student (or a parent, for a child) can open. Each entry is a section of the portal page, chosen by ?tab=.
const portalMenu = (who) => {
  const parent = who === 'parent';
  return [
    ['Dashboard', '/portal'],
    [parent ? 'Child Profile' : 'My Profile', '/portal?tab=Profile'],
    ['Attendance', '/portal?tab=Attendance'],
    ['Class Timetable', '/portal?tab=Timetable'],
    ['Homework & Assignments', '/portal?tab=Homework'],
    ['Online Classes', '/portal?tab=OnlineClasses'],
    ['Learning Materials', '/portal?tab=Materials'],
    ['Courses & Lessons', '/portal?tab=LMS'],
    ['Exams & Results', '/portal?tab=Results'],
    ['Fees & Payments', '/portal?tab=Fees'],
    ['Library', '/portal?tab=Library'],
    ...(parent ? [['Activities', '/portal?tab=Activities']] : []),
    ['Notices & Announcements', '/portal?tab=Notices'],
    ['Messages', '/portal?tab=Messages'],
    ['Events & Calendar', '/portal?tab=Calendar'],
    ['Transport Tracking', '/portal?tab=Transport'],
    ['Feedback & Grievance', '/portal?tab=Feedback'],
    [parent ? 'Apply for Leave' : 'Leave Requests', '/portal?tab=Leave'],
    ['Certificates & Documents', '/portal?tab=Documents'],
    ['Help & Support', '/portal?tab=Help'],
    ['Settings & Change Password', '/change-password'],
  ];
};

export const MENU = [
  // every part of the portal is its own menu entry; a parent also applies for leave and asks for certificates, a student's portal is read-only
  module('My Children', ['parent'], portalMenu('parent')),
  module('My School', ['student'], portalMenu('student')),
  module('Dashboard', ALL, [
    ['Overview', '/'], ['My Class', '/my-class', TEACHING], ['Today’s Attendance', '/attendance', TEACHING], ['Fee Summary', '/reports', FINANCE], ['Upcoming Events', '/calendar'], ['Notices', '/notices'],
  ]),
  module('Admissions', ADMIN, [
    ['Admission Enquiries', '/admissions'], ['Admission', '/applications'], ['Entrance Tests', '/entrance-tests'],
    ['Interview Schedule', '/interview-schedule'], ['Admission Offers', '/admission-offers'], ['Waiting List', '/admissions?status=waitlisted'],
    ['Admission Reports', '/admission-reports'],
  ]),
  module('Students', ALL, [
    ['Registrations', '/registrations', ADMIN], ['Enrolled Students', '/students'], ['Student Accounts', '/student-accounts', ADMIN],
    ['Student Attendance', '/reports', ALL], ['Student Health Records', '/student-health', TEACHING], ['Student Behavior', '/behavior', TEACHING],
    ['Year-end Promotion', '/promotion', ADMIN], ['Transfer / Leaving Certificate', '/documents?type=transfer', ADMIN], ['Alumni', '/alumni', TEACHING],
  ]),
  module('Academics', ALL, [
    ['Academics Overview', '/academics'], ['Academic Years', '/academic-years', ADMIN], ['Classes & Sections', '/classes'], ['Subjects', '/subjects'],
    ['Class Map', '/class-profile'], ['Subject Map', '/class-subjects'], ['Class Timetable', '/timetable'],
    ['Teacher Timetable', '/teacher-timetable'], ['Syllabus & Lesson Plans', '/syllabus'], ['Homework & Assignments', '/homework'], ['Online Classes', '/online-classes', TEACHING],
    ['Study Materials', '/study-materials'], ['Academic Calendar', '/calendar'], ['List of Holidays', '/holidays'],
  ]),
  module('Learning Management', TEACHING, [
    ['Dashboard', '/lms-dashboard'], ['Courses & Lessons', '/lms'], ['Content Library', '/lms-materials'], ['Enrollment', '/lms-enrollment'], ['Announcements', '/lms-announcements'],
    ['Assignments', '/lms-assignments'], ['Quizzes & Tests', '/lms-quizzes'], ['Student Progress', '/lms-progress'],
  ]),
  module('Timetable', ALL, [
    ['Class Timetable', '/timetable'], ['Teacher Timetable', '/teacher-timetable'],
    ['Room / Resource Schedule', '/room-schedule', ADMIN], ['Substitution Management', '/substitutions', ADMIN], ['Timetable Reports', '/timetable-reports', ADMIN],
  ]),
  module('Attendance', TEACHING, [
    ['Mark Attendance', '/attendance'], ['Monthly Attendance', '/monthly-attendance'], ['Biometric Attendance', '/biometric-attendance'], ['Period Attendance', '/period-attendance'], ['Student Leave', '/student-leaves'], ['Student Leave Record', '/student-leave-balance'],
    ['Attendance Corrections', '/attendance-corrections'], ['Parent Absence Alerts', '/absence-alerts'], ['Attendance Reports', '/reports', ALL],
  ]),
  module('Examinations', ALL, [
    ['Exam Groups', '/exam-groups'], ['Subject Map', '/class-subjects'], ['Grade Setup', '/grade-setup'], ['Exams, Marks & Results', '/exams'],
    ['Holistic Progress Card', '/progress-cards', TEACHING], ['Merit List', '/merit-list'], ['Revaluation Requests', '/revaluation', TEACHING],
  ]),
  module('Fees & Finance', FINANCE, [
    ['Fee Types', '/fee-types'], ['Fee Groups', '/fee-groups'], ['Fee Structure', '/fee-structures'], ['Fees & Payments', '/fees'],
    ['Payment History & Receipts', '/payment-history'], ['Fee Reminders', '/fee-reminders'], ['Other Income', '/income'], ['Expenses', '/expenses'],
    ['Financial Reports', '/reports'],
  ]),
  module('Transport', ALL, [
    ['Vehicles', '/vehicles'], ['Drivers & Attendants', '/transport-staff'], ['Routes', '/transport-routes'], ['Stops', '/transport-stops'],
    ['Student Route Assignment', '/transport-assignments'], ['Transport Fees', '/transport-fees', FINANCE], ['Transport Attendance', '/transport-attendance', TEACHING], ['Bus Tracking (Live GPS)', '/bus-tracking'],
    ['Vehicle Maintenance', '/transport-maintenance'], ['Transport Reports', '/transport-reports'],
  ]),
  module('Hostel', ALL, [
    ['Hostels', '/hostels', ADMIN], ['Hostel Rooms', '/hostel-rooms', ADMIN], ['Room Allocation', '/hostel-allocation', ADMIN],
    ['Hostel Attendance', '/hostel-attendance', TEACHING], ['Mess Management', '/hostel-mess', TEACHING], ['Hostel Fees', '/hostel-fees', FINANCE],
    ['Visitor Log', '/hostel-visitors', TEACHING], ['Hostel Reports', '/hostel-reports', ADMIN],
  ]),
  module('Library', ALL, [
    ['Book Categories', '/library-categories'], ['Books & Loans', '/library'], ['Book Reservations', '/library-reservations'], ['Library Members', '/library-members'],
    ['Library Reports', '/library-reports'],
  ]),
  // Teachers can ask for items; everything else in Inventory belongs to the admin.
  module('Inventory', TEACHING, [
    ['Item Categories', '/inventory-categories', ADMIN], ['Inventory Items', '/inventory-items', ADMIN], ['Suppliers', '/suppliers', ADMIN],
    ['Purchase Orders', '/purchase-orders', ADMIN], ['Stock In', '/stock-in', ADMIN], ['Stock Out', '/stock-out', ADMIN], ['Inventory Requests', '/inventory-requests'],
    ['Asset Register', '/assets', ADMIN], ['Asset Maintenance', '/asset-maintenance', ADMIN], ['Stock Reports', '/stock-reports', ADMIN],
  ]),
  module('Staff & HR', ALL, [
    ['Departments', '/departments'], ['Designations', '/designations'], ['Staff Directory', '/staff'], ['Staff Documents', '/staff-documents', ADMIN],
    ['Staff Attendance', '/staff-attendance', ADMIN], ['Monthly Staff Attendance', '/monthly-staff-attendance', ADMIN], ['Staff Leave', '/leave-applications', TEACHING], ['Staff Leave Balance', '/staff-leave-balance', ADMIN], ['Payroll', '/payroll', FINANCE],
    ['Recruitment', '/recruitment', ADMIN], ['Performance Reviews', '/performance-reviews', ADMIN], ['HR Reports', '/hr-reports', ADMIN],
  ]),
  module('Health & Safety', ADMIN, [
    ['Student Health Records', '/student-health'], ['Clinic Visits', '/clinic-visits'], ['Incidents', '/incidents'],
    ['Safety Inspections', '/safety-inspections'], ['Health & Safety Report', '/health-reports'],
  ]),
  module('Events & Activities', ALL, [
    ['School Events', '/activities?kind=event'], ['Celebrations', '/activities?kind=celebration'], ['Competitions', '/activities?kind=competition'],
    ['Clubs', '/activities?kind=club'], ['Sports', '/activities?kind=sport'], ['Field Trips', '/activities?kind=field_trip'],
    ['School Activities', '/activities', TEACHING], ['Activity Reports', '/activity-reports', TEACHING],
  ]),
  module('Documents & Certificates', ADMIN, [
    ['Document Templates', '/document-templates'], ['ID Cards', '/id-cards'], ['Requests & Issued Register', '/documents'],
    ['Bonafide Certificates', '/documents?type=bonafide'], ['Transfer Certificates', '/documents?type=transfer'],
    ['Character Certificates', '/documents?type=character'], ['Fee Certificates', '/documents?type=fee'],
  ]),
  module('Communication', ALL, [
    ['Notices', '/notices'], ['Feedback & Grievance', '/feedback', ALL], ['Send Email', '/send-message?channel=email', ADMIN], ['Send SMS', '/send-message?channel=sms', ADMIN],
    ['Push Notifications', '/push-notifications'], ['Parent Messages', '/send-message', ADMIN], ['Staff Messages', '/send-message?audience=staff&channel=email', ADMIN], ['Message Templates', '/message-templates', ADMIN],
    ['Communication History', '/message-history', ADMIN],
  ]),
  module('Parent Portal', ADMIN, [
    ['Parent Accounts', '/parents'], ['Parent Login Activity', '/parent-login-activity'], ['Parent Requests', '/parent-requests'],
  ]),
  module('Reports', ALL, [
    ['Reports Overview', '/reports'], ['Academic & Exam Reports', '/exams'],
    ['Transport Reports', '/transport-reports'], ['Library Reports', '/library-reports'], ['Stock Reports', '/stock-reports', ADMIN], ['Custom Reports', '/custom-reports', ADMIN],
  ]),
  module('User Management', ADMIN, [
    ['Users', '/users'], ['Roles', '/roles'], ['Permissions', '/permissions'], ['User Groups', '/user-groups'], ['Login History', '/login-history'], ['Audit Log', '/audit'],
  ]),
  module('Settings', ADMIN, [
    ['School Profile', '/school-profile'], ['Leave Types & Approval', '/leave-types'], ['Public Links', '/public-links'], ['Branches / Campuses', '/branches'], ['Academic Years', '/academic-years'], ['Classes & Sections', '/classes'],
    ['Master Data', '/master-data'], ['Grade Setup', '/grade-setup'], ['ID Card Design', '/id-card-design'],
    ['Notification Settings', '/settings?group=Notifications'], ['Student Login Settings', '/settings?group=Student login'], ['Payment Settings', '/settings?group=Payments'], ['Integrations', '/integrations'],
    ['Data Import / Export', '/data-tools'], ['Backup & Restore', '/backup-restore'], ['Mobile App Menu', '/app-menu'], ['System Preferences', '/settings'],
  ]),
  module('Help & Support', ALL, [
    ['Setup & Go-Live Guide', '/setup', ADMIN], ['Process Map', '/process-map'], ['Class Readiness', '/class-map', ADMIN], ['Help Center', '/help'], ['User Guide', '/user-guide'], ['Submit a Support Request', '/support'], ['System Updates', '/system-updates'], ['About School ERP', '/about'],
  ]),
];

/** Looks up a planned page by the slugs used in its URL. */
export function findPlanned(moduleSlug, itemSlug) {
  const group = MENU.find((m) => m.slug === moduleSlug);
  const item = group?.items.find((i) => i.to === `/planned/${moduleSlug}/${itemSlug}`);
  return group && item ? { group, item } : null;
}
