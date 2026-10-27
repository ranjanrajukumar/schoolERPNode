import { Router } from 'express';
import { Op, fn, col } from 'sequelize';
import { Attendance, Expense, Income, Payment, Refund, SchoolClass, Student } from '../../models/index.js';
import { requireRole } from '../../middleware/authMiddleware.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { badRequest } from '../../utils/httpError.js';
import { fromCents, toCents, today } from '../../utils/money.js';
import { listFees } from '../finance/fees.service.js';

const router = Router();
const finance = requireRole('admin', 'accountant');

// GET /api/reports/fee-defaulters  -> students with overdue balances, largest first
router.get('/fee-defaulters', finance, asyncHandler(async (_req, res) => {
  const overdue = await listFees({ status: 'overdue' });
  const byStudent = new Map();
  for (const fee of overdue) {
    const row = byStudent.get(fee.studentId)
      ?? { studentId: fee.studentId, studentName: fee.studentName, admissionNo: fee.admissionNo, items: 0, cents: 0 };
    row.items += 1;
    row.cents += toCents(fee.balance);
    byStudent.set(fee.studentId, row);
  }
  res.json([...byStudent.values()]
    .sort((a, b) => b.cents - a.cents)
    .map(({ cents, ...row }) => ({ ...row, balance: fromCents(cents) })));
}));

// GET /api/reports/collection?from=&to=  -> money received, by method and by day
router.get('/collection', finance, asyncHandler(async (req, res) => {
  const from = req.query.from || `${today().slice(0, 8)}01`;
  const to = req.query.to || today();
  const where = { paidOn: { [Op.between]: [from, to] } };

  const [byMethod, byDay] = await Promise.all([
    Payment.findAll({ where, attributes: ['method', [fn('SUM', col('amount')), 'total'], [fn('COUNT', col('id')), 'count']], group: ['method'], raw: true }),
    Payment.findAll({ where, attributes: ['paidOn', [fn('SUM', col('amount')), 'total']], group: ['paidOn'], order: [['paidOn', 'ASC']], raw: true }),
  ]);
  const totalCents = byMethod.reduce((sum, r) => sum + toCents(r.total), 0);
  res.json({ from, to, total: fromCents(totalCents), byMethod, byDay });
}));

// GET /api/reports/finance?from=&to=  -> income vs expenses (fee money is net of refunds)
router.get('/finance', finance, asyncHandler(async (req, res) => {
  const from = req.query.from || `${today().slice(0, 8)}01`;
  const to = req.query.to || today();
  const between = (column) => ({ [column]: { [Op.between]: [from, to] } });

  const [fees, refunds, otherIncome, expenses, byCategory] = await Promise.all([
    Payment.sum('amount', { where: between('paidOn') }),
    Refund.sum('amount', { where: between('refundedOn') }),
    Income.sum('amount', { where: between('receivedOn') }),
    Expense.sum('amount', { where: between('spentOn') }),
    Expense.findAll({
      where: between('spentOn'), attributes: ['category', [fn('SUM', col('amount')), 'total']],
      group: ['category'], order: [[fn('SUM', col('amount')), 'DESC']], raw: true,
    }),
  ]);

  const feeCents = toCents(fees || 0) - toCents(refunds || 0);
  const incomeCents = feeCents + toCents(otherIncome || 0);
  const expenseCents = toCents(expenses || 0);
  res.json({
    from,
    to,
    feeCollection: fromCents(feeCents),
    otherIncome: fromCents(toCents(otherIncome || 0)),
    totalIncome: fromCents(incomeCents),
    totalExpenses: fromCents(expenseCents),
    net: fromCents(incomeCents - expenseCents),
    expensesByCategory: byCategory,
  });
}));

// GET /api/reports/attendance?from=&to=&classId=  -> present/absent/late counts per student
router.get('/attendance', asyncHandler(async (req, res) => {
  const { from, to, classId } = req.query;
  if (!from || !to) throw badRequest('from and to are required');

  const students = await Student.findAll({
    where: { status: 'active', ...(classId && { classId }) },
    include: [
      { model: Attendance, required: false, where: { date: { [Op.between]: [from, to] } }, attributes: ['status'] },
      { model: SchoolClass, attributes: ['name', 'section'] },
    ],
    order: [['firstName', 'ASC']],
  });

  res.json(students.map((s) => {
    const count = (status) => s.Attendances.filter((a) => a.status === status).length;
    const days = s.Attendances.length;
    const attended = days - count('absent');
    return {
      studentId: s.id,
      admissionNo: s.admissionNo,
      name: `${s.firstName} ${s.lastName}`,
      className: s.SchoolClass ? `${s.SchoolClass.name}-${s.SchoolClass.section}` : null,
      present: count('present'),
      late: count('late'),
      absent: count('absent'),
      days,
      percentage: days ? Math.round((attended / days) * 1000) / 10 : null,
    };
  }));
}));

export default router;
