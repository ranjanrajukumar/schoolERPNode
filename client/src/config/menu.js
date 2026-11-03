const ALL = ['admin', 'teacher', 'accountant'];
const ADMIN = ['admin'];
const FINANCE = ['admin', 'accountant'];
const TEACHING = ['admin', 'teacher'];

const slug = (text) =>
  text
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

/**
 * A submenu entry is either a label (planned, not built yet) or [label, route, roles?]
 * pointing at an existing page. Roles only hide links; the API enforces access.
 */
const ICONS = {
  'my-children': '👪',
  'my-school': '🏫',
  dashboard: '🏠',
  admissions: '📝',
  students: '🎓',
  academics: '📚',
  'learning-management': '💻',
  'board-management': '🏛️',
  attendance: '✅',
  examinations: '🧪',
  'fees-and-finance': '💰',
  'staff-and-hr': '👥',
  timetable: '🗓️',
  communication: '💬',
  'parent-portal': '👨‍👩‍👧',
  transport: '🚌',
  library: '📖',
  inventory: '📦',
  hostel: '🛏️',
  'health-and-safety': '🩺',
  'events-and-activities': '🎉',
  'documents-and-certificates': '📄',
  reports: '📊',
  'user-management': '🔐',
  settings: '⚙️',
  'help-and-support': '🛟',
};

const module = (label, roles, entries) => {
  const used = new Set();
  return {
    label,
    slug: slug(label),
    key: slug(label), // the id of this group in the stored menu (app_menu_items, audience "web")
    icon: ICONS[slug(label)] ?? '•',
    roles,
    items: entries.map((entry) => {
      const [itemLabel, to, itemRoles] = Array.isArray(entry) ? entry : [entry];
      let key = `${slug(label)}.${slug(itemLabel)}`;
      while (used.has(key)) key += '-2'; // two entries with the same label in one group
      used.add(key);
      return {
        key,
        label: itemLabel,
        to: to ?? `/planned/${slug(label)}/${slug(itemLabel)}`,
        built: Boolean(to),
        roles: itemRoles ?? roles,
      };
    }),
  };
};

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
    ['Syllabus', '/portal?tab=Syllabus'],
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
    ['Overview', '/'],
    ['My Class', '/my-class', TEACHING],
  ]),
  module('Board Management', ADMIN, [
    ['Board Rules', '/board-rules'],
    ['Board Registration', '/board-registration'],
  ]),
  module('Admissions', ADMIN, [
    ['Admission Enquiries', '/admissions'],
    ['Admission', '/applications'],
    ['Entrance Tests', '/entrance-tests'],
    ['Interview Schedule', '/interview-schedule'],
    ['Admission Offers', '/admission-offers'],
    ['Admission Reports', '/admission-reports'],
    ['Visitor Records', '/visitors'],
  ]),
  module('Students', ALL, [
    ['Registrations', '/registrations', ADMIN],
    ['Enrolled Students', '/students'],
    ['Student Accounts', '/student-accounts', ADMIN],
    ['Student Behavior', '/behavior', TEACHING],
    ['Year-end Promotion', '/promotion', ADMIN],
    ['Alumni', '/alumni', ADMIN],
  ]),
  module('Academics', TEACHING, [
    ['Academics Overview', '/academics'],
    ['Academic Years', '/academic-years', ADMIN],
    ['Classes & Sections', '/classes'],
    ['Subjects', '/subjects'],
    ['Class Map', '/class-profile'],
    ['Subject Map', '/class-subjects'],
    ['Syllabus & Lesson Plans', '/syllabus'],
    ['Homework & Assignments', '/homework'],
    ['Online Classes', '/online-classes', TEACHING],
    ['Study Materials', '/study-materials'],
    ['Academic Calendar', '/calendar'],
    ['List of Holidays', '/holidays'],
  ]),
  module('Learning Management', TEACHING, [
    ['Dashboard', '/lms-dashboard'],
    ['Courses & Lessons', '/lms'],
    ['Content Library', '/lms-materials'],
    ['Enrollment', '/lms-enrollment'],
    ['Announcements', '/lms-announcements'],
    ['Assignments', '/lms-assignments'],
    ['Quizzes & Tests', '/lms-quizzes'],
    ['Student Progress', '/lms-progress'],
    ['LMS Tags', '/lms-tags', ADMIN],
  ]),
  module('Timetable', TEACHING, [
    ['Timetable', '/timetable'],
    ['Teacher Timetable', '/timetable?view=teacher'],
    ['Room / Resource Schedule', '/room-schedule', ADMIN],
    ['Substitution Management', '/substitutions', ADMIN],
    ['Timetable Reports', '/timetable-reports', ADMIN],
  ]),
  module('Attendance', TEACHING, [
    ['Mark Attendance', '/attendance'],
    ['Monthly Attendance', '/monthly-attendance'],
    ['Biometric Attendance', '/biometric-attendance'],
    ['Period Attendance', '/period-attendance'],
    ['Student Leave', '/student-leaves'],
    ['Student Leave Record', '/student-leave-balance'],
    ['Attendance Corrections', '/attendance-corrections'],
    ['Parent Absence Alerts', '/absence-alerts'],
  ]),
  module('Examinations', TEACHING, [
    ['Exam Groups', '/exam-groups'],
    ['Grade Setup', '/grade-setup'],
    ['Exams, Marks & Results', '/exams'],
    ['Holistic Progress Card', '/progress-cards', TEACHING],
    ['Merit List', '/merit-list'],
    ['Revaluation Requests', '/revaluation', TEACHING],
  ]),
  module('Fees & Finance', FINANCE, [
    ['Fee Types', '/fee-types'],
    ['Fee Groups', '/fee-groups'],
    ['Fee Structure', '/fee-structures'],
    ['Fees & Payments', '/fees'],
    ['Payment History & Receipts', '/payment-history'],
    ['Fee Reminders', '/fee-reminders'],
    ['Other Income', '/income'],
    ['Expenses', '/expenses'],
  ]),
  module('Transport', ALL, [
    ['Vehicles', '/vehicles', ADMIN],
    ['Drivers & Attendants', '/transport-staff', ADMIN],
    ['Routes', '/transport-routes', ADMIN],
    ['Stops', '/transport-stops', ADMIN],
    ['Student Route Assignment', '/transport-assignments', ADMIN],
    ['Transport Fees', '/transport-fees', FINANCE],
    ['Transport Attendance', '/transport-attendance', TEACHING],
    ['Bus Tracking (Live GPS)', '/bus-tracking', ADMIN],
    ['Vehicle Maintenance', '/transport-maintenance', ADMIN],
    ['Transport Reports', '/transport-reports', ADMIN],
  ]),
  module('Hostel', ALL, [
    ['Hostels', '/hostels', ADMIN],
    ['Hostel Rooms', '/hostel-rooms', ADMIN],
    ['Room Allocation', '/hostel-allocation', ADMIN],
    ['Hostel Attendance', '/hostel-attendance', TEACHING],
    ['Mess Management', '/hostel-mess', TEACHING],
    ['Hostel Fees', '/hostel-fees', FINANCE],
    ['Visitor Log', '/hostel-visitors', TEACHING],
    ['Hostel Reports', '/hostel-reports', ADMIN],
  ]),
  module('Library', ADMIN, [
    ['Book Categories', '/library-categories'],
    ['Books & Loans', '/library'],
    ['Book Reservations', '/library-reservations'],
    ['Library Members', '/library-members'],
    ['Library Reports', '/library-reports'],
  ]),
  // Teachers can ask for items; everything else in Inventory belongs to the admin.
  module('Inventory', TEACHING, [
    ['Item Categories', '/inventory-categories', ADMIN],
    ['Inventory Items', '/inventory-items', ADMIN],
    ['Suppliers', '/suppliers', ADMIN],
    ['Purchase Orders', '/purchase-orders', ADMIN],
    ['Stock In', '/stock-in', ADMIN],
    ['Stock Out', '/stock-out', ADMIN],
    ['Inventory Requests', '/inventory-requests'],
    ['Asset Register', '/assets', ADMIN],
    ['Asset Maintenance', '/asset-maintenance', ADMIN],
    ['Stock Reports', '/stock-reports', ADMIN],
  ]),
  module('Staff & HR', ALL, [
    ['Departments', '/departments', ADMIN],
    ['Designations', '/designations', ADMIN],
    ['Staff Directory', '/staff', ADMIN],
    ['Staff Documents', '/staff-documents', ADMIN],
    ['Staff Attendance', '/staff-attendance', ADMIN],
    ['Monthly Staff Attendance', '/monthly-staff-attendance', ADMIN],
    ['My Profile', '/my-profile', TEACHING],
    ['Staff Leave', '/leave-applications', TEACHING],
    ['Staff Leave Balance', '/staff-leave-balance', ADMIN],
    ['Payroll', '/payroll', FINANCE],
    ['Recruitment', '/recruitment', ADMIN],
    ['Performance Reviews', '/performance-reviews', ADMIN],
    ['HR Reports', '/hr-reports', ADMIN],
  ]),
  module('Health & Safety', ADMIN, [
    ['Student Health Records', '/student-health'],
    ['Clinic Visits', '/clinic-visits'],
    ['Incidents', '/incidents'],
    ['Safety Inspections', '/safety-inspections'],
    ['Health & Safety Report', '/health-reports'],
  ]),
  module('Events & Activities', ALL, [
    ['School Activities', '/activities', TEACHING],
    ['Activity Reports', '/activity-reports', TEACHING],
  ]),
  module('Documents & Certificates', ADMIN, [
    ['Document Verification', '/document-verification'],
    ['Document Templates', '/document-templates'],
    ['ID Cards', '/id-cards'],
    ['Requests & Issued Register', '/documents'],
  ]),
  module('Communication', ALL, [
    ['Notices', '/notices'],
    ['Feedback & Grievance', '/feedback', ALL],
    ['Push Notifications', '/push-notifications'],
    ['Parent Messages', '/send-message', ADMIN],
    ['Staff Messages', '/send-message?audience=staff&channel=email', ADMIN],
    ['Message Templates', '/message-templates', ADMIN],
    ['Communication History', '/message-history', ADMIN],
  ]),
  module('Parent Portal', ADMIN, [
    ['Parent Accounts', '/parents'],
    ['Parent Login Activity', '/parent-login-activity'],
    ['Parent Requests', '/parent-requests'],
  ]),
  module('Reports', ALL, [
    ['Reports Overview', '/reports'],
    ['Saved Reports', '/saved-reports'],
    ['Quick Reports', '/custom-reports', ADMIN],
    ['Report Designer', '/report-designer', ADMIN],
  ]),
  module('User Management', ADMIN, [
    ['Users', '/users'],
    ['Roles', '/roles'],
    ['Permissions', '/permissions'],
    ['Role Rights', '/role-rights'],
    ['User Groups', '/user-groups'],
    ['Login History', '/login-history'],
    ['Audit Log', '/audit'],
  ]),
  module('Settings', ADMIN, [
    ['School Profile', '/school-profile'],
    ['Leave Types & Approval', '/leave-types'],
    ['Public Links', '/public-links'],
    ['Branches / Campuses', '/branches'],
    ['Master Data', '/master-data'],
    ['ID Card Design', '/id-card-design'],
    ['Integrations', '/integrations'],
    ['Data Import / Export', '/data-tools'],
    ['Backup & Restore', '/backup-restore'],
    ['Mobile App Menu', '/app-menu'],
    ['System Preferences', '/settings'],
  ]),
  module('Help & Support', ALL, [
    ['Setup & Go-Live Guide', '/setup', ADMIN],
    ['Process Map', '/process-map'],
    ['Class Readiness', '/class-map', ADMIN],
    ['Help Center', '/help'],
    ['User Guide', '/user-guide'],
    ['Submit a Support Request', '/support'],
    ['System Updates', '/system-updates'],
    ['About School ERP', '/about'],
  ]),
];

/** Looks up a planned page by the slugs used in its URL. */
export function findPlanned(moduleSlug, itemSlug) {
  const group = MENU.find((m) => m.slug === moduleSlug);
  const item = group?.items.find((i) => i.to === `/planned/${moduleSlug}/${itemSlug}`);
  return group && item ? { group, item } : null;
}

/**
 * Applies the menu stored in the database (rows from GET /app-menu/web: key, parentKey, label, icon, iconData, position, already limited to
 * the signed-in role) to the built-in MENU. Where the database has nothing, the built-in menu is used as it is.
 */
export function applyStoredMenu(rows, role) {
  if (!rows?.length) return MENU;
  const byKey = new Map(rows.map((r) => [r.key, r]));
  const at = (key) => byKey.get(key)?.position ?? 0;
  return MENU.filter((g) => byKey.has(g.key))
    .sort((a, b) => at(a.key) - at(b.key))
    .map((g) => {
      const row = byKey.get(g.key);
      return {
        ...g,
        label: row.label,
        icon: row.iconData ? { src: row.iconData } : row.icon,
        roles: [role],
        items: g.items
          .filter((i) => byKey.has(i.key))
          .sort((a, b) => at(a.key) - at(b.key))
          .map((i) => ({ ...i, label: byKey.get(i.key).label, roles: [role] })),
      };
    });
}
