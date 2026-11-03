import { Department, Staff } from '../../models/index.js';
import { STAFF_DETAILS } from './staffFields.js';

const GROUPS = [
  ['Personal', ['middleName', 'gender', 'dob', 'maritalStatus', 'bloodGroup']],
  ['Contact and address', ['address', 'city', 'state', 'pincode', 'emergencyName', 'emergencyPhone']],
  ['Identity', ['nationalId', 'panNo']],
  ['Qualification and experience', ['qualification', 'experienceYears', 'previousEmployer']],
  ['Bank', ['bankName', 'bankAccountNo', 'ifsc']],
  ['Notes', ['remarks']],
];
const LABEL = Object.fromEntries(STAFF_DETAILS.map((f) => [f.key, f.label]));
const nice = (v) =>
  String(v)
    .replace(/_/g, ' ')
    .replace(/^./, (c) => c.toUpperCase());
const DATES = new Set(['dob', 'joinDate']);

/** A staff member's own record laid out in sections, with every detail the school holds about them (it is their own data). */
export async function ownProfile(staffId) {
  const staff = await Staff.findByPk(staffId, { include: [{ model: Department, attributes: ['name'] }] });
  if (!staff) return null;
  const s = staff.toJSON();
  const show = (k, v) =>
    v === null || v === undefined || v === ''
      ? '—'
      : DATES.has(k)
        ? String(v).slice(0, 10)
        : k === 'experienceYears'
          ? String(Number(v))
          : nice(v);
  const head = [
    ['Staff number', s.staffNo],
    ['Designation', s.designation],
    ['Department', s.Department?.name],
    ['Category', s.staffCategory && nice(s.staffCategory)],
    ['Employment type', s.employmentType && nice(s.employmentType)],
    ['Joined on', s.joinDate],
    ['Status', s.status && nice(s.status)],
    ['Phone', s.phone],
    ['Email', s.email],
  ].map(([l, v]) => [l, v === null || v === undefined || v === '' ? '—' : String(v)]);
  return {
    name: [s.firstName, s.lastName].filter(Boolean).join(' '),
    designation: s.designation ?? null,
    sections: [
      { title: 'Employment', rows: head },
      ...GROUPS.map(([title, keys]) => ({
        title,
        rows: keys.map((k) => [LABEL[k], show(k, s[k])]),
      })),
    ],
  };
}
