import { Role, sequelize } from '../models/index.js';
import { ROLES } from '../services/provision.service.js';
import { ensureDatabase } from './database.js';

/**
 * Creates the database and tables, adds any column a newer version needs to a table an older version made, fills the roles lookup, and
 * upgrades older layouts to the current one: clients, roles and a single identities table that holds each login's mobile number (its last ten
 * digits) and password hash itself. Older layouts are handled: the first (one wide identities table with the school code and role as text) and the
 * second (separate mobile_numbers and credentials tables).
 */
export async function migrate() {
  await ensureDatabase();
  const queryInterface = sequelize.getQueryInterface();

  // the first version kept school code and role as text on identities; set it aside, create the new table, then move the rows across
  let tables = await queryInterface.showAllTables();
  if (tables.includes('identities') && !tables.includes('identities_legacy')) {
    const columns = await queryInterface.describeTable('identities');
    if (columns.client_code) await sequelize.query('RENAME TABLE identities TO identities_legacy');
  }
  tables = await queryInterface.showAllTables();
  const legacy = tables.includes('identities_legacy'); // also true when an earlier attempt stopped before it finished
  // the table is rebuilt from the old one, so an attempt that stopped half-way (or ran twice at once) cannot leave a mixture
  if (legacy) await sequelize.query('DROP TABLE IF EXISTS credentials, identities, mobile_numbers');

  // the second layout is upgraded in place before sync, so sync never sees a model index on a column the table does not have yet
  if (!legacy && tables.includes('identities')) await flattenIdentities();
  await sequelize.sync();
  const clients = await queryInterface.describeTable('clients');
  if (!clients.api_key_hash)
    await sequelize.query('ALTER TABLE `clients` ADD COLUMN `api_key_hash` VARCHAR(64) NULL');
  if (!clients.last_sync_at)
    await sequelize.query('ALTER TABLE `clients` ADD COLUMN `last_sync_at` DATETIME NULL');
  for (const code of ROLES) await Role.findOrCreate({ where: { code } });

  if (legacy) await moveLegacyIdentities();
}

/**
 * Upgrades an older layout in place: a phone number kept in mobile_numbers, or in a mobile_key column beside the full number, ends up as the
 * single `mobile` column (the last ten digits); a password hash kept in credentials moves onto the identities row. It checks that every login
 * still has a password, and only then drops what is no longer used. Safe to run again.
 */
async function flattenIdentities() {
  const queryInterface = sequelize.getQueryInterface();
  const columns = await queryInterface.describeTable('identities');
  const tables = await queryInterface.showAllTables();
  if (
    !columns.mobile_number_id &&
    !columns.mobile_key &&
    !tables.includes('credentials') &&
    !tables.includes('mobile_numbers')
  )
    return; // already the current layout

  const add = [];
  if (!columns.mobile) add.push('ADD COLUMN `mobile` VARCHAR(10) NULL');
  if (!columns.password_hash) add.push('ADD COLUMN `password_hash` VARCHAR(100) NULL');
  if (add.length) await sequelize.query(`ALTER TABLE \`identities\` ${add.join(', ')}`);

  if (tables.includes('credentials'))
    await sequelize.query(
      'UPDATE identities i JOIN credentials c ON c.identity_id = i.id SET i.password_hash = c.password_hash',
    );
  if (tables.includes('mobile_numbers') && columns.mobile_number_id)
    await sequelize.query(
      'UPDATE identities i JOIN mobile_numbers m ON m.id = i.mobile_number_id SET i.mobile = m.number_key',
    );
  if (columns.mobile_key)
    await sequelize.query('UPDATE identities SET mobile = mobile_key WHERE mobile_key IS NOT NULL');
  await sequelize.query('ALTER TABLE `identities` MODIFY `mobile` VARCHAR(10) NULL');

  // a login without a password could never sign in; the school reports it again on its next sync
  const [[{ n: without }]] = await sequelize.query(
    'SELECT COUNT(*) n FROM identities WHERE password_hash IS NULL',
  );
  if (Number(without)) await sequelize.query('DELETE FROM identities WHERE password_hash IS NULL');

  if (columns.mobile_number_id) {
    const [fks] = await sequelize.query(`SELECT constraint_name n FROM information_schema.key_column_usage
      WHERE table_schema = DATABASE() AND table_name = 'identities' AND column_name = 'mobile_number_id' AND referenced_table_name IS NOT NULL`);
    for (const fk of fks) await sequelize.query(`ALTER TABLE \`identities\` DROP FOREIGN KEY \`${fk.n}\``);
    await sequelize.query('ALTER TABLE `identities` DROP COLUMN `mobile_number_id`');
  }
  if (columns.mobile_key) await sequelize.query('ALTER TABLE `identities` DROP COLUMN `mobile_key`'); // takes its index with it
  await sequelize.query('ALTER TABLE `identities` MODIFY `password_hash` VARCHAR(100) NOT NULL');
  const [indexes] = await sequelize.query(
    "SHOW INDEX FROM `identities` WHERE Key_name = 'ix_identity_mobile'",
  );
  if (!indexes.length) await sequelize.query('CREATE INDEX `ix_identity_mobile` ON `identities` (`mobile`)');
  await sequelize.query('DROP TABLE IF EXISTS credentials, mobile_numbers');

  const [[{ n: kept }]] = await sequelize.query('SELECT COUNT(*) n FROM identities');
  console.log(
    `Identities upgraded: ${kept} logins hold their own mobile number and password hash${Number(without) ? `; ${without} without a password were removed` : ''}`,
  );
}

/** Copies the first layout's rows into identities, checks that every row of a school that still exists arrived, and only then drops the old table. */
async function moveLegacyIdentities() {
  await sequelize.transaction(async (transaction) => {
    const run = (sql) => sequelize.query(sql, { transaction });
    const count = async (sql) => Number((await sequelize.query(sql, { transaction, plain: true })).n);

    // rows of a school that was removed are dropped here: nothing tied them to it before, and they could never have signed in
    await run(`INSERT INTO identities (client_id, local_user_id, role_id, mobile, name, email, username, password_hash, active, created_at, updated_at)
      SELECT c.id, l.local_user_id, r.id, l.mobile_key, l.name, l.email, l.username, l.password_hash, l.active, l.updated_at, l.updated_at
      FROM identities_legacy l
      JOIN clients c ON c.code = l.client_code
      JOIN roles r ON r.code = l.role`);

    const expected = await count(
      'SELECT COUNT(*) n FROM identities_legacy l JOIN clients c ON c.code = l.client_code JOIN roles r ON r.code = l.role',
    );
    const moved = await count('SELECT COUNT(*) n FROM identities');
    if (moved !== expected)
      throw new Error(
        `The identities move did not add up (expected ${expected}, moved ${moved}). Nothing was changed.`,
      );
    await run('DROP TABLE identities_legacy');
    console.log(`Identities moved: ${moved} logins moved into identities`);
  });
}
