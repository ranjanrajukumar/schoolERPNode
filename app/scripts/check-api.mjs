// Makes the same API calls the mobile app makes (student portal, teacher screens) and checks the fields its screens read.
//   npm run check:api        (API on :4000, or set API=http://host:4000/api and ADMIN_PASSWORD). Removes what it creates.
const API = process.env.API || 'http://localhost:4000/api';
const RUN = Date.now().toString(36).slice(-6);
const undo = [];
let admin;

async function call(method, path, { token, body } = {}) {
  const res = await fetch(API + path, { method, headers: { 'Content-Type': 'application/json', ...(token && { Authorization: `Bearer ${token}` }) }, body: body === undefined ? undefined : JSON.stringify(body) });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}
const ok = async (label, p, expected = [200, 201]) => {
  const r = await p;
  if (!expected.includes(r.status)) throw new Error(`${label}: ${r.status} ${JSON.stringify(r.data)}`);
  return r.data;
};
const need = (cond, msg) => { if (!cond) throw new Error(msg); };
const results = [];
const step = async (name, fn) => { try { const note = await fn(); results.push([true, name, note]); } catch (e) { results.push([false, name, e.message]); } };

const login = await call('POST', '/auth/login', { body: { email: 'admin@school.local', password: process.env.ADMIN_PASSWORD || 'admin123' } });
if (login.status !== 200) { console.error('admin sign-in failed'); process.exit(2); }
admin = login.data.token;
const A = (m, p, body) => call(m, p, { token: admin, body });
const day = new Date().toISOString().slice(0, 10);

const ctx = {};
try {
  await step('set up a class, student, subject, exam, fee', async () => {
    ctx.cls = (await ok('class', A('POST', '/classes', { name: `App${RUN}`.slice(0, 12), section: 'A' }))).id; undo.unshift(() => A('DELETE', `/classes/${ctx.cls}`));
    ctx.stu = (await ok('student', A('POST', '/students', { admissionNo: `AP${RUN}`, firstName: 'App', lastName: 'Kid', gender: 'male', classId: ctx.cls }))).id; undo.unshift(() => A('DELETE', `/students/${ctx.stu}`));
    ctx.sub = (await ok('subject', A('POST', '/subjects', { name: `AppSub${RUN}`, code: `AS${RUN}` }))).id; undo.unshift(() => A('DELETE', `/subjects/${ctx.sub}`));
    const cs = await ok('class-subject', A('POST', '/class-subjects', { classId: ctx.cls, subjectId: ctx.sub })); undo.unshift(() => A('DELETE', `/class-subjects/${cs.id}`));
    ctx.exam = (await ok('exam', A('POST', '/exams', { name: `AppExam ${RUN}`, classId: ctx.cls, maxMarks: 50 }))).id; undo.unshift(() => A('DELETE', `/exams/${ctx.exam}`));
    const fee = await ok('fee', A('POST', '/fees', { studentId: ctx.stu, title: `AppFee ${RUN}`, amount: '1000', dueDate: '2031-01-01' })); ctx.fee = fee.id;
  });

  await step('student: temporary password forces a change, then the portal opens', async () => {
    const acc = await ok('student account', A('POST', '/student-accounts', { studentId: ctx.stu, email: `app-${RUN}@test.local`, password: 'password123' })); undo.unshift(() => A('DELETE', `/student-accounts/${acc.id}`));
    let r = await call('POST', '/auth/login', { body: { email: `app-${RUN}@test.local`, password: 'password123' } });
    need(r.status === 200 && r.data.token && r.data.user?.role === 'student', 'login shape (token, user.role)');
    let t = r.data.token;
    const me = await ok('me', call('GET', '/auth/me', { token: t }));
    need(me.mustChangePassword === true && me.role === 'student' && me.name, `me shape: ${JSON.stringify(me)}`);
    need((await call('GET', '/portal/children', { token: t })).status === 403, 'portal is closed until the password is changed');
    await ok('change password', call('POST', '/auth/change-password', { token: t, body: { currentPassword: 'password123', newPassword: 'password-45678' } }));
    r = await call('POST', '/auth/login', { body: { email: `app-${RUN}@test.local`, password: 'password-45678' } });
    ctx.student = r.data.token;
    need((await ok('me', call('GET', '/auth/me', { token: ctx.student }))).mustChangePassword === false, 'flag cleared');
    // a student can also sign in with the admission number
    need((await call('POST', '/auth/login', { body: { email: `AP${RUN}`, password: 'password-45678' } })).status === 200, 'admission number sign-in');
  });

  await step('portal screens: children, overview, attendance, fees, timetable, notices, leave', async () => {
    const T = ctx.student;
    const kids = await ok('children', call('GET', '/portal/children', { token: T }));
    need(kids[0]?.id === ctx.stu && kids[0].name && kids[0].admissionNo, 'children fields id, name, admissionNo');
    const ov = await ok('overview', call('GET', `/portal/children/${ctx.stu}/overview`, { token: T }));
    need('days' in ov.attendance && 'percentage' in ov.attendance && 'outstanding' in ov.fees && 'overdueItems' in ov.fees, 'overview fields');
    need(Array.isArray(await ok('attendance', call('GET', `/portal/children/${ctx.stu}/attendance?from=${day.slice(0, 8)}01&to=${day}`, { token: T }))), 'attendance is a list');
    const fees = await ok('fees', call('GET', `/portal/children/${ctx.stu}/fees`, { token: T }));
    need(fees.fees[0] && 'paidAmount' in fees.fees[0] && 'balance' in fees.fees[0] && fees.fees[0].status && Array.isArray(fees.payments), 'fees fields title, amount, paidAmount, balance, status, dueDate');
    need(Array.isArray(await ok('timetable', call('GET', `/portal/children/${ctx.stu}/timetable`, { token: T }))), 'timetable is a list');
    need(Array.isArray(await ok('notices', call('GET', '/portal/notices', { token: T }))), 'notices is a list');
    const types = await ok('leave types', call('GET', '/portal/leave-types', { token: T }));
    need(Array.isArray(types), 'leave types is a list');
    if (types.length) {
      const id = (await ok('apply', call('POST', `/portal/children/${ctx.stu}/leaves`, { token: T, body: { leaveTypeId: types[0].id, fromDate: day, toDate: day, reason: 'app test' } }))).id;
      const mine = await ok('leaves', call('GET', `/portal/children/${ctx.stu}/leaves`, { token: T }));
      const l = mine.find((x) => x.id === id);
      need(l && l.fromDate && l.toDate && l.status, 'leave fields fromDate, toDate, status');
      if (l.status === 'pending') await ok('cancel', call('POST', `/portal/children/${ctx.stu}/leaves/${id}/cancel`, { token: T, body: {} }));
      return `leave applied (${l.status})`;
    }
    return 'no leave types set up in this school';
  });

  await step('teacher screens: classes, my class, mark attendance', async () => {
    const classes = await ok('classes', A('GET', '/classes'));
    need(classes.some((c) => c.id === ctx.cls && c.name && c.section), 'classes list has id, name, section');
    const mc = await ok('my-class', A('GET', `/my-class/${ctx.cls}`));
    need(mc.name && mc.students?.length === 1 && mc.totals && 'notMarked' in mc.totals && 'pendingLeaves' in mc.totals && mc.date, 'my-class fields');
    const roster = await ok('roster', A('GET', `/attendance?date=${day}&classId=${ctx.cls}`));
    need(roster[0]?.studentId === ctx.stu && roster[0].firstName && 'status' in roster[0] && 'onApprovedLeave' in roster[0], 'roster fields');
    await ok('save attendance', A('POST', '/attendance', { date: day, records: [{ studentId: ctx.stu, status: 'late' }] }));
    need((await ok('roster', A('GET', `/attendance?date=${day}&classId=${ctx.cls}`)))[0].status === 'late', 'saved status is read back');
    const ov = await ok('overview', call('GET', `/portal/children/${ctx.stu}/overview`, { token: ctx.student }));
    need(ov.attendance.late === 1, 'the parent sees the mark the teacher saved');
    const past = await A('POST', '/attendance', { date: new Date(Date.now() - 86400000).toISOString().slice(0, 10), records: [{ studentId: ctx.stu, status: 'present' }] });
    need(past.status === 200, 'a first mark for a past day needs no reason');
  });

  await step('teacher screens: exams and marks', async () => {
    const exams = await ok('exams', A('GET', '/exams'));
    const e = exams.find((x) => x.id === ctx.exam);
    need(e && e.name && e.className && e.maxMarks === 50, 'exam list fields name, className, maxMarks');
    const sheet = await ok('mark sheet', A('GET', `/exams/${ctx.exam}/marks`));
    need(sheet.exam.maxMarks === 50 && sheet.subjects[0]?.editable === true && sheet.subjects[0].split === null, 'sheet subject fields editable, split');
    need(sheet.students[0].studentId === ctx.stu && Array.isArray(sheet.students[0].skips) && typeof sheet.students[0].marks === 'object', 'sheet student fields');
    await ok('save marks', A('POST', `/exams/${ctx.exam}/marks`, { records: [{ studentId: ctx.stu, subjectId: ctx.sub, marks: '41' }] }));
    need(Number((await ok('sheet', A('GET', `/exams/${ctx.exam}/marks`))).students[0].marks[ctx.sub]) === 41, 'saved mark is read back');
    need((await A('POST', `/exams/${ctx.exam}/marks`, { records: [{ studentId: ctx.stu, subjectId: ctx.sub, marks: '99' }] })).status === 400, 'a mark over the maximum is refused');
    const res = await ok('results', call('GET', `/portal/children/${ctx.stu}/results`, { token: ctx.student }));
    need(res[0]?.examId === ctx.exam && res[0].percentage !== undefined && res[0].grade && res[0].result, 'portal results fields');
    need(res[0].name === `AppExam ${RUN}`, `a result row is named after the exam, not the student: ${res[0].name}`);
    const rc = await ok('report card', call('GET', `/portal/children/${ctx.stu}/report-card/${ctx.exam}`, { token: ctx.student }));
    need(rc.subjects[0].subject && rc.subjects[0].marks !== undefined && rc.subjects[0].maxMarks, 'report card subject fields');
    return `report card shows ${rc.subjects[0].marks}/${rc.subjects[0].maxMarks}`;
  });

  await step('staff actions: take a payment, publish a notice, decide a leave, reject a certificate', async () => {
    // fee payment as the Fees screen sends it
    const fee = await ok('fee', A('POST', '/fees', { studentId: ctx.stu, title: `AppPay ${RUN}`, amount: '500', dueDate: '2031-01-01' }));
    const pay = await ok('pay', A('POST', `/fees/${fee.id}/payments`, { amount: '200', method: 'cash' }));
    need(pay.receiptNo, 'a payment answers with its receipt number');
    const after = (await ok('fees', A('GET', '/fees'))).find((f) => f.id === fee.id);
    need(after.status === 'partial' && Number(after.balance) === 300, 'the fee is part paid with 300 left');
    // notice
    const notice = await ok('notice', A('POST', '/notices', { title: `App notice ${RUN}`, body: 'hello', audience: 'all' }));
    need((await ok('notices', A('GET', '/notices'))).some((n) => n.id === notice.id), 'the notice is listed');
    await A('DELETE', `/notices/${notice.id}`);
    // student leave decision
    const types = await ok('leave types', call('GET', '/portal/leave-types', { token: ctx.student }));
    if (types.length) {
      const leave = await ok('apply', call('POST', `/portal/children/${ctx.stu}/leaves`, { token: ctx.student, body: { leaveTypeId: types[0].id, fromDate: day, toDate: day, reason: 'decide me' } }));
      const row = (await ok('leaves', A('GET', '/student-leaves'))).find((l) => l.id === leave.id);
      need(row && row.canDecide === true, 'an admin may decide the leave');
      await ok('approve', A('POST', `/student-leaves/${leave.id}/approve`, { remarks: 'ok' }));
      need((await ok('leaves', A('GET', '/student-leaves'))).find((l) => l.id === leave.id).status === 'approved', 'leave is approved');
    }
    // certificate request from the parent app, rejected by the office
    const req = await ok('request', call('POST', `/portal/children/${ctx.stu}/documents`, { token: ctx.student, body: { type: 'bonafide', purpose: 'app test' } }));
    need((await ok('documents', call('GET', `/portal/children/${ctx.stu}/documents`, { token: ctx.student }))).length === 1, 'the parent sees the request');
    await ok('reject', A('POST', `/documents/${req.id}/reject`, { remarks: 'test' }));
    await A('DELETE', `/documents/${req.id}`);
    // feedback from the parent app
    const cats = await ok('categories', call('GET', '/portal/feedback-categories', { token: ctx.student }));
    await ok('feedback', call('POST', `/portal/children/${ctx.stu}/feedback`, { token: ctx.student, body: { kind: 'feedback', category: cats[0], subject: `App ${RUN}`, details: 'testing' } }));
    return 'payment, notice, leave decision, certificate request and feedback all work';
  });
} finally {
  for (const u of undo) await u().catch(() => {});
}

let failed = 0;
for (const [pass, name, note] of results) { if (!pass) failed += 1; console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${note ? `\n        ${note}` : ''}`); }
console.log(failed ? `\n${failed} step(s) failed.` : '\nThe app\'s API contract holds.');
process.exit(failed ? 1 : 0);
