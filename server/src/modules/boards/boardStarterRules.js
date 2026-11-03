/**
 * Starter values used ONLY to fill an empty rules table the first time. They are not official board rules:
 * they are saved as unverified, with no source, and an administrator replaces them (and records the source) under Board rules.
 */
import { SUBJECT_STARTERS } from '../academics/subjectStarters.js';

export const STARTER_NOTE = 'Starter value, not verified against the board';

export const EXAM_STARTERS = {
  CBSE: {
    groupName: 'Annual result',
    skipStages: ['pre'],
    exams: [
      { name: 'Periodic Test 1', maxMarks: 20, weight: 10 },
      { name: 'Half-Yearly Exam', maxMarks: 80, weight: 30 },
      { name: 'Periodic Test 2', maxMarks: 20, weight: 10 },
      { name: 'Annual Exam', maxMarks: 80, weight: 50 },
    ],
  },
  'UP Board': {
    groupName: 'Annual result',
    skipStages: ['pre'],
    exams: [
      { name: 'Quarterly (Trimasik)', maxMarks: 100, weight: 20 },
      { name: 'Half-Yearly (Ardhvarshik)', maxMarks: 100, weight: 30 },
      { name: 'Annual (Varshik)', maxMarks: 100, weight: 50 },
    ],
  },
};

export const GRADING_STARTERS = {
  CBSE: {
    passPercent: 33,
    bands: [
      { grade: 'A1', min: 91 },
      { grade: 'A2', min: 81 },
      { grade: 'B1', min: 71 },
      { grade: 'B2', min: 61 },
      { grade: 'C1', min: 51 },
      { grade: 'C2', min: 41 },
      { grade: 'D', min: 33 },
      { grade: 'E1', min: 21 },
      { grade: 'E2', min: 0 },
    ],
  },
  'UP Board': {
    passPercent: 33,
    bands: [
      { grade: 'Dist.', min: 75 },
      { grade: 'I Div', min: 60 },
      { grade: 'II Div', min: 45 },
      { grade: 'III Div', min: 33 },
      { grade: 'Fail', min: 0 },
    ],
  },
};

/** Promotion thresholds. A null limit means that check is not applied. */
export const PROMOTION_STARTERS = {
  CBSE: { minOverallPercent: 33, requirePass: true, minAttendancePercent: 75 },
  'UP Board': { minOverallPercent: 33, requirePass: true, minAttendancePercent: 75 },
};

/** What a board's report card shows. The wording and fields are the school's to set; nothing here is an official format. */
const CARD = {
  title: 'Report card',
  showPercentage: true,
  showGrade: true,
  showRank: true,
  showAttendance: true,
  showAffiliation: true,
  footerNote: '',
};
export const REPORT_CARD_STARTERS = { CBSE: CARD, 'UP Board': CARD };

export { SUBJECT_STARTERS };
