import { Router } from 'express';
import { Book, Parent, SchoolClass, Staff, Student, User } from '../../models/index.js';
import { typeahead } from '../../middleware/typeahead.js';

// Open to every signed-in staff login (forms in every module need to pick a person or a book). Read-only and
// minimal: a label and one line of context, nothing else about the record.
const router = Router();
const name = (p) => [p.firstName, p.middleName, p.lastName].filter(Boolean).join(' ');

router.get('/students', typeahead({
  model: Student,
  fields: ['firstName', 'middleName', 'lastName', 'admissionNo', 'rollNo', 'guardianPhone', 'fatherPhone', 'motherPhone'],
  filters: ['status', 'classId'],
  include: [{ model: SchoolClass, attributes: ['name', 'section'] }],
  label: (s) => `${s.admissionNo} · ${name(s)}`,
  sub: (s) => (s.SchoolClass ? `Class ${s.SchoolClass.name}-${s.SchoolClass.section}` : 'No class'),
}));

router.get('/staff', typeahead({
  model: Staff,
  fields: ['firstName', 'middleName', 'lastName', 'staffNo', 'email', 'phone', 'designation'],
  filters: ['status', 'departmentId'],
  label: (s) => `${name(s)} (${s.staffNo})`,
  sub: (s) => s.designation,
}));

router.get('/books', typeahead({
  model: Book,
  fields: ['title', 'author', 'isbn'],
  order: [['title', 'ASC']],
  label: (b) => b.title,
  sub: (b) => `${b.author ? `${b.author} · ` : ''}${b.available} of ${b.copies} available`,
}));

router.get('/parents', typeahead({
  model: Parent,
  fields: ['name', 'phone'],
  include: [{ model: User, attributes: ['email'] }],
  order: [['name', 'ASC']],
  label: (p) => p.name,
  sub: (p) => p.User?.email,
}));

export default router;
