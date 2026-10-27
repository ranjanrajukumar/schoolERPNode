import StudentPhoto from './StudentPhoto.jsx';
import { DEFAULT_DESIGN } from './idCardDesign.js';

export const FIELD_LABEL = {
  student: { admissionNo: 'Adm. no', rollNo: 'Roll no', className: 'Class', dob: 'DOB', guardianName: 'Guardian', guardianPhone: 'Phone' },
  staff: { staffNo: 'Staff no', designation: 'Designation', departmentName: 'Dept', phone: 'Phone', email: 'Email', joinDate: 'Joined' },
};
const DATE_FIELDS = ['dob', 'joinDate'];
const fmt = (key, v) => (DATE_FIELDS.includes(key) && v ? new Date(v).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : v);

/** One ID card drawn from the saved design. `person` is a student card or a staff card from the API. */
export function IdCard({ kind, person, school, academicYear, design = DEFAULT_DESIGN, logoUrl }) {
  const part = design[kind];
  const rows = part.fields.map((k) => [k, fmt(k, person[k])]).filter(([, v]) => v);
  const photoId = kind === 'student' ? person.studentId : person.staffId;
  return (
    <div className="id-card" style={{ borderColor: design.headerColor }}>
      <div className="id-school" style={{ background: design.headerColor }}>
        {design.showLogo && logoUrl && <img src={logoUrl} alt="" className="id-logo" />}
        <span>{school}</span>
      </div>
      <div className="id-kind" style={{ background: design.accentColor }}>{part.title}</div>
      <StudentPhoto studentId={photoId} entity={kind} show={person.hasPhoto} alt={person.name} className="id-photo" fallback={<div className="id-photo">Photo</div>} />
      <div className="id-name" style={{ color: design.headerColor }}>{person.name}</div>
      {rows.map(([k, v]) => <div key={k}>{FIELD_LABEL[kind][k]}: <b>{v}</b></div>)}
      {design.showAcademicYear && academicYear && <div className="id-year">{academicYear}</div>}
      {(design.signatureLabel || design.footerText) && (
        <div className="id-foot">
          {design.signatureLabel && <div className="id-sign"><span />{design.signatureLabel}</div>}
          {design.footerText && <div className="id-footer-text">{design.footerText}</div>}
        </div>
      )}
    </div>
  );
}

/** The printable cards. `data` is the answer of GET /documents/id-cards (kind "student") or /documents/staff-id-cards (kind "staff"). */
export default function IdCardSheet({ data, kind = 'student', design, logoUrl }) {
  return (
    <div className="id-cards">
      {data?.cards.map((c) => (
        <IdCard key={c.studentId ?? c.staffId} kind={kind} person={c} school={data.school} academicYear={data.academicYear} design={design} logoUrl={logoUrl} />
      ))}
    </div>
  );
}
