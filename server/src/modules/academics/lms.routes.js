import express, { Router } from 'express';
import { asyncHandler } from '../../utils/asyncHandler.js';
import {
  courseEnrollments,
  createAnnouncement,
  createAssignment,
  createCourse,
  deleteAnnouncement,
  deleteAssignment,
  deleteCourse,
  deleteLesson,
  deleteMaterial,
  deleteModule,
  deletePart,
  deleteQuiz,
  gradebook,
  gradeSubmission,
  listAnnouncements,
  listAssignments,
  listCourses,
  listLessons,
  listMaterials,
  listModules,
  listParts,
  listQuizAttempts,
  listQuizzes,
  listSubmissions,
  readStaffAssignmentFile,
  readStaffLessonFile,
  readStaffMaterialFile,
  readStaffPartFile,
  reviewQuizAttempt,
  saveCourseEnrollments,
  saveLesson,
  saveMaterial,
  saveModule,
  savePart,
  saveQuiz,
  updateCourse,
  uploadLessonFile,
  uploadMaterialFile,
  uploadPartFile,
} from './lms.service.js';
const MAX_LESSON_UPLOAD = 25 * 1024 * 1024;

const router = Router();
router.get(
  '/courses',
  asyncHandler(async (req, res) => res.json(await listCourses(req.user))),
);
router.post(
  '/courses',
  asyncHandler(async (req, res) => res.status(201).json({ id: await createCourse(req.body, req.user) })),
);
router.put(
  '/courses/:id',
  asyncHandler(async (req, res) => {
    await updateCourse(req.params.id, req.body, req.user);
    res.json({ ok: true });
  }),
);
router.delete(
  '/courses/:id',
  asyncHandler(async (req, res) => {
    await deleteCourse(req.params.id, req.user);
    res.json({ ok: true });
  }),
);
router.get(
  '/courses/:id/enrollments',
  asyncHandler(async (req, res) => res.json(await courseEnrollments(req.params.id, req.user))),
);
router.put(
  '/courses/:id/enrollments',
  asyncHandler(async (req, res) =>
    res.json(await saveCourseEnrollments(req.params.id, req.body?.studentIds, req.user)),
  ),
);
router.get(
  '/courses/:id/modules',
  asyncHandler(async (req, res) => res.json(await listModules(req.params.id, req.user))),
);
router.post(
  '/courses/:id/modules',
  asyncHandler(async (req, res) =>
    res.status(201).json({ id: await saveModule(req.params.id, req.body, req.user) }),
  ),
);
router.put(
  '/courses/:id/modules/:moduleId',
  asyncHandler(async (req, res) => {
    await saveModule(req.params.id, req.body, req.user, req.params.moduleId);
    res.json({ ok: true });
  }),
);
router.delete(
  '/courses/:id/modules/:moduleId',
  asyncHandler(async (req, res) => {
    await deleteModule(req.params.id, req.params.moduleId, req.user);
    res.json({ ok: true });
  }),
);
router.get(
  '/courses/:id/lessons',
  asyncHandler(async (req, res) => res.json(await listLessons(req.params.id, req.user))),
);
router.post(
  '/courses/:id/lessons',
  asyncHandler(async (req, res) =>
    res.status(201).json({ id: await saveLesson(req.params.id, req.body, req.user) }),
  ),
);
router.put(
  '/courses/:id/lessons/:lessonId',
  asyncHandler(async (req, res) => {
    await saveLesson(req.params.id, req.body, req.user, req.params.lessonId);
    res.json({ ok: true });
  }),
);
router.delete(
  '/courses/:id/lessons/:lessonId',
  asyncHandler(async (req, res) => {
    await deleteLesson(req.params.id, req.params.lessonId, req.user);
    res.json({ ok: true });
  }),
);
router.get(
  '/courses/:id/announcements',
  asyncHandler(async (req, res) => res.json(await listAnnouncements(req.params.id, req.user))),
);
router.post(
  '/courses/:id/announcements',
  asyncHandler(async (req, res) =>
    res.status(201).json({ id: await createAnnouncement(req.params.id, req.body, req.user) }),
  ),
);
router.delete(
  '/courses/:id/announcements/:announcementId',
  asyncHandler(async (req, res) => {
    await deleteAnnouncement(req.params.id, req.params.announcementId, req.user);
    res.json({ ok: true });
  }),
);
router.post(
  '/courses/:id/lessons/:lessonId/file',
  express.raw({ type: () => true, limit: MAX_LESSON_UPLOAD }),
  asyncHandler(async (req, res) => {
    const result = await uploadLessonFile(
      req.params.id,
      req.params.lessonId,
      req.body,
      req.query.name,
      req.user,
    );
    req.body = {
      courseId: Number(req.params.id),
      lessonId: Number(req.params.lessonId),
      attachmentName: result.attachmentName,
      size: result.size,
    };
    res.json(result);
  }),
);
router.get(
  '/courses/:id/progress',
  asyncHandler(async (req, res) => res.json(await gradebook(req.params.id, req.user))),
);
router.get(
  '/courses/:id/lessons/:lessonId/file',
  asyncHandler(async (req, res) => {
    const { row, buffer } = await readStaffLessonFile(req.params.id, req.params.lessonId, req.user);
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
  '/courses/:id/lessons/:lessonId/parts',
  asyncHandler(async (req, res) => res.json(await listParts(req.params.id, req.params.lessonId, req.user))),
);
router.post(
  '/courses/:id/lessons/:lessonId/parts',
  asyncHandler(async (req, res) =>
    res.status(201).json({ id: await savePart(req.params.id, req.params.lessonId, req.body, req.user) }),
  ),
);
router.put(
  '/courses/:id/lessons/:lessonId/parts/:partId',
  asyncHandler(async (req, res) => {
    await savePart(req.params.id, req.params.lessonId, req.body, req.user, req.params.partId);
    res.json({ ok: true });
  }),
);
router.delete(
  '/courses/:id/lessons/:lessonId/parts/:partId',
  asyncHandler(async (req, res) => {
    await deletePart(req.params.id, req.params.lessonId, req.params.partId, req.user);
    res.json({ ok: true });
  }),
);
router.post(
  '/courses/:id/lessons/:lessonId/parts/:partId/file',
  express.raw({ type: () => true, limit: MAX_LESSON_UPLOAD }),
  asyncHandler(async (req, res) => {
    const result = await uploadPartFile(
      req.params.id,
      req.params.lessonId,
      req.params.partId,
      req.body,
      req.query.name,
      req.user,
    );
    req.body = {
      courseId: Number(req.params.id),
      lessonId: Number(req.params.lessonId),
      partId: Number(req.params.partId),
      attachmentName: result.attachmentName,
      size: result.size,
    };
    res.json(result);
  }),
);
router.get(
  '/courses/:id/lessons/:lessonId/parts/:partId/file',
  asyncHandler(async (req, res) => {
    const { row, buffer } = await readStaffPartFile(
      req.params.id,
      req.params.lessonId,
      req.params.partId,
      req.user,
    );
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
  '/courses/:id/materials',
  asyncHandler(async (req, res) => res.json(await listMaterials(req.params.id, req.user))),
);
router.post(
  '/courses/:id/materials',
  asyncHandler(async (req, res) =>
    res.status(201).json({ id: await saveMaterial(req.params.id, req.body, req.user) }),
  ),
);
router.put(
  '/courses/:id/materials/:materialId',
  asyncHandler(async (req, res) => {
    await saveMaterial(req.params.id, req.body, req.user, req.params.materialId);
    res.json({ ok: true });
  }),
);
router.delete(
  '/courses/:id/materials/:materialId',
  asyncHandler(async (req, res) => {
    await deleteMaterial(req.params.id, req.params.materialId, req.user);
    res.json({ ok: true });
  }),
);
router.post(
  '/courses/:id/materials/:materialId/file',
  express.raw({ type: () => true, limit: MAX_LESSON_UPLOAD }),
  asyncHandler(async (req, res) => {
    const result = await uploadMaterialFile(
      req.params.id,
      req.params.materialId,
      req.body,
      req.query.name,
      req.user,
    );
    req.body = {
      courseId: Number(req.params.id),
      materialId: Number(req.params.materialId),
      attachmentName: result.attachmentName,
      size: result.size,
    };
    res.json(result);
  }),
);
router.get(
  '/courses/:id/materials/:materialId/file',
  asyncHandler(async (req, res) => {
    const { row, buffer } = await readStaffMaterialFile(req.params.id, req.params.materialId, req.user);
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
  '/courses/:id/assignments',
  asyncHandler(async (req, res) => res.json(await listAssignments(req.params.id, req.user))),
);
router.post(
  '/courses/:id/assignments',
  asyncHandler(async (req, res) =>
    res.status(201).json({ id: await createAssignment(req.params.id, req.body, req.user) }),
  ),
);
router.put(
  '/courses/:id/assignments/:assignmentId',
  asyncHandler(async (req, res) => {
    await createAssignment(req.params.id, req.body, req.user, req.params.assignmentId);
    res.json({ ok: true });
  }),
);
router.delete(
  '/courses/:id/assignments/:assignmentId',
  asyncHandler(async (req, res) => {
    await deleteAssignment(req.params.id, req.params.assignmentId, req.user);
    res.json({ ok: true });
  }),
);
router.get(
  '/courses/:id/assignments/:assignmentId/submissions',
  asyncHandler(async (req, res) =>
    res.json(await listSubmissions(req.params.id, req.params.assignmentId, req.user)),
  ),
);
router.put(
  '/courses/:id/assignments/:assignmentId/submissions/:studentId',
  asyncHandler(async (req, res) => {
    await gradeSubmission(req.params.id, req.params.assignmentId, req.params.studentId, req.body, req.user);
    res.json({ ok: true });
  }),
);
router.get(
  '/courses/:id/assignments/:assignmentId/submissions/:studentId/file',
  asyncHandler(async (req, res) => {
    const { row, buffer } = await readStaffAssignmentFile(
      req.params.id,
      req.params.assignmentId,
      req.params.studentId,
      req.user,
    );
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
  '/courses/:id/quizzes',
  asyncHandler(async (req, res) => res.json(await listQuizzes(req.params.id, req.user))),
);
router.get(
  '/courses/:id/quizzes/:quizId/attempts',
  asyncHandler(async (req, res) =>
    res.json(await listQuizAttempts(req.params.id, req.params.quizId, req.user)),
  ),
);
router.put(
  '/courses/:id/quizzes/:quizId/attempts/:attemptId/review',
  asyncHandler(async (req, res) =>
    res.json(
      await reviewQuizAttempt(req.params.id, req.params.quizId, req.params.attemptId, req.body, req.user),
    ),
  ),
);
router.post(
  '/courses/:id/quizzes',
  asyncHandler(async (req, res) =>
    res.status(201).json({ id: await saveQuiz(req.params.id, req.body, req.user) }),
  ),
);
router.put(
  '/courses/:id/quizzes/:quizId',
  asyncHandler(async (req, res) => {
    await saveQuiz(req.params.id, req.body, req.user, req.params.quizId);
    res.json({ ok: true });
  }),
);
router.delete(
  '/courses/:id/quizzes/:quizId',
  asyncHandler(async (req, res) => {
    await deleteQuiz(req.params.id, req.params.quizId, req.user);
    res.json({ ok: true });
  }),
);
router.get(
  '/courses/:id/gradebook',
  asyncHandler(async (req, res) => res.json(await gradebook(req.params.id, req.user))),
);
export default router;
