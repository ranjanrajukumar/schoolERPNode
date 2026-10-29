import { useCallback, useEffect, useState } from 'react';
import Gate from '../../components/Gate.jsx';
import { Link } from 'react-router-dom';
import { api } from '../../services/api.js';
import { useAuth } from '../../context/AuthContext.jsx';
import Modal from '../../components/Modal.jsx';
import Pagination from '../../components/Pagination.jsx';
import { useOpenNew } from '../../hooks/useOpenNew.js';
import PersonThumb from '../../components/PersonThumb.jsx';
import StudentForm from './StudentForm.jsx';
import StudentDetails from './StudentDetails.jsx';

const PAGE_SIZE = 10;
const STATUS = [
  ['complete', 'Complete'],
  ['pending', 'Pending'],
  ['under_review', 'Under review'],
];
const PILL = { complete: 'paid', pending: 'partial', under_review: 'applied' };
const label = Object.fromEntries(STATUS);
const date = (d) =>
  d ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '';

function Tile({ icon, tone, text, value }) {
  return (
    <div className="tile card">
      <span className={`tile-icon ${tone}`} aria-hidden="true">
        {icon}
      </span>
      <span className="tile-text">
        <span>{text}</span>
        <b>{value}</b>
      </span>
    </div>
  );
}

const csvCell = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;

/** Student registrations for the current academic year: who registered, whether the paperwork is complete, and what still needs review. */
export default function Registrations() {
  const role = useAuth().user?.role;
  const canWrite = role === 'admin';
  const canSeeProfile = ['admin', 'teacher'].includes(role);
  const [summary, setSummary] = useState(null);
  const [data, setData] = useState({ rows: [], total: 0 });
  const [classes, setClasses] = useState([]);
  const [year, setYear] = useState('');
  const [filters, setFilters] = useState({ q: '', classId: '', registrationStatus: '' });
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [entry, setEntry] = useState(null); // null | {} (new) | { id }
  const [details, setDetails] = useState(null); // a student id whose full details are open
  useOpenNew(() => setEntry({}), canWrite);

  const load = useCallback(() => {
    const p = new URLSearchParams({ page, pageSize: PAGE_SIZE });
    Object.entries(filters).forEach(([k, v]) => v && p.set(k, v));
    api(`/students?${p}`)
      .then(setData)
      .catch((e) => setError(e.message));
    api('/students/registration-summary')
      .then(setSummary)
      .catch(() => {});
  }, [page, filters]);
  useEffect(load, [load]);
  useEffect(() => {
    api('/classes')
      .then(setClasses)
      .catch(() => {});
    api('/academic-years')
      .then((ys) => setYear(ys.find((y) => y.isCurrent)?.name ?? ''))
      .catch(() => {});
  }, []);
  useEffect(() => {
    const t = setTimeout(() => {
      setFilters((f) => ({ ...f, q }));
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [q]);
  const setFilter = (k) => (e) => {
    setFilters((f) => ({ ...f, [k]: e.target.value }));
    setPage(1);
  };

  const remove = async (s) => {
    setError('');
    setNotice('');
    try {
      await api(`/students/${s.id}`, { method: 'DELETE' });
      setNotice('Registration deleted.');
      if (data.rows.length === 1 && page > 1) setPage(page - 1);
      else load();
    } catch (err) {
      setError(err.message);
    }
  };

  // Downloads every registration that matches the current search and filters.
  const exportCsv = async () => {
    setError('');
    try {
      const p = new URLSearchParams();
      Object.entries(filters).forEach(([k, v]) => v && p.set(k, v));
      const rows = await api(`/students?${p}`);
      const head = [
        'Registration ID',
        'Student name',
        'Grade',
        'Parent / guardian',
        'Contact',
        'Registration date',
        'Status',
      ];
      const lines = rows.map((s) =>
        [
          s.registrationId,
          `${s.firstName} ${s.lastName}`,
          s.className,
          s.guardianName || s.fatherName || s.motherName,
          s.guardianPhone || s.fatherPhone || s.motherPhone,
          s.registrationDate,
          label[s.registrationStatus] ?? s.registrationStatus,
        ]
          .map(csvCell)
          .join(','),
      );
      const url = URL.createObjectURL(
        new Blob([[head.map(csvCell).join(','), ...lines].join('\r\n')], { type: 'text/csv' }),
      );
      const a = document.createElement('a');
      a.href = url;
      a.download = 'registrations.csv';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <>
      <div className="profile-head">
        <div>
          <h1>Registrations</h1>
          <p className="hint">
            Manage student registrations{year ? ` for the ${year.replace('-', '–')} academic year` : ''}.
          </p>
        </div>
        {canWrite && (
          <button
            type="button"
            className="big-action"
            onClick={() => {
              setError('');
              setNotice('');
              setEntry({});
            }}
          >
            + Add Registration
          </button>
        )}
      </div>
      {notice && <p className="success">{notice}</p>}
      {error && !entry && (
        <p className="error" role="alert">
          {error}
        </p>
      )}

      <div className="stats enquiry-tiles">
        <Tile icon="♙" tone="blue" text="Total registrations" value={summary?.total ?? '…'} />
        <Tile icon="✓" tone="green" text="Completed" value={summary?.complete ?? '…'} />
        <Tile icon="◷" tone="amber" text="Pending review" value={summary?.pending ?? '…'} />
      </div>

      <section className="card enquiry-card">
        <header className="card-head" style={{ padding: '22px 22px 18px', marginBottom: 0 }}>
          <span>
            <h2>Registration data</h2>
            <small>Student enrollment records and current registration status</small>
          </span>
          <Gate action="export">
            <button type="button" className="ghost" style={{ marginLeft: 'auto' }} onClick={exportCsv}>
              ↓ Export
            </button>
          </Gate>
        </header>
        <div className="toolbar" style={{ borderTop: '1px solid var(--border)' }}>
          <label className="search-field">
            <span aria-hidden="true">⌕</span>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search student, registration ID or parent…"
              aria-label="Search registrations"
            />
          </label>
          <select value={filters.classId} onChange={setFilter('classId')} aria-label="Grade">
            <option value="">All grades</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}-{c.section}
              </option>
            ))}
          </select>
          <select
            value={filters.registrationStatus}
            onChange={setFilter('registrationStatus')}
            aria-label="Status"
          >
            <option value="">All statuses</option>
            {STATUS.map(([k, l]) => (
              <option key={k} value={k}>
                {l}
              </option>
            ))}
          </select>
          <span className="showing">
            {data.total} {data.total === 1 ? 'registration' : 'registrations'}
          </span>
        </div>
        <div className="table-scroll">
          <table className="enquiry-table">
            <thead>
              <tr>
                <th>Registration ID</th>
                <th>Student name</th>
                <th>Grade</th>
                <th>Parent / guardian</th>
                <th>Contact</th>
                <th>Registration date</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {data.rows.map((s) => (
                <tr key={s.id}>
                  <td className="muted-cell">
                    <button
                      type="button"
                      className="id-link"
                      title="Open all details"
                      onClick={() => setDetails(s.id)}
                    >
                      {s.registrationId}
                    </button>
                  </td>
                  <td>
                    <span className="person">
                      <PersonThumb id={s.id} has={s.hasPhoto} name={`${s.firstName} ${s.lastName}`} />
                      {canSeeProfile ? (
                        <Link to={`/students/${s.id}/profile`} title="Open the profile">
                          <b>
                            {s.firstName} {s.lastName}
                          </b>
                        </Link>
                      ) : (
                        <b>
                          {s.firstName} {s.lastName}
                        </b>
                      )}
                    </span>
                  </td>
                  <td className="muted-cell" style={{ color: 'var(--text)', fontSize: 'inherit' }}>
                    {s.className ?? <span className="none">Not set</span>}
                  </td>
                  <td>{s.guardianName || s.fatherName || s.motherName}</td>
                  <td>{s.guardianPhone || s.fatherPhone || s.motherPhone}</td>
                  <td>{date(s.registrationDate)}</td>
                  <td>
                    <span className={`badge ${PILL[s.registrationStatus] ?? ''}`}>
                      ● {label[s.registrationStatus] ?? s.registrationStatus}
                    </span>
                  </td>
                  <td className="row-actions">
                    {canWrite && (
                      <Gate action="edit">
                        <button
                          type="button"
                          className="ghost"
                          onClick={() => {
                            setError('');
                            setNotice('');
                            setEntry({ id: s.id });
                          }}
                        >
                          Edit
                        </button>
                      </Gate>
                    )}
                    {canWrite && (
                      <Gate action="delete">
                        <button type="button" className="ghost danger" onClick={() => remove(s)}>
                          Delete
                        </button>
                      </Gate>
                    )}
                  </td>
                </tr>
              ))}
              {!data.rows.length && (
                <tr>
                  <td colSpan={8} className="empty-row">
                    {filters.q || filters.classId || filters.registrationStatus
                      ? 'No registrations match these filters.'
                      : 'No registrations yet. Add the first with “Add Registration”.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <Pagination page={page} pageSize={PAGE_SIZE} total={data.total} onChange={setPage} />
      </section>

      <Modal
        open={Boolean(entry)}
        title={entry?.id ? 'Edit registration' : 'New registration'}
        onClose={() => setEntry(null)}
      >
        {entry && (
          <StudentForm
            embedded
            id={entry.id}
            onCancel={() => setEntry(null)}
            onSaved={(r) => {
              setEntry(null);
              setNotice(r.notice);
              load();
            }}
          />
        )}
      </Modal>

      <Modal open={Boolean(details)} title="Registration details" onClose={() => setDetails(null)}>
        {details && (
          <StudentDetails
            id={details}
            canEdit={canWrite}
            canSeeProfile={canSeeProfile}
            onEdit={(id) => {
              setDetails(null);
              setError('');
              setNotice('');
              setEntry({ id });
            }}
          />
        )}
      </Modal>
    </>
  );
}
