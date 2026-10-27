import { Router } from 'express';
import { Photo } from '../../models/index.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { notFound } from '../../utils/httpError.js';
import { getSettings } from './settings.service.js';

/**
 * The school's public face: name, motto, contact details and logo, readable without signing in so the login page, the app header,
 * the footer and printouts can all show them. Only what the school would put on its own website is returned.
 */
const router = Router();

router.get('/school', asyncHandler(async (_req, res) => {
  const p = await getSettings(['school.name', 'school.motto', 'school.address', 'school.phone', 'school.email', 'school.website']);
  const logo = await Photo.findOne({ where: { entity: 'school', entityId: 0 }, attributes: ['updatedAt'] });
  res.json({
    name: p['school.name'], motto: p['school.motto'], address: p['school.address'], phone: p['school.phone'], email: p['school.email'], website: p['school.website'],
    logoVersion: logo ? new Date(logo.updatedAt).getTime() : null,
  });
}));

router.get('/school/logo', asyncHandler(async (_req, res) => {
  const row = await Photo.findOne({ where: { entity: 'school', entityId: 0 }, attributes: ['mimeType', 'data'] });
  if (!row) throw notFound('No logo has been uploaded');
  const buffer = Buffer.from(row.data, 'base64');
  res.set({ 'Content-Type': row.mimeType, 'Content-Length': buffer.length, 'X-Content-Type-Options': 'nosniff', 'Cache-Control': 'public, max-age=300' });
  res.send(buffer);
}));

export default router;
