import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';

// The repair logic is exercised in a separate process because it needs its own database connection
// (a throwaway database, never the real one).
test('missing foreign keys are repaired safely (scratch database)', () => {
  const script = fileURLToPath(new URL('./integrity.fk.mjs', import.meta.url));
  const run = spawnSync(process.execPath, [script], { encoding: 'utf8' });
  assert.equal(run.status, 0, run.stdout + run.stderr);
  assert.doesNotMatch(run.stdout, /FAIL/);
  assert.match(run.stdout, /running it again does nothing/);
});
