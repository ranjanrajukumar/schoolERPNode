import { Router } from 'express';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { forbidden, notFound } from '../../utils/httpError.js';
import { classesOf, myClass } from './myClass.service.js';

const router = Router();

// GET /api/my-class -> the classes the signed-in teacher is class teacher of
router.get('/', asyncHandler(async (req, res) => res.json(await classesOf(req.user.staffId))));

// GET /api/my-class/:id -> that class today. A teacher can open only their own classes; an admin can open any.
router.get('/:id', asyncHandler(async (req, res) => {
  if (req.user.role !== 'admin' && !(await classesOf(req.user.staffId)).some((c) => c.id === Number(req.params.id))) throw forbidden('You are not the class teacher of this class');
  const data = await myClass(req.params.id);
  if (!data) throw notFound('Class not found');
  res.json(data);
}));

export default router;
