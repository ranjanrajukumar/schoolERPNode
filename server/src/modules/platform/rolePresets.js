import { Role } from '../../models/index.js';

/**
 * Ready-made custom roles for the school's departments. Each is the admin role narrowed to a few modules, so it can
 * never do more than those modules allow, and the server enforces it on every request (see access.js).
 * They are created once if missing; an administrator can edit or delete them under Roles.
 * Module keys are the sidebar groups; the level is 'read' or 'write'.
 */
export const ROLE_PRESETS = [
  {
    name: 'Principal',
    description: 'Academic and school operations. Cannot change users, roles, backups or the audit log.',
    permissions: {
      admissions: 'write',
      students: 'write',
      academics: 'write',
      attendance: 'write',
      examinations: 'write',
      timetable: 'write',
      communication: 'write',
      'events-and-activities': 'write',
      'documents-and-certificates': 'write',
      'health-and-safety': 'write',
      reports: 'write',
      'staff-and-hr': 'read',
      'fees-and-finance': 'read',
      library: 'read',
      transport: 'read',
      inventory: 'read',
      hostel: 'read',
    },
  },
  {
    name: 'Librarian',
    description: 'Library only, with read access to students to look up members.',
    permissions: { library: 'write', students: 'read' },
  },
  {
    name: 'Transport Manager',
    description: 'Vehicles, drivers, routes, student allocation and transport fees.',
    permissions: { transport: 'write', students: 'read' },
  },
  {
    name: 'HR Manager',
    description: 'Staff, staff attendance, leave, payroll and recruitment.',
    permissions: { 'staff-and-hr': 'write', reports: 'read' },
  },
  {
    name: 'Office Staff',
    description: 'Admissions, student registration, documents and certificates, and notices.',
    permissions: {
      admissions: 'write',
      students: 'write',
      'documents-and-certificates': 'write',
      communication: 'read',
    },
  },
];

/** Adds any preset that does not exist yet (matched by name). Returns how many were added. */
export async function ensureRolePresets() {
  let added = 0;
  for (const p of ROLE_PRESETS) {
    if (await Role.findOne({ where: { name: p.name } })) continue;
    await Role.create({
      name: p.name,
      description: p.description,
      baseRole: 'admin',
      permissions: JSON.stringify(p.permissions),
    });
    added += 1;
  }
  return added;
}
