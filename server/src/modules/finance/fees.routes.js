import { Router } from 'express';
import { Fee } from '../../models/index.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { badRequest, notFound } from '../../utils/httpError.js';
import {
  FEE_FIELDS,
  deleteFee,
  generateForClass,
  getReceipt,
  listFees,
  listPayments,
  recordPayment,
  updateFee,
} from './fees.service.js';

import {
  adjustFee,
  applyLateFines,
  listAdjustments,
  listPaymentHistory,
  refundPayment,
} from './adjustments.service.js';

const router = Router();

const pick = (body) =>
  Object.fromEntries(
    FEE_FIELDS.filter((f) => body[f] !== undefined).map((f) => [f, body[f] === '' ? null : body[f]]),
  );

/**
 * @openapi
 * /fees:
 *   get:
 *     tags: [Fees]
 *     summary: List fee charges, filterable
 *     parameters:
 *       - in: query
 *         name: studentId
 *         schema: { type: integer }
 *       - in: query
 *         name: classId
 *         schema: { type: integer }
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [paid, partial, overdue, unpaid] }
 *     responses:
 *       200: { description: Matching fee charges }
 *   post:
 *     tags: [Fees]
 *     summary: Create a one-off fee charge for a student
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [studentId, title, amount]
 *             properties:
 *               studentId: { type: integer }
 *               title: { type: string }
 *               amount: { type: number }
 *     responses:
 *       201: { description: Fee created }
 *       400: { description: Student, title and amount are required }
 */
// GET /api/fees?studentId=&classId=&status=paid|partial|overdue|unpaid
router.get(
  '/',
  asyncHandler(async (req, res) => res.json(await listFees(req.query))),
);

router.post(
  '/',
  asyncHandler(async (req, res) => {
    const data = pick(req.body);
    if (!data.studentId || !data.title || data.amount === undefined)
      throw badRequest('Student, title and amount are required');
    res.status(201).json({ id: (await Fee.create(data)).id });
  }),
);

// POST /api/fees/generate { classId, structureId? } bills every active student in the class
router.post(
  '/generate',
  asyncHandler(async (req, res) => res.json(await generateForClass(req.body))),
);

// GET /api/fees/payments?studentId= -> payment history with refunded/refundable amounts
router.get(
  '/payments',
  asyncHandler(async (req, res) => res.json(await listPaymentHistory(req.query))),
);

// POST /api/fees/payments/:paymentId/refund { amount, reason }
router.post(
  '/payments/:paymentId/refund',
  asyncHandler(async (req, res) => {
    res.status(201).json({ id: await refundPayment(req.params.paymentId, req.body, req.user.id) });
  }),
);

// POST /api/fees/late-fines { amount } -> flat late fee on every overdue fee not yet charged one
router.post(
  '/late-fines',
  asyncHandler(async (req, res) => res.json(await applyLateFines(req.body, req.user.id))),
);

router.get(
  '/adjustments',
  asyncHandler(async (req, res) => res.json(await listAdjustments(req.query.feeId))),
);

// POST /api/fees/:id/adjustments { kind: discount|fine, amount, reason }
router.post(
  '/:id/adjustments',
  asyncHandler(async (req, res) => {
    res.status(201).json({ id: await adjustFee(req.params.id, req.body, req.user.id) });
  }),
);

router.get(
  '/receipts/:paymentId',
  asyncHandler(async (req, res) => {
    const receipt = await getReceipt(req.params.paymentId);
    if (!receipt) throw notFound('Receipt not found');
    res.json(receipt);
  }),
);

router.put(
  '/:id',
  asyncHandler(async (req, res) => {
    if (!(await updateFee(req.params.id, pick(req.body)))) throw notFound('Fee not found');
    res.json({ ok: true });
  }),
);

router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    if (!(await deleteFee(req.params.id))) throw notFound('Fee not found');
    res.json({ ok: true });
  }),
);

/**
 * @openapi
 * /fees/{id}/payments:
 *   get:
 *     tags: [Fees]
 *     summary: Payments recorded against one fee charge
 *     parameters:
 *       - $ref: '#/components/parameters/IdParam'
 *     responses:
 *       200: { description: The fee's payments }
 *   post:
 *     tags: [Fees]
 *     summary: Record a payment against a fee charge
 *     parameters:
 *       - $ref: '#/components/parameters/IdParam'
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [amount, method]
 *             properties:
 *               amount: { type: number }
 *               method: { type: string }
 *               paidOn: { type: string, format: date }
 *     responses:
 *       201:
 *         description: Payment recorded
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id: { type: integer }
 *                 receiptNo: { type: string }
 */
router.get(
  '/:id/payments',
  asyncHandler(async (req, res) => res.json(await listPayments(req.params.id))),
);

// POST /api/fees/:id/payments { amount, method, paidOn? } -> { id, receiptNo }
router.post(
  '/:id/payments',
  asyncHandler(async (req, res) => {
    const payment = await recordPayment(req.params.id, req.body, req.user.id);
    res.status(201).json({ id: payment.id, receiptNo: payment.receiptNo });
  }),
);

export default router;
