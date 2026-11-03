import { ReportFolder, ReportTemplate, Setting } from '../../../models/index.js';
import { admissionReports } from './admissions.js';
import { BOARDS, BOARD_FOLDER, studentRegisterDesign } from './board.js';
import { financeReports } from './finance.js';
import { libraryReports } from './library.js';
import { staffReports } from './staff.js';
import { studentReports } from './students.js';

/**
 * Ready-made report designs, one file per module, created once on first start. An administrator can edit, share or delete any of
 * them under Report Designer. Only Finance is shared beyond the administrator (with the accountant); share the rest as the school decides.
 * To add a module's reports, add a file here and list it below.
 */
const FLAG = 'reports.starters.v1';
const BOARD_FLAG = 'reports.boardDesigns.v1';
const PAGES_FLAG = 'reports.starterPages.v1';

export const STARTERS = [studentReports, staffReports, financeReports, libraryReports, admissionReports];

/** Creates the folders and reports above, once. Returns how many reports were added. */
export async function ensureReportStarters() {
  if (await Setting.findByPk(FLAG)) return 0;
  let added = 0;
  for (const f of STARTERS) {
    const folder =
      (await ReportFolder.findOne({ where: { name: f.folder } })) ??
      (await ReportFolder.create({ name: f.folder, description: f.description }));
    for (const r of f.reports) {
      if (await ReportTemplate.findOne({ where: { folderId: folder.id, name: r.name } })) continue;
      await ReportTemplate.create({
        folderId: folder.id,
        name: r.name,
        description: r.description,
        roles: f.roles?.join(',') ?? null,
        pages: (r.pages ?? f.pages)?.join(',') ?? null,
        config: JSON.stringify({ sortDir: 'asc', filters: [], title: r.name, ...r.config }),
        createdByName: 'system',
      });
      added += 1;
    }
  }
  await Setting.create({ key: FLAG, value: JSON.stringify('done'), updatedByName: 'system' });
  return added;
}

/** Creates a "Board returns" folder with one student register per board, once. Returns how many were added. */
export async function ensureBoardDesigns() {
  if (await Setting.findByPk(BOARD_FLAG)) return 0;
  const folder =
    (await ReportFolder.findOne({ where: { name: BOARD_FOLDER.name } })) ??
    (await ReportFolder.create({ name: BOARD_FOLDER.name, description: BOARD_FOLDER.description }));
  let added = 0;
  for (const board of BOARDS) {
    const name = `Student register: ${board}`;
    if (await ReportTemplate.findOne({ where: { folderId: folder.id, name } })) continue;
    await ReportTemplate.create({
      folderId: folder.id,
      name,
      description: `Every ${board} class with its students, with a count per class`,
      board,
      pages: 'students,classes',
      config: JSON.stringify({ kind: 'design', design: studentRegisterDesign(board) }),
      createdByName: 'system',
    });
    added += 1;
  }
  await Setting.create({ key: BOARD_FLAG, value: JSON.stringify('done'), updatedByName: 'system' });
  return added;
}

/**
 * The ready-made reports created before reports could be attached to screens get their screens now, once. A report whose pages an
 * administrator has already set is left alone.
 */
export async function ensureStarterPages() {
  if (await Setting.findByPk(PAGES_FLAG)) return 0;
  const want = new Map();
  for (const f of STARTERS) for (const r of f.reports) want.set(r.name, (r.pages ?? f.pages ?? []).join(','));
  for (const board of BOARDS) want.set(`Student register: ${board}`, 'students,classes');
  let updated = 0;
  for (const t of await ReportTemplate.findAll({ where: { createdByName: 'system' } })) {
    if (t.pages || !want.get(t.name)) continue;
    await t.update({ pages: want.get(t.name) });
    updated += 1;
  }
  await Setting.create({ key: PAGES_FLAG, value: JSON.stringify('done'), updatedByName: 'system' });
  return updated;
}
