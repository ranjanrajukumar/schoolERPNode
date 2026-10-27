/** Details kept on a parent or guardian profile, beyond the login (name, email, password). */
export const PARENT_DETAILS = [
  { key: 'alternatePhone', label: 'Alternate phone', max: 20 },
  { key: 'occupation', label: 'Occupation', max: 100 },
  { key: 'employer', label: 'Employer / business', max: 120 },
  { key: 'nationalId', label: 'Aadhaar / national ID no', max: 20 },
  { key: 'address', label: 'Address', max: 255 },
  { key: 'city', label: 'City / town', max: 80 },
  { key: 'state', label: 'State', max: 80 },
  { key: 'pincode', label: 'PIN / postal code', max: 12 },
];
export const PARENT_KEYS = PARENT_DETAILS.map((f) => f.key);

const snake = (key) => key.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);
export const PARENT_COLUMNS = PARENT_DETAILS.map((f) => ({ table: 'parents', column: snake(f.key), definition: `VARCHAR(${f.max}) NULL` }));

const blank = (v) => v === undefined || v === null || v === '';

/** Problems with the detail fields of a parent payload; empty when valid. */
export function parentProblems(body) {
  const errors = [];
  for (const f of PARENT_DETAILS) {
    if (!blank(body[f.key]) && String(body[f.key]).length > f.max) errors.push(`${f.label} must be ${f.max} characters or fewer`);
  }
  if (!blank(body.phone) && !/^[0-9+\-\s()]{7,20}$/.test(body.phone)) errors.push('Phone is invalid');
  if (!blank(body.alternatePhone) && !/^[0-9+\-\s()]{7,20}$/.test(body.alternatePhone)) errors.push('Alternate phone is invalid');
  if (!blank(body.pincode) && !/^[A-Za-z0-9][A-Za-z0-9 -]{2,11}$/.test(body.pincode)) errors.push('PIN / postal code is invalid');
  if (!blank(body.nationalId) && !/^[A-Za-z0-9-]{4,20}$/.test(body.nationalId)) errors.push('Aadhaar / national ID must be 4 to 20 letters, digits or dashes');
  return errors;
}
