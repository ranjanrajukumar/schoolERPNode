import { Router } from 'express';
import { Payslip, Staff, StaffSalary, sequelize } from '../../models/index.js';
import { requireRole } from '../../middleware/authMiddleware.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { badRequest, conflict, notFound } from '../../utils/httpError.js';
import { fromCents, toCents, today } from '../../utils/money.js';

const router = Router();

// Separation of duties: the accountant prepares salaries and payslips; only an admin approves a payment,
// and the approver is recorded on the payslip.
const approver = requireRole('admin');
const MONTH = /^\d{4}-(0[1-9]|1[0-2])$/;

const net = ({ basic, allowances, deductions }) =>
  fromCents(toCents(basic) + toCents(allowances) - toCents(deductions));

const staffName = (s) => `${s.firstName} ${s.lastName}`;

// GET /api/payroll/salaries -> every active staff member with their salary terms (if set)
router.get('/salaries', asyncHandler(async (_req, res) => {
  const staff = await Staff.findAll({ where: { status: 'active' }, include: [StaffSalary], order: [['firstName', 'ASC']] });
  res.json(staff.map((s) => ({
    staffId: s.id,
    staffNo: s.staffNo,
    name: staffName(s),
    basic: s.StaffSalary?.basic ?? null,
    allowances: s.StaffSalary?.allowances ?? null,
    deductions: s.StaffSalary?.deductions ?? null,
  })));
}));

// PUT /api/payroll/salaries/:staffId { basic, allowances, deductions }
router.put('/salaries/:staffId', asyncHandler(async (req, res) => {
  const { basic, allowances = 0, deductions = 0 } = req.body;
  if (basic === undefined || basic === '') throw badRequest('Basic salary is required');
  if (toCents(deductions) > toCents(basic) + toCents(allowances)) throw badRequest('Deductions exceed the gross salary');
  if (!(await Staff.findByPk(req.params.staffId))) throw notFound('Staff not found');
  await StaffSalary.upsert({ staffId: req.params.staffId, basic, allowances, deductions });
  res.json({ ok: true });
}));

// GET /api/payroll/payslips?month=YYYY-MM
router.get('/payslips', asyncHandler(async (req, res) => {
  const { month } = req.query;
  if (!MONTH.test(month ?? '')) throw badRequest('month must be YYYY-MM');
  const rows = await Payslip.findAll({ where: { month }, include: [{ model: Staff, required: true }], order: [['id', 'ASC']] });
  res.json(rows.map((p) => ({ ...p.toJSON(), Staff: undefined, staffName: staffName(p.Staff), staffNo: p.Staff.staffNo })));
}));

/** Creates a draft payslip for each active staff member with salary terms; existing ones are left alone. */
router.post('/generate', asyncHandler(async (req, res) => {
  const { month } = req.body;
  if (!MONTH.test(month ?? '')) throw badRequest('month must be YYYY-MM');

  const salaries = await StaffSalary.findAll({ include: [{ model: Staff, where: { status: 'active' }, attributes: [] }] });
  const existing = new Set((await Payslip.findAll({ where: { month }, attributes: ['staffId'] })).map((p) => p.staffId));
  const rows = salaries
    .filter((s) => !existing.has(s.staffId))
    .map((s) => ({
      staffId: s.staffId, month, basic: s.basic, allowances: s.allowances, deductions: s.deductions, net: net(s),
    }));
  if (rows.length) await Payslip.bulkCreate(rows);
  res.json({ created: rows.length, skipped: salaries.length - rows.length });
}));

router.post('/payslips/:id/pay', approver, asyncHandler(async (req, res) => {
  await sequelize.transaction(async (transaction) => {
    const slip = await Payslip.findByPk(req.params.id, { transaction, lock: transaction.LOCK.UPDATE });
    if (!slip) throw notFound('Payslip not found');
    if (slip.status === 'paid') throw conflict('This payslip is already paid');
    await slip.update({ status: 'paid', paidOn: today(), paidByName: req.user.name }, { transaction });
  });
  res.json({ ok: true });
}));

// Only drafts can be removed (e.g. to regenerate after changing salary terms).
router.delete('/payslips/:id', asyncHandler(async (req, res) => {
  const slip = await Payslip.findByPk(req.params.id);
  if (!slip) throw notFound('Payslip not found');
  if (slip.status === 'paid') throw conflict('A paid payslip cannot be deleted');
  await slip.destroy();
  res.json({ ok: true });
}));

export default router;
