import path from 'node:path';
import { createRequire } from 'node:module';
import ExcelJS from 'exceljs';
import pdfmake from 'pdfmake';
import { compile, evaluate } from './formula.js';
import { pageGeometry } from './templateSchema.js';

/* ---------- pdfmake set-up: fonts from the package only, and no file or network access for a design ---------- */

const require = createRequire(import.meta.url);
const FONT_DIR = path.join(path.dirname(require.resolve('pdfmake/package.json')), 'fonts', 'Roboto');
pdfmake.addFonts({
  Roboto: {
    normal: path.join(FONT_DIR, 'Roboto-Regular.ttf'),
    bold: path.join(FONT_DIR, 'Roboto-Medium.ttf'),
    italics: path.join(FONT_DIR, 'Roboto-Italic.ttf'),
    bolditalics: path.join(FONT_DIR, 'Roboto-MediumItalic.ttf'),
  },
});
pdfmake.setUrlAccessPolicy(() => false); // a design may not make the server fetch an address
pdfmake.setLocalAccessPolicy((p) => path.resolve(p).startsWith(FONT_DIR)); // or read a file, other than the bundled fonts

/* ---------- values ---------- */

const isNumeric = (v) => v !== '' && v !== null && v !== undefined && !Number.isNaN(Number(v));
const ISO_DAY = /^(\d{4})-(\d{2})-(\d{2})/;

export function formatValue(value, format = 'text') {
  if (value === null || value === undefined || value === '') return '';
  if (format === 'number' || format === 'currency') {
    if (!isNumeric(value)) return String(value);
    const text = Number(value).toLocaleString('en-IN', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    });
    return format === 'currency' ? `₹${text}` : text;
  }
  if (format === 'date') {
    const m = ISO_DAY.exec(String(value));
    return m ? `${m[3]}-${m[2]}-${m[1]}` : String(value);
  }
  return String(value);
}

function summarise(func, rows, field) {
  if (func === 'count') return rows.length;
  const values = rows
    .map((r) => r[field])
    .filter(isNumeric)
    .map(Number);
  if (!values.length) return '';
  if (func === 'sum') return values.reduce((a, b) => a + b, 0);
  if (func === 'avg') return values.reduce((a, b) => a + b, 0) / values.length;
  if (func === 'min') return Math.min(...values);
  return Math.max(...values);
}

/** Sorts and groups the rows the way the design asks: the group field first, then the sort fields. */
export function prepare(tpl, rows) {
  const keys = [...(tpl.groupBy ? [{ field: tpl.groupBy, dir: 'asc' }] : []), ...(tpl.sort ?? [])];
  const sorted = [...rows].sort((a, b) => {
    for (const { field, dir } of keys) {
      const x = a[field] ?? '';
      const y = b[field] ?? '';
      const c = isNumeric(x) && isNumeric(y) ? Number(x) - Number(y) : String(x).localeCompare(String(y));
      if (c) return dir === 'desc' ? -c : c;
    }
    return 0;
  });
  if (!tpl.groupBy) return { all: sorted, groups: [{ key: null, rows: sorted }] };
  const groups = [];
  for (const row of sorted) {
    const key = row[tpl.groupBy] ?? '';
    const last = groups[groups.length - 1];
    if (last && last.key === key) last.rows.push(row);
    else groups.push({ key, rows: [row] });
  }
  return { all: sorted, groups };
}

/** Text tokens a design can use: {{title}}, {{group}}, {{printedOn}}, {{board}}, {{affiliation}}, and {{page}} / {{pages}} in page bands. */
const fillTokens = (text, t) =>
  text
    .replaceAll('{{title}}', t.title ?? '')
    .replaceAll('{{group}}', t.group ?? '')
    .replaceAll('{{printedOn}}', t.printedOn ?? '')
    .replaceAll('{{board}}', t.board ?? '')
    .replaceAll('{{affiliation}}', t.affiliation ?? '')
    .replaceAll('{{page}}', t.page ?? '')
    .replaceAll('{{pages}}', t.pages ?? '');

/** A formula's result. In a group band the totals are the group's, anywhere else the whole report's. */
function formulaValue(el, ctx) {
  return evaluate(compile(el.expr), {
    row: ctx.row,
    groupRows: ctx.groupRows,
    all: ctx.all,
    inGroupBand: Boolean(ctx.inGroupBand),
  });
}

/** What one element shows in a band: `ctx` has the current row, the rows of the group, all rows and the tokens. */
function valueOf(el, ctx) {
  switch (el.type) {
    case 'text':
      return fillTokens(el.text, ctx.tokens);
    case 'field':
      return formatValue(ctx.row?.[el.field], el.format);
    case 'summary': {
      const rows = el.scope === 'group' ? ctx.groupRows : ctx.all;
      return formatValue(summarise(el.func, rows ?? [], el.field), el.format ?? 'number');
    }
    case 'formula': {
      const v = formulaValue(el, ctx);
      return formatValue(
        typeof v === 'boolean' ? (v ? 'Yes' : 'No') : v,
        el.format ?? (typeof v === 'number' ? 'number' : 'text'),
      );
    }
    case 'pageNumber':
      return fillTokens(el.text ?? 'Page {{page}} of {{pages}}', ctx.tokens);
    default:
      return '';
  }
}

/* ---------- PDF ---------- */

function elementNode(el, band, ctx, logo) {
  const relativePosition = { x: el.x, y: el.y }; // measured from the top of the band
  if (el.type === 'line')
    return {
      relativePosition,
      canvas: [
        {
          type: 'line',
          x1: 0,
          y1: 0,
          x2: el.width,
          y2: el.height,
          lineWidth: el.lineWidth ?? 1,
          lineColor: el.color ?? '#000000',
        },
      ],
    };
  if (el.type === 'box')
    return {
      relativePosition,
      canvas: [
        {
          type: 'rect',
          x: 0,
          y: 0,
          w: el.width,
          h: el.height,
          lineWidth: el.lineWidth ?? 1,
          lineColor: el.color ?? '#000000',
          ...(el.fill && { color: el.fill }),
        },
      ],
    };
  if (el.type === 'image') {
    const data = el.source === 'schoolLogo' ? logo : el.data;
    return data ? { relativePosition, image: data, width: el.width, height: el.height } : null;
  }
  return {
    relativePosition,
    columns: [
      {
        width: el.width,
        text: valueOf(el, ctx),
        alignment:
          el.align ??
          (el.type === 'summary' || el.format === 'number' || el.format === 'currency' ? 'right' : 'left'),
        bold: Boolean(el.bold),
        italics: Boolean(el.italic),
        fontSize: el.size ?? 9,
        color: el.color ?? '#000000',
      },
    ],
  };
}

/** A band is a block of fixed height with its elements placed inside it by x and y. */
function bandNode(band, ctx, logo, extra = {}) {
  return {
    unbreakable: true,
    ...extra,
    stack: [
      ...band.elements.map((el) => elementNode(el, band, ctx, logo)).filter(Boolean),
      { canvas: [{ type: 'rect', x: 0, y: 0, w: 1, h: band.height, fillOpacity: 0, lineWidth: 0 }] }, // holds the band's height
    ],
  };
}

/** The pdfmake document definition for a design and its rows. */
export function buildPdfDefinition(tpl, rows, { logo = null, now = new Date(), tokens: extra = {} } = {}) {
  const geo = pageGeometry(tpl.page);
  const [left, top, right, bottom] = geo.margins;
  const bands = tpl.bands;
  const data = prepare(tpl, rows);
  const tokens = {
    title: tpl.title ?? '',
    printedOn: now.toISOString().slice(0, 10).split('-').reverse().join('-'),
    ...extra,
  };
  const base = { tokens, all: data.all, groupRows: data.all, row: null };

  const content = [];
  if (bands.reportHeader) content.push(bandNode(bands.reportHeader, base, logo));
  data.groups.forEach((g, i) => {
    const ctx = { ...base, tokens: { ...tokens, group: g.key }, groupRows: g.rows };
    if (bands.groupHeader)
      content.push(
        bandNode(
          bands.groupHeader,
          { ...ctx, inGroupBand: true },
          logo,
          tpl.pageBreakPerGroup && i > 0 ? { pageBreak: 'before' } : {},
        ),
      );
    for (const row of g.rows) content.push(bandNode(bands.detail, { ...ctx, row }, logo));
    if (bands.groupFooter) content.push(bandNode(bands.groupFooter, { ...ctx, inGroupBand: true }, logo));
  });
  if (!data.all.length)
    content.push({ text: 'No rows match this report.', italics: true, margin: [0, 10, 0, 0] });
  if (bands.reportFooter) content.push(bandNode(bands.reportFooter, base, logo));

  return {
    pageSize: { width: geo.width, height: geo.height },
    pageMargins: [
      left,
      top + (bands.pageHeader?.height ?? 0),
      right,
      bottom + (bands.pageFooter?.height ?? 0),
    ],
    info: { title: tpl.title ?? 'Report' },
    defaultStyle: { font: 'Roboto', fontSize: 9 },
    ...(bands.pageHeader && {
      header: (page, pages) => ({
        margin: [left, top, right, 0],
        ...bandNode(bands.pageHeader, { ...base, tokens: { ...tokens, page, pages } }, logo),
      }),
    }),
    ...(bands.pageFooter && {
      footer: (page, pages) => ({
        margin: [left, 0, right, 0],
        ...bandNode(bands.pageFooter, { ...base, tokens: { ...tokens, page, pages } }, logo),
      }),
    }),
    content,
  };
}

export async function renderPdf(tpl, rows, options) {
  return pdfmake.createPdf(buildPdfDefinition(tpl, rows, options)).getBuffer();
}

/* ---------- Excel ---------- */

/** The columns of the sheet: the detail band's fields left to right, titled by the header text sitting over each one. */
function sheetColumns(tpl) {
  const detail = tpl.bands.detail.elements
    .filter((e) => ['field', 'summary', 'formula', 'text'].includes(e.type))
    .sort((a, b) => a.x - b.x);
  const heads = [
    ...(tpl.bands.pageHeader?.elements ?? []),
    ...(tpl.bands.groupHeader?.elements ?? []),
  ].filter((e) => e.type === 'text');
  return detail.map((el) => {
    const over = heads.find((h) => h.x < el.x + el.width && h.x + h.width > el.x);
    return { el, title: over ? over.text : (el.field ?? ''), width: Math.max(10, Math.round(el.width / 5)) };
  });
}

const cellValue = (el, ctx) => {
  const raw =
    el.type === 'field'
      ? ctx.row?.[el.field]
      : el.type === 'summary'
        ? summarise(el.func, el.scope === 'group' ? ctx.groupRows : ctx.all, el.field)
        : valueOf(el, ctx);
  if (el.type === 'formula') {
    const v = formulaValue(el, ctx);
    return typeof v === 'number'
      ? v
      : typeof v === 'boolean'
        ? v
          ? 'Yes'
          : 'No'
        : formatValue(v, el.format);
  }
  if ((el.format === 'number' || el.format === 'currency' || el.type === 'summary') && isNumeric(raw))
    return Number(raw);
  return formatValue(raw, el.format);
};

/** The workbook for a design: title, a header row, then the rows with group headings and totals, then the report totals. */
export async function renderXlsx(tpl, rows, { now = new Date(), tokens: extra = {} } = {}) {
  const data = prepare(tpl, rows);
  const cols = sheetColumns(tpl);
  const wb = new ExcelJS.Workbook();
  wb.creator = 'School ERP';
  wb.created = now;
  const ws = wb.addWorksheet((tpl.title ?? 'Report').replace(/[\\/?*[\]:]/g, ' ').slice(0, 31) || 'Report');
  ws.columns = cols.map((c) => ({ width: c.width }));

  const tokens = {
    title: tpl.title ?? '',
    printedOn: now.toISOString().slice(0, 10).split('-').reverse().join('-'),
    ...extra,
  };
  const bold = (row) => row.eachCell((c) => (c.font = { bold: true }));
  const title = ws.addRow([tpl.title ?? 'Report']);
  title.font = { bold: true, size: 14 };
  ws.addRow([]);
  const head = ws.addRow(cols.map((c) => c.title));
  bold(head);
  head.eachCell((c) => (c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8EDF5' } }));
  ws.views = [{ state: 'frozen', ySplit: 3 }];

  const putRow = (band, ctx, isBold = false) => {
    if (!band) return;
    const els = band.elements.filter((e) => ['field', 'summary', 'formula', 'text'].includes(e.type));
    if (!els.length) return;
    const row = ws.addRow(
      cols
        .map((c) => els.find((e) => e.x < c.el.x + c.el.width && e.x + e.width > c.el.x))
        .map((e) => (e ? cellValue(e, ctx) : '')),
    );
    if (isBold) bold(row);
    cols.forEach((c, i) => {
      const el = els.find((e) => e.x < c.el.x + c.el.width && e.x + e.width > c.el.x);
      if (el?.format === 'currency') row.getCell(i + 1).numFmt = '"₹"#,##0.00';
      else if (el?.format === 'number' || el?.type === 'summary') row.getCell(i + 1).numFmt = '#,##0.##';
    });
  };

  const base = { tokens, all: data.all, groupRows: data.all, row: null };
  data.groups.forEach((g) => {
    const ctx = { ...base, tokens: { ...tokens, group: g.key }, groupRows: g.rows };
    putRow(tpl.bands.groupHeader, { ...ctx, inGroupBand: true }, true);
    for (const row of g.rows) putRow(tpl.bands.detail, { ...ctx, row });
    putRow(tpl.bands.groupFooter, { ...ctx, inGroupBand: true }, true);
  });
  putRow(tpl.bands.reportFooter, base, true);
  return Buffer.from(await wb.xlsx.writeBuffer());
}
