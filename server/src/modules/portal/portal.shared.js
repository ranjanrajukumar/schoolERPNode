import { Student, SchoolClass } from '../../models/index.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { notFound } from '../../utils/httpError.js';

/** A child that is not linked to this parent looks exactly like one that does not exist. */
export const ownChild = asyncHandler(async (req, _res, next) => {
  const id = Number(req.params.studentId);
  if (!req.children.has(id)) throw notFound('Student not found');
  req.student = await Student.findByPk(id, { include: [SchoolClass] });
  next();
});
