import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import ExcelJS from 'exceljs';
import {
  buildPdfDefinition,
  formatValue,
  prepare,
  renderPdf,
  renderXlsx,
} from '../src/modules/reports/designer/engine.js';
import { columnsUsed, validateTemplate } from '../src/modules/reports/designer/templateSchema.js';

// Captures where pdfmake really placed every line on every page, so layout bugs show up that a look at the definition would miss.
const Renderer = createRequire(import.meta.url)('pdfmake/js/Renderer').default;
const renderPages = Renderer.prototype.renderPages;
let laidOut = [];
Renderer.prototype.renderPages = function (pages) {
  laidOut = pages;
  return renderPages.call(this, pages);
};
const textsOn = (page) =>
  page.items
    .filter((it) => it.type === 'line')
    .map((it) => ({
      y: Math.round(it.item.y),
      x: Math.round(it.item.x),
      text: it.item.inlines.map((n) => n.text).join(''),
    }));

const COLUMNS = ['admissionNo', 'student', 'class', 'title', 'amount', 'balance', 'dueDate'];
const ROWS = [
  {
    admissionNo: 'A1',
    student: 'Asha',
    class: '5-A',
    title: 'Tuition',
    amount: 1000,
    balance: 400,
    dueDate: '2026-04-10',
  },
  {
    admissionNo: 'A2',
    student: 'Ben',
    class: '5-A',
    title: 'Tuition',
    amount: '1200.50',
    balance: 0,
    dueDate: '2026-04-10',
  },
  {
    admissionNo: 'B1',
    student: 'Cara',
    class: '6-B',
    title: 'Tuition',
    amount: 900,
    balance: 900,
    dueDate: '2026-05-01',
  },
];

/** A grouped design with every band. */
const design = (patch = {}) => ({
  version: 1,
  title: 'Fee dues',
  dataset: 'fees',
  groupBy: 'class',
  sort: [{ field: 'student', dir: 'asc' }],
  page: { size: 'A4', orientation: 'portrait', margins: [28, 28, 28, 28] },
  bands: {
    reportHeader: {
      height: 40,
      elements: [
        { type: 'text', x: 0, y: 0, width: 300, height: 20, text: '{{title}}', bold: true, size: 16 },
      ],
    },
    pageHeader: {
      height: 24,
      elements: [
        { type: 'text', x: 0, y: 4, width: 120, height: 14, text: 'Student', bold: true },
        { type: 'text', x: 200, y: 4, width: 100, height: 14, text: 'Amount', bold: true, align: 'right' },
        { type: 'line', x: 0, y: 22, width: 500, height: 0 },
      ],
    },
    groupHeader: {
      height: 20,
      elements: [{ type: 'text', x: 0, y: 2, width: 200, height: 14, text: 'Class {{group}}', bold: true }],
    },
    detail: {
      height: 16,
      elements: [
        { type: 'field', field: 'student', x: 0, y: 1, width: 120, height: 14 },
        { type: 'field', field: 'amount', x: 200, y: 1, width: 100, height: 14, format: 'currency' },
      ],
    },
    groupFooter: {
      height: 20,
      elements: [
        { type: 'text', x: 0, y: 2, width: 120, height: 14, text: 'Subtotal', bold: true },
        {
          type: 'summary',
          func: 'sum',
          field: 'amount',
          scope: 'group',
          x: 200,
          y: 2,
          width: 100,
          height: 14,
          format: 'currency',
          bold: true,
        },
      ],
    },
    reportFooter: {
      height: 24,
      elements: [
        { type: 'text', x: 0, y: 4, width: 120, height: 14, text: 'Grand total', bold: true },
        {
          type: 'summary',
          func: 'sum',
          field: 'amount',
          scope: 'report',
          x: 200,
          y: 4,
          width: 100,
          height: 14,
          format: 'currency',
          bold: true,
        },
      ],
    },
    pageFooter: {
      height: 20,
      elements: [
        { type: 'pageNumber', x: 0, y: 4, width: 200, height: 12, text: 'Page {{page}} of {{pages}}' },
      ],
    },
  },
  ...patch,
});

const bad = (mutate, pattern) => {
  const d = design();
  mutate(d);
  assert.throws(() => validateTemplate(d, COLUMNS), pattern);
};

/* ---------- validation and security ---------- */

test('a complete design validates, and lists the columns it reads', () => {
  const d = validateTemplate(design(), COLUMNS);
  assert.deepEqual(columnsUsed(d).sort(), ['amount', 'class', 'student']);
});

test('a design can only name columns of its dataset', () => {
  bad((d) => (d.bands.detail.elements[0].field = 'password'), /unknown field/);
  bad((d) => (d.groupBy = 'secret'), /unknown field/);
  bad((d) => (d.sort = [{ field: 'nope' }]), /unknown field/);
  bad((d) => (d.filters = [{ column: 'nope', op: 'equals', value: 'x' }]), /unknown column/);
  bad((d) => (d.filters = [{ column: 'class', op: 'DROP TABLE', value: 'x' }]), /unknown filter type/);
});

test('images must be small pasted-in pictures, never a link or a file path', () => {
  const image = (data) => (d) =>
    d.bands.reportHeader.elements.push({ type: 'image', x: 400, y: 0, width: 40, height: 40, data });
  bad(image('http://169.254.169.254/latest/meta-data'), /data: URL/);
  bad(image('file:///etc/passwd'), /data: URL/);
  bad(image('C:\\Windows\\win.ini'), /data: URL/);
  bad(image('data:text/html;base64,PHNjcmlwdD4='), /data: URL/);
  bad(image(`data:image/png;base64,${'A'.repeat(600 * 1024)}`), /larger than/);
  const ok = design();
  ok.bands.reportHeader.elements.push({
    type: 'image',
    x: 400,
    y: 0,
    width: 40,
    height: 40,
    data: 'data:image/png;base64,iVBORw0KGgo=',
  });
  assert.doesNotThrow(() => validateTemplate(ok, COLUMNS));
});

test('elements must make sense where they are placed', () => {
  bad(
    (d) => d.bands.detail.elements.push({ type: 'pageNumber', x: 0, y: 0, width: 50, height: 10 }),
    /page header or page footer/,
  );
  bad(
    (d) =>
      d.bands.pageHeader.elements.push({
        type: 'field',
        field: 'student',
        x: 0,
        y: 0,
        width: 50,
        height: 10,
      }),
    /detail or group/,
  );
  bad(
    (d) =>
      d.bands.detail.elements.push({
        type: 'summary',
        func: 'sum',
        field: 'amount',
        scope: 'group',
        x: 0,
        y: 0,
        width: 50,
        height: 10,
      }),
    /group header or footer/,
  );
  bad((d) => (d.bands.detail.elements[0].width = 900), /past the right margin/);
  bad((d) => (d.bands.detail.elements[0].y = 40), /does not fit inside/);
  bad((d) => (d.bands.detail.elements[0].color = 'red; background:url(x)'), /color must look like/);
  bad((d) => delete d.bands.detail, /needs a detail band/);
  bad((d) => (d.groupBy = null), /choose a group field/);
  bad((d) => (d.bands.sneaky = { height: 10, elements: [] }), /unknown band/);
  bad(
    (d) =>
      (d.bands.detail.elements = Array.from({ length: 200 }, () => ({
        type: 'text',
        x: 0,
        y: 0,
        width: 5,
        height: 5,
        text: 'x',
      }))),
    /at most/,
  );
});

/* ---------- grouping, totals, numbers ---------- */

test('rows are sorted and grouped, and totals are worked out per group and for the report', () => {
  const { groups, all } = prepare(design(), [...ROWS].reverse());
  assert.deepEqual(
    groups.map((g) => g.key),
    ['5-A', '6-B'],
  );
  assert.deepEqual(
    groups[0].rows.map((r) => r.student),
    ['Asha', 'Ben'],
  );
  assert.equal(all.length, 3);

  const def = buildPdfDefinition(design(), ROWS, { now: new Date('2026-10-31') });
  const texts = JSON.stringify(def.content);
  assert.match(texts, /₹2,200\.5/, 'subtotal of class 5-A (1000 + 1200.50)');
  assert.match(texts, /₹900/, 'subtotal of class 6-B');
  assert.match(texts, /₹3,100\.5/, 'grand total');
  assert.match(texts, /Class 5-A/);
  assert.match(texts, /Fee dues/);
});

test('numbers, currency and dates are formatted, and an empty value stays empty', () => {
  assert.equal(formatValue(1234567.891, 'number'), '12,34,567.89');
  assert.equal(formatValue('1200', 'currency'), '₹1,200');
  assert.equal(formatValue('2026-04-10', 'date'), '10-04-2026');
  assert.equal(formatValue(null, 'number'), '');
  assert.equal(formatValue('abc', 'number'), 'abc');
});

test('page numbers are filled in for every page', () => {
  const def = buildPdfDefinition(design(), ROWS);
  assert.match(JSON.stringify(def.footer(2, 5)), /Page 2 of 5/);
  assert.match(JSON.stringify(def.header(1, 5)), /Student/);
  // the page header and footer take their height out of the margins, so rows never run under them
  assert.equal(def.pageMargins[1], 28 + 24);
  assert.equal(def.pageMargins[3], 28 + 20);
});

test('landscape and page size change the page', () => {
  const def = buildPdfDefinition(
    design({ page: { size: 'A4', orientation: 'landscape', margins: [20, 20, 20, 20] } }),
    ROWS,
  );
  assert.ok(def.pageSize.width > def.pageSize.height);
});

/* ---------- real files ---------- */

test('a PDF is produced, and a long report runs onto more pages with the page footer on each', async () => {
  const many = Array.from({ length: 220 }, (_, i) => ({
    ...ROWS[i % 3],
    student: `Student ${String(i).padStart(3, '0')}`,
  }));
  const pdf = await renderPdf(design(), many);
  assert.equal(pdf.subarray(0, 5).toString(), '%PDF-');
  const pages = (pdf.toString('latin1').match(/\/Type \/Page(?!s)/g) ?? []).length;
  assert.ok(pages > 3, `expected several pages, got ${pages}`);
  const small = await renderPdf(design(), ROWS);
  assert.ok(small.length > 1000);
});

test('an empty result still produces a valid PDF', async () => {
  const pdf = await renderPdf(design(), []);
  assert.equal(pdf.subarray(0, 5).toString(), '%PDF-');
});

test('a missing school logo is skipped, not an error', async () => {
  const d = design();
  d.bands.reportHeader.elements.push({
    type: 'image',
    source: 'schoolLogo',
    x: 400,
    y: 0,
    width: 40,
    height: 40,
  });
  assert.doesNotThrow(() => validateTemplate(d, COLUMNS));
  const pdf = await renderPdf(d, ROWS, { logo: null });
  assert.equal(pdf.subarray(0, 5).toString(), '%PDF-');
});

test('Excel: titles, group rows, numeric cells and totals', async () => {
  const buffer = await renderXlsx(design(), ROWS, { now: new Date('2026-10-31') });
  assert.equal(buffer.subarray(0, 2).toString(), 'PK', 'an .xlsx file is a zip');
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buffer);
  const ws = wb.worksheets[0];
  const rows = [];
  ws.eachRow((row) => rows.push(row.values.slice(1)));
  assert.equal(rows[0][0], 'Fee dues');
  // eachRow skips the empty spacer row under the title, so the header is the second row it visits
  assert.deepEqual(
    rows[1],
    ['Student', 'Amount'],
    'header row takes its titles from the page header text over each column',
  );
  assert.ok(
    rows.some((r) => r[0] === 'Class 5-A'),
    'a heading for each group',
  );
  const asha = rows.find((r) => r[0] === 'Asha');
  assert.equal(typeof asha[1], 'number', 'amounts are numbers, so Excel can add them');
  assert.equal(asha[1], 1000);
  const subtotal = rows.find((r) => r[0] === 'Subtotal');
  assert.equal(subtotal[1], 2200.5);
  const grand = rows.find((r) => r[0] === 'Grand total');
  assert.equal(grand[1], 3100.5);
});

test('Excel works without any group bands', async () => {
  const d = design({ groupBy: null });
  delete d.bands.groupHeader;
  delete d.bands.groupFooter;
  validateTemplate(d, COLUMNS);
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(await renderXlsx(d, ROWS));
  let count = 0;
  wb.worksheets[0].eachRow(() => count++);
  assert.equal(
    count,
    1 + 1 + 3 + 1,
    'title, header, three rows, grand total (the blank spacer row is not counted)',
  );
});

test('layout: header and footer text appear on every page, rows never run under them', async () => {
  const many = Array.from({ length: 120 }, (_, i) => ({
    ...ROWS[i % 3],
    student: `Student ${String(i).padStart(3, '0')}`,
  }));
  await renderPdf(design(), many);
  assert.ok(laidOut.length >= 3, 'a long report runs onto several pages');
  const headerBottom = 28 + 24; // top margin plus the page header band
  const footerTop = 841.89 - 28 - 20; // the page footer band starts here
  laidOut.forEach((page, n) => {
    const lines = textsOn(page);
    assert.ok(
      lines.some((l) => l.text === 'Student' && l.y < headerBottom),
      `page ${n + 1}: the page header text is at the top`,
    );
    assert.ok(
      lines.some((l) => l.text === `Page ${n + 1} of ${laidOut.length}` && l.y >= footerTop),
      `page ${n + 1}: the page number is in the footer`,
    );
    const body = lines.filter((l) => l.text.startsWith('Student '));
    assert.ok(
      body.every((l) => l.y >= headerBottom && l.y < footerTop),
      `page ${n + 1}: no row runs into the header or footer`,
    );
  });
});

test('layout: bands keep their order and spacing on the first page', async () => {
  await renderPdf(design(), ROWS);
  const lines = textsOn(laidOut[0]);
  const y = (text) => lines.find((l) => l.text.startsWith(text))?.y;
  assert.ok(y('Fee dues') < y('Class 5-A'), 'report header comes before the group header');
  assert.ok(y('Class 5-A') < y('Asha'), 'group header comes before its rows');
  assert.ok(y('Ben') - y('Asha') === 16, 'rows are one detail-band height (16 pt) apart');
  assert.ok(y('Subtotal') > y('Ben'), 'the group footer follows the last row of the group');
  assert.ok(y('Class 6-B') > y('Subtotal'), 'the next group starts after the previous group footer');
  assert.ok(y('Grand total') > y('Cara'), 'the report footer comes last');
});

test('board tokens fill in the board name, and the affiliation line stays empty unless one is supplied', () => {
  const d = design();
  d.bands.reportHeader.elements.push({
    type: 'text',
    x: 0,
    y: 22,
    width: 300,
    height: 14,
    text: '{{board}} | {{affiliation}} |',
  });
  const without = JSON.stringify(
    buildPdfDefinition(d, ROWS, { tokens: { board: 'UP Board', affiliation: '' } }).content,
  );
  assert.match(without, /UP Board \| {2}\|/, 'an unverified affiliation leaves the line empty');
  const withLine = JSON.stringify(
    buildPdfDefinition(d, ROWS, {
      tokens: { board: 'CBSE', affiliation: 'Affiliated to CBSE, affiliation no. 2130001' },
    }).content,
  );
  assert.match(withLine, /CBSE \| Affiliated to CBSE, affiliation no\. 2130001 \|/);
  const none = JSON.stringify(buildPdfDefinition(d, ROWS).content);
  assert.match(none, /\| {2}\|/, 'a report with no board prints no board or affiliation text');
});
