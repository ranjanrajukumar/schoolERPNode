import test from 'node:test';
import assert from 'node:assert/strict';
import { MODULES } from '../src/modules/platform/access.js';
import { REPORT_PAGES, cleanPages, moduleOfPage, pagesOf } from '../src/modules/reports/reportPages.js';
import { STARTERS } from '../src/modules/reports/starters/index.js';

const fail = (message) => {
  throw new Error(message);
};

test('every page names a real Role Rights module, so its Export switch exists', () => {
  const modules = new Set(MODULES.map((m) => m.key));
  for (const p of REPORT_PAGES)
    assert.ok(modules.has(p.module), `page “${p.key}” points at “${p.module}”, which is not a module`);
});

test('page keys and labels are unique and readable', () => {
  assert.equal(new Set(REPORT_PAGES.map((p) => p.key)).size, REPORT_PAGES.length);
  assert.equal(new Set(REPORT_PAGES.map((p) => p.label)).size, REPORT_PAGES.length);
  for (const p of REPORT_PAGES) assert.match(p.key, /^[a-z][a-z-]*$/, p.key);
});

test('saving keeps known pages once each, and refuses a page that does not exist', () => {
  assert.equal(cleanPages(['students', 'fees'], fail), 'students,fees');
  assert.equal(cleanPages(['students', 'students'], fail), 'students');
  assert.equal(cleanPages([], fail), null);
  assert.equal(cleanPages(undefined, fail), null);
  assert.throws(() => cleanPages(['students', 'stundents'], fail), /“stundents” is not a page/);
  assert.throws(
    () => cleanPages(['students,fees'], fail),
    /is not a page/,
    'a comma cannot sneak a second value in',
  );
});

test('reading a stored list drops pages that were removed, and an empty one is empty', () => {
  assert.deepEqual(pagesOf('students,fees'), ['students', 'fees']);
  assert.deepEqual(pagesOf('students,gone'), ['students']);
  assert.deepEqual(pagesOf(null), []);
  assert.deepEqual(pagesOf(''), []);
  assert.equal(moduleOfPage('fees'), 'fees-and-finance');
  assert.equal(moduleOfPage('nope'), null);
});

test('every ready-made report is on a real screen, and each module sits on its own one', () => {
  const onPage = new Map();
  for (const f of STARTERS)
    for (const r of f.reports) {
      const pages = r.pages ?? f.pages;
      assert.ok(pages?.length, `${f.folder} / ${r.name} is on no screen`);
      for (const k of pages)
        assert.ok(
          REPORT_PAGES.some((p) => p.key === k),
          `${f.folder} / ${r.name}: “${k}” is not a page`,
        );
      onPage.set(r.name, pages);
    }
  assert.deepEqual(onPage.get('Student directory'), ['students', 'classes'], 'the student list is also on the Classes screen');
  assert.deepEqual(onPage.get('Fee dues'), ['fees']);
  assert.deepEqual(onPage.get('Staff directory'), ['staff']);
  assert.deepEqual(onPage.get('Library catalogue'), ['library']);
  assert.deepEqual(
    onPage.get('Inventory stock, lowest first'),
    ['inventory'],
    'stock is on the Inventory screen, not Library',
  );
  assert.deepEqual(onPage.get('Applicants by status'), ['admissions']);
});
