import crypto from 'node:crypto';
import { HttpError, tooMany, unauthorized } from './utils/httpError.js';

/** The admin API needs the key from GLOBAL_ADMIN_KEY in the x-admin-key header; without a key set it is switched off. */
export function requireAdminKey(req, _res, next) {
  const expected = process.env.GLOBAL_ADMIN_KEY;
  if (!expected || expected.startsWith('change_me'))
    return next(new HttpError(503, 'The admin API is off: set GLOBAL_ADMIN_KEY in the registry settings'));
  const given = Buffer.from(String(req.get('x-admin-key') ?? ''));
  const want = Buffer.from(expected);
  if (given.length !== want.length || !crypto.timingSafeEqual(given, want))
    return next(unauthorized('A valid admin key is required'));
  return next();
}

/** Keeps one address from sweeping the whole list: a fixed number of searches a minute. In memory, per instance. */
export function rateLimit({ perMinute = 60 } = {}) {
  const hits = new Map();
  setInterval(() => {
    const now = Date.now();
    for (const [k, v] of hits) if (v.resetAt <= now) hits.delete(k);
  }, 60_000).unref();
  return (req, _res, next) => {
    const now = Date.now();
    const entry = hits.get(req.ip);
    if (!entry || entry.resetAt <= now) hits.set(req.ip, { count: 1, resetAt: now + 60_000 });
    else if (++entry.count > perMinute)
      return next(tooMany('Too many searches. Please wait a minute and try again.'));
    return next();
  };
}

/**
 * Slows password guessing on the global sign-in: after too many failures for the same mobile number or email from one address (or too many
 * from one address overall) further attempts are refused for a while. In memory, so it resets when the service restarts.
 */
const WINDOW_MS = 15 * 60 * 1000;
const failures = new Map();
const MAX_PER_ACCOUNT = 8;
const MAX_PER_ADDRESS = Number(process.env.LOGIN_MAX_PER_ADDRESS) || 200; // one school's Wi-Fi can be many phones behind one address
const keysOf = (req) => ({
  account: `a|${req.ip}|${String(req.body?.identifier ?? '')
    .trim()
    .toLowerCase()}`,
  address: `i|${req.ip}`,
});
const blockedFor = (key, max) => {
  const e = failures.get(key);
  return e && e.resetAt > Date.now() && e.count >= max ? Math.ceil((e.resetAt - Date.now()) / 1000) : 0;
};
const bump = (key) => {
  const now = Date.now();
  const e = failures.get(key);
  if (!e || e.resetAt <= now) failures.set(key, { count: 1, resetAt: now + WINDOW_MS });
  else e.count += 1;
};
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of failures) if (v.resetAt <= now) failures.delete(k);
}, 60_000).unref();

export function checkLoginAllowed(req, _res, next) {
  const k = keysOf(req);
  const wait = Math.max(blockedFor(k.account, MAX_PER_ACCOUNT), blockedFor(k.address, MAX_PER_ADDRESS));
  return wait
    ? next(tooMany(`Too many failed attempts. Try again in ${Math.ceil(wait / 60)} minute(s).`))
    : next();
}
export const recordLoginFailure = (req) => {
  const k = keysOf(req);
  bump(k.account);
  bump(k.address);
};
export const recordLoginSuccess = (req) => failures.delete(keysOf(req).account);

export const notFoundHandler = (_req, res) => res.status(404).json({ error: 'Not found' });

export function errorHandler(err, _req, res, _next) {
  if (err instanceof HttpError) return res.status(err.status).json({ error: err.message });
  if (err?.type === 'entity.parse.failed')
    return res.status(400).json({ error: 'The request body is not valid JSON' });
  console.error(err);
  return res.status(500).json({ error: 'Something went wrong' });
}
