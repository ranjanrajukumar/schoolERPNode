import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { Op } from 'sequelize';
import { notFound } from '../../utils/httpError.js';

const storageDir = () => path.resolve(process.env.LMS_STORAGE_DIR || 'uploads/lms');
const safeKey = (key) => /^[a-f0-9]{64}$/.test(String(key ?? ''));
const objectPath = (key) => {
  if (!safeKey(key)) throw notFound('LMS file not found');
  return path.join(storageDir(), `${key}.blob`);
};

/** Stores file bytes outside MySQL under an opaque key. Only the key and file metadata are persisted in LMS rows. */
export async function putLmsFile(buffer) {
  const key = crypto.randomBytes(32).toString('hex');
  await fs.mkdir(storageDir(), { recursive: true });
  await fs.writeFile(objectPath(key), buffer, { flag: 'wx', mode: 0o600 });
  return key;
}

/** Restores an opaque object key from a backup using an atomic temporary file. */
export async function restoreLmsFile(key, buffer) {
  const destination = objectPath(key);
  await fs.mkdir(storageDir(), { recursive: true });
  const temporary = `${destination}.${crypto.randomBytes(8).toString('hex')}.tmp`;
  try {
    await fs.writeFile(temporary, buffer, { flag: 'wx', mode: 0o600 });
    await fs.rename(temporary, destination);
  } catch (error) {
    await fs.rm(temporary, { force: true });
    throw error;
  }
}

export async function getLmsFile(key) {
  try {
    return await fs.readFile(objectPath(key));
  } catch (error) {
    if (error.code === 'ENOENT') throw notFound('LMS file is missing from storage');
    throw error;
  }
}

export async function removeLmsFile(key) {
  if (!key) return;
  try {
    await fs.rm(objectPath(key), { force: true });
  } catch (error) {
    if (error.status !== 404) throw error;
  }
}

/** One-time, repeat-safe migration from the old base64 columns to the configured file store. */
export async function migrateLegacyLmsFiles(models) {
  let moved = 0;
  for (const Model of models) {
    for (const row of await Model.findAll({ where: { attachmentData: { [Op.not]: null } } })) {
      if (!row.attachmentData) continue;
      if (row.attachmentKey) {
        try {
          await getLmsFile(row.attachmentKey);
          await row.update({ attachmentData: null });
          continue;
        } catch (error) {
          if (error.status !== 404) throw error;
        }
      }
      const key = await putLmsFile(Buffer.from(row.attachmentData, 'base64'));
      await row.update({ attachmentKey: key, attachmentData: null });
      moved += 1;
    }
  }
  return moved;
}
