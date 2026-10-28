// The structure of the global database: schools and roles are lookup tables, and each login is one identities row that holds its own mobile number and password hash. Run with the service up; removes what it adds.
import assert from 'node:assert/strict';
import { after, describe, test } from 'node:test';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import { sequelize } from '../src/models/index.js';

dotenv.config();
const API = process.env.GLOBAL_URL || `http://localhost:${process.env.PORT || 4100}/api`;
const KEY = process.env.GLOBAL_ADMIN_KEY;
const RUN = Date.now().toString(36).slice(-5);
const made = [];

const call = async (method, path, { body, headers = {} } = {}) => {
  const res = await fetch(`${API}${path}`, { method, headers: { 'Content-Type': 'application/json', ...headers }, body: body ? JSON.stringify(body) : undefined });
  return { status: res.status, data: await res.json().catch(() => ({})) };
};
const school = async (suffix) => {
  const r = await call('POST', '/admin/clients', { body: { code: `sc${RUN}${suffix}`, name: `Schema School ${suffix}`, apiUrl: `https://${suffix}.example.test/api`, verify: false }, headers: { 'x-admin-key': KEY } });
  assert.equal(r.status, 201, JSON.stringify(r.data));
  made.push(r.data.code);
  return r.data;
};
const push = (s, identities) => call('POST', '/provision/identities', { body: { identities }, headers: { 'x-client-code': s.code, 'x-client-key': s.apiKey } });
const person = (id, over = {}) => ({ localUserId: id, role: 'teacher', name: `Person ${id}`, email: `s${id}.${RUN}@school.test`, passwordHash: bcrypt.hashSync('pw-pw-pw', 4), ...over });
const one = async (sql, replacements = {}) => (await sequelize.query(sql, { replacements }))[0];
const count = async (sql, replacements) => Number((await one(sql, replacements))[0].n);

after(async () => {
  for (const code of made) await call('DELETE', `/admin/clients/${code}`, { headers: { 'x-admin-key': KEY } });
  await sequelize.close();
});

describe('the structure of the global database', () => {
  test('schools and roles are lookup tables, a login is one row, and the references are enforced', async () => {
    const tables = (await one('SHOW TABLES')).map((r) => Object.values(r)[0]);
    for (const t of ['clients', 'roles', 'identities']) assert.ok(tables.includes(t), `table ${t}`);
    for (const gone of ['identities_legacy', 'mobile_numbers', 'credentials']) assert.ok(!tables.includes(gone), `${gone} is gone`);

    const columns = async (t) => (await one(`SHOW COLUMNS FROM \`${t}\``)).map((c) => c.Field);
    const identity = await columns('identities');
    for (const wanted of ['client_id', 'role_id', 'mobile', 'password_hash']) assert.ok(identity.includes(wanted), `identities.${wanted}`);
    for (const unwanted of ['client_code', 'role', 'mobile_number_id', 'mobile_key']) assert.ok(!identity.includes(unwanted), `identities no longer has ${unwanted}`);

    const keys = await one(`SELECT k.table_name t, k.column_name c, k.referenced_table_name r, rc.delete_rule d
      FROM information_schema.key_column_usage k JOIN information_schema.referential_constraints rc ON rc.constraint_name = k.constraint_name AND rc.constraint_schema = k.constraint_schema
      WHERE k.table_schema = DATABASE() AND k.referenced_table_name IS NOT NULL`);
    const has = (t, c, r, d) => keys.some((k) => k.t === t && k.c === c && k.r === r && k.d === d);
    assert.ok(has('identities', 'client_id', 'clients', 'CASCADE'), 'a school removed takes its logins');
    assert.ok(has('identities', 'role_id', 'roles', 'RESTRICT'), 'a role in use cannot be removed');

    assert.deepEqual((await one('SELECT code FROM roles ORDER BY code')).map((r) => r.code), ['accountant', 'admin', 'parent', 'student', 'teacher']);
    await assert.rejects(() => sequelize.query("DELETE FROM roles WHERE code = 'teacher'"), 'the database refuses to drop a role that logins use');
  });

  test('each login keeps its own mobile number (its last ten digits) and its own password hash', async () => {
    const a = await school('a');
    const b = await school('b');
    const mobile = `7${Math.floor(10 ** 8 + Math.random() * 8 * 10 ** 8)}`;
    await push(a, [person(1, { role: 'parent', mobile: `+91 ${mobile}` }), person(2, { role: 'student', mobile })]);
    await push(b, [person(3, { role: 'teacher', mobile: `0${mobile}` })]);
    assert.equal(await count('SELECT COUNT(*) n FROM identities WHERE mobile = :k', { k: mobile.slice(-10) }), 3, 'three logins at two schools match the same ten digits');
    const stored = await one('SELECT i.mobile, i.password_hash h FROM identities i JOIN clients c ON c.id = i.client_id WHERE c.code = :code AND i.local_user_id = 1', { code: a.code });
    assert.equal(stored[0].mobile, mobile.slice(-10), 'the number is kept as its last ten digits, without country code or zero');
    assert.ok(/^\$2[aby]\$/.test(stored[0].h), 'the password hash is on the same row');
    assert.equal(await count('SELECT COUNT(*) n FROM identities i JOIN clients cl ON cl.id = i.client_id WHERE cl.code IN (:codes) AND i.password_hash IS NOT NULL', { codes: [a.code, b.code] }), 3);

    // changing a login's number or password updates its own row
    const other = `6${Math.floor(10 ** 8 + Math.random() * 8 * 10 ** 8)}`;
    await push(b, [person(3, { role: 'teacher', mobile: other, passwordHash: bcrypt.hashSync('new-pw-pw', 4) })]);
    assert.equal(await count('SELECT COUNT(*) n FROM identities WHERE mobile = :k', { k: mobile.slice(-10) }), 2, 'the first school still has the old number');
    assert.equal(await count('SELECT COUNT(*) n FROM identities WHERE mobile = :k', { k: other.slice(-10) }), 1);
    const row = (await one('SELECT i.password_hash h FROM identities i JOIN clients c ON c.id = i.client_id WHERE c.code = :code AND i.local_user_id = 3', { code: b.code }))[0];
    assert.ok(bcrypt.compareSync('new-pw-pw', row.h), 'the new password hash replaced the old one');
  });

  test('removing a school removes its logins, with their numbers and passwords', async () => {
    const s = await school('c');
    const mobile = `5${Math.floor(10 ** 8 + Math.random() * 8 * 10 ** 8)}`;
    await push(s, [person(10, { mobile }), person(11, { email: `s11b.${RUN}@school.test` })]);
    const where = { code: s.code };
    assert.equal(await count('SELECT COUNT(*) n FROM identities i JOIN clients c ON c.id = i.client_id WHERE c.code = :code', where), 2);
    const ids = (await one('SELECT i.id FROM identities i JOIN clients c ON c.id = i.client_id WHERE c.code = :code', where)).map((r) => r.id);
    assert.equal((await call('DELETE', `/admin/clients/${s.code}`, { headers: { 'x-admin-key': KEY } })).status, 200);
    made.splice(made.indexOf(s.code), 1);
    assert.equal(await count('SELECT COUNT(*) n FROM identities WHERE id IN (:ids)', { ids }), 0, 'no orphaned logins');
    assert.equal(await count('SELECT COUNT(*) n FROM identities WHERE mobile = :k', { k: mobile.slice(-10) }), 0, 'and no number left behind');
    assert.equal(await count('SELECT COUNT(*) n FROM identities WHERE client_id NOT IN (SELECT id FROM clients)'), 0, 'nothing in the table points at a school that is not there');
  });
});
