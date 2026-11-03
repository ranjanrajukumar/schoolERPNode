import { Router } from 'express';
import { Op } from 'sequelize';
import {
  ClassSubject,
  Room,
  SchoolClass,
  Setting,
  Staff,
  StaffUnavailability,
  Subject,
  TimetableSlot,
  sequelize,
} from '../../models/index.js';
import { generateTimetable } from './timetableGenerator.js';
import { resolveRule, saveRule } from '../boards/boardRules.service.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { badRequest, conflict } from '../../utils/httpError.js';

const router = Router();

function shape(slot) {
  return {
    id: slot.id,
    classId: slot.classId,
    day: slot.day,
    period: slot.period,
    subjectId: slot.subjectId,
    staffId: slot.staffId,
    roomId: slot.roomId,
    roomName: slot.Room?.name ?? null,
    className: slot.SchoolClass ? `${slot.SchoolClass.name}-${slot.SchoolClass.section}` : null,
    subjectName: slot.Subject?.name ?? null,
    teacherName: slot.Staff ? `${slot.Staff.firstName} ${slot.Staff.lastName}` : null,
  };
}

const PERIODS_KEY = 'timetable.periods';
/** Bell times of a board: its bell-schedule rule, else the school-wide times saved before boards had rules, else the default. */
async function loadBells(boardName) {
  const rule = await resolveRule(boardName || 'CBSE', 'bell_schedule');
  if (rule) return rule.payload;
  const row = await Setting.findByPk(PERIODS_KEY);
  return row ? JSON.parse(row.value) : defaultPeriods();
}

/** The default bell times: eight periods of 40 minutes from 08:00. */
const defaultPeriods = () =>
  Array.from({ length: 8 }, (_, i) => {
    const from = 8 * 60 + i * 40;
    const to = from + 40;
    return {
      period: i + 1,
      label: `Period ${i + 1}`,
      kind: 'class',
      start: `${pad(Math.floor(from / 60))}:${pad(from % 60)}`,
      end: `${pad(Math.floor(to / 60))}:${pad(to % 60)}`,
    };
  });

// GET /api/timetable/periods -> [{ period, start, end }]: the school's bell times, the same for every class
router.get(
  '/periods',
  asyncHandler(async (req, res) => {
    res.json(await loadBells(req.query.board));
  }),
);

// PUT /api/timetable/periods with [{ period, label, kind: 'class' | 'break', start, end }, ...] (24-hour HH:MM); rows must not overlap.
// Rows are numbered 1, 2, 3 ... in time order. A row that already holds timetable slots cannot be removed or turned into a break.
router.put(
  '/periods',
  asyncHandler(async (req, res) => {
    const list = Array.isArray(req.body) ? req.body : null;
    if (!list?.length || list.length > 12) throw badRequest('Send between 1 and 12 periods');
    const clean = list
      .map((p) => ({
        period: Number(p.period),
        label: String(p.label ?? '')
          .trim()
          .slice(0, 30),
        kind: p.kind === 'break' ? 'break' : 'class',
        start: String(p.start ?? ''),
        end: String(p.end ?? ''),
      }))
      .sort((a, b) => a.period - b.period);
    clean.forEach((p, i) => {
      if (p.period !== i + 1) throw badRequest('Periods must be numbered 1, 2, 3 ... without gaps');
      if (!p.label) p.label = p.kind === 'break' ? 'Break' : `Period ${p.period}`;
      if (!HHMM.test(p.start) || !HHMM.test(p.end))
        throw badRequest(`Period ${p.period}: use times like 08:00`);
      if (minutes(p.end) <= minutes(p.start))
        throw badRequest(`Period ${p.period}: the end must be after the start`);
      if (i && minutes(p.start) < minutes(clean[i - 1].end))
        throw badRequest(`Period ${p.period} starts before period ${p.period - 1} ends`);
    });
    const used = await TimetableSlot.findAll({ attributes: ['period'], group: ['period'], raw: true });
    for (const { period } of used) {
      const row = clean.find((p) => p.period === period);
      if (!row || row.kind === 'break')
        throw conflict(
          `Period ${period} already has timetable entries. Clear them before removing it or making it a break`,
        );
    }
    await saveRule({
      boardRef: req.query.board || 'CBSE',
      ruleType: 'bell_schedule',
      payload: clean,
      changeNote: 'Edited in Time slots',
    });
    res.json(clean);
  }),
);

// GET /api/timetable?classId=  or  ?staffId=  (a class's week, or one teacher's week)
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const { classId, staffId } = req.query;
    if (!classId && !staffId) throw badRequest('classId or staffId is required');
    const slots = await TimetableSlot.findAll({
      where: { ...(classId && { classId }), ...(staffId && { staffId }) },
      include: [
        { model: SchoolClass, attributes: ['name', 'section'] },
        { model: Subject, attributes: ['name'] },
        { model: Staff, attributes: ['firstName', 'lastName'], required: false },
        { model: Room, attributes: ['name'], required: false },
      ],
      order: [
        ['day', 'ASC'],
        ['period', 'ASC'],
      ],
    });
    res.json(slots.map(shape));
  }),
);

// GET /api/timetable/availability?staffId= -> [{ day, period }] the teacher cannot teach
router.get(
  '/availability',
  asyncHandler(async (req, res) => {
    if (!req.query.staffId) throw badRequest('staffId is required');
    const rows = await StaffUnavailability.findAll({
      where: { staffId: req.query.staffId },
      attributes: ['day', 'period'],
      order: [
        ['day', 'ASC'],
        ['period', 'ASC'],
      ],
    });
    res.json(rows.map((r) => ({ day: r.day, period: r.period })));
  }),
);

// PUT /api/timetable/availability { staffId, blocked: [{ day, period }] } replaces the teacher's blocked periods.
// Periods the teacher already has in the timetable are refused: move those first.
router.put(
  '/availability',
  asyncHandler(async (req, res) => {
    const { staffId, blocked } = req.body;
    if (!staffId || !Array.isArray(blocked)) throw badRequest('staffId and blocked are required');
    if (!(await Staff.findByPk(staffId))) throw badRequest('Teacher not found');
    const clean = [
      ...new Map(
        blocked.map((b) => [`${b.day}|${b.period}`, { day: Number(b.day), period: Number(b.period) }]),
      ).values(),
    ];
    if (clean.some((b) => !(b.day >= 1 && b.day <= 7 && b.period >= 1 && b.period <= 12)))
      throw badRequest('Each blocked period needs a day (1-7) and a period (1-12)');
    for (const b of clean) {
      const held = await TimetableSlot.findOne({ where: { staffId, day: b.day, period: b.period } });
      if (held)
        throw conflict(
          `The teacher already teaches on day ${b.day}, period ${b.period}. Move that period first`,
        );
    }
    await sequelize.transaction(async (transaction) => {
      await StaffUnavailability.destroy({ where: { staffId }, transaction });
      await StaffUnavailability.bulkCreate(
        clean.map((b) => ({ staffId, ...b })),
        { transaction },
      );
    });
    res.json({ blocked: clean.length });
  }),
);

// POST /api/timetable/generate { classIds?: [], replace?: boolean, days?: [1..6], maxTeacherPerDay?: n }
// Fills the week of the chosen classes (all classes when none are sent) from each class's subjects, periods per week and teacher.
// replace=false keeps what is already placed and only fills the gaps. Nothing is saved if the request is invalid.
router.post(
  '/generate',
  asyncHandler(async (req, res) => {
    const replace = req.body.replace !== false;
    const days = (Array.isArray(req.body.days) && req.body.days.length ? req.body.days : [1, 2, 3, 4, 5, 6])
      .map(Number)
      .filter((d) => d >= 1 && d <= 7);
    if (!days.length) throw badRequest('Choose at least one working day');
    const maxTeacherPerDay = Math.min(Math.max(Number(req.body.maxTeacherPerDay) || 6, 1), 12);

    const wanted = Array.isArray(req.body.classIds) ? req.body.classIds.map(Number) : [];
    const classes = await SchoolClass.findAll({
      where: wanted.length ? { id: wanted } : {},
      order: [['id', 'ASC']],
    });
    if (!classes.length) throw badRequest('No classes to generate for');
    const classIds = classes.map((c) => c.id);

    const [links, subjects, staff, labs] = await Promise.all([
      ClassSubject.findAll({ where: { classId: classIds } }),
      Subject.findAll({ attributes: ['id', 'name'] }),
      Staff.findAll({ where: { status: 'active' }, attributes: ['id'] }),
      Room.findAll({ where: { kind: 'lab' }, attributes: ['id'] }),
    ]);
    const activeStaff = new Set(staff.map((s) => s.id));
    const subjectName = new Map(subjects.map((s) => [s.id, s.name]));

    // a subject with no teacher takes the one who teaches it in another class, picking the least loaded
    const loadOf = new Map();
    const teachersOf = new Map();
    for (const l of await ClassSubject.findAll({ where: { staffId: { [Op.ne]: null } } })) {
      if (!activeStaff.has(l.staffId)) continue;
      loadOf.set(l.staffId, (loadOf.get(l.staffId) ?? 0) + (l.periodsPerWeek ?? 4));
      teachersOf.set(l.subjectId, new Set([...(teachersOf.get(l.subjectId) ?? []), l.staffId]));
    }

    const skipped = [];
    const defaulted = [];
    const demands = [];
    for (const l of links) {
      const cls = classes.find((c) => c.id === l.classId);
      const label = `${cls.name}-${cls.section}`;
      if (l.isElective) {
        skipped.push({
          className: label,
          subject: subjectName.get(l.subjectId),
          reason: 'Elective: place it by hand',
        });
        continue;
      }
      const practical = l.component === 'practical';
      if (l.periodsPerWeek == null)
        defaulted.push({ className: label, subject: subjectName.get(l.subjectId) });
      let staffId = l.staffId && activeStaff.has(l.staffId) ? l.staffId : null;
      if (!staffId) {
        const pool = [...(teachersOf.get(l.subjectId) ?? [])].sort(
          (a, b) => (loadOf.get(a) ?? 0) - (loadOf.get(b) ?? 0),
        );
        staffId = pool[0] ?? null;
        if (staffId) loadOf.set(staffId, (loadOf.get(staffId) ?? 0) + (l.periodsPerWeek ?? 4));
      }
      demands.push({
        classId: l.classId,
        subjectId: l.subjectId,
        subjectName: subjectName.get(l.subjectId),
        staffId,
        periods: l.periodsPerWeek ?? (practical ? 2 : 4),
        practical,
      });
    }

    const kept = await TimetableSlot.findAll({
      where: replace ? { classId: { [Op.notIn]: classIds } } : {},
      attributes: ['classId', 'day', 'period', 'staffId', 'roomId'],
      raw: true,
    });
    // when filling gaps, a subject already placed counts towards its weekly periods
    if (!replace) {
      const existing = await TimetableSlot.findAll({
        where: { classId: classIds },
        attributes: ['classId', 'subjectId'],
        raw: true,
      });
      for (const d of demands)
        d.periods = Math.max(
          0,
          d.periods - existing.filter((e) => e.classId === d.classId && e.subjectId === d.subjectId).length,
        );
    }

    const blocked = new Set(
      (await StaffUnavailability.findAll({ attributes: ['staffId', 'day', 'period'], raw: true })).map(
        (b) => `${b.staffId}|${b.day}|${b.period}`,
      ),
    );

    // each board has its own bell times; teachers are shared, so slots placed for one board count as busy for the next
    const result = { slots: [], unplaced: [] };
    for (const board of [...new Set(classes.map((c) => c.board))]) {
      const periods = (await loadBells(board)).filter((p) => p.kind !== 'break').map((p) => p.period);
      if (!periods.length) throw badRequest('Add class periods under Time slots first');
      const group = classes.filter((c) => c.board === board);
      const ids = new Set(group.map((c) => c.id));
      const part = generateTimetable({
        classes: group.map((c) => ({ id: c.id, label: `${c.name}-${c.section}` })),
        demands: demands.filter((d) => d.periods > 0 && ids.has(d.classId)),
        periods,
        days,
        labs,
        busy: [...kept, ...result.slots],
        blocked,
        maxTeacherPerDay,
      });
      result.slots.push(...part.slots);
      result.unplaced.push(...part.unplaced);
    }

    await sequelize.transaction(async (transaction) => {
      if (replace) await TimetableSlot.destroy({ where: { classId: classIds }, transaction });
      await TimetableSlot.bulkCreate(result.slots, { transaction });
    });

    res.json({
      classes: classes.length,
      placed: result.slots.length,
      unplaced: result.unplaced,
      skipped,
      defaulted,
      noTeacher: [
        ...new Set(
          demands
            .filter((d) => !d.staffId)
            .map(
              (d) =>
                `${classes.find((c) => c.id === d.classId).name}-${classes.find((c) => c.id === d.classId).section} ${d.subjectName}`,
            ),
        ),
      ],
    });
  }),
);

/** Places a subject in a class period; re-saving the same class/day/period replaces it. */
router.post(
  '/',
  asyncHandler(async (req, res) => {
    const { classId, day, period, subjectId } = req.body;
    const owner = classId ? await SchoolClass.findByPk(classId, { attributes: ['board'] }) : null;
    const bell = (await loadBells(owner?.board)).find((p) => p.period === Number(period));
    if (!bell) throw badRequest('That period is not in the school day. Add it under Period times first');
    if (bell.kind === 'break')
      throw badRequest(`${bell.label} is a break, so no subject can be placed in it`);
    const staffId = req.body.staffId || null;
    const roomId = req.body.roomId || null;
    if (!classId || !day || !period || !subjectId)
      throw badRequest('Class, day, period and subject are required');

    if (staffId) {
      if (await StaffUnavailability.findOne({ where: { staffId, day, period } }))
        throw conflict('That teacher is marked unavailable in this period');
      const clash = await TimetableSlot.findOne({
        where: { staffId, day, period, classId: { [Op.ne]: classId } },
        include: [{ model: SchoolClass, attributes: ['name', 'section'] }],
      });
      if (clash) {
        throw conflict(
          `That teacher already teaches ${clash.SchoolClass.name}-${clash.SchoolClass.section} in this period`,
        );
      }
    }

    if (roomId) {
      const used = await TimetableSlot.findOne({
        where: { roomId, day, period, classId: { [Op.ne]: classId } },
        include: [{ model: SchoolClass, attributes: ['name', 'section'] }],
      });
      if (used)
        throw conflict(
          `That room is already used by ${used.SchoolClass.name}-${used.SchoolClass.section} in this period`,
        );
    }

    await TimetableSlot.upsert({ classId, day, period, subjectId, staffId, roomId });
    res.status(201).json({ ok: true });
  }),
);

router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    await TimetableSlot.destroy({ where: { id: req.params.id } });
    res.json({ ok: true });
  }),
);

export default router;
