/**
 * Every detail kept on a student's registration, in the order the form shows them. The same list drives the model,
 * the database columns added to older installs, validation, the API and the profile page.
 * type: text | date | number. `max` is the column length for text.
 */
export const DETAIL_FIELDS = [
  { key: 'middleName', label: 'Middle name', type: 'text', max: 80 },
  { key: 'admissionDate', label: 'Date of admission', type: 'date' },
  { key: 'rollNo', label: 'Roll number', type: 'text', max: 20 },
  { key: 'nationality', label: 'Nationality', type: 'text', max: 50 },
  { key: 'religion', label: 'Religion', type: 'text', max: 50 },
  { key: 'category', label: 'Category', type: 'text', max: 30 },
  { key: 'motherTongue', label: 'Mother tongue', type: 'text', max: 50 },
  { key: 'nationalId', label: 'Aadhaar / national ID no', type: 'text', max: 20 },
  { key: 'email', label: 'Student email', type: 'text', max: 150 },
  { key: 'phone', label: 'Student phone', type: 'text', max: 20 },
  { key: 'address', label: 'Address', type: 'text', max: 255 },
  { key: 'city', label: 'City / town', type: 'text', max: 80 },
  { key: 'state', label: 'State', type: 'text', max: 80 },
  { key: 'pincode', label: 'PIN / postal code', type: 'text', max: 12 },
  { key: 'fatherName', label: "Father's name", type: 'text', max: 120 },
  { key: 'fatherPhone', label: "Father's phone", type: 'text', max: 20 },
  { key: 'fatherOccupation', label: "Father's occupation", type: 'text', max: 100 },
  { key: 'motherName', label: "Mother's name", type: 'text', max: 120 },
  { key: 'motherPhone', label: "Mother's phone", type: 'text', max: 20 },
  { key: 'motherOccupation', label: "Mother's occupation", type: 'text', max: 100 },
  { key: 'guardianRelation', label: 'Guardian relation', type: 'text', max: 40 },
  { key: 'guardianEmail', label: 'Guardian email', type: 'text', max: 150 },
  { key: 'previousSchool', label: 'Previous school', type: 'text', max: 160 },
  { key: 'previousClass', label: 'Class last attended', type: 'text', max: 50 },
  { key: 'secondaryGuardianName', label: 'Secondary guardian', type: 'text', max: 120 },
  { key: 'secondaryGuardianPhone', label: 'Secondary contact', type: 'text', max: 20 },
  { key: 'specialNeeds', label: 'Known learning or medical needs', type: 'text', max: 255 },
  { key: 'previousTcNo', label: 'Transfer certificate no', type: 'text', max: 40 },
  { key: 'previousPercent', label: 'Last result (%)', type: 'number' },
  { key: 'remarks', label: 'Remarks', type: 'text', max: 500 },
];

export const DETAIL_KEYS = DETAIL_FIELDS.map((f) => f.key);

/** The registration details an applicant can have before enrolment: everything except what the school assigns on admission. */
export const ADMISSION_DETAIL_KEYS = DETAIL_KEYS.filter(
  (k) => !['admissionDate', 'rollNo', 'remarks'].includes(k),
);

const snake = (key) => key.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);

/** The same columns for the admissions table. */
export const ADMISSION_DETAIL_COLUMNS_FOR = (columns) =>
  columns
    .filter((c) =>
      ADMISSION_DETAIL_KEYS.includes(c.column.replace(/_([a-z])/g, (_m, ch) => ch.toUpperCase())),
    )
    .map((c) => ({ ...c, table: 'admissions' }));

/** ALTER TABLE definitions for databases created before these fields existed. */
export const DETAIL_COLUMNS = DETAIL_FIELDS.map((f) => ({
  table: 'students',
  column: snake(f.key),
  definition:
    f.type === 'date' ? 'DATE NULL' : f.type === 'number' ? 'DECIMAL(5,2) NULL' : `VARCHAR(${f.max}) NULL`,
}));
