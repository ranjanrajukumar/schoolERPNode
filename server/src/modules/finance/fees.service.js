import { Fee, FeeStructure, Payment, SchoolClass, Student, sequelize } from '../../models/index.js';
import { badRequest, conflict, notFound } from '../../utils/httpError.js';
import { fromCents, toCents, today } from '../../utils/money.js';

export const FEE_FIELDS = ['studentId', 'title', 'amount', 'dueDate'];

import { PAYMENT_METHODS } from './paymentRules.js';

const METHODS = PAYMENT_METHODS.all;

/** paid / partial / overdue / unpaid, derived from the amounts and due date. */
function feeStatus(amountCents, paidCents, dueDate) {
  if (paidCents >= amountCents) return 'paid';
  if (dueDate && dueDate < today()) return 'overdue';
  return paidCents > 0 ? 'partial' : 'unpaid';
}

function shapeFee(fee) {
  const { Student: student, ...rest } = fee.toJSON();
  const amount = toCents(rest.amount);
  const paid = toCents(rest.paidAmount);
  return {
    ...rest,
    studentName: `${student.firstName} ${student.lastName}`,
    admissionNo: student.admissionNo,
    classId: student.classId,
    balance: fromCents(amount - paid),
    status: feeStatus(amount, paid, rest.dueDate),
  };
}

/** Fees with student name, balance and status. Optional filters: studentId, classId, status. */
export async function listFees({ studentId, classId, status } = {}) {
  const rows = await Fee.findAll({
    where: studentId ? { studentId } : {},
    include: [
      {
        model: Student,
        attributes: ['firstName', 'lastName', 'admissionNo', 'classId'],
        required: true,
        where: classId ? { classId } : {},
      },
    ],
    order: [['id', 'DESC']],
  });
  const fees = rows.map(shapeFee);
  return status ? fees.filter((f) => f.status === status) : fees;
}

/**
 * Bills the given students for one fee item. A student who already has a fee with the same
 * title is skipped, so running a generation twice never double-bills.
 */
export async function billStudents(studentIds, { title, amount, dueDate }, transaction) {
  const existing = await Fee.findAll({
    where: { title, studentId: studentIds },
    attributes: ['studentId'],
    transaction,
  });
  const billed = new Set(existing.map((f) => f.studentId));
  const rows = studentIds
    .filter((id) => !billed.has(id))
    .map((studentId) => ({ studentId, title, amount, dueDate: dueDate || null }));
  if (rows.length) await Fee.bulkCreate(rows, { transaction });
  return { created: rows.length, skipped: studentIds.length - rows.length };
}

/** Applies fee structure items to every active student of a class (all items, or just `structureId`). */
export async function generateForClass({ classId, structureId }) {
  if (!classId) throw badRequest('Class is required');
  if (!(await SchoolClass.findByPk(classId))) throw notFound('Class not found');

  const items = await FeeStructure.findAll({ where: { classId, ...(structureId && { id: structureId }) } });
  if (!items.length) throw badRequest('This class has no fee structure items');

  const students = await Student.findAll({ where: { classId, status: 'active' }, attributes: ['id'] });
  const ids = students.map((s) => s.id);

  let created = 0;
  let skipped = 0;
  await sequelize.transaction(async (transaction) => {
    for (const item of items) {
      const result = await billStudents(ids, item, transaction);
      created += result.created;
      skipped += result.skipped;
    }
  });
  return { students: ids.length, created, skipped };
}

/**
 * Records a payment against a fee. The fee row is locked so two cashiers paying at the same
 * moment cannot overpay it. Receipt numbers are derived from the payment id.
 */
export async function recordPayment(feeId, { amount, method = 'cash', paidOn }, receivedBy) {
  const cents = toCents(amount);
  if (!Number.isFinite(cents) || cents <= 0) throw badRequest('Payment amount must be greater than zero');
  if (!METHODS.includes(method)) throw badRequest('Payment method is invalid');
  if (!(await PAYMENT_METHODS.enabled()).includes(method))
    throw badRequest(`The school does not accept ${method} payments (see Settings → Payments)`);
  const partialAllowed = await PAYMENT_METHODS.partialAllowed();
  const prefix = await PAYMENT_METHODS.receiptPrefix();

  return sequelize.transaction(async (transaction) => {
    const fee = await Fee.findByPk(feeId, { transaction, lock: transaction.LOCK.UPDATE });
    if (!fee) throw notFound('Fee not found');

    const balance = toCents(fee.amount) - toCents(fee.paidAmount);
    if (cents > balance) throw conflict(`Payment exceeds the balance of ${fromCents(balance)}`);
    if (!partialAllowed && cents !== balance)
      throw conflict(`Part payments are switched off: pay the full balance of ${fromCents(balance)}`);

    const payment = await Payment.create(
      {
        feeId,
        amount: fromCents(cents),
        method,
        paidOn: paidOn || today(),
        receivedBy,
        receiptNo: `TMP-${crypto.randomUUID().replaceAll('-', '').slice(0, 20)}`,
      },
      { transaction },
    );
    await payment.update({ receiptNo: `${prefix}-${String(payment.id).padStart(6, '0')}` }, { transaction });
    await fee.update({ paidAmount: fromCents(toCents(fee.paidAmount) + cents) }, { transaction });
    return payment;
  });
}

export async function listPayments(feeId) {
  return Payment.findAll({ where: { feeId }, order: [['id', 'DESC']] });
}

/** Everything a printed receipt needs. */
export async function getReceipt(paymentId) {
  const payment = await Payment.findByPk(paymentId, {
    include: [{ model: Fee, include: [{ model: Student, include: [SchoolClass] }] }],
  });
  if (!payment) return null;
  const { Fee: fee } = payment;
  const student = fee.Student;
  return {
    receiptNo: payment.receiptNo,
    paidOn: payment.paidOn,
    method: payment.method,
    amount: payment.amount,
    fee: {
      id: fee.id,
      title: fee.title,
      amount: fee.amount,
      paidAmount: fee.paidAmount,
      balance: fromCents(toCents(fee.amount) - toCents(fee.paidAmount)),
    },
    student: {
      id: student.id,
      admissionNo: student.admissionNo,
      name: `${student.firstName} ${student.lastName}`,
      className: student.SchoolClass ? `${student.SchoolClass.name}-${student.SchoolClass.section}` : null,
    },
  };
}

/**
 * Edits a fee's title or due date. The student cannot be changed (it would move payments to someone else),
 * and once a payment exists the amount can only change through discounts and fines, which leave a record.
 */
export async function updateFee(id, data) {
  return sequelize.transaction(async (transaction) => {
    const fee = await Fee.findByPk(id, { transaction, lock: transaction.LOCK.UPDATE });
    if (!fee) return false;
    if (data.studentId !== undefined && Number(data.studentId) !== fee.studentId)
      throw conflict('A fee cannot be moved to another student; delete it and bill the right student');
    if (
      data.amount !== undefined &&
      toCents(data.amount) !== toCents(fee.amount) &&
      (toCents(fee.paidAmount) > 0 || (await Payment.count({ where: { feeId: id }, transaction })))
    ) {
      throw conflict('This fee has payments; use a discount or fine to change its amount');
    }
    const { studentId, ...changes } = data;
    await fee.update(changes, { transaction });
    return true;
  });
}

/** Deleting a fee also deletes its payments and refunds, so any fee with payment history is kept for the books. */
export async function deleteFee(id) {
  return sequelize.transaction(async (transaction) => {
    const fee = await Fee.findByPk(id, { transaction, lock: transaction.LOCK.UPDATE });
    if (!fee) return false;
    if (toCents(fee.paidAmount) > 0 || (await Payment.count({ where: { feeId: id }, transaction }))) {
      throw conflict('This fee has payments (or refunded payments) and cannot be deleted');
    }
    await fee.destroy({ transaction });
    return true;
  });
}
