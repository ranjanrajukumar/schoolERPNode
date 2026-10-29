import './config/env.js';
import { sequelize } from './models/index.js';
import { ensureForeignKeys, findMissingForeignKeys } from './config/integrity.js';

// npm run db:orphans               lists relationships the database does not enforce and the orphaned rows blocking them
// npm run db:orphans -- --delete   deletes those orphaned rows (what a cascade would have done), then adds the constraints
const fix = process.argv.includes('--delete');

try {
  if (!fix) {
    const missing = await findMissingForeignKeys();
    if (!missing.length) console.log('All declared relationships are enforced by the database.');
    else {
      console.table(
        missing.map((r) => ({
          child: r.child,
          column: r.column,
          parent: r.parent,
          onDelete: r.onDelete,
          orphanedRows: r.orphans,
        })),
      );
      console.log(
        'Rows with orphanedRows > 0 block the constraint. Review them, then run: npm run db:orphans -- --delete',
      );
    }
  } else {
    const { added, blocked } = await ensureForeignKeys({ deleteOrphans: true });
    added.forEach((r) =>
      console.log(
        `added ${r.child}.${r.column} -> ${r.parent} (ON DELETE ${r.onDelete})${r.orphans ? `, removed ${r.orphans} orphaned row(s)` : ''}`,
      ),
    );
    blocked.forEach((r) =>
      console.log(
        `NOT added ${r.child}.${r.column} -> ${r.parent}: ${r.error ?? `${r.orphans} orphaned row(s) must be kept (${r.onDelete})`}`,
      ),
    );
  }
} finally {
  await sequelize.close();
}
