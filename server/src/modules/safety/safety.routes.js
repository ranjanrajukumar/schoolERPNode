import { Router } from 'express';
import { ClinicVisit, Incident, SafetyInspection } from '../../models/index.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { crudRouter } from '../../utils/crud.js';
import { healthSummary, listIncidents, listVisits } from './safety.service.js';

// Mounted behind requireRole('admin'): health and safety records belong to the school office.
const router = Router();

router.use('/visits', crudRouter(ClinicVisit, {
  fields: ['studentId', 'visitDate', 'complaint', 'treatment', 'medication', 'outcome', 'parentInformed'], list: listVisits,
}));
router.use('/incidents', crudRouter(Incident, {
  fields: ['incidentDate', 'studentId', 'location', 'severity', 'description', 'actionTaken', 'status'], list: listIncidents,
}));
router.use('/inspections', crudRouter(SafetyInspection, {
  fields: ['inspectionDate', 'area', 'inspector', 'result', 'notes', 'nextDue'],
}));
router.get('/summary', asyncHandler(async (_req, res) => res.json(await healthSummary())));

export default router;
