import { sequelize } from '../models/index.js';

/**
 * sync() creates tables but never alters them, so a relationship added to the code after its table existed has no
 * foreign key in the database. Deleting a parent then leaves orphaned child rows, and listings that expect the parent
 * crash. This finds every relationship the models declare, reports the ones the database does not enforce, and adds
 * the missing constraints where doing so is safe.
 */
const q = (name) => `\`${name}\``;

/** Every parent -> child relationship declared in the models, with the foreign key the database should enforce. */
function declaredRelations() {
  const seen = new Set();
  const relations = [];
  for (const model of Object.values(sequelize.models)) {
    for (const a of Object.values(model.associations)) {
      if (a.associationType !== 'HasMany' && a.associationType !== 'HasOne') continue;
      const column = a.target.rawAttributes[a.foreignKey].field || a.foreignKey;
      const key = `${a.target.tableName}.${column}`;
      if (seen.has(key)) continue;
      seen.add(key);
      relations.push({
        child: a.target.tableName, column, parent: a.source.tableName, onDelete: a.options.onDelete || 'SET NULL',
      });
    }
  }
  return relations;
}

async function existingForeignKeys() {
  const [rows] = await sequelize.query(
    'SELECT TABLE_NAME t, COLUMN_NAME c FROM information_schema.KEY_COLUMN_USAGE '
    + 'WHERE TABLE_SCHEMA = DATABASE() AND REFERENCED_TABLE_NAME IS NOT NULL',
  );
  return new Set(rows.map((r) => `${r.t}.${r.c}`));
}

const orphanFrom = (r) => `FROM ${q(r.child)} c LEFT JOIN ${q(r.parent)} p ON p.id = c.${q(r.column)} `
  + `WHERE c.${q(r.column)} IS NOT NULL AND p.id IS NULL`;

/** Relationships without a database constraint, each with the number of orphaned rows that would block adding it. */
export async function findMissingForeignKeys() {
  const have = await existingForeignKeys();
  const missing = [];
  for (const r of declaredRelations()) {
    if (have.has(`${r.child}.${r.column}`)) continue;
    const [[{ n }]] = await sequelize.query(`SELECT COUNT(*) n ${orphanFrom(r)}`);
    missing.push({ ...r, orphans: Number(n) });
  }
  return missing;
}

/**
 * Adds every missing constraint that has no orphans. With `deleteOrphans`, orphaned rows are first removed
 * (or detached, for relationships that allow it), which is what the constraint would have done when their parent was
 * deleted. Returns what was added and what is still blocked.
 */
export async function ensureForeignKeys({ deleteOrphans = false } = {}) {
  const added = [];
  const blocked = [];
  for (const r of await findMissingForeignKeys()) {
    try {
      if (r.orphans && !deleteOrphans) { blocked.push(r); continue; }
      if (r.orphans && r.onDelete === 'RESTRICT') { blocked.push(r); continue; } // never discard records the rules say to keep
      if (r.orphans && r.onDelete === 'SET NULL') {
        await sequelize.query(`UPDATE ${q(r.child)} c LEFT JOIN ${q(r.parent)} p ON p.id = c.${q(r.column)} SET c.${q(r.column)} = NULL `
          + `WHERE c.${q(r.column)} IS NOT NULL AND p.id IS NULL`);
      } else if (r.orphans) {
        await sequelize.query(`DELETE c ${orphanFrom(r)}`);
      }
      await sequelize.query(
        `ALTER TABLE ${q(r.child)} ADD CONSTRAINT ${q(`fk_${r.child}_${r.column}`.slice(0, 64))} `
        + `FOREIGN KEY (${q(r.column)}) REFERENCES ${q(r.parent)} (id) ON DELETE ${r.onDelete}`,
      );
      added.push(r);
    } catch (err) {
      blocked.push({ ...r, error: err.message });
    }
  }
  return { added, blocked };
}
