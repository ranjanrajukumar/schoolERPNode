import { pageGeometry, validateTemplate } from './templateSchema.js';

/**
 * Turns a table-style report (a dataset, the columns to show) into a printable design for the report engine: a title, column headings
 * that repeat on every page, one detail row per record, and page numbers. This is what Print produces, so only the report prints,
 * with none of the screen around it.
 */
const MONEY = /amount|balance|paid|fee|price/i;
const DATE = /date|dob|on$/i;
const GAP = 4;

const headingOf = (field) => {
  const words = field.replace(/([a-z0-9])([A-Z])/g, '$1 $2').toLowerCase();
  return words.charAt(0).toUpperCase() + words.slice(1);
};

const formatOf = (field) => (MONEY.test(field) ? 'currency' : DATE.test(field) ? 'date' : 'text');

/** A design for `columns` of `dataset`. Wide tables go on a landscape page, and every column gets an equal share of the width. */
export function tableDesign({ title, dataset, columns, allColumns }) {
  if (!columns?.length) throw new Error('A report needs at least one column');
  const orientation = columns.length > 6 ? 'landscape' : 'portrait';
  const page = { size: 'A4', orientation, margins: [28, 28, 28, 28] };
  const { contentWidth } = pageGeometry(page);
  const each = Math.floor((contentWidth / columns.length) * 10) / 10;
  const size = columns.length > 10 ? 7 : 8;
  const at = (i) => ({ x: Math.round(i * each * 10) / 10, width: Math.round((each - GAP) * 10) / 10 });

  const design = {
    version: 1,
    title: title || 'Report',
    dataset,
    page,
    bands: {
      reportHeader: {
        height: 34,
        elements: [
          {
            type: 'text',
            x: 0,
            y: 4,
            width: contentWidth,
            height: 22,
            text: '{{title}}',
            bold: true,
            size: 14,
            color: '#1f3a6e',
          },
        ],
      },
      pageHeader: {
        height: 22,
        elements: [
          ...columns.map((c, i) => ({
            type: 'text',
            ...at(i),
            y: 5,
            height: 12,
            text: headingOf(c),
            bold: true,
            size,
            align: formatOf(c) === 'currency' ? 'right' : 'left',
          })),
          { type: 'line', x: 0, y: 19, width: contentWidth, height: 0, color: '#1f3a6e' },
        ],
      },
      detail: {
        height: 14,
        elements: columns.map((c, i) => ({
          type: 'field',
          field: c,
          ...at(i),
          y: 1,
          height: 12,
          size,
          format: formatOf(c),
        })),
      },
      pageFooter: {
        height: 22,
        elements: [
          { type: 'line', x: 0, y: 2, width: contentWidth, height: 0, color: '#cccccc' },
          {
            type: 'text',
            x: 0,
            y: 7,
            width: contentWidth / 2,
            height: 10,
            text: 'Printed {{printedOn}}',
            size: 8,
            color: '#888888',
          },
          {
            type: 'pageNumber',
            x: contentWidth / 2,
            y: 7,
            width: contentWidth / 2,
            height: 10,
            text: 'Page {{page}} of {{pages}}',
            size: 8,
            align: 'right',
            color: '#888888',
          },
        ],
      },
    },
  };
  // the same checks as any saved design: only real columns of the dataset, everything inside the page
  return validateTemplate(design, allColumns ?? columns);
}
