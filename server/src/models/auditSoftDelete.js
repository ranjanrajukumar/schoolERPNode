import { DataTypes } from 'sequelize';
import { currentUser } from '../utils/requestContext.js';

/**
 * The seven columns every table carries, and what they do:
 *   authadd / addondt    who created the row and when
 *   authedit / editondt  who last changed it and when
 *   authdel / delondt    who deleted it and when
 *   delstatus            1 = deleted. A delete only sets this (a soft delete); every read ignores deleted rows.
 * Installed once on the Sequelize instance before any model is defined, so no model file needs to know about it.
 */
export const AUDIT_COLUMNS = {
  authadd: 'VARCHAR(100) NULL',
  authedit: 'VARCHAR(100) NULL',
  authdel: 'VARCHAR(100) NULL',
  addondt: 'DATETIME NULL',
  editondt: 'DATETIME NULL',
  delondt: 'DATETIME NULL',
  delstatus: 'TINYINT(1) NOT NULL DEFAULT 0',
};

/** Tables that keep real deletes: pictures (a new upload replaces the old bytes), logs that are purged on a schedule, device tokens. */
const HARD_DELETE = new Set(['Photo', 'LoginEvent', 'AuditLog', 'PushSubscription']);

const columns = () => ({
  authadd: { type: DataTypes.STRING(100), allowNull: true },
  authedit: { type: DataTypes.STRING(100), allowNull: true },
  authdel: { type: DataTypes.STRING(100), allowNull: true },
  addondt: { type: DataTypes.DATE, allowNull: true },
  editondt: { type: DataTypes.DATE, allowNull: true },
  delondt: { type: DataTypes.DATE, allowNull: true },
  delstatus: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
});

/** Models that already soft-delete their own way (paranoid, with a restore) keep that; they only mirror it into the audit columns. */
const usesOwnSoftDelete = (Model) => Boolean(Model.options.paranoid);
const softDeletes = (Model) => !HARD_DELETE.has(Model.name) && !usesOwnSoftDelete(Model);

const fkError = (message) => {
  const err = new Error(message);
  err.name = 'SequelizeForeignKeyConstraintError';
  err.parent = { errno: 1451, sqlMessage: message };
  return err;
};

/** The attribute-name sets that must be unique in a table: unique indexes and a key that is typed in (not auto-numbered). */
function uniqueSets(Model) {
  if (Model.__uniqueSets) return Model.__uniqueSets;
  const attrOf = (name) => Object.values(Model.rawAttributes).find((a) => a.fieldName === name || a.field === name)?.fieldName;
  const sets = [];
  const add = (fields) => { const attrs = (fields ?? []).map((f) => attrOf(typeof f === 'string' ? f : f.name ?? f.attribute)); if (attrs.length && attrs.every(Boolean)) sets.push(attrs); };
  for (const key of Object.values(Model.uniqueKeys ?? {})) add(key.fields);
  for (const index of Model.options.indexes ?? []) if (index.unique) add(index.fields);
  const pk = Model.primaryKeyAttributes ?? [];
  if (pk.length && pk.every((k) => !Model.rawAttributes[k].autoIncrement)) sets.push([...pk]);
  Model.__uniqueSets = sets;
  return sets;
}

/**
 * A deleted row still holds its unique values, which would stop the same value being used again (an email, an admission number, a student's
 * subject). When a new row needs a value that only a deleted row holds, that deleted row is removed for good first.
 */
async function purgeDeletedHolding(Model, values, transaction) {
  if (!softDeletes(Model)) return;
  for (const attrs of uniqueSets(Model)) {
    const where = {};
    if (!attrs.every((a) => { const v = values[a]; if (v === undefined || v === null) return false; where[a] = v; return true; })) continue;
    try { await Model.unscoped().destroy({ where: { ...where, delstatus: true }, force: true, transaction }); } catch { /* still referenced by something: the create will report the duplicate */ }
  }
}

/**
 * A permanent delete must leave nothing pointing at the removed rows. The database constraint would have cascaded or refused, but older
 * databases lack it, and a soft-deleted child is invisible to a normal count, so it never blocked anything. Before the parents go for good:
 * CASCADE children are removed (live or soft-deleted), RESTRICT children are removed only when they were already soft-deleted (a live one still
 * refuses the delete), and SET NULL children are detached.
 */
async function purgeChildren(Model, options) {
  const pk = Model.primaryKeyAttributes.length === 1 ? Model.primaryKeyAttributes[0] : null;
  if (!pk || options.truncate) return;
  const parents = await Model.unscoped().findAll({ where: options.where ?? {}, attributes: [pk], transaction: options.transaction });
  const ids = parents.map((r) => r.get(pk));
  if (!ids.length) return;
  for (const assoc of Object.values(Model.associations)) {
    if (!['HasMany', 'HasOne'].includes(assoc.associationType)) continue;
    if (assoc.sourceKey && assoc.sourceKey !== pk) continue;
    const child = { [assoc.foreignKey]: ids };
    const rule = String(assoc.options.onDelete ?? 'SET NULL').toUpperCase();
    const target = assoc.target.unscoped();
    const { transaction } = options;
    if (rule === 'CASCADE') await target.destroy({ where: child, force: true, transaction });
    else if (rule === 'SET NULL') await target.update({ [assoc.foreignKey]: null }, { where: child, transaction, hooks: false });
    else if (softDeletes(assoc.target)) await target.destroy({ where: { ...child, delstatus: true }, force: true, transaction });
  }
}

/** Soft-deletes the rows matching `where` and everything the database would have deleted, refused or detached along with them. */
async function softDelete(Model, options) {
  const { transaction } = options;
  const pk = Model.primaryKeyAttributes.length === 1 ? Model.primaryKeyAttributes[0] : null;
  const rows = await Model.findAll({ where: options.where ?? {}, attributes: pk ? [pk] : undefined, transaction, ...(options.limit && { limit: options.limit }) });
  if (!rows.length) return 0;
  const ids = pk ? rows.map((r) => r.get(pk)) : null;

  for (const assoc of Object.values(Model.associations)) {
    if (!['HasMany', 'HasOne'].includes(assoc.associationType) || !ids) continue;
    const parentKey = assoc.sourceKey && assoc.sourceKey !== pk ? null : pk;
    if (!parentKey) continue;
    const child = { [assoc.foreignKey]: ids };
    const rule = String(assoc.options.onDelete ?? 'SET NULL').toUpperCase();
    if (rule === 'CASCADE') await assoc.target.destroy({ where: child, transaction });
    else if (rule === 'SET NULL') await assoc.target.update({ [assoc.foreignKey]: null }, { where: child, transaction, hooks: false });
    else if (await assoc.target.count({ where: child, transaction })) throw fkError(`${assoc.target.tableName}.${assoc.foreignKey} still refers to ${Model.tableName}`);
  }

  const stamp = { delstatus: true, delondt: new Date(), authdel: currentUser() };
  await Model.update(stamp, { where: pk ? { [pk]: ids } : options.where, transaction, hooks: false });
  return rows.length;
}

/**
 * Sequelize adds a joined table's default scope (our "not deleted" filter) to the join and then treats any join that has a filter as
 * required, which would drop rows whose optional parent is missing (a student with no class). So before that happens, every join gets
 * the required / optional setting it would have had without the filter: required only if the caller gave it a where or said so.
 */
function keepJoinsOptional(include) {
  if (!Array.isArray(include)) return include;
  return include.map((entry) => {
    if (typeof entry === 'function') return { model: entry, required: false }; // a bare model: a plain optional join
    if (!entry || typeof entry !== 'object' || entry.all) return entry;
    if (entry.required === undefined) entry.required = Boolean(entry.where);
    if (entry.include) entry.include = keepJoinsOptional(entry.include);
    return entry;
  });
}

export function installAudit(sequelize) {
  const optionalJoins = (options) => { if (options?.include) options.include = keepJoinsOptional(options.include); };
  sequelize.addHook('beforeFind', optionalJoins);
  sequelize.addHook('beforeCount', optionalJoins);

  // every model gets the seven columns, and (unless it deletes its own way) a default scope that hides deleted rows
  sequelize.addHook('beforeDefine', (attributes, options) => {
    Object.assign(attributes, columns());
    const own = Boolean(options.paranoid);
    if (!own && !HARD_DELETE.has(options.modelName)) options.defaultScope = { ...(options.defaultScope ?? {}), where: { ...(options.defaultScope?.where ?? {}), delstatus: false } };
  });

  sequelize.addHook('afterDefine', (Model) => {
    // An upsert inserts or updates: the creator columns go in on insert only, the "edited" columns always. Sequelize builds both value lists
    // before its hooks run, so the stamps are added here, up front. A deleted row holding the same key is removed first.
    const upsert = Model.upsert;
    Model.upsert = async function stampedUpsert(values, options = {}) {
      const who = currentUser();
      const now = new Date();
      const full = { ...values, authadd: values.authadd ?? who, addondt: values.addondt ?? now, authedit: who, editondt: now };
      await purgeDeletedHolding(this, full, options.transaction);
      const fields = options.fields ?? Object.keys(full).filter((k) => k !== 'authadd' && k !== 'addondt');
      return upsert.call(this, full, { ...options, fields });
    };

    if (!softDeletes(Model)) return;
    const hardDestroy = Model.destroy;
    Model.destroy = async function destroy(options = {}) {
      if (options.force || options.truncate) {
        await purgeChildren(this, options);
        return hardDestroy.call(this, options);
      }
      return softDelete(this, options);
    };
    const hardInstanceDestroy = Model.prototype.destroy;
    Model.prototype.destroy = async function instanceDestroy(options = {}) {
      if (options.force) return hardInstanceDestroy.call(this, options);
      const pk = this.constructor.primaryKeyAttributes;
      const n = await this.constructor.destroy({ where: Object.fromEntries(pk.map((k) => [k, this.get(k)])), transaction: options.transaction });
      if (n) this.set({ delstatus: true, delondt: new Date(), authdel: currentUser() }, { raw: true });
      return this;
    };
  });

  // who added / changed a row, and when
  sequelize.addHook('beforeSave', async (instance, options) => {
    const who = currentUser();
    const now = new Date();
    if (instance.isNewRecord) {
      if (!instance.get('authadd')) instance.set('authadd', who);
      if (!instance.get('addondt')) instance.set('addondt', now);
      await purgeDeletedHolding(instance.constructor, instance.dataValues, options.transaction);
      return;
    }
    instance.set({ authedit: who, editondt: now });
    if (Array.isArray(options.fields)) for (const f of ['authedit', 'editondt']) if (!options.fields.includes(f)) options.fields.push(f);
  });
  sequelize.addHook('beforeBulkCreate', async (instances, options) => {
    const who = currentUser();
    const now = new Date();
    for (const instance of instances) {
      if (!instance.get('authadd')) instance.set('authadd', who);
      if (!instance.get('addondt')) instance.set('addondt', now);
      await purgeDeletedHolding(instance.constructor, instance.dataValues, options.transaction);
    }
    if (Array.isArray(options.fields)) for (const f of ['authadd', 'addondt']) if (!options.fields.includes(f)) options.fields.push(f);
  });
  sequelize.addHook('beforeBulkUpdate', (options) => {
    if (options.hooks === false || !options.attributes) return;
    options.attributes.authedit = currentUser();
    options.attributes.editondt = new Date();
    if (Array.isArray(options.fields)) for (const f of ['authedit', 'editondt']) if (!options.fields.includes(f)) options.fields.push(f);
  });
  // models that soft-delete their own way (enquiries) mirror it into the audit columns
  sequelize.addHook('beforeDestroy', (instance, options) => {
    if (options.force || !usesOwnSoftDelete(instance.constructor)) return;
    instance.set({ delstatus: true, delondt: new Date(), authdel: currentUser() });
  });
  sequelize.addHook('beforeRestore', (instance) => {
    if (!usesOwnSoftDelete(instance.constructor)) return;
    instance.set({ delstatus: false, delondt: null, authdel: null });
  });
}
