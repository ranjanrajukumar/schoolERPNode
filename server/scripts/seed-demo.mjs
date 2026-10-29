// Fills a running School ERP with realistic sample records, through the normal API, so every page and form list shows data.
//   node scripts/seed-demo.mjs            add the demo data (safe to run again: what already exists is skipped)
//   node scripts/seed-demo.mjs --remove   delete what this script added (it keeps a list in scripts/.demo-seed.json)
// Environment: API (default http://localhost:4000/api), ADMIN_EMAIL / ADMIN_PASSWORD (default admin@school.local / admin123).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const API = process.env.API || 'http://localhost:4000/api';
const LIST = path.join(path.dirname(fileURLToPath(import.meta.url)), '.demo-seed.json');
const created = fs.existsSync(LIST) ? JSON.parse(fs.readFileSync(LIST, 'utf8')) : {};
const keep = () => fs.writeFileSync(LIST, JSON.stringify(created, null, 1));
const track = (kind, id) => {
  (created[kind] ??= []).push(id);
  keep();
};

let token;
async function call(method, p, body) {
  const res = await fetch(API + p, {
    method,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`${method} ${p}: ${data.error ?? res.status}`);
  return data;
}
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
);
async function upload(p) {
  const res = await fetch(API + p, {
    method: 'POST',
    headers: { 'Content-Type': 'application/octet-stream', Authorization: `Bearer ${token}` },
    body: PNG,
  });
  if (!res.ok) throw new Error(`POST ${p}: ${(await res.json().catch(() => ({}))).error ?? res.status}`);
}
const day = (n) => new Date(Date.now() + n * 86400000).toISOString().slice(0, 10);

async function login() {
  const res = await fetch(`${API}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: process.env.ADMIN_EMAIL || 'admin@school.local',
      password: process.env.ADMIN_PASSWORD || 'admin123',
    }),
  });
  if (!res.ok)
    throw new Error('Could not sign in. Is the server running, and are ADMIN_EMAIL / ADMIN_PASSWORD right?');
  token = (await res.json()).token;
}

async function remove() {
  const order = [
    ['lmsCourses', (id) => call('DELETE', `/lms/courses/${id}`)],
    ['studentAccounts', (id) => call('DELETE', `/student-accounts/${id}`)],
    ['notices', (id) => call('DELETE', `/notices/${id}`)],
    ['libraryMemberships', (id) => call('DELETE', `/library/memberships/${id}`)],
    ['libraryBooks', (id) => call('DELETE', `/library/books/${id}`)],
    ['libraryCategories', (id) => call('DELETE', `/library/categories/${id}`)],
    ['exams', (id) => call('DELETE', `/exams/${id}`)],
    [
      'enquiries',
      (id) => call('DELETE', `/admissions/${id}`).then(() => call('DELETE', `/admissions/${id}?permanent=1`)),
    ],
    ['payslips', (id) => call('DELETE', `/payroll/payslips/${id}`)],
    ['hostelAllocations', (id) => call('DELETE', `/hostel/allocations/${id}`)],
    ['hostelRooms', (id) => call('DELETE', `/hostel/rooms/${id}`)],
    ['hostels', (id) => call('DELETE', `/hostel/hostels/${id}`)],
    ['activities', (id) => call('DELETE', `/activities/${id}`)],
    ['feeGroups', (id) => call('DELETE', `/fee-groups/${id}`)],
    ['transportAssignments', (id) => call('DELETE', `/transport/assignments/${id}`)],
    ['transportStops', (id) => call('DELETE', `/transport/stops/${id}`)],
    ['transportRoutes', (id) => call('DELETE', `/transport/routes/${id}`)],
    ['transportStaff', (id) => call('DELETE', `/transport/staff/${id}`)],
    ['vehicles', (id) => call('DELETE', `/transport/vehicles/${id}`)],
    ['inventoryItems', (id) => call('DELETE', `/inventory/items/${id}`)],
    ['inventoryCategories', (id) => call('DELETE', `/inventory/categories/${id}`)],
    ['suppliers', (id) => call('DELETE', `/inventory/suppliers/${id}`)],
    ['students', (id) => call('DELETE', `/students/${id}`)],
    ['feeStructures', (id) => call('DELETE', `/fee-structures/${id}`)],
    ['classSubjects', (id) => call('DELETE', `/class-subjects/${id}`)],
    ['subjects', (id) => call('DELETE', `/subjects/${id}`)],
    ['staff', (id) => call('DELETE', `/staff/${id}`)],
    [
      'classes',
      async (id) => {
        for (const slot of await call('GET', `/timetable?classId=${id}`))
          await call('DELETE', `/timetable/${slot.id}`);
        await call('DELETE', `/classes/${id}`);
      },
    ],
    ['departments', (id) => call('DELETE', `/hr/departments/${id}`)],
    ['years', (id) => call('DELETE', `/academic-years/${id}`)],
  ];
  for (const [kind, drop] of order) {
    for (const id of created[kind] ?? []) {
      try {
        await drop(id);
      } catch (e) {
        console.log(`  kept ${kind} ${id}: ${e.message}`);
      }
    }
    delete created[kind];
  }
  fs.rmSync(LIST, { force: true });
  console.log('Demo data removed.');
}

async function seed() {
  // academic year: only when the school has none yet
  let years = await call('GET', '/academic-years');
  if (!years.length) {
    const y = await call('POST', '/academic-years', {
      name: '2026-2027',
      startDate: '2026-06-01',
      endDate: '2027-03-31',
    });
    await call('POST', `/academic-years/${y.id}/set-current`);
    track('years', y.id);
    years = await call('GET', '/academic-years');
  }
  const year = years.find((y) => y.isCurrent)?.name ?? years[0].name;

  // departments
  const depts = await call('GET', '/hr/departments');
  const dept = {};
  for (const name of ['Science', 'Mathematics', 'English', 'Administration', 'Sports']) {
    dept[name] =
      depts.find((d) => d.name === name)?.id ?? (await call('POST', '/hr/departments', { name })).id;
    if (!depts.find((d) => d.name === name)) track('departments', dept[name]);
  }

  // classes
  const classes = await call('GET', '/classes');
  const cls = {};
  for (const [name, section] of [
    ['Kindergarten', 'A'],
    ['Grade 1', 'A'],
    ['Grade 1', 'B'],
    ['Grade 2', 'A'],
    ['Grade 3', 'B'],
    ['Grade 5', 'A'],
  ]) {
    const key = `${name}-${section}`;
    const found = classes.find((c) => c.name === name && c.section === section);
    cls[key] = found?.id ?? (await call('POST', '/classes', { name, section })).id;
    if (!found) track('classes', cls[key]);
  }

  // staff
  const staffNow = await call('GET', '/staff');
  const staff = {};
  const people = [
    [
      'Neha',
      'Verma',
      'Mathematics teacher',
      'Mathematics',
      '+91 98220 45123',
      'neha.verma@demo.school',
      '2021-06-01',
      'permanent',
    ],
    [
      'Rohit',
      'Sharma',
      'Science teacher',
      'Science',
      '+91 98900 76234',
      'rohit.sharma@demo.school',
      '2019-06-10',
      'permanent',
    ],
    [
      'Priya',
      'Nair',
      'English teacher',
      'English',
      '+91 97654 32109',
      'priya.nair@demo.school',
      '2022-04-18',
      'contract',
    ],
    [
      'Imran',
      'Khan',
      'Physical education teacher',
      'Sports',
      '+91 98765 11223',
      'imran.khan@demo.school',
      '2020-07-01',
      'part_time',
    ],
    [
      'Sunita',
      'Rao',
      'Admissions officer',
      'Administration',
      '+91 99880 55667',
      'sunita.rao@demo.school',
      '2018-03-12',
      'permanent',
    ],
    [
      'Arjun',
      'Desai',
      'Office assistant',
      'Administration',
      '+91 90000 11122',
      'arjun.desai@demo.school',
      '2023-01-09',
      'permanent',
    ],
    [
      'Meera',
      'Joshi',
      'Mathematics teacher',
      'Mathematics',
      '+91 98111 22334',
      'meera.joshi@demo.school',
      '2017-06-05',
      'permanent',
      'inactive',
    ],
  ];
  for (const [
    firstName,
    lastName,
    designation,
    d,
    phone,
    email,
    joinDate,
    employmentType,
    status = 'active',
  ] of people) {
    const found = staffNow.find((s) => s.email === email);
    staff[`${firstName} ${lastName}`] =
      found?.id ??
      (
        await call('POST', '/staff', {
          firstName,
          lastName,
          designation,
          departmentId: dept[d],
          phone,
          email,
          joinDate,
          employmentType,
          status,
          gender: 'other',
        })
      ).id;
    if (!found) track('staff', staff[`${firstName} ${lastName}`]);
  }

  // registered students
  const existing = new Set((await call('GET', '/students')).map((s) => `${s.firstName} ${s.lastName}`));
  const pupils = [
    [
      'Aarav',
      'Mehta',
      'male',
      '2016-03-14',
      'Grade 5-A',
      'Rohan Mehta',
      '+91 98765 43210',
      'complete',
      '2022-06-08',
    ],
    [
      'Anaya',
      'Shah',
      'female',
      '2018-08-02',
      'Grade 3-B',
      'Priya Shah',
      '+91 98220 45123',
      'pending',
      '2023-06-12',
    ],
    [
      'Ishaan',
      'Patel',
      'male',
      '2020-01-21',
      'Grade 1-A',
      'Neha Patel',
      '+91 97654 32109',
      'under_review',
      '2025-06-04',
    ],
    [
      'Sara',
      'Fernandes',
      'female',
      '2015-11-30',
      'Grade 5-A',
      'Maria Fernandes',
      '+91 98900 76234',
      'complete',
      '2021-06-10',
    ],
    [
      'Kabir',
      'Malhotra',
      'male',
      '2019-05-09',
      'Grade 2-A',
      'Anil Malhotra',
      '+91 99001 12233',
      'complete',
      '2024-06-03',
    ],
    [
      'Diya',
      'Iyer',
      'female',
      '2021-02-17',
      'Kindergarten-A',
      'Lakshmi Iyer',
      '+91 98450 88776',
      'pending',
      '2026-06-02',
    ],
    [
      'Vivaan',
      'Gupta',
      'male',
      '2020-09-25',
      'Grade 1-B',
      'Ritu Gupta',
      '+91 98100 33445',
      'complete',
      '2025-06-04',
    ],
    [
      'Myra',
      'Kapoor',
      'female',
      '2018-12-05',
      'Grade 3-B',
      'Sameer Kapoor',
      '+91 97300 44556',
      'complete',
      '2023-06-12',
    ],
    [
      'Reyansh',
      'Singh',
      'male',
      '2019-07-19',
      'Grade 2-A',
      'Harpreet Singh',
      '+91 98760 99001',
      'under_review',
      '2024-06-03',
    ],
    [
      'Zoya',
      'Ahmed',
      'female',
      '2020-04-11',
      'Grade 1-A',
      'Farah Ahmed',
      '+91 98330 12121',
      'complete',
      '2025-06-04',
    ],
  ];
  for (const [
    firstName,
    lastName,
    gender,
    dob,
    klass,
    guardianName,
    guardianPhone,
    registrationStatus,
    admissionDate,
  ] of pupils) {
    if (existing.has(`${firstName} ${lastName}`)) continue;
    const r = await call('POST', '/students', {
      firstName,
      lastName,
      gender,
      dob,
      classId: cls[klass],
      guardianName,
      guardianRelation: 'Parent',
      guardianPhone,
      guardianEmail: `${guardianName.split(' ')[0].toLowerCase()}@demo.parent`,
      fatherName: gender ? guardianName : '',
      address: '12 Lake Road',
      city: 'Pune',
      state: 'Maharashtra',
      pincode: '411001',
      nationality: 'Indian',
      admissionDate,
      registrationStatus,
    });
    track('students', r.id);
  }

  // enquiries and applications
  const enquiriesByName = new Map((await call('GET', '/admissions')).map((a) => [a.applicantName, a]));
  const sources = ['online', 'office', 'phone', 'referral', 'social', 'other'];
  const desk = staff['Sunita Rao'];
  const families = [
    ['Aditya', 'Rao', 'Grade 1-A', 'Suresh Rao', 'enquiry', 0],
    ['Tara', 'Menon', 'Kindergarten-A', 'Divya Menon', 'enquiry', 3],
    ['Nikhil', 'Bose', 'Grade 2-A', 'Amit Bose', 'enquiry', 0],
    ['Anika', 'Reddy', 'Grade 3-B', 'Kavita Reddy', 'applied', 0],
    ['Dev', 'Thakur', 'Grade 1-B', 'Manoj Thakur', 'applied', 0],
    ['Lila', 'Dsouza', 'Grade 5-A', 'Joseph Dsouza', 'assessment', 0],
    ['Rehan', 'Qureshi', 'Grade 2-A', 'Salma Qureshi', 'assessment', 0],
    ['Pari', 'Bhatt', 'Grade 1-A', 'Hetal Bhatt', 'offer', 0],
    ['Yash', 'Chopra', 'Grade 3-B', 'Vikas Chopra', 'offer', 0],
  ];
  let n = 0;
  for (const [firstName, lastName, klass, guardianName, stage, followDays] of families) {
    const found = enquiriesByName.get(`${firstName} ${lastName}`);
    // a record left half-way by an earlier run is carried on to its stage instead of being skipped
    if (found && (found.status !== 'enquiry' || stage === 'enquiry')) continue;
    const id = found
      ? found.id
      : (
          await call('POST', '/admissions/enquiries', {
            firstName,
            lastName,
            classId: cls[klass],
            academicYear: year,
            guardianName,
            guardianRelation: 'Parent',
            guardianPhone: `+91 9${String(800000000 + n * 1234567).slice(0, 9)}`,
            email: `${guardianName.split(' ')[0].toLowerCase()}@demo.parent`,
            address: '45 Park Street, Pune',
            source: sources[n % sources.length],
            assignedToId: desk,
            enquiryOn: day(-(n * 2 + 1)),
            preferredContact: n % 2 ? 'whatsapp' : 'phone',
            remarks: 'Interested in the school visit.',
            followUpOn: followDays ? day(followDays) : null,
            followUpType: 'phone_call',
            followUpNote: 'Share the fee structure',
          })
        ).id;
    if (!found) track('enquiries', id);
    n += 1;
    if (stage === 'enquiry') continue;
    // the application form must be submitted (with a date of birth and consent) before the enquiry can move on
    for (const title of ['Address proof', 'Birth certificate'])
      await upload(
        `/admissions/applications/${id}/documents?name=${encodeURIComponent(title)}.png&title=${encodeURIComponent(title)}`,
      );
    await call('POST', `/admissions/applications/${id}/submit`, {
      dob: day(-365 * (4 + (n % 5))),
      consent: true,
    });
    if (stage === 'assessment')
      await call('PUT', `/admissions/${id}/test`, { testDate: day(-3), testMarks: 72, testMaxMarks: 100 });
    if (stage === 'offer') {
      await call('POST', `/admissions/${id}/status`, { status: 'approved' });
      await call('PUT', `/admissions/${id}/offer`, { offerExpiry: day(14) }).catch(() => {});
    }
  }
  console.log(
    'Demo data added: academic year, departments, classes, staff, students, enquiries and applications.',
  );
}

// Phase 2: subjects, fees and payments, attendance, exams with marks, and one enrolment (admission -> student -> fees)
async function seedAcademics() {
  const classes = await call('GET', '/classes');
  const demoClasses = ['Kindergarten-A', 'Grade 1-A', 'Grade 1-B', 'Grade 2-A', 'Grade 3-B', 'Grade 5-A']
    .map((k) => classes.find((c) => `${c.name}-${c.section}` === k))
    .filter(Boolean);
  const staffAll = await call('GET', '/staff');
  const teacherFor = {
    Mathematics: 'Neha',
    Science: 'Rohit',
    English: 'Priya',
    'Social Studies': 'Imran',
    Hindi: 'Sunita',
  };
  const teacherId = (sub) => staffAll.find((p) => p.firstName === teacherFor[sub])?.id ?? null;

  const subs = await call('GET', '/subjects');
  const subject = {};
  for (const [name, code] of [
    ['Mathematics', 'MATH'],
    ['Science', 'SCI'],
    ['English', 'ENG'],
    ['Social Studies', 'SST'],
    ['Hindi', 'HIN'],
  ]) {
    const found = subs.find((x) => x.name === name);
    subject[name] = found?.id ?? (await call('POST', '/subjects', { name, code })).id;
    if (!found) track('subjects', subject[name]);
  }
  const links = await call('GET', '/class-subjects');
  for (const c of demoClasses) {
    for (const name of Object.keys(subject)) {
      if (links.find((l) => l.classId === c.id && l.subjectId === subject[name])) continue;
      const r = await call('POST', '/class-subjects', {
        classId: c.id,
        subjectId: subject[name],
        staffId: teacherId(name),
      });
      track('classSubjects', r.id);
    }
  }

  // subject map: five periods a week each, Science with a practical, and a second-language elective (Hindi or French) in two classes
  const linksNow = await call('GET', '/class-subjects');
  for (const l of linksNow.filter((x) => demoClasses.some((c) => c.id === x.classId))) {
    await call('PUT', `/class-subjects/${l.id}`, {
      periodsPerWeek: 5,
      ...(l.subjectId === subject.Science ? { component: 'theory_practical', practicalShare: 25 } : {}),
    });
  }
  const frenchFound = (await call('GET', '/subjects')).find((x) => x.name === 'French');
  const french = frenchFound?.id ?? (await call('POST', '/subjects', { name: 'French', code: 'FRE' })).id;
  if (!frenchFound) track('subjects', french);
  for (const key of ['Grade 5-A', 'Grade 3-B']) {
    const c = demoClasses.find((x) => `${x.name}-${x.section}` === key);
    if (!c) continue;
    const have = await call('GET', '/class-subjects');
    const hindi = have.find((l) => l.classId === c.id && l.subjectId === subject.Hindi);
    let fr = have.find((l) => l.classId === c.id && l.subjectId === french);
    if (!fr) {
      fr = {
        id: (
          await call('POST', '/class-subjects', {
            classId: c.id,
            subjectId: french,
            staffId: staffAll.find((p) => p.firstName === 'Priya')?.id ?? '',
            isElective: true,
            electiveGroup: 'Second language',
            periodsPerWeek: 5,
          })
        ).id,
      };
      track('classSubjects', fr.id);
    }
    await call('PUT', `/class-subjects/${hindi.id}`, { isElective: true, electiveGroup: 'Second language' });
    const pupils = (await call('GET', `/class-subjects/electives?classId=${c.id}`)).students;
    for (const [i, st] of pupils.entries())
      await call('PUT', `/students/${st.id}/electives`, {
        classSubjectIds: [i % 2 === 0 ? hindi.id : fr.id],
      });
  }

  await seedLms(demoClasses, subject);

  // class teachers, rooms and a weekly timetable (a different subject per class in each period, so no teacher is in two places)
  const homeroom = ['Neha', 'Rohit', 'Priya', 'Imran', 'Sunita', 'Neha'];
  const names = Object.keys(subject);
  for (const [i, c] of demoClasses.entries()) {
    await call('PUT', `/classes/${c.id}`, {
      classTeacherId: staffAll.find((p) => p.firstName === homeroom[i])?.id ?? '',
      room: i === 0 ? 'K-01' : String(100 + i),
    });
    for (let d = 1; d <= 5; d += 1) {
      for (let p = 1; p <= 5; p += 1) {
        const name = names[(d + p + i) % names.length];
        await call('POST', '/timetable', {
          classId: c.id,
          day: d,
          period: p,
          subjectId: subject[name],
          staffId: i < 5 ? teacherId(name) : null,
        });
      }
    }
  }

  // payroll: salary terms for the demo staff and this month's payslips (left as drafts, so they can be approved or removed)
  const pay = {
    Neha: [42000, 3000, 2000],
    Rohit: [46000, 3500, 2500],
    Priya: [38000, 2500, 1800],
    Imran: [30000, 2000, 1200],
    Sunita: [34000, 2500, 1500],
    Arjun: [22000, 1500, 900],
  };
  for (const person of staffAll) {
    const terms = pay[person.firstName];
    if (terms && person.email?.endsWith('@demo.school'))
      await call('PUT', `/payroll/salaries/${person.id}`, {
        basic: terms[0],
        allowances: terms[1],
        deductions: terms[2],
      });
  }
  const month = new Date().toISOString().slice(0, 7);
  const before = new Set((await call('GET', `/payroll/payslips?month=${month}`)).map((p) => p.id));
  await call('POST', '/payroll/generate', { month });
  for (const p of await call('GET', `/payroll/payslips?month=${month}`))
    if (!before.has(p.id)) track('payslips', p.id);

  // fees: one tuition item and one activity item per class, billed to every active student, half of them paid
  const structures = await call('GET', '/fee-structures');
  for (const c of demoClasses) {
    for (const [title, amount, due] of [
      ['Tuition fee Term 1', '12000', 30],
      ['Activity fee', '1500', 45],
    ]) {
      if (structures.find((x) => x.classId === c.id && x.title === title)) continue;
      track(
        'feeStructures',
        (await call('POST', '/fee-structures', { classId: c.id, title, amount, dueDate: day(due) })).id,
      );
    }
    await call('POST', '/fees/generate', { classId: c.id });
  }
  const fees = await call('GET', '/fees');
  let paid = 0;
  for (const fee of fees
    .filter((x) => demoClasses.some((c) => c.id === x.classId) || true)
    .filter((x) => String(x.title).startsWith('Tuition') && Number(x.paidAmount) === 0)) {
    if (fee.id % 2) continue;
    try {
      await call('POST', `/fees/${fee.id}/payments`, {
        amount: fee.id % 4 ? '6000' : String(fee.amount),
        method: fee.id % 3 ? 'cash' : 'upi',
      });
      paid += 1;
    } catch {
      /* a fee outside the demo data may refuse; skip it */
    }
  }

  // attendance for the last five school days
  const students = (await call('GET', '/students')).filter((x) => x.status === 'active' && x.classId);
  const roll = ['present', 'present', 'present', 'late', 'present', 'absent', 'present', 'present'];
  let marked = 0;
  for (let back = 1; marked < 5; back += 1) {
    const date = day(-back);
    if ([0, 6].includes(new Date(date).getDay())) continue;
    for (const c of demoClasses) {
      const kids = students.filter((x) => x.classId === c.id);
      const roster = kids.length ? await call('GET', `/attendance?date=${date}&classId=${c.id}`) : [];
      if (roster.some((r) => r.status !== null)) continue; // that day was already taken: leave it alone
      if (kids.length)
        await call('POST', '/attendance', {
          date,
          records: kids.map((k, i) => ({ studentId: k.id, status: roll[(k.id + i + back) % roll.length] })),
        });
    }
    marked += 1;
  }

  // exams with marks for every student and subject
  const exams = await call('GET', '/exams');
  for (const c of demoClasses) {
    for (const [name, max, start] of [
      ['Unit Test 1', 50, -20],
      ['Mid-Term Exam', 100, -7],
    ]) {
      let exam = exams.find((e) => e.classId === c.id && e.name === name);
      let id = exam?.id;
      if (!id) {
        id = (
          await call('POST', '/exams', {
            name,
            classId: c.id,
            maxMarks: max,
            startDate: day(start),
            endDate: day(start + 4),
          })
        ).id;
        track('exams', id);
      }
      const sheet = await call('GET', `/exams/${id}/marks`);
      const records = [];
      sheet.students.forEach((st) =>
        sheet.subjects.forEach((sub) => {
          if (st.marks[sub.id] !== undefined || st.skips.includes(sub.id)) return; // already entered, or an elective this student did not choose
          const base = 0.45 + ((st.studentId * 7 + sub.id * 13) % 50) / 100; // 45% to 94%, repeatable
          records.push({ studentId: st.studentId, subjectId: sub.id, marks: Math.round(base * max) });
        }),
      );
      if (records.length) await call('POST', `/exams/${id}/marks`, { records });
    }
  }

  // enrol one applicant who has an offer: this creates the student and bills the class fees
  const offers = (await call('GET', '/admissions/applications?tab=offer&q=Pari%20Bhatt')).rows;
  let enrolled = 'nobody (no offer waiting)';
  if (offers.length) {
    const r = await call('POST', `/admissions/${offers[0].id}/enroll`, {});
    track('students', r.studentId);
    enrolled = `${offers[0].applicantName} as ${r.admissionNo} (${r.feesBilled} fee items billed)`;
  }
  console.log(
    `Academics added: ${Object.keys(subject).length} subjects, payroll terms and draft payslips, fees billed (${paid} payments recorded), attendance for 5 days, Unit Test and Mid-Term marks for ${demoClasses.length} classes. Enrolled: ${enrolled}.`,
  );
}

// Phase 3: hostel, transport and inventory
// Student logins for the LMS demo: created with a temporary password, which a student must change before using the portal.
const STUDENT_TEMP = 'student123';
const STUDENT_PASS = 'Student@123';
async function studentSession(student, accounts) {
  const email = `${student.firstName.toLowerCase()}.${student.lastName.toLowerCase()}@demo.student`;
  if (!accounts.some((a) => a.studentId === student.id))
    track(
      'studentAccounts',
      (await call('POST', '/student-accounts', { studentId: student.id, email, password: STUDENT_TEMP })).id,
    );
  const signIn = async (password) => {
    const res = await fetch(`${API}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    return res.ok ? (await res.json()).token : null;
  };
  let t = await signIn(STUDENT_PASS);
  if (!t) {
    t = await signIn(STUDENT_TEMP);
    if (t) {
      await fetch(`${API}/auth/change-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${t}` },
        body: JSON.stringify({ currentPassword: STUDENT_TEMP, newPassword: STUDENT_PASS }),
      });
      t = await signIn(STUDENT_PASS);
    }
  }
  if (!t) return null;
  return async (method, p, body) => {
    const res = await fetch(`${API}/portal/children/${student.id}${p}`, {
      method,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${t}` },
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(`${method} ${p}: ${data.error ?? res.status}`);
    return data;
  };
}

// LMS: several published courses with modules, lessons, assignments, quizzes of every type and announcements, then real student activity
// (reads, completions, submissions, quiz attempts) and teacher grading, all through the normal API. Safe to run again.
async function seedLms(demoClasses, subject) {
  const find = (key) => demoClasses.find((c) => `${c.name}-${c.section}` === key);
  const specs = [
    {
      cls: 'Grade 5-A',
      sub: 'Mathematics',
      title: 'Demo · Fractions and decimals',
      description: 'Fractions, equivalent fractions and decimals, with practice and a unit test.',
      modules: [
        {
          title: 'Fractions',
          lessons: [
            [
              'Equivalent fractions',
              'Fractions can look different and still have the same value. Multiply or divide the numerator and denominator by the same number.',
              'https://www.khanacademy.org/math/arithmetic/fraction-arithmetic',
            ],
            [
              'Add fractions with like denominators',
              'Keep the denominator and add the numerators. Simplify the result when possible.',
            ],
            [
              'Compare fractions',
              'Use a common denominator, or compare with 1/2, to decide which fraction is larger.',
            ],
          ],
        },
        {
          title: 'Decimals',
          lessons: [
            [
              'Tenths and hundredths',
              'A decimal is a fraction with a denominator of 10, 100 or 1000. 0.5 = 5/10 = 1/2.',
            ],
            [
              'Add and subtract decimals',
              'Line up the decimal points, then add or subtract as with whole numbers.',
            ],
          ],
        },
      ],
      assignments: [
        {
          title: 'Fraction practice',
          instructions: 'Write the steps for adding 2/5 and 1/5, then simplify 6/8.',
          dueOn: 7,
          maxScore: 10,
          published: true,
        },
        {
          title: 'Decimal word problems',
          instructions: 'Solve the five word problems on page 42 and write your working.',
          dueOn: 14,
          maxScore: 20,
          published: true,
        },
        {
          title: 'Project: fractions in the kitchen (draft)',
          instructions: 'Find three recipes and list the fractions they use.',
          dueOn: 21,
          maxScore: 25,
          published: false,
        },
      ],
      quizzes: [
        {
          title: 'Fraction check',
          description: 'A short automatically graded practice test.',
          dueOn: 10,
          maxAttempts: 3,
          published: true,
          questions: [
            {
              id: 'fq1',
              type: 'single_choice',
              prompt: 'Which fraction is equal to 1/2?',
              choices: ['2/4', '2/3', '3/5'],
              correctIndex: 0,
              points: 1,
            },
            {
              id: 'fq2',
              type: 'true_false',
              prompt: '3/6 is equivalent to 1/2.',
              correctIndex: 0,
              points: 1,
            },
          ],
        },
        {
          title: 'Unit test: fractions and decimals',
          description: 'Objective questions plus one written response reviewed by the teacher.',
          dueOn: 18,
          maxAttempts: 2,
          published: true,
          questions: [
            {
              id: 'ut1',
              type: 'single_choice',
              prompt: 'What is 0.25 as a fraction?',
              choices: ['1/4', '1/2', '2/5'],
              correctIndex: 0,
              points: 2,
            },
            {
              id: 'ut2',
              type: 'multiple_choice',
              prompt: 'Select all fractions equal to 1/2.',
              choices: ['2/4', '3/6', '2/5', '4/8'],
              correctIndexes: [0, 1, 3],
              points: 3,
            },
            {
              id: 'ut3',
              type: 'true_false',
              prompt: '0.5 is greater than 0.25.',
              correctIndex: 0,
              points: 1,
            },
            {
              id: 'ut4',
              type: 'short_answer',
              prompt: 'Explain how you add 0.3 and 0.45.',
              expectedAnswer: 'Line up the decimal points and add: 0.75.',
              points: 4,
            },
          ],
        },
      ],
      announcements: [
        [
          'Welcome to the fractions course',
          'Start with the equivalent fractions lesson. The written practice is due next week.',
        ],
        ['Unit test date', 'The unit test opens now and closes in 18 days. You have two attempts.'],
      ],
    },
    {
      cls: 'Grade 5-A',
      sub: 'Science',
      title: 'Demo · Plants and photosynthesis',
      description: 'How plants make food, the parts of a plant and a simple experiment.',
      modules: [
        {
          title: 'Parts of a plant',
          lessons: [
            [
              'Roots, stems and leaves',
              'Roots take in water, stems carry it, and leaves make food using sunlight.',
            ],
            ['Flowers and seeds', 'Flowers make seeds so new plants can grow.'],
          ],
        },
        {
          title: 'Photosynthesis',
          lessons: [
            [
              'How plants make food',
              'Plants use sunlight, water and carbon dioxide to make sugar and oxygen.',
              'https://www.youtube.com/results?search_query=photosynthesis+for+kids',
            ],
          ],
        },
      ],
      assignments: [
        {
          title: 'Label a plant',
          instructions:
            'Draw a plant and label the root, stem, leaf and flower. Upload a photo or write the labels.',
          dueOn: 9,
          maxScore: 10,
          published: true,
        },
      ],
      quizzes: [
        {
          title: 'Plants quick quiz',
          description: 'Five minutes, two attempts.',
          dueOn: 12,
          maxAttempts: 2,
          published: true,
          questions: [
            {
              id: 'pq1',
              type: 'single_choice',
              prompt: 'Which part of a plant takes in water?',
              choices: ['Root', 'Leaf', 'Flower'],
              correctIndex: 0,
              points: 1,
            },
            {
              id: 'pq2',
              type: 'multiple_choice',
              prompt: 'What do plants need for photosynthesis?',
              choices: ['Sunlight', 'Water', 'Plastic', 'Carbon dioxide'],
              correctIndexes: [0, 1, 3],
              points: 2,
            },
          ],
        },
      ],
      announcements: [['Bring a leaf', 'Please bring one fallen leaf to the next science class.']],
    },
    {
      cls: 'Grade 5-A',
      sub: 'English',
      title: 'Demo · Reading comprehension',
      description: 'Reading short passages and answering questions in full sentences.',
      modules: [
        {
          title: 'Reading skills',
          lessons: [
            [
              'Finding the main idea',
              'The main idea is what the whole passage is mostly about. Ask: what is the author telling me?',
            ],
            ['Using context clues', 'When you meet a new word, read the sentences around it for hints.'],
          ],
        },
      ],
      assignments: [
        {
          title: 'Summarise the passage',
          instructions: 'Read “The Lost Kite” and write a 5-sentence summary.',
          dueOn: 6,
          maxScore: 10,
          published: true,
        },
      ],
      quizzes: [
        {
          title: 'Main idea check',
          description: 'Choose the best answer.',
          dueOn: 11,
          maxAttempts: 3,
          published: true,
          questions: [
            {
              id: 'eq1',
              type: 'single_choice',
              prompt: 'The main idea of a passage is…',
              choices: ['A small detail', 'What the passage is mostly about', 'The title only'],
              correctIndex: 1,
              points: 1,
            },
          ],
        },
      ],
      announcements: [['Library visit', 'We will visit the library on Friday to borrow reading books.']],
    },
    {
      cls: 'Grade 3-B',
      sub: 'Science',
      title: 'Demo · Living and non-living things',
      description: 'Sorting things around us into living and non-living.',
      modules: [
        {
          title: 'Around us',
          lessons: [
            ['What is alive?', 'Living things grow, need food and air, and can have babies.'],
            ['Sorting game', 'Sort pictures into living and non-living groups.'],
          ],
        },
      ],
      assignments: [
        {
          title: 'My living things list',
          instructions: 'List five living and five non-living things in your home.',
          dueOn: 8,
          maxScore: 10,
          published: true,
        },
      ],
      quizzes: [
        {
          title: 'Living or not?',
          description: 'True or false.',
          dueOn: 12,
          maxAttempts: 3,
          published: true,
          questions: [
            {
              id: 'lq1',
              type: 'true_false',
              prompt: 'A stone is a living thing.',
              correctIndex: 1,
              points: 1,
            },
            {
              id: 'lq2',
              type: 'true_false',
              prompt: 'A tree is a living thing.',
              correctIndex: 0,
              points: 1,
            },
          ],
        },
      ],
      announcements: [],
    },
    {
      cls: 'Grade 1-A',
      sub: 'English',
      title: 'Demo · Phonics and sounds',
      description: 'Letter sounds and simple three-letter words.',
      modules: [
        {
          title: 'Letter sounds',
          lessons: [
            ['Vowel sounds', 'The vowels are a, e, i, o and u. Say each sound aloud.'],
            ['Three-letter words', 'Blend sounds together: c-a-t makes cat.'],
          ],
        },
      ],
      assignments: [
        {
          title: 'Word hunt',
          instructions: 'Find five three-letter words at home and write them down.',
          dueOn: 5,
          maxScore: 5,
          published: true,
        },
      ],
      quizzes: [],
      announcements: [['Reading at home', 'Please read together for ten minutes every evening.']],
    },
  ];

  const allCourses = await call('GET', '/lms/courses');
  const out = {};
  for (const spec of specs) {
    const cls = find(spec.cls);
    if (!cls || !subject[spec.sub]) continue;
    let course = allCourses.find(
      (c) => c.classId === cls.id && c.subjectId === subject[spec.sub] && c.title === spec.title,
    );
    if (!course) {
      const id = (
        await call('POST', '/lms/courses', {
          classId: cls.id,
          subjectId: subject[spec.sub],
          title: spec.title,
          description: spec.description,
        })
      ).id;
      track('lmsCourses', id);
      course = { id };
    }
    const base = `/lms/courses/${course.id}`;
    const mods = await call('GET', `${base}/modules`);
    const lessons = await call('GET', `${base}/lessons`);
    let lessonNo = 0;
    for (const [mi, m] of spec.modules.entries()) {
      let mod = mods.find((x) => x.title === m.title);
      if (!mod)
        mod = {
          id: (
            await call('POST', `${base}/modules`, {
              title: m.title,
              description: '',
              sequence: mi + 1,
              published: true,
            })
          ).id,
        };
      for (const [title, content, resourceUrl] of m.lessons) {
        lessonNo += 1;
        if (!lessons.some((l) => l.title === title))
          await call('POST', `${base}/lessons`, {
            moduleId: mod.id,
            sequence: lessonNo,
            title,
            content,
            resourceUrl: resourceUrl || null,
            published: true,
          });
      }
    }
    const haveA = await call('GET', `${base}/assignments`);
    for (const a of spec.assignments)
      if (!haveA.some((x) => x.title === a.title))
        await call('POST', `${base}/assignments`, { ...a, dueOn: day(a.dueOn) });
    const haveQ = await call('GET', `${base}/quizzes`);
    for (const q of spec.quizzes)
      if (!haveQ.some((x) => x.title === q.title))
        await call('POST', `${base}/quizzes`, { ...q, dueOn: day(q.dueOn) });
    const haveN = await call('GET', `${base}/announcements`);
    for (const [title, body] of spec.announcements)
      if (!haveN.some((x) => x.title === title)) await call('POST', `${base}/announcements`, { title, body });
    if (!course.published) await call('PUT', base, { published: true });
    out[spec.title] = course.id;

    // Content library: a reference document and two links per course.
    const haveM = await call('GET', `${base}/materials`);
    for (const m of [
      {
        kind: 'file',
        title: `${spec.sub} study guide (PDF)`,
        description: 'A short guide to read before the lessons.',
        file: true,
      },
      {
        kind: 'link',
        title: 'Practice and revision site',
        description: 'Free exercises to practise at home.',
        url: 'https://www.khanacademy.org/',
      },
      {
        kind: 'video',
        title: `${spec.sub} introduction video`,
        description: 'A short introduction to the topic.',
        url: 'https://www.youtube.com/results?search_query=' + encodeURIComponent(`${spec.sub} for kids`),
      },
    ]) {
      if (haveM.some((x) => x.title === m.title)) continue;
      const { file, ...body } = m;
      const id = (await call('POST', `${base}/materials`, { ...body, published: true })).id;
      if (file) {
        const pdf = Buffer.from(
          `%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 300 144]/Contents 4 0 R/Resources<</Font<</F1 5 0 R>>>>>>endobj\n4 0 obj<</Length 60>>stream\nBT /F1 14 Tf 20 80 Td (${spec.sub} study guide) Tj ET\nendstream endobj\n5 0 obj<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>endobj\ntrailer<</Root 1 0 R/Size 6>>\n%%EOF\n`,
        );
        const res = await fetch(
          `${API}${base}/materials/${id}/file?name=${encodeURIComponent('study-guide.pdf')}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/octet-stream', Authorization: `Bearer ${token}` },
            body: pdf,
          },
        );
        if (!res.ok)
          console.log(`  LMS material file: ${(await res.json().catch(() => ({}))).error ?? res.status}`);
      }
    }

    // Topic parts: each lesson gets ordered parts to read in turn; the first lesson of a course also has a video link and a worksheet file.
    for (const [li, lesson] of (await call('GET', `${base}/lessons`)).entries()) {
      const pBase = `${base}/lessons/${lesson.id}/parts`;
      const have = await call('GET', pBase);
      const add = async (part) => {
        if (have.some((x) => x.title === part.title)) return null;
        return (await call('POST', pBase, { published: true, ...part })).id;
      };
      await add({
        kind: 'text',
        sequence: 1,
        title: `Read: ${lesson.title}`,
        content: `${lesson.content ?? ''}\n\nTake your time, then move on to the next part.`.trim(),
      });
      if (li === 0)
        await add({
          kind: 'video',
          sequence: 2,
          title: `Watch: ${lesson.title}`,
          url:
            'https://www.youtube.com/results?search_query=' +
            encodeURIComponent(`${spec.sub} ${lesson.title} for kids`),
        });
      const fileId =
        li === 0
          ? await add({
              kind: 'file',
              sequence: 3,
              title: 'Worksheet (PDF)',
              content: 'Print or read this worksheet, then try the practice questions.',
            })
          : null;
      if (fileId) {
        const pdf = Buffer.from(
          `%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 300 144]/Contents 4 0 R/Resources<</Font<</F1 5 0 R>>>>>>endobj\n4 0 obj<</Length 60>>stream\nBT /F1 14 Tf 20 80 Td (${lesson.title.replace(/[()\\]/g, '')} worksheet) Tj ET\nendstream endobj\n5 0 obj<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>endobj\ntrailer<</Root 1 0 R/Size 6>>\n%%EOF\n`,
        );
        const res = await fetch(`${API}${pBase}/${fileId}/file?name=${encodeURIComponent('worksheet.pdf')}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/octet-stream', Authorization: `Bearer ${token}` },
          body: pdf,
        });
        if (!res.ok)
          console.log(`  LMS part file: ${(await res.json().catch(() => ({}))).error ?? res.status}`);
      }
      if (li > 0)
        await add({ kind: 'link', sequence: 2, title: 'Practice more', url: 'https://www.khanacademy.org/' });
    }
  }

  // Student activity in the Grade 5-A maths course: the first two pupils read, complete, submit and take quizzes at different paces.
  const grade5 = find('Grade 5-A');
  const mathId = out['Demo · Fractions and decimals'];
  if (!grade5 || !mathId) return;
  const accounts = await call('GET', '/student-accounts');
  // only pupils whose login is ours (or who have none yet); other logins have passwords this script cannot know
  const pupils = (await call('GET', '/students'))
    .filter(
      (s) =>
        s.classId === grade5.id &&
        s.status === 'active' &&
        !accounts.some((a) => a.studentId === s.id && !a.email.endsWith('@demo.student')),
    )
    .slice(0, 2);
  const lessonRows = await call('GET', `/lms/courses/${mathId}/lessons`);
  const assignmentRows = await call('GET', `/lms/courses/${mathId}/assignments`);
  const quizRows = await call('GET', `/lms/courses/${mathId}/quizzes`);
  const answerFor = (q, good) =>
    q.type === 'multiple_choice'
      ? good
        ? q.correctIndexes
        : [q.correctIndexes[0]]
      : q.type === 'short_answer'
        ? good
          ? 'Line up the decimal points, then add 0.30 and 0.45 to get 0.75.'
          : 'Add the numbers.'
        : q.type === 'true_false'
          ? good
            ? q.correctIndex
            : 1 - q.correctIndex
          : good
            ? q.correctIndex
            : (q.correctIndex + 1) % q.choices.length;
  for (const [i, pupil] of pupils.entries()) {
    const session = await studentSession(pupil, accounts);
    if (!session) {
      console.log(`  LMS: could not sign in as ${pupil.firstName} ${pupil.lastName}; skipped their activity`);
      continue;
    }
    const good = i === 0;
    for (const lesson of lessonRows.slice(0, good ? lessonRows.length : 2)) {
      await session('POST', `/lms/lessons/${lesson.id}/view`, {});
      if (good || lesson === lessonRows[0]) await session('POST', `/lms/lessons/${lesson.id}/complete`, {});
    }
    const first = assignmentRows.find((a) => a.published);
    const second = assignmentRows.filter((a) => a.published)[1];
    if (first)
      await session('POST', `/lms/assignments/${first.id}/submit`, {
        response: good
          ? '2/5 + 1/5 = 3/5. 6/8 simplifies to 3/4 by dividing top and bottom by 2.'
          : '3/5 and 6/8.',
      }).catch(() => {});
    if (good && second)
      await session('POST', `/lms/assignments/${second.id}/submit`, {
        response: 'Problem 1: 1.5 + 2.25 = 3.75. Problem 2: 4.0 - 1.35 = 2.65.',
        resourceUrl: 'https://example.com/my-decimal-working',
      }).catch(() => {});
    const mine = await session('GET', '/lms');
    const course = mine.find((c) => c.id === mathId);
    for (const q of quizRows.filter((x) => x.published)) {
      const done = course?.quizzes.find((x) => x.id === q.id)?.attemptCount ?? 0;
      if (done) continue;
      const answers = Object.fromEntries(
        q.questions.map((question) => [question.id, answerFor(question, good)]),
      );
      await session('POST', `/lms/quizzes/${q.id}/attempts`, { answers }).catch((e) =>
        console.log(`  LMS quiz: ${e.message}`),
      );
    }
  }

  // Teacher grading: grade the first pupil's submission and review their written quiz answer.
  if (pupils[0] && assignmentRows[0]) {
    const subs = await call('GET', `/lms/courses/${mathId}/assignments/${assignmentRows[0].id}/submissions`);
    const row = subs.rows.find((r) => r.studentId === pupils[0].id);
    if (row?.submittedAt && !row.gradedAt)
      await call(
        'PUT',
        `/lms/courses/${mathId}/assignments/${assignmentRows[0].id}/submissions/${pupils[0].id}`,
        {
          score: 9,
          feedback:
            'Correct steps and clear simplification. Remember to write the final answer on its own line.',
        },
      );
  }
  const unit = quizRows.find((q) => q.title.startsWith('Unit test'));
  if (unit)
    for (const attempt of await call('GET', `/lms/courses/${mathId}/quizzes/${unit.id}/attempts`)) {
      if (attempt.reviewStatus !== 'pending_review') continue;
      const good = attempt.studentId === pupils[0]?.id;
      await call('PUT', `/lms/courses/${mathId}/quizzes/${unit.id}/attempts/${attempt.id}/review`, {
        questionScores: { ut4: good ? 4 : 1 },
        feedback: good ? 'Excellent explanation.' : 'Show the steps: line up the decimal points first.',
      });
    }
  console.log(`LMS demo: ${Object.keys(out).length} courses with student activity.`);
}

async function seedOperations() {
  const students = (await call('GET', '/students')).filter((x) => x.status === 'active');
  const named = (first) => students.find((x) => x.firstName === first);

  // hostel: a boys' and a girls' hostel, rooms, and a few boarders
  const hostels = await call('GET', '/hostel/hostels');
  const hostel = {};
  for (const [name, type, warden, phone] of [
    ['Sunrise Boys Hostel', 'boys', 'Mr Anil Kulkarni', '+91 98220 11100'],
    ['Lotus Girls Hostel', 'girls', 'Mrs Rekha Menon', '+91 98220 22200'],
  ]) {
    const found = hostels.find((h) => h.name === name);
    hostel[type] =
      found?.id ??
      (
        await call('POST', '/hostel/hostels', {
          name,
          type,
          wardenName: warden,
          wardenPhone: phone,
          address: 'Campus, Block ' + (type === 'boys' ? 'A' : 'B'),
        })
      ).id;
    if (!found) track('hostels', hostel[type]);
  }
  const rooms = await call('GET', '/hostel/rooms');
  const room = {};
  for (const [type, no, beds, fee] of [
    ['boys', 'A-101', 3, 4500],
    ['boys', 'A-102', 2, 4500],
    ['girls', 'B-101', 3, 4500],
    ['girls', 'B-102', 2, 5000],
  ]) {
    const found = rooms.find((r) => r.hostelId === hostel[type] && r.roomNo === no);
    room[no] =
      found?.id ??
      (
        await call('POST', '/hostel/rooms', {
          hostelId: hostel[type],
          roomNo: no,
          capacity: beds,
          monthlyFee: fee,
        })
      ).id;
    if (!found) track('hostelRooms', room[no]);
  }
  const boarded = new Set((await call('GET', '/hostel/allocations')).map((a) => a.studentId));
  for (const [first, no, meal] of [
    ['Aarav', 'A-101', 'veg'],
    ['Kabir', 'A-101', 'veg'],
    ['Reyansh', 'A-102', 'non_veg'],
    ['Sara', 'B-101', 'veg'],
    ['Anaya', 'B-101', 'jain'],
    ['Diya', 'B-102', 'veg'],
  ]) {
    const st = named(first);
    if (!st || boarded.has(st.id)) continue;
    try {
      await call('POST', '/hostel/allocations', {
        studentId: st.id,
        roomId: room[no],
        startDate: day(-40),
        bedNo: String(Math.floor(Math.random() * 3) + 1),
        mealPlan: meal,
        localGuardianName: 'Uncle ' + st.lastName,
        localGuardianPhone: '+91 98765 00' + String(st.id).slice(-3).padStart(3, '0'),
        localGuardianRelation: 'Uncle',
        securityDeposit: 5000,
        consentReceived: true,
      });
      track('hostelAllocations', st.id);
    } catch (err) {
      console.log(`  hostel: skipped ${first} (${err.message})`);
    }
  }

  // transport: two vehicles, routes with stops, drivers, and students on the routes
  const vehicles = await call('GET', '/transport/vehicles');
  const bus = {};
  for (const [regNo, model, seats] of [
    ['MH12 AB 1001', 'Tata Starbus 40-seater', 40],
    ['MH12 CD 2002', 'Force Traveller 20-seater', 20],
  ]) {
    const found = vehicles.find((v) => v.regNo === regNo);
    bus[regNo] =
      found?.id ??
      (
        await call('POST', '/transport/vehicles', {
          regNo,
          model,
          capacity: seats,
          insuranceExpiry: day(200),
          status: 'active',
        })
      ).id;
    if (!found) track('vehicles', bus[regNo]);
  }
  const people = await call('GET', '/transport/staff');
  for (const [name, role, phone, lic, v] of [
    ['Ramesh Patil', 'driver', '+91 98900 33301', 'MH1220240001', 'MH12 AB 1001'],
    ['Sunil Jadhav', 'attendant', '+91 98900 33302', '', 'MH12 AB 1001'],
    ['Dinesh More', 'driver', '+91 98900 33303', 'MH1220240002', 'MH12 CD 2002'],
  ]) {
    if (people.find((p) => p.name === name)) continue;
    track(
      'transportStaff',
      (
        await call('POST', '/transport/staff', {
          name,
          role,
          phone,
          licenseNo: lic || undefined,
          licenseExpiry: lic ? day(400) : undefined,
          vehicleId: bus[v],
        })
      ).id,
    );
  }
  const routes = await call('GET', '/transport/routes');
  const route = {};
  for (const [name, v, fee] of [
    ['Kothrud – School', 'MH12 AB 1001', 1800],
    ['Baner – School', 'MH12 CD 2002', 2200],
  ]) {
    const found = routes.find((r) => r.name === name);
    route[name] =
      found?.id ?? (await call('POST', '/transport/routes', { name, vehicleId: bus[v], monthlyFee: fee })).id;
    if (!found) track('transportRoutes', route[name]);
  }
  const stopsNow = await call('GET', '/transport/stops');
  const stop = {};
  const layout = {
    'Kothrud – School': [
      ['Karve Road Chowk', '07:10'],
      ['Paud Road', '07:25'],
      ['Kothrud Depot', '07:40'],
    ],
    'Baner – School': [
      ['Baner Gaon', '07:05'],
      ['Balewadi Phata', '07:20'],
      ['Aundh Circle', '07:35'],
    ],
  };
  for (const [rname, list] of Object.entries(layout)) {
    for (const [i, [name, time]] of list.entries()) {
      const found = stopsNow.find((x) => x.routeId === route[rname] && x.name === name);
      stop[name] =
        found?.id ??
        (
          await call('POST', '/transport/stops', {
            routeId: route[rname],
            name,
            sequence: i + 1,
            pickupTime: time,
          })
        ).id;
      if (!found) track('transportStops', stop[name]);
    }
  }
  const riding = new Set((await call('GET', '/transport/assignments')).map((a) => a.studentId));
  for (const [first, rname, stopName] of [
    ['Aarav', 'Kothrud – School', 'Paud Road'],
    ['Ishaan', 'Kothrud – School', 'Karve Road Chowk'],
    ['Myra', 'Baner – School', 'Baner Gaon'],
    ['Zoya', 'Baner – School', 'Aundh Circle'],
    ['Vivaan', 'Kothrud – School', 'Kothrud Depot'],
  ]) {
    const st = named(first);
    if (!st || riding.has(st.id)) continue;
    try {
      await call('POST', '/transport/assignments', {
        studentId: st.id,
        routeId: route[rname],
        stopId: stop[stopName],
        startDate: day(-30),
        tripType: 'both',
      });
      track('transportAssignments', st.id);
    } catch (err) {
      console.log(`  transport: skipped ${first} (${err.message})`);
    }
  }

  // inventory: categories, a supplier, items with opening stock and one issue
  const cats = await call('GET', '/inventory/categories');
  const cat = {};
  for (const name of ['Stationery', 'Lab equipment', 'Sports goods']) {
    const found = cats.find((c) => c.name === name);
    cat[name] = found?.id ?? (await call('POST', '/inventory/categories', { name })).id;
    if (!found) track('inventoryCategories', cat[name]);
  }
  const sups = await call('GET', '/inventory/suppliers');
  let supplier = sups.find((x) => x.name === 'Shree Office Supplies')?.id;
  if (!supplier) {
    supplier = (
      await call('POST', '/inventory/suppliers', {
        name: 'Shree Office Supplies',
        contactPerson: 'Mahesh Shah',
        phone: '+91 98220 77700',
        email: 'orders@shree.example',
        address: 'Laxmi Road, Pune',
      })
    ).id;
    track('suppliers', supplier);
  }
  const items = await call('GET', '/inventory/items');
  for (const [name, c, unit, reorder, qty, cost] of [
    ['A4 paper ream', 'Stationery', 'ream', 20, 60, 280],
    ['Whiteboard markers', 'Stationery', 'box', 10, 8, 150],
    ['Microscope slides', 'Lab equipment', 'box', 5, 12, 220],
    ['Footballs', 'Sports goods', 'pcs', 4, 10, 650],
  ]) {
    if (items.find((i) => i.name === name)) continue;
    const id = (
      await call('POST', '/inventory/items', { name, categoryId: cat[c], unit, reorderLevel: reorder })
    ).id;
    track('inventoryItems', id);
    await call('POST', '/inventory/movements', {
      itemId: id,
      type: 'in',
      quantity: qty,
      unitCost: cost,
      supplierId: supplier,
      date: day(-20),
      note: 'Opening stock',
    });
    if (name === 'A4 paper ream')
      await call('POST', '/inventory/movements', {
        itemId: id,
        type: 'out',
        quantity: 12,
        party: 'Admissions office',
        date: day(-3),
        note: 'Admission forms',
      });
  }
  // activities, a fee group, and one application that asks for electives, an activity, the bus, a hostel bed and the fee group
  const acts = await call('GET', '/activities');
  const activity = {};
  for (const [title, kind, cls5, start, end, cap, fee] of [
    ['Annual Sports Day', 'sport', false, 45, 45, null, 0],
    ['Science Club', 'club', true, 10, 120, 25, 300],
    ['Art Club', 'club', false, 10, 120, 30, 200],
  ]) {
    const found = acts.find((a) => a.title === title);
    const classId = cls5
      ? (await call('GET', '/classes')).find((c) => c.name === 'Grade 5' && c.section === 'A')?.id
      : undefined;
    activity[title] =
      found?.id ??
      (
        await call('POST', '/activities', {
          kind,
          title,
          startDate: day(start),
          endDate: day(end),
          classId,
          capacity: cap ?? undefined,
          fee,
          status: 'open',
          organizer: 'Activities office',
        })
      ).id;
    if (!found) track('activities', activity[title]);
  }
  for (const [first, title] of [
    ['Aarav', 'Science Club'],
    ['Kabir', 'Art Club'],
    ['Myra', 'Art Club'],
    ['Sara', 'Science Club'],
  ]) {
    const st = named(first);
    if (st)
      await call('POST', `/activities/${activity[title]}/participants`, { studentIds: [st.id] }).catch(
        () => {},
      );
  }
  const groups = await call('GET', '/fee-groups');
  let pack = groups.find((g) => g.name === 'Uniform and books pack')?.id;
  if (!pack) {
    pack = (
      await call('POST', '/fee-groups', { name: 'Uniform and books pack', description: 'For new students' })
    ).id;
    track('feeGroups', pack);
    await call('POST', `/fee-groups/${pack}/items`, { title: 'Uniform set', amount: 2400 });
    await call('POST', `/fee-groups/${pack}/items`, { title: 'Books and stationery', amount: 3200 });
  }
  const knownApplicants = new Set((await call('GET', '/admissions')).map((a) => a.applicantName));
  if (!knownApplicants.has('Zara Hussain')) {
    const g5 = (await call('GET', '/classes')).find((c) => c.name === 'Grade 5' && c.section === 'A');
    const elect = (await call('GET', `/class-subjects/electives?classId=${g5.id}`)).groups[0]?.subjects.find(
      (x) => x.name === 'French',
    );
    const id = (
      await call('POST', '/admissions/enquiries', {
        firstName: 'Zara',
        lastName: 'Hussain',
        classId: g5.id,
        academicYear: (await call('GET', '/academic-years')).find((y) => y.isCurrent)?.name,
        guardianName: 'Imran Hussain',
        guardianPhone: '+91 98111 90909',
        source: 'referral',
      })
    ).id;
    track('enquiries', id);
    await call('PUT', `/admissions/applications/${id}`, {
      choices: {
        electiveIds: elect ? [elect.classSubjectId] : [],
        activityIds: [activity['Science Club']],
        transportRouteId: route['Baner – School'],
        transportStopId: stop['Baner Gaon'],
        needsHostel: true,
        feeGroupId: pack,
      },
    });
    // the application form must be submitted (with a date of birth and consent) before the enquiry can move on
    for (const title of ['Address proof', 'Birth certificate'])
      await upload(
        `/admissions/applications/${id}/documents?name=${encodeURIComponent(title)}.png&title=${encodeURIComponent(title)}`,
      );
    await call('POST', `/admissions/applications/${id}/submit`, { dob: day(-365 * 5), consent: true });
    await call('POST', `/admissions/${id}/status`, { status: 'approved' });
  }
  console.log(
    'Operations added: hostels with rooms and boarders, transport routes with stops, drivers and riders, inventory items with stock.',
  );
}

// Phase 4: library, mess menu, today's hostel and bus attendance, visitors and notices
async function seedCampusLife() {
  const students = (await call('GET', '/students')).filter((x) => x.status === 'active');
  const hostels = await call('GET', '/hostel/hostels');
  const boys = hostels.find((h) => h.name === 'Sunrise Boys Hostel');
  const today = day(0);

  // library: categories, books, members and two loans (one already returned)
  const cats = await call('GET', '/library/categories');
  const cat = {};
  for (const name of ['Fiction', 'Science', 'Reference']) {
    cat[name] =
      cats.find((c) => c.name === name)?.id ?? (await call('POST', '/library/categories', { name })).id;
    if (!cats.find((c) => c.name === name)) track('libraryCategories', cat[name]);
  }
  const books = await call('GET', '/library/books');
  const book = {};
  for (const [title, author, category, copies] of [
    ['The Jungle Book', 'Rudyard Kipling', 'Fiction', 3],
    ['Wings of Fire', 'A. P. J. Abdul Kalam', 'Fiction', 2],
    ['A Brief History of Time', 'Stephen Hawking', 'Science', 2],
    ['Oxford Student Atlas', 'Oxford Press', 'Reference', 4],
  ]) {
    const found = books.find((b) => b.title === title);
    book[title] =
      found?.id ??
      (await call('POST', '/library/books', { title, author, categoryId: cat[category], copies, isbn: '' }))
        .id;
    if (!found) track('libraryBooks', book[title]);
  }
  const members = await call('GET', '/library/memberships');
  for (const st of students.slice(0, 4)) {
    if (members.some((m) => m.studentId === st.id)) continue;
    try {
      track('libraryMemberships', (await call('POST', '/library/memberships', { studentId: st.id })).id);
    } catch (err) {
      console.log('  library: ' + err.message);
    }
  }
  if (!(await call('GET', '/library/issues')).length && students[0] && students[1]) {
    try {
      await call('POST', '/library/issues', {
        bookId: book['The Jungle Book'],
        studentId: students[0].id,
        days: 14,
      });
      const back = await call('POST', '/library/issues', {
        bookId: book['Wings of Fire'],
        studentId: students[1].id,
        days: 14,
      });
      await call('POST', `/library/issues/${back.id}/return`);
    } catch (err) {
      console.log('  library loans: ' + err.message);
    }
  }

  // mess menu for the boys' hostel
  if (boys && !(await call('GET', `/hostel/meals?hostelId=${boys.id}`)).length) {
    const menu = {
      breakfast: 'Poha, tea and fruit',
      lunch: 'Dal, rice, roti and sabzi',
      snacks: 'Biscuits and milk',
      dinner: 'Paneer curry, chapati and rice',
    };
    for (const d of ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'])
      for (const [meal, items] of Object.entries(menu))
        await call('POST', '/hostel/meals', { hostelId: boys.id, day: d, meal, items });
  }

  // today's hostel roll call and the first bus route's morning trip
  try {
    const roster = boys ? await call('GET', `/hostel/attendance?hostelId=${boys.id}&date=${today}`) : [];
    if (roster.length && roster.every((r) => !r.status))
      await call('POST', '/hostel/attendance', {
        date: today,
        records: roster.map((r, i) => ({
          studentId: r.studentId,
          status: i === 0 && roster.length > 1 ? 'leave' : 'present',
        })),
      });
    const route = (await call('GET', '/transport/routes'))[0];
    const riders = route
      ? await call('GET', `/transport/attendance?routeId=${route.id}&date=${today}&trip=morning`)
      : [];
    if (riders.length && riders.every((r) => !r.status))
      await call('POST', '/transport/attendance', {
        date: today,
        trip: 'morning',
        records: riders.map((r, i) => ({
          studentId: r.studentId,
          status: i === riders.length - 1 && riders.length > 1 ? 'absent' : 'boarded',
        })),
      });
  } catch (err) {
    console.log('  attendance: ' + err.message);
  }

  // a visitor inside the hostel and two notices
  try {
    const boarder = (await call('GET', '/hostel/allocations'))[0];
    if (boarder && !(await call('GET', '/hostel/visitors')).length)
      await call('POST', '/hostel/visitors', {
        studentId: boarder.studentId,
        visitorName: 'Suresh Patil',
        relation: 'Uncle',
        phone: '+91 98900 12345',
        purpose: 'Bringing books',
      });
  } catch (err) {
    console.log('  visitors: ' + err.message);
  }
  const notices = await call('GET', '/notices');
  for (const [title, body, audience] of [
    [
      'Annual Day rehearsals',
      'Rehearsals begin next Monday after school. Participants carry their costumes.',
      'all',
    ],
    ['Fee reminder', 'The second instalment is due at the end of the month.', 'parents'],
  ]) {
    if (notices.some((n) => n.title === title)) continue;
    try {
      track('notices', (await call('POST', '/notices', { title, body, audience })).id);
    } catch (err) {
      console.log('  notices: ' + err.message);
    }
  }
  console.log(
    'Campus life added: library books, members and loans, the hostel mess menu, hostel and bus attendance for today, a visitor and notices.',
  );
}

await login();
if (process.argv.includes('--remove')) await remove();
else {
  await seed();
  await seedAcademics();
  await seedOperations();
  await seedCampusLife();
}
