import { DocumentTemplate } from '../../models/index.js';
import { DOCUMENT_TYPES } from '../../models/documentRequest.model.js';
import { badRequest } from '../../utils/httpError.js';

const MAX_LENGTH = 4000;

/** Values a template can use. Which ones are filled depends on the certificate type (see the notes on each). */
const PLACEHOLDERS = {
  school: 'School name',
  studentName: 'Student name',
  admissionNo: 'Admission number',
  className: 'Class and section',
  guardianName: 'Parent / guardian',
  dob: 'Date of birth',
  academicYear: 'Academic year',
  purpose: 'Purpose given in the request',
  child: 'son / daughter / ward',
  he: 'He / She / The student',
  his: 'his / her / the',
  conduct: 'Conduct (character and transfer)',
  leavingDate: 'Leaving date (transfer)',
  leavingReason: 'Leaving reason (transfer)',
  duesStatus: 'cleared / not cleared (transfer)',
  feesBilled: 'Total fees billed (fee)',
  feesPaid: 'Total fees paid (fee)',
  feesOutstanding: 'Outstanding balance (fee)',
};

/** The built-in wording, as editable text, so an admin can start from it. Blank lines separate paragraphs. */
const DEFAULT_BODY = {
  bonafide:
    'This is to certify that {{studentName}}, {{child}} of {{guardianName}}, bearing admission number {{admissionNo}} and born on {{dob}}, is a bonafide student of this school and is studying in Class {{className}} for the academic year {{academicYear}}.\n\nThis certificate is issued on request for the purpose of {{purpose}}.',
  character:
    'This is to certify that {{studentName}}, {{child}} of {{guardianName}}, admission number {{admissionNo}}, is a student of Class {{className}} of this school for the academic year {{academicYear}}.\n\n{{he}} bears a {{conduct}} moral character and conduct, to the best of our knowledge.',
  fee: 'This is to certify that {{studentName}}, admission number {{admissionNo}}, of Class {{className}} for the academic year {{academicYear}}, has the following fee position with this school:\n\nTotal fees billed: {{feesBilled}}\nTotal fees paid: {{feesPaid}}\nOutstanding balance: {{feesOutstanding}}',
  transfer:
    'This is to certify that {{studentName}}, {{child}} of {{guardianName}}, admission number {{admissionNo}}, born on {{dob}}, was a student of Class {{className}} of this school.\n\n{{he}} left the school on {{leavingDate}} for the following reason: {{leavingReason}}.\n\n{{he}} has {{duesStatus}} all dues to the school, and {{his}} conduct was {{conduct}}. {{he}} is entitled to seek admission to another school.',
};

function checkType(type) {
  if (!DOCUMENT_TYPES.includes(type)) throw badRequest(`Type must be one of ${DOCUMENT_TYPES.join(', ')}`);
}

export async function listTemplates() {
  const rows = await DocumentTemplate.findAll();
  return {
    placeholders: PLACEHOLDERS,
    templates: DOCUMENT_TYPES.map((type) => {
      const row = rows.find((r) => r.type === type);
      return {
        type,
        custom: Boolean(row),
        body: row?.body ?? DEFAULT_BODY[type],
        defaultBody: DEFAULT_BODY[type],
        updatedByName: row?.updatedByName ?? null,
        updatedAt: row?.updatedAt ?? null,
      };
    }),
  };
}

export async function saveTemplate(type, { body }, userName) {
  checkType(type);
  const text = String(body ?? '').trim();
  if (!text) throw badRequest('The wording cannot be empty');
  if (text.length > MAX_LENGTH) throw badRequest(`The wording is limited to ${MAX_LENGTH} characters`);
  const unknown = [...new Set([...text.matchAll(/\{\{\s*(\w+)\s*\}\}/g)].map((m) => m[1]))].filter(
    (k) => !(k in PLACEHOLDERS),
  );
  if (unknown.length)
    throw badRequest(`Unknown placeholder(s): ${unknown.map((k) => `{{${k}}}`).join(', ')}`);
  const row = await DocumentTemplate.findOne({ where: { type } });
  if (row) await row.update({ body: text, updatedByName: userName });
  else await DocumentTemplate.create({ type, body: text, updatedByName: userName });
}

export async function resetTemplate(type) {
  checkType(type);
  await DocumentTemplate.destroy({ where: { type } });
}

/** The custom wording for a type, if any. It is frozen into the snapshot when a certificate is issued. */
export async function customBody(type, transaction) {
  return (await DocumentTemplate.findOne({ where: { type }, transaction }))?.body ?? null;
}
