import { useCallback, useEffect, useState } from 'react';
import Gate from '../../components/Gate.jsx';
import { api } from '../../services/api.js';
import TypeaheadSelect from '../../components/TypeaheadSelect.jsx';
import Modal from '../../components/Modal.jsx';
import Pagination from '../../components/Pagination.jsx';
import PersonThumb from '../../components/PersonThumb.jsx';
import StudentDetails from '../academics/StudentDetails.jsx';
import { usePhotoSet } from '../../hooks/usePhotoSet.js';
import { useOpenNew } from '../../hooks/useOpenNew.js';

const PAGE_SIZE = 25;
const EMPTY = { studentId: '', email: '', password: '' };
const TABS = [
  ['all', 'All logins'],
  ['active', 'Can sign in'],
  ['blocked', 'Blocked (inactive)'],
];

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

/** Student logins: read-only access to their own homework, timetable, attendance, results, fees and notices. */
export default function StudentAccounts() {
  const [rows, setRows] = useState([]);
  const [form, setForm] = useState(EMPTY);
  const [entry, setEntry] = useState(false);
  const [tab, setTab] = useState('all');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const canSeeProfile = true; // this page is admin only
  const [details, setDetails] = useState(null); // a student id whose full details are open
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const load = useCallback(() => {
    api('/student-accounts')
      .then(setRows)
      .catch((e) => setError(e.message));
  }, []);
  useEffect(load, [load]);
  const openNew = () => {
    setError('');
    setForm(EMPTY);
    setEntry(true);
  };
  useOpenNew(openNew);

  const withLogin = new Set(rows.map((r) => r.studentId));

  const run = async (fn, message) => {
    setError('');
    setNotice('');
    try {
      await fn();
      if (message) setNotice(message);
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const create = async (e) => {
    e.preventDefault();
    setError('');
    setNotice('');
    setBusy(true);
    try {
      const r = await api('/student-accounts', { method: 'POST', body: form });
      setEntry(false);
      setForm(EMPTY);
      setNotice(
        `Student login created. The student signs in with the admission number ${r.username}${r.password ? ` and the default password ${r.password}` : ' and the password you set'}, and must change it at first sign-in.`,
      );
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const reset = (a) => {
    const password = prompt(
      `New password for ${a.studentName} (min 8 characters). Leave blank to use the school's default student password.`,
    );
    if (password !== null)
      run(
        () => api(`/student-accounts/${a.id}`, { method: 'PUT', body: { password } }),
        'Password reset. The student must change it at the next sign-in.',
      );
  };

  const remove = (a) => run(() => api(`/student-accounts/${a.id}`, { method: 'DELETE' }));

  const inTab = (r, k) =>
    k === 'all' || (k === 'active' ? r.studentStatus === 'active' : r.studentStatus !== 'active');
  const count = (k) => rows.filter((r) => inTab(r, k)).length;
  const needle = q.trim().toLowerCase();
  const shown = rows.filter(
    (r) =>
      inTab(r, tab) &&
      (!needle ||
        `${r.studentName} ${r.admissionNo} ${r.className ?? ''} ${r.email}`.toLowerCase().includes(needle)),
  );
  const pageRows = shown.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const photos = usePhotoSet(
    'student',
    pageRows.map((a) => a.studentId),
  );

  return (
    <>
      <div className="profile-head">
        <div>
          <h1>Student accounts</h1>
          <p className="hint">
            Give a student their own login. They see only their own homework, timetable, attendance, results,
            fees and notices, read-only. A login stops working when the student is made inactive and is
            deleted with the student.
          </p>
        </div>
        <div className="head-actions">
          <button type="button" className="big-action" onClick={openNew}>
            + Create login
          </button>
        </div>
      </div>
      {error && !entry && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {notice && <p className="success">{notice}</p>}

      <div className="stats enquiry-tiles four">
        <Tile icon="♙" tone="blue" label="Student logins" value={rows.length} />
        <Tile icon="✓" tone="green" label="Can sign in" value={count('active')} />
        <Tile icon="!" tone="amber" label="Blocked (inactive)" value={count('blocked')} />
        <Tile
          icon="▤"
          tone="violet"
          label="Classes covered"
          value={new Set(rows.map((r) => r.className).filter(Boolean)).size}
        />
      </div>

      <section className="card enquiry-card">
        <div className="tabs-line" role="tablist">
          {TABS.map(([k, l]) => (
            <button
              key={k}
              type="button"
              role="tab"
              aria-selected={tab === k}
              className={tab === k ? 'on' : ''}
              onClick={() => {
                setTab(k);
                setPage(1);
              }}
            >
              {l}
              <span className="count">{count(k)}</span>
            </button>
          ))}
        </div>
        <div className="toolbar">
          <label className="search-field">
            <span aria-hidden="true">⌕</span>
            <input
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setPage(1);
              }}
              placeholder="Search student, class or email…"
              aria-label="Search student accounts"
            />
          </label>
          <span className="showing">{shown.length} logins</span>
        </div>
        <div className="table-scroll">
          <table className="enquiry-table">
            <thead>
              <tr>
                <th>Student</th>
                <th>Class</th>
                <th>Username</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {pageRows.map((a) => (
                <tr key={a.id}>
                  <td>
                    <span className="person">
                      <PersonThumb id={a.studentId} has={photos.has(a.studentId)} name={a.studentName} />
                      <span>
                        <b>{a.studentName}</b>
                        <small className="block">{a.admissionNo}</small>
                      </span>
                    </span>
                  </td>
                  <td>{a.className ?? '—'}</td>
                  <td>
                    {a.admissionNo}
                    <small className="block">{a.email}</small>
                  </td>
                  <td>
                    <span className={`badge ${a.studentStatus === 'active' ? 'paid' : 'partial'}`}>
                      ● {a.studentStatus === 'active' ? 'can sign in' : 'blocked (inactive)'}
                    </span>
                  </td>
                  <td className="row-actions">
                    <button
                      type="button"
                      className="ghost more-btn"
                      aria-label={`All details of ${a.studentName}`}
                      title="All details"
                      onClick={() => setDetails(a.studentId)}
                    >
                      ⋯
                    </button>
                    <button type="button" className="ghost" onClick={() => reset(a)}>
                      Reset password
                    </button>
                    <Gate action="delete">
                      <button type="button" className="ghost" onClick={() => remove(a)}>
                        Delete
                      </button>
                    </Gate>
                  </td>
                </tr>
              ))}
              {!pageRows.length && (
                <tr>
                  <td colSpan={5} className="empty-row">
                    {needle || tab !== 'all' ? 'No student logins match.' : 'No student logins yet.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <Pagination page={page} pageSize={PAGE_SIZE} total={shown.length} onChange={setPage} />
      </section>

      <Modal open={entry} title="Create student login" wide={false} onClose={() => setEntry(false)}>
        <form onSubmit={create} className="enquiry-form">
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          <div className="enq-grid">
            <label className="wide">
              <span>Student *</span>
              <TypeaheadSelect
                kind="students"
                value={form.studentId}
                onChange={(id) => setForm({ ...form, studentId: id })}
                filters={{ status: 'active' }}
                exclude={[...withLogin]}
                required
              />
            </label>
            <label className="wide">
              <span>Email (optional: the student signs in with the admission number)</span>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </label>
            <label className="wide">
              <span>Password (blank = the school's default student password)</span>
              <input
                type="password"
                minLength={8}
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                autoComplete="new-password"
              />
            </label>
          </div>
          <div className="form-actions">
            <button type="submit" disabled={busy}>
              {busy ? 'Saving…' : 'Create login'}
            </button>
            <button type="button" className="ghost" onClick={() => setEntry(false)}>
              Cancel
            </button>
          </div>
        </form>
      </Modal>

      <Modal open={Boolean(details)} title="Student details" onClose={() => setDetails(null)}>
        {details && <StudentDetails id={details} canEdit={false} canSeeProfile={canSeeProfile} />}
      </Modal>
    </>
  );
}
