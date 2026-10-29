import { Router } from 'express';
import { Op } from 'sequelize';
import { AuditLog } from '../../models/index.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { badRequest } from '../../utils/httpError.js';

const router = Router();
const MAX_PAGE_SIZE = 100;
const METHODS = ['GET', 'POST', 'PUT', 'DELETE'];
const DAY = /^\d{4}-\d{2}-\d{2}$/;
const escapeLike = (text) => text.replace(/[\\%_]/g, (c) => `\\${c}`);

// GET /api/audit/resources -> the areas that appear in the log, so the filter never lags behind the system
router.get(
  '/resources',
  asyncHandler(async (_req, res) => {
    const rows = await AuditLog.findAll({
      attributes: ['resource'],
      group: ['resource'],
      order: [['resource', 'ASC']],
      raw: true,
    });
    res.json(rows.map((r) => r.resource));
  }),
);

// GET /api/audit?resource=&userId=&method=&from=&to=&q=&page=&pageSize=  -> { rows, total, page, pageSize }, newest first
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const { resource, userId, method, from, to, q } = req.query;
    const size = Math.min(Math.max(Number(req.query.pageSize) || 25, 1), MAX_PAGE_SIZE);
    const page = Math.max(Number(req.query.page) || 1, 1);
    if (method && !METHODS.includes(method)) throw badRequest('Unknown method');
    if ((from && !DAY.test(from)) || (to && !DAY.test(to)))
      throw badRequest('Dates must look like 2026-10-24');

    const where = { ...(resource && { resource }), ...(userId && { userId }), ...(method && { method }) };
    if (from || to)
      where.createdAt = {
        ...(from && { [Op.gte]: new Date(`${from}T00:00:00`) }),
        ...(to && { [Op.lt]: new Date(new Date(`${to}T00:00:00`).getTime() + 86400000) }),
      };
    if (q && String(q).trim()) {
      const like = `%${escapeLike(String(q).trim())}%`;
      where[Op.or] = [
        { userName: { [Op.like]: like } },
        { path: { [Op.like]: like } },
        { details: { [Op.like]: like } },
      ];
    }

    const { rows, count } = await AuditLog.findAndCountAll({
      where,
      order: [['id', 'DESC']],
      limit: size,
      offset: (page - 1) * size,
    });
    res.json({ rows, total: count, page, pageSize: size });
  }),
);

export default router;
