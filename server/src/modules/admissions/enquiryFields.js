import { today } from '../../utils/money.js';
/**
 * The extra details an enquiry (and the application that continues it) records beyond the registration details shared with students:
 * personal and address particulars, and the office's own enquiry information. They live on the admissions record only.
 * type: text | bool | date | number | json (the qualifications list). `max` is the column length for text. The same list drives the model, the database columns, validation and saving.
 */
export const ENQUIRY_FIELDS = [
  // personal
  { key: 'grandfatherName', label: "Grandfather's name", type: 'text', max: 120 },
  { key: 'nameHindi', label: 'Student full name (Hindi)', type: 'text', max: 160 },
  { key: 'bloodGroup', label: 'Blood group', type: 'text', max: 5 },
  { key: 'maritalStatus', label: 'Marital status', type: 'text', max: 20 },
  { key: 'domicile', label: 'Domicile (state)', type: 'text', max: 80 },
  { key: 'domicileNo', label: 'Domicile no.', type: 'text', max: 40 },
  { key: 'passportNo', label: 'Passport no.', type: 'text', max: 30 },
  { key: 'minority', label: 'Minority', type: 'text', max: 60 },
  { key: 'minorityName', label: 'Minority name', type: 'text', max: 80 },
  { key: 'physicallyHandicapped', label: 'Physically handicapped', type: 'bool' },
  { key: 'panCard', label: 'PAN card', type: 'text', max: 20 },
  { key: 'caste', label: 'Caste', type: 'text', max: 60 },
  { key: 'casteRegNo', label: 'Caste reg. no.', type: 'text', max: 40 },
  { key: 'subCaste', label: 'Sub caste', type: 'text', max: 60 },
  { key: 'birthPlace', label: 'Birth place', type: 'text', max: 100 },
  { key: 'residenceType', label: 'Residence type', type: 'text', max: 30 },
  // permanent address (address, city, state and pincode are the shared registration fields)
  { key: 'locality', label: 'Locality', type: 'text', max: 100 },
  { key: 'tehsil', label: 'Tehsil', type: 'text', max: 80 },
  { key: 'thana', label: 'Thana', type: 'text', max: 80 },
  { key: 'district', label: 'District', type: 'text', max: 80 },
  { key: 'country', label: 'Country', type: 'text', max: 60 },
  { key: 'landline', label: 'Landline', type: 'text', max: 20 },
  // current address
  { key: 'sameAsPermanent', label: 'Current address same as permanent', type: 'bool' },
  { key: 'curAddress', label: 'Address', type: 'text', max: 255 },
  { key: 'curLocality', label: 'Locality', type: 'text', max: 100 },
  { key: 'curCity', label: 'City', type: 'text', max: 80 },
  { key: 'curTehsil', label: 'Tehsil', type: 'text', max: 80 },
  { key: 'curThana', label: 'Thana', type: 'text', max: 80 },
  { key: 'curDistrict', label: 'District', type: 'text', max: 80 },
  { key: 'curState', label: 'State', type: 'text', max: 80 },
  { key: 'curCountry', label: 'Country', type: 'text', max: 60 },
  { key: 'curPincode', label: 'Pin', type: 'text', max: 12 },
  { key: 'curLandline', label: 'Landline', type: 'text', max: 20 },
  { key: 'curRemark', label: 'Remark', type: 'text', max: 255 },
  // previous qualifications: a list of rows (exam, board, institute, year, marks), kept as JSON text
  { key: 'qualifications', label: 'Qualifications', type: 'json' },
  // parent details (occupation and phone of each parent are registration fields that already exist)
  { key: 'fatherDob', label: "Father's date of birth", type: 'date' },
  { key: 'motherDob', label: "Mother's date of birth", type: 'date' },
  { key: 'fatherDom', label: "Father's date of marriage", type: 'date' },
  { key: 'motherDom', label: "Mother's date of marriage", type: 'date' },
  { key: 'fatherQualification', label: "Father's highest qualification", type: 'text', max: 80 },
  { key: 'motherQualification', label: "Mother's highest qualification", type: 'text', max: 80 },
  { key: 'fatherQualPercent', label: "Father's qualification %", type: 'number' },
  { key: 'motherQualPercent', label: "Mother's qualification %", type: 'number' },
  { key: 'fatherDesignation', label: "Father's designation", type: 'text', max: 100 },
  { key: 'motherDesignation', label: "Mother's designation", type: 'text', max: 100 },
  { key: 'fatherJobType', label: "Father's job type", type: 'text', max: 30 },
  { key: 'motherJobType', label: "Mother's job type", type: 'text', max: 30 },
  { key: 'fatherOrgType', label: "Father's organisation type", type: 'text', max: 60 },
  { key: 'motherOrgType', label: "Mother's organisation type", type: 'text', max: 60 },
  { key: 'fatherIncome', label: "Father's annual income", type: 'number' },
  { key: 'motherIncome', label: "Mother's annual income", type: 'number' },
  // contact details
  { key: 'fatherEmail', label: "Father's email", type: 'text', max: 150 },
  { key: 'motherEmail', label: "Mother's email", type: 'text', max: 150 },
  { key: 'emergencyPhone', label: 'Emergency mobile', type: 'text', max: 20 },
  { key: 'emergencyEmail', label: 'Emergency email', type: 'text', max: 150 },
  { key: 'officialPhone', label: 'Student official mobile', type: 'text', max: 20 },
  { key: 'officialEmail', label: 'Student official email', type: 'text', max: 150 },
  { key: 'alternatePhone', label: 'Alternate mobile', type: 'text', max: 20 },
  { key: 'alternateEmail', label: 'Alternate email', type: 'text', max: 150 },
  // local guardian
  { key: 'localGuardianName', label: 'Local guardian name', type: 'text', max: 120 },
  { key: 'localGuardianAddress', label: 'Local guardian address', type: 'text', max: 255 },
  { key: 'localGuardianDesignation', label: 'Local guardian designation', type: 'text', max: 100 },
  { key: 'localGuardianRelation', label: 'Local guardian relation', type: 'text', max: 40 },
  { key: 'localGuardianPhone', label: 'Local guardian phone', type: 'text', max: 20 },
  { key: 'localGuardianEmail', label: 'Local guardian email', type: 'text', max: 150 },
  // personal: the "others" flags and one more registration number
  { key: 'otherTransport', label: 'Transport', type: 'bool' },
  { key: 'otherHostel', label: 'Hostel', type: 'bool' },
  { key: 'otherMess', label: 'Mess', type: 'bool' },
  { key: 'incRegNo', label: 'Income certificate reg. no.', type: 'text', max: 40 },
  // local guardian: work and identity
  { key: 'localGuardianJobType', label: 'Local guardian job type', type: 'text', max: 30 },
  { key: 'localGuardianOccupation', label: 'Local guardian occupation', type: 'text', max: 100 },
  { key: 'localGuardianDepartment', label: 'Local guardian department', type: 'text', max: 100 },
  { key: 'localGuardianWorkPlace', label: 'Local guardian place of work', type: 'text', max: 120 },
  { key: 'localGuardianLandline', label: 'Local guardian landline', type: 'text', max: 20 },
  { key: 'localGuardianAadhaar', label: 'Local guardian Aadhaar no.', type: 'text', max: 20 },
  { key: 'localGuardianPan', label: 'Local guardian PAN card', type: 'text', max: 20 },
  // admission details (once the student is admitted)
  { key: 'subStatus', label: 'Sub status', type: 'text', max: 30 },
  { key: 'admThrough', label: 'Admitted through', type: 'text', max: 30 },
  { key: 'feeCategory', label: 'Fee category', type: 'text', max: 30 },
  { key: 'admUnder', label: 'Admitted under', type: 'text', max: 40 },
  { key: 'serialNo', label: 'Serial no.', type: 'text', max: 20 },
  { key: 'accId', label: 'Account ID', type: 'text', max: 30 },
  { key: 'enrollNo', label: 'Enrollment no.', type: 'text', max: 30 },
  { key: 'penId', label: 'PEN ID', type: 'text', max: 30 },
  { key: 'apaarId', label: 'APAAR ID', type: 'text', max: 30 },
  { key: 'doj', label: 'Date of joining', type: 'date' },
  { key: 'migrated', label: 'Migration student', type: 'bool' },
  { key: 'confirmStatus', label: 'Admission confirmed', type: 'bool' },
  { key: 'provisionalAdm', label: 'Provisional admission', type: 'bool' },
  { key: 'provisionalRemark', label: 'Provisional admission remark', type: 'text', max: 255 },
  { key: 'reAdmission', label: 'Re-admission of an alumni student', type: 'bool' },
  // brothers and sisters already in the school (a list of rows)
  { key: 'siblings', label: 'Siblings', type: 'json' },
  // official (office use)
  { key: 'formStatus', label: 'Form status', type: 'text', max: 30 },
  { key: 'sourceSpecify', label: 'Specify source', type: 'text', max: 100 },
  { key: 'subCategory', label: 'Sub category / quota', type: 'text', max: 60 },
  { key: 'applFormNo', label: 'Application form no.', type: 'text', max: 40 },
  { key: 'place', label: 'Place', type: 'text', max: 100 },
  { key: 'lateralEntry', label: 'Lateral entry', type: 'bool' },
  { key: 'prospectusGiven', label: 'Prospectus given', type: 'bool' },
  { key: 'programType', label: 'Program type', type: 'text', max: 30 },
  { key: 'resultAwaited', label: 'Result awaited', type: 'bool' },
  { key: 'priority', label: 'Priority', type: 'text', max: 20 },
  { key: 'referenceOf', label: 'Reference of', type: 'text', max: 100 },
  { key: 'scholarshipEligibility', label: 'Scholarship eligibility under', type: 'text', max: 100 },
  { key: 'physicallyVisited', label: 'Physically visited', type: 'bool' },
  { key: 'studyType', label: 'Study type', type: 'text', max: 30 },
  { key: 'specialization', label: 'Specialization in', type: 'text', max: 100 },
];

export const QUALIFICATION_COLUMNS = [
  ['exam', 'Class passed', 60], ['board', 'Board', 100], ['institute', 'School', 120], ['subject', 'Subjects', 80], ['medium', 'Medium', 30], ['eduStatus', 'Status', 30],
  ['year', 'Year of passing', 4], ['rollNo', 'Roll no.', 30], ['marksObtained', 'Marks obtained', 8], ['maxMarks', 'Out of', 8], ['percent', 'Marks %', 6], ['grade', 'Division / grade', 30],
];
export const SIBLING_COLUMNS = [['type', 'Relation', 30], ['admissionNo', 'Admission no. / employee code', 40], ['name', 'Name', 120], ['className', 'Class', 40]];
const MAX_QUALIFICATIONS = 10;
const MAX_SIBLINGS = 10;

/** The stored qualifications as a list (an old or empty value is an empty list). */
export const parseQualifications = (stored) => {
  if (Array.isArray(stored)) return stored;
  try { const v = stored ? JSON.parse(stored) : []; return Array.isArray(v) ? v : []; } catch { return []; }
};

/** Checks the qualification rows from a form: trimmed, empty rows dropped, year and percent sensible. Returns { rows } or { error }. */
function cleanQualifications(input) {
  const list = typeof input === 'string' ? parseQualifications(input) : Array.isArray(input) ? input : [];
  const rows = [];
  for (const raw of list) {
    const row = {};
    for (const [key, label, max] of QUALIFICATION_COLUMNS) {
      const v = raw?.[key] === undefined || raw?.[key] === null ? '' : String(raw[key]).trim();
      if (v.length > max) return { error: `${label} must be ${max} characters or fewer` };
      row[key] = v;
    }
    if (QUALIFICATION_COLUMNS.every(([key]) => key === 'exam' || !row[key])) continue; // only the exam name: nothing recorded yet
    if (row.year && !(Number(row.year) >= 1950 && Number(row.year) <= new Date().getFullYear() + 1 && Number.isInteger(Number(row.year)))) return { error: `${row.exam || 'Qualification'}: year of passing is not valid` };
    if (row.percent && !(Number(row.percent) >= 0 && Number(row.percent) <= 100)) return { error: `${row.exam || 'Qualification'}: marks % must be between 0 and 100` };
    for (const key of ['marksObtained', 'maxMarks']) if (row[key] && !(Number(row[key]) >= 0)) return { error: `${row.exam || 'Qualification'}: marks must be a number, zero or more` };
    if (row.marksObtained && row.maxMarks && Number(row.marksObtained) > Number(row.maxMarks)) return { error: `${row.exam || 'Qualification'}: marks obtained cannot be above the maximum` };
    rows.push(row);
  }
  if (rows.length > MAX_QUALIFICATIONS) return { error: `At most ${MAX_QUALIFICATIONS} qualifications can be recorded` };
  return { rows };
}

/** Checks the siblings rows from a form: trimmed, empty rows dropped. Returns { rows } or { error }. */
function cleanSiblings(input) {
  const list = Array.isArray(input) ? input : [];
  const rows = [];
  for (const raw of list) {
    const row = {};
    for (const [key, label, max] of SIBLING_COLUMNS) {
      const v = raw?.[key] === undefined || raw?.[key] === null ? '' : String(raw[key]).trim();
      if (v.length > max) return { error: `Sibling ${label.toLowerCase()} must be ${max} characters or fewer` };
      row[key] = v;
    }
    if (SIBLING_COLUMNS.every(([key]) => key === 'type' || !row[key])) continue; // only the relation: nothing recorded yet
    rows.push(row);
  }
  if (rows.length > MAX_SIBLINGS) return { error: `At most ${MAX_SIBLINGS} siblings can be recorded` };
  return { rows };
}

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const blank = (v) => v === undefined || v === null || String(v).trim() === '';

/** The extra fields of a request as columns to save: text trimmed (empty = null), flags true/false. Returns { data, error }. */
export function cleanEnquiryExtras(body) {
  const data = {};
  for (const f of ENQUIRY_FIELDS) {
    if (body[f.key] === undefined) continue;
    if (f.type === 'json') {
      const q = f.key === 'siblings' ? cleanSiblings(body[f.key]) : cleanQualifications(body[f.key]);
      if (q.error) return { error: q.error };
      data[f.key] = q.rows.length ? q.rows : null;
      continue;
    }
    if (f.type === 'bool') { data[f.key] = body[f.key] === true || body[f.key] === 'true' || body[f.key] === 1; continue; }
    if (f.type === 'date') {
      if (blank(body[f.key])) { data[f.key] = null; continue; }
      const d = String(body[f.key]).slice(0, 10);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(d) || Number.isNaN(new Date(d).getTime())) return { error: `${f.label} is not a valid date` };
      if (d > today()) return { error: `${f.label} cannot be in the future` };
      data[f.key] = d; continue;
    }
    if (f.type === 'number') {
      if (blank(body[f.key])) { data[f.key] = null; continue; }
      const n = Number(body[f.key]);
      if (!Number.isFinite(n) || n < 0) return { error: `${f.label} must be a number, zero or more` };
      if (/Percent$/.test(f.key) && n > 100) return { error: `${f.label} cannot be above 100` };
      if (n > 99999999999) return { error: `${f.label} is too large` };
      data[f.key] = n; continue;
    }
    const v = blank(body[f.key]) ? null : String(body[f.key]).trim();
    if (v && v.length > f.max) return { error: `${f.label} must be ${f.max} characters or fewer` };
    data[f.key] = v;
  }
  for (const f of ENQUIRY_FIELDS) {
    if (/Email$/.test(f.key) && data[f.key] && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data[f.key])) return { error: `${f.label} is not a valid email address` };
    if (/Phone$/.test(f.key) && data[f.key] && !/^[0-9+()\-\s]{5,20}$/.test(data[f.key])) return { error: `${f.label} must be a phone number` };
  }
  if (data.bloodGroup && !BLOOD_GROUPS.includes(data.bloodGroup)) return { error: 'Blood group is not valid' };
  if (data.landline && !/^[0-9+()\-\s]{5,20}$/.test(data.landline)) return { error: 'Landline must be a phone number' };
  if (data.curLandline && !/^[0-9+()\-\s]{5,20}$/.test(data.curLandline)) return { error: 'Current landline must be a phone number' };
  return { data };
}

/** Every detailed field carries over from the enquiry to the student record at enrolment. */
export const STUDENT_EXTRA_KEYS = ENQUIRY_FIELDS.map((f) => f.key);
