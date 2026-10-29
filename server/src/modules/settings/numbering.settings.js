import { FORMULA_HELP, FORMULA_PATTERN } from '../../utils/numbering.js';

/**
 * Setup > Auto Numbering: the formula behind every number the system generates itself.
 * Tokens: {YYYY} {YY} {MM} {SEQ:n} (running number, required) and {TYPE}. See utils/numbering.js.
 * Defaults reproduce the numbers issued before formulas existed, so nothing changes until an admin edits one.
 */
const formula = (key, label, def, help) => ({
  key: `numbering.${key}`, group: 'Auto numbering', label, type: 'text', max: 40, required: true,
  pattern: FORMULA_PATTERN, patternHelp: FORMULA_HELP, default: def, ...(help && { help }),
});

export const NUMBERING_SETTINGS = [
  formula('admission', 'Admission number formula', 'ADM-{YYYY}-{SEQ:4}', 'Applies to new admission numbers only; existing numbers do not change.'),
  formula('staff', 'Staff number formula', 'STF-{YYYY}-{SEQ:4}'),
  formula('library', 'Library card number formula', 'LIB-{SEQ:5}'),
  formula('grievance', 'Grievance ticket number formula', 'FG-{YYYY}-{SEQ:4}'),
  formula('certificate', 'Certificate number formula', '{TYPE}-{YYYY}-{SEQ:5}', '{TYPE} becomes BON, TC, CHR or FEE.'),
];
