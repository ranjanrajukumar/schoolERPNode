const two = (n) => String(n).padStart(2, '0');

/**
 * A date as YYYY-MM-DD in the browser's own time zone. `toISOString().slice(0, 10)` gives the UTC day instead,
 * which is yesterday for the first hours of the morning anywhere ahead of UTC (all of India before 05:30).
 */
export const localDate = (d = new Date()) =>
  `${d.getFullYear()}-${two(d.getMonth() + 1)}-${two(d.getDate())}`;

/** The day `n` days from today (negative for the past). */
export const daysFromNow = (n) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return localDate(d);
};
