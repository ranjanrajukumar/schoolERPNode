import { Router } from 'express';
import { MasterItem } from '../../models/index.js';
import { writeRoles } from '../../middleware/authMiddleware.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { badRequest, conflict, notFound } from '../../utils/httpError.js';

/** The master lists and their starting options. A list that has no rows yet is filled once; deleting options later is respected. */
export const MASTER_TYPES = {
  religion: { label: 'Religion', defaults: ['Hindu', 'Muslim', 'Christian', 'Sikh', 'Buddhist', 'Jain', 'Parsi', 'Other'] },
  category: { label: 'Category', defaults: ['General', 'OBC', 'SC', 'ST', 'EWS', 'Other'] },
  nationality: { label: 'Nationality', defaults: ['Indian', 'Other'] },
  mother_tongue: { label: 'Mother tongue', defaults: ['Hindi', 'English', 'Marathi', 'Gujarati', 'Bengali', 'Tamil', 'Telugu', 'Kannada', 'Malayalam', 'Punjabi', 'Urdu', 'Odia', 'Assamese', 'Other'] },
  state: {
    label: 'State / UT',
    defaults: ['Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala',
      'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura',
      'Uttar Pradesh', 'Uttarakhand', 'West Bengal', 'Andaman and Nicobar Islands', 'Chandigarh', 'Dadra and Nagar Haveli and Daman and Diu', 'Delhi', 'Jammu and Kashmir',
      'Ladakh', 'Lakshadweep', 'Puducherry'],
  },
  relation: { label: 'Relation', defaults: ['Father', 'Mother', 'Grandfather', 'Grandmother', 'Uncle', 'Aunt', 'Brother', 'Sister', 'Legal guardian', 'Other'] },
  occupation: { label: 'Occupation', defaults: ['Business', 'Government service', 'Private service', 'Professional', 'Farmer', 'Teacher', 'Homemaker', 'Retired', 'Self-employed', 'Other'] },
  qualification: { label: 'Qualification', defaults: ['Below 10th', '10th', '12th', 'Diploma', 'Graduate', 'Postgraduate', 'B.Ed', 'M.Ed', 'Doctorate', 'Other'] },
  // What each process needs uploaded. A document marked required must be uploaded before the application can be submitted;
  // for students and staff the forms show what is still missing.
  application_document: { label: 'Application documents', documents: true, defaults: [['Birth certificate', true], ['Previous report card', false], ['Transfer certificate', false], ['Address proof', true], ['Passport-size photo', false]] },
  student_document: { label: 'Student documents', documents: true, defaults: [['Birth certificate', true], ['Transfer certificate', false], ['Aadhaar / ID proof', false], ['Address proof', true], ['Vaccination record', false]] },
  staff_document: { label: 'Staff documents', documents: true, defaults: [['ID proof', true], ['Qualification certificate', true], ['Experience letter', false], ['Address proof', false], ['Appointment letter', false]] },
  marital_status: { label: 'Marital status', defaults: ['Single', 'Married', 'Divorced', 'Widowed', 'Other'] },
};

export async function seedMasters() {
  for (const [type, { defaults }] of Object.entries(MASTER_TYPES)) {
    if (await MasterItem.count({ where: { type } })) continue;
    await MasterItem.bulkCreate(defaults.map((d, i) => (Array.isArray(d) ? { type, name: d[0], required: d[1], sortOrder: i + 1 } : { type, name: d, sortOrder: i + 1 })));
  }
}

const router = Router();
const checkType = (type) => { if (!MASTER_TYPES[type]) throw badRequest('Unknown list'); };
const cleanName = (name) => {
  const text = String(name ?? '').trim();
  if (!text) throw badRequest('A name is required');
  if (text.length > 100) throw badRequest('The name must be 100 characters or fewer');
  return text;
};

// Any signed-in staff role may read (forms need the options); only admins change them.
router.get('/', asyncHandler(async (req, res) => {
  const rows = await MasterItem.findAll({ where: req.query.type ? { type: req.query.type } : {}, order: [['type', 'ASC'], ['sortOrder', 'ASC'], ['name', 'ASC']] });
  const grouped = Object.fromEntries(Object.keys(MASTER_TYPES).map((t) => [t, []]));
  for (const r of rows) grouped[r.type]?.push({ id: r.id, name: r.name, active: r.active, required: r.required, sortOrder: r.sortOrder });
  res.json({ types: Object.entries(MASTER_TYPES).map(([key, v]) => ({ key, label: v.label, documents: Boolean(v.documents) })), items: grouped });
}));

router.post('/', writeRoles('admin'), asyncHandler(async (req, res) => {
  checkType(req.body.type);
  const name = cleanName(req.body.name);
  if (await MasterItem.findOne({ where: { type: req.body.type, name } })) throw conflict(`"${name}" is already in this list`);
  const last = (await MasterItem.max('sortOrder', { where: { type: req.body.type } })) || 0;
  const required = MASTER_TYPES[req.body.type].documents && req.body.required === true;
  res.status(201).json({ id: (await MasterItem.create({ type: req.body.type, name, required, sortOrder: last + 1 })).id });
}));

router.put('/:id', writeRoles('admin'), asyncHandler(async (req, res) => {
  const item = await MasterItem.findByPk(req.params.id);
  if (!item) throw notFound('Option not found');
  const data = {};
  if (req.body.name !== undefined) {
    data.name = cleanName(req.body.name);
    if (data.name !== item.name && await MasterItem.findOne({ where: { type: item.type, name: data.name } })) throw conflict(`"${data.name}" is already in this list`);
  }
  if (req.body.active !== undefined) data.active = Boolean(req.body.active);
  if (req.body.required !== undefined) {
    if (!MASTER_TYPES[item.type]?.documents) throw badRequest('Only document lists have required items');
    data.required = Boolean(req.body.required);
  }
  if (req.body.sortOrder !== undefined) data.sortOrder = Number(req.body.sortOrder) || 0;
  await item.update(data);
  res.json({ ok: true });
}));

router.delete('/:id', writeRoles('admin'), asyncHandler(async (req, res) => {
  const item = await MasterItem.findByPk(req.params.id);
  if (!item) throw notFound('Option not found');
  await item.destroy();
  res.json({ ok: true });
}));

export default router;
