import { Op } from 'sequelize';
import { Router } from 'express';
import { DocumentRequest, LoginEvent, Parent, ParentStudent, RevaluationRequest, Student, StudentLeave, User, sequelize } from '../../models/index.js';
import { asyncHandler } from '../../utils/asyncHandler.js';

const RETENTION_DAYS = 180;
const LIMIT = 300;
const DAY_MS = 24 * 60 * 60 * 1000;

/** Records a sign-in attempt. It must never break signing in, so failures are only logged. */
export async function recordLogin(req, { email, user, success }) {
  try {
    const account = user ?? (success ? null : await User.findOne({ where: { email: String(email ?? '') }, attributes: ['id', 'role'] }));
    await LoginEvent.create({
      userId: account?.id ?? null,
      email: String(email ?? '').slice(0, 150),
      role: account?.role ?? null,
      success,
      ip: (req.ip || '').slice(0, 64) || null,
      userAgent: String(req.get('user-agent') ?? '').slice(0, 200) || null,
    });
    if (success) await LoginEvent.destroy({ where: { createdAt: { [Op.lt]: new Date(Date.now() - RETENTION_DAYS * DAY_MS) } } });
  } catch (err) {
    console.error('Login history failed:', err.message);
  }
}

// Mounted behind requireRole('admin').
const router = Router();

// GET /api/login-activity?role=&success=true|false  newest first
router.get('/', asyncHandler(async (req, res) => {
  const { role, success } = req.query;
  const rows = await LoginEvent.findAll({
    where: { ...(role && { role }), ...(success && { success: success === 'true' }) },
    order: [['id', 'DESC']],
    limit: LIMIT,
  });
  res.json(rows);
}));

// GET /api/login-activity/parents  every parent account with its last sign-in, so unused accounts stand out
router.get('/parents', asyncHandler(async (_req, res) => {
  const parents = await Parent.findAll({
    include: [{ model: User, attributes: ['id', 'email'], required: true }, { model: ParentStudent, include: [{ model: Student, attributes: ['firstName', 'lastName'] }] }],
    order: [['name', 'ASC']],
  });
  const stats = await LoginEvent.findAll({
    where: { success: true, userId: parents.map((p) => p.User.id) },
    attributes: ['userId', [sequelize.fn('MAX', sequelize.col('created_at')), 'lastLogin'], [sequelize.fn('COUNT', sequelize.col('id')), 'logins']],
    group: ['userId'],
    raw: true,
  });
  const byUser = new Map(stats.map((s) => [s.userId, s]));
  const weekAgo = Date.now() - 7 * DAY_MS;
  res.json(parents.map((p) => {
    const s = byUser.get(p.User.id);
    return {
      id: p.id, name: p.name, email: p.User.email, phone: p.phone,
      children: p.ParentStudents.map((l) => `${l.Student.firstName} ${l.Student.lastName}`),
      lastLogin: s?.lastLogin ?? null, logins: s ? Number(s.logins) : 0,
      activeThisWeek: Boolean(s && new Date(s.lastLogin).getTime() >= weekAgo),
    };
  }));
}));

// GET /api/login-activity/parent-requests  what parents have asked the school for, across all three kinds
router.get('/parent-requests', asyncHandler(async (_req, res) => {
  const parentUsers = (await User.findAll({ where: { role: 'parent' }, attributes: ['id', 'name'] }));
  const names = new Map(parentUsers.map((u) => [u.id, u.name]));
  const ids = [...names.keys()];
  const student = [{ model: Student, attributes: ['firstName', 'lastName', 'admissionNo'] }];
  const [leaves, documents, revaluations] = await Promise.all([
    StudentLeave.findAll({ where: { requestedBy: ids }, include: student, order: [['id', 'DESC']], limit: LIMIT }),
    DocumentRequest.findAll({ where: { requestedBy: ids }, include: student, order: [['id', 'DESC']], limit: LIMIT }),
    RevaluationRequest.findAll({ where: { requestedBy: ids }, include: student, order: [['id', 'DESC']], limit: LIMIT }),
  ]);
  const shape = (kind, link, r, summary) => ({
    key: `${kind}-${r.id}`, kind, link, summary, status: r.status, createdAt: r.createdAt,
    parentName: names.get(r.requestedBy) ?? null, studentName: `${r.Student.firstName} ${r.Student.lastName}`, admissionNo: r.Student.admissionNo,
    open: ['pending', 'requested'].includes(r.status),
  });
  res.json([
    ...leaves.map((r) => shape('Leave', '/student-leaves', r, `${r.fromDate} to ${r.toDate}: ${r.reason}`)),
    ...documents.map((r) => shape('Certificate', '/documents', r, `${r.type}${r.purpose ? `: ${r.purpose}` : ''}`)),
    ...revaluations.map((r) => shape('Revaluation', '/revaluation', r, r.reason)),
  ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
}));

export default router;
