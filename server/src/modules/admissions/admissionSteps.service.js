import { Admission, SchoolClass } from '../../models/index.js';
import { badRequest, conflict, notFound } from '../../utils/httpError.js';
import { today } from '../../utils/money.js';

const INTERVIEW_RESULTS = ['pending', 'recommended', 'not_recommended'];
const blank = (v) => v === undefined || v === null || v === '';

async function open(id) {
  const admission = await Admission.findByPk(id);
  if (!admission) throw notFound('Admission not found');
  if (['enrolled', 'rejected'].includes(admission.status)) throw conflict(`A ${admission.status} applicant cannot be changed here`);
  return admission;
}

/** Tests and interviews are for applicants whose application has been submitted, not for plain enquiries or drafts. */
async function openForAssessment(id) {
  const admission = await open(id);
  if (!['applied', 'waitlisted', 'approved'].includes(admission.status)) throw conflict('Submit the student application before scheduling a test or interview');
  return admission;
}

/** Entrance test: a date, then the marks once it is taken. Marks cannot exceed the maximum. */
export async function setTest(id, { testDate, testMarks, testMaxMarks }) {
  const admission = await openForAssessment(id);
  if (blank(testDate)) throw badRequest('Test date is required');
  const max = blank(testMaxMarks) ? 100 : Number(testMaxMarks);
  if (!(max > 0)) throw badRequest('Maximum marks must be above zero');
  const marks = blank(testMarks) ? null : Number(testMarks);
  if (marks !== null && !(marks >= 0 && marks <= max)) throw badRequest(`Marks must be between 0 and ${max}`);
  if (marks !== null && testDate > today()) throw badRequest('Marks cannot be entered for a test that is still in the future');
  await admission.update({ testDate, testMarks: marks, testMaxMarks: max });
}

export async function clearTest(id) {
  const admission = await open(id);
  await admission.update({ testDate: null, testMarks: null, testMaxMarks: null });
}

/** Interview: date, time, panel; the result is recorded afterwards. */
export async function setInterview(id, { interviewDate, interviewTime, interviewPanel, interviewResult }) {
  const admission = await openForAssessment(id);
  if (blank(interviewDate)) throw badRequest('Interview date is required');
  if (blank(interviewTime)) throw badRequest('Interview time is required');
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(interviewTime)) throw badRequest('Time must look like 14:30');
  if (blank(interviewPanel)) throw badRequest('Interview panel is required');
  const result = blank(interviewResult) ? 'pending' : interviewResult;
  if (!INTERVIEW_RESULTS.includes(result)) throw badRequest('Unknown interview result');
  if (result !== 'pending' && interviewDate > today()) throw badRequest('A result cannot be recorded for an interview that is still in the future');
  await admission.update({ interviewDate, interviewTime, interviewPanel: String(interviewPanel).trim(), interviewResult: result });
}

export async function clearInterview(id) {
  const admission = await open(id);
  await admission.update({ interviewDate: null, interviewTime: null, interviewPanel: null, interviewResult: null });
}

/** An offer is an approved applicant; the expiry is the date the family must confirm by. */
export async function setOfferExpiry(id, { offerExpiry }) {
  const admission = await Admission.findByPk(id);
  if (!admission) throw notFound('Admission not found');
  if (admission.status !== 'approved') throw conflict('Only approved applicants have an offer');
  if (!blank(offerExpiry) && offerExpiry < today()) throw badRequest('The expiry date cannot be in the past');
  await admission.update({ offerExpiry: blank(offerExpiry) ? null : offerExpiry });
}

const named = (a) => ({
  id: a.id, applicantName: a.applicantName, guardianName: a.guardianName, guardianPhone: a.guardianPhone,
  className: a.SchoolClass ? `${a.SchoolClass.name}-${a.SchoolClass.section}` : null, status: a.status,
});
const include = [{ model: SchoolClass, attributes: ['name', 'section'] }];
const order = [['id', 'DESC']];

export async function listTests() {
  const { Op } = await import('sequelize');
  const rows = await Admission.findAll({
    where: { testDate: { [Op.ne]: null }, status: { [Op.notIn]: ['rejected'] } }, include, order: [['testDate', 'DESC'], ['id', 'DESC']],
  });
  return rows.map((a) => ({
    ...named(a), testDate: a.testDate, testMarks: a.testMarks, testMaxMarks: a.testMaxMarks,
    percent: a.testMarks === null ? null : Math.round((Number(a.testMarks) / Number(a.testMaxMarks)) * 1000) / 10,
  }));
}

export async function listInterviews() {
  const { Op } = await import('sequelize');
  const rows = await Admission.findAll({
    where: { interviewDate: { [Op.ne]: null }, status: { [Op.notIn]: ['rejected'] } }, include, order: [['interviewDate', 'ASC'], ['interviewTime', 'ASC']],
  });
  return rows.map((a) => ({
    ...named(a), interviewDate: a.interviewDate, interviewTime: a.interviewTime, interviewPanel: a.interviewPanel, interviewResult: a.interviewResult,
  }));
}

export async function listOffers() {
  const rows = await Admission.findAll({ where: { status: 'approved' }, include, order: [['offerExpiry', 'ASC'], ['id', 'DESC']] });
  return rows.map((a) => ({ ...named(a), offerExpiry: a.offerExpiry, expired: Boolean(a.offerExpiry && a.offerExpiry < today()) }));
}

/** Funnel and workload figures for the admission team. */
export async function admissionSummary() {
  const rows = await Admission.findAll({ include });
  const count = (fn) => rows.filter(fn).length;
  const stages = ['enquiry', 'applied', 'waitlisted', 'approved', 'enrolled', 'rejected'];
  const decided = count((a) => ['approved', 'enrolled', 'rejected'].includes(a.status));
  const scored = rows.filter((a) => a.testMarks !== null && a.testMaxMarks);
  const byClass = new Map();
  rows.forEach((a) => {
    const name = a.SchoolClass ? `${a.SchoolClass.name}-${a.SchoolClass.section}` : 'No class chosen';
    const c = byClass.get(name) ?? { className: name, total: 0, approved: 0, enrolled: 0, waitlisted: 0 };
    c.total += 1;
    if (a.status === 'approved') c.approved += 1;
    if (a.status === 'enrolled') c.enrolled += 1;
    if (a.status === 'waitlisted') c.waitlisted += 1;
    byClass.set(name, c);
  });
  return {
    total: rows.length,
    stages: stages.map((s) => ({ stage: s, count: count((a) => a.status === s) })),
    online: count((a) => a.source === 'online'),
    office: count((a) => a.source !== 'online'),
    conversionPercent: rows.length ? Math.round((count((a) => a.status === 'enrolled') / rows.length) * 1000) / 10 : 0,
    acceptancePercent: decided ? Math.round((count((a) => ['approved', 'enrolled'].includes(a.status)) / decided) * 1000) / 10 : 0,
    testsTaken: scored.length,
    averageTestPercent: scored.length
      ? Math.round((scored.reduce((sum, a) => sum + (Number(a.testMarks) / Number(a.testMaxMarks)) * 100, 0) / scored.length) * 10) / 10 : null,
    upcomingInterviews: count((a) => a.interviewDate && a.interviewDate >= today() && !['rejected', 'enrolled'].includes(a.status)),
    expiredOffers: count((a) => a.status === 'approved' && a.offerExpiry && a.offerExpiry < today()),
    byClass: [...byClass.values()].sort((a, b) => a.className.localeCompare(b.className)),
  };
}
