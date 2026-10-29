import bcrypt from 'bcryptjs';
import { Router } from 'express';
import { SchoolClass, Student, StudentAccount, User, sequelize } from '../../models/index.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { badRequest, conflict, notFound } from '../../utils/httpError.js';
import { defaultStudentPassword, loginEmailFor } from './studentLogin.service.js';

const router = Router();
const MIN_PASSWORD = 8;

/** A typed password, or (when left blank) the school's default student password. */
const passwordOrDefault = async (typed) => {
  const password = String(typed ?? '').trim() || (await defaultStudentPassword());
  if (!password)
    throw badRequest('Enter a password, or set a default student password under Settings → Student login');
  return password;
};

const checkPassword = (password) => {
  if (String(password ?? '').length < MIN_PASSWORD)
    throw badRequest(`Password must be at least ${MIN_PASSWORD} characters`);
};

router.get(
  '/',
  asyncHandler(async (_req, res) => {
    const rows = await StudentAccount.findAll({
      include: [
        { model: User, attributes: ['email'] },
        {
          model: Student,
          attributes: ['firstName', 'lastName', 'admissionNo', 'status'],
          include: [{ model: SchoolClass, attributes: ['name', 'section'] }],
        },
      ],
      order: [['id', 'DESC']],
    });
    res.json(
      rows.map((a) => ({
        id: a.id,
        studentId: a.studentId,
        email: a.User.email,
        studentName: `${a.Student.firstName} ${a.Student.lastName}`,
        admissionNo: a.Student.admissionNo,
        className: a.Student.SchoolClass
          ? `${a.Student.SchoolClass.name}-${a.Student.SchoolClass.section}`
          : null,
        studentStatus: a.Student.status,
      })),
    );
  }),
);

// POST /api/student-accounts { studentId, email, password } -> creates the login and links it to the student
router.post(
  '/',
  asyncHandler(async (req, res) => {
    const { studentId, email } = req.body;
    const typed = String(req.body.password ?? '').trim();
    const password = await passwordOrDefault(typed);
    checkPassword(password);
    const student = studentId ? await Student.findByPk(studentId) : null;
    if (!student) throw notFound('Student not found');
    if (student.status !== 'active') throw conflict('Only active students can have a login');
    if (await StudentAccount.findOne({ where: { studentId } }))
      throw conflict('This student already has a login');

    const account = await sequelize.transaction(async (transaction) => {
      const user = await User.create(
        {
          name: `${student.firstName} ${student.lastName}`,
          email: String(email ?? '').trim() || (await loginEmailFor(student.admissionNo, transaction)),
          role: 'student',
          passwordHash: await bcrypt.hash(password, 10),
          mustChangePassword: true,
        },
        { transaction },
      );
      return StudentAccount.create({ userId: user.id, studentId }, { transaction });
    });
    res.status(201).json({ id: account.id, username: student.admissionNo, ...(!typed && { password }) });
  }),
);

router.put(
  '/:id',
  asyncHandler(async (req, res) => {
    const account = await StudentAccount.findByPk(req.params.id);
    if (!account) throw notFound('Account not found');
    const typed = String(req.body.password ?? '').trim();
    const password = await passwordOrDefault(typed);
    checkPassword(password);
    await User.update(
      { passwordHash: await bcrypt.hash(password, 10), mustChangePassword: true },
      { where: { id: account.userId } },
    );
    res.json({ ok: true, ...(!typed && { password }) });
  }),
);

// Removing the login cascades to the link.
router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const account = await StudentAccount.findByPk(req.params.id);
    if (!account) throw notFound('Account not found');
    await User.destroy({ where: { id: account.userId } });
    res.json({ ok: true });
  }),
);

export default router;
