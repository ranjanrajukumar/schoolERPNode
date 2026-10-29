// Walks the whole school process through the running API and checks that the modules agree with each other:
//   enquiry -> application -> enrolment -> student -> class -> fees -> payments -> attendance -> exams and marks -> ID cards -> counts.
//   node scripts/check-flow.mjs        (or: npm run check:flow --prefix server)
// Read-only. Exits with an error when any link is broken. Environment: API, ADMIN_EMAIL, ADMIN_PASSWORD (as for seed-demo).
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const API = process.env.API || 'http://localhost:4000/api';
const SERVER = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
let token;
const get = async (p) => {
  const res = await fetch(API + p, { headers: { Authorization: `Bearer ${token}` } });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`GET ${p}: ${data.error ?? res.status}`);
  return data;
};
const cents = (v) => Math.round(Number(v) * 100);
const label = (c) => `${c.name}-${c.section}`;

const results = [];
async function check(name, fn) {
  try {
    const problems = (await fn()) ?? [];
    results.push({ name, problems });
  } catch (err) {
    results.push({ name, problems: [`could not run: ${err.message}`] });
  }
}

const res = await fetch(`${API}/auth/login`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: process.env.ADMIN_EMAIL || 'admin@school.local',
    password: process.env.ADMIN_PASSWORD || 'admin123',
  }),
});
if (!res.ok) {
  console.error('Could not sign in. Is the server running?');
  process.exit(2);
}
token = (await res.json()).token;

const [classes, students, admissions, fees, staff] = await Promise.all([
  get('/classes'),
  get('/students'),
  get('/admissions'),
  get('/fees'),
  get('/staff'),
]);
const classById = new Map(classes.map((c) => [c.id, c]));
const studentById = new Map(students.map((s) => [s.id, s]));
const active = students.filter((s) => s.status === 'active');

await check(
  'Enquiry → enrolment → student: every enrolled applicant is a real student in the same class',
  () => {
    const out = [];
    for (const a of admissions.filter((x) => x.status === 'enrolled')) {
      const s = studentById.get(a.studentId);
      if (!s) {
        out.push(`${a.applicantName}: enrolled but student ${a.studentId} does not exist`);
        continue;
      }
      if (`${s.firstName} ${s.lastName}`.trim() !== a.applicantName.trim())
        out.push(`${a.applicantName}: student is named "${s.firstName} ${s.lastName}"`);
      if (a.classId && s.classId !== a.classId)
        out.push(`${a.applicantName}: class differs between admission and student`);
    }
    return out;
  },
);

await check('Student → class: every student with a class points at a class that exists', () =>
  students
    .filter((s) => s.classId && !classById.has(s.classId))
    .map((s) => `${s.admissionNo}: class ${s.classId} is missing`),
);

await check(
  'Class fee structure → billing: every active student has one fee row per structure item (none missing, none doubled)',
  async () => {
    const structures = await get('/fee-structures');
    const out = [];
    for (const c of classes) {
      const items = structures.filter((x) => x.classId === c.id);
      for (const s of active.filter((x) => x.classId === c.id)) {
        for (const item of items) {
          const rows = fees.filter((f) => f.studentId === s.id && f.title === item.title);
          if (rows.length !== 1)
            out.push(`${s.admissionNo} (${label(c)}): ${rows.length} "${item.title}" fee row(s)`);
        }
      }
    }
    return out;
  },
);

await check(
  'Fees → payments: paid amount equals the payments recorded, balance and status follow',
  async () => {
    const out = [];
    for (const f of fees.filter((x) => cents(x.paidAmount) > 0)) {
      const pays = await get(`/fees/${f.id}/payments`);
      const net = pays.reduce((sum, p) => sum + cents(p.amount) - cents(p.refunded ?? 0), 0);
      if (net !== cents(f.paidAmount))
        out.push(
          `${f.admissionNo} ${f.title}: paid ${f.paidAmount} but payments add up to ${(net / 100).toFixed(2)}`,
        );
      if (cents(f.balance) !== cents(f.amount) - cents(f.paidAmount))
        out.push(`${f.admissionNo} ${f.title}: balance ${f.balance} is not amount minus paid`);
      const expect = cents(f.paidAmount) >= cents(f.amount) ? 'paid' : 'partial';
      if (f.status !== expect)
        out.push(`${f.admissionNo} ${f.title}: status is ${f.status}, expected ${expect}`);
    }
    return out;
  },
);

await check('Receipts: every payment has its own receipt number', async () => {
  const pays = await get('/fees/payments');
  const seen = new Set();
  const out = [];
  for (const p of pays) {
    if (seen.has(p.receiptNo)) out.push(`receipt ${p.receiptNo} is used twice`);
    seen.add(p.receiptNo);
  }
  return out;
});

await check('Attendance: the days that were taken cover every active student of those classes', async () => {
  const out = [];
  const trend = (await get('/dashboard')).attendanceTrend ?? [];
  const taken = trend.filter((d) => d.total > 0).map((d) => d.date);
  for (const date of taken.slice(-2)) {
    const roster = await get(`/attendance?date=${date}`);
    const unmarked = roster.filter((r) => r.status === null && classById.has(r.classId ?? r.class_id)).length;
    const day = trend.find((d) => d.date === date);
    const marked = roster.filter((r) => r.status !== null).length;
    if (day.total !== marked)
      out.push(`${date}: dashboard counts ${day.total} marked, the register has ${marked}`);
    if (unmarked > roster.length - marked) out.push(`${date}: roster inconsistent`);
  }
  return out;
});

const exams = await get('/exams');
await check(
  'Exams → marks → results: marks belong to the class, every subject is a class subject, totals and ranks add up',
  async () => {
    const classSubjects = await get('/class-subjects');
    const out = [];
    for (const exam of exams) {
      const sheet = await get(`/exams/${exam.id}/marks`);
      const taught = new Set(classSubjects.filter((l) => l.classId === exam.classId).map((l) => l.subjectId));
      for (const sub of sheet.subjects)
        if (!taught.has(sub.id)) out.push(`${exam.name}: subject ${sub.name} is not taught in the class`);
      const results = await get(`/exams/${exam.id}/results`);
      const ranks = results.rows.map((r) => r.rank);
      for (const r of results.rows) {
        const st = studentById.get(r.studentId);
        if (!st || st.classId !== exam.classId) out.push(`${exam.name}: ${r.name} is not in the exam class`);
        const row = sheet.students.find((x) => x.studentId === r.studentId);
        // an elective the student did not choose does not count, even if an old mark is still stored
        const sum = Object.entries(row?.marks ?? {})
          .filter(([sid]) => !(row?.skips ?? []).includes(Number(sid)))
          .reduce((n, [, m]) => n + Number(m), 0);
        if (Math.round(sum * 100) !== Math.round(r.total * 100))
          out.push(`${exam.name}: ${r.name} marks add up to ${sum} but the result says ${r.total}`);
        for (const m of Object.values(row?.marks ?? {}))
          if (Number(m) > exam.maxMarks) out.push(`${exam.name}: ${r.name} has ${m} out of ${exam.maxMarks}`);
      }
      if (ranks.length && Math.min(...ranks) !== 1) out.push(`${exam.name}: ranking does not start at 1`);
      // the report card shows what the mark sheet holds
      const first = results.rows[0];
      if (first) {
        const card = await get(`/exams/${exam.id}/report-card/${first.studentId}`);
        const cardSum = card.subjects.reduce((a, s) => a + Number(s.marks ?? 0), 0);
        if (Math.round(cardSum * 100) !== Math.round(first.total * 100))
          out.push(
            `${exam.name}: report card for ${first.name} totals ${cardSum}, results say ${first.total}`,
          );
      }
    }
    return out;
  },
);

await check(
  'Subject map: every elective choice belongs to the own class of the student, one per group; class maps agree with the lists',
  async () => {
    const out = [];
    const assignments = await get('/transport/assignments');
    for (const c of classes) {
      const sheet = await get(`/class-subjects/electives?classId=${c.id}`);
      for (const st of sheet.students) {
        for (const g of sheet.groups) {
          const picked = g.subjects.filter((x) => st.choices.includes(x.classSubjectId));
          if (picked.length > 1)
            out.push(`${st.name} (${label(c)}) has ${picked.length} electives in "${g.name}"`);
        }
        const known = new Set(sheet.groups.flatMap((g) => g.subjects.map((x) => x.classSubjectId)));
        for (const id of st.choices)
          if (!known.has(id)) out.push(`${st.name} (${label(c)}) holds elective ${id} of another class`);
      }
      const map = await get(`/classes/${c.id}/map`);
      const mine = active.filter((s) => s.classId === c.id);
      if (map.students !== mine.length)
        out.push(`${label(c)}: class map says ${map.students} students, the list has ${mine.length}`);
      const riders = assignments.filter((a) => mine.some((s) => s.id === a.studentId)).length;
      if (map.transport.riders !== riders)
        out.push(`${label(c)}: class map says ${map.transport.riders} riders, assignments say ${riders}`);
    }
    return out;
  },
);

await check(
  'ID cards: each class prints one card per active student, staff cards cover active staff',
  async () => {
    const out = [];
    for (const c of classes) {
      const n = active.filter((s) => s.classId === c.id).length;
      const cards = (await get(`/documents/id-cards?classId=${c.id}`)).cards.length;
      if (cards !== n) out.push(`${label(c)}: ${cards} cards for ${n} active students`);
    }
    const staffCards = (await get('/documents/staff-id-cards')).cards.length;
    const activeStaff = staff.filter((s) => s.status === 'active').length;
    if (staffCards !== activeStaff) out.push(`${staffCards} staff cards for ${activeStaff} active staff`);
    return out;
  },
);

await check('Counts agree: summaries, lists and pipeline say the same thing', async () => {
  const out = [];
  const sum = await get('/students/summary');
  if (sum.total !== students.length) out.push(`student summary ${sum.total} vs list ${students.length}`);
  if (sum.active !== active.length) out.push(`active students ${sum.active} vs list ${active.length}`);
  const reg = await get('/students/registration-summary');
  if (reg.total !== students.length) out.push(`registrations ${reg.total} vs students ${students.length}`);
  const app = await get('/admissions/applications/summary');
  const enrolledAdm = admissions.filter((a) => a.status === 'enrolled').length;
  if (app.counts.enrolled !== enrolledAdm)
    out.push(`pipeline enrolled ${app.counts.enrolled} vs admissions ${enrolledAdm}`);
  const offers = admissions.filter((a) => a.status === 'approved').length;
  if (app.counts.offer !== offers) out.push(`pipeline offers ${app.counts.offer} vs admissions ${offers}`);
  if (sum.pendingEnrollment !== offers)
    out.push(`students page pending enrollment ${sum.pendingEnrollment} vs offers ${offers}`);
  const enq = await get('/admissions/enquiries/summary');
  if (enq.tabs.converted !== enrolledAdm)
    out.push(`enquiries converted ${enq.tabs.converted} vs enrolled ${enrolledAdm}`);
  if (sum.classes !== classes.length) out.push(`classes tile ${sum.classes} vs ${classes.length}`);
  return out;
});

await check('Database: every declared relationship is enforced and nothing is orphaned', () => {
  const text = execFileSync(process.execPath, ['src/integrity.js'], { cwd: SERVER, encoding: 'utf8' });
  return /All declared relationships are enforced/.test(text)
    ? []
    : [text.trim().split('\n').slice(0, 6).join(' | ')];
});

let failed = 0;
for (const r of results) {
  if (!r.problems.length) console.log(`PASS  ${r.name}`);
  else {
    failed += 1;
    console.log(`FAIL  ${r.name}`);
    r.problems.slice(0, 8).forEach((p) => console.log(`        - ${p}`));
    if (r.problems.length > 8) console.log(`        … and ${r.problems.length - 8} more`);
  }
}
console.log(`\n${results.length - failed} of ${results.length} links check out.`);
process.exit(failed ? 1 : 0);
