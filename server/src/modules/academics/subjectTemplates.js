/** Class stages used by board rules. A class is placed in a stage by its name; the stage list is structure, not a board rule. */
export const STAGES = ['pre', 'lower', 'upper', 'mid', 'sec', 'sr'];

/** Which stage a class name belongs to: Nursery/LKG/UKG, then 1-2, 3-5, 6-8, 9-10 and 11-12. */
export function stageOf(name) {
  if (/kinder|nursery|pre-?k|lkg|ukg|play/i.test(name)) return 'pre';
  const n = Number(/\d+/.exec(name)?.[0]);
  if (!Number.isFinite(n)) return null;
  return n <= 2 ? 'lower' : n <= 5 ? 'upper' : n <= 8 ? 'mid' : n <= 10 ? 'sec' : 'sr';
}
