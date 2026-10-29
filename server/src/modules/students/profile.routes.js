import { Router } from 'express';
import { Op } from 'sequelize';
import {
  Attendance,
  BehaviorRecord,
  BookIssue,
  Book,
  DocumentRequest,
  Exam,
  Parent,
  ParentStudent,
  SchoolClass,
  Student,
  Hostel,
  HostelAllocation,
  HostelRoom,
  StudentHealth,
  StudentTransport,
  TransportRoute,
  TransportStop,
  User,
} from '../../models/index.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { notFound } from '../../utils/httpError.js';
import { DETAIL_KEYS } from '../academics/studentFields.js';
import { daysFromNow, fromCents, toCents, today } from '../../utils/money.js';
import { getResults } from '../exams/exams.service.js';
import { listFees } from '../finance/fees.service.js';
import { TYPE_LABEL } from '../documents/documents.service.js';
import { activitiesForStudent } from '../activities/activities.service.js';

export const profileRouter = Router();
export const alumniRouter = Router();

const RECENT_EXAMS = 3;
const className = (c) => (c ? `${c.name}-${c.section}` : null);

function attendanceSummary(marks) {
  const absent = marks.filter((m) => m.status === 'absent').length;
  return {
    days: marks.length,
    absent,
    percentage: marks.length ? Math.round(((marks.length - absent) / marks.length) * 1000) / 10 : null,
  };
}

/**
 * One page that gathers everything the school knows about a student. Fee figures are left out for
 * teachers, who have no need of them; everything else is open to the staff who can reach this route.
 */
profileRouter.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const student = await Student.findByPk(req.params.id, { include: [SchoolClass] });
    if (!student) throw notFound('Student not found');
    const id = student.id;
    const showFees = req.user.role === 'admin';
    const since = daysFromNow(-30);

    const [guardians, health, marks, behavior, transport, loans, documents, exams, fees, activities] =
      await Promise.all([
        ParentStudent.findAll({
          where: { studentId: id },
          include: [{ model: Parent, include: [{ model: User, attributes: ['email'] }] }],
        }),
        StudentHealth.findOne({ where: { studentId: id } }),
        Attendance.findAll({ where: { studentId: id }, attributes: ['date', 'status'] }),
        BehaviorRecord.findAll({
          where: { studentId: id },
          order: [
            ['date', 'DESC'],
            ['id', 'DESC'],
          ],
          limit: 20,
        }),
        StudentTransport.findOne({ where: { studentId: id }, include: [TransportRoute, TransportStop] }),
        BookIssue.findAll({
          where: { studentId: id, returnedOn: null },
          include: [{ model: Book, attributes: ['title'] }],
        }),
        DocumentRequest.findAll({ where: { studentId: id, status: 'issued' }, order: [['id', 'DESC']] }),
        student.classId
          ? Exam.findAll({
              where: { classId: student.classId },
              order: [['id', 'DESC']],
              limit: RECENT_EXAMS,
            })
          : [],
        showFees ? listFees({ studentId: id }) : null,
        activitiesForStudent(id),
      ]);

    const results = [];
    for (const exam of exams) {
      const row = (await getResults(exam.id)).rows.find((r) => r.studentId === id);
      if (row)
        results.push({
          examId: exam.id,
          name: exam.name,
          total: row.total,
          outOf: row.outOf,
          percentage: row.percentage,
          grade: row.grade,
          rank: row.rank,
          result: row.result,
        });
    }

    const owed = fees ? fees.reduce((sum, f) => sum + toCents(f.balance), 0) : 0;
    res.json({
      student: {
        id,
        admissionNo: student.admissionNo,
        name: `${student.firstName} ${student.lastName}`,
        firstName: student.firstName,
        lastName: student.lastName,
        dob: student.dob,
        gender: student.gender,
        status: student.status,
        className: className(student.SchoolClass),
        guardianName: student.guardianName,
        guardianPhone: student.guardianPhone,
        admittedOn: student.createdAt,
      },
      details: Object.fromEntries(DETAIL_KEYS.map((k) => [k, student[k]])),
      parentAccounts: guardians.map((g) => ({
        name: g.Parent.name,
        relation: g.relation,
        email: g.Parent.User.email,
        phone: g.Parent.phone,
      })),
      health: health?.toJSON() ?? null,
      attendance: {
        overall: attendanceSummary(marks),
        last30Days: attendanceSummary(marks.filter((m) => m.date >= since)),
      },
      results,
      fees: fees && {
        outstanding: fromCents(owed),
        overdueItems: fees.filter((f) => f.status === 'overdue').length,
        items: fees
          .slice(0, 5)
          .map((f) => ({ title: f.title, amount: f.amount, balance: f.balance, status: f.status })),
      },
      behavior: {
        points: behavior.reduce((sum, b) => sum + b.points, 0),
        recent: behavior
          .slice(0, 5)
          .map((b) => ({ id: b.id, date: b.date, type: b.type, title: b.title, points: b.points })),
      },
      hostel: await (async () => {
        const bed = await HostelAllocation.findOne({
          where: { studentId: student.id },
          include: [{ model: HostelRoom, include: [Hostel] }],
        });
        return (
          bed && {
            hostel: bed.HostelRoom.Hostel.name,
            room: bed.HostelRoom.roomNo,
            bed: bed.bedNo,
            since: bed.startDate,
          }
        );
      })(),
      transport: transport && {
        route: transport.TransportRoute.name,
        stop: transport.TransportStop.name,
        pickupTime: transport.TransportStop.pickupTime,
      },
      library: loans.map((l) => ({ title: l.Book.title, dueOn: l.dueOn, overdue: l.dueOn < today() })),
      activities: activities.map((a) => ({
        activityId: a.activityId,
        title: a.title,
        kind: a.kindLabel,
        date: a.startDate,
        status: a.status,
        result: a.result,
      })),
      documents: documents.map((d) => ({
        id: d.id,
        type: TYPE_LABEL[d.type],
        certificateNo: d.certificateNo,
        issuedOn: d.issuedOn,
      })),
    });
  }),
);

/**
 * Former students: anyone no longer active. The class they left from is kept on the record, and
 * if a transfer certificate was issued its leaving date and reason are included.
 */
alumniRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const { q } = req.query;
    const like = q ? `%${q}%` : null;
    const students = await Student.findAll({
      where: {
        status: 'inactive',
        ...(like && {
          [Op.or]: [
            { firstName: { [Op.like]: like } },
            { lastName: { [Op.like]: like } },
            { admissionNo: { [Op.like]: like } },
          ],
        }),
      },
      include: [SchoolClass],
      order: [
        ['lastName', 'ASC'],
        ['firstName', 'ASC'],
      ],
      limit: 500,
    });

    const certificates = await DocumentRequest.findAll({
      where: { type: 'transfer', status: 'issued', studentId: students.map((s) => s.id) },
      order: [['id', 'ASC']],
    });
    const leaving = new Map(certificates.map((c) => [c.studentId, JSON.parse(c.snapshot)]));

    res.json(
      students.map((s) => ({
        id: s.id,
        admissionNo: s.admissionNo,
        name: `${s.firstName} ${s.lastName}`,
        lastClass: className(s.SchoolClass),
        guardianName: s.guardianName,
        guardianPhone: s.guardianPhone,
        leavingDate: leaving.get(s.id)?.leavingDate ?? null,
        leavingReason: leaving.get(s.id)?.leavingReason ?? null,
      })),
    );
  }),
);
