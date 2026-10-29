/**
 * Custom roles. A custom role is a built-in role (its "base") narrowed to chosen modules, so it can never be allowed to do
 * more than the base role could. Each module is a sidebar group; its API prefixes are what the server checks.
 * Module keys equal the sidebar group slugs (client/src/config/menu.js).
 */
export const MODULES = [
  { key: 'admissions', label: 'Admissions', prefixes: ['admissions'] },
  {
    key: 'students',
    label: 'Students',
    prefixes: [
      'students',
      'student-files',
      'student-health',
      'student-profile',
      'behavior',
      'alumni',
      'student-accounts',
      'promotion',
    ],
  },
  {
    key: 'academics',
    label: 'Academics',
    prefixes: [
      'classes',
      'my-class',
      'subjects',
      'class-subjects',
      'academic-years',
      'homework',
      'online-classes',
      'syllabus',
      'study-materials',
      'calendar',
      'lms',
    ],
  },
  {
    key: 'attendance',
    label: 'Attendance',
    prefixes: ['attendance', 'period-attendance', 'student-leaves', 'absence-alerts', 'biometric'],
  },
  { key: 'examinations', label: 'Examinations', prefixes: ['exams', 'progress-card'] },
  {
    key: 'fees-and-finance',
    label: 'Fees & Finance',
    prefixes: ['fees', 'fee-structures', 'fee-groups', 'accounts'],
  },
  {
    key: 'staff-and-hr',
    label: 'Staff & HR',
    prefixes: ['staff', 'hr', 'payroll', 'recruitment', 'performance-reviews', 'staff-files'],
  },
  { key: 'timetable', label: 'Timetable', prefixes: ['timetable', 'scheduling'] },
  { key: 'communication', label: 'Communication', prefixes: ['messaging', 'notices', 'feedback'] },
  { key: 'parent-portal', label: 'Parent Portal', prefixes: ['parents'] },
  { key: 'transport', label: 'Transport', prefixes: ['transport'] },
  { key: 'library', label: 'Library', prefixes: ['library'] },
  { key: 'inventory', label: 'Inventory', prefixes: ['inventory', 'inventory-requests'] },
  { key: 'hostel', label: 'Hostel', prefixes: ['hostel'] },
  { key: 'health-and-safety', label: 'Health & Safety', prefixes: ['safety'] },
  { key: 'events-and-activities', label: 'Events & Activities', prefixes: ['activities'] },
  { key: 'documents-and-certificates', label: 'Documents & Certificates', prefixes: ['documents'] },
  { key: 'reports', label: 'Reports', prefixes: ['reports'] },
  {
    key: 'settings',
    label: 'Settings',
    prefixes: ['settings', 'branches', 'masters', 'setup', 'leave-types'],
  },
];
// Not grantable: users, roles, user groups, audit log and login history, and data (backup, restore, export, import) and integrations.
// Only a built-in admin reaches those: a backup holds every password hash and device key, and a restore replaces the whole database.

export const LEVELS = ['read', 'write'];
export const BASE_ROLES = ['admin', 'teacher', 'accountant'];

const PHOTO_MODULE = {
  student: 'students',
  staff: 'staff-and-hr',
  enquiry: 'admissions',
  school: 'settings',
};
const MODULE_OF = new Map(MODULES.flatMap((m) => m.prefixes.map((p) => [p, m.key])));

/** Read-only lookups that other screens need (dropdowns, the dashboard), available to every custom role. */
const SHARED_READS = new Set([
  'dashboard',
  'classes',
  'subjects',
  'academic-years',
  'students',
  'staff',
  'settings',
  'notices',
  'calendar',
  'branches',
  'masters',
  'lookup',
  'leave-types',
]);

// Help and support belong to every signed-in staff member, whatever a custom role includes.
const ALWAYS = new Set(['auth', 'support', 'push', 'feedback']); // anyone may send feedback

const READ_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/** Turns what the form sends into a clean { moduleKey: 'read' | 'write' } map, dropping "none" and anything unknown. */
export function cleanPermissions(input) {
  const out = {};
  for (const m of MODULES) {
    const level = input?.[m.key];
    if (LEVELS.includes(level)) out[m.key] = level;
  }
  return out;
}

/** Whether a custom role's permission map allows this request. Anything not named in MODULES is refused. */
export function permits(permissions, method, urlPath) {
  const parts = urlPath.split('?')[0].split('/').filter(Boolean); // ['api', 'fees', ...]
  const prefix = parts[1];
  if (!prefix) return false;
  if (ALWAYS.has(prefix)) return true;
  // A photo belongs to the module of whatever it shows: /api/photos/staff/3 is Staff & HR.
  const level = permissions[prefix === 'photos' ? PHOTO_MODULE[parts[2]] : MODULE_OF.get(prefix)];
  if (prefix === 'photos' && READ_METHODS.has(method) && parts[2] === 'school') return true;
  if (READ_METHODS.has(method)) return Boolean(level) || SHARED_READS.has(prefix);
  return level === 'write';
}

/** The module an API address belongs to (for example /api/fees/3 is fees-and-finance), or null when it belongs to none. */
export function moduleOfPath(urlPath) {
  const parts = urlPath.split('?')[0].split('/').filter(Boolean);
  const prefix = parts[1];
  return (prefix === 'photos' ? PHOTO_MODULE[parts[2]] : MODULE_OF.get(prefix)) ?? null;
}
