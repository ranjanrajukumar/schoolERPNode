import { SchoolClass } from '../../models/index.js';
import { boardOfClass, findBoard, requireRule } from '../boards/boardRules.service.js';

/**
 * The grading policy of a board in an academic session (default: the current one), read from the board's grading rule.
 * Returns the policy plus gradeFor(percent), so callers load it once per request.
 */
export async function loadGrading(board = 'CBSE', yearId = null) {
  const boardRow = typeof board === 'object' && board ? board : await findBoard(board);
  const rule = await requireRule(boardRow ?? board, 'grading', 'default', yearId);
  const bands = [...rule.payload.bands].sort((a, b) => b.min - a.min);
  return {
    board: boardRow?.name ?? board,
    bands,
    passPercent: Number(rule.payload.passPercent),
    isDefault: !rule.verified, // a starter or unverified scale
    version: rule.version,
    sourceRef: rule.sourceRef,
    gradeFor: (percent) => (bands.find((b) => percent >= b.min) ?? bands[bands.length - 1]).grade,
  };
}

/** The grading policy of the board a class follows. */
export async function gradingForClass(classId) {
  const cls = classId ? await SchoolClass.findByPk(classId) : null;
  return loadGrading(await boardOfClass(cls));
}
