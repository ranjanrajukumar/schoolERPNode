import { Router } from 'express';
import {
  Board,
  BoardAffiliation,
  Exam,
  SchoolClass,
  Student,
  StudentBoardRegistration,
  TimetableSlot,
} from '../../models/index.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { badRequest, conflict, notFound } from '../../utils/httpError.js';
import { currentUser } from '../../utils/requestContext.js';
import { listBoards, listRules, saveRule, verifyRule } from './boardRules.service.js';

const router = Router();

const today = () => new Date().toISOString().slice(0, 10);

/** Affiliation shown as it stands today: a 'verified' record that has run out is reported as lapsed. */
function standing(a) {
  if (!a) return 'unverified';
  if (a.status === 'verified' && a.validTo && a.validTo < today()) return 'lapsed';
  return a.status;
}

// GET /api/boards: each board, whether the software runs it, its classes, and the school's affiliation standing (separate things)
router.get(
  '/',
  asyncHandler(async (_req, res) => {
    const [boards, affiliations, classes] = await Promise.all([
      listBoards(),
      BoardAffiliation.findAll({ order: [['id', 'ASC']] }),
      SchoolClass.findAll({ attributes: ['boardId'] }),
    ]);
    res.json(
      boards.map((b) => {
        const mine = affiliations.filter((a) => a.boardId === b.id);
        const wholeSchool = mine.find((a) => !a.branchId);
        return {
          id: b.id,
          code: b.code,
          name: b.name,
          isEnabled: b.isEnabled,
          classes: classes.filter((c) => c.boardId === b.id).length,
          affiliation: standing(wholeSchool),
          affiliations: mine.map((a) => ({ ...a.toJSON(), standing: standing(a) })),
        };
      }),
    );
  }),
);

// GET /api/boards/analytics: the same figures for each board side by side
router.get(
  '/analytics',
  asyncHandler(async (_req, res) => {
    const [boards, classes, students, exams, slots, regs] = await Promise.all([
      listBoards(),
      SchoolClass.findAll({ attributes: ['id', 'boardId'], raw: true }),
      Student.findAll({ where: { status: 'active' }, attributes: ['classId'], raw: true }),
      Exam.findAll({ attributes: ['classId'], raw: true }),
      TimetableSlot.findAll({ attributes: ['classId'], raw: true }),
      StudentBoardRegistration.findAll({ attributes: ['boardId', 'status'], raw: true }),
    ]);
    const boardOf = new Map(classes.map((c) => [c.id, c.boardId]));
    const tally = (rows, id) => rows.filter((r) => boardOf.get(r.classId) === id).length;
    const reg = (id, status) => regs.filter((r) => r.boardId === id && r.status === status).length;
    res.json(
      boards.map((b) => ({
        id: b.id,
        name: b.name,
        classes: classes.filter((c) => c.boardId === b.id).length,
        students: tally(students, b.id),
        exams: tally(exams, b.id),
        timetablePeriods: tally(slots, b.id),
        registrations: {
          pending: reg(b.id, 'pending'),
          submitted: reg(b.id, 'submitted'),
          registered: reg(b.id, 'registered'),
        },
      })),
    );
  }),
);

// PUT /api/boards/:id { isEnabled }: switch the software capability on or off (a board with classes cannot be switched off)
router.put(
  '/:id',
  asyncHandler(async (req, res) => {
    const board = await Board.findByPk(req.params.id);
    if (!board) throw notFound('Board not found');
    if (req.body.isEnabled === false && (await SchoolClass.count({ where: { boardId: board.id } })))
      throw conflict(`${board.name} still has classes, so it cannot be switched off`);
    await board.update({ isEnabled: req.body.isEnabled !== false });
    res.json({ ok: true });
  }),
);

// POST /api/boards/affiliations { boardId, branchId?, affiliationNo, validFrom, validTo, sourceRef, status }
// A record can be marked verified only with an affiliation number and the document that proves it.
router.post(
  '/affiliations',
  asyncHandler(async (req, res) => {
    const {
      boardId,
      branchId,
      affiliationNo,
      validFrom,
      validTo,
      sourceRef,
      status = 'unverified',
    } = req.body;
    if (!(await Board.findByPk(boardId))) throw badRequest('Choose a board');
    if (!['unverified', 'verified', 'lapsed'].includes(status)) throw badRequest('Unknown status');
    if (status === 'verified' && (!String(affiliationNo ?? '').trim() || !String(sourceRef ?? '').trim()))
      throw badRequest(
        'To mark affiliation verified, give the affiliation number and the document that proves it',
      );
    const row = await BoardAffiliation.create({
      boardId,
      branchId: branchId || null,
      affiliationNo: affiliationNo?.trim() || null,
      validFrom: validFrom || null,
      validTo: validTo || null,
      sourceRef: sourceRef?.trim() || null,
      status,
      ...(status === 'verified' && { verifiedBy: currentUser(), verifiedOn: today() }),
    });
    res.status(201).json({ id: row.id });
  }),
);

router.put(
  '/affiliations/:id',
  asyncHandler(async (req, res) => {
    const row = await BoardAffiliation.findByPk(req.params.id);
    if (!row) throw notFound('Affiliation record not found');
    const next = {
      affiliationNo: (req.body.affiliationNo ?? row.affiliationNo)?.trim?.() || null,
      sourceRef: (req.body.sourceRef ?? row.sourceRef)?.trim?.() || null,
      validFrom: req.body.validFrom ?? row.validFrom,
      validTo: req.body.validTo ?? row.validTo,
      status: req.body.status ?? row.status,
    };
    if (!['unverified', 'verified', 'lapsed'].includes(next.status)) throw badRequest('Unknown status');
    if (next.status === 'verified' && (!next.affiliationNo || !next.sourceRef))
      throw badRequest(
        'To mark affiliation verified, give the affiliation number and the document that proves it',
      );
    await row.update({
      ...next,
      ...(next.status === 'verified' &&
        row.status !== 'verified' && { verifiedBy: currentUser(), verifiedOn: today() }),
    });
    res.json({ ok: true });
  }),
);

// PUT /api/boards/rules/:ruleId/verify { sourceRef }: record that this version was checked against the board's publication
router.put(
  '/rules/:ruleId/verify',
  asyncHandler(async (req, res) => {
    await verifyRule(req.params.ruleId, req.body.sourceRef);
    res.json({ ok: true });
  }),
);

// GET /api/boards/:id/rules: every version of every rule of the board, with its history
router.get(
  '/:id/rules',
  asyncHandler(async (req, res) => res.json(await listRules(req.params.id))),
);

// POST /api/boards/:id/rules { ruleType, scopeKey, effectiveYearId?, payload, sourceRef?, changeNote? }: adds the next version
router.post(
  '/:id/rules',
  asyncHandler(async (req, res) => {
    const { ruleType, scopeKey, effectiveYearId, payload, sourceRef, changeNote } = req.body;
    const id = await saveRule({
      boardRef: req.params.id,
      ruleType,
      scopeKey: scopeKey || 'default',
      effectiveYearId: effectiveYearId || null,
      payload,
      sourceRef,
      changeNote,
    });
    res.status(201).json({ id });
  }),
);

export default router;
