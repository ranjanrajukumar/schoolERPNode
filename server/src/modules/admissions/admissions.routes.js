import express, { Router } from 'express';
import { MAX_BYTES } from '../files/files.service.js';
import {
  addDocument,
  getApplication,
  readDocument,
  removeDocument,
  saveDraft,
  submitApplication,
} from './applicationForm.service.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import {
  admissionSummary,
  clearInterview,
  clearTest,
  listInterviews,
  listOffers,
  listTests,
  setInterview,
  setOfferExpiry,
  setTest,
} from './admissionSteps.service.js';
import { applicationSummary, listApplications } from './applications.service.js';
import { feePreview } from './admissionServices.service.js';
import {
  purgeEnquiry,
  restoreEnquiry,
  softDeleteEnquiry,
  createEnquiry,
  enquirySummary,
  getEnquiry,
  listEnquiries,
  planFollowUp,
  updateEnquiry,
} from './enquiries.service.js';
import {
  changeStatus,
  createAdmission,
  enroll,
  listAdmissions,
  updateAdmission,
} from './admissions.service.js';

const router = Router();

// Fixed paths come before /:id.
router.get(
  '/tests',
  asyncHandler(async (_req, res) => res.json(await listTests())),
);
router.get(
  '/interviews',
  asyncHandler(async (_req, res) => res.json(await listInterviews())),
);
router.get(
  '/offers',
  asyncHandler(async (_req, res) => res.json(await listOffers())),
);
router.get(
  '/summary',
  asyncHandler(async (_req, res) => res.json(await admissionSummary())),
);
// POST /api/admissions/fee-preview { classId, choices } -> what would be billed at enrolment, for the application form
router.post(
  '/fee-preview',
  asyncHandler(async (req, res) =>
    res.json(await feePreview(req.body?.classId ? Number(req.body.classId) : null, req.body?.choices)),
  ),
);
router.get(
  '/applications/summary',
  asyncHandler(async (_req, res) => res.json(await applicationSummary())),
);
router.get(
  '/applications',
  asyncHandler(async (req, res) => res.json(await listApplications(req.query))),
);
// The student application form: draft, continue, submit, and the documents that come with it
router.post(
  '/applications',
  asyncHandler(async (req, res) => res.status(201).json({ id: await saveDraft(null, req.body) })),
);
router.get(
  '/applications/:id',
  asyncHandler(async (req, res) => res.json(await getApplication(req.params.id))),
);
router.put(
  '/applications/:id',
  asyncHandler(async (req, res) => {
    await saveDraft(req.params.id, req.body);
    res.json({ ok: true });
  }),
);
router.post(
  '/applications/:id/submit',
  asyncHandler(async (req, res) => res.json(await submitApplication(req.params.id, req.body))),
);
router.post(
  '/applications/:id/documents',
  express.raw({ type: () => true, limit: MAX_BYTES }),
  asyncHandler(async (req, res) => {
    const doc = await addDocument(req.params.id, {
      buffer: req.body,
      name: req.query.name,
      title: req.query.title,
      byName: req.user.name,
    });
    req.body = { name: doc.name, size: doc.size }; // audit the details, not the file
    res.status(201).json(doc);
  }),
);
router.get(
  '/applications/:id/documents/:docId',
  asyncHandler(async (req, res) => {
    const { doc, buffer } = await readDocument(req.params.id, req.params.docId);
    res.set({
      'Content-Type': doc.mimeType,
      'Content-Length': buffer.length,
      'Content-Disposition': `inline; filename*=UTF-8''${encodeURIComponent(doc.originalName)}`,
      'X-Content-Type-Options': 'nosniff',
      'Cache-Control': 'private, no-cache',
    });
    res.send(buffer);
  }),
);
router.delete(
  '/applications/:id/documents/:docId',
  asyncHandler(async (req, res) => {
    await removeDocument(req.params.id, req.params.docId);
    res.json({ ok: true });
  }),
);
router.get(
  '/enquiries/summary',
  asyncHandler(async (_req, res) => res.json(await enquirySummary())),
);
router.get(
  '/enquiries',
  asyncHandler(async (req, res) => res.json(await listEnquiries(req.query))),
);
router.post(
  '/enquiries',
  asyncHandler(async (req, res) => res.status(201).json({ id: await createEnquiry(req.body) })),
);
router.get(
  '/enquiries/:id',
  asyncHandler(async (req, res) => res.json(await getEnquiry(req.params.id))),
);
router.put(
  '/enquiries/:id',
  asyncHandler(async (req, res) => {
    await updateEnquiry(req.params.id, req.body);
    res.json({ ok: true });
  }),
);
router.put(
  '/:id/follow-up',
  asyncHandler(async (req, res) => {
    await planFollowUp(req.params.id, req.body);
    res.json({ ok: true });
  }),
);

router.put(
  '/:id/test',
  asyncHandler(async (req, res) => {
    await setTest(req.params.id, req.body);
    res.json({ ok: true });
  }),
);
router.delete(
  '/:id/test',
  asyncHandler(async (req, res) => {
    await clearTest(req.params.id);
    res.json({ ok: true });
  }),
);
router.put(
  '/:id/interview',
  asyncHandler(async (req, res) => {
    await setInterview(req.params.id, req.body);
    res.json({ ok: true });
  }),
);
router.delete(
  '/:id/interview',
  asyncHandler(async (req, res) => {
    await clearInterview(req.params.id);
    res.json({ ok: true });
  }),
);
router.put(
  '/:id/offer',
  asyncHandler(async (req, res) => {
    await setOfferExpiry(req.params.id, req.body);
    res.json({ ok: true });
  }),
);

// GET /api/admissions?status=
router.get(
  '/',
  asyncHandler(async (req, res) => res.json(await listAdmissions(req.query))),
);

router.post(
  '/',
  asyncHandler(async (req, res) => res.status(201).json({ id: await createAdmission(req.body) })),
);

router.put(
  '/:id',
  asyncHandler(async (req, res) => {
    await updateAdmission(req.params.id, req.body);
    res.json({ ok: true });
  }),
);

// POST /api/admissions/:id/status { status: applied|approved|rejected|enquiry }
router.post(
  '/:id/status',
  asyncHandler(async (req, res) => {
    await changeStatus(req.params.id, req.body.status);
    res.json({ ok: true });
  }),
);

// POST /api/admissions/:id/enroll { admissionNo? } -> creates the student and bills the class fees
router.post(
  '/:id/enroll',
  asyncHandler(async (req, res) => res.json(await enroll(req.params.id, req.body, req.user.name))),
);

router.post(
  '/enquiries/:id/restore',
  asyncHandler(async (req, res) => {
    await restoreEnquiry(req.params.id);
    res.json({ ok: true });
  }),
);

router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    // Soft delete by default (restorable from the Deleted tab); ?permanent=1 removes one that is already deleted.
    if (req.query.permanent) await purgeEnquiry(req.params.id);
    else await softDeleteEnquiry(req.params.id, req.user.name);
    res.json({ ok: true });
  }),
);

export default router;
