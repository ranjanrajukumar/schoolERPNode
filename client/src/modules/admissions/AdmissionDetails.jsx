import { useEffect, useState } from 'react';
import { api } from '../../services/api.js';
import StudentPhoto from '../../components/StudentPhoto.jsx';
import { SECTIONS } from '../academics/StudentForm.jsx';
import { DETAIL_GROUPS, QualificationTable } from './AdmissionSections.jsx';

const date = (d) => (d ? new Date(`${String(d).slice(0, 10)}T00:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '');
const label = (v) => String(v).replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase());
const kb = (n) => (n >= 1048576 ? `${(n / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);
// Student-record fields that mean nothing on an enquiry or application, or are shown elsewhere in this popup.
const SKIP = new Set(['admissionNo', 'admissionDate', 'rollNo', 'status', 'classId', 'remarks', 'firstName', 'lastName']);

/**
 * Everything recorded about one enquiry or application, read-only: the student and family details, the enquiry and follow-up, test,
 * interview, offer and the uploaded documents. `row` is the grid row it was opened from (it already knows the class, source and stage names).
 */
export default function AdmissionDetails({ row, onEdit, editLabel = 'Edit' }) {
  const [a, setA] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => {
    setA(null); setError('');
    api(`/admissions/applications/${row.id}`).then(setA).catch((e) => setError(e.message));
  }, [row.id]);

  if (error) return <p className="error" role="alert">{error}</p>;
  if (!a) return <p>Loading…</p>;

  const sv = a.services ?? {};
  const money = (n) => Number(n).toFixed(2);
  const requested = [
    ['Electives', sv.electives?.join(', ')], ['Activities', sv.activities?.join(', ')],
    ['Transport', sv.transport && `${sv.transport.route}${sv.transport.stop ? ` · ${sv.transport.stop}` : ''} (${money(sv.transport.monthlyFee)}/month)`],
    ['Hostel', sv.hostel && (sv.hostel.room ? `${sv.hostel.hostel} · room ${sv.hostel.room} (${money(sv.hostel.monthlyFee)}/month)` : 'Bed requested, room not chosen')],
    ['Fee group', sv.feeGroup],
  ];
  // the detailed groups the enquiry and application forms collect (personal, addresses, official info); yes/no flags show only when ticked
  const detailKeys = new Set(DETAIL_GROUPS.flatMap(([, fields]) => fields.map(([k]) => k)));
  const show = (k, v) => {
    if (v === true) return 'Yes';
    if (v === false) return 'No';
    if (v === null || v === undefined || v === '') return null;
    if (/(Dob|Dom)$/.test(k)) return date(v);
    if (/QualPercent$/.test(k)) return `${Number(v)}%`;
    if (/Income$/.test(k)) return Number(v).toLocaleString('en-IN');
    return v;
  };
  const detailed = DETAIL_GROUPS.map(([title, fields]) => [title, fields.map(([k, l]) => [l, show(k, a[k]), k])]);
  // [label, value, key]: a field named by key is shown once, in the first group that has it
  const groups = [
    ['Student', [['Date of birth', date(a.dob), 'dob'], ['Gender', a.gender && label(a.gender), 'gender'], ['Previous school', a.previousSchool, 'previousSchool'], ['Previous class', a.previousClass, 'previousClass'], ['Previous TC no', a.previousTcNo, 'previousTcNo'], ['Special needs', a.specialNeeds, 'specialNeeds']]],
    ['Family contact', [
      ['Parent / guardian', a.guardianName, 'guardianName'], ['Relationship', a.guardianRelation, 'guardianRelation'], ['Phone', a.guardianPhone, 'guardianPhone'], ['Email', a.email ?? a.guardianEmail, 'email'],
      ['Secondary guardian', a.secondaryGuardianName, 'secondaryGuardianName'], ['Secondary phone', a.secondaryGuardianPhone, 'secondaryGuardianPhone'],
    ]],
    ...detailed,
    ...SECTIONS.map((s) => [s.title, s.fields.filter((f) => !SKIP.has(f.key) && !detailKeys.has(f.key) && a[f.key] !== undefined)
      .map((f) => [f.label.replace(/ \(.*\)$/, ''), f.type === 'date' ? date(a[f.key]) : f.key === 'gender' ? label(a[f.key] ?? '') : a[f.key], f.key])]),
    ['Enquiry', [
      ['Grade applying for', row.className], ['Academic year', a.academicYear], ['Source', row.sourceLabel],
      ['Enquiry date', date(a.enquiryOn ?? a.createdAt)], ['Assigned to', row.assignedToName], ['Preferred contact', a.preferredContact && label(a.preferredContact)], ['Remarks', a.remarks],
    ]],
    ['Follow-up', [
      ['Next follow-up', date(a.followUpOn)], ['Follow-up type', a.followUpType && label(a.followUpType)], ['Reminder note', a.followUpNote],
      ['Campus visit', date(a.visitOn)], ['Last contacted', date(a.lastContactedOn)],
    ]],
    ['Entrance test', [['Test date', date(a.testDate)], ['Marks', a.testMarks === null || a.testMarks === undefined ? null : `${Number(a.testMarks)} / ${Number(a.testMaxMarks)}`]]],
    ['Interview', [['Date', date(a.interviewDate)], ['Time', a.interviewTime], ['Panel', a.interviewPanel], ['Result', a.interviewResult && label(a.interviewResult)]]],
    ['Services requested', requested],
    ['Offer and enrolment', [['Offer confirm-by', date(a.offerExpiry)], ['Enrolled on', date(a.enrolledOn)], ['Consent given', date(a.consentAt)]]],
  ];
  const seen = new Set();
  const built = groups
    .map(([title, rows]) => [title, rows.filter(([, , k]) => !(k && seen.has(k)) && (!k || seen.add(k))).map(([l, v]) => [l, v === null || v === undefined || v === '' ? null : v])])
    .filter(([, rows]) => rows.length);
  // two groups with the same title (my own "Student" and the student form's) are shown as one
  const sections = [...built.reduce((m, [title, rows]) => m.set(title, [...(m.get(title) ?? []), ...rows]), new Map())].filter(([, rows]) => rows.length);

  return (
    <div className="student-details">
      <div className="details-head">
        <StudentPhoto studentId={a.id} entity="enquiry" show={row.hasPhoto !== false} alt={a.applicantName} className="photo-field-img"
          fallback={<div className="photo-field-img empty" aria-hidden="true">{a.applicantName.split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase()}</div>} />
        <div>
          <h3>{a.applicantName}</h3>
          <p className="hint">{row.applicationId ?? `ENQ-${String(a.id).padStart(4, '0')}`}{row.className ? ` · ${row.className}` : ''}</p>
          <span className="badge applied">● {row.stageLabel ?? label(a.status)}</span>
        </div>
        {onEdit && <div className="details-actions no-print"><button type="button" onClick={() => onEdit(a.id)}>{editLabel}</button></div>}
      </div>
      {sections.map(([title, rows]) => (
        <section key={title} className="details-section">
          <h4>{title}</h4>
          <dl>{rows.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v ?? <span className="none">—</span>}</dd></div>)}</dl>
        </section>
      ))}
      <section className="details-section">
          <h4>Qualification details</h4>
          <QualificationTable rows={a.qualifications} />
        </section>
      {a.studentId && sv.studentFees ? (
        <section className="details-section">
          <h4>Fees</h4>
          <dl>
            <div><dt>Billed</dt><dd>{sv.studentFees.total}</dd></div><div><dt>Paid</dt><dd>{sv.studentFees.paid}</dd></div><div><dt>Balance</dt><dd>{sv.studentFees.balance}</dd></div>
          </dl>
          {sv.studentFees.items.length > 0 && (
            <table className="enquiry-table"><thead><tr><th>Fee</th><th>Amount</th><th>Paid</th><th>Balance</th><th>Status</th></tr></thead>
              <tbody>{sv.studentFees.items.map((f) => <tr key={f.id}><td>{f.title}</td><td>{f.amount}</td><td>{f.paid}</td><td>{f.balance}</td><td><span className={`badge ${f.status}`}>{f.status}</span></td></tr>)}</tbody>
            </table>
          )}
        </section>
      ) : sv.feePreview?.items.length > 0 && (
        <section className="details-section">
          <h4>Fees at enrolment</h4>
          <table className="enquiry-table no-sno"><tbody>
            {sv.feePreview.items.map((i) => <tr key={`${i.source}-${i.title}`}><td>{i.title}<small className="block">{i.source}</small></td><td style={{ textAlign: 'right' }}>{money(i.amount)}</td></tr>)}
            <tr><td><b>Billed at enrolment</b></td><td style={{ textAlign: 'right' }}><b>{sv.feePreview.oneTime}</b></td></tr>
            {Number(sv.feePreview.monthly) > 0 && <tr><td><b>Monthly (transport and hostel)</b></td><td style={{ textAlign: 'right' }}><b>{sv.feePreview.monthly}</b></td></tr>}
          </tbody></table>
        </section>
      )}
      <section className="details-section">
        <h4>Documents</h4>
        {a.documents?.length
          ? <ul className="subject-chips">{a.documents.map((d) => <li key={d.id}><b>{d.title || d.name}</b><small>{d.name} · {kb(d.size)}</small></li>)}</ul>
          : <p className="hint">No documents uploaded.</p>}
      </section>
    </div>
  );
}
