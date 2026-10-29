// Checks of sign-in and provisioning in the global registry. Run with the service up (npm start in global/); removes what it adds.
import assert from 'node:assert/strict';
import { after, describe, test } from 'node:test';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';

dotenv.config();
const API = process.env.GLOBAL_URL || `http://localhost:${process.env.PORT || 4100}/api`;
const ADMIN_KEY = process.env.GLOBAL_ADMIN_KEY;
const RUN = Date.now().toString(36).slice(-5);
const made = [];

const call = async (method, path, { body, headers = {} } = {}) => {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...headers },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: res.status, data: await res.json().catch(() => ({})) };
};
const admin = (method, path, body) => call(method, path, { body, headers: { 'x-admin-key': ADMIN_KEY } });
const school = async (suffix) => {
  const r = await admin('POST', '/admin/clients', {
    code: `id${RUN}${suffix}`,
    name: `Identity School ${suffix} ${RUN}`,
    apiUrl: `https://${suffix}.example.test/api`,
    verify: false,
  });
  assert.equal(r.status, 201, JSON.stringify(r.data));
  made.push(r.data.code);
  return r.data; // includes apiKey
};
const push = (s, identities, extra = {}) =>
  call('POST', '/provision/identities', {
    body: { identities, ...extra },
    headers: { 'x-client-code': s.code, 'x-client-key': s.apiKey },
  });
const hash = (pw) => bcrypt.hashSync(pw, 4);
const person = (id, over = {}) => ({
  localUserId: id,
  role: 'teacher',
  name: `Person ${id}`,
  email: `p${id}.${RUN}@school.test`,
  mobile: null,
  passwordHash: hash('right-password'),
  ...over,
});
const signIn = (identifier, password = 'right-password') =>
  call('POST', '/auth/login', { body: { identifier, password } });

after(async () => {
  for (const code of made) await admin('DELETE', `/admin/clients/${code}`);
});

describe('provisioning', () => {
  test('a school needs its own key, and a new key replaces the old', async () => {
    const s = await school('a');
    assert.match(s.apiKey, /^[0-9a-f]{48}$/, 'the key is shown once');
    assert.equal(
      (await admin('GET', '/admin/clients')).data.find((c) => c.code === s.code).apiKey,
      undefined,
      'and never listed',
    );
    assert.equal((await push({ code: s.code, apiKey: 'wrong' }, [person(1)])).status, 401, 'wrong key');
    assert.equal(
      (await call('POST', '/provision/identities', { body: { identities: [] } })).status,
      401,
      'no key',
    );
    const other = await school('b');
    assert.equal(
      (await push({ code: s.code, apiKey: other.apiKey }, [person(1)])).status,
      401,
      "another school's key",
    );
    assert.equal((await push(s, [person(1)])).data.created, 1);
    const fresh = (await admin('POST', `/admin/clients/${s.code}/rotate-key`)).data;
    assert.equal((await push(s, [person(1)])).status, 401, 'the old key stops working');
    assert.equal((await push({ code: s.code, apiKey: fresh.apiKey }, [person(1)])).data.updated, 1);
  });

  test('what a school sends is checked', async () => {
    const s = await school('c');
    assert.equal(
      (await push(s, [person(1, { passwordHash: 'plain-text-password' })])).status,
      400,
      'only a bcrypt hash, never a password',
    );
    assert.equal((await push(s, [person(1, { role: 'wizard' })])).status, 400, 'a known role');
    assert.equal(
      (await push(s, [person(1, { email: null, mobile: null, username: null })])).status,
      400,
      'something to sign in with',
    );
    assert.equal((await push(s, [person(1, { email: 'not an email' })])).status, 400);
    assert.equal((await push(s, [person(1, { name: '' })])).status, 400);
    assert.equal((await push(s, [person(0)])).status, 400, 'a real local id');
    assert.equal((await push(s, [person(2), person(2)])).status, 400, 'a login is listed once');
    assert.equal((await push(s, 'nope')).status, 400, 'a list');
    assert.equal((await push(s, [])).status, 200, 'an empty list is fine');
  });

  test('a complete list switches off logins the school no longer has', async () => {
    const s = await school('d');
    assert.deepEqual((await push(s, [person(101), person(102), person(103)], { full: true })).data, {
      created: 3,
      updated: 0,
      deactivated: 0,
    });
    assert.equal((await signIn(`p102.${RUN}@school.test`)).status, 200);
    assert.deepEqual((await push(s, [person(101), person(103)], { full: true })).data, {
      created: 0,
      updated: 2,
      deactivated: 1,
    });
    assert.equal(
      (await signIn(`p102.${RUN}@school.test`)).status,
      401,
      'a login deleted at the school stops working in the app',
    );
    assert.equal((await signIn(`p101.${RUN}@school.test`)).status, 200);
    assert.equal(
      (
        await call('DELETE', '/provision/identities/101', {
          headers: { 'x-client-code': s.code, 'x-client-key': s.apiKey },
        })
      ).data.deactivated,
      1,
    );
    assert.equal(
      (await signIn(`p101.${RUN}@school.test`)).status,
      401,
      'one login can be switched off on its own',
    );
    assert.equal((await push(s, [person(101, { active: false })])).status, 200);
    assert.equal(
      (
        await call('GET', '/provision/status', {
          headers: { 'x-client-code': s.code, 'x-client-key': s.apiKey },
        })
      ).data.logins,
      1,
    );
  });
});

describe('signing in', () => {
  test('a mobile number, an email or an admission number finds the school and role; a password is needed', async () => {
    const s = await school('e');
    const mobile = `9${Math.floor(10 ** 8 + Math.random() * 8 * 10 ** 8)}`;
    await push(s, [
      person(10, {
        role: 'parent',
        name: 'Parent Ten',
        mobile: `+91 ${mobile.slice(0, 5)} ${mobile.slice(5)}`,
        email: `parent.${RUN}@school.test`,
      }),
      person(11, {
        role: 'student',
        name: 'Student Eleven',
        email: `adm11.${RUN}@student.school`,
        username: `ADM${RUN}`,
        mobile,
      }),
    ]);

    // the same phone, written four ways, is the same phone
    for (const written of [
      mobile,
      `+91${mobile}`,
      `0${mobile}`,
      `${mobile.slice(0, 5)} ${mobile.slice(5)}`,
    ]) {
      const r = await signIn(written);
      assert.equal(r.status, 200, written);
      assert.deepEqual(
        r.data.accounts.map((a) => a.role).sort(),
        ['parent', 'student'],
        'a parent and a child who share a phone are both offered',
      );
    }
    const parent = (await signIn(`parent.${RUN}@school.test`)).data.accounts;
    assert.equal(parent.length, 1, 'by email only that login');
    assert.deepEqual(
      [parent[0].clientCode, parent[0].role, parent[0].name, parent[0].apiUrl],
      [s.code, 'parent', 'Parent Ten', `https://e.example.test/api`],
    );
    assert.equal(
      (await signIn(`adm${RUN}`)).data.accounts[0].role,
      'student',
      'by admission number, any case',
    );
    assert.equal((await signIn(`ADM${RUN}`.toUpperCase())).status, 200);
    assert.equal((await signIn(mobile, 'wrong')).status, 401);
    assert.equal((await signIn(mobile, '')).status, 401);
    assert.equal((await signIn('', 'right-password')).status, 401);
    assert.equal((await signIn('9000000000')).status, 401, 'nobody has that phone');
    assert.equal(
      (await signIn(mobile, 'wrong')).data.error,
      (await signIn('9000000000')).data.error,
      'a stranger and a wrong password get the same answer',
    );
    assert.equal((await signIn(`%${RUN}`)).status, 401, 'wildcards are literal');
  });

  test('only the accounts whose password matches are offered', async () => {
    const a = await school('f');
    const b = await school('g');
    const mobile = `8${Math.floor(10 ** 8 + Math.random() * 8 * 10 ** 8)}`;
    await push(a, [
      person(20, { role: 'teacher', name: 'Teaches At F', mobile, passwordHash: hash('shared-pass') }),
    ]);
    await push(b, [
      person(21, { role: 'parent', name: 'Parent At G', mobile, passwordHash: hash('shared-pass') }),
      person(22, { role: 'student', name: 'Kid At G', mobile, passwordHash: hash('other-pass') }),
    ]);
    const both = (await signIn(mobile, 'shared-pass')).data.accounts;
    assert.deepEqual(
      both.map((x) => `${x.role}@${x.clientCode}`).sort(),
      [`parent@${b.code}`, `teacher@${a.code}`].sort(),
      'one person at two schools chooses which',
    );
    assert.deepEqual(
      (await signIn(mobile, 'other-pass')).data.accounts.map((x) => x.role),
      ['student'],
      'a different password reaches a different login',
    );
  });

  test('a school that is switched off, or a login that is, is not offered', async () => {
    const s = await school('h');
    await push(s, [person(30)]);
    assert.equal((await signIn(`p30.${RUN}@school.test`)).status, 200);
    await admin('PUT', `/admin/clients/${s.code}`, { active: false });
    assert.equal((await signIn(`p30.${RUN}@school.test`)).status, 401, 'the school is off');
    assert.equal((await push(s, [person(30)])).status, 401, 'and may not push');
    await admin('PUT', `/admin/clients/${s.code}`, { active: true });
    assert.equal((await signIn(`p30.${RUN}@school.test`)).status, 200);
  });

  test('the ticket is signed for that school and person, and lasts two minutes', async () => {
    const s = await school('i');
    await push(s, [person(40, { role: 'student' })]);
    const { publicKey } = (await call('GET', '/public-key')).data;
    const account = (await signIn(`p40.${RUN}@school.test`)).data.accounts[0];
    const claims = jwt.verify(account.ticket, publicKey, {
      algorithms: ['RS256'],
      issuer: 'schoolerp-global',
    });
    assert.deepEqual([claims.cc, claims.uid, claims.role], [s.code, 40, 'student']);
    assert.ok(claims.exp - claims.iat <= 120, 'two minutes at most');
    assert.ok(claims.jti, 'each ticket has its own id, so a school can refuse a second use');
    assert.notEqual((await signIn(`p40.${RUN}@school.test`)).data.accounts[0].ticket, account.ticket);
    assert.throws(
      () => jwt.verify(account.ticket.slice(0, -4) + 'AAAA', publicKey, { algorithms: ['RS256'] }),
      'a changed ticket does not verify',
    );
    assert.throws(() => jwt.verify(account.ticket, 'not the key', { algorithms: ['RS256'] }));
  });

  test('repeated wrong passwords are slowed down', async () => {
    const s = await school('j');
    await push(s, [person(50, { email: `lock.${RUN}@school.test` })]);
    let last;
    for (let i = 0; i < 9; i += 1) last = await signIn(`lock.${RUN}@school.test`, `wrong-${i}`);
    assert.equal(last.status, 429, 'after eight failures this phone or email waits');
    assert.equal(
      (await signIn(`lock.${RUN}@school.test`)).status,
      429,
      'even with the right password, for now',
    );
    assert.equal(
      (await signIn(`p50.${RUN}@school.test`)).status,
      401,
      'another login is not affected (and does not exist)',
    );
  });
});
