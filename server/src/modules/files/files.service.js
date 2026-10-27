import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { Student, StudentFile } from '../../models/index.js';
import { badRequest, notFound } from '../../utils/httpError.js';

export const MAX_BYTES = 5 * 1024 * 1024;
const UPLOAD_DIR = path.resolve(process.env.UPLOAD_DIR || 'uploads');

/** What each kind accepts. The type is confirmed from the file's own first bytes, never from the client's claim. */
const SIGNATURES = {
  'image/jpeg': (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  'image/png': (b) => b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
  'image/webp': (b) => b.subarray(0, 4).toString('latin1') === 'RIFF' && b.subarray(8, 12).toString('latin1') === 'WEBP',
  'application/pdf': (b) => b.subarray(0, 5).toString('latin1') === '%PDF-',
};
const ALLOWED = { photo: ['image/jpeg', 'image/png', 'image/webp'], document: Object.keys(SIGNATURES) };

export const sniff = (buffer) => Object.keys(SIGNATURES).find((type) => SIGNATURES[type](buffer)) ?? null;
export const diskPath = (storedName) => path.join(UPLOAD_DIR, storedName);

/** The file's bytes: from the database, or from the upload folder for rows saved before files moved into the database. */
export async function fileBytes(row) {
  if (row.data) return Buffer.from(row.data, 'base64');
  try { return await fs.readFile(diskPath(row.storedName)); } catch { return null; }
}

/** Copies every file still only on disk into its database row. Safe to repeat; the disk copy is left in place. */
export async function moveFilesToDatabase(models = [StudentFile]) {
  let moved = 0; let missing = 0;
  for (const Model of models) {
    for (const row of await Model.findAll({ where: { data: null } })) {
      const bytes = await fileBytes(row);
      if (!bytes) { missing += 1; continue; }
      await row.update({ data: bytes.toString('base64') }); moved += 1;
    }
  }
  return { moved, missing };
}

const shape = (f) => ({
  id: f.id, studentId: f.studentId, kind: f.kind, title: f.title, originalName: f.originalName,
  mimeType: f.mimeType, size: f.size, uploadedByName: f.uploadedByName, createdAt: f.createdAt,
});

export async function listFiles({ studentId, kind }) {
  if (!studentId) throw badRequest('studentId is required');
  const rows = await StudentFile.findAll({
    where: { studentId, ...(kind && { kind }) }, order: [['id', 'DESC']],
  });
  return rows.map(shape);
}

/** The newest photo id per student, for screens that show many students at once. */
export async function photoIds(studentIds) {
  const rows = await StudentFile.findAll({ where: { kind: 'photo', studentId: studentIds }, attributes: ['id', 'studentId'] });
  return new Map(rows.map((r) => [r.studentId, r.id]));
}

/** A student has one photo: uploading a new one replaces the old one. Documents accumulate. */
export async function saveFile({ studentId, kind, title, originalName, buffer, uploadedByName }) {
  if (!ALLOWED[kind]) throw badRequest('kind must be photo or document');
  if (!Buffer.isBuffer(buffer) || !buffer.length) throw badRequest('No file received');
  if (buffer.length > MAX_BYTES) throw badRequest(`File is larger than ${MAX_BYTES / 1024 / 1024} MB`);
  if (!(await Student.findByPk(studentId))) throw notFound('Student not found');

  const mimeType = sniff(buffer);
  if (!mimeType || !ALLOWED[kind].includes(mimeType)) {
    throw badRequest(kind === 'photo' ? 'A photo must be a JPEG, PNG or WebP image' : 'Only PDF, JPEG, PNG or WebP files are allowed');
  }
  const name = String(originalName || 'file').slice(0, 255);
  const label = String(title || '').trim() || (kind === 'photo' ? 'Photo' : name);

  const storedName = crypto.randomBytes(24).toString('hex'); // a unique key for the file; the bytes live in the database

  const replaced = kind === 'photo' ? await StudentFile.findAll({ where: { studentId, kind: 'photo' } }) : [];
  const row = await StudentFile.create({
    studentId, kind, title: label.slice(0, 160), originalName: name, mimeType, size: buffer.length, storedName, data: buffer.toString('base64'), uploadedByName,
  });
  for (const old of replaced) await removeRow(old);
  return shape(row);
}

async function removeRow(row) {
  await row.destroy();
  await fs.rm(diskPath(row.storedName), { force: true });
}

export async function deleteFile(id) {
  const row = await StudentFile.findByPk(id);
  if (!row) throw notFound('File not found');
  await removeRow(row);
}

/** Metadata plus the bytes, for the download route. */
export async function readFile(id) {
  const row = await StudentFile.findByPk(id);
  if (!row) throw notFound('File not found');
  const buffer = await fileBytes(row);
  if (!buffer) throw notFound('File is missing from storage');
  return { row, buffer };
}

/** Disk names of a student's files; read before the student row (and its file rows) are deleted. */
export async function storedNames(studentId) {
  return (await StudentFile.findAll({ where: { studentId }, attributes: ['storedName'] })).map((f) => f.storedName);
}

export async function removeStoredFiles(storedNames) {
  await Promise.all(storedNames.map((name) => fs.rm(diskPath(name), { force: true })));
}
