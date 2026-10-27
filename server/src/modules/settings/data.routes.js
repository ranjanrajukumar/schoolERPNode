import express, { Router } from 'express';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { badRequest } from '../../utils/httpError.js';
import {
  backupSummary, datasetColumns, reportCsv, runReport, createBackup, exportCsv, exportList, restoreBackup,
} from './data.service.js';
import { importerList, previewImport, runImport, templateCsv } from './importers.js';
import { today } from '../../utils/money.js';

// Mounted behind requireRole('admin').
const router = Router();
const csv = (res, name, body) => {
  res.set({ 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="${name}"`, 'Cache-Control': 'no-store' });
  res.send(body);
};

router.get('/datasets', (_req, res) => res.json(datasetColumns()));
router.post('/report', asyncHandler(async (req, res) => res.json(await runReport(req.body))));
router.post('/report/csv', asyncHandler(async (req, res) => csv(res, `report-${today()}.csv`, await reportCsv(req.body))));

router.get('/exports', (_req, res) => res.json(exportList()));
router.get('/export/:dataset', asyncHandler(async (req, res) => csv(res, `${req.params.dataset}-${today()}.csv`, await exportCsv(req.params.dataset))));

// Bulk loading from spreadsheets. The file is sent as the plain-text body; bodies are replaced afterwards so the audit
// log records a summary, not the file. Everything is checked first and imported all-or-nothing.
router.get('/import/datasets', asyncHandler(async (_req, res) => res.json(await importerList())));
router.get('/import/:kind/template', (req, res) => csv(res, `${req.params.kind}-template.csv`, templateCsv(req.params.kind)));

const text = express.text({ type: () => true, limit: '5mb' });
router.post('/import/:kind/preview', text, asyncHandler(async (req, res) => {
  const body = req.body;
  req.body = { kind: req.params.kind, bytes: String(body).length };
  res.json(await previewImport(req.params.kind, body));
}));
router.post('/import/:kind', text, asyncHandler(async (req, res) => {
  const body = req.body;
  req.body = { kind: req.params.kind, bytes: String(body).length };
  res.json(await runImport(req.params.kind, body));
}));

router.get('/backup/summary', asyncHandler(async (_req, res) => res.json(await backupSummary())));
router.get('/backup', asyncHandler(async (req, res) => {
  const backup = await createBackup();
  res.set({ 'Content-Type': 'application/json; charset=utf-8', 'Content-Disposition': `attachment; filename="school-erp-backup-${today()}.json"`, 'Cache-Control': 'no-store' });
  res.send(JSON.stringify(backup));
}));

// POST /api/data/restore?confirm=RESTORE  with the backup file as the plain-text body. Replaces every table.
router.post('/restore', express.text({ type: () => true, limit: '200mb' }), asyncHandler(async (req, res) => {
  if (req.query.confirm !== 'RESTORE') throw badRequest('Type RESTORE to confirm');
  const body = req.body;
  req.body = { bytes: String(body).length };
  res.json(await restoreBackup(body));
}));

export default router;
