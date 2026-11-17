
import { ClassSubject, LmsCourse, LmsEnrollment, SchoolClass, Subject } from '../../models/index.js';
import { badRequest } from '../../utils/httpError.js';

import { getLmsFile } from './lmsFiles.service.js';
import { familyUserIds } from '../attendance/studentLeave.service.js';
import { notifyUsers } from '../push/push.service.js';

export const courseInclude = [
  { model: SchoolClass, attributes: ['name', 'section'] },
  { model: Subject, attributes: ['name'] },
];
export const safeUrl = (value, label) => {
  if (!value) return null;
  try {
    const url = new URL(value);
    if (!['http:', 'https:'].includes(url.protocol)) throw new Error();
    return url.toString();
  } catch {
    throw badRequest(`${label} must be a valid http or https URL`);
  }
};
export const quizMaxScore = (quiz) =>
  quiz.questions.reduce((sum, question) => sum + Number(question.points ?? 1), 0);

export async function mayManage(course, user) {
  if (user.role === 'admin') return true;
  if (user.role !== 'teacher' || !user.staffId) return false;
  const cls = await SchoolClass.findByPk(course.classId);
  if (cls?.classTeacherId === user.staffId) return true;
  return Boolean(
    await ClassSubject.findOne({
      where: { classId: course.classId, subjectId: course.subjectId, staffId: user.staffId },
    }),
  );
}

export async function isEnrolled(student, courseId) {
  const course = await LmsCourse.findByPk(courseId, { attributes: ['classId'] });
  if (!course || student.status !== 'active' || Number(course.classId) !== Number(student.classId))
    return false;
  return Boolean(await LmsEnrollment.findOne({ where: { studentId: student.id, courseId, active: true } }));
}

export async function readAttachment(row) {
  if (row.attachmentKey) return getLmsFile(row.attachmentKey);
  if (row.attachmentData) return Buffer.from(row.attachmentData, 'base64');
  return null;
}

export async function notifyCourseStudents(courseId, notification) {
  const enrollments = await LmsEnrollment.findAll({
    where: { courseId, active: true },
    attributes: ['studentId'],
  });
  const ids = (await Promise.all(enrollments.map((row) => familyUserIds(row.studentId)))).flat();
  await notifyUsers(ids, notification);
}
