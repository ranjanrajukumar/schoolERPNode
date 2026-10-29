import { Staff } from '../../models/index.js';
import { nextNumber } from '../../utils/numbering.js';
import { getSetting } from '../settings/settings.service.js';

/** Next staff number from the school's formula (default STF-2026-0007); numbers already taken are skipped. */
export async function nextStaffNo(transaction) {
  return nextNumber({
    model: Staff,
    field: 'staffNo',
    formula: await getSetting('numbering.staff'),
    transaction,
  });
}
