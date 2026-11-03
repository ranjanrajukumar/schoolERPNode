import { badRequest } from '../../../utils/httpError.js';
import { FormulaError, check, fieldsOf, parse } from './formula.js';

/**
 * The report design format (version 1): what the visual designer saves and the renderer reads.
 *
 *   {
 *     version: 1, title, dataset,
 *     page: { size: 'A4' | 'A3' | 'A5' | 'Letter' | 'Legal', orientation: 'portrait' | 'landscape', margins: [l, t, r, b] },   // points
 *     filters: [{ column, op, value }], sort: [{ field, dir }], groupBy: 'field' | null,
 *     bands: { reportHeader, pageHeader, groupHeader, detail, groupFooter, reportFooter, pageFooter }   // each { height, elements: [] }
 *   }
 *
 * An element sits at (x, y) in points inside its band: { type, x, y, width, height, ...style }.
 * Types: text, field, summary, pageNumber, line, box, image.
 * Fields, groups and sorts can only name columns of the chosen dataset, and images must be small data: URLs, so a design can never
 * pull in a file or an address from the server.
 */
export const BAND_NAMES = [
  'reportHeader',
  'pageHeader',
  'groupHeader',
  'detail',
  'groupFooter',
  'reportFooter',
  'pageFooter',
];
export const ELEMENT_TYPES = ['text', 'field', 'summary', 'formula', 'pageNumber', 'line', 'box', 'image'];
export const SUMMARY_FUNCS = ['sum', 'count', 'avg', 'min', 'max'];
export const FORMATS = ['text', 'number', 'currency', 'date'];

export const PAGE_SIZES = {
  A3: [841.89, 1190.55],
  A4: [595.28, 841.89],
  A5: [419.53, 595.28],
  Letter: [612, 792],
  Legal: [612, 1008],
};

const MAX_ELEMENTS_PER_BAND = 120;
const MAX_BAND_HEIGHT = 600;
const MAX_IMAGE_BYTES = 400 * 1024;
const IMAGE_DATA_URL = /^data:image\/(png|jpeg|jpg);base64,[A-Za-z0-9+/=]+$/;
const COLOR = /^#[0-9a-fA-F]{6}$/;
const FILTER_OPS = [
  'contains',
  'equals',
  'not_equals',
  'greater',
  'less',
  'empty',
  'not_empty',
  'on_or_after',
  'on_or_before',
];

const num = (v) => (typeof v === 'number' ? v : Number.NaN);
const fail = (path, message) => {
  throw badRequest(`${path}: ${message}`);
};

/** Page size in points for a template, with the orientation applied. */
export function pageGeometry(page = {}) {
  const [w, h] = PAGE_SIZES[page.size] ?? PAGE_SIZES.A4;
  const [width, height] = page.orientation === 'landscape' ? [h, w] : [w, h];
  const [l, t, r, b] = page.margins ?? [28, 28, 28, 28];
  return { width, height, margins: [l, t, r, b], contentWidth: width - l - r };
}

function checkElement(el, band, bandName, columns, geo, path) {
  if (!el || typeof el !== 'object') fail(path, 'must be an object');
  if (!ELEMENT_TYPES.includes(el.type)) fail(path, `unknown element type “${el.type}”`);
  for (const k of ['x', 'y', 'width', 'height']) {
    if (Number.isNaN(num(el[k]))) fail(path, `${k} must be a number`);
  }
  if (el.x < 0 || el.y < 0 || el.width < 0 || el.height < 0)
    fail(path, 'position and size cannot be negative');
  if (el.x + el.width > geo.contentWidth + 0.5) fail(path, 'sticks out past the right margin of the page');
  if (el.y + (el.type === 'line' ? 0 : el.height) > band.height + 0.5 && el.type !== 'line')
    fail(path, `does not fit inside the ${bandName} band (${band.height} pt high)`);
  if (el.color !== undefined && !COLOR.test(el.color)) fail(path, 'color must look like #1a2b3c');
  if (el.fill !== undefined && !COLOR.test(el.fill)) fail(path, 'fill must look like #1a2b3c');
  if (el.size !== undefined && !(el.size >= 5 && el.size <= 72))
    fail(path, 'font size must be between 5 and 72');
  if (el.align !== undefined && !['left', 'center', 'right'].includes(el.align))
    fail(path, 'align must be left, center or right');
  if (el.format !== undefined && !FORMATS.includes(el.format))
    fail(path, `format must be one of ${FORMATS.join(', ')}`);

  if (el.type === 'text' && typeof el.text !== 'string') fail(path, 'text needs a text value');
  if (el.type === 'text' && el.text.length > 500) fail(path, 'text is too long (500 characters at most)');
  if (el.type === 'field' || el.type === 'summary') {
    if (!columns.has(el.field)) fail(path, `unknown field “${el.field}”`);
  }
  if (el.type === 'summary') {
    if (!SUMMARY_FUNCS.includes(el.func)) fail(path, `func must be one of ${SUMMARY_FUNCS.join(', ')}`);
    if (!['group', 'report'].includes(el.scope)) fail(path, 'scope must be group or report');
    if (el.scope === 'group' && !['groupHeader', 'groupFooter'].includes(bandName))
      fail(path, 'a group total can only sit in the group header or footer');
  }
  if (el.type === 'formula') {
    if (typeof el.expr !== 'string') fail(path, 'a formula needs its expression');
    try {
      // a bare field is only meaningful in the detail band, where there is one row; elsewhere it must sit inside sum(), avg(), min() or max()
      check(parse(el.expr), [...columns], bandName === 'detail');
    } catch (err) {
      if (err instanceof FormulaError) fail(path, err.message);
      throw err;
    }
  }
  if (el.type === 'pageNumber' && !['pageHeader', 'pageFooter'].includes(bandName))
    fail(path, 'page numbers can only sit in the page header or page footer');
  if (el.type === 'field' && ['pageHeader', 'pageFooter', 'reportHeader', 'reportFooter'].includes(bandName))
    fail(path, 'a data field belongs in the detail or group bands');
  if (el.type === 'image') {
    if (el.source === 'schoolLogo') return;
    if (typeof el.data !== 'string' || !IMAGE_DATA_URL.test(el.data))
      fail(path, 'an image must be a PNG or JPEG pasted in (a data: URL), not a link or a file path');
    if (el.data.length * 0.75 > MAX_IMAGE_BYTES)
      fail(path, `image is larger than ${MAX_IMAGE_BYTES / 1024} KB`);
  }
}

/**
 * Checks a design against its dataset's columns and throws a 400 with the path of the first problem.
 * `columns` is the list of column names the dataset offers. Returns a cleaned copy.
 */
export function validateTemplate(tpl, columnList) {
  if (!tpl || typeof tpl !== 'object') fail('design', 'is missing');
  if (tpl.version !== 1) fail('version', 'must be 1');
  const columns = new Set(columnList);
  if (!tpl.dataset || !columns.size) fail('dataset', 'choose a dataset');

  const page = tpl.page ?? {};
  if (page.size !== undefined && !PAGE_SIZES[page.size])
    fail('page.size', `must be one of ${Object.keys(PAGE_SIZES).join(', ')}`);
  if (page.orientation !== undefined && !['portrait', 'landscape'].includes(page.orientation))
    fail('page.orientation', 'must be portrait or landscape');
  if (
    page.margins !== undefined &&
    !(
      Array.isArray(page.margins) &&
      page.margins.length === 4 &&
      page.margins.every((m) => m >= 0 && m <= 150)
    )
  )
    fail('page.margins', 'must be four numbers from 0 to 150');
  const geo = pageGeometry(page);

  if (tpl.groupBy && !columns.has(tpl.groupBy)) fail('groupBy', `unknown field “${tpl.groupBy}”`);
  for (const [i, s] of (tpl.sort ?? []).entries()) {
    if (!columns.has(s.field)) fail(`sort[${i}]`, `unknown field “${s.field}”`);
    if (s.dir !== undefined && !['asc', 'desc'].includes(s.dir))
      fail(`sort[${i}]`, 'dir must be asc or desc');
  }
  if ((tpl.sort ?? []).length > 3) fail('sort', 'use at most 3 sort fields');
  for (const [i, f] of (tpl.filters ?? []).entries()) {
    if (!columns.has(f.column)) fail(`filters[${i}]`, `unknown column “${f.column}”`);
    if (!FILTER_OPS.includes(f.op)) fail(`filters[${i}]`, 'unknown filter type');
  }
  if ((tpl.filters ?? []).length > 10) fail('filters', 'use at most 10 filters');

  const bands = tpl.bands ?? {};
  for (const name of Object.keys(bands))
    if (!BAND_NAMES.includes(name)) fail(`bands.${name}`, 'unknown band');
  if (!bands.detail) fail('bands.detail', 'a report needs a detail band, the one repeated for every row');
  if ((bands.groupHeader || bands.groupFooter) && !tpl.groupBy)
    fail('groupBy', 'choose a group field to use group bands');

  for (const name of BAND_NAMES) {
    const band = bands[name];
    if (!band) continue;
    if (!(band.height > 0 && band.height <= MAX_BAND_HEIGHT))
      fail(`bands.${name}.height`, `must be between 1 and ${MAX_BAND_HEIGHT}`);
    if (!Array.isArray(band.elements)) fail(`bands.${name}.elements`, 'must be a list');
    if (band.elements.length > MAX_ELEMENTS_PER_BAND)
      fail(`bands.${name}.elements`, `at most ${MAX_ELEMENTS_PER_BAND} items per band`);
    band.elements.forEach((el, i) =>
      checkElement(el, band, name, columns, geo, `bands.${name}.elements[${i}]`),
    );
  }
  return tpl;
}

/** Every column a design reads: the data it shows, groups by or sorts on. */
export function columnsUsed(tpl) {
  const used = new Set();
  if (tpl.groupBy) used.add(tpl.groupBy);
  for (const s of tpl.sort ?? []) used.add(s.field);
  for (const band of Object.values(tpl.bands ?? {}))
    for (const el of band.elements ?? []) {
      if (el.field) used.add(el.field);
      if (el.type === 'formula') for (const f of fieldsOf(parse(el.expr))) used.add(f);
    }
  return [...used];
}
