import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../../services/api.js';
import DeliveryNotice from '../../components/DeliveryNotice.jsx';
import Pagination from '../../components/Pagination.jsx';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { localDate } from '../../utils/dates.js';

const PAGE_SIZE = 25;
const METHODS = [
  ['call', 'Phone call'],
  ['sms', 'SMS'],
  ['whatsapp', 'WhatsApp'],
  ['in_person', 'In person'],
  ['portal', 'Portal message'],
];
const TABS = [
  ['all', 'All absent'],
  ['waiting', 'To contact'],
  ['informed', 'Informed'],
  ['leave', 'Approved leave'],
];
const today = () => localDate();
const kind = (r) => (r.notified.length ? 'informed' : r.onApprovedLeave ? 'leave' : 'waiting');

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

/** Students marked absent on a date, and whether their guardian has been told. */
export default function AbsenceAlerts() {
  const isAdmin = useAuth().user?.role === 'admin';
  const [auto, setAuto] = useState(null); // { enabled, time, sms }
  const [running, setRunning] = useState(false);
  const [date, setDate] = useState(today());
  const [classId, setClassId] = useState('');
  const [classes, setClasses] = useState([]);
  const [rows, setRows] = useState([]);
  const [method, setMethod] = useState({});
  const [tab, setTab] = useState('all');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const loadSeq = useRef(0);
  const load = useCallback(() => {
    const mine = (loadSeq.current += 1);
    api(`/absence-alerts?date=${date}${classId ? `&classId=${classId}` : ''}`)
      .then((r) => {
        if (mine === loadSeq.current) setRows(r);
      })
      .catch((e) => {
        if (mine === loadSeq.current) setError(e.message);
      });
  }, [date, classId]);
  useEffect(() => {
    api('/classes')
      .then(setClasses)
      .catch(() => {});
    api('/absence-alerts/auto')
      .then(setAuto)
      .catch(() => {});
  }, []);
  useEffect(load, [load]);

  const log = async (r) => {
    setError('');
    const note = prompt(`Note for ${r.guardianName ?? 'the guardian'} (optional)`);
    if (note === null) return; // Cancel: nothing is logged
    try {
      await api('/absence-alerts', {
        method: 'POST',
        body: { studentId: r.studentId, date, method: method[r.studentId] ?? 'call', note },
      });
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const sendSms = async (r) => {
    setError('');
    setNotice('');
    try {
      const m = await api('/absence-alerts/send', { method: 'POST', body: { studentId: r.studentId, date } });
      if (m.status === 'sent') setNotice(`SMS sent to ${r.guardianName ?? 'the guardian'}.`);
      else if (m.status === 'logged')
        setNotice('No SMS provider is configured: the message was recorded but NOT delivered.');
      else setError(`SMS failed: ${m.error}`);
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const sendNow = async () => {
    setError('');
    setNotice('');
    setRunning(true);
    try {
      const out = await api('/absence-alerts/auto/run', { method: 'POST' });
      setNotice(
        out.absent
          ? `Alerts sent now: ${out.notified} parent notification(s)${auto?.sms ? `, ${out.texted} SMS` : ''}. Students on leave or already contacted were skipped.`
          : 'Nobody is marked absent today.',
      );
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setRunning(false);
    }
  };

  const waiting = rows.filter((r) => !r.notified.length && !r.onApprovedLeave).length;
  const count = (k) =>
    k === 'all'
      ? rows.length
      : rows.filter((r) => (k === 'leave' ? r.onApprovedLeave : kind(r) === k)).length;
  const needle = q.trim().toLowerCase();
  const shown = rows.filter(
    (r) =>
      (tab === 'all' || (tab === 'leave' ? r.onApprovedLeave : kind(r) === tab)) &&
      (!needle ||
        `${r.name} ${r.admissionNo} ${r.className} ${r.guardianName ?? ''}`.toLowerCase().includes(needle)),
  );
  const pageRows = shown.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <>
      <div className="profile-head">
        <div>
          <h1>Parent absence alerts</h1>
          <p className="hint">
            Students marked absent, with the guardian's number. Contact the guardian, then log how you did it.
            "Send SMS" texts the guardian automatically and logs the contact once it is delivered.
          </p>
        </div>
        <div className="head-actions">
          <input
            type="date"
            value={date}
            onChange={(e) => {
              setDate(e.target.value || today());
              setPage(1);
            }}
            aria-label="Date"
            style={{ minHeight: 44 }}
          />
          <select
            value={classId}
            onChange={(e) => {
              setClassId(e.target.value);
              setPage(1);
            }}
            aria-label="Class"
            style={{ minHeight: 44 }}
          >
            <option value="">All classes</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}-{c.section}
              </option>
            ))}
          </select>
        </div>
      </div>
      {auto && (
        <section className="card auto-alert">
          <span className={`badge ${auto.enabled ? 'paid' : 'partial'}`}>
            ● Automatic alerts {auto.enabled ? 'on' : 'off'}
          </span>
          <span className="hint" style={{ margin: 0 }}>
            {auto.enabled
              ? `After ${auto.time} each school day, the parent and student logins get a push notification for every student marked absent${auto.sms ? ', and the guardian is texted' : ''}. Students on approved leave or already contacted are skipped.`
              : 'Turn this on under Settings → Notifications to tell parents about absences without anyone sending them by hand.'}
          </span>
          {isAdmin && (
            <button type="button" className="ghost" onClick={sendNow} disabled={running}>
              {running ? 'Sending…' : "Send today's alerts now"}
            </button>
          )}
          {isAdmin && (
            <Link className="ghost btn" to="/settings?group=Notifications">
              Settings
            </Link>
          )}
        </section>
      )}
      <DeliveryNotice channel="sms" />
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {notice && <p className="success">{notice}</p>}

      <div className="stats enquiry-tiles four">
        <Tile icon="♙" tone="blue" label="Absent" value={rows.length} />
        <Tile icon="!" tone="red" label="Still to contact" value={waiting} />
        <Tile
          icon="✓"
          tone="green"
          label="Guardian informed"
          value={rows.filter((r) => r.notified.length).length}
        />
        <Tile
          icon="◷"
          tone="amber"
          label="On approved leave"
          value={rows.filter((r) => r.onApprovedLeave).length}
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
              placeholder="Search student, class or guardian…"
              aria-label="Search absences"
            />
          </label>
          <span className="showing">{shown.length} students</span>
        </div>
        <div className="table-scroll">
          <table className="enquiry-table">
            <thead>
              <tr>
                <th>Student</th>
                <th>Class</th>
                <th>Guardian</th>
                <th>Informed</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {pageRows.map((r) => (
                <tr key={r.studentId}>
                  <td>
                    <b>{r.name}</b>
                    <small className="block">{r.admissionNo}</small>
                  </td>
                  <td>{r.className}</td>
                  <td>
                    {r.guardianName}
                    {r.guardianPhone ? (
                      <small className="block">
                        <a href={`tel:${r.guardianPhone}`}>{r.guardianPhone}</a>
                      </small>
                    ) : (
                      <small className="block">no number on file</small>
                    )}
                  </td>
                  <td>
                    {r.onApprovedLeave && <span className="badge partial">● approved leave</span>}
                    {r.notified.map((n, i) => (
                      <div key={i}>
                        <span className="badge paid">● {n.method}</span> {n.by}
                        {n.note && <small> — {n.note}</small>}
                      </div>
                    ))}
                    {!r.notified.length && !r.onApprovedLeave && (
                      <span className="badge rejected">● not yet</span>
                    )}
                  </td>
                  <td className="row-actions">
                    <select
                      value={method[r.studentId] ?? 'call'}
                      onChange={(e) => setMethod({ ...method, [r.studentId]: e.target.value })}
                      aria-label={`Contact method for ${r.name}`}
                    >
                      {METHODS.map(([v, l]) => (
                        <option key={v} value={v}>
                          {l}
                        </option>
                      ))}
                    </select>
                    <button type="button" onClick={() => log(r)}>
                      Log contact
                    </button>
                    {r.guardianPhone && !r.notified.some((n) => n.method === 'sms') && (
                      <button type="button" className="ghost" onClick={() => sendSms(r)}>
                        Send SMS
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {!pageRows.length && (
                <tr>
                  <td colSpan={5} className="empty-row">
                    {needle || tab !== 'all' ? 'No students match.' : 'Nobody is marked absent on this date.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <Pagination page={page} pageSize={PAGE_SIZE} total={shown.length} onChange={setPage} />
      </section>
    </>
  );
}
