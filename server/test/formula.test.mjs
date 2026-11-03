import test from 'node:test';
import assert from 'node:assert/strict';
import ExcelJS from 'exceljs';
import {
  FormulaError,
  check,
  compile,
  evaluate,
  fieldsOf,
  parse,
} from '../src/modules/reports/designer/formula.js';
import { buildPdfDefinition, renderPdf, renderXlsx } from '../src/modules/reports/designer/engine.js';
import { columnsUsed, validateTemplate } from '../src/modules/reports/designer/templateSchema.js';

const COLS = ['amount', 'paidAmount', 'balance', 'firstName', 'lastName', 'class'];
const ROWS = [
  { amount: 1000, paidAmount: 400, balance: 600, firstName: 'asha', lastName: 'Verma', class: '5-A' },
  {
    amount: '1200.50',
    paidAmount: '1200.50',
    balance: 0,
    firstName: 'Ben',
    lastName: 'Thomas',
    class: '5-A',
  },
  { amount: 900, paidAmount: 0, balance: 900, firstName: 'Cara', lastName: 'Singh', class: '6-B' },
];
const run = (expr, ctx = {}) =>
  evaluate(check(parse(expr), COLS, true), { row: ROWS[0], groupRows: ROWS.slice(0, 2), all: ROWS, ...ctx });
const refused = (expr, pattern, row = true) =>
  assert.throws(
    () => check(parse(expr), COLS, row),
    (e) => e instanceof FormulaError && pattern.test(e.message),
    expr,
  );

/* ---------- the language ---------- */

test('arithmetic follows the usual order, with brackets and negatives', () => {
  assert.equal(run('2 + 3 * 4'), 14);
  assert.equal(run('(2 + 3) * 4'), 20);
  assert.equal(run('10 / 4'), 2.5);
  assert.equal(run('7 % 3'), 1);
  assert.equal(run('-3 + 5'), 2);
  assert.equal(run('2 * -3'), -6);
  assert.equal(run('10 - 4 - 3'), 3, 'subtraction goes left to right');
  assert.equal(run('2 * 3 + 4 * 5'), 26);
});

test('fields give the current row, and numbers stored as text still add up', () => {
  assert.equal(run('amount - paidAmount'), 600);
  assert.equal(run('amount * 0.18'), 180);
  assert.equal(run('amount', { row: ROWS[1] }), '1200.50');
  assert.equal(run('amount + paidAmount', { row: ROWS[1] }), 2401);
});

test('text, comparisons, and if()', () => {
  assert.equal(run("upper(firstName) + ' ' + lastName"), 'ASHA Verma');
  assert.equal(run("concat('a', 1, 'b')"), 'a1b');
  assert.equal(run("len('four')"), 4);
  assert.equal(run("'Abc' == 'abc'"), true, 'text compares ignoring case');
  assert.equal(run('amount > 500 && balance > 0'), true);
  assert.equal(run('amount > 5000 || balance == 0'), false);
  assert.equal(run('!(balance > 0)'), false);
  assert.equal(run("if(balance > 0, 'Due', 'Paid')"), 'Due');
  assert.equal(run("if(balance > 0, 'Due', 'Paid')", { row: ROWS[1] }), 'Paid');
});

test('totals are over the group in a group band, and over the whole report elsewhere', () => {
  assert.equal(run('sum(amount)', { inGroupBand: true }), 2200.5);
  assert.equal(run('sum(amount)', { inGroupBand: false }), 3100.5);
  assert.equal(run('count()', { inGroupBand: true }), 2);
  assert.equal(run('count()'), 3);
  assert.equal(run('max(amount)'), 1200.5);
  assert.equal(run('min(amount)'), 900);
  assert.equal(run('round(avg(amount), 2)'), 1033.5);
  assert.equal(run('round(sum(paidAmount) / sum(amount) * 100, 1)', { inGroupBand: true }), 72.7);
});

test('rounding and percentages', () => {
  assert.equal(run('round(2.345, 2)'), 2.35);
  assert.equal(run('round(1234.5678, 1)'), 1234.6);
  assert.equal(run('round(7.5)'), 8);
  assert.equal(run('percent(paidAmount, amount)'), 40);
  assert.equal(run('abs(-4.5)'), 4.5);
});

test('what cannot be worked out is blank, never NaN or Infinity', () => {
  assert.equal(run('10 / 0'), '');
  assert.equal(run('10 % 0'), '');
  assert.equal(run('percent(1, 0)'), '');
  assert.equal(run("'abc' * 2"), '');
  assert.equal(run('sum(amount)', { all: [], groupRows: [] }), '');
  assert.equal(run('amount', { row: {} }), '');
  assert.equal(run('amount * 2', { row: { amount: '' } }), '');
});

test('a bare field outside the detail must sit inside sum(), avg(), min() or max()', () => {
  refused('amount', /no single value here/, false);
  refused('amount * 2', /no single value here/, false);
  assert.doesNotThrow(() => check(parse('sum(amount) / count()'), COLS, false));
  assert.doesNotThrow(() => check(parse('amount'), COLS, true));
});

/* ---------- mistakes get plain messages ---------- */

test('syntax mistakes are explained', () => {
  const bad = (expr, pattern) =>
    assert.throws(
      () => parse(expr),
      (e) => e instanceof FormulaError && pattern.test(e.message),
      expr,
    );
  bad('', /empty/);
  bad('   ', /empty/);
  bad('2 +', /ends too soon/);
  bad('(1 + 2', /bracket is not closed/);
  bad('1 2', /Unexpected/);
  bad("'unclosed", /closing quote/);
  bad('2 @ 3', /Unexpected “@”/);
  bad('round(1,', /ends too soon|not closed/);
  bad('1 + * 2', /Unexpected “\*”/);
});

test('unknown fields, functions and wrong argument counts are refused with the options', () => {
  refused('nope', /not a field of this data/);
  refused('foo(1)', /not a function\. Available: /);
  refused('round()', /takes 1 to 2 value/);
  refused('if(1, 2)', /takes 3 value/);
  refused('count(amount)', /takes 0 value/);
  refused('sum()', /takes 1 value/);
  refused('sum(1 + 2)', /works on a field/);
});

test('length and complexity are limited', () => {
  assert.throws(() => parse('1 + '.repeat(100) + '1'), /too long|too complicated/);
  assert.throws(() => parse('('.repeat(40) + '1' + ')'.repeat(40)), /nested too deeply|too complicated/);
  assert.throws(() => parse('x'.repeat(301)), /too long/);
  // 70 short terms: under the length limit, over the limit on how many parts a formula may have
  assert.throws(() => parse(Array(70).fill('1').join('+')), /too complicated/);
});

/* ---------- the text is never run as code ---------- */

test('JavaScript tricks are refused, not run', () => {
  const attacks = [
    "constructor.constructor('return process')()",
    'this.constructor',
    "require('fs').readFileSync('.env')",
    'process.exit(1)',
    '__proto__',
    'globalThis',
    '`${1+1}`',
    '(() => 1)()',
    'amount; process.exit()',
    "eval('1')",
    "Function('return 1')()",
    "import('fs')",
    'a.b',
    "amount['x']",
    '{}',
  ];
  for (const a of attacks) assert.throws(() => check(parse(a), COLS, true), FormulaError, a);
});

test('even an unchecked tree cannot reach inherited properties', () => {
  assert.equal(evaluate({ k: 'name', v: '__proto__' }, { row: {} }), '');
  assert.equal(evaluate({ k: 'name', v: 'constructor' }, { row: {} }), '');
  assert.equal(evaluate({ k: 'name', v: 'toString' }, { row: { a: 1 } }), '');
  assert.equal(
    evaluate(
      { k: 'call', name: 'sum', args: [{ k: 'name', v: 'constructor' }] },
      { all: [{ a: 1 }], groupRows: [{ a: 1 }] },
    ),
    '',
  );
});

test('compiling the same formula twice gives the same tree, and the fields it reads are found', () => {
  assert.equal(compile('amount * 2'), compile('amount * 2'));
  assert.deepEqual([...fieldsOf(parse('if(balance > 0, upper(firstName), sum(paidAmount))'))].sort(), [
    'balance',
    'firstName',
    'paidAmount',
  ]);
});

/* ---------- in a report ---------- */

const design = (formulaElements = {}) => ({
  version: 1,
  title: 'Dues',
  dataset: 'fees',
  groupBy: 'class',
  page: { size: 'A4', orientation: 'portrait', margins: [28, 28, 28, 28] },
  bands: {
    pageHeader: {
      height: 20,
      elements: [
        { type: 'text', x: 0, y: 4, width: 120, height: 12, text: 'Student' },
        { type: 'text', x: 200, y: 4, width: 100, height: 12, text: 'Status' },
        { type: 'text', x: 320, y: 4, width: 100, height: 12, text: 'Tax' },
      ],
    },
    groupHeader: {
      height: 18,
      elements: [{ type: 'text', x: 0, y: 2, width: 200, height: 12, text: '{{group}}', bold: true }],
    },
    detail: {
      height: 16,
      elements: [
        { type: 'field', field: 'firstName', x: 0, y: 1, width: 120, height: 12 },
        { type: 'formula', expr: "if(balance > 0, 'Due', 'Paid')", x: 200, y: 1, width: 100, height: 12 },
        {
          type: 'formula',
          expr: 'round(amount * 0.18, 2)',
          x: 320,
          y: 1,
          width: 100,
          height: 12,
          format: 'currency',
        },
      ],
    },
    groupFooter: {
      height: 20,
      elements: [
        { type: 'text', x: 0, y: 3, width: 100, height: 12, text: 'Class total' },
        {
          type: 'formula',
          expr: 'sum(amount)',
          x: 320,
          y: 3,
          width: 100,
          height: 12,
          format: 'currency',
          bold: true,
        },
        ...(formulaElements.groupFooter ?? []),
      ],
    },
    reportFooter: {
      height: 20,
      elements: [
        { type: 'text', x: 0, y: 3, width: 100, height: 12, text: 'Everything' },
        {
          type: 'formula',
          expr: 'sum(amount)',
          x: 320,
          y: 3,
          width: 100,
          height: 12,
          format: 'currency',
          bold: true,
        },
        {
          type: 'formula',
          expr: "concat(count(), ' fees, ', round(sum(paidAmount) / sum(amount) * 100, 0), '% paid')",
          x: 120,
          y: 3,
          width: 190,
          height: 12,
        },
      ],
    },
  },
});
const FEE_COLS = ['firstName', 'amount', 'paidAmount', 'balance', 'class'];

test('a design with formulas validates, and its data needs include what the formulas read', () => {
  const d = validateTemplate(design(), FEE_COLS);
  assert.deepEqual(columnsUsed(d).sort(), ['amount', 'balance', 'class', 'firstName', 'paidAmount']);
});

test('a design is refused when a formula is wrong, with the place in the message', () => {
  const bad = (mutate, pattern) => {
    const d = design();
    mutate(d);
    assert.throws(
      () => validateTemplate(d, FEE_COLS),
      (e) => pattern.test(e.message),
    );
  };
  bad(
    (d) => (d.bands.detail.elements[1].expr = 'nope * 2'),
    /bands\.detail\.elements\[1\].*not a field of this data/,
  );
  bad((d) => (d.bands.groupFooter.elements[1].expr = 'amount'), /bands\.groupFooter.*no single value here/);
  bad((d) => (d.bands.detail.elements[1].expr = 'process.exit(1)'), /bands\.detail/);
  bad((d) => (d.bands.detail.elements[1].expr = 42), /needs its expression/);
  bad((d) => (d.bands.detail.elements[1].expr = ''), /empty/);
});

test('formulas show in the PDF: per row, per group, and for the report', () => {
  const rows = ROWS.map((r) => ({ ...r }));
  const text = JSON.stringify(buildPdfDefinition(design(), rows).content);
  assert.match(text, /Due/);
  assert.match(text, /Paid/);
  assert.match(text, /₹180/, 'round(1000 * 0.18, 2)');
  assert.match(text, /₹2,200\.5/, 'the class 5-A total, over its own two rows');
  assert.match(text, /₹900/, 'the class 6-B total');
  assert.match(text, /₹3,100\.5/, 'the report total, over all rows');
  assert.match(
    text,
    /3 fees, 52% paid/,
    'text built from totals: (400 + 1200.50 + 0) / 3100.50 is 51.6%, rounded to 52',
  );
});

test('a PDF with formulas is produced', async () => {
  const pdf = await renderPdf(design(), ROWS);
  assert.equal(pdf.subarray(0, 5).toString(), '%PDF-');
});

test('Excel gets formula results as numbers where they are numbers', async () => {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(await renderXlsx(design(), ROWS));
  const rows = [];
  wb.worksheets[0].eachRow((r) => rows.push(r.values.slice(1)));
  const asha = rows.find((r) => r[0] === 'asha');
  assert.equal(asha[1], 'Due');
  assert.equal(asha[2], 180, 'a number, so Excel can add it');
  const total = rows.filter((r) => r[0] === 'Class total');
  assert.deepEqual(
    total.map((r) => r[2]),
    [2200.5, 900],
  );
});
