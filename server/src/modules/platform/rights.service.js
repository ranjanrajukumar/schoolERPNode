import { RoleRight } from '../../models/index.js';
import { moduleOfPath } from './access.js';

// What a parent or student can do in the portal. Each area is a set of requests under /api/portal/children/:id and the menu entry that opens it.
export const PORTAL_AREAS = [
  {
    key: 'portal-leave',
    label: 'Leave requests',
    test: /\/leaves(\/|$)/,
    menu: { parent: 'my-children.apply-for-leave', student: 'my-school.leave-requests' },
  },
  {
    key: 'portal-documents',
    label: 'Certificates and documents',
    test: /\/documents(\/|$)/,
    menu: {
      parent: 'my-children.certificates-and-documents',
      student: 'my-school.certificates-and-documents',
    },
  },
  {
    key: 'portal-feedback',
    label: 'Feedback and grievance',
    test: /\/feedback(\/|$)/,
    menu: { parent: 'my-children.feedback-and-grievance', student: 'my-school.feedback-and-grievance' },
  },
  {
    key: 'portal-lms',
    label: 'Courses, assignments and quizzes',
    test: /\/lms(\/|$)/,
    menu: { parent: 'my-children.courses-and-lessons', student: 'my-school.courses-and-lessons' },
  },
  {
    key: 'portal-activities',
    label: 'Activities and consent',
    test: /\/activities(\/|$)/,
    menu: { parent: 'my-children.activities' },
  },
];
const portalAreaOf = (urlPath) => {
  const path = urlPath.split('?')[0];
  return path.startsWith('/api/portal/children/')
    ? (PORTAL_AREAS.find((a) => a.test.test(path))?.key ?? null)
    : null;
};

export const ACTIONS = ['view', 'create', 'edit', 'delete', 'approve', 'export'];
const COLUMN = Object.fromEntries(ACTIONS.map((a) => [a, `can${a[0].toUpperCase()}${a.slice(1)}`]));

/** What a request does, from its method and address: view, create, edit, delete, approve or export. */
function actionOf(method, urlPath) {
  const path = urlPath.split('?')[0].toLowerCase();
  const last = path.split('/').filter(Boolean).pop() ?? '';
  if (['approve', 'reject', 'accept', 'decide'].includes(last) && method !== 'GET') return 'approve';
  if (last === 'export' || /[?&](format=csv|export=)/.test(urlPath.toLowerCase())) return 'export';
  if (method === 'DELETE') return 'delete';
  if (method === 'PUT' || method === 'PATCH') return 'edit';
  if (method === 'POST') return 'create';
  return 'view';
}

let cache = null; // Map "role|module" -> row, kept until an admin saves a change
const clearRightsCache = () => {
  cache = null;
};
async function rights() {
  if (!cache) cache = new Map((await RoleRight.findAll()).map((r) => [`${r.role}|${r.module}`, r]));
  return cache;
}

/** Whether this role may export (print, PDF, Excel, CSV) from this module. False only when an admin switched Export off for it. */
export async function mayExport(role, moduleKey) {
  if (role === 'admin') return true;
  const row = (await rights()).get(`${role}|${moduleKey}`);
  return !row || row.canExport !== false;
}

/**
 * Building a saved report as a file (PDF, Excel, CSV, print) is an export from the screen the report is on, so the report routes check
 * the Export right of that screen's module themselves. The generic check below must not also treat these as "create" in Reports.
 */
const REPORT_BUILD = /^\/api\/report-designer\/(runs|print|templates\/\d+\/(csv|run))\/?$/;

/** False only when an admin has switched this action off for this role in this module. Admin is never limited. */
export async function rightsAllow(role, method, urlPath) {
  if (role === 'admin') return true;
  if (method === 'POST' && REPORT_BUILD.test(urlPath.split('?')[0])) return true;
  const module = moduleOfPath(urlPath) ?? portalAreaOf(urlPath);
  const row = module ? (await rights()).get(`${role}|${module}`) : null;
  return !row || row[COLUMN[actionOf(method, urlPath)]] !== false;
}

const shapeRight = (row) =>
  Object.fromEntries(ACTIONS.map((a) => [a, row ? row[COLUMN[a]] !== false : true]));

/** The rights of every module for one role, as the client needs them to show or hide buttons. */
export async function rightsOfRole(role, modules) {
  const map = await rights();
  return Object.fromEntries(
    modules.map((m) => [
      m.key,
      role === 'admin' ? shapeRight(null) : shapeRight(map.get(`${role}|${m.key}`)),
    ]),
  );
}

export async function saveRight(role, module, body) {
  const changes = {};
  for (const a of ACTIONS) if (body[a] !== undefined) changes[COLUMN[a]] = Boolean(body[a]);
  const [row] = await RoleRight.findOrCreate({ where: { role, module }, defaults: {} });
  await row.update(changes);
  clearRightsCache();
  return shapeRight(row);
}
