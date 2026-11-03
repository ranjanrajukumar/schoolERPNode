import {
  AcademicYear,
  Board,
  BoardAffiliation,
  BoardRule,
  GradeBand,
  GradingSetting,
  SchoolClass,
  sequelize,
} from '../../models/index.js';
import { badRequest, conflict, notFound } from '../../utils/httpError.js';
import { currentUser } from '../../utils/requestContext.js';
import { RULE_TYPES } from '../../models/boardRule.model.js';
import { STAGES } from '../academics/subjectTemplates.js';
import {
  EXAM_STARTERS,
  GRADING_STARTERS,
  PROMOTION_STARTERS,
  REPORT_CARD_STARTERS,
  STARTER_NOTE,
  SUBJECT_STARTERS,
} from './boardStarterRules.js';

/* ---------- Boards ---------- */

export const listBoards = () => Board.findAll({ order: [['id', 'ASC']] });

/** A board by id or by name (the name is what a class shows). */
export async function findBoard(ref) {
  if (ref === undefined || ref === null || String(ref).trim() === '') return null;
  const asNumber = Number(ref);
  return Number.isInteger(asNumber)
    ? Board.findByPk(asNumber)
    : Board.findOne({ where: { name: String(ref) } });
}

/** The board of a class, or the first board when the class has none yet. */
export async function boardOfClass(cls) {
  const board = cls?.boardId ? await Board.findByPk(cls.boardId) : await findBoard(cls?.board);
  return board ?? (await Board.findOne({ order: [['id', 'ASC']] }));
}

/** Refuses to put a student into a class of another board unless the caller says that is intended. */
export async function assertSameBoard(fromClassId, toClassId, allowCross = false) {
  if (!fromClassId || !toClassId || allowCross) return;
  const [a, b] = await Promise.all([SchoolClass.findByPk(fromClassId), SchoolClass.findByPk(toClassId)]);
  if (!a || !b) return;
  const [ba, bb] = await Promise.all([boardOfClass(a), boardOfClass(b)]);
  if (ba && bb && ba.id !== bb.id)
    throw conflict(
      `${a.name}-${a.section} follows ${ba.name} and ${b.name}-${b.section} follows ${bb.name}. Moving a student between boards must be confirmed (allowCrossBoard)`,
    );
}

/**
 * The sentence a printed document may carry about the school's standing with a board, or null. It exists only for a
 * record marked verified, with its number and document, and still in date. Capability alone never produces it.
 */
export async function affiliationStatement(board, branchId = null) {
  const today = new Date().toISOString().slice(0, 10);
  const rows = (await BoardAffiliation.findAll({ where: { boardId: board.id, status: 'verified' } })).filter(
    (a) =>
      a.affiliationNo &&
      a.sourceRef &&
      (!a.validTo || a.validTo >= today) &&
      (!a.validFrom || a.validFrom <= today),
  );
  const hit = rows.find((a) => branchId && a.branchId === branchId) ?? rows.find((a) => !a.branchId);
  return hit ? `Affiliated to ${board.name}, affiliation no. ${hit.affiliationNo}` : null;
}

/* ---------- Validation of each rule type ---------- */

const num = (v) => (v === '' || v === null || v === undefined ? NaN : Number(v));

const VALIDATORS = {
  subject_template(scopeKey, p) {
    if (!STAGES.includes(scopeKey)) throw badRequest(`Scope must be one of: ${STAGES.join(', ')}`);
    if (!Array.isArray(p.subjects) || !p.subjects.length) throw badRequest('Add at least one subject');
    const seen = new Set();
    return {
      subjects: p.subjects.map((s) => {
        const name = String(s.name ?? '').trim();
        const ppw = num(s.periodsPerWeek);
        if (!name || name.length > 80) throw badRequest('Every subject needs a name of up to 80 characters');
        if (seen.has(name.toLowerCase())) throw badRequest(`${name} is listed twice`);
        seen.add(name.toLowerCase());
        if (!Number.isInteger(ppw) || ppw < 1 || ppw > 12)
          throw badRequest(`${name}: periods per week must be a whole number from 1 to 12`);
        return { name, periodsPerWeek: ppw, component: s.component === 'practical' ? 'practical' : 'theory' };
      }),
    };
  },
  exam_pattern(_scope, p) {
    if (!Array.isArray(p.exams) || !p.exams.length) throw badRequest('Add at least one exam');
    const groupName = String(p.groupName ?? '').trim();
    if (!groupName) throw badRequest('Give the result group a name');
    return {
      groupName,
      skipStages: (p.skipStages ?? []).filter((s) => STAGES.includes(s)),
      exams: p.exams.map((e) => {
        const name = String(e.name ?? '').trim();
        const maxMarks = num(e.maxMarks);
        const weight = num(e.weight);
        if (!name) throw badRequest('Every exam needs a name');
        if (!Number.isInteger(maxMarks) || maxMarks < 1)
          throw badRequest(`${name}: max marks must be a whole number`);
        if (!Number.isInteger(weight) || weight < 1 || weight > 1000)
          throw badRequest(`${name}: weight must be a whole number from 1 to 1000`);
        return { name, maxMarks, weight };
      }),
    };
  },
  grading(_scope, p) {
    const passPercent = num(p.passPercent);
    if (Number.isNaN(passPercent) || passPercent < 0 || passPercent > 100)
      throw badRequest('Pass mark must be between 0 and 100');
    if (!Array.isArray(p.bands) || !p.bands.length) throw badRequest('Add at least one grade');
    const bands = p.bands.map((b) => ({ grade: String(b.grade ?? '').trim(), min: num(b.min) }));
    if (bands.some((b) => !b.grade || b.grade.length > 10))
      throw badRequest('Every grade needs a name of up to 10 characters');
    if (bands.some((b) => Number.isNaN(b.min) || b.min < 0 || b.min > 100))
      throw badRequest('Each lower limit must be between 0 and 100');
    if (new Set(bands.map((b) => b.min)).size !== bands.length)
      throw badRequest('Two grades cannot start at the same percentage');
    if (new Set(bands.map((b) => b.grade.toLowerCase())).size !== bands.length)
      throw badRequest('Grade names must be different');
    if (!bands.some((b) => b.min === 0)) throw badRequest('The lowest grade must start at 0%');
    return { passPercent, bands: bands.sort((a, b) => b.min - a.min) };
  },
  promotion(_scope, p) {
    const limit = (v, label) => {
      if (v === null || v === undefined || v === '') return null;
      const n = Number(v);
      if (Number.isNaN(n) || n < 0 || n > 100)
        throw badRequest(`${label} must be between 0 and 100, or empty`);
      return n;
    };
    return {
      minOverallPercent: limit(p.minOverallPercent, 'Minimum overall percentage'),
      minAttendancePercent: limit(p.minAttendancePercent, 'Minimum attendance'),
      requirePass: p.requirePass === true,
    };
  },
  report_card(_scope, p) {
    const title = String(p.title ?? '').trim();
    if (!title || title.length > 80) throw badRequest('Give the report card a title of up to 80 characters');
    return {
      title,
      showPercentage: p.showPercentage !== false,
      showGrade: p.showGrade !== false,
      showRank: p.showRank !== false,
      showAttendance: p.showAttendance !== false,
      showAffiliation: p.showAffiliation !== false,
      footerNote: String(p.footerNote ?? '')
        .trim()
        .slice(0, 300),
    };
  },
  bell_schedule(_scope, p) {
    if (!Array.isArray(p) || !p.length) throw badRequest('Send at least one period');
    return p;
  },
};

/* ---------- Reading rules ---------- */

async function sessionStart(yearId) {
  const year = yearId
    ? await AcademicYear.findByPk(yearId)
    : await AcademicYear.findOne({ where: { isCurrent: true } });
  return year ? year.startDate : null;
}

/**
 * The rule version in force for a board in an academic session (default: the current one): the active version whose
 * effective session has started, taking the latest start and then the highest version.
 * Returns { payload, verified, sourceRef, version, id } or null when the board has no such rule.
 */
export async function resolveRule(boardRef, ruleType, scopeKey = 'default', yearId = null) {
  const board = boardRef && typeof boardRef === 'object' ? boardRef : await findBoard(boardRef);
  if (!board) return null;
  const [rules, start, yearRows] = await Promise.all([
    BoardRule.findAll({ where: { boardId: board.id, ruleType, scopeKey, status: 'active' } }),
    sessionStart(yearId),
    AcademicYear.findAll({ attributes: ['id', 'startDate'] }),
  ]);
  const starts = new Map(yearRows.map((y) => [y.id, y.startDate]));
  const inForce = rules
    .map((r) => ({ r, from: r.effectiveYearId ? (starts.get(r.effectiveYearId) ?? null) : '0000-00-00' }))
    .filter((x) => x.from !== null && (!start || x.from <= start))
    .sort((a, b) => (a.from === b.from ? b.r.version - a.r.version : a.from < b.from ? 1 : -1));
  const hit = inForce[0]?.r;
  if (!hit) return null;
  return {
    id: hit.id,
    boardId: board.id,
    version: hit.version,
    verified: hit.verified,
    sourceRef: hit.sourceRef,
    effectiveYearId: hit.effectiveYearId,
    payload: JSON.parse(hit.payload),
  };
}

/** Like resolveRule, but a missing rule is a clear message to the administrator rather than a silent default. */
export async function requireRule(boardRef, ruleType, scopeKey = 'default', yearId = null) {
  const rule = await resolveRule(boardRef, ruleType, scopeKey, yearId);
  if (!rule) {
    const name = boardRef && typeof boardRef === 'object' ? boardRef.name : boardRef;
    const scope = scopeKey !== 'default' ? ` (${scopeKey})` : '';
    throw conflict(
      `No ${ruleType.replace('_', ' ')} rule is set for ${name}${scope}. Add one under Board rules`,
    );
  }
  return rule;
}

/* ---------- Writing rules (versioned) ---------- */

/**
 * Saves a new version of a rule and retires the version it replaces. Never edits an old version.
 * A rule is saved unverified; it becomes verified only through verifyRule, which needs a source.
 */
export async function saveRule({
  boardRef,
  ruleType,
  scopeKey = 'default',
  effectiveYearId = null,
  payload,
  sourceRef,
  changeNote,
}) {
  if (!RULE_TYPES.includes(ruleType)) throw badRequest('Unknown rule type');
  const board = await findBoard(boardRef);
  if (!board) throw notFound('Board not found');
  if (!board.isEnabled) throw badRequest(`${board.name} is switched off`);
  const clean = VALIDATORS[ruleType](scopeKey, payload ?? {});
  if (effectiveYearId && !(await AcademicYear.findByPk(effectiveYearId)))
    throw badRequest('Academic session not found');
  return sequelize.transaction(async (transaction) => {
    const key = { boardId: board.id, ruleType, scopeKey, effectiveYearId: effectiveYearId || null };
    const last = await BoardRule.max('version', { where: key, transaction });
    await BoardRule.update({ status: 'retired' }, { where: { ...key, status: 'active' }, transaction });
    const row = await BoardRule.create(
      {
        ...key,
        version: (last ?? 0) + 1,
        payload: JSON.stringify(clean),
        sourceRef:
          String(sourceRef ?? '')
            .trim()
            .slice(0, 500) || null,
        changeNote:
          String(changeNote ?? '')
            .trim()
            .slice(0, 500) || null,
        createdByName: currentUser(),
      },
      { transaction },
    );
    return row.id;
  });
}

/** Marks a rule version as checked against the board's own publication. A source reference is required. */
export async function verifyRule(id, sourceRef) {
  const row = await BoardRule.findByPk(id);
  if (!row) throw notFound('Rule not found');
  const ref = String(sourceRef ?? row.sourceRef ?? '').trim();
  if (!ref) throw badRequest('Name the board publication or circular this was checked against');
  await row.update({
    verified: true,
    sourceRef: ref.slice(0, 500),
    verifiedBy: currentUser(),
    verifiedOn: new Date(),
  });
}

/** Every rule version of a board, newest first, for the admin screen and for showing the history. */
export async function listRules(boardRef) {
  const board = await findBoard(boardRef);
  if (!board) throw notFound('Board not found');
  const rows = await BoardRule.findAll({
    where: { boardId: board.id },
    order: [
      ['ruleType', 'ASC'],
      ['scopeKey', 'ASC'],
      ['effectiveYearId', 'ASC'],
      ['version', 'DESC'],
    ],
  });
  const years = new Map(
    (await AcademicYear.findAll({ attributes: ['id', 'name'] })).map((y) => [y.id, y.name]),
  );
  return rows.map((r) => ({
    id: r.id,
    ruleType: r.ruleType,
    scopeKey: r.scopeKey,
    effectiveYearId: r.effectiveYearId,
    effectiveFrom: r.effectiveYearId ? (years.get(r.effectiveYearId) ?? null) : null,
    version: r.version,
    status: r.status,
    verified: r.verified,
    sourceRef: r.sourceRef,
    changeNote: r.changeNote,
    createdByName: r.createdByName,
    verifiedBy: r.verifiedBy,
    verifiedOn: r.verifiedOn,
    editedAt: r.addondt,
    payload: JSON.parse(r.payload),
  }));
}

/* ---------- First-run seeding ---------- */

/** The single grade scale schools saved before scales were per board; it becomes CBSE's, which was the only board then. */
async function legacyGrading() {
  const [bands, setting] = await Promise.all([
    GradeBand.findAll({ where: { board: 'CBSE' }, order: [['minPercent', 'DESC']] }),
    GradingSetting.findByPk(1),
  ]);
  if (!bands.length) return null;
  return {
    passPercent: setting ? Number(setting.passPercent) : GRADING_STARTERS.CBSE.passPercent,
    bands: bands.map((b) => ({ grade: b.grade, min: Number(b.minPercent) })),
  };
}

/**
 * Creates the two boards and fills each missing rule with its starter value, saved as unverified. Safe to repeat:
 * a rule that exists in any version is never touched. Also points every class at its board.
 */
export async function ensureBoardData() {
  const boards = {};
  for (const [code, name] of [
    ['CBSE', 'CBSE'],
    ['UP', 'UP Board'],
  ])
    boards[name] = (await Board.findOne({ where: { name } })) ?? (await Board.create({ code, name }));

  const starters = [];
  for (const name of Object.keys(boards)) {
    for (const stage of STAGES)
      starters.push([
        name,
        'subject_template',
        stage,
        {
          subjects: SUBJECT_STARTERS[name][stage].map(([n, p, component]) => ({
            name: n,
            periodsPerWeek: p,
            component,
          })),
        },
      ]);
    starters.push([name, 'exam_pattern', 'default', EXAM_STARTERS[name]]);
    starters.push([name, 'promotion', 'default', PROMOTION_STARTERS[name]]);
    starters.push([name, 'report_card', 'default', REPORT_CARD_STARTERS[name]]);
    starters.push([
      name,
      'grading',
      'default',
      GRADING_STARTERS[name],
      name === 'CBSE' ? await legacyGrading() : null,
    ]);
  }
  for (const [name, ruleType, scopeKey, starter, carried] of starters) {
    const payload = carried ?? starter;
    const boardId = boards[name].id;
    if (await BoardRule.count({ where: { boardId, ruleType, scopeKey } })) continue;
    await BoardRule.create({
      boardId,
      ruleType,
      scopeKey,
      payload: JSON.stringify(payload),
      changeNote: carried ? 'Carried over from the earlier school-wide grade setup' : STARTER_NOTE,
      createdByName: 'system',
    });
  }

  for (const board of Object.values(boards))
    await SchoolClass.update({ boardId: board.id }, { where: { boardId: null, board: board.name } });
  await SchoolClass.update({ boardId: boards.CBSE.id, board: 'CBSE' }, { where: { boardId: null } });
}
