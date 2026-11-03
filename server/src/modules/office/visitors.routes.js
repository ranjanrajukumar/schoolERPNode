import { Router } from 'express';
import { Op } from 'sequelize';
import { OfficeVisitor } from '../../models/index.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { badRequest, conflict, notFound } from '../../utils/httpError.js';
import { currentUser } from '../../utils/requestContext.js';

const router = Router();
const text = (v, max) =>
  String(v ?? '')
    .trim()
    .slice(0, max) || null;

const startOfToday = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};

// GET /api/visitors?show=inside|today|all&q=  -> newest first
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const where = {};
    if (req.query.show === 'inside') where.checkOut = null;
    else if (req.query.show !== 'all') where.checkIn = { [Op.gte]: startOfToday() };
    const q = String(req.query.q ?? '').trim();
    if (q)
      where[Op.or] = ['visitorName', 'phone', 'organisation', 'purpose', 'whomToMeet'].map((f) => ({
        [f]: { [Op.like]: `%${q}%` },
      }));
    const rows = await OfficeVisitor.findAll({ where, order: [['checkIn', 'DESC']], limit: 500 });
    res.json(rows);
  }),
);

// POST /api/visitors { visitorName, purpose, phone?, organisation?, whomToMeet?, idProof?, badgeNo?, note? }: checks the visitor in now
router.post(
  '/',
  asyncHandler(async (req, res) => {
    const visitorName = text(req.body.visitorName, 100);
    const purpose = text(req.body.purpose, 200);
    if (!visitorName || !purpose)
      throw badRequest('The visitor’s name and the purpose of the visit are required');
    const badgeNo = text(req.body.badgeNo, 20);
    if (badgeNo && (await OfficeVisitor.findOne({ where: { badgeNo, checkOut: null } })))
      throw conflict(`Badge ${badgeNo} is still with a visitor who has not left`);
    const row = await OfficeVisitor.create({
      visitorName,
      purpose,
      phone: text(req.body.phone, 30),
      organisation: text(req.body.organisation, 120),
      whomToMeet: text(req.body.whomToMeet, 120),
      idProof: text(req.body.idProof, 80),
      badgeNo,
      note: text(req.body.note, 300),
      checkIn: new Date(),
      recordedByName: currentUser(),
    });
    res.status(201).json({ id: row.id });
  }),
);

// PUT /api/visitors/:id/checkout: records that the visitor has left, now
router.put(
  '/:id/checkout',
  asyncHandler(async (req, res) => {
    const row = await OfficeVisitor.findByPk(req.params.id);
    if (!row) throw notFound('Visitor not found');
    if (row.checkOut) throw conflict('This visitor has already been checked out');
    await row.update({ checkOut: new Date() });
    res.json({ ok: true });
  }),
);

export default router;
