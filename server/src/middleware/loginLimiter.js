/**
 * Slows password guessing: after too many failed sign-ins for the same email from the same address
 * (or too many from one address overall) further attempts are refused for a while. In memory, so it
 * resets when the server restarts, which is fine for a single-instance school deployment.
 */
const WINDOW_MS = 15 * 60 * 1000;
const MAX_PER_ACCOUNT = 8;
const MAX_PER_ADDRESS = 40;

const failures = new Map(); // key -> { count, resetAt }

const bump = (key) => {
  const now = Date.now();
  const entry = failures.get(key);
  if (!entry || entry.resetAt <= now) failures.set(key, { count: 1, resetAt: now + WINDOW_MS });
  else entry.count += 1;
};

const blockedFor = (key, max) => {
  const entry = failures.get(key);
  return entry && entry.resetAt > Date.now() && entry.count >= max
    ? Math.ceil((entry.resetAt - Date.now()) / 1000)
    : 0;
};

const keys = (req) => {
  const ip = req.ip || 'unknown';
  return { account: `a|${ip}|${String(req.body?.email ?? '').toLowerCase()}`, address: `i|${ip}` };
};

export function checkLoginAllowed(req, res, next) {
  const k = keys(req);
  const wait = Math.max(blockedFor(k.account, MAX_PER_ACCOUNT), blockedFor(k.address, MAX_PER_ADDRESS));
  if (!wait) return next();
  res.set('Retry-After', String(wait));
  return res
    .status(429)
    .json({ error: `Too many failed attempts. Try again in ${Math.ceil(wait / 60)} minute(s).` });
}

export function recordLoginFailure(req) {
  const k = keys(req);
  bump(k.account);
  bump(k.address);
  if (failures.size > 5000) {
    const now = Date.now();
    for (const [key, entry] of failures) if (entry.resetAt <= now) failures.delete(key);
  }
}

export function recordLoginSuccess(req) {
  failures.delete(keys(req).account);
}
