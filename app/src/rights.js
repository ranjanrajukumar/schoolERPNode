import { useEffect, useState } from 'react';
import { api } from './api';
import { useAuth } from './auth';

// The app's module keys that differ from the website's (sidebar group) keys that Role Rights uses. Others are the same or have no rights.
const WEB_MODULE = {
  lms: 'academics', exams: 'examinations', fees: 'fees-and-finance', hr: 'staff-and-hr', safety: 'health-and-safety',
  activities: 'events-and-activities', documents: 'documents-and-certificates', portal: 'parent-portal',
};
// Parent and student pages mapped to the portal areas of the Role Rights page (key: module.screen)
const PORTAL_AREA = {
  'academic.leave': 'portal-leave', 'admin.documents': 'portal-documents', 'admin.feedback': 'portal-feedback', 'other.activities': 'portal-activities',
  'academic.lms': 'portal-lms', 'academic.lmsannouncements': 'portal-lms', 'academic.lmsassignments': 'portal-lms', 'academic.lmsquizzes': 'portal-lms',
};
let cache = null; // { userId, rights }

/** What an app action does, so it can be matched to a right: approve, delete, edit or create. Links, files and navigation are never limited. */
export function actionOfApp(action, row, child) {
  if (['link', 'file', 'navigate'].includes(action.kind)) return null;
  const path = typeof action.path === 'function' ? action.path(row ?? {}, child) : action.path ?? '';
  if (/\/(approve|reject|accept|decide)$/.test(String(path).split('?')[0])) return 'approve';
  const method = (action.method ?? 'POST').toUpperCase();
  if (method === 'DELETE') return 'delete';
  if (method === 'PUT' || method === 'PATCH') return 'edit';
  return 'create';
}

/**
 * can(action) for one module of the app, from the rights an admin sets on the website (Role Rights). Everything is allowed until the rights
 * load or when nothing was switched off. This only hides buttons; the server refuses the request in any case.
 */
export function useCan(moduleKey, screenKey) {
  const { user } = useAuth();
  const [rights, setRights] = useState(cache?.userId === user?.id ? cache.rights : null);
  useEffect(() => {
    if (!user || user.role === 'admin') return;
    if (cache?.userId === user.id) { setRights(cache.rights); return; }
    api('/role-rights/mine').then((r) => { cache = { userId: user.id, rights: r }; setRights(r); }).catch(() => {});
  }, [user]);
  const mine = rights?.[PORTAL_AREA[`${moduleKey}.${screenKey}`] ?? WEB_MODULE[moduleKey] ?? moduleKey];
  return (action) => (action && mine ? mine[action] !== false : true);
}
