import bcrypt from 'bcryptjs';
import { Router } from 'express';
import { Parent, ParentStudent, SchoolClass, Student, User, sequelize } from '../../models/index.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { badRequest, conflict, notFound } from '../../utils/httpError.js';
import { PARENT_KEYS, parentProblems } from './parentFields.js';

const router = Router();
const MIN_PASSWORD = 8;

const include = [
  { model: User, attributes: ['email', 'createdAt'], required: true },
  {
    model: ParentStudent,
    include: [
      {
        model: Student,
        required: true,
        attributes: ['id', 'firstName', 'lastName', 'admissionNo'],
        include: [{ model: SchoolClass, attributes: ['name', 'section'] }],
      },
    ],
  },
];

function shape(parent) {
  return {
    id: parent.id,
    name: parent.name,
    phone: parent.phone,
    ...Object.fromEntries(PARENT_KEYS.map((k) => [k, parent[k]])),
    email: parent.User.email,
    children: parent.ParentStudents.map((link) => ({
      studentId: link.Student.id,
      relation: link.relation,
      name: `${link.Student.firstName} ${link.Student.lastName}`,
      admissionNo: link.Student.admissionNo,
      className: link.Student.SchoolClass
        ? `${link.Student.SchoolClass.name}-${link.Student.SchoolClass.section}`
        : null,
    })),
  };
}

const pickDetails = (body) =>
  Object.fromEntries(
    PARENT_KEYS.filter((k) => body[k] !== undefined).map((k) => [k, String(body[k]).trim() || null]),
  );

const checkPassword = (password) => {
  if (String(password ?? '').length < MIN_PASSWORD)
    throw badRequest(`Password must be at least ${MIN_PASSWORD} characters`);
};

router.get(
  '/',
  asyncHandler(async (_req, res) => {
    res.json((await Parent.findAll({ include, order: [['name', 'ASC']] })).map(shape));
  }),
);

// POST /api/parents { name, email, phone?, password } -> creates the login and the profile together
router.post(
  '/',
  asyncHandler(async (req, res) => {
    const { name, email, phone, password } = req.body;
    if (!String(name ?? '').trim()) throw badRequest('Name is required');
    checkPassword(password);
    const problems = parentProblems(req.body);
    if (problems.length) throw badRequest(problems[0]);
    const details = pickDetails(req.body);

    const parent = await sequelize.transaction(async (transaction) => {
      const user = await User.create(
        { name: name.trim(), email, role: 'parent', passwordHash: await bcrypt.hash(password, 10) },
        { transaction },
      );
      return Parent.create(
        { userId: user.id, name: name.trim(), phone: phone || null, ...details },
        { transaction },
      );
    });
    res.status(201).json({ id: parent.id });
  }),
);

router.put(
  '/:id',
  asyncHandler(async (req, res) => {
    const parent = await Parent.findByPk(req.params.id);
    if (!parent) throw notFound('Parent not found');
    const { name, phone, password } = req.body;
    if (password) checkPassword(password);
    const problems = parentProblems(req.body);
    if (problems.length) throw badRequest(problems[0]);

    await sequelize.transaction(async (transaction) => {
      await parent.update(
        {
          ...(name && { name: name.trim() }),
          ...(phone !== undefined && { phone: phone || null }),
          ...pickDetails(req.body),
        },
        { transaction },
      );
      const user = await User.findByPk(parent.userId, { transaction });
      await user.update(
        {
          ...(name && { name: name.trim() }),
          ...(password && { passwordHash: await bcrypt.hash(password, 10) }),
        },
        { transaction },
      );
    });
    res.json({ ok: true });
  }),
);

// Removing the login cascades to the profile and its child links.
router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const parent = await Parent.findByPk(req.params.id);
    if (!parent) throw notFound('Parent not found');
    await User.destroy({ where: { id: parent.userId } });
    res.json({ ok: true });
  }),
);

// POST /api/parents/:id/students { studentId, relation? }
router.post(
  '/:id/students',
  asyncHandler(async (req, res) => {
    const { studentId, relation } = req.body;
    if (!(await Parent.findByPk(req.params.id))) throw notFound('Parent not found');
    if (!studentId || !(await Student.findByPk(studentId))) throw notFound('Student not found');
    if (await ParentStudent.findOne({ where: { parentId: req.params.id, studentId } })) {
      throw conflict('This student is already linked to the parent');
    }
    await ParentStudent.create({
      parentId: req.params.id,
      studentId,
      relation: relation?.trim() || 'Guardian',
    });
    res.status(201).json({ ok: true });
  }),
);

router.delete(
  '/:id/students/:studentId',
  asyncHandler(async (req, res) => {
    const removed = await ParentStudent.destroy({
      where: { parentId: req.params.id, studentId: req.params.studentId },
    });
    if (!removed) throw notFound('Link not found');
    res.json({ ok: true });
  }),
);

export default router;
