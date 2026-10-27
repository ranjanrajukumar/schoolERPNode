import { RecordExtra } from '../../models/index.js';

/** Reads and writes a record's detailed particulars (see the RecordExtra model). Values are plain JSON: text, numbers, true/false, and the qualifications list. */
const parse = (text) => { try { const v = text ? JSON.parse(text) : {}; return v && typeof v === 'object' && !Array.isArray(v) ? v : {}; } catch { return {}; } };

export async function loadExtras(entity, id, transaction) {
  const row = await RecordExtra.findOne({ where: { entity, entityId: id }, transaction });
  return parse(row?.data);
}

/** Merges `values` into the record's particulars; a null or empty value clears that field. */
export async function saveExtras(entity, id, values, transaction) {
  if (!values || !Object.keys(values).length) return;
  const row = await RecordExtra.findOne({ where: { entity, entityId: id }, transaction });
  const next = { ...parse(row?.data), ...values };
  for (const [k, v] of Object.entries(next)) if (v === null || v === undefined || v === '' || (Array.isArray(v) && !v.length)) delete next[k];
  const data = JSON.stringify(next);
  if (row) await row.update({ data }, { transaction });
  else await RecordExtra.create({ entity, entityId: id, data }, { transaction });
}
