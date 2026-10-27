import { Role, sequelize } from '../models/index.js';
import { ROLES } from '../services/provision.service.js';
import { ensureDatabase } from './database.js';

/**
 * Creates the database and tables, adds any column a newer version needs to a table an older version made, fills the roles lookup, and
 * moves the first version's single wide `identities` table (school code, role, phone and password hash all on one row) into the normalized
 * tables: roles, mobile_numbers, identities and credentials.
 */
export async function migrate() {
  await ensureDatabase();
  const queryInterface = sequelize.getQueryInterface();

  // the first version kept everything on one identities table; set it aside, create the new tables, then move the rows across
  let tables = await queryInterface.showAllTables();
  if (tables.includes('identities') && !tables.includes('identities_legacy')) {
    const columns = await queryInterface.describeTable('identities');
    if (columns.client_code) await sequelize.query('RENAME TABLE identities TO identities_legacy');
  }
  tables = await queryInterface.showAllTables();
  const legacy = tables.includes('identities_legacy'); // also true when an earlier attempt stopped before it finished
  // the normalized tables are rebuilt from the old one, so an attempt that stopped half-way (or ran twice at once) cannot leave a mixture
  if (legacy) await sequelize.query('DROP TABLE IF EXISTS credentials, identities, mobile_numbers');

  await sequelize.sync();
  const clients = await queryInterface.describeTable('clients');
  if (!clients.api_key_hash) await sequelize.query('ALTER TABLE `clients` ADD COLUMN `api_key_hash` VARCHAR(64) NULL');
  for (const code of ROLES) await Role.findOrCreate({ where: { code } });

  if (legacy) await moveLegacyIdentities();
}

/** Copies the old rows into the normalized tables, checks that every row of a school that still exists arrived, and only then drops the old table. */
async function moveLegacyIdentities() {
  await sequelize.transaction(async (transaction) => {
    const run = (sql) => sequelize.query(sql, { transaction });
    const count = async (sql) => Number((await sequelize.query(sql, { transaction, plain: true })).n);

    await run('INSERT INTO mobile_numbers (number_key, digits) SELECT mobile_key, MIN(mobile) FROM identities_legacy WHERE mobile_key IS NOT NULL GROUP BY mobile_key');
    // rows of a school that was removed are dropped here: nothing tied them to it before, and they could never have signed in
    await run(`INSERT INTO identities (client_id, local_user_id, role_id, mobile_number_id, name, email, username, active, created_at, updated_at)
      SELECT c.id, l.local_user_id, r.id, m.id, l.name, l.email, l.username, l.active, l.updated_at, l.updated_at
      FROM identities_legacy l
      JOIN clients c ON c.code = l.client_code
      JOIN roles r ON r.code = l.role
      LEFT JOIN mobile_numbers m ON m.number_key = l.mobile_key`);
    await run(`INSERT INTO credentials (identity_id, password_hash, updated_at)
      SELECT i.id, l.password_hash, l.updated_at
      FROM identities_legacy l
      JOIN clients c ON c.code = l.client_code
      JOIN identities i ON i.client_id = c.id AND i.local_user_id = l.local_user_id`);

    const expected = await count('SELECT COUNT(*) n FROM identities_legacy l JOIN clients c ON c.code = l.client_code JOIN roles r ON r.code = l.role');
    const moved = await count('SELECT COUNT(*) n FROM identities');
    const withPassword = await count('SELECT COUNT(*) n FROM credentials');
    if (moved !== expected || withPassword !== expected) throw new Error(`The identities move did not add up (expected ${expected}, moved ${moved}, ${withPassword} passwords). Nothing was changed.`);
    await run('DROP TABLE identities_legacy');
    console.log(`Identities normalized: ${moved} logins moved into roles, mobile_numbers, identities and credentials`);
  });
}
