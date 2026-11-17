import express, { Router } from 'express';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { forbidden } from '../../utils/httpError.js';
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
import { ownChild } from './portal.shared.js';

// Learning platform (LMS) pages of the parent and student portal. Mounted by portal.routes.js,
// after the portal middleware has set req.children.
const router = Router();

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

export default router;
