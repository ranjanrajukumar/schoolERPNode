import { Client, Identity, Role, sequelize } from '../models/index.js';
import { badRequest } from '../utils/httpError.js';
import { digitsOf, mobileKeyOf } from './auth.service.js';

export const ROLES = ['admin', 'teacher', 'accountant', 'parent', 'student'];
const MAX_PER_PUSH = 5000;
const BCRYPT = /^\$2[aby]\$\d{2}\$.{53}$/;
const EMAIL = /^[^\s@]+@[^\s@]+$/;

const text = (v, max) => {
  const s = v === undefined || v === null ? '' : String(v).trim();
  return s ? s.slice(0, max) : null;
};

/** One login as a school reports it, checked and tidied. */
function clean(raw, index) {
  const at = `login ${index + 1}`;
  const localUserId = Number(raw?.localUserId);
  if (!Number.isInteger(localUserId) || localUserId < 1)
    throw badRequest(`${at}: localUserId must be a whole number`);
  if (!ROLES.includes(raw.role)) throw badRequest(`${at}: role must be one of ${ROLES.join(', ')}`);
  if (!BCRYPT.test(String(raw.passwordHash ?? '')))
    throw badRequest(`${at}: passwordHash must be a bcrypt hash`);
  const name = text(raw.name, 100);
  if (!name) throw badRequest(`${at}: name is required`);
  const email = text(raw.email, 150)?.toLowerCase() ?? null;
  if (email && !EMAIL.test(email)) throw badRequest(`${at}: email is not valid`);
  const digits = digitsOf(raw.mobile).slice(-15) || null;
  const username = text(raw.username, 60);
  if (!email && !digits && !username)
    throw badRequest(`${at}: needs an email, a mobile number or a username to sign in with`);
  return {
    localUserId,
    role: raw.role,
    name,
    email,
    mobile: digits ? mobileKeyOf(digits) : null,
    username,
    passwordHash: raw.passwordHash,
    active: raw.active !== false,
  };
}

// Two reports for the same school can arrive at the same moment: the database then picks one of the two transactions to retry (or refuses a
// duplicate login). Retrying it is the correct answer, so a report is repeated a few times before it is given up on.
const RETRYABLE = (err) =>
  ['ER_LOCK_DEADLOCK', 'ER_LOCK_WAIT_TIMEOUT'].includes(err?.original?.code) ||
  err?.name === 'SequelizeUniqueConstraintError';
async function withRetry(fn, tries = 5) {
  for (let attempt = 1; ; attempt += 1) {
    try {
      return await fn();
    } catch (err) {
      if (attempt >= tries || !RETRYABLE(err)) throw err;
      await new Promise((ok) => setTimeout(ok, 30 * attempt + Math.random() * 60));
    }
  }
}

/**
 * A school's server reports its logins. With `full`, the list is the school's complete set: any login not in it is switched off here,
 * so a login deleted at the school stops working in the app too. `client` is the school's row (from its key).
 */
export async function upsertIdentities(client, list, { full = false } = {}) {
  if (!Array.isArray(list)) throw badRequest('identities must be a list');
  if (list.length > MAX_PER_PUSH) throw badRequest(`Send at most ${MAX_PER_PUSH} logins at a time`);
  const rows = list.map(clean);
  if (new Set(rows.map((r) => r.localUserId)).size !== rows.length)
    throw badRequest('The same login is listed twice');

  rows.sort((a, b) => a.localUserId - b.localUserId); // every report takes its rows in the same order

  const result = await withRetry(() =>
    sequelize.transaction(async (transaction) => {
      const roles = new Map((await Role.findAll({ transaction })).map((r) => [r.code, r.id]));
      const existing = new Map(
        (await Identity.findAll({ where: { clientId: client.id }, transaction })).map((r) => [
          r.localUserId,
          r,
        ]),
      );
      let created = 0;
      let updated = 0;
      for (const row of rows) {
        const fields = {
          roleId: roles.get(row.role),
          mobile: row.mobile,
          name: row.name,
          email: row.email,
          username: row.username,
          passwordHash: row.passwordHash,
          active: row.active,
          updatedAt: new Date(),
        };
        const have = existing.get(row.localUserId);
        // eslint-disable-next-line no-await-in-loop
        if (have) {
          await have.update(fields, { transaction });
          updated += 1;
        } else {
          // eslint-disable-next-line no-await-in-loop
          await Identity.create(
            { clientId: client.id, localUserId: row.localUserId, ...fields },
            { transaction },
          );
          created += 1;
        }
      }
      let deactivated = 0;
      if (full) {
        const keep = new Set(rows.map((r) => r.localUserId));
        for (const [id, have] of existing) {
          if (!keep.has(id) && have.active) {
            await have.update({ active: false, updatedAt: new Date() }, { transaction });
            deactivated += 1;
          }
        }
      }
      return { created, updated, deactivated };
    }),
  );
  await Client.update({ lastSyncAt: new Date() }, { where: { id: client.id } }); // the registry's admin page shows this
  return result;
}

export async function deactivateIdentity(client, localUserId) {
  const [count] = await Identity.update(
    { active: false, updatedAt: new Date() },
    { where: { clientId: client.id, localUserId: Number(localUserId) } },
  );
  return { deactivated: count };
}

export const countFor = (client) => Identity.count({ where: { clientId: client.id, active: true } });
