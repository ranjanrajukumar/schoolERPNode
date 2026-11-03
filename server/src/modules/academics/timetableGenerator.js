/**
 * Constraint-based timetable generator. Pure: takes plain data, returns the slots it could place and what it could not.
 *
 * Hard rules: a class, a teacher and a room each hold one period at a time; a teacher has a daily limit;
 * practicals go in a lab, as a double period.
 * Soft rules (scored, lowest wins): a subject once a day, no same subject back to back, an even spread over the week,
 * an even load on each day.
 * It runs several randomised attempts and keeps the one with the fewest unplaced periods, then the fewest free periods inside a class's day.
 */

/** Small seeded generator so a run can be repeated. */
function prng(seed) {
  let s = seed >>> 0 || 1;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * @param {object} input
 * @param {{id:number,label:string}[]} input.classes     classes to fill
 * @param {{classId:number,subjectId:number,subjectName:string,staffId:number|null,periods:number,practical:boolean}[]} input.demands
 * @param {number[]} input.periods                       class period numbers of the school day, in order (breaks left out)
 * @param {number[]} input.days                          working days, 1 = Monday
 * @param {{id:number}[]} input.labs                     rooms that can host a practical
 * @param {{classId:number,day:number,period:number,staffId:number|null,roomId:number|null}[]} input.busy  slots that stay as they are
 * @param {number} [input.maxTeacherPerDay]
 * @param {number} [input.attempts]
 */
export function generateTimetable({
  classes,
  demands,
  periods,
  days,
  labs = [],
  busy = [],
  blocked = new Set(), // staff|day|period a teacher cannot teach
  maxTeacherPerDay = 6,
  attempts = 12,
  seed = 1,
}) {
  const rand = prng(seed);
  const classLabel = new Map(classes.map((c) => [c.id, c.label]));
  let best = null;

  // an unplaced period costs far more than a free period in the middle of a class's day
  const cost = (r) => {
    let gaps = 0;
    const byClassDay = new Map();
    for (const x of r.slots) {
      const k = `${x.classId}|${x.day}`;
      (byClassDay.get(k) ?? byClassDay.set(k, []).get(k)).push(periods.indexOf(x.period));
    }
    for (const list of byClassDay.values()) {
      list.sort((a, b) => a - b);
      for (let n = 1; n < list.length; n++) gaps += list[n] - list[n - 1] - 1;
    }
    r.gaps = gaps;
    return r.unplaced.length * 1000 + gaps;
  };
  let bestCost = Infinity;
  for (let attempt = 0; attempt < attempts; attempt++) {
    const result = runOnce(attempt === 0 ? null : rand);
    const c = cost(result);
    if (c < bestCost) {
      best = result;
      bestCost = c;
    }
    if (bestCost === 0) break;
  }
  return best;

  function runOnce(random) {
    const classBusy = new Set(); // class|day|period
    const teacherBusy = new Set(); // staff|day|period
    const roomBusy = new Set();
    const teacherDay = new Map(); // staff|day -> periods that day
    const bySubjectDay = new Map(); // class|subject|day -> count
    const classDay = new Map(); // class|day -> count
    const slots = [];
    const unplaced = [];

    for (const b of busy) {
      classBusy.add(`${b.classId}|${b.day}|${b.period}`);
      if (b.staffId) {
        teacherBusy.add(`${b.staffId}|${b.day}|${b.period}`);
        const k = `${b.staffId}|${b.day}`;
        teacherDay.set(k, (teacherDay.get(k) ?? 0) + 1);
      }
      if (b.roomId) roomBusy.add(`${b.roomId}|${b.day}|${b.period}`);
      const k = `${b.classId}|${b.day}`;
      classDay.set(k, (classDay.get(k) ?? 0) + 1);
    }

    // how many periods each teacher has to give: heavily loaded teachers are placed first, as they are the hardest to fit
    const load = new Map();
    for (const d of demands) if (d.staffId) load.set(d.staffId, (load.get(d.staffId) ?? 0) + d.periods);

    // one unit = one period, or one double period for a practical
    const units = [];
    for (const d of demands) {
      if (d.practical && d.periods >= 2) {
        for (let i = 0; i < Math.floor(d.periods / 2); i++) units.push({ d, size: 2 });
        if (d.periods % 2) units.push({ d, size: 1 });
      } else for (let i = 0; i < d.periods; i++) units.push({ d, size: 1 });
    }
    const weight = (u) =>
      (u.size === 2 ? 1000 : 0) +
      (u.d.staffId ? (load.get(u.d.staffId) ?? 0) : 0) +
      (random ? random() * 30 : 0);
    units.sort((a, b) => weight(b) - weight(a));

    // a period that leaves a free period between it and the rest of the class's day makes a gap
    const gapPenalty = (classId, day, span) => {
      // compare positions in the list of class periods: a break between two class periods is not a gap
      const held = periods
        .map((n, i) => (classBusy.has(`${classId}|${day}|${n}`) ? i : -1))
        .filter((i) => i >= 0);
      if (!held.length) return 0;
      const first = periods.indexOf(span[0]);
      const last = periods.indexOf(span[span.length - 1]);
      return held.some((i) => i === first - 1 || i === last + 1) ? 0 : 25;
    };

    const lab = (day, p, size) =>
      labs.find((r) =>
        [...Array(size).keys()].every((i) => !roomBusy.has(`${r.id}|${day}|${periods[p + i]}`)),
      );

    for (const { d, size } of units) {
      let pick = null;
      for (const day of days) {
        for (let p = 0; p + size <= periods.length; p++) {
          const span = [...Array(size).keys()].map((i) => periods[p + i]);
          // a double period must be back to back: a break row between two class periods leaves a gap in the numbers
          if (span[size - 1] - span[0] !== size - 1) continue;
          if (span.some((n) => classBusy.has(`${d.classId}|${day}|${n}`))) continue;
          if (d.staffId) {
            if (span.some((n) => teacherBusy.has(`${d.staffId}|${day}|${n}`))) continue;
            if (span.some((n) => blocked.has(`${d.staffId}|${day}|${n}`))) continue;
            if ((teacherDay.get(`${d.staffId}|${day}`) ?? 0) + size > maxTeacherPerDay) continue;
          }
          let room = null;
          if (d.practical && labs.length) {
            room = lab(day, p, size);
            if (!room) continue;
          }
          const sameToday = bySubjectDay.get(`${d.classId}|${d.subjectId}|${day}`) ?? 0;
          const touches = (n) =>
            slots.some(
              (s) =>
                s.classId === d.classId && s.subjectId === d.subjectId && s.day === day && s.period === n,
            );
          const adjacent = touches(periods[p - 1]) || touches(periods[p + size]);
          const score =
            sameToday * 100 +
            (adjacent && !(d.practical && size === 1) ? 40 : 0) +
            (classDay.get(`${d.classId}|${day}`) ?? 0) * 6 +
            (d.staffId ? (teacherDay.get(`${d.staffId}|${day}`) ?? 0) * 3 : 0) +
            p * 0.5 +
            gapPenalty(d.classId, day, span) +
            (random ? random() * 8 : 0);
          if (!pick || score < pick.score) pick = { day, p, span, room, score };
        }
      }
      if (!pick) {
        unplaced.push({
          classId: d.classId,
          className: classLabel.get(d.classId),
          subjectId: d.subjectId,
          subject: d.subjectName,
          periods: size,
        });
        continue;
      }
      for (const n of pick.span) {
        classBusy.add(`${d.classId}|${pick.day}|${n}`);
        if (d.staffId) teacherBusy.add(`${d.staffId}|${pick.day}|${n}`);
        if (pick.room) roomBusy.add(`${pick.room.id}|${pick.day}|${n}`);
        slots.push({
          classId: d.classId,
          day: pick.day,
          period: n,
          subjectId: d.subjectId,
          staffId: d.staffId ?? null,
          roomId: pick.room?.id ?? null,
        });
      }
      const sk = `${d.classId}|${d.subjectId}|${pick.day}`;
      bySubjectDay.set(sk, (bySubjectDay.get(sk) ?? 0) + size);
      const ck = `${d.classId}|${pick.day}`;
      classDay.set(ck, (classDay.get(ck) ?? 0) + size);
      if (d.staffId) {
        const tk = `${d.staffId}|${pick.day}`;
        teacherDay.set(tk, (teacherDay.get(tk) ?? 0) + size);
      }
    }
    return { slots, unplaced };
  }
}
