import { GradeBand, GradingSetting } from '../../models/index.js';

/**
 * Fallback grade scale (percentage -> grade) used until the school saves its own under Grade setup.
 * Ordered from the highest threshold down.
 */
const DEFAULT_BANDS = [
  { min: 90, grade: 'A+' },
  { min: 80, grade: 'A' },
  { min: 70, grade: 'B' },
  { min: 60, grade: 'C' },
  { min: 50, grade: 'D' },
  { min: 40, grade: 'E' },
  { min: 0, grade: 'F' },
];

/** Fallback: a subject is failed below this percentage. */
const DEFAULT_PASS_PERCENT = 40;

/**
 * The school's grading policy: the saved bands and pass mark, or the defaults when none are saved.
 * Returns the policy plus gradeFor(percent), so callers load it once per request.
 */
export async function loadGrading() {
  const [rows, setting] = await Promise.all([
    GradeBand.findAll({ order: [['minPercent', 'DESC']] }),
    GradingSetting.findByPk(1),
  ]);
  const bands = rows.length
    ? rows.map((b) => ({ min: Number(b.minPercent), grade: b.grade }))
    : DEFAULT_BANDS;
  const passPercent = setting ? Number(setting.passPercent) : DEFAULT_PASS_PERCENT;
  return {
    bands,
    passPercent,
    isDefault: !rows.length && !setting,
    gradeFor: (percent) => (bands.find((b) => percent >= b.min) ?? bands[bands.length - 1]).grade,
  };
}
