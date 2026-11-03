import { Attendance, ExamGroup, SchoolClass, Student } from '../../models/index.js';
import { notFound } from '../../utils/httpError.js';
import { getGroupResults } from '../exams/examExtras.service.js';
import { boardOfClass, resolveRule } from '../boards/boardRules.service.js';

/**
 * Who meets the board's promotion rule in a class: overall percentage of the class's annual result group, an overall
 * pass, and attendance. A check that cannot be made (no result group yet, no attendance taken) is reported as unknown,
 * never as a pass or a fail. The decision to promote stays with the administrator.
 */
export async function promotionEligibility(classId) {
  const cls = await SchoolClass.findByPk(classId);
  if (!cls) throw notFound('Class not found');
  const board = await boardOfClass(cls);
  const rule = await resolveRule(board, 'promotion');
  if (!rule) return { board: board.name, rule: null, rows: [] };
  const p = rule.payload;

  const examRule = await resolveRule(board, 'exam_pattern');
  const group = examRule
    ? await ExamGroup.findOne({ where: { classId, name: examRule.payload.groupName } })
    : null;
  const results = group
    ? new Map((await getGroupResults(group.id)).rows.map((r) => [r.studentId, r]))
    : new Map();

  const students = await Student.findAll({ where: { classId, status: 'active' }, attributes: ['id'] });
  const marks = await Attendance.findAll({
    where: { studentId: students.map((s) => s.id) },
    attributes: ['studentId', 'status'],
    raw: true,
  });
  const days = new Map();
  for (const m of marks) {
    const d = days.get(m.studentId) ?? { total: 0, present: 0 };
    d.total += 1;
    if (m.status !== 'absent') d.present += 1;
    days.set(m.studentId, d);
  }

  const rows = students.map((s) => {
    const r = results.get(s.id);
    const a = days.get(s.id);
    const attendance = a?.total ? Math.round((a.present / a.total) * 1000) / 10 : null;
    const reasons = [];
    const unknown = [];
    if (p.minOverallPercent !== null) {
      if (!r) unknown.push('no result yet');
      else if (r.percentage < p.minOverallPercent)
        reasons.push(`overall ${r.percentage}% is below ${p.minOverallPercent}%`);
    }
    if (p.requirePass) {
      if (!r || r.result === 'incomplete') unknown.push('result incomplete');
      else if (r.result === 'fail') reasons.push('failed a subject');
    }
    if (p.minAttendancePercent !== null) {
      if (attendance === null) unknown.push('no attendance recorded');
      else if (attendance < p.minAttendancePercent)
        reasons.push(`attendance ${attendance}% is below ${p.minAttendancePercent}%`);
    }
    return {
      studentId: s.id,
      percentage: r?.percentage ?? null,
      result: r?.result ?? null,
      attendance,
      status: reasons.length ? 'not-eligible' : unknown.length ? 'unknown' : 'eligible',
      reasons: [...reasons, ...unknown],
    };
  });
  return {
    board: board.name,
    rule: { version: rule.version, verified: rule.verified, sourceRef: rule.sourceRef, ...p },
    rows,
  };
}
