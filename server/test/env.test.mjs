import assert from 'node:assert/strict';
import { test } from 'node:test';
import { assertEnvironment } from '../src/config/env.js';

const keys = ['NODE_ENV', 'DB_HOST', 'DB_USER', 'DB_NAME', 'JWT_SECRET', 'ADMIN_PASSWORD', 'CLIENT_ORIGIN'];

test('production startup rejects public credentials and missing staging origins', () => {
  const saved = Object.fromEntries(keys.map((key) => [key, process.env[key]]));
  try {
    Object.assign(process.env, {
      NODE_ENV: 'production',
      DB_HOST: 'db',
      DB_USER: 'school',
      DB_NAME: 'school',
      JWT_SECRET: 'a'.repeat(48),
      ADMIN_PASSWORD: 'admin123',
      CLIENT_ORIGIN: 'https://school.example',
    });
    assert.throws(assertEnvironment, /ADMIN_PASSWORD/);

    process.env.ADMIN_PASSWORD = 'a-unique-long-staging-password';
    delete process.env.CLIENT_ORIGIN;
    assert.throws(assertEnvironment, /CLIENT_ORIGIN/);

    process.env.CLIENT_ORIGIN = 'https://school.example';
    assert.doesNotThrow(assertEnvironment);
    process.env.JWT_SECRET = 'short';
    assert.throws(assertEnvironment, /32 characters/);
  } finally {
    for (const key of keys) {
      if (saved[key] === undefined) delete process.env[key];
      else process.env[key] = saved[key];
    }
  }
});
