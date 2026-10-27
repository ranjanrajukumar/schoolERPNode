import jwt from 'jsonwebtoken';
import { Parent, Staff, Student, StudentAccount, User } from '../../models/index.js';
import { unauthorized } from '../../utils/httpError.js';
import { sessionFor } from '../platform/auth.service.js';

/**
 * One mobile app for many schools. A global registry (global/ in this project) knows every login's mobile number, email and password
 * hash and which school it belongs to. This server does two things for it:
 *   1. reports its logins to the registry (pushAll / pushOne), so people can be found by mobile number or email;
 *   2. accepts the registry's short-lived signed ticket as proof of sign-in (ssoLogin), instead of asking for the password again.
 * The school stays the source of truth: passwords are changed and logins created here, and the registry follows.
 * Settings: GLOBAL_URL, GLOBAL_CLIENT_CODE, GLOBAL_CLIENT_KEY (all three, or the feature is off), optionally GLOBAL_PUBLIC_KEY to pin the signing key.
 */
const ISSUER = 'schoolerp-global';
const CHUNK = 4000; // the registry takes up to 5000 at a time; a school with fewer sends its complete list in one go
const SYNC_EVERY_MS = 15 * 60 * 1000;
const state = { lastSync: null, lastError: null, lastResult: null, publicKey: null };

export function globalConfig() {
  const url = String(process.env.GLOBAL_URL ?? '').trim().replace(/[/]+$/, '');
  const code = String(process.env.GLOBAL_CLIENT_CODE ?? '').trim().toLowerCase();
  const key = String(process.env.GLOBAL_CLIENT_KEY ?? '').trim();
  return { enabled: Boolean(url && code && key), url, code, key };
}

export const globalStatus = () => ({ ...globalConfig(), key: undefined, lastSync: state.lastSync, lastError: state.lastError, lastResult: state.lastResult });

/* ---------- accepting the registry's ticket ---------- */

const usedTickets = new Map(); // jti -> when it expires: a ticket works once

async function signingKey({ refresh = false } = {}) {
  if (process.env.GLOBAL_PUBLIC_KEY) return process.env.GLOBAL_PUBLIC_KEY.replace(/\\n/g, '\n');
  if (state.publicKey && !refresh) return state.publicKey;
  const res = await fetch(`${globalConfig().url}/public-key`, { signal: AbortSignal.timeout(8000) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.publicKey) throw new Error('could not read the registry signing key');
  state.publicKey = data.publicKey;
  return state.publicKey;
}

function verifyWith(ticket, key) {
  return jwt.verify(ticket, key, { algorithms: ['RS256'], issuer: ISSUER });
}

/** A ticket from the registry for one of this school's logins becomes a normal session. Anything else is refused alike. */
export async function ssoLogin(ticket) {
  const cfg = globalConfig();
  if (!cfg.enabled) throw unauthorized('Sign-in through the global registry is not set up at this school');
  let claims;
  try {
    try { claims = verifyWith(String(ticket ?? ''), await signingKey()); } catch (err) {
      if (err.name === 'JsonWebTokenError' && !process.env.GLOBAL_PUBLIC_KEY) claims = verifyWith(String(ticket ?? ''), await signingKey({ refresh: true })); // the registry may have changed its key
      else throw err;
    }
  } catch { throw unauthorized('That sign-in has expired or is not valid. Please sign in again.'); }
  if (claims.cc !== cfg.code) throw unauthorized('That sign-in is for another school');

  const now = Date.now();
  for (const [id, until] of usedTickets) if (until <= now) usedTickets.delete(id);
  if (!claims.jti || usedTickets.has(claims.jti)) throw unauthorized('That sign-in was already used. Please sign in again.');
  usedTickets.set(claims.jti, claims.exp * 1000);

  const user = await User.findByPk(claims.uid);
  if (!user || user.role !== claims.role) throw unauthorized('That login no longer exists at this school');
  return { user, session: sessionFor(user) };
}

/* ---------- reporting logins to the registry ---------- */

const digits = (v) => String(v ?? '').replace(/\D/g, '');

/** Every login with the mobile number it is reached on: a teacher's staff phone, a parent's phone, a student's own or their guardian's. */
async function identitiesFor(where = {}) {
  const users = await User.findAll({ where });
  if (!users.length) return [];
  const ids = users.map((u) => u.id);
  const [staff, parents, accounts] = await Promise.all([
    Staff.findAll({ where: { id: users.map((u) => u.staffId).filter(Boolean) }, attributes: ['id', 'phone'] }),
    Parent.findAll({ where: { userId: ids }, attributes: ['userId', 'phone'] }),
    StudentAccount.findAll({ where: { userId: ids }, attributes: ['userId', 'studentId'] }),
  ]);
  const students = accounts.length ? await Student.findAll({ where: { id: accounts.map((a) => a.studentId) }, attributes: ['id', 'admissionNo', 'phone', 'guardianPhone'] }) : [];
  const staffPhone = new Map(staff.map((s) => [s.id, s.phone]));
  const parentPhone = new Map(parents.map((p) => [p.userId, p.phone]));
  const studentOf = new Map(students.map((s) => [s.id, s]));
  const studentByUser = new Map(accounts.map((a) => [a.userId, studentOf.get(a.studentId)]));

  return users.map((u) => {
    const student = studentByUser.get(u.id);
    const mobile = u.role === 'student' ? (digits(student?.phone) ? student.phone : student?.guardianPhone) : u.role === 'parent' ? parentPhone.get(u.id) : staffPhone.get(u.staffId);
    return {
      localUserId: u.id, role: u.role, name: u.name, email: u.email, mobile: digits(mobile) || null, username: u.role === 'student' ? student?.admissionNo ?? null : null,
      passwordHash: u.passwordHash, active: true,
    };
  });
}

async function post(path, body, method = 'POST') {
  const cfg = globalConfig();
  const res = await fetch(`${cfg.url}/provision${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', 'x-client-code': cfg.code, 'x-client-key': cfg.key },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(30_000),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `the registry answered ${res.status}`);
  return data;
}

/** Sends every login to the registry; anything the registry holds that is no longer here is switched off there. */
export async function pushAll() {
  if (!globalConfig().enabled) return { skipped: true };
  try {
    const all = await identitiesFor();
    const total = { created: 0, updated: 0, deactivated: 0 };
    if (!all.length) await post('/identities', { identities: [], full: true });
    for (let i = 0; i < all.length; i += CHUNK) {
      // only a complete list in one request can switch off logins that no longer exist; a very large school adds and updates in parts
      // eslint-disable-next-line no-await-in-loop
      const r = await post('/identities', { identities: all.slice(i, i + CHUNK), full: all.length <= CHUNK });
      for (const k of Object.keys(total)) total[k] += r[k] ?? 0;
    }
    state.lastSync = new Date().toISOString(); state.lastError = null; state.lastResult = { logins: all.length, ...total };
    return state.lastResult;
  } catch (err) {
    state.lastError = err.message;
    throw err;
  }
}

const pending = new Map();
/** One login changed (created, renamed, new password): tell the registry a moment later, once, whatever else changes meanwhile. */
export function queuePush(userId) {
  if (!globalConfig().enabled) return;
  clearTimeout(pending.get(userId));
  pending.set(userId, setTimeout(async () => {
    pending.delete(userId);
    try {
      const [identity] = await identitiesFor({ id: userId });
      if (identity) await post('/identities', { identities: [identity] });
      else await post(`/identities/${userId}`, undefined, 'DELETE');
    } catch (err) { state.lastError = err.message; console.error('Global sync of one login failed:', err.message); }
  }, 1500));
}

/** Starts reporting: a first full push shortly after start-up, a full push every 15 minutes, and a push whenever a login is saved. */
export function startGlobalSync() {
  if (!globalConfig().enabled) return;
  User.addHook('afterSave', (user) => queuePush(user.id));
  const run = () => pushAll().then((r) => { if (r.logins !== undefined) console.log(`Global registry: ${r.logins} logins reported (${r.created} new, ${r.updated} updated, ${r.deactivated} switched off)`); }).catch((err) => console.error('Global sync failed:', err.message));
  setTimeout(run, 10_000).unref();
  setInterval(run, SYNC_EVERY_MS).unref();
}
