import { Op } from 'sequelize';
import { photoIds } from '../../utils/photoFlags.js';
import { Admission, SchoolClass } from '../../models/index.js';
import { badRequest } from '../../utils/httpError.js';

/**
 * The admission pipeline, read from what is already recorded on each applicant (nothing new is stored):
 *   Under review = applied or waitlisted, no test or interview set yet
 *   Assessment   = applied or waitlisted, with an entrance test or an interview date
 *   Offer sent   = approved
 *   Enrolled     = enrolled
 * An application is any admission that has moved past a plain enquiry.
 */
const STAGES = ['review', 'assessment', 'offer', 'enrolled', 'draft'];
const MAX_PAGE = 100;
const SOURCE = {
  online: 'Online application',
  office: 'Walk-in',
  phone: 'Phone',
  referral: 'Referral',
  social: 'Social media',
  other: 'Other',
};
const include = [{ model: SchoolClass, attributes: ['name', 'section'] }];
const escapeLike = (t) => t.replace(/[\\%_]/g, (c) => `\\${c}`);
const day = (v) => (v instanceof Date ? v.toISOString() : String(v ?? '')).slice(0, 10);

const IN_PROCESS = { status: { [Op.in]: ['applied', 'waitlisted'] } };
const HAS_ASSESSMENT = { [Op.or]: [{ testDate: { [Op.ne]: null } }, { interviewDate: { [Op.ne]: null } }] };

export function stageWhere(stage) {
  switch (stage) {
    case 'review':
      return { [Op.and]: [IN_PROCESS, { testDate: null, interviewDate: null }] };
    case 'assessment':
      return { [Op.and]: [IN_PROCESS, HAS_ASSESSMENT] };
    case 'offer':
      return { status: 'approved' };
    case 'enrolled':
      return { status: 'enrolled' };
    case 'draft':
      return { status: 'draft' };
    default:
      return { status: { [Op.notIn]: ['enquiry', 'draft'] } };
  }
}

function stageOf(a) {
  if (a.status === 'enrolled') return 'enrolled';
  if (a.status === 'approved') return 'offer';
  if (a.status === 'rejected') return 'closed';
  if (a.status === 'enquiry') return 'enquiry';
  if (a.status === 'draft') return 'draft';
  return a.testDate || a.interviewDate ? 'assessment' : 'review';
}
const STAGE_LABEL = {
  review: 'Under review',
  assessment: 'Assessment',
  offer: 'Offer sent',
  enrolled: 'Enrolled',
  closed: 'Closed',
  enquiry: 'Enquiry',
  draft: 'Draft',
};

const shape = (a) => {
  const submitted = day(a.enquiryOn) || day(a.createdAt);
  const stage = stageOf(a);
  return {
    id: a.id,
    applicationId: `ADM-${(submitted || String(new Date().getFullYear())).slice(0, 4)}-${String(a.id).padStart(4, '0')}`,
    applicantName: a.applicantName,
    className: a.SchoolClass ? `${a.SchoolClass.name}-${a.SchoolClass.section}` : null,
    classId: a.classId,
    guardianName: a.guardianName || a.fatherName || a.motherName || null,
    guardianPhone: a.guardianPhone || a.fatherPhone || a.motherPhone || null,
    submitted,
    academicYear: a.academicYear ?? null,
    status: a.status,
    stage,
    stageLabel: STAGE_LABEL[stage],
    sourceLabel: SOURCE[a.source] ?? 'Other',
    testDate: a.testDate,
    interviewDate: a.interviewDate,
    offerExpiry: a.offerExpiry,
  };
};

/** One page of applications for a stage (tab), a class, an academic year and free text (name, parent, phone, ADM-2026-0128 or 128). */
export async function listApplications(query = {}) {
  const { tab, q, classId, academicYear } = query;
  if (tab && tab !== 'all' && !STAGES.includes(tab)) throw badRequest('Unknown stage');
  const size = Math.min(Math.max(Number(query.pageSize) || 10, 1), MAX_PAGE);
  const page = Math.max(Number(query.page) || 1, 1);
  const and = [stageWhere(tab)];
  if (classId) and.push({ classId: Number(classId) });
  if (academicYear) and.push({ academicYear });
  for (const term of String(q ?? '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 5)) {
    const like = { [Op.like]: `%${escapeLike(term)}%` };
    const ref = /^adm-?\d{4}-?(\d+)$/i.exec(term);
    const number = ref ? Number(ref[1]) : /^\d{1,8}$/.test(term) ? Number(term) : null;
    and.push({
      [Op.or]: [
        { applicantName: like },
        { guardianName: like },
        { fatherName: like },
        { motherName: like },
        { guardianPhone: like },
        { fatherPhone: like },
        { motherPhone: like },
        ...(number ? [{ id: number }] : []),
      ],
    });
  }
  const { rows, count } = await Admission.findAndCountAll({
    where: { [Op.and]: and },
    include,
    order: [['id', 'DESC']],
    limit: size,
    offset: (page - 1) * size,
    distinct: true,
  });
  const withPhoto = await photoIds(
    'enquiry',
    rows.map((r) => r.id),
  );
  return {
    rows: rows.map((r) => ({ ...shape(r), hasPhoto: withPhoto.has(r.id) })),
    total: count,
    page,
    pageSize: size,
  };
}

/** Tiles and the pipeline: counts per stage, applicants this week, enrolments this month. */
export async function applicationSummary() {
  const week = new Date(Date.now() - 7 * 86400000);
  const monthStart = new Date();
  monthStart.setDate(1);
  const month = `${monthStart.getFullYear()}-${String(monthStart.getMonth() + 1).padStart(2, '0')}-01`;
  const [all, review, assessment, offer, enrolled, draft, thisWeek, enrolledThisMonth] = await Promise.all([
    ...['all', ...STAGES].map((s) => Admission.count({ where: stageWhere(s) })),
    Admission.count({ where: { [Op.and]: [stageWhere('all'), { createdAt: { [Op.gte]: week } }] } }),
    Admission.count({ where: { status: 'enrolled', enrolledOn: { [Op.gte]: month } } }),
  ]);
  return {
    counts: { all, review, assessment, offer, enrolled, draft },
    applicantsThisWeek: thisWeek,
    enrolledThisMonth,
  };
}
