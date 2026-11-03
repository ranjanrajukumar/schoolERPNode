import test from 'node:test';
import assert from 'node:assert/strict';
import { BOARDS, studentRegisterDesign } from '../src/modules/reports/starters/board.js';
import { STARTERS } from '../src/modules/reports/starters/index.js';
import { checkReportRequest, datasetColumns } from '../src/modules/settings/data.service.js';
import { validateTemplate } from '../src/modules/reports/designer/templateSchema.js';
import { renderPdf } from '../src/modules/reports/designer/engine.js';
import { tableDesign } from '../src/modules/reports/designer/tableDesign.js';

const datasets = new Map(datasetColumns().map((d) => [d.key, d.columns]));

/** The request a ready-made report runs: its date column becomes two more filters, as the report routes do. */
const requestOf = (c) => ({
  dataset: c.dataset,
  columns: c.columns,
  filters: [
    ...(c.filters ?? []),
    ...(c.dateColumn ? [{ column: c.dateColumn, op: 'on_or_after', value: '2000-01-01' }] : []),
  ],
  sortBy: c.sortBy,
  sortDir: c.sortDir,
});

test('every ready-made report names a real dataset, real columns, and a real sort and date column', () => {
  for (const folder of STARTERS)
    for (const r of folder.reports)
      assert.doesNotThrow(() => checkReportRequest(requestOf(r.config)), `${folder.folder} / ${r.name}`);
});

test('a date range is only offered on a column that holds dates', () => {
  for (const folder of STARTERS)
    for (const r of folder.reports)
      if (r.config.dateColumn)
        assert.match(
          r.config.dateColumn,
          /date|On$|dob/i,
          `${folder.folder} / ${r.name}: ${r.config.dateColumn} does not look like a date`,
        );
});

test('folders and reports are named, described, and not repeated', () => {
  const folders = new Set();
  for (const f of STARTERS) {
    assert.ok(f.folder && f.description, 'a folder has a name and a description');
    assert.ok(!folders.has(f.folder), `folder “${f.folder}” appears twice`);
    folders.add(f.folder);
    const names = new Set();
    for (const r of f.reports) {
      assert.ok(r.name && r.description, `a report in ${f.folder} has a name and a description`);
      assert.ok(!names.has(r.name), `“${r.name}” appears twice in ${f.folder}`);
      names.add(r.name);
    }
  }
});

test('only the finance reports are shared beyond the administrator', () => {
  for (const f of STARTERS)
    assert.deepEqual(f.roles ?? [], f.folder === 'Finance' ? ['accountant'] : [], f.folder);
});

test('the board register design is valid for each board, and sees the class column', () => {
  for (const board of BOARDS) {
    const design = studentRegisterDesign(board);
    assert.doesNotThrow(() => validateTemplate(design, datasets.get(design.dataset)), board);
    assert.ok(
      datasets.get(design.dataset).includes('class'),
      'a board report needs a dataset with a class column',
    );
  }
});

/* ---------- Print: a table report as a clean printable design ---------- */

const sampleRows = (columns, n) =>
  Array.from({ length: n }, (_, i) =>
    Object.fromEntries(
      columns.map((c) => [
        c,
        /date|dob|On$/i.test(c) ? '2026-04-10' : /amount|balance|paid|fee/i.test(c) ? 1000 + i : `${c} ${i}`,
      ]),
    ),
  );

test('every ready-made table report becomes a valid printable design and a real PDF', async () => {
  for (const folder of STARTERS)
    for (const r of folder.reports) {
      const all = datasets.get(r.config.dataset);
      const design = tableDesign({
        title: r.name,
        dataset: r.config.dataset,
        columns: r.config.columns,
        allColumns: all,
      });
      const pdf = await renderPdf(design, sampleRows(r.config.columns, 60));
      assert.equal(pdf.subarray(0, 5).toString(), '%PDF-', `${folder.folder} / ${r.name}`);
    }
});

test('the printed page holds only the report: a title, the headings, the rows and the page number', () => {
  const columns = ['admissionNo', 'firstName', 'lastName'];
  const design = tableDesign({
    title: 'Student list',
    dataset: 'students',
    columns,
    allColumns: datasets.get('students'),
  });
  assert.deepEqual(Object.keys(design.bands).sort(), ['detail', 'pageFooter', 'pageHeader', 'reportHeader']);
  const headings = design.bands.pageHeader.elements.filter((e) => e.type === 'text').map((e) => e.text);
  assert.deepEqual(headings, ['Admission no', 'First name', 'Last name']);
  assert.deepEqual(
    design.bands.detail.elements.map((e) => e.field),
    columns,
  );
  assert.ok(design.bands.pageFooter.elements.some((e) => e.type === 'pageNumber'));
});

test('a wide table goes on a landscape page, a narrow one stays portrait', () => {
  const cols = datasets.get('students');
  assert.equal(
    tableDesign({ title: 't', dataset: 'students', columns: cols.slice(0, 6), allColumns: cols }).page
      .orientation,
    'portrait',
  );
  assert.equal(
    tableDesign({ title: 't', dataset: 'students', columns: cols.slice(0, 12), allColumns: cols }).page
      .orientation,
    'landscape',
  );
});

test('a column the dataset does not have is refused, and so is an empty report', () => {
  assert.throws(
    () =>
      tableDesign({
        title: 't',
        dataset: 'students',
        columns: ['passwordHash'],
        allColumns: datasets.get('students'),
      }),
    /unknown field/,
  );
  assert.throws(
    () => tableDesign({ title: 't', dataset: 'students', columns: [], allColumns: datasets.get('students') }),
    /at least one column/,
  );
});
