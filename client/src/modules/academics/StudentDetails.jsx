import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../services/api.js';
import StudentPhoto from '../../components/StudentPhoto.jsx';
import IdCardsPopup from '../../components/IdCardsPopup.jsx';
import DocumentSlots, { useDocuments } from '../../components/DocumentSlots.jsx';
import { SECTIONS } from './StudentForm.jsx';
import {
  ADMISSION_GROUPS,
  DETAIL_GROUPS,
  SIGNATURES,
  SiblingsTable,
  formatDetail,
  QualificationTable,
} from '../admissions/AdmissionSections.jsx';

const date = (d) =>
  d ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '';
const SOURCE_LABEL = {
  online: 'Website',
  office: 'Walk-in',
  phone: 'Phone',
  referral: 'Referral',
  social: 'Social media',
  other: 'Other',
};
const label = (v) =>
  String(v)
    .replace('_', ' ')
    .replace(/^./, (c) => c.toUpperCase());

/** The signature, left thumb and parents' pictures that have been uploaded for this student. */
function ExtraPictures({ id }) {
  const [have, setHave] = useState([]);
  useEffect(() => {
    let live = true;
    Promise.all(
      SIGNATURES.map(([entity]) =>
        api(`/photos/has/${entity}?ids=${id}`)
          .then((ids) => (ids.includes(id) ? entity : null))
          .catch(() => null),
      ),
    ).then((found) => {
      if (live) setHave(found.filter(Boolean));
    });
    return () => {
      live = false;
    };
  }, [id]);
  if (!have.length) return null;
  return (
    <section className="details-section">
      <h4>Photos and signatures</h4>
      <div className="picture-row">
        {SIGNATURES.filter(([entity]) => have.includes(entity)).map(([entity, label]) => (
          <figure key={entity}>
            <StudentPhoto studentId={id} entity={entity} alt={label} className="picture-thumb" />
            <figcaption>{label}</figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}

/** Everything recorded about one student, read-only, with the ID card to print. Opened from the ⋯ button on a student row. */
export default function StudentDetails({ id, canEdit, canSeeProfile, onEdit }) {
  const [s, setS] = useState(null);
  const [error, setError] = useState('');
  const docs = useDocuments('student', id);
  const [taken, setTaken] = useState(null);
  const [services, setServices] = useState(null);
  const [sheet, setSheet] = useState(null);
  const [fees, setFees] = useState(null); // null when the signed-in role may not see fees
  const [saveNote, setSaveNote] = useState('');

  useEffect(() => {
    setS(null);
    setError('');
    api(`/students/${id}`)
      .then(setS)
      .catch((e) => setError(e.message));
    api(`/students/${id}/subjects`)
      .then(setTaken)
      .catch(() => setTaken(null));
    api(`/fees?studentId=${id}`)
      .then(setFees)
      .catch(() => setFees(null));
    api(`/student-profile/${id}`)
      .then((p) => setServices({ transport: p.transport, hostel: p.hostel, activities: p.activities }))
      .catch(() => setServices(null));
  }, [id]);

  // this student's electives, so an admin can change them here (they are also set in the application and on the Subject map)
  useEffect(() => {
    if (!s?.classId || !canEdit) {
      setSheet(null);
      return;
    }
    api(`/class-subjects/electives?classId=${s.classId}`)
      .then((all) =>
        setSheet({ groups: all.groups, choices: all.students.find((x) => x.id === s.id)?.choices ?? [] }),
      )
      .catch(() => setSheet(null));
  }, [s?.classId, s?.id, canEdit]);
  const chooseElective = async (group, classSubjectId) => {
    setSaveNote('');
    const keep = sheet.choices.filter((c) => !group.subjects.some((x) => x.classSubjectId === c));
    const next = classSubjectId ? [...keep, Number(classSubjectId)] : keep;
    try {
      await api(`/students/${id}/electives`, { method: 'PUT', body: { classSubjectIds: next } });
      setSheet({ ...sheet, choices: next });
      setTaken(await api(`/students/${id}/subjects`));
      setSaveNote('Elective saved.');
    } catch (err) {
      setSaveNote(err.message);
    }
  };

  if (error)
    return (
      <p className="error" role="alert">
        {error}
      </p>
    );
  if (!s) return <p>Loading…</p>;

  const show = (f) => {
    const v = s[f.key];
    if (v === null || v === undefined || v === '') return null;
    if (f.type === 'date') return date(v);
    if (f.key === 'classId')
      return s.classTeacherName ? `${s.className} · class teacher ${s.classTeacherName}` : s.className;
    if (f.key === 'registrationStatus' || f.key === 'status' || f.key === 'gender') return label(v);
    return String(v);
  };

  // what the application collected beyond the registration fields above: parents, contacts, addresses, official info
  const shownKeys = new Set(SECTIONS.flatMap((section) => section.fields.map((f) => f.key)));
  const extraGroups = [...DETAIL_GROUPS, ...ADMISSION_GROUPS]
    .map(([title, fields]) => [
      title,
      [
        ...(title === 'Official info' && s.source ? [['Source', SOURCE_LABEL[s.source] ?? s.source]] : []),
        ...fields
          .filter(([k]) => !shownKeys.has(k))
          .map(([k, l]) => [l, s[k] === false ? 'No' : formatDetail(k, s[k])]),
      ],
    ])
    .filter(([, rows]) => rows.length);

  return (
    <div className="student-details">
      <div className="details-head">
        <StudentPhoto
          studentId={s.id}
          alt={`${s.firstName} ${s.lastName}`}
          className="photo-field-img"
          fallback={
            <div className="photo-field-img empty" aria-hidden="true">
              {`${s.firstName?.[0] ?? ''}${s.lastName?.[0] ?? ''}`.toUpperCase()}
            </div>
          }
        />
        <div>
          <h3>{[s.firstName, s.middleName, s.lastName].filter(Boolean).join(' ')}</h3>
          <p className="hint">
            {s.studentId} · Admission no {s.admissionNo}
            {s.className ? ` · ${s.className.replace(/-([^-]+)$/, ' · $1')}` : ''}
          </p>
          <span className={`badge ${s.status === 'active' ? 'paid' : 'rejected'}`}>● {label(s.status)}</span>
          {docs.missing.length > 0 && (
            <span className="badge partial" style={{ marginLeft: 8 }} title={docs.missing.join(', ')}>
              ● {docs.missing.length} document{docs.missing.length > 1 ? 's' : ''} missing
            </span>
          )}
          <span
            className={`badge ${{ complete: 'paid', pending: 'partial', under_review: 'applied' }[s.registrationStatus] ?? ''}`}
            style={{ marginLeft: 8 }}
          >
            ● Registration {label(s.registrationStatus ?? 'complete').toLowerCase()}
          </span>
        </div>
        <div className="details-actions no-print">
          {canEdit && (
            <button type="button" onClick={() => onEdit(s.id)}>
              Edit
            </button>
          )}
          {canSeeProfile && (
            <Link className="btn" to={`/students/${s.id}/profile`}>
              Open full profile
            </Link>
          )}
        </div>
      </div>

      {SECTIONS.map((section) => {
        const rows = section.fields.map((f) => [f, show(f)]);
        return (
          <section key={section.title} className="details-section">
            <h4>{section.title}</h4>
            <dl>
              {rows.map(([f, v]) => (
                <div key={f.key}>
                  <dt>{f.label.replace(/ \(.*\)$/, '')}</dt>
                  <dd>{v ?? <span className="none">—</span>}</dd>
                </div>
              ))}
            </dl>
          </section>
        );
      })}

      {extraGroups.map(([title, rows]) => (
        <section key={title} className="details-section">
          <h4>{title}</h4>
          <dl>
            {rows.map(([l, v]) => (
              <div key={l}>
                <dt>{l}</dt>
                <dd>{v ?? <span className="none">—</span>}</dd>
              </div>
            ))}
          </dl>
        </section>
      ))}

      <section className="details-section">
        <h4>Qualification details</h4>
        <QualificationTable rows={s.qualifications} />
      </section>

      <section className="details-section">
        <h4>Sibling details</h4>
        <SiblingsTable rows={s.siblings} />
      </section>

      <ExtraPictures id={s.id} />

      {taken && taken.subjects.length > 0 && (
        <section className="details-section">
          <h4>Subjects</h4>
          <ul className="subject-chips">
            {taken.subjects.map((x) => (
              <li key={x.id}>
                <b>{x.name}</b>
                <span className={`badge ${x.isElective ? 'partial' : 'paid'}`}>
                  {x.isElective ? 'Elective' : 'Core'}
                </span>
                <small>{x.componentLabel}</small>
              </li>
            ))}
          </ul>
          {taken.electivesNotChosen?.length > 0 && (
            <p className="hint">No choice yet for: {taken.electivesNotChosen.join(', ')}.</p>
          )}
          {sheet && sheet.groups.length > 0 && (
            <div className="enq-grid no-print" style={{ marginTop: 10 }}>
              {sheet.groups.map((g) => (
                <label key={g.name}>
                  <span>{g.name}</span>
                  <select
                    value={
                      g.subjects.find((x) => sheet.choices.includes(x.classSubjectId))?.classSubjectId ?? ''
                    }
                    onChange={(e) => chooseElective(g, e.target.value)}
                  >
                    <option value="">Not chosen</option>
                    {g.subjects.map((x) => (
                      <option key={x.classSubjectId} value={x.classSubjectId}>
                        {x.name}
                      </option>
                    ))}
                  </select>
                </label>
              ))}
            </div>
          )}
          {saveNote && <p className="hint no-print">{saveNote}</p>}
        </section>
      )}

      {services && (
        <section className="details-section">
          <h4>Services and activities</h4>
          <dl>
            <div>
              <dt>Transport</dt>
              <dd>
                {services.transport
                  ? `${services.transport.route} · ${services.transport.stop}${services.transport.pickupTime ? ` (pickup ${services.transport.pickupTime})` : ''}`
                  : 'Not on a bus'}
              </dd>
            </div>
            <div>
              <dt>Hostel</dt>
              <dd>
                {services.hostel
                  ? `${services.hostel.hostel} · room ${services.hostel.room}${services.hostel.bed ? ` · bed ${services.hostel.bed}` : ''}`
                  : 'Not a boarder'}
              </dd>
            </div>
            <div>
              <dt>Activities</dt>
              <dd>
                {services.activities.length ? services.activities.map((a) => a.title).join(', ') : 'None'}
              </dd>
            </div>
          </dl>
        </section>
      )}

      {fees && (
        <section className="details-section">
          <h4>Fees</h4>
          {(() => {
            const sum = (k) => fees.reduce((n, f) => n + Math.round(Number(f[k]) * 100), 0) / 100;
            return (
              <dl>
                <div>
                  <dt>Billed</dt>
                  <dd>{sum('amount').toFixed(2)}</dd>
                </div>
                <div>
                  <dt>Paid</dt>
                  <dd>{sum('paidAmount').toFixed(2)}</dd>
                </div>
                <div>
                  <dt>Balance</dt>
                  <dd>{sum('balance').toFixed(2)}</dd>
                </div>
              </dl>
            );
          })()}
          {fees.length > 0 && (
            <table className="enquiry-table">
              <thead>
                <tr>
                  <th>Fee</th>
                  <th>Amount</th>
                  <th>Paid</th>
                  <th>Balance</th>
                  <th>Due</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {fees.map((f) => (
                  <tr key={f.id}>
                    <td>{f.title}</td>
                    <td>{f.amount}</td>
                    <td>{f.paidAmount}</td>
                    <td>{f.balance}</td>
                    <td>{f.dueDate}</td>
                    <td>
                      <span className={`badge ${f.status}`}>{f.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      )}

      <section className="details-section no-print">
        <h4>Documents</h4>
        <DocumentSlots docs={docs} disabled={!canEdit} title="What the school asks for" />
      </section>

      {s.status === 'active' && (
        <section className="details-section">
          <h4>ID card</h4>
          <IdCardsPopup studentId={s.id} />
        </section>
      )}
    </div>
  );
}
