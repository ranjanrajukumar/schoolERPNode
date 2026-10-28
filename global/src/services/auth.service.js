import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { Client, Identity, Role } from '../models/index.js';
import { privateKey } from '../config/keys.js';

export const TICKET_SECONDS = 120;
export const ISSUER = 'schoolerp-global';

// compared against when nobody matches, so a stranger's number takes as long to refuse as a wrong password
const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', 10);

export const digitsOf = (value) => String(value ?? '').replace(/\D/g, '');
/** Phones are matched on their last ten digits, whatever the country code or leading zero. */
export const mobileKeyOf = (value) => { const d = digitsOf(value); return d.length >= 10 ? d.slice(-10) : d || null; };

/** What was typed: an email, a phone number, or otherwise a username (a student's admission number). */
export function classify(identifier) {
  const text = String(identifier ?? '').trim();
  if (text.includes('@')) return { kind: 'email', value: text.toLowerCase() };
  if (/^[+\d\s()-]+$/.test(text) && digitsOf(text).length >= 7) return { kind: 'mobile', value: mobileKeyOf(text) };
  return { kind: 'username', value: text };
}

/** A ticket the school's server accepts once, for two minutes: this person, at this school, in this role. Signed so it cannot be forged. */
const ticketFor = (row) => jwt.sign({ cc: row.clientCode, uid: row.localUserId, role: row.role }, privateKey, {
  algorithm: 'RS256', expiresIn: TICKET_SECONDS, issuer: ISSUER, jwtid: crypto.randomUUID(),
});

/**
 * Checks a mobile number, email or admission number and a password against every login registered under it. Returns the accounts that
 * match: usually one; more when the same person is, say, a teacher at one school and a parent at another, or a parent and a student
 * share a phone but have different passwords only if they chose the same one. Each account carries a ticket for its school.
 */
export async function login(identifier, password) {
  const { kind, value } = classify(identifier);
  if (!value || typeof password !== 'string' || !password) return [];
  const where = { active: true };
  if (kind === 'mobile') where.mobile = value;
  else where[kind] = value;
  // the login (its password hash is on the same row), its role and its (active) school, in one read
  const rows = await Identity.findAll({
    where,
    include: [{ model: Role, required: true }, { model: Client, required: true, where: { active: true } }],
    order: [['id', 'ASC']],
    limit: 20,
  });
  if (!rows.length) { await bcrypt.compare(password, DUMMY_HASH); return []; }

  const accounts = [];
  for (const row of rows) {
    // eslint-disable-next-line no-await-in-loop
    if (!(await bcrypt.compare(password, row.passwordHash))) continue;
    const { Client: client, Role: role } = row;
    accounts.push({
      clientCode: client.code, clientName: client.name, city: client.city ?? null, logoUrl: client.logoUrl ?? null, apiUrl: client.apiUrl,
      role: role.code, name: row.name, ticket: ticketFor({ clientCode: client.code, localUserId: row.localUserId, role: role.code }),
    });
  }
  if (!accounts.length) return [];
  return accounts;
}
