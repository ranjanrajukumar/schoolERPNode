import { Router } from 'express';
import { Op } from 'sequelize';
import { Room, SchoolClass, Staff, Subject, TimetableSlot } from '../../models/index.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { badRequest, conflict } from '../../utils/httpError.js';

const router = Router();

function shape(slot) {
  return {
    id: slot.id,
    classId: slot.classId,
    day: slot.day,
    period: slot.period,
    subjectId: slot.subjectId,
    staffId: slot.staffId,
    roomId: slot.roomId,
    roomName: slot.Room?.name ?? null,
    className: slot.SchoolClass ? `${slot.SchoolClass.name}-${slot.SchoolClass.section}` : null,
    subjectName: slot.Subject?.name ?? null,
    teacherName: slot.Staff ? `${slot.Staff.firstName} ${slot.Staff.lastName}` : null,
  };
}

// GET /api/timetable?classId=  or  ?staffId=  (a class's week, or one teacher's week)
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const { classId, staffId } = req.query;
    if (!classId && !staffId) throw badRequest('classId or staffId is required');
    const slots = await TimetableSlot.findAll({
      where: { ...(classId && { classId }), ...(staffId && { staffId }) },
      include: [
        { model: SchoolClass, attributes: ['name', 'section'] },
        { model: Subject, attributes: ['name'] },
        { model: Staff, attributes: ['firstName', 'lastName'], required: false },
        { model: Room, attributes: ['name'], required: false },
      ],
      order: [
        ['day', 'ASC'],
        ['period', 'ASC'],
      ],
    });
    res.json(slots.map(shape));
  }),
);

/** Places a subject in a class period; re-saving the same class/day/period replaces it. */
router.post(
  '/',
  asyncHandler(async (req, res) => {
    const { classId, day, period, subjectId } = req.body;
    const staffId = req.body.staffId || null;
    const roomId = req.body.roomId || null;
    if (!classId || !day || !period || !subjectId)
      throw badRequest('Class, day, period and subject are required');

    if (staffId) {
      const clash = await TimetableSlot.findOne({
        where: { staffId, day, period, classId: { [Op.ne]: classId } },
        include: [{ model: SchoolClass, attributes: ['name', 'section'] }],
      });
      if (clash) {
        throw conflict(
          `That teacher already teaches ${clash.SchoolClass.name}-${clash.SchoolClass.section} in this period`,
        );
      }
    }

    if (roomId) {
      const used = await TimetableSlot.findOne({
        where: { roomId, day, period, classId: { [Op.ne]: classId } },
        include: [{ model: SchoolClass, attributes: ['name', 'section'] }],
      });
      if (used)
        throw conflict(
          `That room is already used by ${used.SchoolClass.name}-${used.SchoolClass.section} in this period`,
        );
    }

    await TimetableSlot.upsert({ classId, day, period, subjectId, staffId, roomId });
    res.status(201).json({ ok: true });
  }),
);

router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    await TimetableSlot.destroy({ where: { id: req.params.id } });
    res.json({ ok: true });
  }),
);

export default router;
