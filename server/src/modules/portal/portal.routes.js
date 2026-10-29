import express, { Router } from 'express';
import { Op } from 'sequelize';
import {
  Attendance,
  Book,
  BookIssue,
  Exam,
  LibraryMembership,
  Message,
  Notice,
  OnlineClass,
  Parent,
  ParentStudent,
  SchoolClass,
  Student,
  StudentAccount,
  StudentTransport,
  StudyMaterial,
  TimetableSlot,
  Staff,
  Subject,
  TransportRoute,
  TransportStop,
} from '../../models/index.js';
import { loadExtras } from '../admissions/recordExtras.js';
import { attendanceOf as hostelAttendanceOf, hostelOf, mealsOf, visitorsOf } from './hostelPortal.service.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { badRequest, forbidden, notFound } from '../../utils/httpError.js';
import { daysFromNow, fromCents, toCents, today } from '../../utils/money.js';
import { getReportCard, getResults } from '../exams/exams.service.js';
import { listFees } from '../finance/fees.service.js';
import { listPaymentHistory } from '../finance/adjustments.service.js';
import { createRequest, getPrintable, listRequests } from '../documents/documents.service.js';
import {
  applyLeave as applyStudentLeave,
  cancelLeave as cancelStudentLeave,
  listLeaves as listStudentLeaves,
} from '../attendance/studentLeave.service.js';
import { listRevaluations, requestRevaluation } from '../exams/examExtras.service.js';
import { activitiesForStudent, setConsent } from '../activities/activities.service.js';
import {
  listOwn as listOwnFeedback,
  meta as feedbackMeta,
  submit as submitFeedback,
} from '../communication/feedback.service.js';
import { FEEDBACK_CATEGORIES } from '../../models/feedback.model.js';
import { daysUsed, listTypes } from '../leave/leaveTypes.service.js';
import { routeBus } from '../transport/tracking.service.js';
import { homeworkForStudent } from '../academics/homework.service.js';
import { eventsBetween } from '../academics/calendar.routes.js';
import { materialInclude, shape as shapeMaterial } from '../academics/materials.routes.js';
import {
  completeLesson,
  readStudentAssignmentFile,
  readStudentLessonFile,
  readStudentMaterialFile,
  readStudentPartFile,
  recordLessonView,
  studentCourses,
  submitAssignment,
  takeQuiz,
  uploadAssignmentFile,
} from '../academics/lms.service.js';
import { MAX_BYTES } from '../files/files.service.js';

const router = Router();

/**
 * Resolves who is signed in and the only students they may see: a parent's linked children, or a
 * student's own record. Students can change only their own coursework plus the explicitly
 * allowed leave/certificate requests; other portal data stays read-only.
 */
router.use(
  asyncHandler(async (req, _res, next) => {
    if (req.user.role === 'student') {
      // a student's portal is read-only, except that they can apply for leave and withdraw their own request (the class teacher decides) and request a certificate (the office decides)
      if (
        req.method !== 'GET' &&
        !/^\/children\/\d+\/(leaves(\/\d+\/cancel)?|documents|feedback|lms\/lessons\/\d+\/(complete|view)|lms\/assignments\/\d+\/(submit|file)|lms\/quizzes\/\d+\/attempts)$/.test(
          req.path,
        )
      )
        throw forbidden('Students have a read-only portal. Please ask your parent or the school office.');
      const account = await StudentAccount.findOne({ where: { userId: req.user.id }, include: [Student] });
      if (!account) throw notFound('No student profile for this account');
      if (account.Student.status !== 'active') throw forbidden('This account is no longer active');
      req.children = new Map([[account.studentId, 'Self']]);
      return next();
    }
    const parent = await Parent.findOne({ where: { userId: req.user.id } });
    if (!parent) throw notFound('No parent profile for this account');
    const links = await ParentStudent.findAll({ where: { parentId: parent.id } });
    req.parent = parent;
    req.children = new Map(links.map((l) => [l.studentId, l.relation]));
    next();
  }),
);

const audiences = (req) =>
  req.user.role === 'student'
    ? { notice: ['all', 'students'], calendar: ['all'] }
    : { notice: ['all', 'parents'], calendar: ['all', 'parents'] };

/** A child that is not linked to this parent looks exactly like one that does not exist. */
const ownChild = asyncHandler(async (req, _res, next) => {
  const id = Number(req.params.studentId);
  if (!req.children.has(id)) throw notFound('Student not found');
  req.student = await Student.findByPk(id, { include: [SchoolClass] });
  next();
});

router.get(
  '/children',
  asyncHandler(async (req, res) => {
    const students = await Student.findAll({
      where: { id: [...req.children.keys()] },
      include: [SchoolClass],
      order: [['firstName', 'ASC']],
    });
    res.json(
      students.map((s) => ({
        id: s.id,
        name: `${s.firstName} ${s.lastName}`,
        admissionNo: s.admissionNo,
        className: s.SchoolClass ? `${s.SchoolClass.name}-${s.SchoolClass.section}` : null,
        relation: req.children.get(s.id),
      })),
    );
  }),
);

const filled = (rows) => rows.filter(([, v]) => v !== null && v !== undefined && v !== '');

/** The student's class teacher: name, post and how to reach them, or null when the class has none. */
async function classTeacherOf(student) {
  const id = student.SchoolClass?.classTeacherId;
  if (!id) return null;
  const t = await Staff.findByPk(id, {
    attributes: ['firstName', 'lastName', 'designation', 'phone', 'email'],
  });
  return (
    t && {
      name: `${t.firstName} ${t.lastName}`,
      designation: t.designation || null,
      phone: t.phone || null,
      email: t.email || null,
    }
  );
}

// What a student (or parent) can read about the student. [label, field]; a field is a student column or one of the detailed particulars.
const PROFILE = [
  [
    'School',
    [
      ['Admission no', 'admissionNo'],
      ['Class', '$class'],
      ['Roll no', 'rollNo'],
      ['Date of admission', 'admissionDate'],
      ['Date of joining', 'doj'],
      ['Enrollment no', 'enrollNo'],
      ['PEN ID', 'penId'],
      ['APAAR ID', 'apaarId'],
      ['Admitted through', 'admThrough'],
      ['Admitted under', 'admUnder'],
      ['Fee category', 'feeCategory'],
      ['Status', 'subStatus'],
    ],
  ],
  [
    'Personal',
    [
      ['Name in Hindi', 'nameHindi'],
      ['Date of birth', 'dob'],
      ['Gender', 'gender'],
      ['Blood group', 'bloodGroup'],
      ['Nationality', 'nationality'],
      ['Religion', 'religion'],
      ['Category', 'category'],
      ['Caste', 'caste'],
      ['Sub caste', 'subCaste'],
      ['Caste reg. no', 'casteRegNo'],
      ['Minority', 'minority'],
      ['Mother tongue', 'motherTongue'],
      ['Birth place', 'birthPlace'],
      ['Domicile', 'domicile'],
      ['Domicile no', 'domicileNo'],
      ['Residence type', 'residenceType'],
      ['Aadhaar no', 'nationalId'],
      ['PAN card', 'panCard'],
      ['Passport no', 'passportNo'],
      ['Physically handicapped', 'physicallyHandicapped'],
    ],
  ],
  [
    'Parents',
    [
      ["Father's name", 'fatherName'],
      ["Father's date of birth", 'fatherDob'],
      ["Father's qualification", 'fatherQualification'],
      ["Father's occupation", 'fatherOccupation'],
      ["Father's designation", 'fatherDesignation'],
      ["Father's mobile", 'fatherPhone'],
      ["Father's email", 'fatherEmail'],
      ["Mother's name", 'motherName'],
      ["Mother's date of birth", 'motherDob'],
      ["Mother's qualification", 'motherQualification'],
      ["Mother's occupation", 'motherOccupation'],
      ["Mother's designation", 'motherDesignation'],
      ["Mother's mobile", 'motherPhone'],
      ["Mother's email", 'motherEmail'],
      ["Grandfather's name", 'grandfatherName'],
    ],
  ],
  [
    'Guardian and emergency contacts',
    [
      ['Guardian', 'guardianName'],
      ['Relation', 'guardianRelation'],
      ['Guardian phone', 'guardianPhone'],
      ['Guardian email', 'guardianEmail'],
      ['Secondary guardian', 'secondaryGuardianName'],
      ['Secondary phone', 'secondaryGuardianPhone'],
      ['Emergency mobile', 'emergencyPhone'],
      ['Emergency email', 'emergencyEmail'],
      ['Alternate mobile', 'alternatePhone'],
      ['Alternate email', 'alternateEmail'],
    ],
  ],
  [
    'Local guardian',
    [
      ['Name', 'localGuardianName'],
      ['Relation', 'localGuardianRelation'],
      ['Phone', 'localGuardianPhone'],
      ['Email', 'localGuardianEmail'],
      ['Occupation', 'localGuardianOccupation'],
      ['Place of work', 'localGuardianWorkPlace'],
      ['Address', 'localGuardianAddress'],
    ],
  ],
  [
    'Contact',
    [
      ['Student email', 'email'],
      ['Student mobile', 'phone'],
      ['Official email', 'officialEmail'],
      ['Official mobile', 'officialPhone'],
    ],
  ],
  [
    'Permanent address',
    [
      ['Address', 'address'],
      ['Locality', 'locality'],
      ['City', 'city'],
      ['Tehsil', 'tehsil'],
      ['Thana', 'thana'],
      ['District', 'district'],
      ['State', 'state'],
      ['Country', 'country'],
      ['Pin', 'pincode'],
      ['Landline', 'landline'],
    ],
  ],
  [
    'Current address',
    [
      ['Address', '$currentAddress'],
      ['Locality', 'curLocality'],
      ['City', 'curCity'],
      ['Tehsil', 'curTehsil'],
      ['Thana', 'curThana'],
      ['District', 'curDistrict'],
      ['State', 'curState'],
      ['Country', 'curCountry'],
      ['Pin', 'curPincode'],
      ['Landline', 'curLandline'],
    ],
  ],
  [
    'Previous school',
    [
      ['School', 'previousSchool'],
      ['Class last attended', 'previousClass'],
      ['Transfer certificate no', 'previousTcNo'],
      ['Last result (%)', 'previousPercent'],
    ],
  ],
];

// GET /api/portal/children/:id/profile -> everything recorded about the student that they or their parents may read, and the class teacher
router.get(
  '/children/:studentId/profile',
  ownChild,
  asyncHandler(async (req, res) => {
    const s = req.student;
    const x = await loadExtras('student', s.id);
    const value = (field) => {
      if (field === '$class') return s.SchoolClass ? `${s.SchoolClass.name}-${s.SchoolClass.section}` : null;
      if (field === '$currentAddress')
        return x.sameAsPermanent ? 'Same as the permanent address' : x.curAddress;
      const v = s[field] ?? x[field];
      return v === true ? 'Yes' : v === false ? null : v instanceof Date ? v.toISOString().slice(0, 10) : v;
    };
    const sections = PROFILE.map(([title, rows]) => ({
      title,
      rows: filled(rows.map(([label, field]) => [label, value(field)])),
    })).filter((sec) => sec.rows.length);
    res.json({
      name: [s.firstName, s.middleName, s.lastName].filter(Boolean).join(' '),
      classTeacher: await classTeacherOf(s),
      sections,
      qualifications: Array.isArray(x.qualifications) ? x.qualifications : [],
      siblings: Array.isArray(x.siblings) ? x.siblings : [],
    });
  }),
);

// GET /api/portal/children/:id/library -> the library card and every book borrowed
router.get(
  '/children/:studentId/library',
  ownChild,
  asyncHandler(async (req, res) => {
    const studentId = req.student.id;
    const [card, issues] = await Promise.all([
      LibraryMembership.findOne({ where: { studentId } }),
      BookIssue.findAll({
        where: { studentId },
        include: [{ model: Book, attributes: ['title', 'author'] }],
        order: [
          ['issuedOn', 'DESC'],
          ['id', 'DESC'],
        ],
        limit: 100,
      }),
    ]);
    res.json({
      card: card && {
        cardNo: card.cardNo,
        memberSince: card.memberSince,
        validUntil: card.validUntil,
        maxBooks: card.maxBooks,
        status: card.status,
      },
      loans: issues.map((i) => ({
        id: i.id,
        title: i.Book?.title ?? 'Book removed',
        author: i.Book?.author ?? null,
        issuedOn: i.issuedOn,
        dueOn: i.dueOn,
        returnedOn: i.returnedOn,
        fine: i.fine,
        overdue: !i.returnedOn && i.dueOn < today(),
      })),
    });
  }),
);

// GET /api/portal/children/:id/online-classes -> the live classes of this student's class: the last week and everything coming up, with the joining link
router.get(
  '/children/:studentId/online-classes',
  ownChild,
  asyncHandler(async (req, res) => {
    if (!req.student.classId) return res.json([]);
    const since = daysFromNow(-7);
    const rows = await OnlineClass.findAll({
      where: { classId: req.student.classId, classDate: { [Op.gte]: since } },
      include: [{ model: Subject, attributes: ['name'] }],
      order: [
        ['classDate', 'ASC'],
        ['startTime', 'ASC'],
      ],
      limit: 100,
    });
    res.json(
      rows.map((c) => ({
        id: c.id,
        title: c.title,
        subjectName: c.Subject?.name ?? null,
        classDate: c.classDate,
        startTime: c.startTime,
        endTime: c.endTime,
        link: c.link,
        teacherName: c.teacherName,
        notes: c.notes,
        today: c.classDate === today(),
      })),
    );
  }),
);

// GET /api/portal/children/:id/transport -> the bus route, stop and pickup time, or null when the student does not use school transport
router.get(
  '/children/:studentId/transport',
  ownChild,
  asyncHandler(async (req, res) => {
    const row = await StudentTransport.findOne({
      where: { studentId: req.student.id },
      include: [
        { model: TransportRoute, attributes: ['name', 'monthlyFee'] },
        { model: TransportStop, attributes: ['name', 'pickupTime'] },
      ],
    });
    res.json(
      row && {
        route: row.TransportRoute?.name ?? null,
        stop: row.TransportStop?.name ?? null,
        pickupTime: row.TransportStop?.pickupTime ?? null,
        monthlyFee: row.TransportRoute?.monthlyFee ?? null,
        tripType: row.tripType,
        startDate: row.startDate,
        authorizedPickupName: row.authorizedPickupName,
        authorizedPickupPhone: row.authorizedPickupPhone,
      },
    );
  }),
);

// The hostel, for a student who boards: where they live, the mess menu, the night roll call and visitors. A day scholar gets { allocated: false }.
router.get(
  '/children/:studentId/hostel',
  ownChild,
  asyncHandler(async (req, res) => res.json(await hostelOf(req.student.id))),
);
router.get(
  '/children/:studentId/hostel/meals',
  ownChild,
  asyncHandler(async (req, res) => res.json(await mealsOf(req.student.id))),
);
router.get(
  '/children/:studentId/hostel/attendance',
  ownChild,
  asyncHandler(async (req, res) =>
    res.json(await hostelAttendanceOf(req.student.id, req.query.from, req.query.to)),
  ),
);
router.get(
  '/children/:studentId/hostel/visitors',
  ownChild,
  asyncHandler(async (req, res) => res.json(await visitorsOf(req.student.id))),
);

// GET /api/portal/children/:id/bus-location -> where the student's bus was last seen, or null when it has no GPS reading yet
router.get(
  '/children/:studentId/bus-location',
  ownChild,
  asyncHandler(async (req, res) => {
    const row = await StudentTransport.findOne({
      where: { studentId: req.student.id },
      include: [{ model: TransportRoute, attributes: ['name'] }],
    });
    res.json(row?.TransportRoute ? await routeBus(row.TransportRoute.name) : null);
  }),
);

// GET /api/portal/children/:id/messages -> what the school has sent about this student (absence alerts, fee reminders, direct messages)
router.get(
  '/children/:studentId/messages',
  ownChild,
  asyncHandler(async (req, res) => {
    const rows = await Message.findAll({
      where: { studentId: req.student.id },
      order: [['id', 'DESC']],
      limit: 50,
    });
    res.json(
      rows.map((m) => ({
        id: m.id,
        kind: m.kind,
        channel: m.channel,
        subject: m.subject,
        body: m.body,
        sentAt: m.createdAt,
      })),
    );
  }),
);

router.get(
  '/notices',
  asyncHandler(async (req, res) => {
    res.json(
      await Notice.findAll({
        where: { audience: { [Op.in]: audiences(req).notice } },
        order: [['id', 'DESC']],
        limit: 50,
      }),
    );
  }),
);

// GET /api/portal/children/:studentId/overview -> 30-day attendance and fee position at a glance
router.get(
  '/children/:studentId/overview',
  ownChild,
  asyncHandler(async (req, res) => {
    const classTeacher = await classTeacherOf(req.student);
    const since = daysFromNow(-30);
    const [marks, fees] = await Promise.all([
      Attendance.findAll({
        where: { studentId: req.student.id, date: { [Op.gte]: since } },
        attributes: ['status'],
      }),
      listFees({ studentId: req.student.id }),
    ]);
    const count = (status) => marks.filter((m) => m.status === status).length;
    const attended = marks.length - count('absent');
    const owedCents = fees.reduce((sum, f) => sum + toCents(f.balance), 0);

    res.json({
      classTeacher,
      attendance: {
        days: marks.length,
        present: count('present'),
        late: count('late'),
        absent: count('absent'),
        percentage: marks.length ? Math.round((attended / marks.length) * 1000) / 10 : null,
      },
      fees: {
        outstanding: fromCents(owedCents),
        overdueItems: fees.filter((f) => f.status === 'overdue').length,
      },
    });
  }),
);

router.get(
  '/children/:studentId/fees',
  ownChild,
  asyncHandler(async (req, res) => {
    const [fees, payments] = await Promise.all([
      listFees({ studentId: req.student.id }),
      listPaymentHistory({ studentId: req.student.id }),
    ]);
    res.json({ fees, payments });
  }),
);

// GET /api/portal/children/:studentId/attendance?from=&to=
router.get(
  '/children/:studentId/attendance',
  ownChild,
  asyncHandler(async (req, res) => {
    const from = req.query.from || `${today().slice(0, 8)}01`;
    const to = req.query.to || today();
    res.json(
      await Attendance.findAll({
        where: { studentId: req.student.id, date: { [Op.between]: [from, to] } },
        attributes: ['date', 'status'],
        order: [['date', 'DESC']],
      }),
    );
  }),
);

// Results for every exam the child's class has taken, with the child's own position
router.get(
  '/children/:studentId/results',
  ownChild,
  asyncHandler(async (req, res) => {
    if (!req.student.classId) return res.json([]);
    const exams = await Exam.findAll({ where: { classId: req.student.classId }, order: [['id', 'DESC']] });
    const out = [];
    for (const exam of exams) {
      const { rows } = await getResults(exam.id);
      const summary = rows.find((r) => r.studentId === req.student.id);
      if (summary) out.push({ ...summary, examId: exam.id, name: exam.name }); // the exam's name, not the student's, is the row's name
    }
    res.json(out);
  }),
);

router.get(
  '/children/:studentId/report-card/:examId',
  ownChild,
  asyncHandler(async (req, res) => {
    res.json(await getReportCard(req.params.examId, req.student.id));
  }),
);

// Activities: what the child takes part in, and the parent's consent for trips
router.get(
  '/children/:studentId/activities',
  ownChild,
  asyncHandler(async (req, res) => {
    res.json(await activitiesForStudent(req.student.id));
  }),
);

router.put(
  '/children/:studentId/activities/:activityId/consent',
  ownChild,
  asyncHandler(async (req, res) => {
    if (!['given', 'declined'].includes(req.body.consent))
      throw badRequest('Consent must be given or declined');
    await setConsent(req.params.activityId, req.student.id, req.body.consent);
    res.json({ ok: true });
  }),
);

// Revaluation: a parent can query a mark in their own child's results
router.get(
  '/children/:studentId/revaluations',
  ownChild,
  asyncHandler(async (req, res) => {
    res.json(await listRevaluations({ studentId: req.student.id }));
  }),
);

router.post(
  '/children/:studentId/revaluations',
  ownChild,
  asyncHandler(async (req, res) => {
    const { examId, subjectId, reason } = req.body;
    res
      .status(201)
      .json({
        id: await requestRevaluation({ examId, subjectId, reason, studentId: req.student.id }, req.user.id),
      });
  }),
);

// Leave: parents apply for their own child and can withdraw a request that is not yet decided
// GET /api/portal/leave-types -> the kinds of leave a student can apply for
router.get(
  '/leave-types',
  asyncHandler(async (_req, res) =>
    res.json(
      (await listTypes({ kind: 'student' })).map((t) => ({
        id: t.id,
        name: t.name,
        yearlyDays: t.yearlyDays,
        autoApproveDays: t.autoApproveDays,
      })),
    ),
  ),
);
// Feedback and grievances: a parent or student sends one (optionally anonymous to the school) and follows its status here
router.get(
  '/children/:studentId/feedback',
  ownChild,
  asyncHandler(async (req, res) => res.json(await listOwnFeedback(req.user.id, req.student.id))),
);
router.post(
  '/children/:studentId/feedback',
  ownChild,
  asyncHandler(async (req, res) => {
    res
      .status(201)
      .json(
        await submitFeedback(
          { ...req.body, studentId: req.student.id },
          { id: req.user.id, name: req.user.name, role: req.user.role },
        ),
      );
  }),
);
router.get(
  '/feedback-meta',
  asyncHandler(async (_req, res) => res.json(await feedbackMeta())),
);
router.get('/feedback-categories', (_req, res) => res.json(FEEDBACK_CATEGORIES));

// GET /api/portal/children/:id/leave-balance -> days of each student leave type used this year against its limit
router.get(
  '/children/:studentId/leave-balance',
  ownChild,
  asyncHandler(async (req, res) => {
    const year = new Date().getFullYear();
    const types = await listTypes({ kind: 'student' });
    res.json(
      await Promise.all(
        types.map(async (t) => ({
          id: t.id,
          name: t.name,
          yearlyDays: t.yearlyDays,
          used: await daysUsed('student', req.student.id, t.id, year),
        })),
      ),
    );
  }),
);
router.get(
  '/children/:studentId/leaves',
  ownChild,
  asyncHandler(async (req, res) => {
    res.json(await listStudentLeaves({ studentId: req.student.id }));
  }),
);

router.post(
  '/children/:studentId/leaves',
  ownChild,
  asyncHandler(async (req, res) => {
    const { leaveTypeId, fromDate, toDate, reason } = req.body;
    res
      .status(201)
      .json({
        id: await applyStudentLeave(
          { studentId: req.student.id, leaveTypeId, fromDate, toDate, reason },
          req.user.id,
          req.user.role,
        ),
      });
  }),
);

router.post(
  '/children/:studentId/leaves/:id/cancel',
  ownChild,
  asyncHandler(async (req, res) => {
    await cancelStudentLeave(req.params.id, { studentId: req.student.id });
    res.json({ ok: true });
  }),
);

router.get(
  '/children/:studentId/homework',
  ownChild,
  asyncHandler(async (req, res) => {
    res.json(await homeworkForStudent(req.student));
  }),
);

router.get(
  '/children/:studentId/materials',
  ownChild,
  asyncHandler(async (req, res) => {
    if (!req.student.classId) return res.json([]);
    const rows = await StudyMaterial.findAll({
      where: { classId: req.student.classId },
      include: materialInclude,
      order: [['id', 'DESC']],
    });
    res.json(rows.map(shapeMaterial));
  }),
);

router.get(
  '/children/:studentId/lms',
  ownChild,
  asyncHandler(async (req, res) => {
    res.json(await studentCourses(req.student));
  }),
);

router.get(
  '/children/:studentId/lms/announcements',
  ownChild,
  asyncHandler(async (req, res) => {
    const courses = await studentCourses(req.student);
    res.json(
      courses.flatMap((course) =>
        course.announcements.map((announcement) => ({
          ...announcement.toJSON(),
          courseTitle: course.title,
          subjectName: course.subjectName,
        })),
      ),
    );
  }),
);

router.get(
  '/children/:studentId/lms/lessons',
  ownChild,
  asyncHandler(async (req, res) => {
    const courses = await studentCourses(req.student);
    res.json(
      courses.flatMap((course) =>
        course.lessons.map((lesson) => ({
          ...lesson,
          courseTitle: course.title,
          subjectName: course.subjectName,
        })),
      ),
    );
  }),
);

router.get(
  '/children/:studentId/lms/lessons/:lessonId/file',
  ownChild,
  asyncHandler(async (req, res) => {
    const { row, buffer } = await readStudentLessonFile(req.student, req.params.lessonId);
    res.set({
      'Content-Type': row.attachmentMime,
      'Content-Length': buffer.length,
      'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(row.attachmentName)}`,
      'X-Content-Type-Options': 'nosniff',
      'Cache-Control': 'private, no-store',
    });
    res.send(buffer);
  }),
);

router.get(
  '/children/:studentId/lms/parts/:partId/file',
  ownChild,
  asyncHandler(async (req, res) => {
    const { row, buffer } = await readStudentPartFile(req.student, req.params.partId);
    res.set({
      'Content-Type': row.attachmentMime,
      'Content-Length': buffer.length,
      'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(row.attachmentName)}`,
      'X-Content-Type-Options': 'nosniff',
      'Cache-Control': 'private, no-store',
    });
    res.send(buffer);
  }),
);

router.get(
  '/children/:studentId/lms/materials/:materialId/file',
  ownChild,
  asyncHandler(async (req, res) => {
    const { row, buffer } = await readStudentMaterialFile(req.student, req.params.materialId);
    res.set({
      'Content-Type': row.attachmentMime,
      'Content-Length': buffer.length,
      'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(row.attachmentName)}`,
      'X-Content-Type-Options': 'nosniff',
      'Cache-Control': 'private, no-store',
    });
    res.send(buffer);
  }),
);

router.get(
  '/children/:studentId/lms/assignments',
  ownChild,
  asyncHandler(async (req, res) => {
    const courses = await studentCourses(req.student);
    res.json(
      courses.flatMap((course) =>
        course.assignments.map((assignment) => ({
          ...assignment,
          courseTitle: course.title,
          subjectName: course.subjectName,
        })),
      ),
    );
  }),
);

router.get(
  '/children/:studentId/lms/quizzes',
  ownChild,
  asyncHandler(async (req, res) => {
    const courses = await studentCourses(req.student);
    res.json(
      courses.flatMap((course) =>
        course.quizzes.map((quiz) => ({
          ...quiz,
          courseTitle: course.title,
          subjectName: course.subjectName,
        })),
      ),
    );
  }),
);

router.post(
  '/children/:studentId/lms/lessons/:lessonId/complete',
  ownChild,
  asyncHandler(async (req, res) => {
    if (req.user.role !== 'student') throw forbidden('Only the student can record lesson progress');
    res.json(await completeLesson(req.student, req.params.lessonId));
  }),
);

router.post(
  '/children/:studentId/lms/lessons/:lessonId/view',
  ownChild,
  asyncHandler(async (req, res) => {
    if (req.user.role !== 'student') throw forbidden('Only the student can record lesson views');
    res.json(await recordLessonView(req.student, req.params.lessonId));
  }),
);

router.post(
  '/children/:studentId/lms/assignments/:assignmentId/submit',
  ownChild,
  asyncHandler(async (req, res) => {
    if (req.user.role !== 'student') throw forbidden('Only the student can submit their work');
    res.json(await submitAssignment(req.student, req.params.assignmentId, req.body));
  }),
);

router.post(
  '/children/:studentId/lms/assignments/:assignmentId/file',
  ownChild,
  express.raw({ type: () => true, limit: MAX_BYTES }),
  asyncHandler(async (req, res) => {
    if (req.user.role !== 'student') throw forbidden('Only the student can submit their work');
    const result = await uploadAssignmentFile(req.student, req.params.assignmentId, req.body, req.query.name);
    req.body = {
      assignmentId: Number(req.params.assignmentId),
      attachmentName: result.attachmentName,
      size: result.size,
    };
    res.json(result);
  }),
);

router.get(
  '/children/:studentId/lms/assignments/:assignmentId/file',
  ownChild,
  asyncHandler(async (req, res) => {
    const { row, buffer } = await readStudentAssignmentFile(req.student, req.params.assignmentId);
    res.set({
      'Content-Type': row.attachmentMime,
      'Content-Length': buffer.length,
      'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(row.attachmentName)}`,
      'X-Content-Type-Options': 'nosniff',
      'Cache-Control': 'private, no-store',
    });
    res.send(buffer);
  }),
);

router.post(
  '/children/:studentId/lms/quizzes/:quizId/attempts',
  ownChild,
  asyncHandler(async (req, res) => {
    if (req.user.role !== 'student') throw forbidden('Only the student can take this quiz');
    res.json(await takeQuiz(req.student, req.params.quizId, req.body?.answers));
  }),
);

// Upcoming school calendar for families: holidays, exams and events addressed to everyone or to parents
router.get(
  '/calendar',
  asyncHandler(async (req, res) => {
    const day = (v) =>
      /^\d{4}-\d{2}-\d{2}$/.test(String(v ?? '')) && !Number.isNaN(new Date(v).getTime()) ? String(v) : null;
    const from = day(req.query.from) ?? today();
    const to = day(req.query.to) ?? daysFromNow(60);
    if (to < from) throw badRequest('The end date cannot be before the start date');
    if ((new Date(to) - new Date(from)) / 86400000 > 400)
      throw badRequest('Ask for at most about a year at a time');
    res.json(await eventsBetween(from, to, audiences(req).calendar));
  }),
);

// Certificates: a parent can request them for their own child and print the ones that were issued
router.get(
  '/children/:studentId/documents',
  ownChild,
  asyncHandler(async (req, res) => {
    res.json(await listRequests({ studentId: req.student.id }));
  }),
);

router.post(
  '/children/:studentId/documents',
  ownChild,
  asyncHandler(async (req, res) => {
    const { type, purpose } = req.body;
    if (req.user.role === 'student' && type === 'transfer')
      throw forbidden('A transfer certificate is requested by your parent or at the school office.');
    res
      .status(201)
      .json({
        id: await createRequest({ studentId: req.student.id, type, purpose }, req.user.id, req.user.role),
      });
  }),
);

router.get(
  '/children/:studentId/documents/:id/print',
  ownChild,
  asyncHandler(async (req, res) => {
    res.json(await getPrintable(req.params.id, { studentId: req.student.id }));
  }),
);

router.get(
  '/children/:studentId/timetable',
  ownChild,
  asyncHandler(async (req, res) => {
    if (!req.student.classId) return res.json([]);
    const slots = await TimetableSlot.findAll({
      where: { classId: req.student.classId },
      include: [
        { model: Subject, attributes: ['name'] },
        { model: Staff, attributes: ['firstName', 'lastName'], required: false },
      ],
      order: [
        ['day', 'ASC'],
        ['period', 'ASC'],
      ],
    });
    res.json(
      slots.map((s) => ({
        id: s.id,
        day: s.day,
        period: s.period,
        subjectName: s.Subject.name,
        teacherName: s.Staff ? `${s.Staff.firstName} ${s.Staff.lastName}` : null,
      })),
    );
  }),
);

export default router;
