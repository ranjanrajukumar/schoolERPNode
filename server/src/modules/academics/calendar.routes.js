import { Router } from 'express';
import { Op } from 'sequelize';
import { Activity, CalendarEvent } from '../../models/index.js';
import { EVENT_TYPES } from '../../models/calendarEvent.model.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { badRequest, notFound } from '../../utils/httpError.js';
import { today } from '../../utils/money.js';

const router = Router();
const FIELDS = ['title', 'type', 'startDate', 'endDate', 'audience', 'description'];

const pick = (body) => Object.fromEntries(FIELDS.filter((f) => body[f] !== undefined).map((f) => [f, body[f] === '' ? null : body[f]]));

function check(data) {
  if (data.type && !EVENT_TYPES.includes(data.type)) throw badRequest(`Type must be one of ${EVENT_TYPES.join(', ')}`);
  if (data.startDate && data.endDate && data.endDate < data.startDate) throw badRequest('The end date cannot be before the start date');
}

/**
 * Events that overlap [from, to]. Staff see everything; `audiences` narrows it for families.
 * School activities (trips, competitions, clubs...) appear too, read-only; families only see those open to every class.
 */
export async function eventsBetween(from, to, audiences) {
  const [events, activities] = await Promise.all([
    CalendarEvent.findAll({
      where: { startDate: { [Op.lte]: to }, endDate: { [Op.gte]: from }, ...(audiences && { audience: { [Op.in]: audiences } }) },
    }),
    Activity.findAll({
      where: {
        status: { [Op.ne]: 'cancelled' },
        startDate: { [Op.lte]: to },
        endDate: { [Op.gte]: from },
        ...(audiences && { classId: null }),
      },
    }),
  ]);

  const fromActivities = activities.map((a) => ({
    id: `activity-${a.id}`,
    title: a.title,
    type: 'event',
    startDate: a.startDate,
    endDate: a.endDate,
    audience: 'all',
    description: a.venue ? `At ${a.venue}` : null,
    readOnly: true,
    source: 'activity',
    activityId: a.id,
  }));

  return [...events.map((e) => e.toJSON()), ...fromActivities]
    .sort((x, y) => x.startDate.localeCompare(y.startDate) || String(x.id).localeCompare(String(y.id)));
}

// GET /api/calendar?from=&to=   (defaults to the current month)
router.get('/', asyncHandler(async (req, res) => {
  const month = today().slice(0, 7);
  const from = req.query.from || `${month}-01`;
  const to = req.query.to || `${month}-31`;
  res.json(await eventsBetween(from, to));
}));

router.post('/', asyncHandler(async (req, res) => {
  const data = pick(req.body);
  data.endDate = data.endDate || data.startDate;
  if (!String(data.title ?? '').trim() || !data.startDate) throw badRequest('Title and start date are required');
  check(data);
  res.status(201).json({ id: (await CalendarEvent.create(data)).id });
}));

router.put('/:id', asyncHandler(async (req, res) => {
  const event = await CalendarEvent.findByPk(req.params.id);
  if (!event) throw notFound('Event not found');
  const data = pick(req.body);
  check({ startDate: event.startDate, endDate: event.endDate, ...data });
  await event.update(data);
  res.json({ ok: true });
}));

router.delete('/:id', asyncHandler(async (req, res) => {
  if (!(await CalendarEvent.destroy({ where: { id: req.params.id } }))) throw notFound('Event not found');
  res.json({ ok: true });
}));

export default router;
