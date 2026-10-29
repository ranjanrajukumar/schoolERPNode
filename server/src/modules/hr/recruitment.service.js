import { Department, JobApplicant, JobOpening, Staff, sequelize } from '../../models/index.js';
import { badRequest, conflict, notFound } from '../../utils/httpError.js';
import { today } from '../../utils/money.js';

/** Allowed moves. "hired" is only reachable through hire(), which creates the staff profile. */
const TRANSITIONS = {
  applied: ['shortlisted', 'rejected'],
  shortlisted: ['interviewed', 'rejected'],
  interviewed: ['offered', 'rejected'],
  offered: ['rejected'],
  hired: [],
  rejected: ['applied'],
};

export async function listOpenings() {
  const rows = await JobOpening.findAll({
    include: [{ model: Department, attributes: ['name'] }, { model: JobApplicant, attributes: ['status'] }],
    order: [['id', 'DESC']],
  });
  return rows.map((o) => ({
    id: o.id, title: o.title, departmentId: o.departmentId, departmentName: o.Department?.name ?? null, vacancies: o.vacancies,
    description: o.description, closingDate: o.closingDate, status: o.status,
    applicants: o.JobApplicants.length, hired: o.JobApplicants.filter((a) => a.status === 'hired').length,
    expired: o.status === 'open' && Boolean(o.closingDate && o.closingDate < today()),
  }));
}

export async function saveOpening(id, body) {
  const { title, departmentId, vacancies, description, closingDate, status } = body;
  if (!String(title ?? '').trim()) throw badRequest('Job title is required');
  const count = vacancies === undefined || vacancies === '' ? 1 : Number(vacancies);
  if (!Number.isInteger(count) || count < 1) throw badRequest('Vacancies must be at least 1');
  if (status && !['open', 'closed'].includes(status)) throw badRequest('Status must be open or closed');
  const data = {
    title: title.trim(), departmentId: departmentId || null, vacancies: count, description: description || null,
    closingDate: closingDate || null, ...(status && { status }),
  };
  if (!id) return (await JobOpening.create(data)).id;
  const opening = await JobOpening.findByPk(id);
  if (!opening) throw notFound('Opening not found');
  const hired = await JobApplicant.count({ where: { openingId: id, status: 'hired' } });
  if (count < hired) throw conflict(`${hired} people are already hired, so vacancies cannot go below that`);
  await opening.update(data);
  return opening.id;
}

export async function deleteOpening(id) {
  const opening = await JobOpening.findByPk(id);
  if (!opening) throw notFound('Opening not found');
  if (await JobApplicant.count({ where: { openingId: id } })) throw conflict('This opening has applicants; close it instead of deleting it');
  await opening.destroy();
}

const shape = (a) => {
  const { JobOpening: o, ...rest } = a.toJSON();
  return { ...rest, openingTitle: o?.title ?? null, nextStatuses: TRANSITIONS[a.status] };
};

export async function listApplicants({ openingId } = {}) {
  const rows = await JobApplicant.findAll({
    where: openingId ? { openingId } : {}, include: [{ model: JobOpening, attributes: ['title'] }], order: [['id', 'DESC']],
  });
  return rows.map(shape);
}

export async function addApplicant({ openingId, name, email, phone, qualification, notes }) {
  const opening = await JobOpening.findByPk(openingId);
  if (!opening) throw notFound('Opening not found');
  if (opening.status !== 'open') throw conflict('This opening is closed');
  if (!String(name ?? '').trim()) throw badRequest('Applicant name is required');
  return (await JobApplicant.create({
    openingId, name: name.trim(), email: email || null, phone: phone || null, qualification: qualification || null, notes: notes || null,
  })).id;
}

export async function changeApplicantStatus(id, status) {
  const applicant = await JobApplicant.findByPk(id);
  if (!applicant) throw notFound('Applicant not found');
  if (!TRANSITIONS[applicant.status].includes(status)) throw conflict(`Cannot move from ${applicant.status} to ${status}`);
  await applicant.update({ status });
}

export async function deleteApplicant(id) {
  const applicant = await JobApplicant.findByPk(id);
  if (!applicant) throw notFound('Applicant not found');
  if (applicant.status === 'hired') throw conflict('A hired applicant cannot be deleted');
  await applicant.destroy();
}

import { nextStaffNo } from './staffNumber.js';

/** Turns an offered applicant into an active staff member, within the opening's vacancies, all in one transaction. */
export async function hire(id, { staffNo, joinDate } = {}) {
  return sequelize.transaction(async (transaction) => {
    const applicant = await JobApplicant.findByPk(id, { transaction, lock: transaction.LOCK.UPDATE });
    if (!applicant) throw notFound('Applicant not found');
    if (applicant.status !== 'offered') throw conflict('Only applicants who have been offered the job can be hired');
    const opening = await JobOpening.findByPk(applicant.openingId, { transaction, lock: transaction.LOCK.UPDATE });
    const hired = await JobApplicant.count({ where: { openingId: opening.id, status: 'hired' }, transaction });
    if (hired >= opening.vacancies) throw conflict('All vacancies for this opening are filled');

    const [firstName, ...rest] = applicant.name.trim().split(/\s+/);
    const staff = await Staff.create({
      staffNo: staffNo?.trim() || await nextStaffNo(transaction), firstName, lastName: rest.join(' ') || '-',
      designation: opening.title, departmentId: opening.departmentId, phone: applicant.phone, email: applicant.email,
      joinDate: joinDate || today(),
    }, { transaction });
    await applicant.update({ status: 'hired', staffId: staff.id }, { transaction });
    if (hired + 1 >= opening.vacancies) await opening.update({ status: 'closed' }, { transaction });
    return { staffId: staff.id, staffNo: staff.staffNo };
  });
}
