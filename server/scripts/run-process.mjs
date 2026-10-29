// Runs one family through the whole school process, step by step, against the running API, and says which step breaks:
//   enquiry → application (documents, consent) → test and interview → offer → enrolment → student → fees and payment →
//   parent login and portal → attendance → exam, marks, report card → certificate → promotion.
//   node scripts/run-process.mjs        (or: npm run run:process --prefix server)
// It creates its own class, subjects, exam and people, and removes them at the end. Environment: API, ADMIN_EMAIL, ADMIN_PASSWORD.
import crypto from 'node:crypto';

const API = process.env.API || 'http://localhost:4000/api';
const RUN = crypto.randomBytes(3).toString('hex');
const PNG = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  Buffer.alloc(64, 3),
]);
const day = (n) => new Date(Date.now() + n * 86400000).toISOString().slice(0, 10);
const today = day(0);

let admin;
async function call(method, p, { body, token = admin, raw } = {}) {
  const res = await fetch(API + p, {
    method,
    headers: {
      ...(raw ? { 'Content-Type': 'application/octet-stream' } : { 'Content-Type': 'application/json' }),
      Authorization: `Bearer ${token}`,
    },
    body: raw ?? (body ? JSON.stringify(body) : undefined),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`${method} ${p} → ${res.status} ${data.error ?? ''}`.trim());
  return data;
}
const must = (cond, message) => {
  if (!cond) throw new Error(message);
};

const results = [];
const undo = [];
async function step(name, fn) {
  try {
    const note = await fn();
    results.push({ name, ok: true, note });
  } catch (err) {
    results.push({ name, ok: false, note: err.message });
  }
}

const login = await fetch(`${API}/auth/login`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: process.env.ADMIN_EMAIL || 'admin@school.local',
    password: process.env.ADMIN_PASSWORD || 'admin123',
  }),
});
if (!login.ok) {
  console.error('Could not sign in. Is the server running?');
  process.exit(2);
}
admin = (await login.json()).token;

const ctx = {};

await step('1  Set up the class, subject, fee item and exam', async () => {
  const years = await call('GET', '/academic-years');
  ctx.year = years.find((y) => y.isCurrent)?.name ?? years[0]?.name;
  ctx.cls = (await call('POST', '/classes', { body: { name: `Flow ${RUN}`.slice(0, 12), section: 'A' } })).id;
  undo.push(() => call('DELETE', `/classes/${ctx.cls}`));
  ctx.next = (
    await call('POST', '/classes', { body: { name: `Flow ${RUN}`.slice(0, 11) + '+', section: 'B' } })
  ).id;
  undo.push(() => call('DELETE', `/classes/${ctx.next}`));
  ctx.sub = (await call('POST', '/subjects', { body: { name: `Flow ${RUN}`, code: RUN } })).id;
  undo.push(() => call('DELETE', `/subjects/${ctx.sub}`));
  const link = await call('POST', '/class-subjects', { body: { classId: ctx.cls, subjectId: ctx.sub } });
  undo.unshift(() => call('DELETE', `/class-subjects/${link.id}`));
  const fs = await call('POST', '/fee-structures', {
    body: { classId: ctx.cls, title: `Tuition ${RUN}`, amount: '1200', dueDate: day(30) },
  });
  undo.unshift(() => call('DELETE', `/fee-structures/${fs.id}`));
  ctx.exam = (
    await call('POST', '/exams', { body: { name: `Flow exam ${RUN}`, classId: ctx.cls, maxMarks: 50 } })
  ).id;
  undo.unshift(() => call('DELETE', `/exams/${ctx.exam}`));
  const alt = async (name, code) => {
    const sid = (await call('POST', '/subjects', { body: { name: `${name} ${RUN}`, code: `${code}${RUN}` } }))
      .id;
    undo.push(() => call('DELETE', `/subjects/${sid}`));
    const l = await call('POST', '/class-subjects', {
      body: {
        classId: ctx.cls,
        subjectId: sid,
        isElective: true,
        electiveGroup: 'Second language',
        component: 'practical',
      },
    });
    undo.unshift(() => call('DELETE', `/class-subjects/${l.id}`));
    return { sid, link: l.id };
  };
  ctx.hindi = await alt('Hindi', 'ZH');
  ctx.french = await alt('French', 'ZF');
  const grp = await call('POST', '/fee-groups', { body: { name: `Pack ${RUN}` } });
  undo.unshift(() => call('DELETE', `/fee-groups/${grp.id}`));
  await call('POST', `/fee-groups/${grp.id}/items`, { body: { title: `Uniform ${RUN}`, amount: '350' } });
  ctx.group = grp.id;
  const bus = await call('POST', '/transport/vehicles', { body: { regNo: `FL-${RUN}`, capacity: 5 } });
  undo.unshift(() => call('DELETE', `/transport/vehicles/${bus.id}`));
  ctx.route = (
    await call('POST', '/transport/routes', {
      body: { name: `Route ${RUN}`, vehicleId: bus.id, monthlyFee: 900 },
    })
  ).id;
  undo.unshift(() => call('DELETE', `/transport/routes/${ctx.route}`));
  ctx.stop = (
    await call('POST', '/transport/stops', { body: { routeId: ctx.route, name: `Stop ${RUN}`, sequence: 1 } })
  ).id;
  undo.unshift(() => call('DELETE', `/transport/stops/${ctx.stop}`));
  ctx.club = (
    await call('POST', '/activities', {
      body: { kind: 'club', title: `Club ${RUN}`, startDate: day(20), endDate: day(21) },
    })
  ).id;
  undo.unshift(() => call('DELETE', `/activities/${ctx.club}`));
  return `class with core and elective subjects, a fee group, a bus route, an activity, a fee item and an exam ready (academic year ${ctx.year ?? 'none'})`;
});

await step('2  Enquiry is recorded with a follow-up plan', async () => {
  ctx.adm = (
    await call('POST', '/admissions/enquiries', {
      body: {
        firstName: 'Flow',
        lastName: `Kid${RUN}`,
        classId: ctx.cls,
        academicYear: ctx.year,
        guardianName: 'Gita Flow',
        guardianPhone: '+91 98765 43210',
        source: 'referral',
        followUpOn: day(2),
      },
    })
  ).id;
  undo.unshift(async () => {
    await call('DELETE', `/admissions/${ctx.adm}`).catch(() => {});
    await call('DELETE', `/admissions/${ctx.adm}?permanent=1`).catch(() => {});
  });
  const row = (await call('GET', `/admissions/enquiries?q=Kid${RUN}`)).rows[0];
  must(row?.id === ctx.adm, 'the enquiry is not in the enquiry list');
  return row.enquiryId;
});

await step(
  '3  Application: the enquiry continues in the application form, with required documents and consent',
  async () => {
    await call('PUT', `/admissions/applications/${ctx.adm}`, {
      body: {
        firstName: 'Flow',
        lastName: `Kid${RUN}`,
        dob: '2019-02-03',
        gender: 'female',
        classId: ctx.cls,
        academicYear: ctx.year,
        guardianName: 'Gita Flow',
        guardianRelation: 'Mother',
        guardianPhone: '+91 98765 43210',
        guardianEmail: `gita${RUN}@example.com`,
        address: '12 Lake Road, Pune',
        specialNeeds: 'Wears glasses',
        siblings: [{ type: 'Sibling', admissionNo: `SB${RUN}`, name: `Elder ${RUN}`, className: 'Grade 5' }],
        choices: {
          electiveIds: [ctx.french.link],
          activityIds: [ctx.club],
          transportRouteId: ctx.route,
          transportStopId: ctx.stop,
          needsHostel: true,
          feeGroupId: ctx.group,
        },
      },
    });
    const needed = (
      await call('GET', '/masters?type=application_document')
    ).items.application_document.filter((i) => i.required && i.active);
    for (const d of needed)
      await call(
        'POST',
        `/admissions/applications/${ctx.adm}/documents?name=${encodeURIComponent(`${d.name}.png`)}&title=${encodeURIComponent(d.name)}`,
        { raw: PNG },
      );
    await call('PUT', `/photos/enquiry/${ctx.adm}`, { raw: PNG }).catch(() =>
      fetch(`${API}/photos/enquiry/${ctx.adm}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'image/png', Authorization: `Bearer ${admin}` },
        body: PNG,
      }),
    );
    await call('POST', `/admissions/applications/${ctx.adm}/submit`, { body: { consent: true } });
    const app = (await call('GET', `/admissions/applications?q=Kid${RUN}`)).rows[0];
    must(app?.stage === 'review', `expected the application to be under review, it is ${app?.stage}`);
    return `${app.applicationId}, ${needed.length} required document(s) uploaded`;
  },
);

await step('4  Assessment: entrance test and interview', async () => {
  await call('PUT', `/admissions/${ctx.adm}/test`, {
    body: { testDate: day(-2), testMarks: 38, testMaxMarks: 50 },
  });
  await call('PUT', `/admissions/${ctx.adm}/interview`, {
    body: {
      interviewDate: day(-1),
      interviewTime: '10:30',
      interviewPanel: 'Principal',
      interviewResult: 'recommended',
    },
  });
  const app = (await call('GET', `/admissions/applications?q=Kid${RUN}`)).rows[0];
  must(app.stage === 'assessment', `expected assessment, got ${app.stage}`);
});

await step('5  Offer: approved with an expiry date', async () => {
  await call('POST', `/admissions/${ctx.adm}/status`, { body: { status: 'approved' } });
  await call('PUT', `/admissions/${ctx.adm}/offer`, { body: { offerExpiry: day(14) } });
  const app = (await call('GET', `/admissions/applications?q=Kid${RUN}`)).rows[0];
  must(app.stage === 'offer', `expected offer, got ${app.stage}`);
});

await step(
  '6  Enrolment creates the student and bills the class fees; documents and photo move over',
  async () => {
    const r = await call('POST', `/admissions/${ctx.adm}/enroll`, { body: {} });
    ctx.student = r.studentId;
    undo.unshift(() => call('DELETE', `/students/${ctx.student}`));
    must(r.feesBilled === 1, `expected 1 fee billed, got ${r.feesBilled}`);
    must(
      r.followUps?.length === 1 && /Hostel/.test(r.followUps[0]),
      `only the hostel bed should be left to do, got ${JSON.stringify(r.followUps)}`,
    );
    const mine = await call('GET', `/students/${ctx.student}/subjects`);
    must(
      mine.subjects.some((x) => x.id === ctx.french.link) &&
        !mine.subjects.some((x) => x.id === ctx.hindi.link),
      'the chosen elective (French, not Hindi) should be the one the student takes',
    );
    must(
      JSON.stringify(await call('GET', `/activities/${ctx.club}/participants`)).includes(`Kid${RUN}`),
      'the student is not registered for the club',
    );
    must(
      (await call('GET', `/transport/assignments?routeId=${ctx.route}`)).some(
        (a) => a.studentId === ctx.student,
      ),
      'the student is not on the bus route',
    );
    const s = await call('GET', `/students/${ctx.student}`);
    must(
      s.specialNeeds === 'Wears glasses' && s.guardianRelation === 'Mother',
      'application details did not reach the student',
    );
    must(
      s.siblings?.length === 1 && s.siblings[0].name === `Elder ${RUN}`,
      `the sibling details did not reach the student: ${JSON.stringify(s.siblings)}`,
    );
    const files = await call('GET', `/student-files?studentId=${ctx.student}`);
    const photo = await fetch(`${API}/photos/student/${ctx.student}`, {
      headers: { Authorization: `Bearer ${admin}` },
    });
    must(photo.status === 200, 'the photo did not reach the student');
    const app = (await call('GET', `/admissions/applications?q=Kid${RUN}`)).rows[0];
    must(app.stage === 'enrolled', 'the application is not shown as enrolled');
    return `student ${s.admissionNo}, ${files.filter((f) => f.kind === 'document').length} document(s) moved, photo moved`;
  },
);

await step('7  Fees: the bill is paid in two parts and the receipts add up', async () => {
  const fees = await call('GET', `/fees?studentId=${ctx.student}`);
  must(
    fees.length === 2,
    `the student should have the class fee and the fee group item, has ${fees.map((x) => x.title).join(', ')}`,
  );
  const tuition = fees.find((x) => x.title === `Tuition ${RUN}`);
  must(tuition && tuition.status !== 'paid', 'the class fee should be unpaid');
  const p1 = await call('POST', `/fees/${tuition.id}/payments`, { body: { amount: '500', method: 'cash' } });
  const p2 = await call('POST', `/fees/${tuition.id}/payments`, { body: { amount: '700', method: 'cash' } });
  must(p1.receiptNo !== p2.receiptNo, 'two payments share a receipt number');
  const after = (await call('GET', `/fees?studentId=${ctx.student}`)).find((x) => x.id === tuition.id);
  must(
    after.status === 'paid' && Number(after.balance) === 0,
    `fee should be paid in full, it is ${after.status} with balance ${after.balance}`,
  );
  return `${p1.receiptNo} and ${p2.receiptNo}`;
});

await step('8  Parent: portal login linked to the child shows fees, attendance and results', async () => {
  const email = `parent${RUN}@example.com`;
  const parent = await call('POST', '/parents', {
    body: { name: `Gita Flow ${RUN}`, email, password: 'password-12345' },
  });
  undo.unshift(() => call('DELETE', `/parents/${parent.id}`));
  await call('POST', `/parents/${parent.id}/students`, {
    body: { studentId: ctx.student, relation: 'Mother' },
  });
  const pl = await fetch(`${API}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: 'password-12345' }),
  });
  must(pl.ok, 'the parent cannot sign in');
  ctx.parentToken = (await pl.json()).token;
  const kids = await call('GET', '/portal/children', { token: ctx.parentToken });
  must(
    kids.some((k) => k.id === ctx.student),
    'the child is not on the parent portal',
  );
  const fees = await call('GET', `/portal/children/${ctx.student}/fees`, { token: ctx.parentToken });
  must(JSON.stringify(fees).includes(`Tuition ${RUN}`), 'the portal does not show the fee');
  const other = await fetch(`${API}/portal/children/1/overview`, {
    headers: { Authorization: `Bearer ${ctx.parentToken}` },
  });
  must(other.status >= 400, "a parent can open someone else's child");
  return 'portal shows the child and refuses other children';
});

await step('9  Attendance: marked, then visible to the parent', async () => {
  await call('POST', '/attendance', {
    body: {
      date: today,
      records: [{ studentId: ctx.student, status: 'late', arrivalTime: '08:40', note: 'Bus delay' }],
    },
  });
  const roster = (await call('GET', `/attendance?date=${today}&classId=${ctx.cls}`)).find(
    (r) => r.studentId === ctx.student,
  );
  must(roster?.status === 'late' && roster.arrivalTime === '08:40', 'the roster does not show the mark');
  const portal = await call('GET', `/portal/children/${ctx.student}/attendance`, { token: ctx.parentToken });
  must(
    JSON.stringify(portal).includes('late') ||
      JSON.stringify(portal).includes('Late') ||
      portal.days >= 1 ||
      portal.summary,
    'the parent portal does not show attendance',
  );
});

await step('10  Exam: marks are entered, ranked, and the report card and the parent see them', async () => {
  await call('POST', `/exams/${ctx.exam}/marks`, {
    body: {
      records: [
        { studentId: ctx.student, subjectId: ctx.sub, marks: 44 },
        { studentId: ctx.student, subjectId: ctx.french.sid, marks: 44 },
      ],
    },
  });
  const refused = await fetch(`${API}/exams/${ctx.exam}/marks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${admin}` },
    body: JSON.stringify({ records: [{ studentId: ctx.student, subjectId: ctx.hindi.sid, marks: 40 }] }),
  });
  must(refused.status === 400, 'a mark for the elective the student did not choose was accepted');
  const res = await call('GET', `/exams/${ctx.exam}/results`);
  must(
    res.rows[0]?.studentId === ctx.student &&
      res.rows[0].total === 88 &&
      res.rows[0].outOf === 100 &&
      res.rows[0].rank === 1,
    'the result row is wrong',
  );
  const card = await call('GET', `/exams/${ctx.exam}/report-card/${ctx.student}`);
  must(
    card.subjects.length === 2 && card.subjects.every((s) => s.marks === 44),
    'the report card should list only the two subjects the student takes',
  );
  const portal = await call('GET', `/portal/children/${ctx.student}/results`, { token: ctx.parentToken });
  must(JSON.stringify(portal).includes('88'), 'the parent cannot see the result');
  return `${res.rows[0].percentage}% grade ${res.rows[0].grade}`;
});

await step(
  '11  Certificate: the parent raises a request in the portal and the school sees it in the register',
  async () => {
    // An issued certificate is a permanent record (it blocks deleting the student), so this run raises and rejects one instead of issuing it.
    const asked = await call('POST', `/portal/children/${ctx.student}/documents`, {
      token: ctx.parentToken,
      body: { type: 'bonafide', purpose: 'flow check' },
    });
    const id = asked.id ?? (await call('GET', `/documents?studentId=${ctx.student}`))[0]?.id;
    must(id, 'the request was not created');
    undo.unshift(() => call('DELETE', `/documents/${id}`));
    const register = await call('GET', `/documents?studentId=${ctx.student}`);
    must(
      register.some((r) => r.id === id && r.status === 'requested'),
      'the request is not in the school register',
    );
    await call('POST', `/documents/${id}/reject`, { body: { remarks: 'flow check' } });
    const mine = await call('GET', `/portal/children/${ctx.student}/documents`, { token: ctx.parentToken });
    must(JSON.stringify(mine).toLowerCase().includes('rejected'), 'the parent does not see the decision');
    return 'raised by the parent, seen by the school, decision seen by the parent';
  },
);

await step('12  Promotion: the student moves to the next class and the ID card follows', async () => {
  const r = await call('POST', '/promotion', {
    body: { fromClassId: ctx.cls, toClassId: ctx.next, studentIds: [ctx.student] },
  });
  must(r.moved === 1, `expected 1 student moved, got ${r.moved}`);
  const s = await call('GET', `/students/${ctx.student}`);
  must(String(s.classId) === String(ctx.next), 'the student is still in the old class');
  const cards = (await call('GET', `/documents/id-cards?studentId=${ctx.student}`)).cards;
  must(cards.length === 1 && cards[0].className.endsWith('-B'), 'the ID card does not show the new class');
});

for (const drop of undo) {
  try {
    await drop();
  } catch (err) {
    results.push({ name: 'cleanup', ok: false, note: err.message });
  }
}

let failed = 0;
for (const r of results) {
  if (r.ok) console.log(`PASS  ${r.name}${r.note ? `\n        ${r.note}` : ''}`);
  else {
    failed += 1;
    console.log(`FAIL  ${r.name}\n        ${r.note}`);
  }
}
console.log(`\n${results.length - failed} of ${results.length} steps went through.`);
process.exit(failed ? 1 : 0);
