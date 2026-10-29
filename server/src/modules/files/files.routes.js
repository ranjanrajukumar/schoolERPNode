import express, { Router } from 'express';
import { writeRoles } from '../../middleware/authMiddleware.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { badRequest } from '../../utils/httpError.js';
import { MAX_BYTES, deleteFile, listFiles, readFile, saveFile } from './files.service.js';

const router = Router();

router.get(
  '/',
  asyncHandler(async (req, res) => res.json(await listFiles(req.query))),
);

// POST /api/student-files?studentId=&kind=photo|document&title=&name=  with the file as the raw request body.
// Sending the bytes directly avoids a multipart parser; the file's real type is checked from its content.
router.post(
  '/',
  writeRoles('admin'),
  express.raw({ type: () => true, limit: MAX_BYTES }),
  asyncHandler(async (req, res) => {
    const { studentId, kind, title, name } = req.query;
    if (!studentId) throw badRequest('studentId is required');
    const file = await saveFile({
      studentId,
      kind,
      title,
      originalName: name,
      buffer: req.body,
      uploadedByName: req.user.name,
    });
    // Replace the byte buffer so the audit log records what was uploaded, not megabytes of data.
    req.body = { studentId, kind, title: file.title, size: file.size };
    res.status(201).json(file);
  }),
);

router.get(
  '/:id/download',
  asyncHandler(async (req, res) => {
    const { row, buffer } = await readFile(req.params.id);
    res.set({
      'Content-Type': row.mimeType,
      'Content-Length': buffer.length,
      'Content-Disposition': `inline; filename*=UTF-8''${encodeURIComponent(row.originalName)}`,
      'X-Content-Type-Options': 'nosniff',
      'Cache-Control': 'private, max-age=300',
    });
    res.send(buffer);
  }),
);

router.delete(
  '/:id',
  writeRoles('admin'),
  asyncHandler(async (req, res) => {
    await deleteFile(req.params.id);
    res.json({ ok: true });
  }),
);

export default router;
