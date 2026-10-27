import { api } from './api.js';

/** The few school-wide values staff screens need, fetched once and shared. */
let pending = null;
const FALLBACK = { school: { name: 'School' }, attendanceMinPercent: 75 };

export function loadPublicSettings() {
  if (!pending) pending = api('/settings/public').catch(() => FALLBACK);
  return pending;
}

/** Call after saving settings so the next screen reads the new values. */
export function forgetPublicSettings() {
  pending = null;
}
