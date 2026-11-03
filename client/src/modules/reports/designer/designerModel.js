/**
 * The designer's model: the report design (the same JSON the server validates and renders), and the rules for editing it.
 * Everything here is plain functions so the screen stays thin. Coordinates are points (1/72 inch), measured inside the band.
 */

export const BANDS = [
  { key: 'reportHeader', label: 'Report header', hint: 'Once, at the top of the first page' },
  { key: 'pageHeader', label: 'Page header', hint: 'At the top of every page' },
  { key: 'groupHeader', label: 'Group header', hint: 'Before each group', needsGroup: true },
  { key: 'detail', label: 'Detail', hint: 'Repeated for every row', required: true },
  { key: 'groupFooter', label: 'Group footer', hint: 'After each group, for its totals', needsGroup: true },
  { key: 'reportFooter', label: 'Report footer', hint: 'Once, at the end' },
  { key: 'pageFooter', label: 'Page footer', hint: 'At the bottom of every page' },
];

export const PAGE_SIZES = {
  A3: [841.89, 1190.55],
  A4: [595.28, 841.89],
  A5: [419.53, 595.28],
  Letter: [612, 792],
  Legal: [612, 1008],
};

export const SUMMARY_FUNCS = [
  ['sum', 'Sum'],
  ['count', 'Count'],
  ['avg', 'Average'],
  ['min', 'Smallest'],
  ['max', 'Largest'],
];
export const FORMATS = [
  ['text', 'Text'],
  ['number', 'Number'],
  ['currency', 'Currency (₹)'],
  ['date', 'Date'],
];
export const FILTER_OPS = [
  ['contains', 'contains'],
  ['equals', 'is'],
  ['not_equals', 'is not'],
  ['greater', 'is greater than'],
  ['less', 'is less than'],
  ['empty', 'is empty'],
  ['not_empty', 'is not empty'],
  ['on_or_after', 'is on or after'],
  ['on_or_before', 'is on or before'],
];

export const TOOLS = [
  {
    tool: 'text',
    label: 'Text',
    icon: 'T',
    hint: 'A label or heading. {{title}}, {{group}}, {{board}} and {{printedOn}} fill in by themselves',
  },
  { tool: 'line', label: 'Line', icon: '─', hint: 'A horizontal rule' },
  { tool: 'box', label: 'Box', icon: '▭', hint: 'A rectangle, outlined or filled' },
  { tool: 'image', label: 'Picture', icon: '🖼', hint: 'A PNG or JPEG, up to 400 KB' },
  { tool: 'logo', label: 'School logo', icon: '🏫', hint: 'The logo from School profile' },
  {
    tool: 'pageNumber',
    label: 'Page number',
    icon: '#',
    hint: 'Page X of Y, for the page header or footer',
    onlyIn: ['pageHeader', 'pageFooter'],
  },
  {
    tool: 'summary',
    label: 'Total',
    icon: 'Σ',
    hint: 'A sum, count, average, smallest or largest of a field',
  },
  {
    tool: 'formula',
    label: 'Formula',
    icon: 'ƒ',
    hint: 'A calculation: fees × 18%, if(balance > 0, "Due", "Paid"), a percentage, joined text',
  },
];

/** What the formula box tells the person. The same language the server checks and runs. */
export const FORMULA_HELP = [
  ['Arithmetic', 'amount * 0.18   (amount - paid) / amount   + - * / % and ( )'],
  ['Tests', "if(balance > 0, 'Due', 'Paid')   > < >= <= == !=   && || !"],
  [
    'Totals',
    'sum(amount)  avg(amount)  min(amount)  max(amount)  count()  (over the group in a group band, else the whole report)',
  ],
  ['Numbers', 'round(x, 2)  abs(x)  percent(part, whole)'],
  ['Text', "upper(name)  lower(name)  concat(a, ' ', b)  len(name)  or  a + ' ' + b"],
  [
    'Fields',
    'Write a field by its name, as in the list on the left. In the detail it is the current row; elsewhere use it inside sum(), avg(), min() or max().',
  ],
];

let counter = 0;
export const newId = () => `e${Date.now().toString(36)}${(counter++).toString(36)}`;

export const pageGeometry = (design) => {
  const [w, h] = PAGE_SIZES[design.page?.size] ?? PAGE_SIZES.A4;
  const [width, height] = design.page?.orientation === 'landscape' ? [h, w] : [w, h];
  const [l, t, r, b] = design.page?.margins ?? [28, 28, 28, 28];
  return { width, height, margins: [l, t, r, b], contentWidth: Math.round((width - l - r) * 100) / 100 };
};

/** A new report: a title and column headings at the top, one detail row, and page numbers at the bottom. */
export function blankDesign(dataset = '') {
  return {
    version: 1,
    title: 'New report',
    dataset,
    filters: [],
    sort: [],
    groupBy: null,
    page: { size: 'A4', orientation: 'portrait', margins: [36, 36, 36, 36] },
    bands: {
      reportHeader: {
        height: 40,
        elements: [
          {
            id: newId(),
            type: 'text',
            x: 0,
            y: 6,
            width: 400,
            height: 24,
            text: '{{title}}',
            bold: true,
            size: 16,
            color: '#1f3a6e',
          },
        ],
      },
      pageHeader: { height: 24, elements: [] },
      detail: { height: 16, elements: [] },
      pageFooter: {
        height: 22,
        elements: [
          {
            id: newId(),
            type: 'pageNumber',
            x: 323,
            y: 6,
            width: 200,
            height: 12,
            text: 'Page {{page}} of {{pages}}',
            size: 8,
            align: 'right',
            color: '#888888',
          },
        ],
      },
    },
  };
}

const NUMERIC_NAME =
  /amount|balance|total|fee|price|paid|quantity|marks|copies|available|reorder|experience|capacity|count/i;
export const looksNumeric = (field) => NUMERIC_NAME.test(field);

/** Splits a camelCase column name into a heading: "guardianPhone" becomes "Guardian phone". */
export const headingOf = (field) => {
  const words = field.replace(/([a-z0-9])([A-Z])/g, '$1 $2').toLowerCase();
  return words.charAt(0).toUpperCase() + words.slice(1);
};

const base = (type, x, y, width, height) => ({
  id: newId(),
  type,
  x: Math.max(0, Math.round(x)),
  y: Math.max(0, Math.round(y)),
  width,
  height,
});

/**
 * What dropping a data field on a band makes, as a report designer would expect:
 * in the detail it is the value itself; in the group bands a total of that field for the group; in the report footer a total for the
 * report; in a header or the page footer a heading carrying the field's name.
 */
export function elementForField(field, bandKey, x, y, contentWidth) {
  const width = Math.min(110, Math.max(40, contentWidth - x));
  const fit = (el) => ({ ...el, width: Math.min(el.width, Math.max(10, Math.round(contentWidth - el.x))) });
  if (bandKey === 'detail')
    return fit({ ...base('field', x, y, width, 12), field, format: looksNumeric(field) ? 'number' : 'text' });
  if (bandKey === 'groupHeader' || bandKey === 'groupFooter')
    return fit({
      ...base('summary', x, y, width, 12),
      field,
      func: looksNumeric(field) ? 'sum' : 'count',
      scope: 'group',
      format: 'number',
      bold: true,
    });
  if (bandKey === 'reportFooter')
    return fit({
      ...base('summary', x, y, width, 12),
      field,
      func: looksNumeric(field) ? 'sum' : 'count',
      scope: 'report',
      format: 'number',
      bold: true,
    });
  return fit({ ...base('text', x, y, width, 12), text: headingOf(field), bold: bandKey !== 'pageFooter' });
}

/** What dropping a tool on a band makes. Returns null when the tool cannot go there, with a reason in `why`. */
export function elementForTool(tool, bandKey, x, y, contentWidth, fields = []) {
  const fit = (el) => ({ ...el, width: Math.min(el.width, Math.max(10, Math.round(contentWidth - el.x))) });
  switch (tool) {
    case 'text':
      return { el: fit({ ...base('text', x, y, 140, 14), text: 'Text', size: 10 }) };
    case 'line':
      return { el: fit({ ...base('line', x, y, 200, 0), color: '#999999', lineWidth: 1 }) };
    case 'box':
      return { el: fit({ ...base('box', x, y, 120, 20), color: '#c9d6ec', fill: '#eef3fb', lineWidth: 1 }) };
    case 'logo':
      return { el: fit({ ...base('image', x, y, 48, 48), source: 'schoolLogo' }) };
    case 'image':
      return { el: fit({ ...base('image', x, y, 60, 60), data: '' }), needsFile: true };
    case 'pageNumber':
      if (!['pageHeader', 'pageFooter'].includes(bandKey))
        return { why: 'Page numbers can only go in the page header or the page footer' };
      return {
        el: fit({
          ...base('pageNumber', x, y, 200, 12),
          text: 'Page {{page}} of {{pages}}',
          size: 8,
          align: 'right',
        }),
      };
    case 'summary': {
      if (!fields.length) return { why: 'Choose a dataset first' };
      const field = fields[0];
      const scope = ['groupHeader', 'groupFooter'].includes(bandKey) ? 'group' : 'report';
      return {
        el: fit({
          ...base('summary', x, y, 100, 12),
          field,
          func: 'count',
          scope,
          format: 'number',
          bold: true,
        }),
      };
    }
    case 'formula':
      // a starting formula that is valid where it sits: the first field in the detail, a row count elsewhere
      return {
        el: fit({
          ...base('formula', x, y, 140, 12),
          expr: bandKey === 'detail' ? (fields[0] ?? 'count()') : 'count()',
          format: 'number',
        }),
      };
    default:
      return { why: 'Unknown tool' };
  }
}

/** The lowest edge of anything in a band: it cannot be made shorter than this. */
export const minBandHeight = (band) =>
  band.elements.reduce((m, el) => Math.max(m, el.y + (el.type === 'line' ? 0 : el.height)), 8);

/** Whether a band can hold a data field element as it is. */
export const bandAllowsField = (bandKey) => bandKey === 'detail';

/* ---------- editing the design as plain data ---------- */

export function updateElement(design, bandKey, id, patch) {
  const band = design.bands[bandKey];
  return {
    ...design,
    bands: {
      ...design.bands,
      [bandKey]: { ...band, elements: band.elements.map((el) => (el.id === id ? { ...el, ...patch } : el)) },
    },
  };
}
export function addElement(design, bandKey, el) {
  const band = design.bands[bandKey];
  return { ...design, bands: { ...design.bands, [bandKey]: { ...band, elements: [...band.elements, el] } } };
}
export function removeElement(design, bandKey, id) {
  const band = design.bands[bandKey];
  return {
    ...design,
    bands: { ...design.bands, [bandKey]: { ...band, elements: band.elements.filter((el) => el.id !== id) } },
  };
}
export function setBandHeight(design, bandKey, height) {
  const band = design.bands[bandKey];
  const h = Math.max(minBandHeight(band), Math.min(600, Math.round(height)));
  return { ...design, bands: { ...design.bands, [bandKey]: { ...band, height: h } } };
}
export function toggleBand(design, bandKey, on) {
  const bands = { ...design.bands };
  if (on) bands[bandKey] = bands[bandKey] ?? { height: bandKey === 'detail' ? 16 : 24, elements: [] };
  else delete bands[bandKey];
  return { ...design, bands };
}

/** Sets the group field. Removing it removes the group bands too (the caller has asked the person first). */
export function setGroupBy(design, field) {
  if (field) return { ...design, groupBy: field };
  const { groupHeader, groupFooter, ...bands } = design.bands;
  return { ...design, groupBy: null, bands, pageBreakPerGroup: false };
}

/** Switching dataset removes every element and setting that names a field the new dataset does not have. Returns the design and what was dropped. */
export function changeDataset(design, dataset, columns) {
  const has = new Set(columns);
  let dropped = 0;
  const bands = {};
  for (const [key, band] of Object.entries(design.bands)) {
    const elements = band.elements.filter((el) => {
      const keep = !el.field || has.has(el.field);
      if (!keep) dropped += 1;
      return keep;
    });
    bands[key] = { ...band, elements };
  }
  const sort = (design.sort ?? []).filter((s) => has.has(s.field));
  const filters = (design.filters ?? []).filter((f) => has.has(f.column));
  dropped += (design.sort ?? []).length - sort.length + (design.filters ?? []).length - filters.length;
  const next = { ...design, dataset, bands, sort, filters };
  if (design.groupBy && !has.has(design.groupBy))
    return { design: setGroupBy(next, null), dropped: dropped + 1 };
  return { design: next, dropped };
}

/* ---------- undo and redo ---------- */

export const newHistory = (present) => ({ past: [], present, future: [], key: null, at: 0 });

/** Records a change. Rapid edits of the same thing (typing in a box, dragging) count as one step. */
export function commit(h, next, key = null, now = Date.now()) {
  if (next === h.present) return h;
  const merge = key && key === h.key && now - h.at < 900;
  return {
    past: merge ? h.past : [...h.past, h.present].slice(-60),
    present: next,
    future: [],
    key,
    at: now,
  };
}
export const undo = (h) =>
  h.past.length
    ? {
        past: h.past.slice(0, -1),
        present: h.past[h.past.length - 1],
        future: [h.present, ...h.future],
        key: null,
        at: 0,
      }
    : h;
export const redo = (h) =>
  h.future.length
    ? { past: [...h.past, h.present], present: h.future[0], future: h.future.slice(1), key: null, at: 0 }
    : h;
