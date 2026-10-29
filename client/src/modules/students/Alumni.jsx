import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../services/api.js';
import { useAuth } from '../../context/AuthContext.jsx';
import Pagination from '../../components/Pagination.jsx';
import PersonThumb from '../../components/PersonThumb.jsx';
import StudentDetails from '../academics/StudentDetails.jsx';
import { usePhotoSet } from '../../hooks/usePhotoSet.js';
import Modal from '../../components/Modal.jsx';

const PAGE_SIZE = 25;

function Tile({ icon, tone, label, value, hint }) {
  return (
    <div className="tile card">
      <span className={`tile-icon ${tone}`} aria-hidden="true">
        {icon}
      </span>
      <span className="tile-text">
        <span>{label}</span>
        <b>{value}</b>
        {hint && <small>{hint}</small>}
      </span>
    </div>
  );
}

/** Former students: graduated in the year-end promotion or issued a transfer certificate. */
export default function Alumni() {
  const canReactivate = useAuth().user?.role === 'admin';
  const canSeeProfile = ['admin', 'teacher'].includes(useAuth().user?.role);
  const [rows, setRows] = useState([]);
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [details, setDetails] = useState(null); // a student id whose full details are open
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const load = () =>
    api(`/alumni${q ? `?q=${encodeURIComponent(q)}` : ''}`)
      .then(setRows)
      .catch((e) => setError(e.message));
  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [q]); // eslint-disable-line react-hooks/exhaustive-deps

  const reactivate = async (a) => {
    setError('');
    setNotice('');
    try {
      await api(`/students/${a.id}`, { method: 'PUT', body: { status: 'active' } });
      setNotice(`${a.name} is active again.`);
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const pageRows = rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const photos = usePhotoSet(
    'student',
    pageRows.map((a) => a.id),
  );
  const year = String(new Date().getFullYear());
  const leftThisYear = rows.filter((r) => String(r.leavingDate ?? '').slice(0, 4) === year).length;
  const withReason = rows.filter((r) => r.leavingReason).length;
  const classes = new Set(rows.map((r) => r.lastClass).filter(Boolean)).size;

  return (
    <>
      <div className="profile-head">
        <div>
          <h1>Alumni</h1>
          <p className="hint">
            Former students: graduated in the year-end promotion, or issued a transfer certificate. They stay
            on record with their last class.
          </p>
        </div>
      </div>
      {notice && <p className="success">{notice}</p>}
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}

      <div className="stats enquiry-tiles four">
        <Tile
          icon="♙"
          tone="blue"
          label="Former students"
          value={rows.length}
          hint={q ? 'matching the search' : null}
        />
        <Tile icon="◷" tone="amber" label="Left this year" value={leftThisYear} />
        <Tile icon="▣" tone="violet" label="With a recorded reason" value={withReason} />
        <Tile icon="▤" tone="green" label="Last classes" value={classes} />
      </div>

      <section className="card enquiry-card">
        <div className="toolbar">
          <label className="search-field">
            <span aria-hidden="true">⌕</span>
            <input
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setPage(1);
              }}
              placeholder="Search name or admission no…"
              aria-label="Search alumni"
            />
          </label>
          <span className="showing">{rows.length} former students</span>
        </div>
        <div className="table-scroll">
          <table className="enquiry-table">
            <thead>
              <tr>
                <th>Adm. no</th>
                <th>Name</th>
                <th>Last class</th>
                <th>Guardian</th>
                <th>Left on</th>
                <th>Reason</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {pageRows.map((a) => (
                <tr key={a.id}>
                  <td>{a.admissionNo}</td>
                  <td>
                    <span className="person">
                      <PersonThumb id={a.id} has={photos.has(a.id)} name={a.name} />
                      <b>{a.name}</b>
                    </span>
                  </td>
                  <td>{a.lastClass}</td>
                  <td>
                    {a.guardianName}
                    {a.guardianPhone && <small className="block">{a.guardianPhone}</small>}
                  </td>
                  <td>{a.leavingDate ?? '—'}</td>
                  <td>{a.leavingReason ?? 'Graduated / left'}</td>
                  <td className="row-actions">
                    <button
                      type="button"
                      className="ghost more-btn"
                      aria-label={`All details of ${a.name}`}
                      title="All details"
                      onClick={() => setDetails(a.id)}
                    >
                      ⋯
                    </button>
                    <Link className="btn" to={`/students/${a.id}/profile`}>
                      Profile
                    </Link>
                    {canReactivate && (
                      <button type="button" className="ghost" data-sure onClick={() => reactivate(a)}>
                        Reactivate
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {!pageRows.length && (
                <tr>
                  <td colSpan={7} className="empty-row">
                    {q ? 'No former students match.' : 'No former students.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <Pagination page={page} pageSize={PAGE_SIZE} total={rows.length} onChange={setPage} />
      </section>

      <Modal open={Boolean(details)} title="Student details" onClose={() => setDetails(null)}>
        {details && <StudentDetails id={details} canEdit={false} canSeeProfile={canSeeProfile} />}
      </Modal>
    </>
  );
}
