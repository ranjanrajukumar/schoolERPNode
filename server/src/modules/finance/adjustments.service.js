import { Op } from 'sequelize';
import { Fee, FeeAdjustment, Payment, Refund, Student, sequelize } from '../../models/index.js';
import { badRequest, conflict, notFound } from '../../utils/httpError.js';
import { fromCents, toCents, today } from '../../utils/money.js';

export const LATE_FEE_REASON = 'Late fee';

function positiveCents(amount, label) {
  const cents = toCents(amount);
  if (!Number.isFinite(cents) || cents <= 0) throw badRequest(`${label} must be greater than zero`);
  return cents;
}

function requireReason(reason) {
  if (!String(reason ?? '').trim()) throw badRequest('A reason is required');
  return reason.trim();
}

/**
 * Discounts/scholarships lower a fee and fines raise it. The fee amount itself changes, and every
 * change is kept in fee_adjustments. A discount can never push the amount below what is already paid.
 */
export async function adjustFee(feeId, { kind, amount, reason }, userId) {
  if (!['discount', 'fine'].includes(kind)) throw badRequest('Kind must be discount or fine');
  const cents = positiveCents(amount, 'Amount');
  const why = requireReason(reason);

  return sequelize.transaction(async (transaction) => {
    const fee = await Fee.findByPk(feeId, { transaction, lock: transaction.LOCK.UPDATE });
    if (!fee) throw notFound('Fee not found');

    const total = toCents(fee.amount);
    const next = kind === 'discount' ? total - cents : total + cents;
    if (next < toCents(fee.paidAmount)) throw conflict('A discount cannot reduce the fee below what has already been paid');

    await fee.update({ amount: fromCents(next) }, { transaction });
    const row = await FeeAdjustment.create(
      { feeId, kind, amount: fromCents(cents), reason: why, createdBy: userId }, { transaction },
    );
    return row.id;
  });
}

export async function listAdjustments(feeId) {
  return FeeAdjustment.findAll({ where: feeId ? { feeId } : {}, order: [['id', 'DESC']] });
}

/**
 * Adds a flat late fee to every overdue, unsettled fee that has not been charged one before,
 * so running it repeatedly never stacks fines.
 */
export async function applyLateFines({ amount }, userId) {
  const cents = positiveCents(amount, 'Late fee');
  return sequelize.transaction(async (transaction) => {
    const overdue = await Fee.findAll({
      where: { dueDate: { [Op.lt]: today() }, [Op.and]: [sequelize.literal('paid_amount < amount')] },
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    const charged = new Set((await FeeAdjustment.findAll({
      where: { kind: 'fine', reason: LATE_FEE_REASON, feeId: overdue.map((f) => f.id) }, transaction,
    })).map((a) => a.feeId));

    let applied = 0;
    for (const fee of overdue.filter((f) => !charged.has(f.id))) {
      await fee.update({ amount: fromCents(toCents(fee.amount) + cents) }, { transaction });
      await FeeAdjustment.create(
        { feeId: fee.id, kind: 'fine', amount: fromCents(cents), reason: LATE_FEE_REASON, createdBy: userId }, { transaction },
      );
      applied += 1;
    }
    return { applied, skipped: overdue.length - applied };
  });
}

/** Every payment with student, fee and how much of it has been refunded. */
export async function listPaymentHistory({ studentId } = {}) {
  const rows = await Payment.findAll({
    include: [
      { model: Fee, required: true, where: studentId ? { studentId } : {}, include: [{ model: Student, attributes: ['firstName', 'lastName', 'admissionNo'] }] },
      { model: Refund, required: false },
    ],
    order: [['id', 'DESC']],
  });
  return rows.map((p) => {
    const refunded = p.Refunds.reduce((sum, r) => sum + toCents(r.amount), 0);
    return {
      id: p.id,
      receiptNo: p.receiptNo,
      paidOn: p.paidOn,
      method: p.method,
      amount: p.amount,
      refunded: fromCents(refunded),
      refundable: fromCents(toCents(p.amount) - refunded),
      feeTitle: p.Fee.title,
      studentName: `${p.Fee.Student.firstName} ${p.Fee.Student.lastName}`,
      admissionNo: p.Fee.Student.admissionNo,
    };
  });
}

/**
 * Refunds part or all of a payment. The fee's paid amount goes back down so the balance is owed
 * again; total refunds on one payment can never exceed what was paid.
 */
export async function refundPayment(paymentId, { amount, reason }, userId) {
  const cents = positiveCents(amount, 'Refund amount');
  const why = requireReason(reason);

  return sequelize.transaction(async (transaction) => {
    const payment = await Payment.findByPk(paymentId, { transaction, lock: transaction.LOCK.UPDATE });
    if (!payment) throw notFound('Payment not found');
    const fee = await Fee.findByPk(payment.feeId, { transaction, lock: transaction.LOCK.UPDATE });

    const refunded = (await Refund.findAll({ where: { paymentId }, transaction }))
      .reduce((sum, r) => sum + toCents(r.amount), 0);
    const refundable = toCents(payment.amount) - refunded;
    if (cents > refundable) throw conflict(`Only ${fromCents(refundable)} of this payment can still be refunded`);

    await fee.update({ paidAmount: fromCents(toCents(fee.paidAmount) - cents) }, { transaction });
    const row = await Refund.create(
      { paymentId, amount: fromCents(cents), reason: why, refundedOn: today(), createdBy: userId }, { transaction },
    );
    return row.id;
  });
}
