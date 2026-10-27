import { AuditLog } from '../models/index.js';

const READ_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
const MAX_DETAILS = 2000;

/** Removes secrets before a request body is stored. */
const redact = (value) => {
  if (Array.isArray(value)) return value.map(redact);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, /password|token|secret/i.test(k) ? '[redacted]' : redact(v)]));
  }
  return value;
};

/**
 * Reads that hand out whole tables are recorded too: a full backup (which includes password hashes) and every CSV export.
 * Ordinary reads are not, or the log would be mostly noise.
 */
const SENSITIVE_READS = [/^\/api\/data\/backup\/?$/, /^\/api\/data\/export\/[a-z-]+\/?$/];

/**
 * Records every successful change (POST/PUT/DELETE), and the sensitive downloads above, with who did it and what was sent.
 * Runs after the response is sent, and a logging failure never affects the request.
 * Must be mounted after requireAuth so the user is known.
 */
export function auditTrail(req, res, next) {
  const path = req.originalUrl.split('?')[0];
  if (READ_METHODS.has(req.method) && !SENSITIVE_READS.some((re) => re.test(path))) return next();

  res.on('finish', () => {
    if (res.statusCode >= 400) return;
    const details = req.body && Object.keys(req.body).length ? JSON.stringify(redact(req.body)).slice(0, MAX_DETAILS) : null;
    AuditLog.create({
      userId: req.user?.id,
      userName: req.user?.name,
      role: req.user?.role,
      method: req.method,
      resource: path.split('/')[2] || 'unknown',
      path,
      status: res.statusCode,
      details,
    }).catch((err) => console.error('Audit log failed:', err.message));
  });
  next();
}
