/**
 * Every detail kept on a staff member's record. `see` says who may read the field: omitted = any signed-in staff role,
 * 'finance' = admin and accountant (payroll needs bank details), 'admin' = admin only (personal and identity data).
 * type: text | date | number.
 */
export const STAFF_DETAILS = [
  { key: 'staffCategory', label: 'Staff category', type: 'text', max: 20, oneOf: ['teaching', 'non_teaching'] },
  { key: 'middleName', label: 'Middle name', type: 'text', max: 80 },
  { key: 'gender', label: 'Gender', type: 'text', max: 10, oneOf: ['male', 'female', 'other'] },
  { key: 'dob', label: 'Date of birth', type: 'date', see: 'admin' },
  { key: 'maritalStatus', label: 'Marital status', type: 'text', max: 20, see: 'admin' },
  { key: 'bloodGroup', label: 'Blood group', type: 'text', max: 5, oneOf: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'], see: 'admin' },
  { key: 'nationalId', label: 'Aadhaar / national ID no', type: 'text', max: 20, see: 'admin' },
  { key: 'panNo', label: 'PAN / tax ID', type: 'text', max: 20, see: 'admin' },
  { key: 'address', label: 'Address', type: 'text', max: 255, see: 'admin' },
  { key: 'city', label: 'City / town', type: 'text', max: 80, see: 'admin' },
  { key: 'state', label: 'State', type: 'text', max: 80, see: 'admin' },
  { key: 'pincode', label: 'PIN / postal code', type: 'text', max: 12, see: 'admin' },
  { key: 'qualification', label: 'Highest qualification', type: 'text', max: 120 },
  { key: 'experienceYears', label: 'Years of experience', type: 'number' },
  { key: 'employmentType', label: 'Employment type', type: 'text', max: 20, oneOf: ['permanent', 'contract', 'part_time', 'visiting'] },
  { key: 'previousEmployer', label: 'Previous employer', type: 'text', max: 160, see: 'admin' },
  { key: 'emergencyName', label: 'Emergency contact', type: 'text', max: 100, see: 'admin' },
  { key: 'emergencyPhone', label: 'Emergency phone', type: 'text', max: 20, see: 'admin' },
  { key: 'bankName', label: 'Bank name', type: 'text', max: 100, see: 'finance' },
  { key: 'bankAccountNo', label: 'Bank account number', type: 'text', max: 30, see: 'finance' },
  { key: 'ifsc', label: 'IFSC / branch code', type: 'text', max: 20, see: 'finance' },
  { key: 'remarks', label: 'Remarks', type: 'text', max: 500, see: 'admin' },
];

export const STAFF_DETAIL_KEYS = STAFF_DETAILS.map((f) => f.key);

const snake = (key) => key.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);

/** ALTER TABLE definitions for databases created before these fields existed. */
export const STAFF_DETAIL_COLUMNS = STAFF_DETAILS.map((f) => ({
  table: 'staff',
  column: snake(f.key),
  definition: f.type === 'date' ? 'DATE NULL' : f.type === 'number' ? 'DECIMAL(4,1) NULL' : `VARCHAR(${f.max}) NULL`,
}));

const RANK = { admin: 3, accountant: 2 };
/** The keys of the detail fields a role may read. */
export function visibleDetailKeys(role) {
  return STAFF_DETAILS.filter((f) => {
    if (!f.see) return true;
    if (f.see === 'finance') return (RANK[role] ?? 0) >= 2;
    return role === 'admin';
  }).map((f) => f.key);
}
