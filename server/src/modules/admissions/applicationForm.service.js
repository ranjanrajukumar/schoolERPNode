import { AcademicYear, Admission, ApplicationDocument, MasterItem, Photo } from '../../models/index.js';
import { badRequest, conflict, notFound } from '../../utils/httpError.js';
import { ADMISSION_FIELDS, checkDetails } from './admissions.service.js';
import { saveFile, sniff, MAX_BYTES } from '../files/files.service.js';
import { cleanChoices, parseChoices } from './admissionChoices.service.js';
import { cleanEnquiryExtras } from './enquiryFields.js';
import { loadExtras, saveExtras } from './recordExtras.js';
import { describeServices } from './admissionServices.service.js';

/**
 * The student application form: a draft that is filled in over four steps and submitted once. The same admissions record flows
 * on through the pipeline (under review, assessment, offer, enrolled), so nothing is typed twice. An enquiry can be opened here
 * too, and submitting it moves that enquiry to "applied".
 */
const blank = (v) => v === undefined || v === null || String(v).trim() === '';
const SUBMITTABLE = ['draft', 'enquiry'];
const FORM_FIELDS = [...new Set([...ADMISSION_FIELDS, 'referredBy', 'academicYear'])];

const clean = (body) =>
  Object.fromEntries(
    FORM_FIELDS.filter((f) => body[f] !== undefined).map((f) => [
      f,
      blank(body[f]) ? null : typeof body[f] === 'string' ? body[f].trim() : body[f],
    ]),
  );

/** The form's own first and last name become the applicant name, the way the enquiry form does it. */
function withName(body, data) {
  if (body.firstName !== undefined || body.lastName !== undefined)
    data.applicantName = [body.firstName, body.lastName]
      .map((x) => String(x ?? '').trim())
      .filter(Boolean)
      .join(' ');
  return data;
}

const listDocs = async (admissionId) =>
  (
    await ApplicationDocument.findAll({
      where: { admissionId },
      attributes: ['id', 'title', 'originalName', 'mimeType', 'size', 'createdAt'],
      order: [['id', 'ASC']],
    })
  ).map((d) => ({
    id: d.id,
    title: d.title,
    name: d.originalName,
    mimeType: d.mimeType,
    size: d.size,
    uploadedAt: d.createdAt,
  }));

export async function getApplication(id) {
  const a = await Admission.findByPk(id);
  if (!a) throw notFound('Application not found');
  const [first, ...rest] = a.applicantName.trim().split(/\s+/);
  return {
    ...a.toJSON(),
    ...(await loadExtras('admission', id)),
    choices: parseChoices(a.choices),
    firstName: first,
    lastName: rest.join(' '),
    documents: await listDocs(id),
    services: await describeServices(a),
  };
}

async function checkYear(data) {
  if (!data.academicYear) return;
  if ((await AcademicYear.count()) && !(await AcademicYear.findOne({ where: { name: data.academicYear } })))
    throw badRequest('Academic year is not one of the academic years');
}

/** Saves a draft. With no id a new draft is created; the application number is assigned from its record number. */
export async function saveDraft(id, body) {
  const data = withName(body, clean(body));
  const extras = cleanEnquiryExtras(body);
  if (extras.error) throw badRequest(extras.error);
  await checkDetails({ ...body, ...data });
  await checkYear(data);
  if (body.choices !== undefined) {
    const classId =
      data.classId ?? (id ? (await Admission.findByPk(id, { attributes: ['classId'] }))?.classId : null);
    data.choices = JSON.stringify(await cleanChoices(body.choices, classId));
  }
  if (!id) {
    if (blank(data.applicantName)) throw badRequest('Enter at least the first name to save a draft');
    const created = await Admission.create({ ...data, status: 'draft', source: data.source ?? 'office' });
    await saveExtras('admission', created.id, extras.data);
    return created.id;
  }
  const a = await Admission.findByPk(id);
  if (!a) throw notFound('Application not found');
  if (['enrolled', 'rejected'].includes(a.status))
    throw conflict(`A ${a.status} application cannot be changed here`);
  if (data.applicantName === '') delete data.applicantName;
  if (!data.source) delete data.source; // the column cannot be empty
  await a.update(data);
  await saveExtras('admission', a.id, extras.data);
  return a.id;
}

/** What has to be filled in before an application can be submitted, as the form's own labels. */
function missingForSubmit(a, years) {
  const need = [];
  const [first, ...rest] = String(a.applicantName ?? '')
    .trim()
    .split(/\s+/);
  if (!first) need.push('First name');
  if (!rest.length) need.push('Last name');
  if (!a.dob) need.push('Date of birth');
  if (!a.classId) need.push('Grade applying for');
  if (years && !a.academicYear) need.push('Academic year');
  if (blank(a.guardianName)) need.push('Primary guardian name');
  if (blank(a.guardianRelation)) need.push('Relationship to student');
  if (blank(a.guardianPhone)) need.push('Phone number');
  if (blank(a.address)) need.push('Residential address');
  return need;
}

/** Saves the latest values, checks nothing required is missing and consent was given, then moves the application to "applied". */
export async function submitApplication(id, body) {
  const a = await Admission.findByPk(id);
  if (!a) throw notFound('Application not found');
  if (!SUBMITTABLE.includes(a.status))
    throw conflict(
      a.status === 'applied'
        ? 'This application has already been submitted'
        : `A ${a.status} application cannot be submitted`,
    );
  if (body && Object.keys(body).length > 1) await saveDraft(id, body);
  const fresh = await Admission.findByPk(id);
  const need = missingForSubmit(fresh, (await AcademicYear.count()) > 0);
  const docsMissing = await missingDocuments(id);
  if (docsMissing.length) need.push(...docsMissing.map((d) => `${d} (upload)`));
  if (need.length) throw badRequest(`Please complete: ${need.join(', ')}`);
  if (body?.consent !== true)
    throw badRequest('Please confirm the information is accurate and consent to being contacted');
  await fresh.update({ status: 'applied', consentAt: new Date(), followUpOn: null });
  return { id: fresh.id };
}

// ---- documents ----
const DOC_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];

export async function addDocument(id, { buffer, name, title, byName }) {
  const a = await Admission.findByPk(id, { attributes: ['id', 'status'] });
  if (!a) throw notFound('Application not found');
  if (a.status === 'enrolled')
    throw conflict('An enrolled applicant has no application to add documents to; use the student record');
  if (!Buffer.isBuffer(buffer) || !buffer.length) throw badRequest('No file received');
  if (buffer.length > MAX_BYTES) throw badRequest(`A file must be ${MAX_BYTES / 1024 / 1024} MB or smaller`);
  const mimeType = sniff(buffer);
  if (!DOC_TYPES.includes(mimeType)) throw badRequest('Only PDF, JPG, PNG or WebP files are allowed');
  if ((await ApplicationDocument.count({ where: { admissionId: id } })) >= 10)
    throw badRequest('An application can have at most 10 documents');
  const doc = await ApplicationDocument.create({
    admissionId: id,
    title:
      String(title ?? '')
        .trim()
        .slice(0, 100) || null,
    originalName: String(name || 'document').slice(0, 255),
    mimeType,
    size: buffer.length,
    data: buffer.toString('base64'),
    uploadedByName: byName,
  });
  return { id: doc.id, title: doc.title, name: doc.originalName, mimeType, size: doc.size };
}

export async function readDocument(id, docId) {
  const doc = await ApplicationDocument.findOne({ where: { id: docId, admissionId: id } });
  if (!doc) throw notFound('Document not found');
  return { doc, buffer: Buffer.from(doc.data, 'base64') };
}

export async function removeDocument(id, docId) {
  const a = await Admission.findByPk(id, { attributes: ['status'] });
  if (a?.status === 'enrolled') throw conflict('An enrolled applicant has no application to change');
  if (!(await ApplicationDocument.destroy({ where: { id: docId, admissionId: id } })))
    throw notFound('Document not found');
}

/**
 * After enrolment: the application's documents become the student's documents and the applicant's photo becomes the student's photo.
 * Failures here never undo the enrolment; they are reported back so the school can add the file by hand.
 */
export async function carryOverToStudent(admissionId, studentId, byName) {
  const problems = [];
  for (const d of await ApplicationDocument.findAll({ where: { admissionId } })) {
    try {
      await saveFile({
        studentId,
        kind: 'document',
        title: d.title || d.originalName.replace(/\.[^.]+$/, ''),
        originalName: d.originalName,
        buffer: Buffer.from(d.data, 'base64'),
        uploadedByName: byName,
      });
    } catch (err) {
      problems.push(`${d.originalName}: ${err.message}`);
    }
  }
  const photo = await Photo.findOne({ where: { entity: 'enquiry', entityId: admissionId } });
  if (photo) {
    await Photo.destroy({ where: { entity: 'student', entityId: studentId } });
    await Photo.create({
      entity: 'student',
      entityId: studentId,
      mimeType: photo.mimeType,
      size: photo.size,
      originalName: photo.originalName,
      data: photo.data,
      uploadedByName: byName,
    });
  }
  return problems;
}

/** The required documents (Master data → Application documents) that have not been uploaded to this application yet. */
async function missingDocuments(admissionId) {
  const required = await MasterItem.findAll({
    where: { type: 'application_document', required: true, active: true },
    attributes: ['name'],
  });
  const have = new Set(
    (await ApplicationDocument.findAll({ where: { admissionId }, attributes: ['title'] })).map((d) =>
      String(d.title ?? '').toLowerCase(),
    ),
  );
  return required.map((r) => r.name).filter((n) => !have.has(n.toLowerCase()));
}
