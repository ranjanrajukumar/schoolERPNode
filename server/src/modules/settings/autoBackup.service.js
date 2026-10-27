import fs from 'node:fs/promises';
import path from 'node:path';
import { createBackup } from './data.service.js';

/**
 * A scheduled backup: the same file the Backup page downloads, written to a folder on the server and pruned to the newest few.
 *   BACKUP_DIR          where the files go (default: server/backups)
 *   BACKUP_EVERY_HOURS  how often (default 24)
 *   BACKUP_KEEP         how many files to keep (default 14)
 *   BACKUP_AUTO=off     turns it off
 * Copy that folder off the server too: a backup on the same disk does not survive the disk.
 */
const PREFIX = 'school-erp-backup-';
const settings = () => ({
  dir: path.resolve(process.env.BACKUP_DIR || 'backups'),
  everyHours: Number(process.env.BACKUP_EVERY_HOURS) > 0 ? Number(process.env.BACKUP_EVERY_HOURS) : 24,
  keep: Number(process.env.BACKUP_KEEP) > 0 ? Math.floor(Number(process.env.BACKUP_KEEP)) : 14,
});

async function existing(dir) {
  try {
    const names = (await fs.readdir(dir)).filter((n) => n.startsWith(PREFIX) && n.endsWith('.json'));
    const stats = await Promise.all(names.map(async (name) => ({ name, at: (await fs.stat(path.join(dir, name))).mtimeMs })));
    return stats.sort((a, b) => b.at - a.at);
  } catch { return []; }
}

/** Writes a backup when the newest one is older than the interval (or there is none). Returns what it did. */
export async function runAutoBackup(overrides = {}) {
  const { dir, everyHours, keep } = { ...settings(), ...overrides };
  const files = await existing(dir);
  if (files[0] && Date.now() - files[0].at < everyHours * 3600 * 1000) return { ran: false, reason: 'recent backup exists', file: files[0].name };

  await fs.mkdir(dir, { recursive: true });
  const now = new Date();
  const name = `${PREFIX}${now.toISOString().slice(0, 16).replace('T', '-').replace(':', '')}.json`;
  const target = path.join(dir, name);
  const temp = `${target}.partial`;
  await fs.writeFile(temp, JSON.stringify(await createBackup()));
  await fs.rename(temp, target); // a half-written file is never mistaken for a backup
  const pruned = (await existing(dir)).slice(keep);
  for (const old of pruned) await fs.rm(path.join(dir, old.name), { force: true });
  return { ran: true, file: name, pruned: pruned.length };
}

/** Checks every half hour; started once when the server starts. The first check runs a minute after start-up. */
export function startAutoBackupTimer() {
  if (String(process.env.BACKUP_AUTO).toLowerCase() === 'off') return null;
  const tick = () => runAutoBackup().then((r) => { if (r.ran) console.log(`Backup written: ${r.file}`); }).catch((err) => console.error('Scheduled backup failed:', err.message));
  setTimeout(tick, 60 * 1000).unref();
  const timer = setInterval(tick, 30 * 60 * 1000);
  timer.unref();
  return timer;
}
