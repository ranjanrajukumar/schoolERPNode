/**
 * The screens a report can be attached to. When a report is saved in the designer, its author ticks the pages it belongs to; each of
 * those screens carries one <PageReports page="..." /> and lists its reports by itself, so a new report needs no change to the screen.
 *
 * `module` is the Role Rights module of that screen. Print, PDF, Excel and CSV of a report follow the role's **Export** right in the
 * module of the page the report is on (set on the Role Rights page), not a right of the report tool itself.
 *
 * To make another screen able to carry reports: add it here, and put <PageReports page="its-key" /> in the screen.
 */
export const REPORT_PAGES = [
  { key: 'students', label: 'Students', module: 'students' },
  { key: 'admissions', label: 'Admissions', module: 'admissions' },
  { key: 'classes', label: 'Classes & sections', module: 'academics' },
  { key: 'attendance', label: 'Attendance', module: 'attendance' },
  { key: 'exams', label: 'Examinations', module: 'examinations' },
  { key: 'fees', label: 'Fees', module: 'fees-and-finance' },
  { key: 'staff', label: 'Staff', module: 'staff-and-hr' },
  { key: 'library', label: 'Library', module: 'library' },
  { key: 'inventory', label: 'Inventory', module: 'inventory' },
  { key: 'transport', label: 'Transport', module: 'transport' },
  { key: 'hostel', label: 'Hostel', module: 'hostel' },
  { key: 'reports', label: 'Reports page', module: 'reports' },
];

const BY_KEY = new Map(REPORT_PAGES.map((p) => [p.key, p]));

/** The page keys of a stored list (comma-separated text), without any that no longer exist. */
export const pagesOf = (text) =>
  String(text ?? '')
    .split(',')
    .map((k) => k.trim())
    .filter((k) => BY_KEY.has(k));

/** The Role Rights module a page belongs to. */
export const moduleOfPage = (key) => BY_KEY.get(key)?.module ?? null;

/**
 * Turns what the designer sends (a list of page keys) into the text that is stored. Anything that is not a known page is refused,
 * so a typo cannot silently leave a report off every screen. Returns null for none.
 */
export function cleanPages(input, fail) {
  const list = Array.isArray(input) ? input : [];
  const unknown = list.find((k) => !BY_KEY.has(k));
  if (unknown !== undefined) fail(`“${unknown}” is not a page that can carry reports`);
  return [...new Set(list)].join(',') || null;
}
