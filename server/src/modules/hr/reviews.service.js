import { PerformanceReview, Staff } from '../../models/index.js';
import { badRequest, conflict, notFound } from '../../utils/httpError.js';

const RATINGS = ['work', 'punctuality', 'teamwork', 'initiative'];
const FIELDS = ['staffId', 'period', 'reviewDate', 'reviewer', ...RATINGS, 'strengths', 'improvements'];
const average = (r) => Math.round((RATINGS.reduce((sum, k) => sum + r[k], 0) / RATINGS.length) * 100) / 100;

const shape = (r) => {
  const { Staff: s, ...rest } = r.toJSON();
  return {
    ...rest,
    staffName: s ? `${s.firstName} ${s.lastName}` : null,
    staffNo: s?.staffNo ?? null,
    overall: average(r),
  };
};

export async function listReviews({ staffId } = {}) {
  const rows = await PerformanceReview.findAll({
    where: staffId ? { staffId } : {},
    include: [{ model: Staff, attributes: ['firstName', 'lastName', 'staffNo'] }],
    order: [
      ['reviewDate', 'DESC'],
      ['id', 'DESC'],
    ],
  });
  return rows.map(shape);
}

function clean(body) {
  const data = Object.fromEntries(
    FIELDS.filter((f) => body[f] !== undefined).map((f) => [f, body[f] === '' ? null : body[f]]),
  );
  for (const k of RATINGS) {
    if (data[k] !== undefined) {
      data[k] = Number(data[k]);
      if (!Number.isInteger(data[k]) || data[k] < 1 || data[k] > 5)
        throw badRequest('Ratings must be whole numbers from 1 to 5');
    }
  }
  return data;
}

export async function createReview(body) {
  const data = clean(body);
  if (!data.staffId || !(await Staff.findByPk(data.staffId))) throw badRequest('Choose a staff member');
  if (!String(data.period ?? '').trim()) throw badRequest('Review period is required');
  if (!data.reviewDate) throw badRequest('Review date is required');
  for (const k of RATINGS) if (data[k] === undefined) throw badRequest('Every rating is required');
  return (await PerformanceReview.create(data)).id;
}

export async function updateReview(id, body) {
  const review = await PerformanceReview.findByPk(id);
  if (!review) throw notFound('Review not found');
  if (review.status === 'final') throw conflict('A finalised review cannot be changed');
  const { staffId, ...data } = clean(body); // the reviewed person is fixed once the review exists
  await review.update(data);
}

export async function finalizeReview(id) {
  const review = await PerformanceReview.findByPk(id);
  if (!review) throw notFound('Review not found');
  if (review.status === 'final') throw conflict('This review is already final');
  await review.update({ status: 'final' });
}

export async function deleteReview(id) {
  const review = await PerformanceReview.findByPk(id);
  if (!review) throw notFound('Review not found');
  if (review.status === 'final') throw conflict('A finalised review cannot be deleted');
  await review.destroy();
}
