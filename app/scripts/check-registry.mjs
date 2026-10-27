// Runs every screen in src/registry (staff and family modules) against the live API and reports what breaks: a path that
// errors, a row with an empty or odd title, a tile with no value. Run it after changing the registry or the API.
//   npm run check:registry        (API on :4000, or API=...; ADMIN_PASSWORD). Creates a temporary student and removes it.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath, pathToFileURL } from 'node:url';

const APP = fileURLToPath(new URL('../src', import.meta.url));
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'erp-registry-'));
fs.mkdirSync(path.join(TMP, 'registry'), { recursive: true });
// the registry imports the app's UI helpers (react-native); give it plain stand-ins
fs.writeFileSync(path.join(TMP, 'ui.js'), `
export const niceDate = (k) => (k ? String(k).slice(0, 10) : '');
export const money = (v) => 'Rs ' + Number(v ?? 0);
`);
for (const f of ['staff', 'family', 'format', 'extras']) fs.writeFileSync(path.join(TMP, 'registry', `${f}.js`), fs.readFileSync(path.join(APP, 'registry', `${f}.js`), 'utf8').replace("from '../ui'", "from '../ui.js'").replace("from './format'", "from './format.js'"));
const { STAFF_MODULES, STAFF_DASHBOARD } = await import(pathToFileURL(path.join(TMP, 'registry', 'staff.js')).href);
const { FAMILY_MODULES } = await import(pathToFileURL(path.join(TMP, 'registry', 'family.js')).href);
const { autoRow, autoFields } = await import(pathToFileURL(path.join(TMP, 'registry', 'format.js')).href);
const { STAFF_QUICK, PASSWORD_TILE } = await import(pathToFileURL(path.join(TMP, 'registry', 'extras.js')).href);

const API = process.env.API || 'http://localhost:4000/api';
const RUN = Date.now().toString(36).slice(-6);
const call = async (m, p, t, b) => { const r = await fetch(API + p, { method: m, headers: { 'Content-Type': 'application/json', ...(t && { Authorization: `Bearer ${t}` }) }, body: b && JSON.stringify(b) }); let d = null; try { d = await r.json(); } catch {} return { status: r.status, d }; };
const admin = (await call('POST', '/auth/login', null, { email: 'admin@school.local', password: process.env.ADMIN_PASSWORD || 'admin123' })).d.token;
const problems = [];
let checked = 0;

async function check(registry, token, child, role, modules) {
  for (const mod of modules) {
    for (const s of mod.screens) {
      if (s.kind === 'custom') continue;
      const label = `${registry}/${mod.key}/${s.key}`;
      const p = typeof s.path === 'function' ? s.path(child) : s.path;
      const { status, d } = await call('GET', p, token);
      checked += 1;
      if (status !== 200) { problems.push(`${label}: GET ${p} -> ${status} ${JSON.stringify(d).slice(0, 80)}`); continue; }
      try {
        if (s.kind === 'stats') {
          const tiles = s.tiles ? s.tiles(d, role) : [];
          for (const t of tiles) if (t && (t.value === undefined || t.value === 'NaN' || String(t.value).includes('undefined') || String(t.value).includes('NaN'))) problems.push(`${label}: tile "${t.label}" has value ${t.value}`);
          for (const l of s.lists ?? []) {
            const rows = l.rows(d);
            if (!Array.isArray(rows)) { problems.push(`${label}: list "${l.title}" rows is not an array`); continue; }
            for (const x of rows.slice(0, 5)) { const v = typeof x === 'string' ? { title: x } : l.row(x); if (!v.title || String(v.title).includes('undefined')) problems.push(`${label}: list "${l.title}" empty title for ${JSON.stringify(x).slice(0, 80)}`); }
          }
          if (s.auto) autoFields(d);
        } else {
          const rows = Array.isArray(d) ? d : s.pick ? s.pick(d) : null;
          if (!Array.isArray(rows)) { problems.push(`${label}: rows are not an array (${typeof d})`); continue; }
          for (const r of rows.slice(0, 8)) {
            const v = (s.row ?? autoRow)(r, child);
            const text = `${v.title}|${v.sub ?? ''}`;
            if (!v.title || /undefined|NaN|null/.test(text) || v.title === 'Invalid Date') problems.push(`${label}: odd row text "${text}" for ${JSON.stringify(r).slice(0, 100)}`);
            (s.filters ?? []).forEach((f) => f.test(r));
            (s.actions ?? []).forEach((a) => { a.when?.(r); if (a.path && !a.fields) { /* path built when used */ } });
          }
        }
      } catch (e) { problems.push(`${label}: threw ${e.message}`); }
    }
  }
}

// the menu stored in the database must match the app's pages: no tile without a page, no page without a tile
console.log('--- menu in the database');
for (const [audience, modules] of [['staff', STAFF_MODULES], ['family', FAMILY_MODULES]]) {
  const rows = (await call('GET', `/app-menu/admin?audience=${audience}`, admin)).d;
  if (!Array.isArray(rows)) { problems.push(`menu ${audience}: could not be read`); continue; }
  const known = new Set(audience === 'staff' ? [PASSWORD_TILE.key, ...STAFF_QUICK.map((q) => q.key)] : []);
  for (const m of modules) { known.add(m.key); for (const s of m.screens) known.add(`${m.key}.${s.key}`); }
  const have = new Set(rows.map((r) => r.key));
  for (const r of rows) if (!known.has(r.key)) problems.push(`menu ${audience}: "${r.key}" has no page in the app`);
  for (const k of known) if (!have.has(k)) problems.push(`menu ${audience}: page "${k}" is missing from the database menu (restart the API to seed it)`);
  for (const r of rows) if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(r.icon)) problems.push(`menu ${audience}: "${r.key}" has a malformed icon "${r.icon}"`);
}

console.log('--- staff (admin)');
await check('staff', admin, null, 'admin', STAFF_MODULES);
try { const dash = (await call('GET', STAFF_DASHBOARD.path, admin)).d; for (const t of STAFF_DASHBOARD.tiles(dash, 'admin')) if (String(t.value).includes('undefined') || String(t.value).includes('NaN')) problems.push(`dashboard tile "${t.label}" = ${t.value}`); } catch (e) { problems.push(`dashboard threw ${e.message}`); }

// a student, with something in each portal list
const undo = [];
const cls = (await call('POST', '/classes', admin, { name: `Rc${RUN}`.slice(0, 12), section: 'A' })).d.id; undo.unshift(() => call('DELETE', `/classes/${cls}`, admin));
const stu = (await call('POST', '/students', admin, { admissionNo: `RC${RUN}`, firstName: 'Reg', lastName: 'Check', gender: 'male', classId: cls })).d.id; undo.unshift(() => call('DELETE', `/students/${stu}`, admin));
const acc = (await call('POST', '/student-accounts', admin, { studentId: stu, email: `rc-${RUN}@test.local`, password: 'password123' })).d; undo.unshift(() => call('DELETE', `/student-accounts/${acc.id}`, admin));
let t = (await call('POST', '/auth/login', null, { email: `rc-${RUN}@test.local`, password: 'password123' })).d.token;
await call('POST', '/auth/change-password', t, { currentPassword: 'password123', newPassword: 'password-45678' });
t = (await call('POST', '/auth/login', null, { email: `rc-${RUN}@test.local`, password: 'password-45678' })).d.token;
console.log('--- family (student)');
await check('family', t, { id: stu }, 'student', FAMILY_MODULES);
// the create forms the family app offers
const doc = await call('POST', `/portal/children/${stu}/documents`, t, { type: 'bonafide', purpose: 'reg check' });
if (doc.status !== 201) problems.push(`family documents create -> ${doc.status} ${JSON.stringify(doc.d)}`);
if (doc.status === 201) undo.unshift(() => call('DELETE', `/documents/${doc.d.id}`, admin)); // a certificate request would block deleting the student
const cats = (await call('GET', '/portal/feedback-categories', t)).d;
const fb = await call('POST', `/portal/children/${stu}/feedback`, t, { kind: 'feedback', category: cats[0], subject: 'reg check', details: 'testing', studentId: stu });
if (fb.status !== 201) problems.push(`family feedback create -> ${fb.status} ${JSON.stringify(fb.d)}`);
for (const u of undo) await u().catch(() => {});

console.log(`checked ${checked} screens`);
console.log(problems.length ? problems.join('\n') : 'no problems');
fs.rmSync(TMP, { recursive: true, force: true });
process.exit(problems.length ? 1 : 0);
