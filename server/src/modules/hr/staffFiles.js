import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import express, { Router } from 'express';
import { Staff, StaffFile } from '../../models/index.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { badRequest, notFound } from '../../utils/httpError.js';
import { MAX_BYTES, diskPath, fileBytes, sniff } from '../files/files.service.js';

/** Contracts, certificates and ID proofs for staff. Same content checks and storage as student documents; admin only. */

const shape = (f) => ({
  id: f.id,
  staffId: f.staffId,
  title: f.title,
  originalName: f.originalName,
  mimeType: f.mimeType,
  size: f.size,
  uploadedByName: f.uploadedByName,
  createdAt: f.createdAt,
});

async function listStaffFiles(staffId) {
  if (!staffId) throw badRequest('staffId is required');
  return (await StaffFile.findAll({ where: { staffId }, order: [['id', 'DESC']] })).map(shape);
}

async function saveStaffFile({ staffId, title, originalName, buffer, uploadedByName }) {
  if (!Buffer.isBuffer(buffer) || !buffer.length) throw badRequest('No file received');
  if (buffer.length > MAX_BYTES) throw badRequest(`File is larger than ${MAX_BYTES / 1024 / 1024} MB`);
  if (!(await Staff.findByPk(staffId))) throw notFound('Staff member not found');
  const mimeType = sniff(buffer);
  if (!mimeType) throw badRequest('Only PDF, JPEG, PNG or WebP files are allowed');

  const name = String(originalName || 'file').slice(0, 255);
  const storedName = crypto.randomBytes(24).toString('hex');
  const row = await StaffFile.create({
    staffId,
    title: (String(title || '').trim() || name).slice(0, 160),
    originalName: name,
    mimeType,
    size: buffer.length,
    storedName,
    data: buffer.toString('base64'),
    uploadedByName,
  });
  return shape(row);
}

const router = Router();

router.get(
  '/',
  asyncHandler(async (req, res) => res.json(await listStaffFiles(req.query.staffId))),
);

// POST /api/staff-files?staffId=&title=&name=  with the file as the raw request body.
router.post(
  '/',
  express.raw({ type: () => true, limit: MAX_BYTES }),
  asyncHandler(async (req, res) => {
    const { staffId, title, name } = req.query;
    if (!staffId) throw badRequest('staffId is required');
    const file = await saveStaffFile({
      staffId,
      title,
      originalName: name,
      buffer: req.body,
      uploadedByName: req.user.name,
    });
    req.body = { staffId, title: file.title, size: file.size }; // audit the metadata, not the bytes
    res.status(201).json(file);
  }),
);

router.get(
  '/:id/download',
  asyncHandler(async (req, res) => {
    const row = await StaffFile.findByPk(req.params.id);
    if (!row) throw notFound('File not found');
    const buffer = await fileBytes(row);
    if (!buffer) throw notFound('File is missing from storage');
    res.set({
      'Content-Type': row.mimeType,
      'Content-Length': buffer.length,
      'Content-Disposition': `inline; filename*=UTF-8''${encodeURIComponent(row.originalName)}`,
      'X-Content-Type-Options': 'nosniff',
      'Cache-Control': 'private, no-store',
    });
    res.send(buffer);
  }),
);

router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const row = await StaffFile.findByPk(req.params.id);
    if (!row) throw notFound('File not found');
    await row.destroy();
    await fs.rm(diskPath(row.storedName), { force: true });
    res.json({ ok: true });
  }),
);

export default router;
