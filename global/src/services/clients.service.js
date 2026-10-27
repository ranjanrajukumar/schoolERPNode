import crypto from 'node:crypto';
import { Op } from 'sequelize';
import { Client, Identity } from '../models/index.js';
import { badRequest, conflict, notFound } from '../utils/httpError.js';
import { pruneMobileNumbers } from './provision.service.js';

const CODE = /^[a-z0-9][a-z0-9-]{1,29}$/;

/** What the app is told about a school: enough to show it, and to find its server. Never the notes. */
export const publicShape = (c) => ({ code: c.code, name: c.name, city: c.city ?? null, state: c.state ?? null, logoUrl: c.logoUrl ?? null, apiUrl: c.apiUrl });
export const adminShape = (c, logins = 0) => ({ ...publicShape(c), id: c.id, active: c.active, hasKey: Boolean(c.apiKeyHash), logins, lastSyncAt: c.lastSyncAt ?? null, notes: c.notes ?? null, createdAt: c.createdAt, updatedAt: c.updatedAt });

const hashKey = (key) => crypto.createHash('sha256').update(String(key)).digest('hex');
const newKey = () => crypto.randomBytes(24).toString('hex');

/** True when `key` is the key issued to this school. Compared in constant time. */
export async function verifyClientKey(code, key) {
  const row = await Client.findOne({ where: { code: String(code ?? '').toLowerCase(), active: true } });
  if (!row?.apiKeyHash || !key) return null;
  const a = Buffer.from(hashKey(key));
  const b = Buffer.from(row.apiKeyHash);
  return a.length === b.length && crypto.timingSafeEqual(a, b) ? row : null;
}

/** A new key for the school's server; the old one stops working. The key is returned once and only its hash is kept. */
export async function rotateKey(code) {
  const row = await Client.findOne({ where: { code: String(code).toLowerCase() } });
  if (!row) throw notFound('No school has that code');
  const apiKey = newKey();
  await row.update({ apiKeyHash: hashKey(apiKey), updatedAt: new Date() });
  return { code: row.code, apiKey };
}

const text = (v) => (v === undefined || v === null || String(v).trim() === '' ? null : String(v).trim());

function checkUrl(value, label, { required }) {
  const v = text(value);
  if (!v) { if (required) throw badRequest(`${label} is required`); return null; }
  let url;
  try { url = new URL(v); } catch { throw badRequest(`${label} must be a full address starting with http:// or https://`); }
  if (!['http:', 'https:'].includes(url.protocol)) throw badRequest(`${label} must start with http:// or https://`);
  return v.replace(/\/+$/, '');
}

/** The editable fields of a school, checked. With `partial`, only the fields that were sent. */
export function clean(body = {}, { partial = false } = {}) {
  const out = {};
  const has = (k) => body[k] !== undefined;
  if (!partial || has('code')) {
    const code = String(body.code ?? '').trim().toLowerCase();
    if (!CODE.test(code)) throw badRequest('The school code is 2 to 30 characters: lower-case letters, numbers and hyphens, starting with a letter or number');
    out.code = code;
  }
  if (!partial || has('name')) {
    const name = text(body.name);
    if (!name || name.length > 120) throw badRequest('The school name is required and can be at most 120 characters');
    out.name = name;
  }
  for (const [key, label, max] of [['city', 'City', 80], ['state', 'State', 80], ['notes', 'Notes', 300]]) {
    if (!partial || has(key)) {
      const v = text(body[key]);
      if (v && v.length > max) throw badRequest(`${label} can be at most ${max} characters`);
      out[key] = v;
    }
  }
  if (!partial || has('logoUrl')) out.logoUrl = checkUrl(body.logoUrl, 'The logo address', { required: false });
  if (!partial || has('apiUrl')) out.apiUrl = checkUrl(body.apiUrl, 'The API address', { required: true });
  if (has('active')) out.active = Boolean(body.active);
  return out;
}

/** Asks the school's own server whether it answers, so a typo is caught when the school is added and not when a parent tries to sign in. */
export async function verifyApi(apiUrl) {
  try {
    const res = await fetch(`${apiUrl}/health`, { signal: AbortSignal.timeout(6000) });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || data.ok !== true) throw new Error(`answered ${res.status}`);
  } catch (err) {
    throw badRequest(`The school's server did not answer at ${apiUrl}/health (${err.name === 'TimeoutError' ? 'timed out' : err.message}). Check the address, or skip the check.`);
  }
}

const escapeLike = (s) => s.replace(/[\\%_]/g, (m) => `\\${m}`);

/** Active schools whose name, city or code matches what was typed; at least two characters. */
export async function search(q, limit = 20) {
  const needle = String(q ?? '').trim().toLowerCase();
  if (needle.length < 2) return [];
  const like = { [Op.like]: `%${escapeLike(needle)}%` };
  const rows = await Client.findAll({
    where: { active: true, [Op.or]: [{ name: like }, { city: like }, { code: like }] },
    order: [['name', 'ASC']],
    limit: Math.min(Math.max(Number(limit) || 20, 1), 30),
  });
  return rows.map(publicShape);
}

export async function findActiveByCode(code) {
  const row = await Client.findOne({ where: { code: String(code ?? '').trim().toLowerCase(), active: true } });
  if (!row) throw notFound('No school has that code');
  return publicShape(row);
}

/** Every school, with how many active logins it has reported and when it last reported. */
export async function listAll() {
  const rows = await Client.findAll({ order: [['name', 'ASC']] });
  const counts = new Map((await Identity.findAll({ attributes: ['clientId', [Identity.sequelize.fn('COUNT', Identity.sequelize.col('id')), 'n']], where: { active: true }, group: ['clientId'], raw: true })).map((r) => [r.clientId, Number(r.n)]));
  return rows.map((c) => adminShape(c, counts.get(c.id) ?? 0));
}

/** Asks a school's server whether it answers, and how fast. */
export async function checkSchool(code) {
  const row = await Client.findOne({ where: { code: String(code).toLowerCase() } });
  if (!row) throw notFound('No school has that code');
  const started = Date.now();
  try { await verifyApi(row.apiUrl); return { ok: true, ms: Date.now() - started }; } catch (err) { return { ok: false, error: err.message }; }
}

export async function create(body, { verify = true } = {}) {
  const data = clean(body);
  if (await Client.findOne({ where: { code: data.code } })) throw conflict(`The code "${data.code}" is already taken`);
  if (verify) await verifyApi(data.apiUrl);
  const apiKey = newKey();
  const row = await Client.create({ active: true, ...data, apiKeyHash: hashKey(apiKey) });
  return { ...adminShape(row), apiKey }; // shown once: the school's server needs it to push its logins here
}

export async function update(code, body, { verify = false } = {}) {
  const row = await Client.findOne({ where: { code: String(code).toLowerCase() } });
  if (!row) throw notFound('No school has that code');
  const data = clean(body, { partial: true });
  if (data.code && data.code !== row.code && (await Client.findOne({ where: { code: data.code } }))) throw conflict(`The code "${data.code}" is already taken`);
  if (verify && data.apiUrl) await verifyApi(data.apiUrl);
  await row.update({ ...data, updatedAt: new Date() });
  return adminShape(row);
}

export async function remove(code) {
  const row = await Client.findOne({ where: { code: String(code).toLowerCase() } });
  if (!row) throw notFound('No school has that code');
  await row.destroy(); // its logins and their passwords go with it (foreign keys)
  await pruneMobileNumbers();
}
