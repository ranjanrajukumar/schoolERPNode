import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Gate from '../../components/Gate.jsx';
import { useSearchParams } from 'react-router-dom';
import { api } from '../../services/api.js';
import { useAuth } from '../../context/AuthContext.jsx';
import Modal from '../../components/Modal.jsx';
import Pagination from '../../components/Pagination.jsx';
import { localDate } from '../../utils/dates.js';

const PAGE_SIZE = 25;
const today = () => localDate();
const STATUSES = [
  ['present', 'Present'],
  ['absent', 'Absent'],
  ['late', 'Late'],
];
const TABS = [
  ['all', 'All students'],
  ['present', 'Present'],
  ['absent', 'Absent'],
  ['late', 'Late'],
];
const csvCell = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
const initials = (r) => `${r.firstName?.[0] ?? ''}${r.lastName?.[0] ?? ''}`.toUpperCase();
const niceDate = (d) =>
  new Date(`${d}T00:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
const studentId = (r) => `STU-${niceDate(today()).slice(-4)}-${String(r.studentId).padStart(4, '0')}`;

function Tile({ icon, tone, label, value, note }) {
  return (
    <div className="tile card">
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
    </div>
  );
}

/** Taking attendance: the day's roster for one class or all of them, marked with a status, an arrival time and a note. */
export default function Attendance() {
  const [date, setDate] = useState(today());
  const [params] = useSearchParams();
  const own = useAuth().user?.classes ?? [];
  const [classId, setClassId] = useState(params.get('classId') ?? '');
  // A class teacher starts on their own class; everyone else (or a ?classId= link) starts where they asked.
  const defaulted = useRef(Boolean(params.get('classId')));
  useEffect(() => {
    if (!defaulted.current && own.length) {
      defaulted.current = true;
      setClassId(String(own[0].id));
    }
  }, [own]);
  const [section, setSection] = useState('');
  const [classes, setClasses] = useState([]);
  const [rows, setRows] = useState([]);
  const [picked, setPicked] = useState(new Set()); // student ids ticked for saving
  const [tab, setTab] = useState('all');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(
    () =>
      api(`/attendance?date=${date}${classId ? `&classId=${classId}` : ''}`)
        .then((r) => {
          setRows(r);
          setPicked(new Set(r.map((x) => x.studentId)));
        })
        .catch((e) => setError(e.message)),
    [date, classId],
  );
  useEffect(() => {
    api('/classes')
      .then(setClasses)
      .catch(() => {});
  }, []);
  useEffect(() => {
    setMsg('');
    setError('');
    setPage(1);
    load();
  }, [load]);

  const patch = (id, change) =>
    setRows((rs) => rs.map((r) => (r.studentId === id ? { ...r, ...change } : r)));
  const setStatus = (id, status) =>
    patch(id, { status: status || null, ...(status === 'absent' ? { arrivalTime: null } : {}) });
  const markRest = () => setRows((rs) => rs.map((r) => (r.status ? r : { ...r, status: 'present' })));

  const sections = useMemo(() => [...new Set(classes.map((c) => c.section))].sort(), [classes]);
  const inScope = rows.filter((r) => !section || r.section === section);
  const count = (s) => inScope.filter((r) => r.status === s).length;
  const needle = q.trim().toLowerCase();
  const shown = inScope.filter(
    (r) =>
      (tab === 'all' || r.status === tab) &&
      (!needle ||
        `${r.firstName} ${r.lastName} ${r.admissionNo} ${studentId(r)}`.toLowerCase().includes(needle)),
  );
  const pageRows = shown.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const marked = inScope.filter((r) => r.status).length;
  const classesMarked = new Set(inScope.filter((r) => r.status).map((r) => r.classId)).size;
  const classesTotal = new Set(inScope.map((r) => r.classId)).size;
  const lastSaved = rows
    .map((r) => r.savedAt)
    .filter(Boolean)
    .sort()
    .pop();
  const pct = inScope.length ? Math.round((count('present') / inScope.length) * 100) : null;
  const selected = inScope.filter((r) => r.status && picked.has(r.studentId));

  const send = (records, reason) => api('/attendance', { method: 'POST', body: { date, records, reason } });
  const save = async () => {
    setError('');
    setMsg('');
    setBusy(true);
    const records = selected.map(({ studentId: id, status, arrivalTime, note }) => ({
      studentId: id,
      status,
      arrivalTime: arrivalTime || undefined,
      note: note || undefined,
    }));
    try {
      let r;
      try {
        r = await send(records);
      } catch (err) {
        // Changing a mark on a past date must be explained; ask once and send again.
        if (!/reason is required/.test(err.message)) throw err;
        const reason = prompt(`${err.message}\n\nWhy are these marks being changed?`);
        if (!reason) return;
        r = await send(records, reason);
      }
      setConfirming(false);
      setMsg(
        `Attendance saved: ${r.saved} students${r.corrected ? ` (${r.corrected} correction${r.corrected > 1 ? 's' : ''} logged)` : ''}.`,
      );
      load();
    } catch (err) {
      setConfirming(false);
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const exportCsv = () => {
    const head = ['Name', 'Student ID', 'Class', 'Arrival', 'Status', 'Note'];
    const lines = shown.map((r) =>
      [
        `${r.firstName} ${r.lastName}`,
        studentId(r),
        r.className ? `${r.className} · ${r.section}` : '',
        r.arrivalTime,
        r.status,
        r.note,
      ]
        .map(csvCell)
        .join(','),
    );
    const url = URL.createObjectURL(
      new Blob([[head.map(csvCell).join(','), ...lines].join('\r\n')], { type: 'text/csv' }),
    );
    const a = document.createElement('a');
    a.href = url;
    a.download = `attendance-${date}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const allPicked = pageRows.length > 0 && pageRows.every((r) => picked.has(r.studentId));
  const toggleAll = () =>
    setPicked((p) => {
      const n = new Set(p);
      pageRows.forEach((r) => (allPicked ? n.delete(r.studentId) : n.add(r.studentId)));
      return n;
    });
  const toggle = (id) =>
    setPicked((p) => {
      const n = new Set(p);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  const goTab = (t) => {
    setTab(t);
    setPage(1);
  };
  const from = shown.length ? (page - 1) * PAGE_SIZE + 1 : 0;

  return (
    <>
      <div className="profile-head">
        <div>
          <h1>Attendance</h1>
          <p className="hint">Take attendance and monitor student presence by class.</p>
        </div>
        <div className="head-actions">
          <Gate action="export">
            <button type="button" className="ghost" onClick={exportCsv}>
              ↓ Export report
            </button>
          </Gate>
          <button
            type="button"
            className="big-action"
            disabled={!selected.length}
            onClick={() => setConfirming(true)}
          >
            Save attendance
          </button>
        </div>
      </div>
      {msg && <p className="success">{msg}</p>}
      {error && !confirming && (
        <p className="error" role="alert">
          {error}
        </p>
      )}

      <div className="stats enquiry-tiles four">
        <Tile
          icon="✓"
          tone="green"
          label={date === today() ? 'Present today' : 'Present'}
          value={count('present')}
          note={pct !== null && marked ? `${pct}%` : null}
        />
        <Tile
          icon="×"
          tone="red"
          label={date === today() ? 'Absent today' : 'Absent'}
          value={count('absent')}
        />
        <Tile icon="◷" tone="amber" label="Late arrivals" value={count('late')} />
        <Tile icon="♙" tone="blue" label="Class attendance" value={`${classesMarked} / ${classesTotal}`} />
      </div>

      <section className="card enquiry-card">
        <header className="card-head" style={{ padding: '22px 22px 18px', marginBottom: 0 }}>
          <span>
            <h2>Daily attendance</h2>
            <small>Mark each student&apos;s attendance for the selected class.</small>
          </span>
          <span className="head-filters">
            <input
              type="date"
              value={date}
              max={today()}
              onChange={(e) => setDate(e.target.value || today())}
              aria-label="Date"
            />
            <select
              value={classId}
              onChange={(e) => {
                setClassId(e.target.value);
                setSection('');
              }}
              aria-label="Class"
            >
              <option value="">All classes</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} · {c.section}
                </option>
              ))}
            </select>
            <select
              value={section}
              onChange={(e) => {
                setSection(e.target.value);
                setPage(1);
              }}
              aria-label="Section"
            >
              <option value="">All sections</option>
              {sections.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </span>
        </header>
        <div className="tabs-line" role="tablist" style={{ borderTop: '1px solid var(--border)' }}>
          {TABS.map(([k, l]) => (
            <button
              key={k}
              type="button"
              role="tab"
              aria-selected={tab === k}
              className={tab === k ? 'on' : ''}
              onClick={() => goTab(k)}
            >
              {l}
              <span className="count">{k === 'all' ? inScope.length : count(k)}</span>
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
              placeholder="Search student or ID…"
              aria-label="Search student"
            />
          </label>
          <button
            type="button"
            className="ghost"
            onClick={markRest}
            disabled={!inScope.some((r) => !r.status)}
          >
            Mark unmarked present
          </button>
          <span className="showing">
            {lastSaved
              ? `Last saved: ${new Date(lastSaved).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}`
              : 'Not saved yet for this day'}
          </span>
        </div>
        <div className="table-scroll">
          <table className="enquiry-table">
            <thead>
              <tr>
                <th>
                  <input
                    type="checkbox"
                    checked={allPicked}
                    onChange={toggleAll}
                    aria-label="Select all on this page"
                  />
                </th>
                <th>Student</th>
                <th>Student ID</th>
                <th>Class / section</th>
                <th>Arrival time</th>
                <th>Attendance status</th>
                <th>Note</th>
              </tr>
            </thead>
            <tbody>
              {pageRows.map((r) => (
                <tr key={r.studentId}>
                  <td>
                    <input
                      type="checkbox"
                      checked={picked.has(r.studentId)}
                      onChange={() => toggle(r.studentId)}
                      aria-label={`Select ${r.firstName} ${r.lastName}`}
                    />
                  </td>
                  <td>
                    <span className="person">
                      <span
                        className={`avatar-chip ${['blue', 'amber', 'green', 'violet'][r.studentId % 4]}`}
                        aria-hidden="true"
                      >
                        {initials(r)}
                      </span>
                      <span>
                        <b>
                          {r.firstName} {r.lastName}
                        </b>
                        {r.onApprovedLeave && (
                          <span className="badge partial" style={{ marginTop: 3 }}>
                            approved leave
                          </span>
                        )}
                      </span>
                    </span>
                  </td>
                  <td className="muted-cell">{studentId(r)}</td>
                  <td>
                    {r.className ? `${r.className} · ${r.section}` : <span className="none">Not placed</span>}
                  </td>
                  <td>
                    <input
                      type="time"
                      value={r.arrivalTime ?? ''}
                      disabled={r.status === 'absent' || !r.status}
                      onChange={(e) => patch(r.studentId, { arrivalTime: e.target.value })}
                      aria-label="Arrival time"
                    />
                  </td>
                  <td>
                    <select
                      className={`att-select ${r.status ?? ''}`}
                      value={r.status ?? ''}
                      onChange={(e) => setStatus(r.studentId, e.target.value)}
                      aria-label={`Status of ${r.firstName}`}
                    >
                      <option value="">Not marked</option>
                      {STATUSES.map(([k, l]) => (
                        <option key={k} value={k}>
                          {l}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <input
                      value={r.note ?? ''}
                      maxLength={120}
                      placeholder="Add note"
                      onChange={(e) => patch(r.studentId, { note: e.target.value })}
                      aria-label="Note"
                      style={{ minWidth: 140 }}
                    />
                  </td>
                </tr>
              ))}
              {!pageRows.length && (
                <tr>
                  <td colSpan={7} className="empty-row">
                    {needle || tab !== 'all' ? 'No students match these filters.' : 'No students.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="foot-note">
          Showing{' '}
          <b>
            {from}–{Math.min(page * PAGE_SIZE, shown.length)}
          </b>{' '}
          of <b>{shown.length}</b> students · Attendance for {niceDate(date)}
        </div>
        <Pagination page={page} pageSize={PAGE_SIZE} total={shown.length} onChange={setPage} />
      </section>

      <Modal open={confirming} title="Save attendance" wide={false} onClose={() => setConfirming(false)}>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <p className="hint">
          Attendance for <b>{niceDate(date)}</b> will be saved for the <b>{selected.length}</b> selected{' '}
          {selected.length === 1 ? 'student' : 'students'}. You can edit records later; a changed mark is
          logged as a correction.
        </p>
        <div className="form-actions">
          <button type="button" disabled={busy} onClick={save}>
            {busy ? 'Saving…' : 'Confirm & save'}
          </button>
          <button type="button" className="ghost" onClick={() => setConfirming(false)}>
            Cancel
          </button>
        </div>
      </Modal>
    </>
  );
}
