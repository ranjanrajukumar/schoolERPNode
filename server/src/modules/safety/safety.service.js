import { Op } from 'sequelize';
import { ClinicVisit, Incident, SafetyInspection, Student } from '../../models/index.js';
import { today } from '../../utils/money.js';

const studentInclude = [{ model: Student, attributes: ['firstName', 'lastName', 'admissionNo'] }];

const shape = (row) => {
  const { Student: s, ...rest } = row.toJSON();
  return { ...rest, studentName: s ? `${s.firstName} ${s.lastName}` : null };
};

export async function listVisits() {
  const rows = await ClinicVisit.findAll({
    include: studentInclude,
    order: [
      ['visitDate', 'DESC'],
      ['id', 'DESC'],
    ],
  });
  return rows.map(shape);
}

export async function listIncidents() {
  const rows = await Incident.findAll({
    include: studentInclude,
    order: [
      ['incidentDate', 'DESC'],
      ['id', 'DESC'],
    ],
  });
  return rows.map(shape);
}

/** Counts for the Health & Safety report: this month's clinic use, open incidents, inspections failed or overdue. */
export async function healthSummary() {
  const month = `${today().slice(0, 7)}-01`;
  const [visits, sentHome, open, serious, inspections] = await Promise.all([
    ClinicVisit.count({ where: { visitDate: { [Op.gte]: month } } }),
    ClinicVisit.count({ where: { visitDate: { [Op.gte]: month }, outcome: 'sent_home' } }),
    Incident.count({ where: { status: 'open' } }),
    Incident.count({ where: { status: 'open', severity: 'serious' } }),
    SafetyInspection.findAll({
      order: [
        ['inspectionDate', 'DESC'],
        ['id', 'DESC'],
      ],
    }),
  ]);
  // Only the latest inspection of each area counts: an old failure that was re-inspected is no longer a problem.
  const latest = new Map();
  inspections.forEach((i) => {
    if (!latest.has(i.area)) latest.set(i.area, i);
  });
  const areas = [...latest.values()];
  return {
    visitsThisMonth: visits,
    sentHomeThisMonth: sentHome,
    openIncidents: open,
    seriousOpen: serious,
    areasNeedingAction: areas
      .filter((i) => i.result !== 'pass')
      .map((i) => ({ id: i.id, area: i.area, result: i.result, inspectionDate: i.inspectionDate })),
    inspectionsOverdue: areas
      .filter((i) => i.nextDue && i.nextDue < today())
      .map((i) => ({ id: i.id, area: i.area, nextDue: i.nextDue })),
  };
}
