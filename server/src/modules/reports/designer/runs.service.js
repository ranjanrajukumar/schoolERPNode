import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { Worker } from 'node:worker_threads';
import { Op } from 'sequelize';
import { Photo, ReportRun, SchoolClass } from '../../../models/index.js';
import { badRequest, conflict, notFound } from '../../../utils/httpError.js';
import { affiliationStatement, findBoard } from '../../boards/boardRules.service.js';
import { runReport } from '../../settings/data.service.js';
import { columnsUsed } from './templateSchema.js';

/**
 * Report generation as background jobs. A run is a database row (the history and log) plus, while it is fresh, a file in a private
 * temporary folder under a random name. Rendering happens in a worker thread, at most REPORT_WORKERS at a time, so many people can ask
 * for reports at once without the server slowing for everyone else. Files are served only through the authenticated download route
 * and are deleted after REPORT_FILE_TTL_MIN minutes.
 */
const positive = (name, fallback) => {
  const n = Number(process.env[name]);
  return Number.isFinite(n) && n > 0 ? n : fallback;
};
export const DIR = process.env.REPORT_TMP_DIR || path.join(os.tmpdir(), 'schoolerp-reports');
const WORKERS = Math.floor(positive('REPORT_WORKERS', 2));
const TIMEOUT_MS = positive('REPORT_TIMEOUT_MS', 120_000);
const TTL_MS = positive('REPORT_FILE_TTL_MIN', 60) * 60_000;
const MAX_ACTIVE_PER_USER = Math.floor(positive('REPORT_MAX_ACTIVE_PER_USER', 3));
const PREVIEW_ROWS = 100;
const STORED = /^[a-f0-9]{32}$/;
const TYPES = {
  pdf: 'application/pdf',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
};

/* ---------- a fair queue: at most WORKERS renders at a time, first come first served ---------- */

let free = WORKERS;
const waiting = [];
const acquire = () =>
  free > 0 ? (free--, Promise.resolve()) : new Promise((resolve) => waiting.push(resolve));
const release = () => {
  const next = waiting.shift();
  if (next) next();
  else free++;
};
export const queueState = () => ({ workers: WORKERS, busy: WORKERS - free, waiting: waiting.length });

/* ---------- gathering the data, only through the same checked path as every other report ---------- */

/**
 * The rows a design reads. A design tied to a board only ever sees that board's classes, so CBSE and UP Board records cannot
 * end up in one report.
 */
export async function fetchRows(design, boardName, limit = 0) {
  const columns = columnsUsed(design);
  const filters = [...(design.filters ?? [])];
  let board = null;
  if (boardName) {
    board = await findBoard(boardName);
    if (!board) throw badRequest(`Board “${boardName}” does not exist`);
    if (!columns.includes('class')) columns.push('class');
    const classes = await SchoolClass.findAll({
      where: { boardId: board.id },
      attributes: ['name', 'section'],
    });
    filters.push({ column: 'class', op: 'one_of', value: classes.map((c) => `${c.name}-${c.section}`) });
  }
  const result = await runReport({ dataset: design.dataset, columns, filters });
  const rows = limit ? result.rows.slice(0, limit) : result.rows;
  return { rows, total: result.total, truncated: result.truncated, board };
}

/** The school logo as a data URL, or null when there is none or it is not a PNG or JPEG. */
async function schoolLogo() {
  const row = await Photo.findOne({
    where: { entity: 'school', entityId: 0 },
    attributes: ['mimeType', 'data'],
  });
  if (!row || !/^image\/(png|jpeg)$/.test(row.mimeType)) return null;
  return `data:${row.mimeType};base64,${row.data}`;
}

/** The wording a board's report may carry. The affiliation line exists only for a verified, in-date record. */
async function boardTokens(board) {
  if (!board) return {};
  return { board: board.name, affiliation: (await affiliationStatement(board)) ?? '' };
}

/* ---------- rendering in a worker thread ---------- */

function renderInWorker(workerData) {
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL('./renderWorker.js', import.meta.url), { workerData });
    const timer = setTimeout(() => {
      worker.terminate();
      reject(new Error('The report took too long to build. Narrow it with filters or a date range'));
    }, TIMEOUT_MS);
    worker.once('message', (msg) => {
      clearTimeout(timer);
      if (msg.ok) resolve(Buffer.from(msg.bytes));
      else reject(new Error(msg.error));
    });
    worker.once('error', (err) => {
      clearTimeout(timer);
      reject(err);
    });
    worker.once('exit', (code) => {
      clearTimeout(timer);
      if (code !== 0) reject(new Error('The report builder stopped unexpectedly'));
    });
  });
}

/** A quick PDF of the first rows of a design, for the designer's live preview. Nothing is stored. */
export async function previewPdf(design, boardName) {
  await acquire();
  try {
    const { rows, board } = await fetchRows(design, boardName, PREVIEW_ROWS);
    return await renderInWorker({
      design,
      rows,
      format: 'pdf',
      options: { logo: await schoolLogo(), now: new Date(), tokens: await boardTokens(board) },
    });
  } finally {
    release();
  }
}

/** A PDF of a whole design built now and returned, not stored. Used by Print. It takes a worker slot like every other report. */
export async function renderPdfNow(design, rows) {
  await acquire();
  try {
    return await renderInWorker({
      design,
      rows,
      format: 'pdf',
      options: { logo: await schoolLogo(), now: new Date(), tokens: {} },
    });
  } finally {
    release();
  }
}

/* ---------- runs ---------- */

const finished = new Map(); // run id -> promise that settles when the run is over (it never rejects)

// Reports in progress per person, counted in memory and taken before anything waits. People who send several requests at the same
// instant cannot all slip under the limit, which a count read from the database followed by a create would let them do.
const activeByUser = new Map();
const bump = (userId, by) => activeByUser.set(userId, Math.max(0, (activeByUser.get(userId) ?? 0) + by));

const safeName = (s) =>
  String(s)
    .replace(/[^A-Za-z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'report';

async function execute(run, design, boardName) {
  await acquire();
  try {
    await run.update({ status: 'running', startedAt: new Date() });
    const { rows, board } = await fetchRows(design, boardName);
    const file = await renderInWorker({
      design,
      rows,
      format: run.format,
      options: { logo: await schoolLogo(), now: new Date(), tokens: await boardTokens(board) },
    });
    const storedName = crypto.randomBytes(16).toString('hex');
    await fs.mkdir(DIR, { recursive: true, mode: 0o700 });
    await fs.writeFile(path.join(DIR, storedName), file, { mode: 0o600 });
    await run.update({
      status: 'done',
      rowCount: rows.length,
      sizeBytes: file.length,
      storedName,
      fileName: `${safeName(run.templateName)}-${new Date().toISOString().slice(0, 10)}.${run.format}`,
      finishedAt: new Date(),
      expiresAt: new Date(Date.now() + TTL_MS),
    });
  } catch (err) {
    // the person gets a plain reason; nothing from inside the server (paths, stack traces) is stored or shown
    const message = err?.status
      ? err.message
      : /took too long|stopped unexpectedly/.test(err?.message ?? '')
        ? err.message
        : 'The report could not be built';
    if (!err?.status) console.error(`Report run ${run.id} failed:`, err);
    await run
      .update({ status: 'failed', error: message.slice(0, 300), finishedAt: new Date() })
      .catch(() => {});
  } finally {
    release();
    finished.delete(run.id);
    bump(run.userId, -1);
  }
}

/**
 * Starts a run for a saved design and returns its row at once. `wait` lets a small report finish before the answer goes back, so the
 * caller usually gets a finished run for a quick report and a queued one for a big report.
 */
export async function startRun({ template, design, user, format, wait = 8000 }) {
  if (!TYPES[format]) throw badRequest('Choose PDF or Excel');
  const active = activeByUser.get(user.id) ?? 0;
  if (active >= MAX_ACTIVE_PER_USER)
    throw Object.assign(conflict(`You already have ${active} reports being built. Wait for one to finish`), {
      status: 429,
    });
  bump(user.id, 1);
  let run;
  try {
    run = await ReportRun.create({
      templateId: template.id,
      templateName: template.name,
      userId: user.id,
      userName: user.name ?? null,
      role: user.customRole ?? user.role,
      format,
      status: 'queued',
    });
  } catch (err) {
    bump(user.id, -1);
    throw err;
  }
  const done = execute(run, design, template.board ?? null);
  finished.set(run.id, done);
  if (wait > 0) await Promise.race([done, new Promise((r) => setTimeout(r, wait))]);
  return run.reload();
}

/** The file of a finished run, for the download route. Refuses a run that is not done, has expired, or whose file is gone. */
export async function openRunFile(run) {
  if (run.status === 'expired') throw notFound('This report has expired. Run it again');
  if (run.status !== 'done' || !STORED.test(run.storedName ?? '')) throw notFound('This report is not ready');
  const file = path.join(DIR, run.storedName);
  try {
    await fs.access(file);
  } catch {
    await run.update({ status: 'expired' });
    throw notFound('This report has expired. Run it again');
  }
  return { file, type: TYPES[run.format], fileName: run.fileName };
}

/** Removes a run's file now (the history row stays). */
export async function discardRunFile(run) {
  if (STORED.test(run.storedName ?? '')) await fs.rm(path.join(DIR, run.storedName), { force: true });
  if (run.status === 'done') await run.update({ status: 'expired' });
}

/* ---------- housekeeping ---------- */

/** A restart loses runs that were in flight: say so, rather than leaving them "running" forever. */
export async function recoverRuns() {
  const [n] = await ReportRun.update(
    { status: 'failed', error: 'The server restarted before this report finished', finishedAt: new Date() },
    { where: { status: { [Op.in]: ['queued', 'running'] } } },
  );
  return n;
}

/** Deletes the files of expired runs, and any file in the folder that no run owns and is old (left by a crash). */
export async function cleanupFiles() {
  await fs.mkdir(DIR, { recursive: true, mode: 0o700 });
  let removed = 0;
  const expired = await ReportRun.findAll({ where: { status: 'done', expiresAt: { [Op.lt]: new Date() } } });
  for (const run of expired) {
    await discardRunFile(run);
    removed += 1;
  }
  const owned = new Set(
    (
      await ReportRun.findAll({
        where: { storedName: { [Op.ne]: null } },
        attributes: ['storedName', 'status'],
      })
    )
      .filter((r) => r.status === 'done')
      .map((r) => r.storedName),
  );
  for (const name of await fs.readdir(DIR)) {
    const full = path.join(DIR, name);
    const stat = await fs.stat(full).catch(() => null);
    if (stat?.isFile() && !owned.has(name) && Date.now() - stat.mtimeMs > TTL_MS) {
      await fs.rm(full, { force: true });
      removed += 1;
    }
  }
  return removed;
}

let timer = null;
/** Called once at server start. */
export async function startRunMaintenance() {
  const recovered = await recoverRuns();
  if (recovered) console.log(`Reports: marked ${recovered} unfinished run(s) as failed after the restart`);
  await cleanupFiles().catch((e) => console.error('Report cleanup failed:', e.message));
  timer ??= setInterval(
    () => cleanupFiles().catch((e) => console.error('Report cleanup failed:', e.message)),
    10 * 60_000,
  );
  timer.unref();
}
