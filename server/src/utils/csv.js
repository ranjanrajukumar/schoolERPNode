/** Minimal CSV reading and writing (RFC 4180 quoting). */

// A cell that starts with one of these is read as a formula by Excel and Sheets, so exported text is prefixed with a quote.
const FORMULA_START = /^[=+\-@\t\r]/;

const cell = (value) => {
  if (value === null || value === undefined) return '';
  let text = value instanceof Date ? value.toISOString().slice(0, 10) : String(value);
  if (typeof value === 'string' && FORMULA_START.test(text)) text = `'${text}`;
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
};

/** columns: [{ key, label }]; rows: plain objects. */
export function toCsv(columns, rows) {
  const lines = [columns.map((c) => cell(c.label)).join(',')];
  for (const row of rows) lines.push(columns.map((c) => cell(row[c.key])).join(','));
  return `﻿${lines.join('\r\n')}\r\n`; // BOM so Excel reads UTF-8
}

/** Returns an array of rows, each an array of strings. Blank lines are skipped. */
export function parseCsv(input) {
  const text = String(input ?? '').replace(/^﻿/, '');
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') { field += '"'; i += 1; } else if (ch === '"') quoted = false; else field += ch;
    } else if (ch === '"' && field === '') quoted = true;
    else if (ch === ',') { row.push(field); field = ''; } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i += 1;
      row.push(field); field = '';
      if (row.some((v) => v.trim() !== '')) rows.push(row);
      row = [];
    } else field += ch;
  }
  row.push(field);
  if (row.some((v) => v.trim() !== '')) rows.push(row);
  return rows;
}
