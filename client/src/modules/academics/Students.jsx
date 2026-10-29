import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../services/api.js';
import Pagination from '../../components/Pagination.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import Modal from '../../components/Modal.jsx';
import { useOpenNew } from '../../hooks/useOpenNew.js';
import PersonThumb from '../../components/PersonThumb.jsx';
import StudentForm from './StudentForm.jsx';
import StudentDetails from './StudentDetails.jsx';
import IdCardsPopup from '../../components/IdCardsPopup.jsx';

const PAGE_SIZE = 10;
const date = (d) =>
  d ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '';
const csvCell = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
const unique = (list) =>
  [...new Set(list)].sort((a, b) => String(a).localeCompare(String(b), undefined, { numeric: true }));

function Tile({ icon, tone, label, value, note, onClick }) {
  const body = (
    <>
      <span className={`tile-icon ${tone}`} aria-hidden="true">
        {icon}
      </span>
      <span className="tile-text">
        <span>{label}</span>
        <b>
          {value}
          {note && <span className="trend up">{note}</span>}
        </b>
      </span>
    </>
  );
  return onClick ? (
    <button type="button" className="tile card tile-button" onClick={onClick}>
      {body}
    </button>
  ) : (
    <div className="tile card">{body}</div>
  );
}

/** The student directory: tiles, All / Active / Inactive tabs, search and class filters, and a paged table. */
export default function Students() {
  const role = useAuth().user?.role;
  const canWrite = role === 'admin';
  const canSeeProfile = ['admin', 'teacher'].includes(role);
  const [summary, setSummary] = useState(null);
  const [data, setData] = useState({ rows: [], total: 0 });
  const [classes, setClasses] = useState([]);
  const [tab, setTab] = useState('all');
  const [filters, setFilters] = useState({ q: '', grade: '', section: '', status: '' });
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [error, setError] = useState('');
  const [entry, setEntry] = useState(null); // null = closed, {} = new student, { id } = edit
  const [saved, setSaved] = useState(null);
  const [notice, setNotice] = useState('');
  const [details, setDetails] = useState(null); // a student id whose full details are open
  const [cards, setCards] = useState(null); // null = closed | { studentId } one student | {} a class chosen in the popup
  useOpenNew(() => setEntry({}), canWrite);

  const load = useCallback(() => {
    const p = new URLSearchParams({ page, pageSize: PAGE_SIZE });
    Object.entries(filters).forEach(([k, v]) => v && p.set(k, v));
    if (tab !== 'all') p.set('status', tab); // the tab wins over the status dropdown
    api(`/students?${p}`)
      .then(setData)
      .catch((e) => setError(e.message));
    api('/students/summary')
      .then(setSummary)
      .catch(() => {});
  }, [page, filters, tab]);
  useEffect(load, [load]);
  useEffect(() => {
    api('/classes')
      .then(setClasses)
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
  const goTab = (t) => {
    setTab(t);
    setFilters((f) => ({ ...f, status: '' }));
    setPage(1);
  };
  const pickStatus = (e) => {
    const v = e.target.value;
    setTab(v || 'all');
    setFilters((f) => ({ ...f, status: '' }));
    setPage(1);
  };

  const remove = async (s) => {
    setError('');
    setNotice('');
    try {
      await api(`/students/${s.id}`, { method: 'DELETE' });
      setNotice('Student deleted.');
      if (data.rows.length === 1 && page > 1) setPage(page - 1);
      else load();
    } catch (err) {
      setError(err.message);
    }
  };

  // Downloads every student that matches the current tab, search and filters.
  const exportCsv = async () => {
    setError('');
    try {
      const p = new URLSearchParams();
      Object.entries(filters).forEach(([k, v]) => v && p.set(k, v));
      if (tab !== 'all') p.set('status', tab);
      const rows = await api(`/students?${p}`);
      const head = [
        'Student ID',
        'Admission no',
        'Student',
        'Class / section',
        'Guardian',
        'Contact',
        'Enrollment date',
        'Status',
      ];
      const lines = rows.map((s) =>
        [
          s.studentId,
          s.admissionNo,
          `${s.firstName} ${s.lastName}`,
          s.className,
          s.guardianName || s.fatherName || s.motherName,
          s.guardianPhone || s.fatherPhone || s.motherPhone,
          s.registrationDate,
          s.status,
        ]
          .map(csvCell)
          .join(','),
      );
      const url = URL.createObjectURL(
        new Blob([[head.map(csvCell).join(','), ...lines].join('\r\n')], { type: 'text/csv' }),
      );
      const a = document.createElement('a');
      a.href = url;
      a.download = 'students.csv';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err.message);
    }
  };

  const grades = unique(classes.map((c) => c.name));
  const sections = unique(classes.map((c) => c.section));
  const from = data.total ? (page - 1) * PAGE_SIZE + 1 : 0;
  const tabs = [
    ['all', 'All students', summary?.total],
    ['active', 'Active', summary?.active],
    ['inactive', 'Inactive', summary?.inactive],
  ];
  return (
    <>
      <div className="profile-head">
        <div>
          <h1>Enrolled students</h1>
          <p className="hint">Manage student profiles, enrollment, and class placement.</p>
        </div>
        <div className="head-actions">
          {canWrite && (
            <button type="button" className="ghost" onClick={() => setCards({})}>
              ▤ ID cards
            </button>
          )}
          <button type="button" className="ghost" onClick={exportCsv}>
            ↓ Export
          </button>
          {canWrite && (
            <button
              type="button"
              className="big-action"
              onClick={() => {
                setSaved(null);
                setNotice('');
                setEntry({});
              }}
            >
              + Add student
            </button>
          )}
        </div>
      </div>
      {saved && (
        <p className="success">
          {saved.notice}{' '}
          {canSeeProfile && (
            <>
              <Link to={`/students/${saved.id}/profile`}>Open the profile</Link> to add documents and the
              health record.
            </>
          )}
        </p>
      )}
      {notice && <p className="success">{notice}</p>}
      {error && !entry && (
        <p className="error" role="alert">
          {error}
        </p>
      )}

      <div className="stats enquiry-tiles">
        <Tile
          icon="♙"
          tone="blue"
          label="Total students"
          value={summary?.total?.toLocaleString() ?? '…'}
          note={summary?.addedThisMonth ? `↗ ${summary.addedThisMonth} this month` : null}
          onClick={() => goTab('all')}
        />
        <Tile
          icon="✓"
          tone="green"
          label="Active students"
          value={summary?.active?.toLocaleString() ?? '…'}
          onClick={() => goTab('active')}
        />
        <Tile icon="◷" tone="amber" label="Pending enrollment" value={summary?.pendingEnrollment ?? '…'} />
        <Tile icon="▤" tone="violet" label="Classes & sections" value={summary?.classes ?? '…'} />
      </div>

      <section className="card enquiry-card">
        <div className="tabs-line" role="tablist">
          {tabs.map(([k, l, n]) => (
            <button
              key={k}
              type="button"
              role="tab"
              aria-selected={tab === k}
              className={tab === k ? 'on' : ''}
              onClick={() => goTab(k)}
            >
              {l}
              {n !== undefined ? <span className="count">{n.toLocaleString()}</span> : null}
            </button>
          ))}
        </div>
        <div className="toolbar">
          <label className="search-field">
            <span aria-hidden="true">⌕</span>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search student, ID or parent…"
              aria-label="Search students"
            />
          </label>
          <select value={filters.grade} onChange={setFilter('grade')} aria-label="Grade">
            <option value="">All grades</option>
            {grades.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
          <select value={filters.section} onChange={setFilter('section')} aria-label="Section">
            <option value="">All sections</option>
            {sections.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <select value={tab === 'all' ? '' : tab} onChange={pickStatus} aria-label="Status">
            <option value="">All statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
          <span className="showing">
            Showing{' '}
            <b>
              {from}–{Math.min(page * PAGE_SIZE, data.total)}
            </b>{' '}
            of <b>{data.total}</b>
          </span>
        </div>
        <div className="table-scroll">
          <table className="enquiry-table">
            <thead>
              <tr>
                <th>Student</th>
                <th>Student ID</th>
                <th>Class / section</th>
                <th>Guardian</th>
                <th>Contact</th>
                <th>Enrollment date</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {data.rows.map((s) => (
                <tr key={s.id}>
                  <td>
                    <span className="person">
                      <PersonThumb id={s.id} has={s.hasPhoto} name={`${s.firstName} ${s.lastName}`} />
                      <span>
                        <b>
                          {s.firstName} {s.lastName}
                        </b>
                        {canSeeProfile ? (
                          <Link className="block" to={`/students/${s.id}/profile`}>
                            Student profile
                          </Link>
                        ) : (
                          <small className="block">{s.admissionNo}</small>
                        )}
                      </span>
                    </span>
                  </td>
                  <td className="muted-cell">{s.studentId}</td>
                  <td>
                    {s.className ? (
                      s.className.replace(/-([^-]+)$/, ' · $1')
                    ) : (
                      <span className="none">Not placed</span>
                    )}
                  </td>
                  <td>{s.guardianName || s.fatherName || s.motherName}</td>
                  <td>{s.guardianPhone || s.fatherPhone || s.motherPhone}</td>
                  <td>{date(s.registrationDate)}</td>
                  <td>
                    <span className={`badge ${s.status === 'active' ? 'paid' : 'rejected'}`}>
                      ● {s.status === 'active' ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="row-actions">
                    {canWrite && (
                      <button
                        type="button"
                        className="ghost"
                        onClick={() => {
                          setSaved(null);
                          setNotice('');
                          setEntry({ id: s.id });
                        }}
                      >
                        Edit
                      </button>
                    )}
                    {canWrite && (
                      <button type="button" className="ghost danger" onClick={() => remove(s)}>
                        Delete
                      </button>
                    )}
                    <button
                      type="button"
                      className="ghost more-btn"
                      aria-label={`All details of ${s.firstName} ${s.lastName}`}
                      title="All details"
                      onClick={() => setDetails(s.id)}
                    >
                      ⋯
                    </button>
                  </td>
                </tr>
              ))}
              {!data.rows.length && (
                <tr>
                  <td colSpan={8} className="empty-row">
                    {filters.q || filters.grade || filters.section || tab !== 'all'
                      ? 'No students match these filters.'
                      : 'No students yet. Add the first with “Add student”.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <Pagination page={page} pageSize={PAGE_SIZE} total={data.total} onChange={setPage} />
      </section>

      <Modal open={Boolean(details)} title="Student details" onClose={() => setDetails(null)}>
        {details && (
          <StudentDetails
            id={details}
            canEdit={canWrite}
            canSeeProfile={canSeeProfile}
            onEdit={(id) => {
              setDetails(null);
              setSaved(null);
              setNotice('');
              setEntry({ id });
            }}
          />
        )}
      </Modal>

      <Modal
        open={Boolean(cards)}
        title={cards?.studentId ? `ID card: ${cards.name}` : 'Student ID cards'}
        onClose={() => setCards(null)}
      >
        {cards && <IdCardsPopup studentId={cards.studentId} classes={classes} />}
      </Modal>

      <Modal
        open={Boolean(entry)}
        title={entry?.id ? 'Edit student' : 'New student registration'}
        onClose={() => setEntry(null)}
      >
        {entry && (
          <StudentForm
            embedded
            id={entry.id}
            onCancel={() => setEntry(null)}
            onSaved={(r) => {
              setEntry(null);
              setSaved(r);
              load();
            }}
          />
        )}
      </Modal>
    </>
  );
}
