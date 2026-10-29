const fmt = (date) =>
  date
    ? new Date(`${date}T00:00:00`).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : '—';
const PRONOUNS = { male: ['He', 'his', 'son'], female: ['She', 'her', 'daughter'] };

/** The values a certificate's wording can use, from the facts frozen when it was issued. */
export function templateVars(d, school = '') {
  const [he, his, child] = PRONOUNS[d.gender] ?? ['The student', 'the', 'ward'];
  return {
    school,
    studentName: d.studentName,
    admissionNo: d.admissionNo,
    className: d.className ?? 'this school',
    guardianName: d.guardianName || '—',
    dob: fmt(d.dob),
    academicYear: d.academicYear ?? '—',
    purpose: d.purpose ?? 'general use',
    child,
    he,
    his,
    conduct: d.conduct ?? 'Good',
    leavingDate: fmt(d.leavingDate),
    leavingReason: d.leavingReason ?? '—',
    duesStatus: d.duesCleared ? 'cleared' : 'not cleared',
    feesBilled: d.feesBilled,
    feesPaid: d.feesPaid,
    feesOutstanding: d.feesOutstanding,
  };
}

/** Fills {{placeholders}}; an unknown or missing value becomes empty. Returns paragraphs (blank line = new paragraph). */
export function renderParagraphs(body, vars) {
  return String(body ?? '')
    .replace(/\{\{\s*(\w+)\s*\}\}/g, (_m, key) => vars[key] ?? '')
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
}
