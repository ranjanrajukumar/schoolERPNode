// End-to-end LMS workflow coverage. Run against a migrated API with its seeded admin account.
import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';

const API = process.env.API_URL || 'http://localhost:4000/api';
const ADMIN = {
  email: process.env.ADMIN_EMAIL || 'admin@school.local',
  password: process.env.ADMIN_PASSWORD || 'admin123',
};
const RUN = Date.now().toString(36);
const cleanup = [];
let adminToken;
let teacherToken;
let studentToken;
let classId;
let subjectId;
let staffId;
let studentId;
let studentAccountId;
let courseId;
let moduleId;
let lessonId;
let assignmentId;
let quizId;

async function call(method, path, { token, body, raw, contentType = 'application/octet-stream' } = {}) {
  const response = await fetch(`${API}${path}`, {
    method,
    headers: {
      ...(token && { Authorization: `Bearer ${token}` }),
      ...(body && { 'Content-Type': 'application/json' }),
      ...(raw && { 'Content-Type': contentType }),
    },
    body: body ? JSON.stringify(body) : raw,
  });
  const data = response.headers.get('content-type')?.includes('application/json')
    ? await response.json()
    : null;
  return { status: response.status, data, response };
}
const admin = (method, path, opts = {}) => call(method, path, { token: adminToken, ...opts });
const teacher = (method, path, opts = {}) => call(method, path, { token: teacherToken, ...opts });
const student = (method, path, opts = {}) => call(method, path, { token: studentToken, ...opts });
async function create(path, body, remove = path) {
  const { status, data } = await admin('POST', path, { body });
  assert.equal(status, 201, `${path}: ${JSON.stringify(data)}`);
  cleanup.unshift(() => admin('DELETE', `${remove}/${data.id}`).then(() => {}));
  return data;
}

before(async () => {
  const login = await call('POST', '/auth/login', { body: ADMIN });
  assert.equal(login.status, 200, 'seeded admin must be able to sign in');
  adminToken = login.data.token;
  const cls = await create('/classes', { name: `LMS${RUN}`.slice(0, 12), section: 'T' });
  classId = cls.id;
  const sub = await create('/subjects', { name: `LMS ${RUN}`.slice(0, 80), code: `L${RUN}`.slice(0, 20) });
  subjectId = sub.id;
  const staff = await create('/staff', { firstName: 'LMS', lastName: `Teacher${RUN}` });
  staffId = staff.id;
  await create('/users', {
    name: 'LMS Teacher',
    email: `lms-teacher-${RUN}@test.local`,
    password: 'teacher-password-123',
    role: 'teacher',
    staffId,
  });
  const { status: linkStatus } = await admin('POST', '/class-subjects', {
    body: { classId, subjectId, staffId },
  });
  assert.equal(linkStatus, 201);
  const classSubject = await admin('GET', '/class-subjects');
  const link = classSubject.data.find((row) => row.classId === classId && row.subjectId === subjectId);
  cleanup.unshift(() => admin('DELETE', `/class-subjects/${link.id}`));
  const teacherLogin = await call('POST', '/auth/login', {
    body: { email: `lms-teacher-${RUN}@test.local`, password: 'teacher-password-123' },
  });
  assert.equal(teacherLogin.status, 200);
  teacherToken = teacherLogin.data.token;
  const pupil = await create('/students', {
    firstName: 'LMS',
    lastName: `Student${RUN}`,
    classId,
    gender: 'other',
  });
  studentId = pupil.id;
  const account = await admin('POST', '/student-accounts', {
    body: { studentId, email: `lms-student-${RUN}@test.local`, password: 'student-password-123' },
  });
  assert.equal(account.status, 201);
  studentAccountId = account.data.id;
  cleanup.unshift(() => admin('DELETE', `/student-accounts/${studentAccountId}`));
  const studentLogin = await call('POST', '/auth/login', {
    body: { email: `lms-student-${RUN}@test.local`, password: 'student-password-123' },
  });
  assert.equal(studentLogin.status, 200);
  studentToken = studentLogin.data.token;
  assert.equal(
    (
      await student('POST', '/auth/change-password', {
        body: { currentPassword: 'student-password-123', newPassword: 'student-password-456' },
      })
    ).status,
    200,
  );
  const updatedStudentLogin = await call('POST', '/auth/login', {
    body: { email: `lms-student-${RUN}@test.local`, password: 'student-password-456' },
  });
  assert.equal(updatedStudentLogin.status, 200);
  studentToken = updatedStudentLogin.data.token;
});

after(async () => {
  for (const remove of cleanup) await remove().catch(() => {});
});

test('course tags come from the tag master; the banner image is validated and returned', async () => {
  const ai = await create('/lms-tags', { name: `AI${RUN}` }, '/lms-tags');
  await create('/lms-tags', { name: `Py${RUN}` }, '/lms-tags');
  assert.equal(
    (await teacher('POST', '/lms-tags', { body: { name: 'Sneaky' } })).status,
    403,
    'only an admin edits the master',
  );
  const png =
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
  const made = await teacher('POST', '/lms/courses', {
    body: {
      classId,
      subjectId,
      title: `Tagged ${RUN}`,
      tags: [`#${ai.name ?? `AI${RUN}`}`, ` py${RUN} `, `ai${RUN}`, ''],
      bannerImage: png,
    },
  });
  assert.equal(made.status, 201, JSON.stringify(made.data));
  const id = made.data.id;
  cleanup.unshift(() => admin('DELETE', `/lms/courses/${id}`));
  const row = (await teacher('GET', '/lms/courses')).data.find((c) => c.id === id);
  assert.deepEqual(
    row.tags,
    [`AI${RUN}`, `Py${RUN}`],
    'tags take the master spelling; the #, spaces and repeats are dropped',
  );
  assert.equal(row.bannerImage, png);
  assert.equal(
    (await teacher('PUT', `/lms/courses/${id}`, { body: { tags: [], bannerImage: null } })).status,
    200,
  );
  const cleared = (await teacher('GET', '/lms/courses')).data.find((c) => c.id === id);
  assert.deepEqual(cleared.tags, []);
  assert.equal(cleared.bannerImage, null);
  assert.equal(
    (await teacher('PUT', `/lms/courses/${id}`, { body: { bannerImage: 'data:text/html;base64,PGI+' } }))
      .status,
    400,
    'only PNG, JPG or WebP',
  );
  assert.equal(
    (
      await teacher('PUT', `/lms/courses/${id}`, {
        body: { bannerImage: `data:image/png;base64,${'A'.repeat(300000)}` },
      })
    ).status,
    400,
    'over 200 KB',
  );
  assert.equal(
    (await teacher('PUT', `/lms/courses/${id}`, { body: { tags: ['NotInMaster'] } })).status,
    400,
    'a tag outside the master is refused',
  );
  assert.equal(
    (
      await teacher('PUT', `/lms/courses/${id}`, {
        body: { tags: Array.from({ length: 11 }, (_, i) => `t${i}`) },
      })
    ).status,
    400,
    'at most 10 tags',
  );
});

test('a completion certificate is earned only when the course allows it and every lesson is complete', async () => {
  const made = await teacher('POST', '/lms/courses', {
    body: { classId, subjectId, title: `Certified ${RUN}`, certificateEnabled: true },
  });
  assert.equal(made.status, 201, JSON.stringify(made.data));
  const id = made.data.id;
  cleanup.unshift(() => admin('DELETE', `/lms/courses/${id}`));
  assert.equal((await teacher('PUT', `/lms/courses/${id}`, { body: { published: true } })).status, 200);
  const lesson = await teacher('POST', `/lms/courses/${id}/lessons`, {
    body: { title: 'Only lesson', sequence: 1, content: 'Notes', published: true },
  });
  assert.equal(lesson.status, 201);
  const mine = async () =>
    (await student('GET', `/portal/children/${studentId}/lms`)).data.find((c) => c.id === id);
  const before = await mine();
  assert.equal(before.certificate.earned, false);
  assert.equal(before.certificate.issuedOn, null);
  assert.equal(
    (
      await student('POST', `/portal/children/${studentId}/lms/lessons/${lesson.data.id}/complete`, {
        body: {},
      })
    ).status,
    200,
  );
  const after = await mine();
  assert.equal(after.certificate.earned, true);
  assert.match(after.certificate.issuedOn, /^\d{4}-\d{2}-\d{2}$/);
  assert.ok(after.certificate.studentName.includes('LMS') && after.certificate.schoolName);
  assert.equal(
    (await teacher('PUT', `/lms/courses/${id}`, { body: { certificateEnabled: false } })).status,
    200,
  );
  assert.equal((await mine()).certificate, null, 'switching it off hides the certificate');
  assert.equal(
    (await admin('DELETE', `/lms/courses/${id}`)).status,
    200,
    'removed so later tests see only their own course',
  );
});

test('teacher creates course, module, lesson and assignment; student completes and submits; teacher grades', async () => {
  const course = await teacher('POST', '/lms/courses', {
    body: { classId, subjectId, title: `Workflow ${RUN}`, description: 'LMS end-to-end' },
  });
  assert.equal(course.status, 201, JSON.stringify(course.data));
  courseId = course.data.id;
  cleanup.unshift(() => admin('DELETE', `/lms/courses/${courseId}`));
  const roster = await teacher('GET', `/lms/courses/${courseId}/enrollments`);
  assert.equal(
    roster.data.some((row) => row.id === studentId && row.enrolled),
    true,
  );
  const module = await teacher('POST', `/lms/courses/${courseId}/modules`, {
    body: { title: 'Unit one', sequence: 1, published: true },
  });
  assert.equal(module.status, 201);
  moduleId = module.data.id;
  const lesson = await teacher('POST', `/lms/courses/${courseId}/lessons`, {
    body: { moduleId, title: 'Read this lesson', sequence: 1, content: 'Lesson notes', published: true },
  });
  assert.equal(lesson.status, 201);
  lessonId = lesson.data.id;
  const resource = Buffer.from('%PDF-1.4\n% LMS fixture\n');
  assert.equal(
    (
      await teacher('POST', `/lms/courses/${courseId}/lessons/${lessonId}/file?name=resource.pdf`, {
        raw: resource,
        contentType: 'application/pdf',
      })
    ).status,
    200,
  );
  assert.equal((await teacher('PUT', `/lms/courses/${courseId}`, { body: { published: true } })).status, 200);
  const assignment = await teacher('POST', `/lms/courses/${courseId}/assignments`, {
    body: {
      title: 'Written work',
      instructions: 'Explain your answer',
      dueOn: '2000-01-01',
      maxScore: 20,
      published: true,
    },
  });
  assert.equal(assignment.status, 201);
  assignmentId = assignment.data.id;

  const studentCourses = await student('GET', `/portal/children/${studentId}/lms`);
  assert.equal(studentCourses.status, 200);
  assert.equal(studentCourses.data[0].lessons[0].moduleTitle, 'Unit one');
  assert.equal(
    (await student('GET', `/portal/children/${studentId}/lms/lessons/${lessonId}/file`)).status,
    200,
  );
  assert.equal(
    (await student('POST', `/portal/children/${studentId}/lms/lessons/${lessonId}/complete`, { body: {} }))
      .status,
    200,
  );
  assert.equal(
    (
      await student('POST', `/portal/children/${studentId}/lms/assignments/${assignmentId}/submit`, {
        body: { response: 'My written answer' },
      })
    ).status,
    200,
  );
  const submissions = await teacher(
    'GET',
    `/lms/courses/${courseId}/assignments/${assignmentId}/submissions`,
  );
  const sub = submissions.data.rows.find((row) => row.studentId === studentId);
  assert.equal(sub.response, 'My written answer');
  assert.equal(sub.isLate, true);
  assert.equal(
    (
      await teacher('PUT', `/lms/courses/${courseId}/assignments/${assignmentId}/submissions/${studentId}`, {
        body: { score: 18, feedback: 'Good work' },
      })
    ).status,
    200,
  );
  const progress = await teacher('GET', `/lms/courses/${courseId}/progress`);
  const row = progress.data.rows.find((item) => item.studentId === studentId);
  assert.equal(row.lessonsCompleted, 1);
  assert.equal(row.assignments[0].score, '18.00');
});

test('student files are type checked and downloadable only by the enrolled student and course teacher', async () => {
  const assignment = await teacher('POST', `/lms/courses/${courseId}/assignments`, {
    body: { title: 'File work', maxScore: 10, published: true },
  });
  assert.equal(assignment.status, 201);
  const file = Buffer.from('%PDF-1.4\nprivate student work\n');
  const uploadPath = `/portal/children/${studentId}/lms/assignments/${assignment.data.id}/file?name=work.pdf`;
  assert.equal(
    (await student('POST', uploadPath, { raw: file, contentType: 'application/pdf' })).status,
    200,
  );
  const ownDownload = await student('GET', uploadPath);
  assert.equal(ownDownload.status, 200);
  assert.match(ownDownload.response.headers.get('content-disposition'), /attachment/);
  assert.equal(ownDownload.response.headers.get('cache-control'), 'private, no-store');
  assert.equal(Buffer.from(await ownDownload.response.arrayBuffer()).toString(), file.toString());

  const staffDownload = await teacher(
    'GET',
    `/lms/courses/${courseId}/assignments/${assignment.data.id}/submissions/${studentId}/file`,
  );
  assert.equal(staffDownload.status, 200);
  assert.equal(Buffer.from(await staffDownload.response.arrayBuffer()).toString(), file.toString());
  const invalid = await student(
    'POST',
    `/portal/children/${studentId}/lms/assignments/${assignment.data.id}/file?name=payload.exe`,
    { raw: Buffer.from('not a PDF') },
  );
  assert.equal(invalid.status, 400);
});

test('quiz supports weighted objective and written questions with student result review', async () => {
  const quiz = await teacher('POST', `/lms/courses/${courseId}/quizzes`, {
    body: {
      title: 'Mixed quiz',
      published: true,
      maxAttempts: 2,
      questions: [
        { id: 'tf', type: 'true_false', prompt: 'The sky is blue', correctIndex: 0, points: 2 },
        {
          id: 'multi',
          type: 'multiple_choice',
          prompt: 'Select both',
          choices: ['A', 'B', 'C'],
          correctIndexes: [0, 2],
          points: 3,
        },
        { id: 'written', type: 'short_answer', prompt: 'Explain', points: 5 },
      ],
    },
  });
  assert.equal(quiz.status, 201, JSON.stringify(quiz.data));
  quizId = quiz.data.id;
  const attempt = await student('POST', `/portal/children/${studentId}/lms/quizzes/${quizId}/attempts`, {
    body: { answers: { tf: 0, multi: [0, 2], written: 'Because evidence supports it.' } },
  });
  assert.equal(attempt.status, 200);
  assert.equal(attempt.data.score, 5);
  assert.equal(attempt.data.maxScore, 10);
  assert.equal(attempt.data.reviewStatus, 'pending_review');
  const attempts = await teacher('GET', `/lms/courses/${courseId}/quizzes/${quizId}/attempts`);
  const row = attempts.data[0];
  assert.equal(row.reviewStatus, 'pending_review');
  assert.equal(
    (
      await teacher('PUT', `/lms/courses/${courseId}/quizzes/${quizId}/attempts/${row.id}/review`, {
        body: { questionScores: { written: 4 }, feedback: 'Clear explanation' },
      })
    ).status,
    200,
  );
  const result = await student('GET', `/portal/children/${studentId}/lms`);
  const review = result.data[0].quizzes.find((item) => item.id === quizId).latestAttempt;
  assert.equal(review.score, 9);
  assert.equal(review.reviewStatus, 'reviewed');
  assert.equal(review.feedback, 'Clear explanation');
});

test('unenrolled learners cannot submit text work or read course resources', async () => {
  const other = await create('/students', {
    firstName: 'Other',
    lastName: `Learner${RUN}`,
    classId,
    gender: 'other',
  });
  const account = await admin('POST', '/student-accounts', {
    body: { studentId: other.id, email: `other-${RUN}@test.local`, password: 'other-password-123' },
  });
  assert.equal(account.status, 201);
  cleanup.unshift(() => admin('DELETE', `/student-accounts/${account.data.id}`));
  const login = await call('POST', '/auth/login', {
    body: { email: `other-${RUN}@test.local`, password: 'other-password-123' },
  });
  let otherToken = login.data.token;
  assert.equal(
    (
      await call('POST', '/auth/change-password', {
        token: otherToken,
        body: { currentPassword: 'other-password-123', newPassword: 'other-password-456' },
      })
    ).status,
    200,
  );
  otherToken = (
    await call('POST', '/auth/login', {
      body: { email: `other-${RUN}@test.local`, password: 'other-password-456' },
    })
  ).data.token;
  await teacher('PUT', `/lms/courses/${courseId}/enrollments`, { body: { studentIds: [studentId] } });
  assert.equal(
    (await call('GET', '/lms/courses', { token: otherToken })).status,
    403,
    'student logins cannot use staff LMS management routes',
  );
  assert.equal(
    (await call('GET', `/portal/children/${other.id}/lms/lessons/${lessonId}/file`, { token: otherToken }))
      .status,
    404,
    'students outside the course enrollment cannot read its files',
  );
  const fileAssignment = await teacher('POST', `/lms/courses/${courseId}/assignments`, {
    body: { title: 'Private work', published: true },
  });
  assert.equal(fileAssignment.status, 201);
  assert.equal(
    (
      await call('GET', `/portal/children/${other.id}/lms/assignments/${fileAssignment.data.id}/file`, {
        token: otherToken,
      })
    ).status,
    404,
    'another student cannot read a submitted file',
  );
  assert.equal(
    (
      await call('POST', `/portal/children/${other.id}/lms/assignments/${assignmentId}/submit`, {
        token: otherToken,
        body: { response: 'Not allowed' },
      })
    ).status,
    404,
  );
});

test('lesson parts: ordered text, video, link and file parts are validated, hidden until published, and protected', async () => {
  const base = `/lms/courses/${courseId}/lessons/${lessonId}/parts`;
  assert.equal((await teacher('POST', base, { body: { kind: 'bogus', title: 'x' } })).status, 400);
  assert.equal(
    (await teacher('POST', base, { body: { kind: 'video', title: 'Watch', url: 'ftp://nope' } })).status,
    400,
    'only http(s) links',
  );
  assert.equal(
    (await teacher('POST', base, { body: { kind: 'text', title: 'Empty' } })).status,
    400,
    'text part needs text',
  );
  const text = await teacher('POST', base, {
    body: { kind: 'text', title: 'Read first', sequence: 1, content: 'Part one', published: true },
  });
  assert.equal(text.status, 201);
  const video = await teacher('POST', base, {
    body: { kind: 'video', title: 'Watch next', sequence: 2, url: 'https://example.com/v', published: true },
  });
  assert.equal(video.status, 201);
  const draft = await teacher('POST', base, {
    body: { kind: 'text', title: 'Hidden draft', sequence: 3, content: 'Not yet', published: false },
  });
  assert.equal(draft.status, 201);
  const file = await teacher('POST', base, {
    body: { kind: 'file', title: 'Worksheet', sequence: 4, published: true },
  });
  assert.equal(file.status, 201);
  assert.equal(
    (
      await teacher('POST', `${base}/${text.data.id}/file?name=a.pdf`, {
        raw: Buffer.from('%PDF-1.4\n'),
        contentType: 'application/pdf',
      })
    ).status,
    400,
    'only file parts take a file',
  );
  assert.equal(
    (
      await teacher('POST', `${base}/${file.data.id}/file?name=bad.exe`, {
        raw: Buffer.from('MZ not allowed'),
      })
    ).status,
    400,
    'file type is checked from its bytes',
  );
  assert.equal(
    (
      await teacher('POST', `${base}/${file.data.id}/file?name=sheet.pdf`, {
        raw: Buffer.from('%PDF-1.4\n% part fixture\n'),
        contentType: 'application/pdf',
      })
    ).status,
    200,
  );

  const staffParts = await teacher('GET', base);
  assert.deepEqual(
    staffParts.data.map((p) => p.title),
    ['Read first', 'Watch next', 'Hidden draft', 'Worksheet'],
  );
  const mine = (await student('GET', `/portal/children/${studentId}/lms`)).data
    .find((c) => c.id === courseId)
    .lessons.find((l) => l.id === lessonId);
  assert.deepEqual(
    mine.parts.map((p) => p.title),
    ['Read first', 'Watch next', 'Worksheet'],
    'students see published parts, in order',
  );
  assert.equal(
    (await student('GET', `/portal/children/${studentId}/lms/parts/${file.data.id}/file`)).status,
    200,
  );
  assert.equal(
    (await student('GET', `/portal/children/${studentId}/lms/parts/${text.data.id}/file`)).status,
    404,
    'a text part has no file',
  );
  assert.equal(
    (
      await student('POST', base.replace('/lms/courses', '/portal/children/x/lms'), {
        body: { kind: 'text', title: 'no' },
      })
    ).status >= 400,
    true,
  );
  assert.equal((await student('GET', base)).status, 403, 'students cannot use staff part routes');

  assert.equal(
    (
      await teacher('PUT', `${base}/${file.data.id}`, {
        body: { title: 'Worksheet', sequence: 4, published: false },
      })
    ).status,
    200,
  );
  const hidden = (await student('GET', `/portal/children/${studentId}/lms`)).data
    .find((c) => c.id === courseId)
    .lessons.find((l) => l.id === lessonId);
  assert.equal(
    hidden.parts.some((p) => p.title === 'Worksheet'),
    false,
    'unpublishing hides a part',
  );
  assert.equal(
    (await student('GET', `/portal/children/${studentId}/lms/parts/${file.data.id}/file`)).status,
    404,
    'and its file',
  );
  assert.equal((await teacher('DELETE', `${base}/${file.data.id}`)).status, 200);
  assert.equal((await teacher('GET', base)).data.length, 3);
});

test('course materials: documents, files and links are validated, published to enrolled students only, and protected', async () => {
  const base = `/lms/courses/${courseId}/materials`;
  assert.equal((await teacher('POST', base, { body: { kind: 'bogus', title: 'x' } })).status, 400);
  assert.equal(
    (await teacher('POST', base, { body: { kind: 'link', title: 'Bad', url: 'javascript:alert(1)' } }))
      .status,
    400,
    'only http(s) links',
  );
  assert.equal((await teacher('POST', base, { body: { kind: 'video', title: 'No url' } })).status, 400);
  const link = await teacher('POST', base, {
    body: { kind: 'link', title: 'Reading list', url: 'https://example.com/read', published: true },
  });
  assert.equal(link.status, 201);
  const draft = await teacher('POST', base, {
    body: { kind: 'video', title: 'Draft video', url: 'https://example.com/v', published: false },
  });
  assert.equal(draft.status, 201);
  const doc = await teacher('POST', base, {
    body: { kind: 'file', title: 'Notes', description: 'Chapter notes', published: true },
  });
  assert.equal(doc.status, 201);
  assert.equal(
    (
      await teacher('POST', `${base}/${link.data.id}/file?name=a.pdf`, {
        raw: Buffer.from('%PDF-1.4\n'),
        contentType: 'application/pdf',
      })
    ).status,
    400,
    'a link takes no file',
  );
  assert.equal(
    (await teacher('POST', `${base}/${doc.data.id}/file?name=bad.exe`, { raw: Buffer.from('MZ nope') }))
      .status,
    400,
    'file type is checked from its bytes',
  );
  assert.equal(
    (
      await teacher('POST', `${base}/${doc.data.id}/file?name=notes.pdf`, {
        raw: Buffer.from('%PDF-1.4\n% material fixture\n'),
        contentType: 'application/pdf',
      })
    ).status,
    200,
  );

  assert.equal((await teacher('GET', base)).data.length, 3);
  const mine = (await student('GET', `/portal/children/${studentId}/lms`)).data.find(
    (c) => c.id === courseId,
  );
  assert.deepEqual(
    mine.materials.map((m) => m.title).sort(),
    ['Notes', 'Reading list'],
    'students see published materials only',
  );
  assert.equal(
    (await student('GET', `/portal/children/${studentId}/lms/materials/${doc.data.id}/file`)).status,
    200,
  );
  assert.equal(
    (await student('GET', `/portal/children/${studentId}/lms/materials/${link.data.id}/file`)).status,
    404,
  );
  assert.equal((await student('GET', base)).status, 403, 'students cannot use staff material routes');
  assert.equal(
    (await teacher('PUT', `${base}/${doc.data.id}`, { body: { title: 'Notes', published: false } })).status,
    200,
  );
  assert.equal(
    (await student('GET', `/portal/children/${studentId}/lms/materials/${doc.data.id}/file`)).status,
    404,
    'unpublished file is hidden',
  );
  assert.equal((await teacher('DELETE', `${base}/${doc.data.id}`)).status, 200);
  assert.equal((await teacher('GET', base)).data.length, 2);
});
