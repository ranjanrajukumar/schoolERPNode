import fsSync from 'node:fs';
import { Router } from 'express';
import { Op } from 'sequelize';
import { ReportFolder, ReportRun, ReportTemplate } from '../../models/index.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { badRequest, conflict, forbidden, notFound } from '../../utils/httpError.js';
import { currentUser } from '../../utils/requestContext.js';
import { today } from '../../utils/money.js';
import { checkReportRequest, datasetColumns, reportCsv, runReport } from '../settings/data.service.js';
import { findBoard } from '../boards/boardRules.service.js';
import { validateTemplate } from './designer/templateSchema.js';
import { tableDesign } from './designer/tableDesign.js';
import { REPORT_PAGES, cleanPages, moduleOfPage, pagesOf } from './reportPages.js';
import { mayExport } from '../platform/rights.service.js';
import {
  discardRunFile,
  openRunFile,
  previewPdf,
  queueState,
  renderPdfNow,
  startRun,
} from './designer/runs.service.js';

const router = Router();

/** Only the built-in admin designs reports. A custom role is an admin narrowed to modules, so it is treated like any other named role. */
const isAdmin = (user) => user.role === 'admin' && !user.customRole;
const roleName = (user) => user.customRole ?? user.role;
const splitRoles = (text) =>
  String(text ?? '')
    .split(',')
    .map((r) => r.trim())
    .filter(Boolean);

const mayRun = (user, tpl) => isAdmin(user) || splitRoles(tpl.roles).includes(roleName(user));
const adminOnly = (req) => {
  if (!isAdmin(req.user)) throw forbidden('Only an administrator can design reports');
};

/**
 * Whether this login may print or export the report. That follows the Export right, on the Role Rights page, of the screen the report
 * is attached to (Students, Fees...): switch Export off for a role on Students and its reports there stop printing. A report on no
 * screen follows the Reports module. A custom role needs the screen's module among its modules.
 */
async function canExport(user, tpl) {
  if (isAdmin(user)) return true;
  const modules = pagesOf(tpl.pages).map(moduleOfPage);
  if (!modules.length) modules.push('reports');
  if (user.customRole) return modules.some((m) => Boolean(user.permissions?.[m]));
  return (await Promise.all(modules.map((m) => mayExport(user.role, m)))).some(Boolean);
}
const assertCanExport = async (user, tpl) => {
  if (!(await canExport(user, tpl)))
    throw forbidden('Your role is not allowed to print or export this report');
};

const shape = (t) => ({
  id: t.id,
  folderId: t.folderId,
  name: t.name,
  description: t.description,
  roles: splitRoles(t.roles),
  pages: pagesOf(t.pages),
  config: JSON.parse(t.config),
  kind: JSON.parse(t.config).kind ?? 'table',
  board: t.board,
  createdByName: t.createdByName,
});

/** The request a template runs: its columns, filters and sort, with the date range turned into two more filters. */
function requestOf(config) {
  const filters = [...(config.filters ?? [])];
  if (config.dateColumn && config.dateFrom)
    filters.push({ column: config.dateColumn, op: 'on_or_after', value: config.dateFrom });
  if (config.dateColumn && config.dateTo)
    filters.push({ column: config.dateColumn, op: 'on_or_before', value: config.dateTo });
  return {
    dataset: config.dataset,
    columns: config.columns,
    filters,
    sortBy: config.sortBy,
    sortDir: config.sortDir,
  };
}

function cleanConfig(body) {
  const config = {
    dataset: body.dataset,
    columns: Array.isArray(body.columns) ? body.columns : [],
    filters: (Array.isArray(body.filters) ? body.filters : []).filter((f) => f.column),
    sortBy: body.sortBy || undefined,
    sortDir: body.sortDir === 'desc' ? 'desc' : 'asc',
    dateColumn: body.dateColumn || undefined,
    dateFrom: body.dateFrom || undefined,
    dateTo: body.dateTo || undefined,
    title:
      String(body.title ?? '')
        .trim()
        .slice(0, 120) || undefined,
  };
  if (config.dateFrom && config.dateTo && config.dateFrom > config.dateTo)
    throw badRequest('The “from” date is after the “to” date');
  if ((config.dateFrom || config.dateTo) && !config.dateColumn)
    throw badRequest('Choose which column the dates apply to');
  checkReportRequest(requestOf(config)); // unknown columns, filters or sort are refused when the design is saved, not when it is run
  return config;
}

/** Checks a visual design against its dataset and returns what is stored. */
async function cleanDesign(body, board) {
  const design = body.design;
  const set = datasetColumns().find((d) => d.key === design?.dataset);
  if (!set) throw badRequest('Choose a dataset');
  validateTemplate(design, set.columns);
  if (board && !set.columns.includes('class'))
    throw badRequest(
      'A report for one board needs a dataset that has a class column, such as Students or Admission applicants',
    );
  return { kind: 'design', design };
}

const cleanBoard = async (value) => {
  if (!value) return null;
  const board = await findBoard(value);
  if (!board) throw badRequest('Choose CBSE or UP Board');
  return board.name;
};

/* ---------- Folders ---------- */

router.get(
  '/folders',
  asyncHandler(async (req, res) => {
    const [folders, templates] = await Promise.all([
      ReportFolder.findAll({ order: [['name', 'ASC']] }),
      ReportTemplate.findAll({ attributes: ['id', 'folderId', 'roles'] }),
    ]);
    const visible = templates.filter((t) => mayRun(req.user, t));
    const rows = folders.map((f) => ({
      id: f.id,
      name: f.name,
      description: f.description,
      reports: visible.filter((t) => t.folderId === f.id).length,
    }));
    res.json(isAdmin(req.user) ? rows : rows.filter((f) => f.reports > 0));
  }),
);

router.post(
  '/folders',
  asyncHandler(async (req, res) => {
    adminOnly(req);
    const name = String(req.body.name ?? '')
      .trim()
      .slice(0, 80);
    if (!name) throw badRequest('Give the folder a name');
    if (await ReportFolder.findOne({ where: { name } }))
      throw conflict('A folder with that name already exists');
    res.status(201).json({
      id: (
        await ReportFolder.create({
          name,
          description:
            String(req.body.description ?? '')
              .trim()
              .slice(0, 255) || null,
        })
      ).id,
    });
  }),
);

router.put(
  '/folders/:id',
  asyncHandler(async (req, res) => {
    adminOnly(req);
    const folder = await ReportFolder.findByPk(req.params.id);
    if (!folder) throw notFound('Folder not found');
    const name = String(req.body.name ?? folder.name)
      .trim()
      .slice(0, 80);
    if (!name) throw badRequest('Give the folder a name');
    const clash = await ReportFolder.findOne({ where: { name } });
    if (clash && clash.id !== folder.id) throw conflict('A folder with that name already exists');
    await folder.update({
      name,
      description:
        String(req.body.description ?? folder.description ?? '')
          .trim()
          .slice(0, 255) || null,
    });
    res.json({ ok: true });
  }),
);

// A folder with reports in it cannot be deleted: move or delete the reports first, so none is lost by accident.
router.delete(
  '/folders/:id',
  asyncHandler(async (req, res) => {
    adminOnly(req);
    const folder = await ReportFolder.findByPk(req.params.id);
    if (!folder) throw notFound('Folder not found');
    if (await ReportTemplate.count({ where: { folderId: folder.id } }))
      throw conflict('This folder still has reports. Move or delete them first');
    await folder.destroy();
    res.json({ ok: true });
  }),
);

/* ---------- Saved reports ---------- */

router.get(
  '/templates',
  asyncHandler(async (req, res) => {
    const rows = await ReportTemplate.findAll({ order: [['name', 'ASC']] });
    res.json(rows.filter((t) => mayRun(req.user, t)).map(shape));
  }),
);

/** GET /api/report-designer/pages: the screens a report can be attached to. */
router.get(
  '/pages',
  asyncHandler(async (_req, res) => res.json(REPORT_PAGES.map(({ key, label }) => ({ key, label })))),
);

/**
 * GET /api/report-designer/templates/for-page?page=students: the reports attached to that screen that this login may run and may
 * export. A screen shows these by itself with <PageReports page="students" />, so a new report needs no change to the screen.
 */
router.get(
  '/templates/for-page',
  asyncHandler(async (req, res) => {
    const page = String(req.query.page ?? '');
    if (!REPORT_PAGES.some((p) => p.key === page)) throw badRequest('Unknown page');
    const out = [];
    for (const t of await ReportTemplate.findAll({ order: [['name', 'ASC']] })) {
      if (!pagesOf(t.pages).includes(page) || !mayRun(req.user, t)) continue;
      if (!(await canExport(req.user, t))) continue;
      const { id, name, kind, board, folderId, description } = shape(t);
      out.push({ id, name, kind, board, folderId, description });
    }
    res.json(out);
  }),
);

/**
 * GET /api/report-designer/templates/by-name?name=&folder=: one saved report found by its name, for the <ReportButton> that any screen
 * can drop in. It answers only for a report this login may run, so a role that may not looks the same as a report that does not exist.
 * If two folders hold a report of that name, the folder must be given.
 */
router.get(
  '/templates/by-name',
  asyncHandler(async (req, res) => {
    const name = String(req.query.name ?? '').trim();
    if (!name) throw badRequest('Give the report name');
    const where = { name };
    if (req.query.folder) {
      const folder = await ReportFolder.findOne({ where: { name: String(req.query.folder) } });
      where.folderId = folder ? folder.id : -1;
    }
    const found = [];
    for (const t of await ReportTemplate.findAll({ where }))
      if (mayRun(req.user, t) && (await canExport(req.user, t))) found.push(t);
    if (!found.length) throw notFound('Report not found');
    if (found.length > 1) throw conflict('More than one report has that name. Add the folder name as well');
    const { id, name: n, kind, board, folderId, description } = shape(found[0]);
    res.json({ id, name: n, kind, board, folderId, description }); // not the design: the button only needs to know what it is
  }),
);

async function save(req, tpl) {
  const name = String(req.body.name ?? '')
    .trim()
    .slice(0, 120);
  if (!name) throw badRequest('Give the report a name');
  const board = await cleanBoard(req.body.board);
  const folderId = req.body.folderId ? Number(req.body.folderId) : null;
  if (folderId && !(await ReportFolder.findByPk(folderId))) throw badRequest('Folder not found');
  const clash = await ReportTemplate.findOne({ where: { folderId, name } });
  if (clash && clash.id !== tpl?.id) throw conflict('That folder already has a report with this name');
  const values = {
    name,
    folderId,
    description:
      String(req.body.description ?? '')
        .trim()
        .slice(0, 255) || null,
    pages: cleanPages(req.body.pages, (message) => {
      throw badRequest(message);
    }),
    board,
    config: JSON.stringify(
      req.body.config?.kind === 'design'
        ? await cleanDesign(req.body.config, board)
        : cleanConfig(req.body.config ?? {}),
    ),
    roles:
      [
        ...new Set(splitRoles(Array.isArray(req.body.roles) ? req.body.roles.join(',') : req.body.roles)),
      ].join(',') || null,
  };
  if (tpl) await tpl.update(values);
  else return (await ReportTemplate.create({ ...values, createdByName: currentUser() })).id;
  return tpl.id;
}

router.post(
  '/templates',
  asyncHandler(async (req, res) => {
    adminOnly(req);
    res.status(201).json({ id: await save(req, null) });
  }),
);

router.put(
  '/templates/:id',
  asyncHandler(async (req, res) => {
    adminOnly(req);
    const tpl = await ReportTemplate.findByPk(req.params.id);
    if (!tpl) throw notFound('Report not found');
    res.json({ id: await save(req, tpl) });
  }),
);

router.delete(
  '/templates/:id',
  asyncHandler(async (req, res) => {
    adminOnly(req);
    if (!(await ReportTemplate.destroy({ where: { id: req.params.id } }))) throw notFound('Report not found');
    res.json({ ok: true });
  }),
);

/** Runs a saved report. A role that is not named on it is told it does not exist, so reports cannot be probed. */
async function loadRunnable(req, forExport = false) {
  const tpl = await ReportTemplate.findByPk(req.params.id);
  if (!tpl || !mayRun(req.user, tpl)) throw notFound('Report not found');
  if (forExport) await assertCanExport(req.user, tpl);
  const config = JSON.parse(tpl.config);
  if (config.kind === 'design')
    throw badRequest('This is a designed report. Generate it as PDF or Excel instead');
  return { tpl, config };
}

router.post(
  '/templates/:id/run',
  asyncHandler(async (req, res) => {
    const { tpl, config } = await loadRunnable(req);
    res.json({ name: tpl.name, title: config.title ?? tpl.name, ...(await runReport(requestOf(config))) });
  }),
);

router.post(
  '/templates/:id/csv',
  asyncHandler(async (req, res) => {
    const { tpl, config } = await loadRunnable(req, true);
    res.set({
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${tpl.name.replace(/[^A-Za-z0-9._-]+/g, '-')}-${today()}.csv"`,
      'Cache-Control': 'no-store',
    });
    res.send('﻿' + (await reportCsv(requestOf(config))));
  }),
);

/**
 * POST /api/report-designer/print { templateId } or { request, title }: a table report as a clean PDF, so Print gives the report
 * and nothing else. A saved report needs the role to be allowed to run it; an unsaved one (from Quick Reports) is for the admin.
 */
router.post(
  '/print',
  asyncHandler(async (req, res) => {
    let request;
    let title;
    if (req.body.templateId) {
      const tpl = await ReportTemplate.findByPk(req.body.templateId);
      if (!tpl || !mayRun(req.user, tpl)) throw notFound('Report not found');
      await assertCanExport(req.user, tpl);
      const config = JSON.parse(tpl.config);
      if (config.kind === 'design') throw badRequest('This is a designed report. Use PDF to build it');
      request = requestOf(config);
      title = config.title ?? tpl.name;
    } else {
      adminOnly(req);
      request = req.body.request;
      title =
        String(req.body.title ?? '')
          .trim()
          .slice(0, 120) || 'Report';
    }
    const result = await runReport(request); // checks the dataset, columns and filters, and applies them
    const set = datasetColumns().find((d) => d.key === request.dataset);
    const pdf = await renderPdfNow(
      tableDesign({ title, dataset: request.dataset, columns: result.columns, allColumns: set.columns }),
      result.rows,
    );
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'inline; filename="report.pdf"',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    });
    res.send(pdf);
  }),
);

/* ---------- Visual designs: preview, runs, history, downloads ---------- */

/** Live preview: a PDF of the first rows of the design being edited. Admin only, nothing is stored. */
router.post(
  '/designs/preview',
  asyncHandler(async (req, res) => {
    adminOnly(req);
    const board = await cleanBoard(req.body.board);
    const { design } = await cleanDesign({ design: req.body.design }, board);
    const pdf = await previewPdf(design, board);
    res.set({
      'Content-Type': 'application/pdf',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    });
    res.send(pdf);
  }),
);

/** The dataset columns the designer offers to drag onto the canvas. */
router.get(
  '/designs/fields',
  asyncHandler(async (req, res) => {
    adminOnly(req);
    res.json(datasetColumns());
  }),
);

const runShape = (r) => ({
  id: r.id,
  templateId: r.templateId,
  report: r.templateName,
  format: r.format,
  status: r.status,
  rows: r.rowCount,
  size: r.sizeBytes,
  fileName: r.fileName,
  error: r.error,
  by: r.userName,
  role: r.role,
  requestedAt: r.createdAt,
  finishedAt: r.finishedAt,
  expiresAt: r.expiresAt,
  ready: r.status === 'done',
});

/** A run belongs to whoever started it. Only the built-in admin can see other people's, and anything else looks like it does not exist. */
async function ownRun(req) {
  const run = await ReportRun.findByPk(req.params.id);
  if (!run || (!isAdmin(req.user) && run.userId !== req.user.id)) throw notFound('Report not found');
  return run;
}

// POST /api/report-designer/runs { templateId, format: 'pdf' | 'xlsx' }: builds a saved design on the server
router.post(
  '/runs',
  asyncHandler(async (req, res) => {
    const tpl = await ReportTemplate.findByPk(req.body.templateId);
    if (!tpl || !mayRun(req.user, tpl)) throw notFound('Report not found');
    await assertCanExport(req.user, tpl);
    const config = JSON.parse(tpl.config);
    if (config.kind !== 'design') throw badRequest('This report is run on screen, not as a file');
    const run = await startRun({
      template: tpl,
      design: config.design,
      user: req.user,
      format: req.body.format,
    });
    res.status(run.status === 'done' ? 201 : 202).json(runShape(run));
  }),
);

// GET /api/report-designer/runs: your history (the admin sees everyone's), newest first
router.get(
  '/runs',
  asyncHandler(async (req, res) => {
    const where = isAdmin(req.user) ? {} : { userId: req.user.id };
    if (req.query.templateId) where.templateId = Number(req.query.templateId);
    const rows = await ReportRun.findAll({ where, order: [['createdAt', 'DESC']], limit: 200 });
    res.json({ runs: rows.map(runShape), queue: isAdmin(req.user) ? queueState() : undefined });
  }),
);

router.get(
  '/runs/:id',
  asyncHandler(async (req, res) => res.json(runShape(await ownRun(req)))),
);

// GET /api/report-designer/runs/:id/download[?inline=1]: the finished file, only for its owner, through the JWT
router.get(
  '/runs/:id/download',
  asyncHandler(async (req, res) => {
    const run = await ownRun(req);
    const { file, type, fileName } = await openRunFile(run);
    res.set({
      'Content-Type': type,
      'Content-Disposition': `${req.query.inline === '1' && run.format === 'pdf' ? 'inline' : 'attachment'}; filename="${fileName}"`,
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    });
    fsSync
      .createReadStream(file)
      .on('error', () => res.destroy())
      .pipe(res);
  }),
);

// DELETE /api/report-designer/runs/:id: deletes the file now; the history row stays
router.delete(
  '/runs/:id',
  asyncHandler(async (req, res) => {
    await discardRunFile(await ownRun(req));
    res.json({ ok: true });
  }),
);

export default router;
