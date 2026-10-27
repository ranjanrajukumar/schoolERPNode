import { HttpError } from '../utils/httpError.js';

export const notFound = (_req, res) => res.status(404).json({ error: 'Not found' });

// Validation and constraint failures are the caller's fault, so they get a 400 with the reason.
const CLIENT_ERRORS = new Set([
  'SequelizeValidationError',
  'SequelizeUniqueConstraintError',
]);

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, _req, res, _next) {
  if (err instanceof HttpError) return res.status(err.status).json({ error: err.message });
  if (err.type === 'entity.too.large') return res.status(413).json({ error: 'File is too large (5 MB maximum)' });
  if (err.name === 'SequelizeForeignKeyConstraintError') {
    // 1451: a parent being deleted is still referenced; 1452: a referenced parent does not exist. Table names stay in the log.
    console.error(err.parent?.sqlMessage || err.message);
    return err.parent?.errno === 1451
      ? res.status(409).json({ error: 'This record is still used by other records, so it cannot be deleted.' })
      : res.status(400).json({ error: 'A record this refers to does not exist.' });
  }
  if (CLIENT_ERRORS.has(err.name)) {
    const message = err.errors?.[0]?.message || err.parent?.sqlMessage || err.message;
    return res.status(400).json({ error: message });
  }
  if (err.name === 'SequelizeDatabaseError') {
    // Raw database messages expose table and column names, so keep them in the log only.
    console.error(err.parent?.sqlMessage || err.message);
    return res.status(400).json({ error: 'Invalid value in the request' });
  }
  console.error(err);
  res.status(500).json({ error: 'Server error' });
}
