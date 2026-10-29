import { Op } from 'sequelize';
import { ClassSubject, LmsTag, LmsAnnouncement, LmsAssignment, LmsCourse, LmsEnrollment, LmsLesson, LmsLessonPart, LmsMaterial, LmsModule, LmsProgress, LmsQuiz, LmsQuizAttempt, LmsSubmission, SchoolClass, Student, Subject, sequelize } from '../../models/index.js';
import { badRequest, conflict, forbidden, notFound } from '../../utils/httpError.js';
import { today } from '../../utils/money.js';
import { MAX_BYTES, sniff } from '../files/files.service.js';
import { getLmsFile, putLmsFile, removeLmsFile } from './lmsFiles.service.js';
import { familyUserIds } from '../attendance/studentLeave.service.js';
import { notifyUsers } from '../push/push.service.js';
import { getSetting } from '../settings/settings.service.js';

const courseInclude = [{ model: SchoolClass, attributes: ['name', 'section'] }, { model: Subject, attributes: ['name'] }];
const safeUrl = (value, label) => {
  if (!value) return null;
  try { const url = new URL(value); if (!['http:', 'https:'].includes(url.protocol)) throw new Error(); return url.toString(); }
  catch { throw badRequest(`${label} must be a valid http or https URL`); }
};
const quizMaxScore = (quiz) => quiz.questions.reduce((sum, question) => sum + Number(question.points ?? 1), 0);

async function mayManage(course, user) {
  if (user.role === 'admin') return true;
  if (user.role !== 'teacher' || !user.staffId) return false;
  const cls = await SchoolClass.findByPk(course.classId);
  if (cls?.classTeacherId === user.staffId) return true;
  return Boolean(await ClassSubject.findOne({ where: { classId: course.classId, subjectId: course.subjectId, staffId: user.staffId } }));
}

async function isEnrolled(student, courseId) {
  const course = await LmsCourse.findByPk(courseId, { attributes: ['classId'] });
  if (!course || student.status !== 'active' || Number(course.classId) !== Number(student.classId)) return false;
  return Boolean(await LmsEnrollment.findOne({ where: { studentId: student.id, courseId, active: true } }));
}

async function readAttachment(row) {
  if (row.attachmentKey) return getLmsFile(row.attachmentKey);
  if (row.attachmentData) return Buffer.from(row.attachmentData, 'base64');
  return null;
}

export async function listCourses(user) {
  const where = {};
  if (user.role === 'teacher') {
    if (!user.staffId) return [];
    const links = await ClassSubject.findAll({ where: { staffId: user.staffId }, attributes: ['classId', 'subjectId'], raw: true });
    const classes = await SchoolClass.findAll({ where: { classTeacherId: user.staffId }, attributes: ['id'], raw: true });
    const owned = new Set(links.map((x) => `${x.classId}:${x.subjectId}`));
    const classIds = classes.map((x) => x.id);
    const rows = await LmsCourse.findAll({ include: courseInclude, order: [['id', 'DESC']] });
    const filtered = rows.filter((c) => owned.has(`${c.classId}:${c.subjectId}`) || classIds.includes(c.classId));
    return Promise.all(filtered.map(async (c) => ({ ...shapeCourse(c), lessonCount: await LmsLesson.count({ where: { courseId: c.id } }), studentCount: await LmsEnrollment.count({ where: { courseId: c.id, active: true } }) })));
  }
  const rows = await LmsCourse.findAll({ where, include: courseInclude, order: [['id', 'DESC']] });
  return Promise.all(rows.map(async (c) => ({ ...shapeCourse(c), lessonCount: await LmsLesson.count({ where: { courseId: c.id } }), studentCount: await LmsEnrollment.count({ where: { courseId: c.id, active: true } }) })));
}

const MAX_TAGS = 10;
const MAX_BANNER_CHARS = 280000; // about 200 KB of image once base64 is undone
/**
 * Tags arrive as an array of names and must come from the LMS tag master (spelling follows the master). Tags the course already
 * carries are kept even if the master dropped them since, so an old course can still be saved. Stored as JSON text.
 */
async function cleanTags(value, current = []) {
  if (!Array.isArray(value)) throw badRequest('Tags must be a list');
  const master = new Map((await LmsTag.findAll({ attributes: ['name'], raw: true })).map((t) => [t.name.toLowerCase(), t.name]));
  const keep = new Map(current.map((t) => [t.toLowerCase(), t]));
  const seen = new Set();
  const tags = [];
  for (const raw of value) {
    const key = String(raw).replace(/^#/, '').trim().toLowerCase();
    if (!key || seen.has(key)) continue;
    const name = master.get(key) ?? keep.get(key);
    if (!name) throw badRequest(`"${String(raw).trim()}" is not in the tag master. Ask an admin to add it under LMS Tags.`);
    seen.add(key); tags.push(name);
  }
  if (tags.length > MAX_TAGS) throw badRequest(`Use at most ${MAX_TAGS} tags`);
  return tags.length ? JSON.stringify(tags) : null;
}
function cleanBanner(value) {
  if (!value) return null;
  if (typeof value !== 'string' || !/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(value)) throw badRequest('The banner must be a PNG, JPG or WebP image');
  if (value.length > MAX_BANNER_CHARS) throw badRequest('The banner image must be 200 KB or smaller');
  return value;
}
const readTags = (c) => { try { return JSON.parse(c.tags ?? '[]'); } catch { return []; } };

function shapeCourse(c) {
  return { id: c.id, classId: c.classId, subjectId: c.subjectId, title: c.title, description: c.description, tags: readTags(c), certificateEnabled: Boolean(c.certificateEnabled), bannerImage: c.bannerImage ?? null, published: c.published,
    className: c.SchoolClass ? `${c.SchoolClass.name}-${c.SchoolClass.section}` : null, subjectName: c.Subject?.name ?? null, createdByName: c.createdByName };
}
function shapeLesson(l) { return { id: l.id, courseId: l.courseId, moduleId: l.moduleId ?? null, moduleTitle: l.LmsModule?.title ?? null, moduleSequence: l.LmsModule?.sequence ?? null, title: l.title, content: l.content, videoUrl: l.videoUrl, resourceUrl: l.resourceUrl, sequence: l.sequence, published: l.published, attachmentName: l.attachmentName, attachmentMime: l.attachmentMime, attachmentSize: l.attachmentSize, hasAttachment: Boolean(l.attachmentData || l.attachmentName) }; }

async function notifyCourseStudents(courseId, notification) {
  const enrollments = await LmsEnrollment.findAll({ where: { courseId, active: true }, attributes: ['studentId'] });
  const ids = (await Promise.all(enrollments.map((row) => familyUserIds(row.studentId)))).flat();
  await notifyUsers(ids, notification);
}

export async function createCourse(body, user) {
  const classId = Number(body.classId); const subjectId = Number(body.subjectId);
  if (!classId || !subjectId || !String(body.title ?? '').trim()) throw badRequest('Class, subject and course title are required');
  if (!await ClassSubject.findOne({ where: { classId, subjectId } })) throw badRequest('Choose a subject assigned to this class');
  const course = { classId, subjectId, title: String(body.title).trim().slice(0, 160), description: String(body.description ?? '').trim().slice(0, 1000) || null, tags: await cleanTags(body.tags ?? []), bannerImage: cleanBanner(body.bannerImage), certificateEnabled: Boolean(body.certificateEnabled) };
  if (user.role === 'teacher' && !await mayManage(course, user)) throw forbidden('You can only create courses for your classes and subjects');
  const existing = await LmsCourse.findOne({ where: { classId, subjectId, title: course.title } });
  if (existing) throw conflict('A course with this title already exists for the class and subject');
  const row = await sequelize.transaction(async (transaction) => {
    const created = await LmsCourse.create({ ...course, createdBy: user.id, createdByName: user.name }, { transaction });
    const students = await Student.findAll({ where: { classId, status: 'active' }, attributes: ['id'], raw: true, transaction });
    if (students.length) await LmsEnrollment.bulkCreate(students.map((student) => ({ courseId: created.id, studentId: student.id })), { transaction });
    return created;
  });
  return row.id;
}

export async function courseEnrollments(courseId, user) {
  const course = await LmsCourse.findByPk(courseId); if (!course) throw notFound('Course not found');
  if (!await mayManage(course, user)) throw forbidden('You cannot manage this course');
  const [students, enrollments] = await Promise.all([
    Student.findAll({ where: { classId: course.classId, status: 'active' }, order: [['lastName', 'ASC'], ['firstName', 'ASC']] }),
    LmsEnrollment.findAll({ where: { courseId, active: true }, attributes: ['studentId'] }),
  ]);
  const active = new Set(enrollments.map((row) => row.studentId));
  return students.map((student) => ({ id: student.id, admissionNo: student.admissionNo, name: `${student.firstName} ${student.lastName}`, enrolled: active.has(student.id) }));
}

export async function saveCourseEnrollments(courseId, studentIds, user) {
  const course = await LmsCourse.findByPk(courseId); if (!course) throw notFound('Course not found');
  if (!await mayManage(course, user)) throw forbidden('You cannot manage this course');
  if (!Array.isArray(studentIds) || studentIds.length > 1000 || studentIds.some((id) => !Number.isInteger(Number(id)) || Number(id) < 1)) throw badRequest('Choose a valid student list');
  const ids = [...new Set(studentIds.map(Number))];
  const valid = await Student.findAll({ where: { id: ids, classId: course.classId, status: 'active' }, attributes: ['id'], raw: true });
  if (valid.length !== ids.length) throw badRequest('Every enrolled student must be active and in this course’s class');
  await sequelize.transaction(async (transaction) => {
    const current = await LmsEnrollment.findAll({ where: { courseId }, transaction });
    const have = new Set(current.map((row) => row.studentId));
    for (const row of current) await row.update({ active: ids.includes(row.studentId) }, { transaction });
    const missing = ids.filter((id) => !have.has(id));
    if (missing.length) await LmsEnrollment.bulkCreate(missing.map((studentId) => ({ courseId, studentId })), { transaction });
  });
  return { ok: true, enrolled: ids.length };
}

export async function updateCourse(id, body, user) {
  const course = await LmsCourse.findByPk(id); if (!course) throw notFound('Course not found');
  if (!await mayManage(course, user)) throw forbidden('You cannot manage this course');
  const update = {};
  if (body.title !== undefined) {
    if (!String(body.title).trim()) throw badRequest('Course title is required');
    update.title = String(body.title).trim().slice(0, 160);
    if (await LmsCourse.findOne({ where: { id: { [Op.ne]: course.id }, classId: course.classId, subjectId: course.subjectId, title: update.title } })) throw conflict('A course with this title already exists for the class and subject');
  }
  if (body.description !== undefined) update.description = String(body.description).trim().slice(0, 1000) || null;
  if (body.tags !== undefined) update.tags = await cleanTags(body.tags, readTags(course));
  if (body.certificateEnabled !== undefined) update.certificateEnabled = Boolean(body.certificateEnabled);
  if (body.bannerImage !== undefined) update.bannerImage = cleanBanner(body.bannerImage);
  if (body.published !== undefined) update.published = Boolean(body.published);
  const wasPublished = course.published; await course.update(update);
  if (!wasPublished && course.published) await notifyCourseStudents(course.id, { title: 'LMS course published', body: course.title, url: '/portal?tab=LMS' });
}

export async function deleteCourse(id, user) {
  const course = await LmsCourse.findByPk(id); if (!course) throw notFound('Course not found');
  if (!await mayManage(course, user)) throw forbidden('You cannot manage this course');
  const lessonFiles = [...(await LmsLesson.findAll({ where: { courseId: id }, attributes: ['attachmentKey'] })), ...(await LmsLessonPart.findAll({ where: { courseId: id }, attributes: ['attachmentKey'] })), ...(await LmsMaterial.findAll({ where: { courseId: id }, attributes: ['attachmentKey'] }))].map((row) => row.attachmentKey).filter(Boolean);
  const assignmentIds = (await LmsAssignment.findAll({ where: { courseId: id }, attributes: ['id'] })).map((row) => row.id);
  const submissionFiles = (await LmsSubmission.findAll({ where: { assignmentId: assignmentIds }, attributes: ['attachmentKey'] })).map((row) => row.attachmentKey).filter(Boolean);
  await LmsLesson.update({ attachmentKey: null }, { where: { courseId: id } });
  await LmsLessonPart.update({ attachmentKey: null }, { where: { courseId: id } });
  await LmsMaterial.update({ attachmentKey: null }, { where: { courseId: id } });
  if (assignmentIds.length) await LmsSubmission.update({ attachmentKey: null }, { where: { assignmentId: assignmentIds } });
  await course.destroy();
  await Promise.all([...lessonFiles, ...submissionFiles].map(removeLmsFile));
}

export async function listLessons(courseId, user) {
  const course = await LmsCourse.findByPk(courseId); if (!course) throw notFound('Course not found');
  if (!await mayManage(course, user)) throw forbidden('You cannot manage this course');
  return (await LmsLesson.findAll({ where: { courseId }, attributes: { exclude: ['attachmentData'] }, include: [{ model: LmsModule, attributes: ['title', 'sequence'], required: false }], order: [['sequence', 'ASC'], ['id', 'ASC']] })).map(shapeLesson).sort((a, b) => (a.moduleSequence ?? 0) - (b.moduleSequence ?? 0) || a.sequence - b.sequence || a.id - b.id);
}

export async function listModules(courseId, user) {
  const course = await LmsCourse.findByPk(courseId); if (!course) throw notFound('Course not found');
  if (!await mayManage(course, user)) throw forbidden('You cannot manage this course');
  return LmsModule.findAll({ where: { courseId }, order: [['sequence', 'ASC'], ['id', 'ASC']] });
}

export async function saveModule(courseId, body, user, moduleId = null) {
  const course = await LmsCourse.findByPk(courseId); if (!course) throw notFound('Course not found');
  if (!await mayManage(course, user)) throw forbidden('You cannot manage this course');
  const title = String(body.title ?? '').trim();
  if (!title || title.length > 160) throw badRequest('Module title is required and must be 160 characters or fewer');
  const sequence = Number(body.sequence ?? 1);
  if (!Number.isInteger(sequence) || sequence < 1 || sequence > 10000) throw badRequest('Module order must be from 1 to 10000');
  const values = { title, description: String(body.description ?? '').trim().slice(0, 1000) || null, sequence, published: Boolean(body.published) };
  if (moduleId) {
    const row = await LmsModule.findOne({ where: { id: moduleId, courseId } }); if (!row) throw notFound('Module not found');
    const wasPublished = row.published; await row.update(values);
    if (!wasPublished && row.published && course.published) await notifyCourseStudents(courseId, { title: 'New LMS module', body: row.title, url: '/portal?tab=LMS' });
    return row.id;
  }
  const row = await LmsModule.create({ courseId, ...values });
  if (row.published && course.published) await notifyCourseStudents(courseId, { title: 'New LMS module', body: row.title, url: '/portal?tab=LMS' });
  return row.id;
}

export async function deleteModule(courseId, moduleId, user) {
  const course = await LmsCourse.findByPk(courseId); if (!course) throw notFound('Course not found');
  if (!await mayManage(course, user)) throw forbidden('You cannot manage this course');
  const row = await LmsModule.findOne({ where: { id: moduleId, courseId } }); if (!row) throw notFound('Module not found');
  if (await LmsLesson.count({ where: { moduleId } })) throw conflict('Move or delete this module’s lessons before deleting it');
  await row.destroy();
}

export async function listAnnouncements(courseId, user) {
  const course = await LmsCourse.findByPk(courseId); if (!course) throw notFound('Course not found');
  if (!await mayManage(course, user)) throw forbidden('You cannot manage this course');
  return LmsAnnouncement.findAll({ where: { courseId }, order: [['createdAt', 'DESC']] });
}

export async function createAnnouncement(courseId, body, user) {
  const course = await LmsCourse.findByPk(courseId); if (!course) throw notFound('Course not found');
  if (!await mayManage(course, user)) throw forbidden('You cannot manage this course');
  const title = String(body.title ?? '').trim(); const announcementBody = String(body.body ?? '').trim();
  if (!title || !announcementBody) throw badRequest('Announcement title and message are required');
  const row = await LmsAnnouncement.create({ courseId, title: title.slice(0, 160), body: announcementBody.slice(0, 12000), published: body.published !== false, createdByName: user.name });
  if (row.published && course.published) await notifyCourseStudents(courseId, { title: `Course announcement: ${row.title}`, body: announcementBody.slice(0, 240), url: '/portal?tab=LMS' });
  return row.id;
}

export async function deleteAnnouncement(courseId, announcementId, user) {
  const course = await LmsCourse.findByPk(courseId); if (!course) throw notFound('Course not found');
  if (!await mayManage(course, user)) throw forbidden('You cannot manage this course');
  const row = await LmsAnnouncement.findOne({ where: { id: announcementId, courseId } }); if (!row) throw notFound('Announcement not found');
  await row.destroy();
}

export async function saveLesson(courseId, body, user, lessonId = null) {
  const course = await LmsCourse.findByPk(courseId); if (!course) throw notFound('Course not found');
  if (!await mayManage(course, user)) throw forbidden('You cannot manage this course');
  const title = String(body.title ?? '').trim();
  if (!title) throw badRequest('Lesson title is required');
  const moduleId = body.moduleId === undefined || body.moduleId === null || body.moduleId === '' ? null : Number(body.moduleId);
  if (moduleId !== null && (!Number.isInteger(moduleId) || !await LmsModule.findOne({ where: { id: moduleId, courseId } }))) throw badRequest('Choose a module from this course');
  const values = { moduleId, title: title.slice(0, 160), content: String(body.content ?? '').slice(0, 12000) || null,
    videoUrl: safeUrl(body.videoUrl, 'Video link'), resourceUrl: safeUrl(body.resourceUrl, 'Resource link'),
    sequence: Math.max(1, Number.parseInt(body.sequence, 10) || 1), published: Boolean(body.published) };
  if (lessonId) {
    const lesson = await LmsLesson.findOne({ where: { id: lessonId, courseId }, attributes: { exclude: ['attachmentData'] } }); if (!lesson) throw notFound('Lesson not found');
    const wasPublished = lesson.published; await lesson.update(values);
    if (!wasPublished && lesson.published && course.published) await notifyCourseStudents(courseId, { title: 'New LMS lesson', body: lesson.title, url: '/portal?tab=LMS' });
    return lesson.id;
  }
  const lesson = await LmsLesson.create({ courseId, ...values });
  if (lesson.published && course.published) await notifyCourseStudents(courseId, { title: 'New LMS lesson', body: lesson.title, url: '/portal?tab=LMS' });
  return lesson.id;
}

export async function deleteLesson(courseId, lessonId, user) {
  const course = await LmsCourse.findByPk(courseId); if (!course) throw notFound('Course not found');
  if (!await mayManage(course, user)) throw forbidden('You cannot manage this course');
  const lesson = await LmsLesson.findOne({ where: { id: lessonId, courseId }, attributes: { exclude: ['attachmentData'] } }); if (!lesson) throw notFound('Lesson not found');
  const oldKey = lesson.attachmentKey;
  const partKeys = (await LmsLessonPart.findAll({ where: { lessonId }, attributes: ['attachmentKey'] })).map((row) => row.attachmentKey).filter(Boolean);
  if (oldKey) await lesson.update({ attachmentKey: null });
  await LmsLessonPart.update({ attachmentKey: null }, { where: { lessonId } });
  await lesson.destroy();
  await Promise.all([oldKey, ...partKeys].map(removeLmsFile));
}

export async function uploadLessonFile(courseId, lessonId, buffer, originalName, user) {
  const course = await LmsCourse.findByPk(courseId); if (!course) throw notFound('Course not found');
  if (!await mayManage(course, user)) throw forbidden('You cannot manage this course');
  const lesson = await LmsLesson.findOne({ where: { id: lessonId, courseId } }); if (!lesson) throw notFound('Lesson not found');
  const { name, mimeType } = checkLessonFile(buffer, originalName);
  const attachmentName = name;
  const attachmentKey = await putLmsFile(buffer);
  const oldKey = lesson.attachmentKey;
  try { await lesson.update({ attachmentData: null, attachmentKey, attachmentName, attachmentMime: mimeType, attachmentSize: buffer.length }); }
  catch (error) { await removeLmsFile(attachmentKey); throw error; }
  if (oldKey) await removeLmsFile(oldKey);
  if (lesson.published && course.published) await notifyCourseStudents(courseId, { title: 'New LMS learning resource', body: lesson.title, url: '/portal?tab=LMS' });
  return { ok: true, attachmentName, size: buffer.length };
}

/** Validates a lesson file from its bytes (25 MB max) and returns its clean name and detected media type. */
function checkLessonFile(buffer, originalName) {
  if (!Buffer.isBuffer(buffer) || !buffer.length) throw badRequest('Choose a file to upload');
  const maxBytes = 25 * 1024 * 1024;
  if (buffer.length > maxBytes) throw badRequest(`File is larger than ${maxBytes / 1024 / 1024} MB`);
  const name = String(originalName || 'lesson-resource').slice(0, 255);
  const ext = name.toLowerCase().split('.').pop();
  const sniffed = sniff(buffer);
  const office = ['docx', 'xlsx', 'pptx'].includes(ext) && buffer.subarray(0, 2).toString('hex') === '504b';
  const legacyOffice = ['doc', 'xls', 'ppt'].includes(ext) && buffer.subarray(0, 4).toString('hex') === 'd0cf11e0';
  const textDoc = ['txt', 'csv', 'md'].includes(ext) && !buffer.subarray(0, Math.min(buffer.length, 4096)).includes(0);
  const videos = { mp4: ['video/mp4', buffer.subarray(4, 8).toString('latin1') === 'ftyp'], m4v: ['video/mp4', buffer.subarray(4, 8).toString('latin1') === 'ftyp'], mov: ['video/quicktime', buffer.subarray(4, 8).toString('latin1') === 'ftyp'], webm: ['video/webm', buffer.subarray(0, 4).toString('hex') === '1a45dfa3'] };
  let mimeType = sniffed;
  if (videos[ext]?.[1]) mimeType = videos[ext][0];
  else if (office || legacyOffice) mimeType = ({ doc: 'application/msword', xls: 'application/vnd.ms-excel', ppt: 'application/vnd.ms-powerpoint', docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation' })[ext];
  else if (textDoc) mimeType = ({ txt: 'text/plain', csv: 'text/csv', md: 'text/markdown' })[ext];
  else if (['pdf', 'jpg', 'jpeg', 'png', 'webp'].includes(ext) && sniffed === 'application/pdf' || ['jpg', 'jpeg', 'png', 'webp'].includes(ext) && ['image/jpeg', 'image/png', 'image/webp'].includes(sniffed)) mimeType = sniffed;
  else mimeType = null;
  if (!mimeType) throw badRequest('Upload PDF, image, Word, Excel, PowerPoint, text, CSV, Markdown or MP4, MOV, M4V, WebM video (up to 25 MB)');
  return { name, mimeType };
}

// ---- Lesson parts: a topic is built from ordered parts (text, video link, web link, file) uploaded one at a time ----
const PART_KINDS = ['text', 'video', 'link', 'file'];
const shapePart = (p) => ({ id: p.id, lessonId: p.lessonId, kind: p.kind, title: p.title, content: p.content, url: p.url, sequence: p.sequence, published: p.published, attachmentName: p.attachmentName, attachmentMime: p.attachmentMime, attachmentSize: p.attachmentSize, hasAttachment: Boolean(p.attachmentKey) });

async function partContext(courseId, lessonId, user) {
  const course = await LmsCourse.findByPk(courseId); if (!course) throw notFound('Course not found');
  if (!await mayManage(course, user)) throw forbidden('You cannot manage this course');
  const lesson = await LmsLesson.findOne({ where: { id: lessonId, courseId }, attributes: { exclude: ['attachmentData'] } }); if (!lesson) throw notFound('Lesson not found');
  return { course, lesson };
}

export async function listParts(courseId, lessonId, user) {
  await partContext(courseId, lessonId, user);
  return (await LmsLessonPart.findAll({ where: { lessonId }, order: [['sequence', 'ASC'], ['id', 'ASC']] })).map(shapePart);
}

export async function savePart(courseId, lessonId, body, user, partId = null) {
  const { course, lesson } = await partContext(courseId, lessonId, user);
  const existing = partId ? await LmsLessonPart.findOne({ where: { id: partId, lessonId } }) : null;
  if (partId && !existing) throw notFound('Lesson part not found');
  const kind = existing ? existing.kind : body.kind;
  if (!PART_KINDS.includes(kind)) throw badRequest('Choose a part type: text, video link, web link or file');
  const title = String(body.title ?? '').trim();
  if (!title || title.length > 160) throw badRequest('Part title is required and must be 160 characters or fewer');
  const sequence = Number(body.sequence ?? 1);
  if (!Number.isInteger(sequence) || sequence < 1 || sequence > 10000) throw badRequest('Part order must be from 1 to 10000');
  const content = String(body.content ?? '').slice(0, 12000) || null;
  const url = kind === 'video' || kind === 'link' ? safeUrl(body.url, kind === 'video' ? 'Video link' : 'Web link') : null;
  if (kind === 'text' && !content) throw badRequest('Write the text for this part');
  if ((kind === 'video' || kind === 'link') && !url) throw badRequest(`Enter the ${kind === 'video' ? 'video' : 'web'} link`);
  const values = { title, sequence, content, url, published: Boolean(body.published) };
  let part;
  if (existing) { const wasPublished = existing.published; await existing.update(values); part = existing; if (wasPublished) return part.id; }
  else part = await LmsLessonPart.create({ courseId, lessonId, kind, ...values });
  if (part.published && lesson.published && course.published) await notifyCourseStudents(courseId, { title: 'New LMS lesson material', body: `${lesson.title}: ${part.title}`, url: '/portal?tab=LMS' });
  return part.id;
}

export async function deletePart(courseId, lessonId, partId, user) {
  await partContext(courseId, lessonId, user);
  const part = await LmsLessonPart.findOne({ where: { id: partId, lessonId } }); if (!part) throw notFound('Lesson part not found');
  const key = part.attachmentKey;
  if (key) await part.update({ attachmentKey: null });
  await part.destroy();
  await removeLmsFile(key);
}

export async function uploadPartFile(courseId, lessonId, partId, buffer, originalName, user) {
  const { course, lesson } = await partContext(courseId, lessonId, user);
  const part = await LmsLessonPart.findOne({ where: { id: partId, lessonId } }); if (!part) throw notFound('Lesson part not found');
  if (part.kind !== 'file') throw badRequest('Only a file part can hold an uploaded file');
  const { name, mimeType } = checkLessonFile(buffer, originalName);
  const attachmentKey = await putLmsFile(buffer);
  const oldKey = part.attachmentKey;
  try { await part.update({ attachmentKey, attachmentName: name, attachmentMime: mimeType, attachmentSize: buffer.length }); }
  catch (error) { await removeLmsFile(attachmentKey); throw error; }
  if (oldKey) await removeLmsFile(oldKey);
  if (part.published && lesson.published && course.published) await notifyCourseStudents(courseId, { title: 'New LMS learning resource', body: `${lesson.title}: ${part.title}`, url: '/portal?tab=LMS' });
  return { ok: true, attachmentName: name, size: buffer.length };
}

export async function readStaffPartFile(courseId, lessonId, partId, user) {
  await partContext(courseId, lessonId, user);
  const row = await LmsLessonPart.findOne({ where: { id: partId, lessonId } });
  const buffer = row?.attachmentKey ? await getLmsFile(row.attachmentKey) : null;
  if (!buffer) throw notFound('Lesson file not found');
  return { row, buffer };
}

export async function readStudentPartFile(student, partId) {
  const row = await LmsLessonPart.findOne({ where: { id: partId, published: true, kind: 'file' }, include: [{ model: LmsLesson, where: { published: true }, attributes: ['id', 'moduleId'] }, { model: LmsCourse, where: { classId: student.classId, published: true }, attributes: ['id'] }] });
  if (!row || !await isEnrolled(student, row.courseId)) throw notFound('Lesson file not found');
  if (row.LmsLesson.moduleId && !await LmsModule.findOne({ where: { id: row.LmsLesson.moduleId, courseId: row.courseId, published: true } })) throw notFound('Lesson file not found');
  const buffer = row.attachmentKey ? await getLmsFile(row.attachmentKey) : null;
  if (!buffer) throw notFound('Lesson file not found');
  return { row, buffer };
}

// ---- Course materials (Content Library): documents, files and links added to a course for learning ----
const MATERIAL_KINDS = ['file', 'link', 'video'];
const shapeMaterial = (m) => ({ id: m.id, courseId: m.courseId, kind: m.kind, title: m.title, description: m.description, url: m.url, published: m.published, attachmentName: m.attachmentName, attachmentMime: m.attachmentMime, attachmentSize: m.attachmentSize, hasAttachment: Boolean(m.attachmentKey), createdAt: m.createdAt });

async function materialCourse(courseId, user) {
  const course = await LmsCourse.findByPk(courseId); if (!course) throw notFound('Course not found');
  if (!await mayManage(course, user)) throw forbidden('You cannot manage this course');
  return course;
}

export async function listMaterials(courseId, user) {
  await materialCourse(courseId, user);
  return (await LmsMaterial.findAll({ where: { courseId }, order: [['createdAt', 'DESC'], ['id', 'DESC']] })).map(shapeMaterial);
}

export async function saveMaterial(courseId, body, user, materialId = null) {
  const course = await materialCourse(courseId, user);
  const existing = materialId ? await LmsMaterial.findOne({ where: { id: materialId, courseId } }) : null;
  if (materialId && !existing) throw notFound('Material not found');
  const kind = existing ? existing.kind : body.kind;
  if (!MATERIAL_KINDS.includes(kind)) throw badRequest('Choose a material type: file, web link or video link');
  const title = String(body.title ?? '').trim();
  if (!title || title.length > 160) throw badRequest('Material title is required and must be 160 characters or fewer');
  const url = kind === 'file' ? null : safeUrl(body.url, kind === 'video' ? 'Video link' : 'Web link');
  if (kind !== 'file' && !url) throw badRequest(`Enter the ${kind === 'video' ? 'video' : 'web'} link`);
  const values = { title, description: String(body.description ?? '').trim().slice(0, 1000) || null, url, published: Boolean(body.published) };
  let row;
  if (existing) { const was = existing.published; await existing.update(values); row = existing; if (was) return row.id; }
  else row = await LmsMaterial.create({ courseId, kind, ...values });
  if (row.published && course.published && row.kind !== 'file') await notifyCourseStudents(courseId, { title: 'New LMS learning material', body: row.title, url: '/portal?tab=LMS' });
  return row.id;
}

export async function deleteMaterial(courseId, materialId, user) {
  await materialCourse(courseId, user);
  const row = await LmsMaterial.findOne({ where: { id: materialId, courseId } }); if (!row) throw notFound('Material not found');
  const key = row.attachmentKey;
  if (key) await row.update({ attachmentKey: null });
  await row.destroy();
  await removeLmsFile(key);
}

export async function uploadMaterialFile(courseId, materialId, buffer, originalName, user) {
  const course = await materialCourse(courseId, user);
  const row = await LmsMaterial.findOne({ where: { id: materialId, courseId } }); if (!row) throw notFound('Material not found');
  if (row.kind !== 'file') throw badRequest('Only a file material can hold an uploaded file');
  const { name, mimeType } = checkLessonFile(buffer, originalName);
  const attachmentKey = await putLmsFile(buffer);
  const oldKey = row.attachmentKey;
  try { await row.update({ attachmentKey, attachmentName: name, attachmentMime: mimeType, attachmentSize: buffer.length }); }
  catch (error) { await removeLmsFile(attachmentKey); throw error; }
  if (oldKey) await removeLmsFile(oldKey);
  if (row.published && course.published) await notifyCourseStudents(courseId, { title: 'New LMS learning material', body: row.title, url: '/portal?tab=LMS' });
  return { ok: true, attachmentName: name, size: buffer.length };
}

export async function readStaffMaterialFile(courseId, materialId, user) {
  await materialCourse(courseId, user);
  const row = await LmsMaterial.findOne({ where: { id: materialId, courseId } });
  const buffer = row?.attachmentKey ? await getLmsFile(row.attachmentKey) : null;
  if (!buffer) throw notFound('Material file not found');
  return { row, buffer };
}

export async function readStudentMaterialFile(student, materialId) {
  const row = await LmsMaterial.findOne({ where: { id: materialId, published: true, kind: 'file' }, include: [{ model: LmsCourse, where: { classId: student.classId, published: true }, attributes: ['id'] }] });
  if (!row || !await isEnrolled(student, row.courseId)) throw notFound('Material file not found');
  const buffer = row.attachmentKey ? await getLmsFile(row.attachmentKey) : null;
  if (!buffer) throw notFound('Material file not found');
  return { row, buffer };
}

export async function readStaffLessonFile(courseId, lessonId, user) {
  const course = await LmsCourse.findByPk(courseId); if (!course) throw notFound('Course not found');
  if (!await mayManage(course, user)) throw forbidden('You cannot view this course');
  const row = await LmsLesson.findOne({ where: { id: lessonId, courseId } });
  const buffer = row && await readAttachment(row);
  if (!buffer) throw notFound('Lesson document not found');
  return { row, buffer };
}

export async function readStudentLessonFile(student, lessonId) {
  const row = await LmsLesson.findOne({ where: { id: lessonId, published: true }, include: [{ model: LmsCourse, where: { classId: student.classId, published: true } }] });
  if (!row || !await isEnrolled(student, row.courseId)) throw notFound('Lesson not found');
  if (row.moduleId && !await LmsModule.findOne({ where: { id: row.moduleId, courseId: row.courseId, published: true } })) throw notFound('Lesson not found');
  const buffer = await readAttachment(row);
  if (!buffer) throw notFound('Lesson document not found');
  return { row, buffer };
}

export async function recordLessonView(student, lessonId) {
  const lesson = await LmsLesson.findOne({ where: { id: lessonId, published: true }, include: [{ model: LmsCourse, where: { classId: student.classId, published: true } }] });
  if (!lesson) throw notFound('Lesson not found');
  if (!await isEnrolled(student, lesson.courseId)) throw notFound('Lesson not found');
  if (lesson.moduleId && !await LmsModule.findOne({ where: { id: lesson.moduleId, courseId: lesson.courseId, published: true } })) throw notFound('Lesson not found');
  const [progress, created] = await LmsProgress.findOrCreate({ where: { studentId: student.id, lessonId }, defaults: { viewedAt: new Date(), viewCount: 1, completedAt: null } });
  let viewCount = 1;
  if (!created && progress.viewedAt) { viewCount = Number(progress.viewCount) + 1; await progress.increment('viewCount'); }
  else if (!created) await progress.update({ viewedAt: new Date(), viewCount: 1 });
  return { ok: true, viewCount };
}

export async function studentCourses(student, { markProgress = false } = {}) {
  const enrollmentRows = await LmsEnrollment.findAll({ where: { studentId: student.id, active: true }, attributes: ['courseId'] });
  if (!enrollmentRows.length) return [];
  const courses = await LmsCourse.findAll({ where: { id: enrollmentRows.map((row) => row.courseId), classId: student.classId, published: true }, include: courseInclude, order: [['id', 'ASC']] });
  const out = [];
  const schoolName = courses.some((c) => c.certificateEnabled) ? await getSetting('school.name') : null;
  for (const course of courses) {
    const publishedModules = await LmsModule.findAll({ where: { courseId: course.id, published: true }, attributes: ['id'], raw: true });
    const lessons = await LmsLesson.findAll({ where: { courseId: course.id, published: true, [Op.or]: [{ moduleId: null }, { moduleId: publishedModules.map((m) => m.id) }] }, attributes: { exclude: ['attachmentData'] }, include: [{ model: LmsModule, attributes: ['title', 'sequence'], required: false }], order: [['sequence', 'ASC'], ['id', 'ASC']] });
    lessons.sort((a, b) => (a.LmsModule?.sequence ?? 0) - (b.LmsModule?.sequence ?? 0) || a.sequence - b.sequence || a.id - b.id);
    const progress = await LmsProgress.findAll({ where: { studentId: student.id, lessonId: lessons.map((l) => l.id) } });
    const progressByLesson = new Map(progress.map((p) => [p.lessonId, p]));
    const partRows = await LmsLessonPart.findAll({ where: { lessonId: lessons.map((l) => l.id), published: true }, order: [['sequence', 'ASC'], ['id', 'ASC']] });
    const materialRows = (await LmsMaterial.findAll({ where: { courseId: course.id, published: true }, order: [['createdAt', 'DESC'], ['id', 'DESC']] })).map(shapeMaterial);
    const lessonRows = lessons.map((l) => { const p = progressByLesson.get(l.id); return { ...shapeLesson(l), parts: partRows.filter((x) => x.lessonId === l.id).map(shapePart), completedAt: p?.completedAt ?? null, viewedAt: p?.viewedAt ?? p?.completedAt ?? null, viewCount: p ? Number(p.viewCount || (p.completedAt ? 1 : 0)) : 0 }; });
    const assignments = await LmsAssignment.findAll({ where: { courseId: course.id, published: true }, order: [['dueOn', 'ASC'], ['id', 'ASC']] });
    const submissions = await LmsSubmission.findAll({ where: { studentId: student.id, assignmentId: assignments.map((a) => a.id) }, attributes: { exclude: ['attachmentData'] } });
    const submissionById = new Map(submissions.map((s) => [s.assignmentId, s]));
    const quizzes = await LmsQuiz.findAll({ where: { courseId: course.id, published: true }, order: [['id', 'ASC']] });
    const announcements = await LmsAnnouncement.findAll({ where: { courseId: course.id, published: true }, order: [['createdAt', 'DESC']] });
    const attempts = await LmsQuizAttempt.findAll({ where: { studentId: student.id, quizId: quizzes.map((q) => q.id) }, order: [['attemptNo', 'DESC']] });
    const completed = lessonRows.filter((l) => l.completedAt).length;
    const earned = lessonRows.length > 0 && completed === lessonRows.length;
    const finishedAt = earned ? new Date(Math.max(...lessonRows.map((l) => new Date(l.completedAt).getTime()))) : null;
    const certificate = course.certificateEnabled ? { earned, issuedOn: finishedAt ? finishedAt.toISOString().slice(0, 10) : null, studentName: `${student.firstName} ${student.lastName}`, admissionNo: student.admissionNo, schoolName } : null;
    out.push({ ...shapeCourse(course), certificate, lessons: lessonRows, materials: materialRows, completed, total: lessonRows.length, status: !lessonRows.length || !lessonRows.some((l) => l.viewedAt || l.completedAt) ? 'Not started' : completed === lessonRows.length ? 'Completed' : 'In progress', completionPercent: lessonRows.length ? Math.round(completed * 100 / lessonRows.length) : 0,
      assignments: assignments.map((a) => { const s = submissionById.get(a.id); const submittedDay = s?.submittedAt ? new Date(s.submittedAt).toISOString().slice(0, 10) : null; return { id: a.id, title: a.title, instructions: a.instructions, dueOn: a.dueOn, maxScore: a.maxScore, overdue: Boolean(!s && a.dueOn && a.dueOn < today()), submission: s ? { response: s.response, resourceUrl: s.resourceUrl, attachmentName: s.attachmentName, attachmentSize: s.attachmentSize, submittedAt: s.submittedAt, isLate: Boolean(a.dueOn && submittedDay > a.dueOn), score: s.score, feedback: s.feedback, gradedAt: s.gradedAt } : null }; }),
      quizzes: quizzes.map((q) => { const mine = attempts.filter((a) => a.quizId === q.id); const latest = mine[0]; const results = latest ? q.questions.map((question) => { const answer = latest.answers[question.id]; const type = question.type || 'single_choice'; const correct = type === 'short_answer' ? null : type === 'multiple_choice' ? JSON.stringify(answer) === JSON.stringify(question.correctIndexes) : Number(answer) === Number(question.correctIndex); return { id: question.id, type, prompt: question.prompt, answer, points: Number(question.points ?? 1), correctAnswer: type === 'short_answer' ? null : type === 'multiple_choice' ? question.correctIndexes : question.correctIndex, correct, awarded: Number(latest.questionScores?.[question.id] ?? (correct ? question.points ?? 1 : 0)) }; }) : null; return { id: q.id, title: q.title, description: q.description, dueOn: q.dueOn, overdue: Boolean(q.dueOn && q.dueOn < today() && mine.length < q.maxAttempts), maxAttempts: q.maxAttempts, attemptCount: mine.length, bestScore: mine.length ? Math.max(...mine.map((a) => Number(a.score))) : null, maxScore: quizMaxScore(q), questions: q.questions.map(({ id, type, prompt, choices }) => ({ id, type: type || 'single_choice', prompt, choices })), latestAttempt: latest ? { score: Number(latest.score), maxScore: Number(latest.maxScore), reviewStatus: latest.reviewStatus, feedback: latest.feedback, completedAt: latest.completedAt, questions: results } : null }; }), announcements,
    });
  }
  return out;
}

export async function completeLesson(student, lessonId) {
  const lesson = await LmsLesson.findOne({ where: { id: lessonId, published: true }, include: [{ model: LmsCourse, where: { classId: student.classId, published: true } }] });
  if (!lesson) throw notFound('Lesson not found');
  if (!await isEnrolled(student, lesson.courseId)) throw notFound('Lesson not found');
  if (lesson.moduleId && !await LmsModule.findOne({ where: { id: lesson.moduleId, courseId: lesson.courseId, published: true } })) throw notFound('Lesson not found');
  await LmsProgress.findOrCreate({ where: { studentId: student.id, lessonId }, defaults: { viewedAt: new Date(), viewCount: 1, completedAt: new Date() } });
  await LmsProgress.update({ completedAt: new Date() }, { where: { studentId: student.id, lessonId, completedAt: null } });
  await LmsProgress.update({ viewedAt: new Date(), viewCount: 1 }, { where: { studentId: student.id, lessonId, viewedAt: null } });
  return { ok: true };
}

export async function createAssignment(courseId, body, user, id = null) {
  const course = await LmsCourse.findByPk(courseId); if (!course) throw notFound('Course not found');
  if (!await mayManage(course, user)) throw forbidden('You cannot manage this course');
  const title = String(body.title ?? '').trim(); if (!title) throw badRequest('Assignment title is required');
  const maxScore = Number(body.maxScore ?? 100); if (!Number.isInteger(maxScore) || maxScore < 1 || maxScore > 10000) throw badRequest('Maximum score must be between 1 and 10000');
  const dueOn = body.dueOn || null;
  if (dueOn && (!/^\d{4}-\d{2}-\d{2}$/.test(dueOn) || Number.isNaN(Date.parse(`${dueOn}T00:00:00Z`)) || new Date(`${dueOn}T00:00:00Z`).toISOString().slice(0, 10) !== dueOn)) throw badRequest('Due date must be a valid date');
  const values = { title: title.slice(0, 160), instructions: String(body.instructions ?? '').slice(0, 12000) || null, dueOn, maxScore, published: Boolean(body.published) };
  if (id) {
    const assignment = await LmsAssignment.findOne({ where: { id, courseId } }); if (!assignment) throw notFound('Assignment not found');
    const topScore = await LmsSubmission.max('score', { where: { assignmentId: id } });
    if (topScore !== null && topScore > maxScore) throw conflict(`A submitted score (${topScore}) is higher than this maximum`);
    const wasPublished = assignment.published; await assignment.update(values);
    if (!wasPublished && assignment.published && course.published) await notifyCourseStudents(courseId, { title: 'New LMS assignment', body: `${assignment.title}${assignment.dueOn ? ` · due ${assignment.dueOn}` : ''}`, url: '/portal?tab=LMS' });
    return assignment.id;
  }
  const assignment = await LmsAssignment.create({ courseId, ...values });
  if (assignment.published && course.published) await notifyCourseStudents(courseId, { title: 'New LMS assignment', body: `${assignment.title}${assignment.dueOn ? ` · due ${assignment.dueOn}` : ''}`, url: '/portal?tab=LMS' });
  return assignment.id;
}

export async function listAssignments(courseId, user) {
  const course = await LmsCourse.findByPk(courseId); if (!course) throw notFound('Course not found');
  if (!await mayManage(course, user)) throw forbidden('You cannot manage this course');
  const rows = await LmsAssignment.findAll({ where: { courseId }, order: [['dueOn', 'ASC'], ['id', 'ASC']] });
  return Promise.all(rows.map(async (a) => ({ ...a.toJSON(), submissions: await LmsSubmission.count({ where: { assignmentId: a.id } }), graded: await LmsSubmission.count({ where: { assignmentId: a.id, gradedAt: { [Op.not]: null } } }) })));
}

export async function deleteAssignment(courseId, id, user) {
  const course = await LmsCourse.findByPk(courseId); if (!course) throw notFound('Course not found');
  if (!await mayManage(course, user)) throw forbidden('You cannot manage this course');
  const row = await LmsAssignment.findOne({ where: { id, courseId } }); if (!row) throw notFound('Assignment not found');
  const fileKeys = (await LmsSubmission.findAll({ where: { assignmentId: id }, attributes: ['attachmentKey'] })).map((submission) => submission.attachmentKey).filter(Boolean);
  await LmsSubmission.update({ attachmentKey: null }, { where: { assignmentId: id } });
  await row.destroy();
  await Promise.all(fileKeys.map(removeLmsFile));
}

export async function submitAssignment(student, id, body) {
  const assignment = await LmsAssignment.findByPk(id, { include: [{ model: LmsCourse }] });
  if (!assignment || !assignment.published || !assignment.LmsCourse.published || assignment.LmsCourse.classId !== student.classId) throw notFound('Assignment not found');
  if (!await isEnrolled(student, assignment.courseId)) throw notFound('Assignment not found');
  const response = String(body.response ?? '').trim(); const resourceUrl = safeUrl(body.resourceUrl, 'Submission link');
  const existing = await LmsSubmission.findOne({ where: { assignmentId: id, studentId: student.id }, attributes: { exclude: ['attachmentData'] } });
  if (existing?.gradedAt) throw conflict('This assignment has already been graded and can no longer be changed');
  if (!response && !resourceUrl && !existing?.attachmentName) throw badRequest('Write a response, provide a work link or attach a file');
  const values = { response: response.slice(0, 12000) || '(Link submission)', resourceUrl, submittedAt: new Date() };
  if (existing) await existing.update(values); else await LmsSubmission.create({ assignmentId: id, studentId: student.id, ...values });
  return { ok: true };
}

export async function gradebook(courseId, user) {
  const course = await LmsCourse.findByPk(courseId); if (!course) throw notFound('Course not found');
  if (!await mayManage(course, user)) throw forbidden('You cannot view this course gradebook');
  const enrolledIds = (await LmsEnrollment.findAll({ where: { courseId, active: true }, attributes: ['studentId'] })).map((row) => row.studentId);
  const [students, assignments, quizzes, lessons] = await Promise.all([
    Student.findAll({ where: { id: enrolledIds, status: 'active' }, order: [['lastName', 'ASC'], ['firstName', 'ASC']] }),
    LmsAssignment.findAll({ where: { courseId }, order: [['id', 'ASC']] }), LmsQuiz.findAll({ where: { courseId }, order: [['id', 'ASC']] }),
    LmsLesson.findAll({ where: { courseId, published: true }, attributes: ['id'] }),
  ]);
  const studentIds = students.map((s) => s.id);
  const assignmentIds = assignments.map((a) => a.id); const quizIds = quizzes.map((q) => q.id);
  const [submissions, attempts, progress] = await Promise.all([
    LmsSubmission.findAll({ where: { studentId: studentIds, assignmentId: assignmentIds }, attributes: { exclude: ['attachmentData'] } }),
    LmsQuizAttempt.findAll({ where: { studentId: studentIds, quizId: quizIds } }),
    LmsProgress.findAll({ where: { studentId: studentIds, lessonId: lessons.map((l) => l.id) } }),
  ]);
  return { assignments: assignments.map(({ id, title, maxScore }) => ({ id, title, maxScore })), quizzes: quizzes.map((q) => ({ id: q.id, title: q.title, maxScore: quizMaxScore(q) })),
    rows: students.map((s) => ({ studentId: s.id, admissionNo: s.admissionNo, name: `${s.firstName} ${s.lastName}`,
      lessonsViewed: progress.filter((p) => p.studentId === s.id && (p.viewedAt || p.completedAt)).length,
      lessonViews: progress.filter((p) => p.studentId === s.id).reduce((sum, p) => sum + Number(p.viewCount || (p.completedAt ? 1 : 0)), 0),
      lessonsCompleted: progress.filter((p) => p.studentId === s.id && p.completedAt).length, lessonsTotal: lessons.length,
      courseStatus: !lessons.length || !progress.some((p) => p.studentId === s.id && (p.completedAt || p.viewedAt)) ? 'Not started' : progress.filter((p) => p.studentId === s.id && p.completedAt).length >= lessons.length ? 'Completed' : 'In progress',
      assignments: assignments.map((a) => { const sub = submissions.find((x) => x.studentId === s.id && x.assignmentId === a.id); return { submitted: Boolean(sub), score: sub?.score ?? null, feedback: sub?.feedback ?? null }; }),
      quizzes: quizzes.map((q) => { const mine = attempts.filter((x) => x.studentId === s.id && x.quizId === q.id); return { attempts: mine.length, bestScore: mine.length ? Math.max(...mine.map((x) => Number(x.score))) : null, maxScore: quizMaxScore(q) }; }),
    })) };
}

const cleanQuestions = (input) => {
  if (!Array.isArray(input) || !input.length || input.length > 50) throw badRequest('A quiz needs 1 to 50 questions');
  const rows = input.map((q, i) => {
    const prompt = String(q.prompt ?? '').trim(); const type = q.type || 'single_choice';
    const choices = Array.isArray(q.choices) ? q.choices.map((x) => String(x).trim()) : [];
    const points = Number(q.points ?? 1);
    if (!prompt || prompt.length > 500 || !['single_choice', 'multiple_choice', 'true_false', 'short_answer'].includes(type)) throw badRequest(`Question ${i + 1} needs a prompt and supported question type`);
    if (!Number.isFinite(points) || points <= 0 || points > 1000 || Math.round(points * 100) !== points * 100) throw badRequest(`Question ${i + 1} points must be between 0.01 and 1000`);
    if (type === 'short_answer') return { id: String(q.id || `q${i + 1}`), type, prompt, points, choices: [], expectedAnswer: String(q.expectedAnswer ?? '').trim().slice(0, 500) };
    if (type === 'true_false') {
      const correctIndex = Number(q.correctIndex);
      if (![0, 1].includes(correctIndex)) throw badRequest(`Question ${i + 1} needs a true or false correct answer`);
      return { id: String(q.id || `q${i + 1}`), type, prompt, points, choices: ['True', 'False'], correctIndex };
    }
    if (choices.length < 2 || choices.length > 6 || choices.some((x) => !x || x.length > 200)) throw badRequest(`Question ${i + 1} needs 2–6 non-empty choices`);
    if (type === 'multiple_choice') {
      const correctIndexes = Array.isArray(q.correctIndexes) ? [...new Set(q.correctIndexes.map(Number))].sort((a, b) => a - b) : [];
      if (!correctIndexes.length || correctIndexes.some((index) => !Number.isInteger(index) || index < 0 || index >= choices.length)) throw badRequest(`Question ${i + 1} needs at least one correct choice`);
      return { id: String(q.id || `q${i + 1}`), type, prompt, points, choices, correctIndexes };
    }
    const correctIndex = Number(q.correctIndex);
    if (!Number.isInteger(correctIndex) || correctIndex < 0 || correctIndex >= choices.length) throw badRequest(`Question ${i + 1} needs a valid correct choice`);
    return { id: String(q.id || `q${i + 1}`), type, prompt, points, choices, correctIndex };
  });
  if (new Set(rows.map((q) => q.id)).size !== rows.length) throw badRequest('Question identifiers must be unique');
  return rows;
};

export async function saveQuiz(courseId, body, user, id = null) {
  const course = await LmsCourse.findByPk(courseId); if (!course) throw notFound('Course not found');
  if (!await mayManage(course, user)) throw forbidden('You cannot manage this course');
  const title = String(body.title ?? '').trim(); if (!title) throw badRequest('Quiz title is required');
  const maxAttempts = Number(body.maxAttempts ?? 3); if (!Number.isInteger(maxAttempts) || maxAttempts < 1 || maxAttempts > 10) throw badRequest('Attempts must be between 1 and 10');
  const dueOn = body.dueOn || null;
  if (dueOn && (!/^\d{4}-\d{2}-\d{2}$/.test(dueOn) || Number.isNaN(Date.parse(`${dueOn}T00:00:00Z`)) || new Date(`${dueOn}T00:00:00Z`).toISOString().slice(0, 10) !== dueOn)) throw badRequest('Due date must be a valid date');
  const values = { title: title.slice(0, 160), description: String(body.description ?? '').slice(0, 1000) || null, questions: cleanQuestions(body.questions), maxAttempts, dueOn, published: Boolean(body.published) };
  if (id) {
    const row = await LmsQuiz.findOne({ where: { id, courseId } }); if (!row) throw notFound('Quiz not found');
    if (await LmsQuizAttempt.count({ where: { quizId: id } }) && JSON.stringify(values.questions) !== JSON.stringify(row.questions)) throw conflict('This quiz already has attempts; its questions cannot be changed');
    const wasPublished = row.published; await row.update(values);
    if (!wasPublished && row.published && course.published) await notifyCourseStudents(courseId, { title: 'New LMS quiz', body: `${row.title}${row.dueOn ? ` · due ${row.dueOn}` : ''}`, url: '/portal?tab=LMS' });
    return row.id;
  }
  const row = await LmsQuiz.create({ courseId, ...values });
  if (row.published && course.published) await notifyCourseStudents(courseId, { title: 'New LMS quiz', body: `${row.title}${row.dueOn ? ` · due ${row.dueOn}` : ''}`, url: '/portal?tab=LMS' });
  return row.id;
}

export async function listQuizzes(courseId, user) {
  const course = await LmsCourse.findByPk(courseId); if (!course) throw notFound('Course not found');
  if (!await mayManage(course, user)) throw forbidden('You cannot manage this course');
  return Promise.all((await LmsQuiz.findAll({ where: { courseId }, order: [['id', 'ASC']] })).map(async (q) => ({ id: q.id, title: q.title, description: q.description, questions: q.questions, dueOn: q.dueOn, maxAttempts: q.maxAttempts, published: q.published, attemptCount: await LmsQuizAttempt.count({ where: { quizId: q.id } }) })));
}

export async function deleteQuiz(courseId, id, user) {
  const course = await LmsCourse.findByPk(courseId); if (!course) throw notFound('Course not found');
  if (!await mayManage(course, user)) throw forbidden('You cannot manage this course');
  const q = await LmsQuiz.findOne({ where: { id, courseId } }); if (!q) throw notFound('Quiz not found'); await q.destroy();
}

export async function takeQuiz(student, quizId, answers) {
  const quiz = await LmsQuiz.findOne({ where: { id: quizId, published: true }, include: [{ model: LmsCourse, where: { classId: student.classId, published: true } }] });
  if (!quiz) throw notFound('Quiz not found');
  if (!await isEnrolled(student, quiz.courseId)) throw notFound('Quiz not found');
  if (quiz.dueOn && quiz.dueOn < today()) throw conflict('The due date for this test has passed');
  const prior = await LmsQuizAttempt.findAll({ where: { quizId, studentId: student.id }, order: [['attemptNo', 'DESC']] });
  if (prior.length >= quiz.maxAttempts) throw conflict('You have used all attempts for this quiz');
  const submitted = answers && typeof answers === 'object' && !Array.isArray(answers) ? answers : {};
  if (quiz.questions.some((q) => submitted[q.id] === undefined || submitted[q.id] === null || submitted[q.id] === '')) throw badRequest('Answer every question before submitting');
  let score = 0; let needsReview = false; const safeAnswers = {};
  for (const q of quiz.questions) {
    const raw = submitted[q.id];
    if (q.type === 'short_answer') {
      const answer = String(raw ?? '').trim(); if (!answer || answer.length > 2000) throw badRequest('Write an answer of up to 2000 characters for every written question');
      safeAnswers[q.id] = answer; needsReview = true; continue;
    }
    if (q.type === 'multiple_choice') {
      const answer = Array.isArray(raw) ? [...new Set(raw.map(Number))].sort((a, b) => a - b) : [];
      if (!answer.length || answer.some((index) => !Number.isInteger(index) || index < 0 || index >= q.choices.length)) throw badRequest('Choose one or more available answers for every question');
      safeAnswers[q.id] = answer;
      if (JSON.stringify(answer) === JSON.stringify(q.correctIndexes)) score += Number(q.points);
      continue;
    }
    const answer = q.type === 'true_false' && typeof raw === 'boolean' ? (raw ? 0 : 1) : Number(raw);
    if (!Number.isInteger(answer) || answer < 0 || answer >= q.choices.length) throw badRequest('Choose one available answer for every question');
    safeAnswers[q.id] = answer;
    if (answer === q.correctIndex) score += Number(q.points);
  }
  const attemptNo = prior.length + 1;
  const maxScore = quiz.questions.reduce((sum, question) => sum + Number(question.points ?? 1), 0);
  const attempt = await LmsQuizAttempt.create({ quizId, studentId: student.id, attemptNo, answers: safeAnswers, score, maxScore, reviewStatus: needsReview ? 'pending_review' : 'reviewed', completedAt: new Date() });
  return { attemptNo, score, maxScore, reviewStatus: attempt.reviewStatus, completedAt: attempt.completedAt };
}

export async function listQuizAttempts(courseId, quizId, user) {
  const course = await LmsCourse.findByPk(courseId); if (!course) throw notFound('Course not found');
  if (!await mayManage(course, user)) throw forbidden('You cannot review this course');
  const quiz = await LmsQuiz.findOne({ where: { id: quizId, courseId } }); if (!quiz) throw notFound('Quiz not found');
  const rows = await LmsQuizAttempt.findAll({ where: { quizId }, include: [{ model: Student, attributes: ['id', 'firstName', 'lastName', 'admissionNo'] }], order: [['completedAt', 'DESC']] });
  return rows.map((attempt) => ({ id: attempt.id, studentId: attempt.studentId, studentName: `${attempt.Student.firstName} ${attempt.Student.lastName}`, admissionNo: attempt.Student.admissionNo, completedAt: attempt.completedAt, score: Number(attempt.score), maxScore: Number(attempt.maxScore), reviewStatus: attempt.reviewStatus, feedback: attempt.feedback, questions: quiz.questions.map((q) => ({ id: q.id, type: q.type || 'single_choice', prompt: q.prompt, points: Number(q.points ?? 1), answer: attempt.answers[q.id], choices: q.choices, correctIndex: q.type === 'short_answer' ? undefined : q.correctIndex, correctIndexes: q.type === 'multiple_choice' ? q.correctIndexes : undefined, awarded: Number(attempt.questionScores?.[q.id] ?? (q.type === 'short_answer' ? 0 : (JSON.stringify(attempt.answers[q.id]) === JSON.stringify(q.type === 'multiple_choice' ? q.correctIndexes : q.correctIndex) ? q.points ?? 1 : 0))) })) }));
}

export async function reviewQuizAttempt(courseId, quizId, attemptId, body, user) {
  const course = await LmsCourse.findByPk(courseId); if (!course) throw notFound('Course not found');
  if (!await mayManage(course, user)) throw forbidden('You cannot review this course');
  const [quiz, attempt] = await Promise.all([LmsQuiz.findOne({ where: { id: quizId, courseId } }), LmsQuizAttempt.findOne({ where: { id: attemptId, quizId } })]);
  if (!quiz || !attempt) throw notFound('Quiz attempt not found');
  const scores = body.questionScores && typeof body.questionScores === 'object' && !Array.isArray(body.questionScores) ? body.questionScores : {};
  let total = 0; const cleanScores = {};
  for (const q of quiz.questions) {
    const automatic = q.type === 'short_answer' ? 0 : (JSON.stringify(attempt.answers[q.id]) === JSON.stringify(q.type === 'multiple_choice' ? q.correctIndexes : q.correctIndex) ? Number(q.points ?? 1) : 0);
    const awarded = q.type === 'short_answer' ? Number(scores[q.id] ?? 0) : automatic;
    if (!Number.isFinite(awarded) || awarded < 0 || awarded > Number(q.points ?? 1)) throw badRequest(`Score for “${q.prompt}” must be between 0 and ${q.points ?? 1}`);
    cleanScores[q.id] = awarded; total += awarded;
  }
  await attempt.update({ score: total, questionScores: cleanScores, feedback: String(body.feedback ?? '').trim().slice(0, 1000) || null, reviewStatus: 'reviewed' });
  await notifyUsers(await familyUserIds(attempt.studentId), { title: 'LMS quiz reviewed', body: `${quiz.title}: ${total}/${attempt.maxScore}${attempt.feedback ? ` · ${attempt.feedback.slice(0, 160)}` : ''}`, url: '/portal?tab=LMS' });
  return { ok: true, score: total, maxScore: Number(attempt.maxScore) };
}

export async function listSubmissions(courseId, assignmentId, user) {
  const course = await LmsCourse.findByPk(courseId); if (!course) throw notFound('Course not found');
  if (!await mayManage(course, user)) throw forbidden('You cannot manage this course');
  const assignment = await LmsAssignment.findOne({ where: { id: assignmentId, courseId } }); if (!assignment) throw notFound('Assignment not found');
  const enrolledIds = (await LmsEnrollment.findAll({ where: { courseId, active: true }, attributes: ['studentId'] })).map((row) => row.studentId);
  const students = await Student.findAll({ where: { id: enrolledIds, classId: course.classId, status: 'active' }, order: [['lastName', 'ASC'], ['firstName', 'ASC']] });
  const subs = await LmsSubmission.findAll({ where: { assignmentId }, attributes: { exclude: ['attachmentData'] } }); const byStudent = new Map(subs.map((s) => [s.studentId, s]));
  return { assignment: { id: assignment.id, title: assignment.title, dueOn: assignment.dueOn, maxScore: assignment.maxScore }, rows: students.map((s) => { const x = byStudent.get(s.id); const submittedDay = x?.submittedAt ? new Date(x.submittedAt).toISOString().slice(0, 10) : null; return { studentId: s.id, admissionNo: s.admissionNo, name: `${s.firstName} ${s.lastName}`, ...(x ? { response: x.response, resourceUrl: x.resourceUrl, attachmentName: x.attachmentName, attachmentSize: x.attachmentSize, submittedAt: x.submittedAt, isLate: Boolean(assignment.dueOn && submittedDay > assignment.dueOn), score: x.score, feedback: x.feedback, gradedAt: x.gradedAt } : { response: null, submittedAt: null, isLate: false, score: null, feedback: null }) }; }) };
}

export async function gradeSubmission(courseId, assignmentId, studentId, body, user) {
  const course = await LmsCourse.findByPk(courseId); if (!course) throw notFound('Course not found');
  if (!await mayManage(course, user)) throw forbidden('You cannot manage this course');
  const assignment = await LmsAssignment.findOne({ where: { id: assignmentId, courseId } }); if (!assignment) throw notFound('Assignment not found');
  const row = await LmsSubmission.findOne({ where: { assignmentId, studentId }, attributes: { exclude: ['attachmentData'] } }); if (!row) throw notFound('Submission not found');
  const score = Number(body.score); if (!Number.isFinite(score) || score < 0 || score > assignment.maxScore) throw badRequest(`Score must be between 0 and ${assignment.maxScore}`);
  await row.update({ score, feedback: String(body.feedback ?? '').slice(0, 1000) || null, gradedAt: new Date(), gradedByName: user.name });
  await notifyUsers(await familyUserIds(row.studentId), { title: 'LMS assignment graded', body: `${assignment.title}: ${score}/${assignment.maxScore}${row.feedback ? ` · ${row.feedback.slice(0, 160)}` : ''}`, url: '/portal?tab=LMS' });
  return { ok: true };
}

async function studentAssignment(student, assignmentId) {
  const assignment = await LmsAssignment.findByPk(assignmentId, { include: [{ model: LmsCourse }] });
  if (!assignment || !assignment.published || !assignment.LmsCourse.published || assignment.LmsCourse.classId !== student.classId) throw notFound('Assignment not found');
  if (!await isEnrolled(student, assignment.courseId)) throw notFound('Assignment not found');
  return assignment;
}

export async function uploadAssignmentFile(student, assignmentId, buffer, originalName) {
  const assignment = await studentAssignment(student, assignmentId);
  if (!Buffer.isBuffer(buffer) || !buffer.length) throw badRequest('Choose a file to upload');
  if (buffer.length > MAX_BYTES) throw badRequest(`File is larger than ${MAX_BYTES / 1024 / 1024} MB`);
  const mimeType = sniff(buffer);
  if (!['application/pdf', 'image/jpeg', 'image/png', 'image/webp'].includes(mimeType)) throw badRequest('Only PDF, JPEG, PNG or WebP files are allowed');
  const existing = await LmsSubmission.findOne({ where: { assignmentId, studentId: student.id }, attributes: { exclude: ['attachmentData'] } });
  if (existing?.gradedAt) throw conflict('This assignment has already been graded and can no longer be changed');
  const attachmentKey = await putLmsFile(buffer);
  const values = { attachmentData: null, attachmentKey, attachmentName: String(originalName || 'submission').slice(0, 255), attachmentMime: mimeType, attachmentSize: buffer.length, submittedAt: new Date() };
  try {
    if (existing) await existing.update(values);
    else await LmsSubmission.create({ assignmentId, studentId: student.id, response: 'File submission', ...values });
  } catch (error) { await removeLmsFile(attachmentKey); throw error; }
  if (existing?.attachmentKey) await removeLmsFile(existing.attachmentKey);
  return { ok: true, attachmentName: values.attachmentName, size: buffer.length };
}

export async function readStudentAssignmentFile(student, assignmentId) {
  const assignment = await LmsAssignment.findByPk(assignmentId, { include: [{ model: LmsCourse, where: { classId: student.classId } }] });
  if (!assignment) throw notFound('Assignment not found');
  if (!await isEnrolled(student, assignment.courseId)) throw notFound('Assignment not found');
  const row = await LmsSubmission.findOne({ where: { assignmentId, studentId: student.id } });
  const buffer = row && await readAttachment(row);
  if (!buffer) throw notFound('No file was submitted');
  return { row, buffer };
}

export async function readStaffAssignmentFile(courseId, assignmentId, studentId, user) {
  const course = await LmsCourse.findByPk(courseId); if (!course) throw notFound('Course not found');
  if (!await mayManage(course, user)) throw forbidden('You cannot review this course');
  if (!await LmsAssignment.findOne({ where: { id: assignmentId, courseId } })) throw notFound('Assignment not found');
  const row = await LmsSubmission.findOne({ where: { assignmentId, studentId } });
  const buffer = row && await readAttachment(row);
  if (!buffer) throw notFound('No file was submitted');
  return { row, buffer };
}
