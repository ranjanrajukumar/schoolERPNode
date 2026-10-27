/** Fixed-point helpers so money never accumulates floating point drift. */
export const toCents = (value) => Math.round(Number(value) * 100);
export const fromCents = (cents) => (cents / 100).toFixed(2);

const two = (n) => String(n).padStart(2, '0');

/**
 * A date as YYYY-MM-DD in the server's own time zone (set TZ for the school's zone when the host is elsewhere).
 * toISOString().slice(0, 10) gives the UTC day, which is yesterday for the first hours of the morning anywhere ahead of UTC.
 */
export const localDate = (d = new Date()) => `${d.getFullYear()}-${two(d.getMonth() + 1)}-${two(d.getDate())}`;
export const today = () => localDate();
/** The day `n` days from today (negative for the past). */
export const daysFromNow = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return localDate(d); };
