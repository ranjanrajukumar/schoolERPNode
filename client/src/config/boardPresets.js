/** Starting points for the two boards most schools follow. Every value stays editable after applying. */

export const BOARD_GRADING = {
  CBSE: {
    label: 'CBSE (9-point scale)',
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
  UP: {
    label: 'UP Board (divisions)',
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

const pad = (n) => String(n).padStart(2, '0');
const hhmm = (m) => `${pad(Math.floor(m / 60))}:${pad(m % 60)}`;

/** Builds the bell schedule: `periods` class periods of `len` minutes, with breaks inserted after given periods. */
function bells(start, len, periods, breaks) {
  const rows = [];
  let t = start;
  for (let p = 1; p <= periods; p++) {
    rows.push({ label: `Period ${p}`, kind: 'class', start: hhmm(t), end: hhmm(t + len) });
    t += len;
    if (breaks[p]) {
      rows.push({ label: breaks[p].label, kind: 'break', start: hhmm(t), end: hhmm(t + breaks[p].mins) });
      t += breaks[p].mins;
    }
  }
  return rows.map((r, i) => ({ ...r, period: i + 1 }));
}

export const BOARD_BELLS = {
  CBSE: {
    label: 'CBSE (8 × 40 min, short break and lunch)',
    rows: () =>
      bells(8 * 60, 40, 8, { 3: { label: 'Short break', mins: 15 }, 5: { label: 'Lunch', mins: 30 } }),
  },
  UP: {
    label: 'UP Board (8 × 35 min, one interval)',
    rows: () => bells(7 * 60 + 30, 35, 8, { 4: { label: 'Interval', mins: 25 } }),
  },
};
