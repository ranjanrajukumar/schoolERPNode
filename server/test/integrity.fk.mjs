// Runs in its own process against a throwaway database (school_erp_fktest), never your real one.
// It rebuilds the situation of old tables that lack foreign keys and checks that the repair is safe.
process.env.DB_NAME = 'school_erp_fktest';
await import(new URL('../src/config/env.js', import.meta.url).href);
const {
  sequelize: s,
  Staff,
  Payslip,
  StaffSalary,
  Parent,
} = await import(new URL('../src/models/index.js', import.meta.url).href);
const { migrateDatabase } = await import(new URL('../src/config/migration.js', import.meta.url).href);
const { ensureForeignKeys, findMissingForeignKeys } = await import(
  new URL('../src/config/integrity.js', import.meta.url).href
);
const ok = (cond, msg) => {
  console.log(cond ? 'PASS' : 'FAIL', msg);
  if (!cond) process.exitCode = 1;
};
try {
  await migrateDatabase();
  ok(
    (await findMissingForeignKeys()).length === 0,
    'fresh database: every declared relationship is enforced',
  );

  // Recreate the real-world situation: tables that predate their foreign keys.
  const [fks] = await s.query(
    "SELECT TABLE_NAME t, CONSTRAINT_NAME n FROM information_schema.KEY_COLUMN_USAGE WHERE TABLE_SCHEMA = DATABASE() AND REFERENCED_TABLE_NAME IS NOT NULL AND TABLE_NAME IN ('payslips','staff_salaries','parents')",
  );
  for (const f of fks) await s.query(`ALTER TABLE \`${f.t}\` DROP FOREIGN KEY \`${f.n}\``);
  ok(
    (await findMissingForeignKeys()).length === 3,
    'dropping three constraints makes them show up as missing',
  );

  // orphans: payslip (RESTRICT), salary (CASCADE), parent (CASCADE)
  await Payslip.create({ staffId: 9991, month: '2030-01', basic: 1, allowances: 0, deductions: 0, net: 1 });
  await StaffSalary.create({ staffId: 9992, basic: 5 });
  await Parent.create({ userId: 9993, name: 'Orphan Parent' });

  let r = await ensureForeignKeys();
  ok(r.added.length === 0 && r.blocked.length === 3, 'with orphans and no permission, nothing is changed');
  ok(
    (await Payslip.count()) === 1 && (await StaffSalary.count()) === 1 && (await Parent.count()) === 1,
    'no rows were deleted',
  );

  r = await ensureForeignKeys({ deleteOrphans: true });
  ok(
    r.added
      .map((x) => x.child)
      .sort()
      .join() === 'parents,staff_salaries',
    'cascade relationships: orphans removed and constraint added',
  );
  ok(
    r.blocked.length === 1 && r.blocked[0].child === 'payslips',
    'a RESTRICT relationship (payroll records) is never auto-deleted, even on request',
  );
  ok((await Payslip.count()) === 1, 'the orphaned payslip is still there');
  ok(
    (await StaffSalary.count()) === 0 && (await Parent.count()) === 0,
    'the orphaned salary and parent were removed',
  );

  // once the payslip orphan is dealt with by a person, the constraint can be added
  await Payslip.destroy({ where: {}, force: true }); // a real delete: the database constraint also sees soft-deleted rows
  r = await ensureForeignKeys();
  ok(
    r.added.length === 1 && r.added[0].child === 'payslips',
    'after the payslip orphan is removed by hand, the constraint is added',
  );
  ok((await findMissingForeignKeys()).length === 0, 'everything is enforced again');

  // the constraints now do their job
  const staff = await Staff.create({ staffNo: 'FK1', firstName: 'A', lastName: 'B' });
  await Payslip.create({
    staffId: staff.id,
    month: '2030-02',
    basic: 1,
    allowances: 0,
    deductions: 0,
    net: 1,
  });
  await StaffSalary.create({ staffId: staff.id, basic: 5 });
  let blockedDelete = false;
  try {
    await staff.destroy();
  } catch (e) {
    blockedDelete = e.name === 'SequelizeForeignKeyConstraintError';
  }
  ok(blockedDelete, 'staff with a payslip cannot be deleted');
  await Payslip.destroy({ where: {}, force: true }); // a real delete: the database constraint also sees soft-deleted rows
  await staff.destroy();
  ok((await StaffSalary.count()) === 0, 'deleting staff without payslips cascades to their salary terms');
  ok((await Staff.count()) === 0, 'and the staff record is gone');

  // idempotent
  r = await ensureForeignKeys({ deleteOrphans: true });
  ok(r.added.length === 0 && r.blocked.length === 0, 'running it again does nothing');
} finally {
  await s.query('DROP DATABASE IF EXISTS school_erp_fktest').catch(() => {});
  await s.close().catch(() => {});
}
