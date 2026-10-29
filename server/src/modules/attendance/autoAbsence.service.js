import { Op } from 'sequelize';
import { AbsenceAlert, Attendance, Student } from '../../models/index.js';
import { today } from '../../utils/money.js';
import { getSetting } from '../settings/settings.service.js';
import { notifyUsers } from '../push/push.service.js';
import { sendAbsenceAlert } from '../messaging/messaging.service.js';
import { studentsOnLeave } from '../academics/attendance.service.js';
import { familyUserIds } from './studentLeave.service.js';

const SYSTEM = { id: null, name: 'System' };

// Students already handled today, so a reader that is not configured for SMS is not retried every few minutes.
let handledDay = '';
const handled = new Set();

export async function autoAbsenceStatus() {
  const [enabled, time, sms] = await Promise.all([
    getSetting('notify.autoAbsence'),
    getSetting('notify.autoAbsenceTime'),
    getSetting('notify.autoAbsenceSms'),
  ]);
  return { enabled: Boolean(enabled), time, sms: Boolean(sms) };
}

/**
 * Tells the family of every student marked absent today: a push notification to their parent and student logins and, when
 * switched on, an SMS to the guardian. Students on approved leave, and anyone the school has already contacted, are skipped.
 * Waits for the cut-off time so attendance can be finished and corrected first. `force` ignores the switch and the cut-off ("send now").
 */
export async function runAbsenceAlerts({ force = false } = {}) {
  const status = await autoAbsenceStatus();
  if (!force && !status.enabled) return { ran: false, reason: 'off' };
  if (!force && new Date().toTimeString().slice(0, 5) < status.time)
    return { ran: false, reason: 'before the cut-off time' };

  const date = today();
  if (handledDay !== date) {
    handled.clear();
    handledDay = date;
  }

  const [marks, onLeave] = await Promise.all([
    Attendance.findAll({
      where: { date, status: 'absent' },
      attributes: ['studentId'],
      include: [
        {
          model: Student,
          attributes: ['firstName', 'lastName'],
          where: { status: 'active' },
          required: true,
        },
      ],
    }),
    studentsOnLeave(date),
  ]);
  const told = new Set(
    (
      await AbsenceAlert.findAll({
        where: { date, studentId: { [Op.in]: marks.map((m) => m.studentId) } },
        attributes: ['studentId'],
        raw: true,
      })
    ).map((a) => a.studentId),
  );

  let notified = 0;
  let texted = 0;
  for (const m of marks) {
    if (onLeave.has(m.studentId) || told.has(m.studentId) || handled.has(m.studentId)) continue;
    handled.add(m.studentId);
    const family = await familyUserIds(m.studentId);
    if (family.length) {
      await notifyUsers(family, {
        title: 'Absence alert',
        body: `${m.Student.firstName} ${m.Student.lastName} was marked absent today. Please contact the school if this is unexpected.`,
        url: '/portal?tab=Attendance',
      });
      await AbsenceAlert.create({
        studentId: m.studentId,
        date,
        method: 'portal',
        note: 'Automatic push notification',
        notifiedBy: null,
        notifiedByName: SYSTEM.name,
      });
      notified += 1;
    }
    if (status.sms) {
      try {
        const sent = await sendAbsenceAlert({ studentId: m.studentId, date }, SYSTEM);
        if (sent.status === 'sent') texted += 1;
      } catch {
        /* no usable guardian phone, or an SMS was already sent: nothing to do */
      }
    }
  }
  return { ran: true, absent: marks.length, notified, texted };
}

/** Checks every few minutes; started once when the server starts. */
export function startAbsenceAlertTimer(minutes = 5) {
  const timer = setInterval(
    () => {
      runAbsenceAlerts().catch((err) => console.error('Absence alerts failed:', err.message));
    },
    minutes * 60 * 1000,
  );
  timer.unref();
  return timer;
}
