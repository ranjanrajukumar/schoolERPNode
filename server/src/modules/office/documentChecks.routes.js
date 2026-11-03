import { Router } from 'express';
import { DocumentCheck, MasterItem, Student, StudentFile } from '../../models/index.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { badRequest, notFound } from '../../utils/httpError.js';
import { currentUser } from '../../utils/requestContext.js';

const router = Router();
const STATUSES = ['pending', 'verified', 'rejected'];

// GET /api/document-checks?studentId= -> every document the school asks for, whether the student has uploaded it, and the office's check
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const studentId = Number(req.query.studentId);
    if (!studentId) throw badRequest('studentId is required');
    const student = await Student.findByPk(studentId);
    if (!student) throw notFound('Student not found');
    const [required, files, checks] = await Promise.all([
      MasterItem.findAll({
        where: { type: 'student_document', active: true },
        order: [
          ['sortOrder', 'ASC'],
          ['name', 'ASC'],
        ],
      }),
      StudentFile.findAll({
        where: { studentId, kind: 'document' },
        attributes: ['id', 'title', 'originalName', 'createdAt'],
        order: [['createdAt', 'DESC']],
      }),
      DocumentCheck.findAll({ where: { studentId } }),
    ]);
    const checkOf = new Map(checks.map((c) => [c.title.toLowerCase(), c]));
    const fileOf = (title) => files.find((f) => f.title.toLowerCase() === title.toLowerCase());
    res.json({
      student: {
        id: student.id,
        admissionNo: student.admissionNo,
        name: `${student.firstName} ${student.lastName}`,
      },
      rows: required.map((r) => {
        const file = fileOf(r.name);
        const c = checkOf.get(r.name.toLowerCase());
        return {
          title: r.name,
          required: r.required,
          uploaded: Boolean(file),
          fileId: file?.id ?? null,
          fileName: file?.originalName ?? null,
          uploadedOn: file?.createdAt ?? null,
          status: c?.status ?? 'pending',
          note: c?.note ?? '',
          checkedByName: c?.checkedByName ?? null,
          checkedOn: c?.checkedOn ?? null,
          // a file uploaded after the check was made has not been seen by the person who approved it
          changedSinceCheck: Boolean(
            file && c?.checkedOn && new Date(file.createdAt) > new Date(c.checkedOn),
          ),
        };
      }),
    });
  }),
);

// PUT /api/document-checks { studentId, title, status, note }: records the office's decision on one document.
// A document that has not been uploaded cannot be verified, and a rejection needs a reason.
router.put(
  '/',
  asyncHandler(async (req, res) => {
    const studentId = Number(req.body.studentId);
    const title = String(req.body.title ?? '').trim();
    const status = req.body.status;
    if (!studentId || !title) throw badRequest('studentId and title are required');
    if (!STATUSES.includes(status)) throw badRequest('Status must be pending, verified or rejected');
    if (!(await MasterItem.findOne({ where: { type: 'student_document', name: title } })))
      throw badRequest('That is not one of the documents the school asks for');
    const note =
      String(req.body.note ?? '')
        .trim()
        .slice(0, 300) || null;
    if (status === 'rejected' && !note) throw badRequest('Say why the document was sent back');
    if (status === 'verified') {
      const file = await StudentFile.findOne({ where: { studentId, kind: 'document', title } });
      if (!file) throw badRequest('Nothing has been uploaded for this document yet');
    }
    const where = { studentId, title };
    const values = {
      status,
      note,
      checkedByName: currentUser(),
      checkedOn: status === 'pending' ? null : new Date(),
    };
    const existing = await DocumentCheck.findOne({ where });
    if (existing) await existing.update(values);
    else await DocumentCheck.create({ ...where, ...values });
    res.json({ ok: true });
  }),
);

export default router;
