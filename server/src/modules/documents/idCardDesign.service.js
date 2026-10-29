import { Setting } from '../../models/index.js';
import { badRequest } from '../../utils/httpError.js';

const KEY = 'idcard.design';

/** What each card can show. The order here is the order on the card. */
export const FIELDS = {
  student: {
    admissionNo: 'Admission no',
    rollNo: 'Roll no',
    className: 'Class',
    dob: 'Date of birth',
    guardianName: 'Guardian',
    guardianPhone: 'Phone',
  },
  staff: {
    staffNo: 'Staff no',
    designation: 'Designation',
    departmentName: 'Department',
    phone: 'Phone',
    email: 'Email',
    joinDate: 'Joined',
  },
};

const DEFAULT_DESIGN = {
  headerColor: '#1e293b',
  accentColor: '#2563eb',
  showLogo: true,
  showAcademicYear: true,
  footerText: '',
  signatureLabel: '',
  student: {
    title: 'Student ID',
    fields: ['admissionNo', 'className', 'dob', 'guardianName', 'guardianPhone'],
  },
  staff: { title: 'Staff ID', fields: ['staffNo', 'designation', 'departmentName', 'phone'] },
};

const COLOR = /^#[0-9a-fA-F]{6}$/;
const bool = (v, label) => {
  if (typeof v !== 'boolean') throw badRequest(`${label} must be on or off`);
  return v;
};
const text = (v, label, max) => {
  const t = String(v ?? '').trim();
  if (t.length > max) throw badRequest(`${label} must be ${max} characters or fewer`);
  return t;
};

/** Checks a design sent by the settings page and returns a clean copy. Anything missing falls back to the default. */
function cleanDesign(input = {}) {
  const d = { ...DEFAULT_DESIGN, ...input };
  for (const [key, label] of [
    ['headerColor', 'Header colour'],
    ['accentColor', 'Accent colour'],
  ]) {
    if (!COLOR.test(String(d[key]))) throw badRequest(`${label} must look like #1e293b`);
  }
  const out = {
    headerColor: d.headerColor.toLowerCase(),
    accentColor: d.accentColor.toLowerCase(),
    showLogo: bool(d.showLogo, 'Show logo'),
    showAcademicYear: bool(d.showAcademicYear, 'Show academic year'),
    footerText: text(d.footerText, 'Footer text', 60),
    signatureLabel: text(d.signatureLabel, 'Signature label', 40),
  };
  for (const kind of ['student', 'staff']) {
    const part = { ...DEFAULT_DESIGN[kind], ...(input[kind] ?? {}) };
    if (!Array.isArray(part.fields)) throw badRequest(`Choose the ${kind} card fields as a list`);
    const bad = part.fields.find((f) => !FIELDS[kind][f]);
    if (bad) throw badRequest(`"${bad}" cannot be shown on a ${kind} card`);
    const title = text(part.title, `${kind === 'student' ? 'Student' : 'Staff'} card title`, 30);
    if (!title) throw badRequest(`The ${kind} card needs a title`);
    // keep the fixed order, whatever order the browser sent
    out[kind] = { title, fields: Object.keys(FIELDS[kind]).filter((f) => part.fields.includes(f)) };
  }
  return out;
}

export async function getDesign() {
  const row = await Setting.findByPk(KEY);
  if (!row) return DEFAULT_DESIGN;
  try {
    return cleanDesign(JSON.parse(row.value));
  } catch {
    return DEFAULT_DESIGN;
  }
}

export async function saveDesign(input, byName) {
  const design = cleanDesign(input);
  await Setting.upsert({ key: KEY, value: JSON.stringify(design), updatedByName: byName });
  return design;
}

export async function resetDesign() {
  await Setting.destroy({ where: { key: KEY } });
  return DEFAULT_DESIGN;
}
