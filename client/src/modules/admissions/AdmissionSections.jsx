import { useEffect, useState } from 'react';
import FormSection from '../../components/FormSection.jsx';
import MasterSelect from '../../components/MasterSelect.jsx';
import PhotoField from '../../components/PhotoField.jsx';
import { localDate } from '../../utils/dates.js';

/**
 * The detailed sections shared by the enquiry form and the application flow, so both collect the same fields in the same order:
 * personal info, family names, permanent and current address, and the office's own enquiry information.
 */
const BLOOD = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const PROGRAM = ['Diploma', 'Degree', 'Certificate', 'School', 'Other'];
const STUDY = ['Full Time', 'Part Time', 'Distance'];
const RESIDENCE = ['Own house', 'Rented', 'Hostel', 'Paying guest', 'Other'];
const SOURCES = [
  ['online', 'Website'],
  ['office', 'Walk-in'],
  ['phone', 'Phone'],
  ['referral', 'Referral'],
  ['social', 'Social media'],
  ['other', 'Other'],
];
const MINORITY = ['Muslim', 'Christian', 'Sikh', 'Buddhist', 'Jain', 'Parsi'];

/** Every field these sections add, with its empty value; merged into a form's starting state. */
export const SECTION_EMPTY = {
  otherTransport: false,
  otherHostel: false,
  otherMess: false,
  incRegNo: '',
  localGuardianJobType: '',
  localGuardianOccupation: '',
  localGuardianDepartment: '',
  localGuardianWorkPlace: '',
  localGuardianLandline: '',
  localGuardianAadhaar: '',
  localGuardianPan: '',
  subStatus: '',
  admThrough: '',
  feeCategory: '',
  admUnder: '',
  serialNo: '',
  accId: '',
  enrollNo: '',
  penId: '',
  apaarId: '',
  doj: '',
  migrated: false,
  confirmStatus: false,
  provisionalAdm: false,
  provisionalRemark: '',
  reAdmission: false,
  siblings: [],
  panCard: '',
  caste: '',
  casteRegNo: '',
  subCaste: '',
  birthPlace: '',
  residenceType: '',
  formStatus: '',
  source: '',
  qualifications: [],
  middleName: '',
  nameHindi: '',
  phone: '',
  bloodGroup: '',
  maritalStatus: '',
  nationality: '',
  religion: '',
  domicile: '',
  domicileNo: '',
  passportNo: '',
  nationalId: '',
  minority: '',
  minorityName: '',
  physicallyHandicapped: false,
  fatherName: '',
  motherName: '',
  grandfatherName: '',
  fatherDob: '',
  motherDob: '',
  fatherDom: '',
  motherDom: '',
  fatherQualification: '',
  motherQualification: '',
  fatherQualPercent: '',
  motherQualPercent: '',
  fatherOccupation: '',
  motherOccupation: '',
  fatherDesignation: '',
  motherDesignation: '',
  fatherJobType: '',
  motherJobType: '',
  fatherOrgType: '',
  motherOrgType: '',
  fatherIncome: '',
  motherIncome: '',
  fatherPhone: '',
  fatherEmail: '',
  motherPhone: '',
  motherEmail: '',
  emergencyPhone: '',
  emergencyEmail: '',
  officialPhone: '',
  officialEmail: '',
  alternatePhone: '',
  alternateEmail: '',
  localGuardianName: '',
  localGuardianAddress: '',
  localGuardianDesignation: '',
  localGuardianRelation: '',
  localGuardianPhone: '',
  localGuardianEmail: '',
  locality: '',
  city: '',
  tehsil: '',
  thana: '',
  district: '',
  state: '',
  country: 'India',
  pincode: '',
  landline: '',
  sameAsPermanent: false,
  curAddress: '',
  curLocality: '',
  curCity: '',
  curTehsil: '',
  curThana: '',
  curDistrict: '',
  curState: '',
  curCountry: 'India',
  curPincode: '',
  curLandline: '',
  curRemark: '',
  category: '',
  subCategory: '',
  referredBy: '',
  sourceSpecify: '',
  applFormNo: '',
  place: '',
  lateralEntry: false,
  prospectusGiven: false,
  programType: '',
  resultAwaited: false,
  priority: '',
  referenceOf: '',
  scholarshipEligibility: '',
  physicallyVisited: false,
  studyType: '',
  specialization: '',
};

/** Labels for the read-only details popup, grouped the way the forms group them. */
export const DETAIL_GROUPS = [
  [
    'Personal info',
    [
      ['middleName', 'Middle name'],
      ['nameHindi', 'Student full name (Hindi)'],
      ['fatherName', "Father's name"],
      ['motherName', "Mother's name"],
      ['grandfatherName', "Grandfather's name"],
      ['bloodGroup', 'Blood group'],
      ['maritalStatus', 'Marital status'],
      ['phone', 'Mobile no.'],
      ['nationality', 'Nationality'],
      ['religion', 'Religion'],
      ['domicile', 'Domicile'],
      ['domicileNo', 'Domicile no.'],
      ['passportNo', 'Passport no.'],
      ['nationalId', 'Aadhaar no.'],
      ['panCard', 'PAN card'],
      ['caste', 'Caste'],
      ['casteRegNo', 'Caste reg. no.'],
      ['subCaste', 'Sub caste'],
      ['birthPlace', 'Birth place'],
      ['residenceType', 'Residence type'],
      ['minority', 'Minority'],
      ['minorityName', 'Minority name'],
      ['physicallyHandicapped', 'Physically handicapped'],
      ['incRegNo', 'Income certificate reg. no.'],
      ['otherTransport', 'Transport'],
      ['otherHostel', 'Hostel'],
      ['otherMess', 'Mess'],
    ],
  ],
  [
    'Parent details',
    [
      ['fatherDob', "Father's date of birth"],
      ['fatherDom', "Father's date of marriage"],
      ['fatherQualification', "Father's highest qualification"],
      ['fatherQualPercent', "Father's qualification %"],
      ['fatherOccupation', "Father's occupation"],
      ['fatherDesignation', "Father's designation"],
      ['fatherJobType', "Father's job type"],
      ['fatherOrgType', "Father's organisation type"],
      ['fatherIncome', "Father's annual income"],
      ['motherDob', "Mother's date of birth"],
      ['motherDom', "Mother's date of marriage"],
      ['motherQualification', "Mother's highest qualification"],
      ['motherQualPercent', "Mother's qualification %"],
      ['motherOccupation', "Mother's occupation"],
      ['motherDesignation', "Mother's designation"],
      ['motherJobType', "Mother's job type"],
      ['motherOrgType', "Mother's organisation type"],
      ['motherIncome', "Mother's annual income"],
    ],
  ],
  [
    'Contact details',
    [
      ['fatherPhone', "Father's mobile"],
      ['fatherEmail', "Father's email"],
      ['motherPhone', "Mother's mobile"],
      ['motherEmail', "Mother's email"],
      ['emergencyPhone', 'Emergency mobile'],
      ['emergencyEmail', 'Emergency email'],
      ['officialPhone', 'Student official mobile'],
      ['officialEmail', 'Student official email'],
      ['alternatePhone', 'Alternate mobile'],
      ['alternateEmail', 'Alternate email'],
    ],
  ],
  [
    'Local guardian',
    [
      ['localGuardianName', 'Name'],
      ['localGuardianAddress', 'Address'],
      ['localGuardianDesignation', 'Designation'],
      ['localGuardianRelation', 'Relation'],
      ['localGuardianPhone', 'Phone'],
      ['localGuardianEmail', 'Email'],
      ['localGuardianJobType', 'Job type'],
      ['localGuardianOccupation', 'Occupation'],
      ['localGuardianDepartment', 'Department'],
      ['localGuardianWorkPlace', 'Place of work'],
      ['localGuardianLandline', 'Landline'],
      ['localGuardianAadhaar', 'Aadhaar no.'],
      ['localGuardianPan', 'PAN card'],
    ],
  ],
  [
    'Permanent address',
    [
      ['address', 'Address'],
      ['locality', 'Locality'],
      ['city', 'City'],
      ['tehsil', 'Tehsil'],
      ['thana', 'Thana'],
      ['district', 'District'],
      ['state', 'State'],
      ['country', 'Country'],
      ['pincode', 'Pin'],
      ['landline', 'Landline'],
    ],
  ],
  [
    'Current address',
    [
      ['sameAsPermanent', 'Same as permanent'],
      ['curAddress', 'Address'],
      ['curLocality', 'Locality'],
      ['curCity', 'City'],
      ['curTehsil', 'Tehsil'],
      ['curThana', 'Thana'],
      ['curDistrict', 'District'],
      ['curState', 'State'],
      ['curCountry', 'Country'],
      ['curPincode', 'Pin'],
      ['curLandline', 'Landline'],
      ['curRemark', 'Remark'],
    ],
  ],
  [
    'Official info',
    [
      ['category', 'Cat / quota'],
      ['subCategory', 'Sub cat / quota'],
      ['sourceSpecify', 'Specify source'],
      ['formStatus', 'Form status'],
      ['referredBy', 'Referenced by'],
      ['referenceOf', 'Reference of'],
      ['applFormNo', 'Application form no.'],
      ['place', 'Place'],
      ['programType', 'Program type'],
      ['studyType', 'Study type'],
      ['specialization', 'Specialization in'],
      ['priority', 'Priority'],
      ['scholarshipEligibility', 'Scholarship eligibility under'],
      ['lateralEntry', 'Lateral entry'],
      ['prospectusGiven', 'Prospectus given'],
      ['resultAwaited', 'Result awaited'],
      ['physicallyVisited', 'Physically visited'],
    ],
  ],
];

/** A saved detail as text for reading: dates formatted, % and income shown as such, flags as Yes (an unticked flag shows nothing). */
export function formatDetail(key, value) {
  if (value === true) return 'Yes';
  if (value === false || value === null || value === undefined || value === '') return null;
  if (/(Dob|Dom)$/.test(key) || key === 'doj')
    return new Date(`${String(value).slice(0, 10)}T00:00:00`).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  if (/QualPercent$/.test(key)) return `${Number(value)}%`;
  if (/Income$/.test(key)) return Number(value).toLocaleString('en-IN');
  return String(value);
}

/** Particulars that belong to an admitted student (shown on the student popup only). */
export const ADMISSION_GROUPS = [
  [
    'Admission details',
    [
      ['subStatus', 'Sub status'],
      ['admThrough', 'Admitted through'],
      ['feeCategory', 'Fee category'],
      ['admUnder', 'Admitted under'],
      ['serialNo', 'Serial no.'],
      ['accId', 'Account ID'],
      ['enrollNo', 'Enrollment no.'],
      ['penId', 'PEN ID'],
      ['apaarId', 'APAAR ID'],
      ['doj', 'Date of joining'],
      ['migrated', 'Migration student'],
      ['confirmStatus', 'Admission confirmed'],
      ['provisionalAdm', 'Provisional admission'],
      ['provisionalRemark', 'Provisional admission remark'],
      ['reAdmission', 'Re-admission of an alumni student'],
    ],
  ],
];

/** The grey example text of a box: "Enter" and its label, keeping acronyms (PAN, PEN) as written. */
const hint = (label) =>
  `Enter ${/^[A-Z][a-z]/.test(label) ? label[0].toLowerCase() + label.slice(1) : label}`;

const splitName = (v) => {
  const t = String(v ?? '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  return t.length <= 1 ? [t[0] ?? '', '', ''] : [t[0], t.slice(1, -1).join(' '), t[t.length - 1]];
};

/** First / middle / last boxes over one stored full name. */
function NameTriple({ label, value, onChange, required }) {
  const [parts, setParts] = useState(() => splitName(value));
  useEffect(() => {
    if (parts.join(' ').replace(/\s+/g, ' ').trim() !== String(value ?? '').trim())
      setParts(splitName(value));
  }, [value]); // eslint-disable-line react-hooks/exhaustive-deps
  const change = (i) => (e) => {
    const next = [...parts];
    next[i] = e.target.value;
    setParts(next);
    onChange(
      next
        .map((x) => x.trim())
        .filter(Boolean)
        .join(' '),
    );
  };
  return (
    <div className="wide name-triple" style={{ gridColumn: '1 / -1' }}>
      <span className="field-title">
        {label}
        {required ? ' *' : ''}
      </span>
      <div className="triple">
        {['First name', 'Middle name', 'Last name'].map((p, i) => (
          <input
            key={p}
            value={parts[i]}
            onChange={change(i)}
            placeholder={p}
            aria-label={`${label} ${p.toLowerCase()}`}
            maxLength={80}
          />
        ))}
      </div>
    </div>
  );
}

const Check = ({ form, set, k, label }) => (
  <label className="check-inline">
    <input type="checkbox" checked={Boolean(form[k])} onChange={(e) => set(k, e.target.checked)} /> {label}
  </label>
);

export function PersonalSection({ form, set, hideNationality = false, withEmail = false }) {
  const text = (k, label, props = {}) => (
    <label>
      <span>{label}</span>
      <input value={form[k]} onChange={(e) => set(k, e.target.value)} placeholder={hint(label)} {...props} />
    </label>
  );
  return (
    <FormSection title="Personal info" glyph="♙" tone="blue" sub="Names, identity and background details">
      {text('middleName', 'Student middle name', { maxLength: 80 })}
      {text('nameHindi', 'Student full name (Hindi)', { maxLength: 160 })}
      <NameTriple label="Father" value={form.fatherName} onChange={(v) => set('fatherName', v)} />
      <NameTriple label="Mother" value={form.motherName} onChange={(v) => set('motherName', v)} />
      <NameTriple
        label="Grandfather"
        value={form.grandfatherName}
        onChange={(v) => set('grandfatherName', v)}
      />
      <label>
        <span>Blood group</span>
        <select value={form.bloodGroup} onChange={(e) => set('bloodGroup', e.target.value)}>
          <option value="">Select</option>
          {BLOOD.map((b) => (
            <option key={b} value={b}>
              {b}
            </option>
          ))}
        </select>
      </label>
      <label>
        <span>Marital status</span>
        <MasterSelect
          type="marital_status"
          value={form.maritalStatus}
          onChange={(e) => set('maritalStatus', e.target.value)}
          placeholder="Select"
        />
      </label>
      {withEmail &&
        text('email', 'Email', { type: 'email', maxLength: 150, placeholder: 'name@example.com' })}
      {text('phone', 'Mobile no.', { type: 'tel', maxLength: 20, placeholder: '+91 98765 43210' })}
      {!hideNationality && (
        <label>
          <span>Nationality</span>
          <MasterSelect
            type="nationality"
            value={form.nationality}
            onChange={(e) => set('nationality', e.target.value)}
            placeholder="e.g. Indian"
          />
        </label>
      )}
      <label>
        <span>Religion</span>
        <MasterSelect
          type="religion"
          value={form.religion}
          onChange={(e) => set('religion', e.target.value)}
          placeholder="Select"
        />
      </label>
      <label>
        <span>Domicile (state)</span>
        <MasterSelect
          type="state"
          value={form.domicile}
          onChange={(e) => set('domicile', e.target.value)}
          placeholder="Select state"
        />
      </label>
      {text('domicileNo', 'Domicile no.', { maxLength: 40 })}
      {text('passportNo', 'Passport no.', { maxLength: 30 })}
      {text('nationalId', 'Aadhaar no.', { maxLength: 20 })}
      {text('panCard', 'PAN card', { maxLength: 20 })}
      {text('caste', 'Caste', { maxLength: 60 })}
      {text('casteRegNo', 'Caste reg. no.', { maxLength: 40 })}
      {text('subCaste', 'Sub caste', { maxLength: 60 })}
      {text('birthPlace', 'Birth place', { maxLength: 100 })}
      <label>
        <span>Residence type</span>
        <select value={form.residenceType} onChange={(e) => set('residenceType', e.target.value)}>
          <option value="">Select</option>
          {RESIDENCE.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
      </label>
      <label>
        <span>Minority</span>
        <select value={form.minority} onChange={(e) => set('minority', e.target.value)}>
          <option value="">Not applicable</option>
          {MINORITY.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
      </label>
      {text('minorityName', 'Minority name', { maxLength: 80 })}
      {text('incRegNo', 'Income certificate reg. no.', { maxLength: 40 })}
      <div className="wide check-group" style={{ gridColumn: '1 / -1' }}>
        <span className="field-title" style={{ margin: 0 }}>
          Others
        </span>
        <Check form={form} set={set} k="otherTransport" label="Transport" />
        <Check form={form} set={set} k="otherHostel" label="Hostel" />
        <Check form={form} set={set} k="otherMess" label="Mess" />
        <Check form={form} set={set} k="physicallyHandicapped" label="Physically handicapped" />
      </div>
    </FormSection>
  );
}

/** The classes a student can already have passed, from Nursery to Class 12, in order. */
export const CLASS_LEVELS = [
  'Nursery',
  'LKG',
  'UKG',
  ...Array.from({ length: 12 }, (_, i) => `Class ${i + 1}`),
];
const QUALIFICATION_COLUMNS = [
  ['exam', 'Class passed', { list: 'exam-options', maxLength: 60 }],
  ['board', 'Board', { maxLength: 100 }],
  ['institute', 'School', { maxLength: 120 }],
  ['subject', 'Subjects', { maxLength: 80 }],
  ['medium', 'Medium', { maxLength: 30 }],
  ['eduStatus', 'Status', { select: ['Complete', 'Appearing', 'Failed', 'Dropped'] }],
  ['year', 'Year', { type: 'number', min: 1950, max: new Date().getFullYear() + 1 }],
  ['rollNo', 'Roll no.', { maxLength: 30 }],
  ['marksObtained', 'Marks obtained', { type: 'number', min: 0, step: '0.01' }],
  ['maxMarks', 'Out of', { type: 'number', min: 0, step: '0.01' }],
  ['percent', 'Marks %', { type: 'number', min: 0, max: 100, step: '0.01' }],
  ['grade', 'Division / grade', { maxLength: 30 }],
];
const BLANK_QUALIFICATION = Object.fromEntries(QUALIFICATION_COLUMNS.map(([k]) => [k, '']));

/** The classes the student has already passed, one row each. Marks obtained and the maximum fill in the percentage. Rows with only a class name are not saved. */
export function QualificationSection({ form, set }) {
  const rows = Array.isArray(form.qualifications) ? form.qualifications : [];
  const change = (i, k, v) =>
    set(
      'qualifications',
      rows.map((r, j) => {
        if (j !== i) return r;
        const next = { ...r, [k]: v };
        if (
          (k === 'marksObtained' || k === 'maxMarks') &&
          Number(next.maxMarks) > 0 &&
          next.marksObtained !== ''
        )
          next.percent = String(
            Math.round((Number(next.marksObtained) / Number(next.maxMarks)) * 10000) / 100,
          );
        return next;
      }),
    );
  // a new row goes in class order (Nursery before Class 1 ...); anything typed by hand stays at the end
  const rank = (exam) => {
    const i = CLASS_LEVELS.indexOf(exam);
    return i < 0 ? CLASS_LEVELS.length : i;
  };
  const add = (exam = '') =>
    set(
      'qualifications',
      [...rows, { ...BLANK_QUALIFICATION, exam }].sort((a, b) => rank(a.exam) - rank(b.exam)),
    );
  const remove = (i) =>
    set(
      'qualifications',
      rows.filter((_, j) => j !== i),
    );
  const used = new Set(rows.map((r) => r.exam));
  return (
    <FormSection
      title="Student qualification"
      glyph="▤"
      tone="violet"
      sub="The classes the student has already passed, Nursery to Class 12"
    >
      <div className="wide" style={{ gridColumn: '1 / -1' }}>
        {rows.length > 0 && (
          <div className="table-scroll">
            <table className="enquiry-table no-sno parent-table">
              <thead>
                <tr>
                  {QUALIFICATION_COLUMNS.map(([, l]) => (
                    <th key={l}>{l}</th>
                  ))}
                  <th />
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i}>
                    {QUALIFICATION_COLUMNS.map(([k, label, props]) => (
                      <td key={k}>
                        {props.select ? (
                          <select
                            value={r[k] || ''}
                            onChange={(e) => change(i, k, e.target.value)}
                            aria-label={label}
                          >
                            <option value="">Select</option>
                            {props.select.map((o) => (
                              <option key={o} value={o}>
                                {o}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <input
                            {...props}
                            value={r[k] ?? ''}
                            onChange={(e) => change(i, k, e.target.value)}
                            aria-label={label}
                          />
                        )}
                      </td>
                    ))}
                    <td>
                      <button
                        type="button"
                        className="ghost danger"
                        onClick={() => remove(i)}
                        aria-label="Remove this qualification"
                      >
                        ✕
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <datalist id="exam-options">
          {CLASS_LEVELS.map((x) => (
            <option key={x} value={x} />
          ))}
        </datalist>
        <label className="add-level">
          <span>
            {rows.length
              ? 'Add another class passed'
              : 'No class added yet. Add the classes the student has passed'}
          </span>
          <select
            value=""
            onChange={(e) => {
              if (e.target.value) add(e.target.value === '__other' ? '' : e.target.value);
            }}
          >
            <option value="">Choose a class…</option>
            {CLASS_LEVELS.filter((x) => !used.has(x)).map((x) => (
              <option key={x} value={x}>
                {x}
              </option>
            ))}
            <option value="__other">Other (type it in)</option>
          </select>
        </label>
      </div>
    </FormSection>
  );
}

const JOB_TYPES = ['Private', 'Government', 'Self employed', 'Business', 'Retired', 'Other'];

/** Father and mother as two rows of one table: birth and marriage dates, qualification, occupation, job and income. */
export function ParentDetailsSection({ form, set }) {
  const cell = (who, suffix, props = {}) => (
    <input
      value={form[who + suffix]}
      onChange={(e) => set(who + suffix, e.target.value)}
      aria-label={`${who} ${suffix}`}
      {...props}
    />
  );
  return (
    <FormSection title="Parent details" glyph="♧" tone="green" sub="Father's and mother's background">
      <div className="wide table-scroll" style={{ gridColumn: '1 / -1' }}>
        <table className="enquiry-table no-sno parent-table">
          <thead>
            <tr>
              <th>Particular</th>
              <th>DOB</th>
              <th>DOM</th>
              <th>Highest qual.</th>
              <th>Qual %</th>
              <th>Occupation</th>
              <th>Designation</th>
              <th>Job type</th>
              <th>Org. type</th>
              <th>Ann. income</th>
            </tr>
          </thead>
          <tbody>
            {[
              ['father', 'Father'],
              ['mother', 'Mother'],
            ].map(([who, name]) => (
              <tr key={who}>
                <td>
                  <b>{name}</b>
                </td>
                <td>{cell(who, 'Dob', { type: 'date', max: localDate() })}</td>
                <td>{cell(who, 'Dom', { type: 'date', max: localDate() })}</td>
                <td>
                  <MasterSelect
                    type="qualification"
                    value={form[who + 'Qualification']}
                    onChange={(e) => set(who + 'Qualification', e.target.value)}
                    placeholder="Select"
                  />
                </td>
                <td>{cell(who, 'QualPercent', { type: 'number', min: 0, max: 100, step: '0.01' })}</td>
                <td>{cell(who, 'Occupation', { maxLength: 100 })}</td>
                <td>{cell(who, 'Designation', { maxLength: 100 })}</td>
                <td>
                  <select
                    value={form[who + 'JobType']}
                    onChange={(e) => set(who + 'JobType', e.target.value)}
                    aria-label={`${who} job type`}
                  >
                    <option value="">Select</option>
                    {JOB_TYPES.map((j) => (
                      <option key={j} value={j}>
                        {j}
                      </option>
                    ))}
                  </select>
                </td>
                <td>{cell(who, 'OrgType', { maxLength: 60 })}</td>
                <td>{cell(who, 'Income', { type: 'number', min: 0, step: '0.01' })}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </FormSection>
  );
}

/** Mobile and email for each person the school may need to reach. The guardian's own contact is asked in the guardian section. */
export function ContactDetailsSection({ form, set }) {
  const rows = [
    ['Father', 'fatherPhone', 'fatherEmail'],
    ['Mother', 'motherPhone', 'motherEmail'],
    ['Emergency', 'emergencyPhone', 'emergencyEmail'],
    ['Student official', 'officialPhone', 'officialEmail'],
    ['Alternate no.', 'alternatePhone', 'alternateEmail'],
  ];
  return (
    <FormSection
      title="Contact details"
      glyph="⌖"
      tone="violet"
      sub="Who else the school can reach (the guardian's contact is above)"
    >
      <div className="wide table-scroll" style={{ gridColumn: '1 / -1' }}>
        <table className="enquiry-table no-sno parent-table">
          <thead>
            <tr>
              <th>Particular</th>
              <th>Mobile</th>
              <th>Email</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(([name, phone, email]) => (
              <tr key={phone}>
                <td>
                  <b>{name}</b>
                </td>
                <td>
                  <input
                    type="tel"
                    value={form[phone]}
                    onChange={(e) => set(phone, e.target.value)}
                    maxLength={20}
                    aria-label={`${name} mobile`}
                  />
                </td>
                <td>
                  <input
                    type="email"
                    value={form[email]}
                    onChange={(e) => set(email, e.target.value)}
                    maxLength={150}
                    aria-label={`${name} email`}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </FormSection>
  );
}

export function LocalGuardianSection({ form, set }) {
  const text = (k, label, props = {}) => (
    <label>
      <span>{label}</span>
      <input value={form[k]} onChange={(e) => set(k, e.target.value)} placeholder={hint(label)} {...props} />
    </label>
  );
  return (
    <FormSection
      title="Local guardian details"
      glyph="♧"
      tone="amber"
      sub="Someone near the school who can be called for the student"
    >
      {text('localGuardianName', 'Name', { maxLength: 120 })}
      {text('localGuardianRelation', 'Relation', { maxLength: 40 })}
      <label className="wide" style={{ gridColumn: '1 / -1' }}>
        <span>Address</span>
        <textarea
          rows={2}
          value={form.localGuardianAddress}
          onChange={(e) => set('localGuardianAddress', e.target.value)}
          maxLength={255}
        />
      </label>
      {text('localGuardianDesignation', 'Designation', { maxLength: 100 })}
      {text('localGuardianPhone', 'Phone', { type: 'tel', maxLength: 20 })}
      {text('localGuardianEmail', 'Email', { type: 'email', maxLength: 150 })}
      <label>
        <span>Job type</span>
        <select
          value={form.localGuardianJobType}
          onChange={(e) => set('localGuardianJobType', e.target.value)}
        >
          <option value="">Select</option>
          {JOB_TYPES.map((j) => (
            <option key={j} value={j}>
              {j}
            </option>
          ))}
        </select>
      </label>
      {text('localGuardianOccupation', 'Occupation', { maxLength: 100 })}
      {text('localGuardianDepartment', 'Department', { maxLength: 100 })}
      {text('localGuardianWorkPlace', 'Place of work', { maxLength: 120 })}
      {text('localGuardianLandline', 'Landline no.', { type: 'tel', maxLength: 20 })}
      {text('localGuardianAadhaar', 'Aadhaar no.', { maxLength: 20 })}
      {text('localGuardianPan', 'PAN card', { maxLength: 20 })}
    </FormSection>
  );
}

const PERMANENT = [
  'address',
  'locality',
  'city',
  'tehsil',
  'thana',
  'district',
  'state',
  'country',
  'pincode',
  'landline',
];
const CURRENT = {
  address: 'curAddress',
  locality: 'curLocality',
  city: 'curCity',
  tehsil: 'curTehsil',
  thana: 'curThana',
  district: 'curDistrict',
  state: 'curState',
  country: 'curCountry',
  pincode: 'curPincode',
  landline: 'curLandline',
};

/** Permanent and current address; ticking "same as above" copies the permanent address and keeps it in step. `skipAddress`: the street address is asked elsewhere on the form. */
export function AddressSections({ form, set, setForm, skipAddress = false }) {
  const mirror = JSON.stringify(PERMANENT.map((k) => form[k]));
  useEffect(() => {
    if (!form.sameAsPermanent) return;
    setForm((f) => {
      const copy = Object.fromEntries(PERMANENT.map((k) => [CURRENT[k], f[k] ?? '']));
      return PERMANENT.every((k) => f[CURRENT[k]] === copy[CURRENT[k]]) ? f : { ...f, ...copy };
    });
  }, [form.sameAsPermanent, mirror]); // eslint-disable-line react-hooks/exhaustive-deps

  const box = (k, label, props = {}) => (
    <label>
      <span>{label}</span>
      <input value={form[k]} onChange={(e) => set(k, e.target.value)} placeholder={hint(label)} {...props} />
    </label>
  );
  const cur = (k, label, props = {}) => (
    <label>
      <span>{label}</span>
      <input
        value={form[k]}
        onChange={(e) => set(k, e.target.value)}
        readOnly={form.sameAsPermanent}
        placeholder={hint(label)}
        {...props}
      />
    </label>
  );
  return (
    <>
      <FormSection title="Permanent address" glyph="⌖" tone="violet" sub="Where the family lives">
        {!skipAddress && (
          <label className="wide" style={{ gridColumn: '1 / -1' }}>
            <span>Address</span>
            <textarea
              rows={2}
              value={form.address}
              onChange={(e) => set('address', e.target.value)}
              maxLength={255}
            />
          </label>
        )}
        {box('locality', 'Locality', { maxLength: 100 })}
        {box('city', 'City', { maxLength: 80 })}
        {box('tehsil', 'Tehsil', { maxLength: 80 })}
        {box('thana', 'Thana', { maxLength: 80 })}
        {box('district', 'District', { maxLength: 80 })}
        <label>
          <span>State</span>
          <MasterSelect
            type="state"
            value={form.state}
            onChange={(e) => set('state', e.target.value)}
            placeholder="Select state"
          />
        </label>
        {box('country', 'Country', { maxLength: 60 })}
        {box('pincode', 'Pin', { maxLength: 12 })}
        {box('landline', 'Landline', { type: 'tel', maxLength: 20 })}
      </FormSection>

      <FormSection title="Current address" glyph="⌖" tone="green" sub="Where the student stays now">
        <div className="wide" style={{ gridColumn: '1 / -1' }}>
          <label className="check-inline">
            <input
              type="checkbox"
              checked={Boolean(form.sameAsPermanent)}
              onChange={(e) => set('sameAsPermanent', e.target.checked)}
            />{' '}
            Same as permanent address
          </label>
        </div>
        <label className="wide" style={{ gridColumn: '1 / -1' }}>
          <span>Address</span>
          <textarea
            rows={2}
            value={form.curAddress}
            onChange={(e) => set('curAddress', e.target.value)}
            readOnly={form.sameAsPermanent}
            maxLength={255}
          />
        </label>
        {cur('curLocality', 'Locality', { maxLength: 100 })}
        {cur('curCity', 'City', { maxLength: 80 })}
        {cur('curTehsil', 'Tehsil', { maxLength: 80 })}
        {cur('curThana', 'Thana', { maxLength: 80 })}
        {cur('curDistrict', 'District', { maxLength: 80 })}
        {cur('curState', 'State', { maxLength: 80 })}
        {cur('curCountry', 'Country', { maxLength: 60 })}
        {cur('curPincode', 'Pin', { maxLength: 12 })}
        {cur('curLandline', 'Landline', { type: 'tel', maxLength: 20 })}
        <label className="wide" style={{ gridColumn: '1 / -1' }}>
          <span>Remark</span>
          <textarea
            rows={2}
            value={form.curRemark}
            onChange={(e) => set('curRemark', e.target.value)}
            maxLength={255}
          />
        </label>
      </FormSection>
    </>
  );
}

/** The office's own enquiry information. `withReferredBy`: the form does not already ask who referred the family. */
export function OfficialSection({ form, set, withReferredBy = false, withSource = false }) {
  const text = (k, label, props = {}) => (
    <label>
      <span>{label}</span>
      <input value={form[k]} onChange={(e) => set(k, e.target.value)} placeholder={hint(label)} {...props} />
    </label>
  );
  return (
    <FormSection title="Official info" glyph="▤" tone="amber" sub="For the admissions office">
      {withSource && (
        <label>
          <span>Source</span>
          <select value={form.source} onChange={(e) => set('source', e.target.value)}>
            <option value="">Select source</option>
            {SOURCES.map(([k, l]) => (
              <option key={k} value={k}>
                {l}
              </option>
            ))}
          </select>
        </label>
      )}
      <label>
        <span>Cat / quota</span>
        <MasterSelect
          type="category"
          value={form.category}
          onChange={(e) => set('category', e.target.value)}
          placeholder="Select"
        />
      </label>
      {text('subCategory', 'Sub cat / quota', { maxLength: 60 })}
      {text('sourceSpecify', 'Specify source', { maxLength: 100, placeholder: 'e.g. Direct, newspaper ad' })}
      {text('applFormNo', 'Application form no.', { maxLength: 40 })}
      {text('formStatus', 'Form status', { maxLength: 30, placeholder: 'e.g. Sold' })}
      {text('place', 'Place', { maxLength: 100 })}
      <label>
        <span>Program type</span>
        <select value={form.programType} onChange={(e) => set('programType', e.target.value)}>
          <option value="">Select</option>
          {PROGRAM.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
      </label>
      {text('priority', 'Priority', { maxLength: 20, placeholder: 'e.g. High, *' })}
      {text('referenceOf', 'Reference of', { maxLength: 100 })}
      {withReferredBy && text('referredBy', 'Referenced by', { maxLength: 100 })}
      {text('scholarshipEligibility', 'Scholarship eligibility under', { maxLength: 100 })}
      <label>
        <span>Study type</span>
        <select value={form.studyType} onChange={(e) => set('studyType', e.target.value)}>
          <option value="">Select</option>
          {STUDY.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
      </label>
      {text('specialization', 'Specialization in', { maxLength: 100 })}
      <div className="wide check-group" style={{ gridColumn: '1 / -1' }}>
        <Check form={form} set={set} k="lateralEntry" label="Lateral entry" />
        <Check form={form} set={set} k="prospectusGiven" label="Prospectus given" />
        <Check form={form} set={set} k="resultAwaited" label="Result awaited" />
        <Check form={form} set={set} k="physicallyVisited" label="Physically visited" />
      </div>
    </FormSection>
  );
}

const ADM_THROUGH = ['Direct', 'Referral', 'Transfer', 'Quota', 'Other'];
const FEE_CATEGORY = ['Standard', 'Concession', 'Staff ward', 'Sibling', 'RTE'];
const ADM_UNDER = ['General', 'Management quota', 'RTE', 'Staff ward'];
const SUB_STATUS = ['Regular', 'Provisional', 'Transferred out', 'Suspended'];

/** How and under what terms the student was admitted: the college screen's official block, adapted to a school. */
export function AdmissionInfoSection({ form, set }) {
  const choice = (k, label, options) => (
    <label>
      <span>{label}</span>
      <select value={form[k]} onChange={(e) => set(k, e.target.value)}>
        <option value="">Select</option>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </label>
  );
  const text = (k, label, props = {}) => (
    <label>
      <span>{label}</span>
      <input value={form[k]} onChange={(e) => set(k, e.target.value)} placeholder={hint(label)} {...props} />
    </label>
  );
  return (
    <FormSection
      title="Admission details"
      glyph="▤"
      tone="blue"
      sub="How and under what terms the student was admitted"
    >
      {choice('subStatus', 'Sub status', SUB_STATUS)}
      {choice('admThrough', 'Admitted through', ADM_THROUGH)}
      {choice('feeCategory', 'Fee category', FEE_CATEGORY)}
      {choice('admUnder', 'Admitted under', ADM_UNDER)}
      {text('serialNo', 'Serial no.', { maxLength: 20 })}
      {text('accId', 'Account ID', { maxLength: 30 })}
      {text('enrollNo', 'Enrollment no.', { maxLength: 30 })}
      {text('penId', 'PEN ID', { maxLength: 30 })}
      {text('apaarId', 'APAAR ID', { maxLength: 30 })}
      <label>
        <span>Date of joining</span>
        <input type="date" value={form.doj} onChange={(e) => set('doj', e.target.value)} max={localDate()} />
      </label>
      <div className="wide check-group" style={{ gridColumn: '1 / -1' }}>
        <Check form={form} set={set} k="confirmStatus" label="Admission confirmed" />
        <Check form={form} set={set} k="migrated" label="Migration student" />
        <Check form={form} set={set} k="provisionalAdm" label="Provisional admission" />
        <Check form={form} set={set} k="reAdmission" label="Re-admission of an alumni student" />
      </div>
      {form.provisionalAdm && (
        <label className="wide" style={{ gridColumn: '1 / -1' }}>
          <span>Provisional admission remark</span>
          <textarea
            rows={2}
            value={form.provisionalRemark}
            onChange={(e) => set('provisionalRemark', e.target.value)}
            maxLength={255}
          />
        </label>
      )}
    </FormSection>
  );
}

const SIBLING_COLUMNS = [
  ['type', 'Relation'],
  ['admissionNo', 'Admission no. / employee code'],
  ['name', 'Name'],
  ['className', 'Class'],
];
const RELATIONS = ['Sibling', 'Cousin', 'Other'];

/** Brothers and sisters already in the school. */
export function SiblingsSection({ form, set }) {
  const rows = Array.isArray(form.siblings) ? form.siblings : [];
  const change = (i, k, v) =>
    set(
      'siblings',
      rows.map((r, j) => (j === i ? { ...r, [k]: v } : r)),
    );
  return (
    <FormSection
      title="Sibling details"
      glyph="♧"
      tone="green"
      sub="Brothers and sisters already studying here"
    >
      <div className="wide" style={{ gridColumn: '1 / -1' }}>
        {rows.length > 0 && (
          <div className="table-scroll">
            <table className="enquiry-table no-sno parent-table">
              <thead>
                <tr>
                  {SIBLING_COLUMNS.map(([, l]) => (
                    <th key={l}>{l}</th>
                  ))}
                  <th />
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i}>
                    <td>
                      <select
                        value={r.type || 'Sibling'}
                        onChange={(e) => change(i, 'type', e.target.value)}
                        aria-label="Relation"
                      >
                        {RELATIONS.map((o) => (
                          <option key={o} value={o}>
                            {o}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <input
                        value={r.admissionNo ?? ''}
                        onChange={(e) => change(i, 'admissionNo', e.target.value)}
                        maxLength={40}
                        aria-label="Admission number"
                        placeholder="Enter number or code"
                      />
                    </td>
                    <td>
                      <input
                        value={r.name ?? ''}
                        onChange={(e) => change(i, 'name', e.target.value)}
                        maxLength={120}
                        aria-label="Sibling name"
                        placeholder="Enter name"
                      />
                    </td>
                    <td>
                      <input
                        value={r.className ?? ''}
                        onChange={(e) => change(i, 'className', e.target.value)}
                        maxLength={40}
                        aria-label="Sibling class"
                        placeholder="e.g. Grade 5"
                      />
                    </td>
                    <td>
                      <button
                        type="button"
                        className="ghost danger"
                        onClick={() =>
                          set(
                            'siblings',
                            rows.filter((_, j) => j !== i),
                          )
                        }
                        aria-label="Remove this sibling"
                      >
                        ✕
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p style={{ margin: '10px 0 0' }}>
          <button
            type="button"
            className="ghost"
            onClick={() =>
              set('siblings', [...rows, { type: 'Sibling', admissionNo: '', name: '', className: '' }])
            }
          >
            + Add a sibling
          </button>
        </p>
      </div>
    </FormSection>
  );
}

const qualificationValue = (q, k) => q[k] ?? '';
/** The saved qualifications as a read-only table, for the popups. */
export function QualificationTable({ rows }) {
  if (!rows?.length) return <p className="hint">No qualification recorded.</p>;
  return (
    <div className="table-scroll">
      <table className="enquiry-table no-sno">
        <thead>
          <tr>
            {QUALIFICATION_COLUMNS.map(([, l]) => (
              <th key={l}>{l}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((q, i) => (
            <tr key={i}>
              {QUALIFICATION_COLUMNS.map(([k], c) => (
                <td key={k}>{c === 0 ? <b>{qualificationValue(q, k)}</b> : qualificationValue(q, k)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** The saved siblings as a read-only table, for the popups. */
export function SiblingsTable({ rows }) {
  if (!rows?.length) return <p className="hint">No sibling recorded.</p>;
  return (
    <div className="table-scroll">
      <table className="enquiry-table no-sno">
        <thead>
          <tr>
            {SIBLING_COLUMNS.map(([, l]) => (
              <th key={l}>{l}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              {SIBLING_COLUMNS.map(([k]) => (
                <td key={k}>{r[k] ?? ''}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** The signature, left thumb and the parents' photos and signatures that go on the student's file. */
export const SIGNATURES = [
  ['student_sign', 'Student signature'],
  ['father_photo', 'Father photo'],
  ['father_sign', 'Father signature'],
  ['mother_photo', 'Mother photo'],
  ['mother_sign', 'Mother signature'],
  ['student_thumb', 'Student left thumb'],
];

export function SignaturesSection({ id, picked, onPick }) {
  return (
    <FormSection
      title="Photos and signatures"
      glyph="◉"
      tone="violet"
      sub="Signature, left thumb and the parents' photos and signatures"
    >
      {SIGNATURES.map(([entity, label]) => (
        <div key={entity}>
          <PhotoField
            entity={entity}
            id={id}
            label={label}
            picked={picked[entity]}
            onPick={(file) => onPick(entity, file)}
          />
        </div>
      ))}
    </FormSection>
  );
}
