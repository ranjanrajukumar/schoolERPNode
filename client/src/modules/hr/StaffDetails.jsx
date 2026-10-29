import { useEffect, useState } from 'react';
import Gate from '../../components/Gate.jsx';
import { api } from '../../services/api.js';
import StudentPhoto from '../../components/StudentPhoto.jsx';
import { SECTIONS } from './StaffForm.jsx';

const date = (d) =>
  d
    ? new Date(`${String(d).slice(0, 10)}T00:00:00`).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : '';
const label = (v) =>
  String(v)
    .replace(/_/g, ' ')
    .replace(/^./, (c) => c.toUpperCase());

/** Everything recorded about one staff member, read-only. Opened from the View button on a staff row. */
export default function StaffDetails({ id, onEdit }) {
  const [s, setS] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => {
    setS(null);
    setError('');
    api(`/staff/${id}`)
      .then(setS)
      .catch((e) => setError(e.message));
  }, [id]);

  if (error)
    return (
      <p className="error" role="alert">
        {error}
      </p>
    );
  if (!s) return <p>Loading…</p>;

  const show = (f) => {
    if (f.key === 'departmentId') return s.departmentName;
    const v = s[f.key];
    if (v === null || v === undefined || v === '') return null;
    if (f.type === 'date') return date(v);
    if (['employmentType', 'status', 'gender'].includes(f.key)) return label(v);
    return String(v);
  };
  const name = [s.firstName, s.middleName, s.lastName].filter(Boolean).join(' ');

  return (
    <div className="student-details">
      <div className="details-head">
        <StudentPhoto
          studentId={s.id}
          entity="staff"
          alt={name}
          className="photo-field-img"
          fallback={
            <div className="photo-field-img empty" aria-hidden="true">
              {`${s.firstName?.[0] ?? ''}${s.lastName?.[0] ?? ''}`.toUpperCase()}
            </div>
          }
        />
        <div>
          <h3>{name}</h3>
          <p className="hint">
            {s.staffNo}
            {s.designation ? ` · ${s.designation}` : ''}
            {s.departmentName ? ` · ${s.departmentName}` : ''}
          </p>
          <span className={`badge ${s.status === 'active' ? 'paid' : 'rejected'}`}>● {label(s.status)}</span>
        </div>
        {onEdit && (
          <div className="details-actions no-print">
            <Gate action="edit">
              <button type="button" onClick={() => onEdit(s.id)}>
                Edit
              </button>
            </Gate>
          </div>
        )}
      </div>
      {SECTIONS.map((section) => {
        const rows = section.fields.map((f) => [f, show(f)]).filter(([, v]) => v);
        if (!rows.length) return null;
        return (
          <section key={section.title} className="details-section">
            <h4>{section.title}</h4>
            <dl>
              {rows.map(([f, v]) => (
                <div key={f.key}>
                  <dt>{f.label.replace(/ \(.*\)$/, '')}</dt>
                  <dd>{v}</dd>
                </div>
              ))}
            </dl>
          </section>
        );
      })}
    </div>
  );
}
