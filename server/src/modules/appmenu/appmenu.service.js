import fs from 'node:fs';
import { AppMenuItem } from '../../models/index.js';
import { badRequest, notFound } from '../../utils/httpError.js';
import { sniff } from '../files/files.service.js';

/**
 * The mobile app's menu, kept in the database so an admin can rename tiles, change icons, reorder, hide, or limit them to roles
 * without a new app release. What each page does stays in the app; this table only says how it is presented.
 * defaults.json is generated from the app's registry (npm run gen:menu in app/) and seeds the table.
 */
const DEFAULTS = JSON.parse(fs.readFileSync(new URL('./defaults.json', import.meta.url), 'utf8'));
const ROLES = ['admin', 'teacher', 'accountant', 'parent', 'student'];
export const MAX_ICON_BYTES = 60 * 1024;
const ICON_TYPES = ['image/png', 'image/jpeg', 'image/webp'];

const audienceOf = (role) => (['parent', 'student'].includes(role) ? 'family' : 'staff');
const splitRoles = (text) =>
  text
    ? text
        .split(',')
        .map((r) => r.trim())
        .filter(Boolean)
    : null;

const seedRow = (d) => ({
  audience: d.audience,
  key: d.key,
  parentKey: d.parentKey ?? null,
  kind: d.kind,
  label: d.label,
  icon: d.icon,
  roles: d.roles?.length ? d.roles.join(',') : null,
  position: d.position,
  active: true,
});

/**
 * Adds any default item the table does not have yet, and removes rows for pages the app no longer has (a page cannot be invented from the
 * website, so such a row could only be a dead tile). Existing rows, with whatever an admin changed, are left alone.
 */
export async function ensureAppMenu() {
  const rows = await AppMenuItem.findAll({ attributes: ['id', 'audience', 'key'] });
  const known = new Set(DEFAULTS.map((d) => `${d.audience}|${d.key}`));
  const have = new Set(rows.map((r) => `${r.audience}|${r.key}`));
  const stale = rows.filter((r) => !known.has(`${r.audience}|${r.key}`)).map((r) => r.id);
  if (stale.length) await AppMenuItem.destroy({ where: { id: stale }, force: true });
  const missing = DEFAULTS.filter((d) => !have.has(`${d.audience}|${d.key}`)).map(seedRow);
  if (missing.length) await AppMenuItem.bulkCreate(missing);
  return missing.length + stale.length;
}

/** The menu one person sees: active items, in order, whose roles (own, else the parent's) include theirs. */
export async function menuFor(role) {
  const rows = await AppMenuItem.findAll({
    where: { audience: audienceOf(role), active: true },
    order: [
      ['position', 'ASC'],
      ['id', 'ASC'],
    ],
  });
  const byKey = new Map(rows.map((r) => [r.key, r]));
  const allowed = (r) => {
    const parent = r.parentKey ? byKey.get(r.parentKey) : null;
    if (r.parentKey && !parent) return false; // its module is hidden
    if (parent && !allowed(parent)) return false;
    const roles = splitRoles(r.roles) ?? (parent ? splitRoles(parent.roles) : null);
    return !roles || roles.includes(role);
  };
  return rows.filter(allowed).map((r) => ({
    key: r.key,
    parentKey: r.parentKey,
    kind: r.kind,
    label: r.label,
    icon: r.icon,
    position: r.position,
    iconData: r.iconImage ? `data:${r.iconMime};base64,${r.iconImage}` : null,
  }));
}

const shapeAdmin = (r) => ({
  id: r.id,
  audience: r.audience,
  key: r.key,
  parentKey: r.parentKey,
  kind: r.kind,
  label: r.label,
  icon: r.icon,
  roles: splitRoles(r.roles),
  position: r.position,
  active: r.active,
  hasImage: Boolean(r.iconImage),
  iconData: r.iconImage ? `data:${r.iconMime};base64,${r.iconImage}` : null,
});

export async function listForAdmin(audience) {
  if (!['staff', 'family'].includes(audience)) throw badRequest('audience must be staff or family');
  const rows = await AppMenuItem.findAll({
    where: { audience },
    order: [
      ['position', 'ASC'],
      ['id', 'ASC'],
    ],
  });
  return rows.map(shapeAdmin);
}

export async function updateItem(id, body) {
  const row = await AppMenuItem.findByPk(id);
  if (!row) throw notFound('Menu item not found');
  const changes = {};
  if (body.label !== undefined) {
    const label = String(body.label).trim();
    if (!label || label.length > 80) throw badRequest('The label must be 1 to 80 characters');
    changes.label = label;
  }
  if (body.icon !== undefined) {
    const icon = String(body.icon).trim();
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(icon) || icon.length > 60)
      throw badRequest('An icon name looks like "wallet-outline"');
    changes.icon = icon;
  }
  if (body.position !== undefined) {
    const position = Number(body.position);
    if (!Number.isInteger(position) || position < 0 || position > 100000)
      throw badRequest('Position must be a whole number');
    changes.position = position;
  }
  if (body.active !== undefined) changes.active = Boolean(body.active);
  if (body.roles !== undefined) {
    if (body.roles === null || (Array.isArray(body.roles) && !body.roles.length)) changes.roles = null;
    else {
      if (!Array.isArray(body.roles) || body.roles.some((r) => !ROLES.includes(r)))
        throw badRequest(`Roles must come from: ${ROLES.join(', ')}`);
      const family = row.audience === 'family';
      if (body.roles.some((r) => ['parent', 'student'].includes(r) !== family))
        throw badRequest(
          family
            ? 'The family menu is for parents and students'
            : 'The staff menu is for admins, teachers and accountants',
        );
      changes.roles = [...new Set(body.roles)].join(',');
    }
  }
  if (!Object.keys(changes).length) throw badRequest('Nothing to change');
  await row.update(changes);
  return shapeAdmin(row);
}

/** An uploaded icon, judged by its bytes: PNG, JPEG or WebP up to 60 KB. */
export async function setImage(id, buffer) {
  const row = await AppMenuItem.findByPk(id);
  if (!row) throw notFound('Menu item not found');
  if (!Buffer.isBuffer(buffer) || !buffer.length) throw badRequest('No file received');
  if (buffer.length > MAX_ICON_BYTES) throw badRequest(`An icon can be at most ${MAX_ICON_BYTES / 1024} KB`);
  const mime = sniff(buffer);
  if (!ICON_TYPES.includes(mime)) throw badRequest('An icon must be a PNG, JPEG or WebP image');
  await row.update({ iconImage: buffer.toString('base64'), iconMime: mime });
  return shapeAdmin(row);
}

export async function clearImage(id) {
  const row = await AppMenuItem.findByPk(id);
  if (!row) throw notFound('Menu item not found');
  await row.update({ iconImage: null, iconMime: null });
  return shapeAdmin(row);
}

/** Puts one audience's menu back to the built-in defaults: labels, icons, order, roles, visibility and uploaded pictures. */
export async function resetMenu(audience) {
  if (!['staff', 'family'].includes(audience)) throw badRequest('audience must be staff or family');
  const defaults = DEFAULTS.filter((d) => d.audience === audience);
  let restored = 0;
  for (const d of defaults) {
    const row = await AppMenuItem.findOne({ where: { audience, key: d.key } });
    const seed = { ...seedRow(d), iconImage: null, iconMime: null };
    if (row) {
      await row.update(seed);
      restored += 1;
    } else {
      await AppMenuItem.create(seed);
      restored += 1;
    }
  }
  return { restored };
}
