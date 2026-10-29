import test from 'node:test';
import assert from 'node:assert/strict';
import { FORMULA_PATTERN, formatNumber, nextNumber } from '../src/utils/numbering.js';

const date = new Date(2026, 3, 9);

test('formula tokens', () => {
  assert.equal(formatNumber('ADM-{YYYY}-{SEQ:4}', { seq: 7, date }), 'ADM-2026-0007');
  assert.equal(formatNumber('{YY}{MM}/{SEQ}', { seq: 12, date }), '2604/12');
  assert.equal(formatNumber('{TYPE}-{YYYY}-{SEQ:5}', { seq: 3, date, type: 'TC' }), 'TC-2026-00003');
});

test('formula pattern needs a SEQ and only known tokens', () => {
  assert.ok(FORMULA_PATTERN.test('LIB-{SEQ:5}'));
  assert.ok(!FORMULA_PATTERN.test('LIB-{YYYY}'));
  assert.ok(!FORMULA_PATTERN.test('X-{FOO}-{SEQ}'));
});

test('nextNumber skips numbers already taken', async () => {
  const taken = new Set(['A-1', 'A-2']);
  const model = { max: async () => 0, findOne: async ({ where }) => (taken.has(where.code) ? { id: 1 } : null) };
  assert.equal(await nextNumber({ model, field: 'code', formula: 'A-{SEQ}' }), 'A-3');
});

test('every numbering setting default is a valid formula', async () => {
  const { NUMBERING_SETTINGS } = await import('../src/modules/settings/numbering.settings.js');
  assert.equal(NUMBERING_SETTINGS.length, 5);
  for (const s of NUMBERING_SETTINGS) assert.ok(FORMULA_PATTERN.test(s.default), s.key);
});
