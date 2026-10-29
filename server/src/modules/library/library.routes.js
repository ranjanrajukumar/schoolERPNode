import { Router } from 'express';
import { Book, LibraryCategory } from '../../models/index.js';
import { requireRole } from '../../middleware/authMiddleware.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { crudRouter } from '../../utils/crud.js';
import {
  createMembership,
  deleteMembership,
  listMemberships,
  updateMembership,
} from './membership.service.js';
import {
  cancelReservation,
  deleteCategory,
  librarySummary,
  listCategories,
  listMembers,
  listReservations,
  reserveBook,
} from './libraryExtras.service.js';
import {
  billPastFines,
  createBook,
  deleteBook,
  issueBook,
  listIssues,
  returnBook,
  updateBook,
} from './library.service.js';

const router = Router();

router.get(
  '/books',
  asyncHandler(async (_req, res) =>
    res.json(
      await Book.findAll({
        include: [{ model: LibraryCategory, attributes: ['name'] }],
        order: [['title', 'ASC']],
      }),
    ),
  ),
);

router.post(
  '/books',
  asyncHandler(async (req, res) => res.status(201).json({ id: await createBook(req.body) })),
);

router.put(
  '/books/:id',
  asyncHandler(async (req, res) => {
    await updateBook(req.params.id, req.body);
    res.json({ ok: true });
  }),
);

router.delete(
  '/books/:id',
  asyncHandler(async (req, res) => {
    await deleteBook(req.params.id);
    res.json({ ok: true });
  }),
);

// GET /api/library/issues?open=1
router.get(
  '/issues',
  asyncHandler(async (req, res) => res.json(await listIssues({ open: req.query.open }))),
);

// POST /api/library/issues { bookId, studentId, days? }
router.post(
  '/issues',
  asyncHandler(async (req, res) => res.status(201).json({ id: await issueBook(req.body) })),
);

// POST /api/library/issues/bill-fines -> bills fines from earlier returns that were never charged
router.post(
  '/issues/bill-fines',
  requireRole('admin'),
  asyncHandler(async (_req, res) => res.json(await billPastFines())),
);

router.post(
  '/issues/:id/return',
  asyncHandler(async (req, res) => res.json(await returnBook(req.params.id))),
);

// Reads are open to every staff role; the router is mounted with writeRoles('admin', 'teacher').
router.delete(
  '/categories/:id',
  asyncHandler(async (req, res) => {
    await deleteCategory(req.params.id);
    res.json({ ok: true });
  }),
);
router.use('/categories', crudRouter(LibraryCategory, { fields: ['name'], list: listCategories }));

router.get(
  '/reservations',
  asyncHandler(async (req, res) => res.json(await listReservations(req.query))),
);
router.post(
  '/reservations',
  asyncHandler(async (req, res) => res.status(201).json({ id: await reserveBook(req.body) })),
);
router.post(
  '/reservations/:id/cancel',
  asyncHandler(async (req, res) => {
    await cancelReservation(req.params.id);
    res.json({ ok: true });
  }),
);

router.get(
  '/memberships',
  asyncHandler(async (_req, res) => res.json(await listMemberships())),
);
router.post(
  '/memberships',
  asyncHandler(async (req, res) => res.status(201).json({ id: await createMembership(req.body) })),
);
router.put(
  '/memberships/:id',
  asyncHandler(async (req, res) => {
    await updateMembership(req.params.id, req.body);
    res.json({ ok: true });
  }),
);
router.delete(
  '/memberships/:id',
  asyncHandler(async (req, res) => {
    await deleteMembership(req.params.id);
    res.json({ ok: true });
  }),
);

router.get(
  '/members',
  asyncHandler(async (_req, res) => res.json(await listMembers())),
);
router.get(
  '/summary',
  asyncHandler(async (_req, res) => res.json(await librarySummary())),
);

export default router;
