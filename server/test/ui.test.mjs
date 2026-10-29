// Browser tests: the main journeys driven through the real screens, with the API used only to set up and to check the result.
//   npm run test:ui --prefix server        (the API on :4000 and the client on :5173 must be running)
// Needs Chrome: set CHROME_PATH if it is not in the usual place. The tests skip themselves when no browser is found.
import { after, before, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const API = process.env.API || 'http://localhost:4000/api';
const WEB = process.env.WEB || 'http://localhost:5173';
const CHROME = [
  process.env.CHROME_PATH,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
].find((p) => p && fs.existsSync(p));
const RUN = Date.now().toString(36).slice(-6);
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
);

let puppeteer;
let browser;
let page;
let token;
const cleanups = [];
const png = path.join(os.tmpdir(), `ui-test-${RUN}.png`);

const api = async (p, { method = 'GET', body } = {}) => {
  const res = await fetch(API + p, {
    method,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
};
const make = async (p, body, drop) => {
  const r = await api(p, { method: 'POST', body });
  assert.equal(r.status, 201, `create ${p}: ${JSON.stringify(r.data)}`);
  cleanups.unshift(() => api(drop ? drop(r.data.id) : `${p}/${r.data.id}`, { method: 'DELETE' }));
  return r.data;
};
const dropEnquiry = (id) => async () => {
  await api(`/admissions/${id}`, { method: 'DELETE' });
  await api(`/admissions/${id}?permanent=1`, { method: 'DELETE' });
};

const wait = (ms = 600) => new Promise((r) => setTimeout(r, ms));
const go = async (url) => {
  await page.goto(`${WEB}${url}`, { waitUntil: 'networkidle0' });
  await wait(500);
};
const text = () => page.evaluate(() => document.body.innerText);
/** The labelled control inside the open form or popup whose label starts with `label` (labels are shown in capitals, so compare lower case). */
const control = (label, root = '.modal, form') =>
  page.evaluateHandle(
    (l, r) => {
      const hit = [
        ...document.querySelectorAll(
          `${r
            .split(',')
            .map((s) => `${s.trim()} label`)
            .join(', ')}`,
        ),
      ].find((e) => e.innerText.toLowerCase().startsWith(l.toLowerCase()));
      return hit?.querySelector('input:not([type=checkbox]), select, textarea') ?? null;
    },
    label,
    root,
  );
const fill = async (label, value) => {
  const el = (await control(label)).asElement();
  assert.ok(el, `no field "${label}"`);
  await page.evaluate(
    (e, v) => {
      const proto =
        e.tagName === 'SELECT'
          ? HTMLSelectElement
          : e.tagName === 'TEXTAREA'
            ? HTMLTextAreaElement
            : HTMLInputElement;
      Object.getOwnPropertyDescriptor(proto.prototype, 'value').set.call(e, v);
      e.dispatchEvent(new Event(e.tagName === 'SELECT' ? 'change' : 'input', { bubbles: true }));
    },
    el,
    String(value),
  );
};
const click = async (label, scope = 'button, a') => {
  const ok = await page.evaluate(
    (l, s) => {
      const b = [...document.querySelectorAll(s)].find((x) => x.innerText.trim().includes(l) && !x.disabled);
      if (b) b.click();
      return Boolean(b);
    },
    label,
    scope,
  );
  assert.ok(ok, `no enabled button "${label}"`);
};

describe('browser journeys', { skip: !CHROME && 'Chrome was not found (set CHROME_PATH)' }, () => {
  before(async () => {
    fs.writeFileSync(png, PNG);
    ({ default: puppeteer } = await import('puppeteer-core'));
    browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new' });
    page = await browser.newPage();
    page.on('dialog', (d) => d.accept('test reason'));
    await page.setViewport({ width: 1300, height: 1000 });
    const res = await fetch(`${API}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@school.local', password: 'admin123' }),
    });
    token = (await res.json()).token;
    assert.ok(token, 'could not sign in as the admin');
    await page.goto(`${WEB}/login`, { waitUntil: 'networkidle0' });
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle0' }),
      page.click('button[type=submit]'),
    ]);
  });

  after(async () => {
    for (const drop of cleanups) {
      try {
        await drop();
      } catch {
        /* best effort */
      }
    }
    await browser?.close();
    fs.rmSync(png, { force: true });
  });

  test('signing in lands on the school overview', async () => {
    await go('/');
    const t = await text();
    for (const word of ['Total students', 'Present today', 'Fee collection', 'New enquiries'])
      assert.ok(t.includes(word), `the dashboard shows "${word}"`);
  });

  test('a new enquiry typed into the popup shows up in the list', async () => {
    const cls = await make('/classes', { name: `UiE${RUN}`.slice(0, 12), section: 'A' });
    const year = (await api('/academic-years')).data;
    await go('/admissions?new=1');
    await fill('student first name', 'Uienq');
    await fill('student last name', RUN);
    await fill('grade applying', cls.id);
    if (year.length) await fill('academic year', year.find((y) => y.isCurrent)?.name ?? year[0].name);
    await fill('parent / guardian name', 'Pat Ui');
    await fill('phone number', '+91 98765 43210');
    await fill('enquiry source', 'phone');
    await click('Save enquiry');
    await wait(1500);
    assert.ok((await text()).includes('Enquiry added'));
    const row = (await api(`/admissions/enquiries?q=${RUN}`)).data.rows[0];
    assert.equal(row?.applicantName, `Uienq ${RUN}`);
    cleanups.unshift(dropEnquiry(row.id));
    await go(`/admissions`);
    await page.type('.search-field input', RUN);
    await wait(800);
    assert.ok((await text()).includes(`Uienq ${RUN}`), 'the list shows it');
  });

  test('a student application is saved as a draft, gets its required documents, and is submitted', async () => {
    const cls = await make('/classes', { name: `UiA${RUN}`.slice(0, 12), section: 'A' });
    const year = (await api('/academic-years')).data;
    await go('/applications/new');
    await fill('first name', 'Uiapp');
    await fill('last name', RUN);
    await fill('date of birth', '2019-03-04');
    await fill('grade applying', cls.id);
    if (year.length) await fill('academic year', year.find((y) => y.isCurrent)?.name ?? year[0].name);
    await click('Continue to guardians');
    await wait(1500);
    assert.match(page.url(), /\/applications\/\d+$/, 'the draft has its own address after the first save');
    const id = Number(page.url().split('/').pop());
    cleanups.unshift(dropEnquiry(id));
    await fill('primary guardian', 'Gita Ui');
    await fill('relationship', 'Mother');
    await fill('phone number', '+91 98765 43210');
    await fill('residential address', '12 Lake Road, Pune');
    // a brother already studying here is added in the sibling table
    await click('+ Add a sibling');
    await page.evaluate((v) => {
      const set = (label, value) => {
        const e = document.querySelector(`[aria-label="${label}"]`);
        Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(e, value);
        e.dispatchEvent(new Event('input', { bubbles: true }));
      };
      set('Sibling name', v);
      set('Sibling class', 'Grade 5');
    }, `Elder ${RUN}`);
    await click('Continue to schooling');
    await wait(1000);
    // every required document must be uploaded before the application can be submitted
    for (let i = 0; i < 20; i += 1) {
      const left = await page.evaluate(
        () =>
          [...document.querySelectorAll('.slot-list li.needed button')].filter(
            (x) => x.innerText === 'Upload',
          ).length,
      );
      if (!left) break;
      // start listening for the file dialog before the click that opens it
      const [chooser] = await Promise.all([
        page.waitForFileChooser(),
        page.evaluate(() =>
          [...document.querySelectorAll('.slot-list li.needed button')]
            .find((x) => x.innerText === 'Upload')
            .click(),
        ),
      ]);
      await chooser.accept([png]);
      await wait(1200);
    }
    assert.equal(
      await page.evaluate(() => document.querySelectorAll('.slot-list li.needed').length),
      0,
      'nothing required is left',
    );
    await click('Continue to review');
    await wait(800);
    assert.equal(
      await page.evaluate(
        () =>
          [...document.querySelectorAll('button')].find((b) => b.innerText.includes('Submit application'))
            ?.disabled,
      ),
      true,
      'consent is needed first',
    );
    await page.evaluate(() => document.querySelector('.consent input').click());
    await click('Submit application');
    await wait(1800);
    assert.match(page.url(), /\/applications$/);
    const row = (await api(`/admissions/applications?q=${RUN}`)).data.rows.find((r) => r.id === id);
    assert.equal(row?.stage, 'review', 'the application is under review');
    const saved = (await api(`/admissions/applications/${id}`)).data;
    assert.equal(
      saved.siblings?.[0]?.name,
      `Elder ${RUN}`,
      'the sibling typed on the form is kept with the application',
    );
  });

  test('an offered applicant is enrolled from the list, and becomes a student with the siblings kept', async () => {
    const cls = await make('/classes', { name: `UiN${RUN}`.slice(0, 12), section: 'A' });
    const enq = await make(
      '/admissions',
      { applicantName: `Enrol ${RUN}`, guardianName: 'Pat', classId: cls.id },
      (id) => `/admissions/${id}?permanent=1`,
    );
    cleanups.unshift(dropEnquiry(enq.id));
    assert.equal(
      (
        await api(`/admissions/applications/${enq.id}`, {
          method: 'PUT',
          body: { siblings: [{ type: 'Sibling', name: `Sib ${RUN}`, className: 'Grade 2' }] },
        })
      ).status,
      200,
    );
    // a submitted application with an offer is what the list enrols; that state is set directly rather than repeating the whole form
    await import('../src/config/env.js');
    const { Admission } = await import('../src/models/index.js');
    await Admission.update(
      { status: 'approved', offerExpiry: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10) },
      { where: { id: enq.id } },
    );
    await go(`/admissions?q=Enrol%20${RUN}`);
    // enrolling asks to be confirmed: the first click arms the button, the second one enrols
    const enrol = () =>
      page.evaluate((name) => {
        const row = [...document.querySelectorAll('tbody tr')].find((r) => r.innerText.includes(name));
        [...row.querySelectorAll('button')].find((b) => b.innerText.trim() === 'Enroll').click();
      }, `Enrol ${RUN}`);
    await enrol();
    await wait(300);
    await enrol();
    await page
      .waitForFunction(
        () => /Enrolled as ADM-/.test(document.querySelector('.success, .error')?.innerText ?? ''),
        { timeout: 15000 },
      )
      .catch(() => {});
    assert.match(
      await page.evaluate(
        () => document.querySelector('.success, .error')?.innerText ?? '(no message shown)',
      ),
      /Enrolled as ADM-/,
    );
    const row = (await api(`/admissions/applications?q=Enrol%20${RUN}`)).data.rows[0];
    assert.equal(row.stage, 'enrolled');
    const a = (await api(`/admissions/applications/${enq.id}`)).data;
    cleanups.unshift(() => api(`/students/${a.studentId}`, { method: 'DELETE' }));
    const student = (await api(`/students/${a.studentId}`)).data;
    assert.equal(student.siblings?.[0]?.name, `Sib ${RUN}`, 'the sibling details reached the student');
  });

  test('attendance marked in the sheet is saved with its arrival time and note', async () => {
    const cls = await make('/classes', { name: `UiT${RUN}`.slice(0, 12), section: 'A' });
    const kid = await make('/students', { firstName: 'Uiatt', lastName: RUN, classId: cls.id });
    await go('/attendance');
    await page.select('select[aria-label=Class]', String(cls.id));
    await wait(900);
    await page.evaluate(() => {
      const sel = document.querySelector('tbody tr select');
      Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value').set.call(sel, 'late');
      sel.dispatchEvent(new Event('change', { bubbles: true }));
    });
    await page.evaluate(() => {
      const t = document.querySelector('tbody tr input[type=time]');
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(t, '08:34');
      t.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await page.type('tbody tr input[placeholder="Add note"]', 'Bus delay');
    await click('Save attendance');
    await wait(400);
    await click('Confirm & save');
    await wait(1500);
    assert.ok((await text()).includes('Attendance saved'));
    const date = new Date().toISOString().slice(0, 10);
    const mine = (await api(`/attendance?date=${date}&classId=${cls.id}`)).data.find(
      (r) => r.studentId === kid.id,
    );
    assert.deepEqual([mine.status, mine.arrivalTime, mine.note], ['late', '08:34', 'Bus delay']);
  });

  test('marks typed into the sheet are saved and appear in the results', async () => {
    const cls = await make('/classes', { name: `UiM${RUN}`.slice(0, 12), section: 'A' });
    const sub = await make('/subjects', { name: `UiSub${RUN}`, code: `U${RUN}`.slice(0, 10) });
    await make('/class-subjects', { classId: cls.id, subjectId: sub.id });
    const kid = await make('/students', { firstName: 'Uimark', lastName: RUN, classId: cls.id });
    const exam = await make('/exams', { name: `UiExam ${RUN}`, classId: cls.id, maxMarks: 50 });
    await go(`/exams/${exam.id}/marks`);
    await page.type('input.mark', '41');
    await click('Save marks');
    await wait(1200);
    assert.ok((await text()).includes('Marks saved'));
    const results = (await api(`/exams/${exam.id}/results`)).data.rows;
    assert.equal(results.find((r) => r.studentId === kid.id)?.total, 41);
    await go(`/exams/${exam.id}/results`);
    assert.ok((await text()).includes(`Uimark ${RUN}`));
    // the report card shows the same student, subject and marks
    await go(`/exams/${exam.id}/report-card/${kid.id}`);
    await page
      .waitForFunction(() => document.body.innerText.includes('Percentage'), { timeout: 10000 })
      .catch(() => {});
    const card = await text();
    const subjectLine =
      card.split(String.fromCharCode(10)).find((l) => l.toLowerCase().includes(`uisub${RUN}`)) ?? '';
    assert.ok(
      card.includes(`Uimark ${RUN}`) && subjectLine.split(String.fromCharCode(9)).includes('41'),
      `the report card carries the student, the subject and the marks typed: ${JSON.stringify(subjectLine)}`,
    );
  });

  test('the mobile app menu is edited on the website: a tile is renamed and hidden, and the app menu follows', async () => {
    const items = (await api('/app-menu/admin?audience=staff')).data;
    const lib = items.find((i) => i.key === 'library');
    cleanups.unshift(() =>
      api(`/app-menu/${lib.id}`, { method: 'PUT', body: { label: lib.label, active: true } }),
    );
    await go('/app-menu');
    await page.waitForSelector('input[aria-label="Label for library"]', { timeout: 15000 });
    const input = await page.$('input[aria-label="Label for library"]');
    await input.evaluate((e) => e.select()); // replace what is there
    await input.type(`Reading ${RUN}`);
    await page.keyboard.press('Tab'); // leaving the box saves it
    await wait(1200);
    assert.equal(
      (await api('/app-menu/admin?audience=staff')).data.find((i) => i.key === 'library').label,
      `Reading ${RUN}`,
      'the new label is stored',
    );
    // hide it with its checkbox
    const hidden = await page.evaluate(() => {
      const row = [...document.querySelectorAll('tbody tr')].find(
        (r) => r.innerText.includes('library') && !r.innerText.includes('library.'),
      );
      const box = [...row.querySelectorAll('input[type=checkbox]')].pop();
      box.click();
      return Boolean(box);
    });
    assert.ok(hidden);
    await wait(1200);
    const appMenu = (await api('/app-menu')).data;
    assert.ok(
      !appMenu.some((i) => i.key === 'library' || i.parentKey === 'library'),
      'the app no longer gets the library or its pages',
    );
  });

  test('a class is chosen on the ID card page and each active student gets a card', async () => {
    const cls = await make('/classes', { name: `UiI${RUN}`.slice(0, 12), section: 'A' });
    await make('/students', { firstName: 'Uicard', lastName: RUN, classId: cls.id });
    await go('/id-cards');
    await page.select('select[aria-label="Class"]', String(cls.id));
    await wait(1500);
    const shown = await text();
    assert.ok(shown.includes(`Uicard ${RUN}`), 'the card shows the student');
    assert.match(shown, /Print 1 cards?/);
  });

  test('a fee is paid in the popup and the receipt is shown', async () => {
    const cls = await make('/classes', { name: `UiF${RUN}`.slice(0, 12), section: 'A' });
    const kid = await make('/students', { firstName: 'Uifee', lastName: RUN, classId: cls.id });
    const fee = await make('/fees', {
      studentId: kid.id,
      title: `UiFee ${RUN}`,
      amount: '1000',
      dueDate: '2031-01-01',
    });
    await go('/fees');
    await page.type('.search-field input', RUN);
    await wait(700);
    await click('Pay', 'tbody button');
    await wait(500);
    await fill('amount', '400');
    await click('Record payment');
    await wait(1500);
    assert.ok((await text()).includes('Receipt'), 'the receipt popup opens');
    const f = (await api(`/fees?studentId=${kid.id}`)).data.find((x) => x.id === fee.id);
    assert.equal(f.status, 'partial');
    assert.equal(Number(f.paidAmount), 400);
  });

  test('a subject added to the subject map as a practical elective is saved, and a student chooses it', async () => {
    const cls = await make('/classes', { name: `UiS${RUN}`.slice(0, 12), section: 'A' });
    const sub = await make('/subjects', { name: `UiLang${RUN}`, code: `UL${RUN}`.slice(0, 10) });
    const kid = await make('/students', { firstName: 'Uisub', lastName: RUN, classId: cls.id });
    await go('/class-subjects');
    await page.select('.head-actions select', String(cls.id));
    await wait(900);
    await click('Add a subject');
    await wait(500);
    await fill('subject', sub.id);
    await fill('taught as', 'practical');
    await fill('periods per week', '4');
    await page.evaluate(() => document.querySelector('.modal input[type=checkbox]').click());
    await wait(300);
    await fill('elective group', 'Second language');
    await click('Add subject', '.modal button');
    await wait(1500);
    assert.ok((await text()).includes('Subject added to the class'));
    const map = (await api(`/class-subjects/map?classId=${cls.id}`)).data.subjects[0];
    assert.deepEqual(
      [map.subjectId, map.component, map.isElective, map.electiveGroup, map.periodsPerWeek],
      [sub.id, 'practical', true, 'Second language', 4],
    );
    cleanups.unshift(() => api(`/class-subjects/${map.id}`, { method: 'DELETE' }));
    // the student picks it on the elective tab
    await click('Elective choices');
    await wait(500);
    await page.evaluate(() => {
      const sel = document.querySelector('tbody tr select');
      Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value').set.call(
        sel,
        sel.options[1].value,
      );
      sel.dispatchEvent(new Event('change', { bubbles: true }));
    });
    await wait(1200);
    const mine = (await api(`/students/${kid.id}/subjects`)).data;
    assert.deepEqual(
      mine.subjects.map((x) => x.id),
      [map.id],
      'the choice was saved',
    );
  });

  test('a staff member added in the popup is saved', async () => {
    await go('/staff?new=1');
    await fill('first name', 'Uistaff');
    await fill('last name', RUN);
    await page.evaluate(() => {
      const sel = [...document.querySelectorAll('select')].find((x) =>
        [...x.options].some((o) => o.value === 'teaching'),
      );
      sel.value = 'teaching';
      sel.dispatchEvent(new Event('change', { bubbles: true }));
    });
    await click('Register', 'button[type=submit], .form-actions button');
    await wait(1800);
    const found = (await api('/staff')).data.find((s) => s.lastName === RUN);
    assert.ok(found, 'the staff member exists');
    cleanups.unshift(() => api(`/staff/${found.id}`, { method: 'DELETE' }));
    assert.ok((await text()).includes('registered'));
  });
});
