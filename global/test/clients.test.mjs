// Checks of the global registry. Run with the service up (npm start in global/); uses GLOBAL_ADMIN_KEY from global/.env and removes what it adds.
import assert from 'node:assert/strict';
import { after, describe, test } from 'node:test';
import dotenv from 'dotenv';

dotenv.config();
const API = process.env.GLOBAL_URL || `http://localhost:${process.env.PORT || 4100}/api`;
const KEY = process.env.GLOBAL_ADMIN_KEY;
const RUN = Date.now().toString(36).slice(-6);
const made = [];

const call = async (method, path, { body, key = KEY } = {}) => {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(key && { 'x-admin-key': key }) },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: res.status, data: await res.json().catch(() => ({})) };
};
const add = async (extra = {}) => {
  const body = {
    code: `t${RUN}${made.length}`,
    name: `Test School ${RUN}`,
    city: 'Testville',
    apiUrl: 'https://erp.example.test/api',
    verify: false,
    ...extra,
  };
  const r = await call('POST', '/admin/clients', { body });
  if (r.status === 201) made.push(r.data.code);
  return r;
};
after(async () => {
  for (const code of made) await call('DELETE', `/admin/clients/${code}`);
});

describe('global registry', () => {
  test('answers, and the admin API needs the key', async () => {
    assert.equal((await call('GET', '/health')).data.ok, true);
    assert.equal((await call('GET', '/admin/clients', { key: null })).status, 401, 'no key');
    assert.equal((await call('GET', '/admin/clients', { key: 'wrong' })).status, 401, 'wrong key');
    assert.equal((await call('GET', '/admin/clients')).status, 200);
  });

  test('a school is added with its checks, and cannot be added twice', async () => {
    const ok = await add({
      code: `Add-${RUN}`,
      name: '  Added School  ',
      apiUrl: 'https://erp.added.test/api/',
      city: '',
    });
    assert.equal(ok.status, 201, JSON.stringify(ok.data));
    assert.equal(ok.data.code, `add-${RUN}`, 'the code is lower-cased');
    assert.equal(ok.data.name, 'Added School', 'text is trimmed');
    assert.equal(ok.data.apiUrl, 'https://erp.added.test/api', 'a trailing slash is dropped');
    assert.equal(ok.data.city, null, 'an empty value is kept as nothing');
    assert.equal((await add({ code: `add-${RUN}` })).status, 409, 'the code is taken');
    assert.equal((await add({ code: 'x' })).status, 400, 'a code is 2 to 30 characters');
    assert.equal((await add({ code: 'Bad Code!' })).status, 400, 'letters, numbers and hyphens only');
    assert.equal((await add({ code: `n${RUN}`, name: '' })).status, 400, 'a name is needed');
    assert.equal(
      (await add({ code: `u${RUN}`, apiUrl: 'not a url' })).status,
      400,
      'the address must be a URL',
    );
    assert.equal(
      (await add({ code: `f${RUN}`, apiUrl: 'ftp://erp.example.test' })).status,
      400,
      'http or https only',
    );
    assert.equal((await add({ code: `m${RUN}`, apiUrl: '' })).status, 400, 'an address is needed');
    assert.equal(
      (await add({ code: `l${RUN}`, logoUrl: 'javascript:alert(1)' })).status,
      400,
      'a logo address is a web address too',
    );
  });

  test("the school's own server is asked to answer before it is added", async () => {
    const dead = await add({
      code: `dead${RUN}`.slice(0, 20),
      apiUrl: 'http://127.0.0.1:9/api',
      verify: true,
    });
    assert.equal(dead.status, 400);
    assert.match(dead.data.error, /did not answer/);
    const live = await add({ code: `live${RUN}`.slice(0, 20), apiUrl: API, verify: true }); // the registry itself answers /health with ok
    assert.equal(live.status, 201, JSON.stringify(live.data));
  });

  test('the app finds schools by name, city or code, and learns only what it needs', async () => {
    const a = await add({
      code: `find${RUN}`,
      name: `Greenfield Public ${RUN}`,
      city: 'Nagpur',
      notes: 'internal: contract ends 2027',
    });
    assert.equal(a.status, 201);
    const found = (q) => call('GET', `/clients?q=${encodeURIComponent(q)}`, { key: null });
    const byName = await found(`greenfield public ${RUN}`);
    assert.equal(byName.data.length, 1, 'by name, any case');
    assert.deepEqual(
      Object.keys(byName.data[0]).sort(),
      ['apiUrl', 'city', 'code', 'logoUrl', 'name', 'state'],
      'no notes, ids or dates',
    );
    assert.equal(
      (await found('nagpur')).data.some((c) => c.code === `find${RUN}`),
      true,
      'by city',
    );
    assert.equal((await found(`find${RUN}`)).data.length, 1, 'by code');
    assert.deepEqual((await found('g')).data, [], 'one character asks for too much');
    assert.deepEqual((await found('%%')).data, [], 'wildcards are literal');
    assert.deepEqual((await found('_a')).data, [], 'so are underscores');
    assert.equal(
      (await call('GET', `/clients/${a.data.code.toUpperCase()}`, { key: null })).data.name,
      `Greenfield Public ${RUN}`,
      'by exact code, any case',
    );
    assert.equal((await call('GET', '/clients/nosuchschool', { key: null })).status, 404);
    assert.ok(
      (await call('GET', `/clients?q=${encodeURIComponent('test school')}&limit=1`, { key: null })).data
        .length <= 1,
      'the limit applies',
    );
  });

  test('a school can be renamed, switched off and back on, and removed', async () => {
    const a = await add({ code: `chg${RUN}`, name: `Change Me ${RUN}` });
    assert.equal(
      (await call('PUT', `/admin/clients/${a.data.code}`, { body: { name: `Changed ${RUN}`, city: 'Pune' } }))
        .data.name,
      `Changed ${RUN}`,
    );
    assert.equal((await call('GET', `/clients?q=changed%20${RUN}`, { key: null })).data.length, 1);
    assert.equal(
      (await call('PUT', `/admin/clients/${a.data.code}`, { body: { active: false } })).data.active,
      false,
    );
    assert.equal(
      (await call('GET', `/clients?q=changed%20${RUN}`, { key: null })).data.length,
      0,
      'an inactive school is not offered',
    );
    assert.equal(
      (await call('GET', `/clients/${a.data.code}`, { key: null })).status,
      404,
      'nor found by code',
    );
    assert.equal(
      (await call('PUT', `/admin/clients/${a.data.code}`, { body: { active: true } })).data.active,
      true,
    );
    assert.equal(
      (await call('PUT', `/admin/clients/${a.data.code}`, { body: { code: `live${RUN}`.slice(0, 20) } }))
        .status,
      409,
      'a code cannot be moved onto another school',
    );
    assert.equal(
      (await call('PUT', `/admin/clients/${a.data.code}`, { body: { apiUrl: 'nope' } })).status,
      400,
    );
    assert.equal((await call('PUT', '/admin/clients/nosuchschool', { body: { name: 'x' } })).status, 404);
    assert.equal((await call('DELETE', `/admin/clients/${a.data.code}`)).status, 200);
    made.splice(made.indexOf(a.data.code), 1);
    assert.equal((await call('GET', `/clients/${a.data.code}`, { key: null })).status, 404);
    assert.equal((await call('DELETE', `/admin/clients/${a.data.code}`)).status, 404);
  });
});

describe('the admin page and what it shows', () => {
  test("the page is served, and the list carries each school's logins and last report", async () => {
    const page = await fetch(`${API.replace(/\/api$/, '')}/admin/`);
    assert.equal(page.status, 200);
    assert.match(page.headers.get('content-type'), /text\/html/);
    const html = await page.text();
    assert.ok(
      html.includes('School registry') && !html.includes(KEY ?? 'no-key-set'),
      'the page itself holds no secret',
    );
    assert.match(
      page.headers.get('content-security-policy') ?? '',
      /script-src 'self'/,
      'scripts only from this site',
    );
    assert.equal((await fetch(`${API.replace(/\/api$/, '')}/admin/admin.js`)).status, 200);

    const s = await add({ code: `pg${RUN}`, name: `Page School ${RUN}` });
    assert.equal(s.status, 201);
    const listed = (code) => call('GET', '/admin/clients').then((r) => r.data.find((c) => c.code === code));
    const before = await listed(s.data.code);
    assert.deepEqual([before.logins, before.lastSyncAt], [0, null], 'nothing reported yet');
    const bcrypt = (await import('bcryptjs')).default;
    const reported = await fetch(`${API}/provision/identities`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-client-code': s.data.code,
        'x-client-key': s.data.apiKey,
      },
      body: JSON.stringify({
        identities: [
          {
            localUserId: 1,
            role: 'teacher',
            name: 'T',
            email: `pg.${RUN}@school.test`,
            passwordHash: bcrypt.hashSync('x', 4),
          },
        ],
      }),
    });
    assert.equal(reported.status, 200);
    const after = await listed(s.data.code);
    assert.equal(after.logins, 1);
    assert.ok(Date.now() - new Date(after.lastSyncAt).getTime() < 10_000, 'the report time is kept');
    assert.equal(after.hasKey, true);
    assert.equal(after.apiKey, undefined, 'and the key is never listed');
  });

  test("a school's server can be checked on demand", async () => {
    const live = await add({ code: `chk${RUN}`, apiUrl: API });
    const ok = await call('POST', `/admin/clients/${live.data.code}/check`);
    assert.equal(ok.data.ok, true);
    assert.ok(Number.isInteger(ok.data.ms));
    const dead = await add({ code: `chd${RUN}`, apiUrl: 'http://127.0.0.1:9/api' });
    const bad = await call('POST', `/admin/clients/${dead.data.code}/check`);
    assert.equal(bad.status, 200);
    assert.equal(bad.data.ok, false);
    assert.match(bad.data.error, /did not answer/);
    assert.equal((await call('POST', '/admin/clients/nosuchschool/check')).status, 404);
    assert.equal(
      (await call('POST', `/admin/clients/${live.data.code}/check`, { key: null })).status,
      401,
      'the key is needed',
    );
  });
});
