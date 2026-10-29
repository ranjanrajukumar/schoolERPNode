/**
 * Auto-numbering by formula. A formula is plain text with tokens, for example ADM-{YYYY}-{SEQ:4} gives ADM-2026-0007.
 * Tokens: {YYYY} year, {YY} two-digit year, {MM} month, {SEQ} or {SEQ:n} running number padded to n digits (n 1-9),
 * {TYPE} a caller-supplied label (certificates).
 */

const TOKEN = /\{(YYYY|YY|MM|TYPE|SEQ(?::([1-9]))?)\}/g;

/** Settings pattern: letters, digits, - _ . / and known tokens only, with a {SEQ} so every number stays unique. */
export const FORMULA_PATTERN = /^(?=.*\{SEQ(?::[1-9])?\})(?:[A-Za-z0-9\-_./]|\{(?:YYYY|YY|MM|TYPE|SEQ(?::[1-9])?)\})+$/;
export const FORMULA_HELP = 'letters, digits and dashes plus {YYYY} {YY} {MM} {TYPE} and a required {SEQ:4} (running number), e.g. ADM-{YYYY}-{SEQ:4}';

export function formatNumber(formula, { seq, date = new Date(), type = '' }) {
  const year = String(date.getFullYear());
  return formula.replace(TOKEN, (_, token, width) => {
    if (token === 'YYYY') return year;
    if (token === 'YY') return year.slice(2);
    if (token === 'MM') return String(date.getMonth() + 1).padStart(2, '0');
    if (token === 'TYPE') return type;
    return String(seq).padStart(Number(width) || 1, '0');
  });
}

/**
 * Next free number for `model.field`. Starts from the latest row id + 1 and skips numbers already taken
 * (typed by hand, or left by deleted rows), so the result is always unused.
 */
export async function nextNumber({ model, field, formula, transaction, type = '' }) {
  let seq = ((await model.max('id', { transaction })) || 0) + 1;
  for (;;) {
    const candidate = formatNumber(formula, { seq, type });
    if (!(await model.findOne({ where: { [field]: candidate }, attributes: ['id'], transaction }))) return candidate;
    seq += 1;
  }
}
