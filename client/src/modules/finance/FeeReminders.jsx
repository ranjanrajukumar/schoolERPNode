import { useCallback, useEffect, useState } from 'react';
import { api } from '../../services/api.js';
import DeliveryNotice from '../../components/DeliveryNotice.jsx';
import Pagination from '../../components/Pagination.jsx';

const PAGE_SIZE = 25;

function Tile({ icon, tone, label, value, hint }) {
  return (
    <div className="tile card">
      <span className={`tile-icon ${tone}`} aria-hidden="true">{icon}</span>
      <span className="tile-text"><span>{label}</span><b>{value}</b>{hint && <small>{hint}</small>}</span>
    </div>
  );
}

/** Fee reminders: SMS the guardian of every student with overdue fees. */
export default function FeeReminders() {
  const [classes, setClasses] = useState([]);
  const [classId, setClassId] = useState('');
  const [rows, setRows] = useState(null);
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    setRows(null);
    api(`/messaging/fee-reminders${classId ? `?classId=${classId}` : ''}`).then(setRows).catch((e) => setError(e.message));
  }, [classId]);
  useEffect(() => { api('/classes').then(setClasses); }, []);
  useEffect(load, [load]);

  const all = rows ?? [];
  const ready = all.filter((r) => r.hasPhone && !r.remindedToday).length;
  const noPhone = all.filter((r) => !r.hasPhone).length;
  const reminded = all.filter((r) => r.hasPhone && r.remindedToday).length;
  const needle = q.trim().toLowerCase();
  const shown = all.filter((r) => !needle || `${r.name} ${r.className} ${r.guardianName} ${r.guardianPhone ?? ''}`.toLowerCase().includes(needle));
  const pageRows = shown.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const send = async () => {
    setError(''); setResult(null); setBusy(true);
    try {
      setResult(await api('/messaging/fee-reminders', { method: 'POST', body: { classId: classId || undefined } }));
      load();
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  };

  return (
    <>
      <div className="profile-head">
        <div>
          <h1>Fee reminders</h1>
          <p className="hint">Texts the guardian of every student with overdue fees. Anyone reminded in the last 24 hours, or with no valid phone number, is skipped.</p>
        </div>
        <div className="head-actions"><button type="button" className="big-action" data-sure onClick={send} disabled={busy || !ready}>{busy ? 'Sending…' : `Send ${ready} reminder(s)`}</button></div>
      </div>
      <DeliveryNotice channel="sms" />
      {error && <p className="error" role="alert">{error}</p>}
      {result && <p className={result.failed ? 'error' : 'success'}>{result.sent} delivered, {result.logged} recorded only (no provider), {result.failed} failed, {result.skipped} skipped.</p>}

      <div className="stats enquiry-tiles four">
        <Tile icon="₹" tone="red" label="Students with overdue fees" value={all.length} />
        <Tile icon="✉" tone="blue" label="Ready to remind" value={ready} />
        <Tile icon="✓" tone="green" label="Reminded today" value={reminded} />
        <Tile icon="!" tone="amber" label="No valid phone" value={noPhone} />
      </div>

      <section className="card enquiry-card">
        <div className="toolbar">
          <label className="search-field"><span aria-hidden="true">⌕</span><input value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} placeholder="Search student, class or guardian…" aria-label="Search reminders" /></label>
          <select value={classId} onChange={(e) => { setClassId(e.target.value); setPage(1); }} aria-label="Class"><option value="">All classes</option>{classes.map((c) => <option key={c.id} value={c.id}>{c.name}-{c.section}</option>)}</select>
          <span className="showing">{shown.length} students</span>
        </div>
        <div className="table-scroll">
          <table className="enquiry-table">
            <thead><tr><th>Student</th><th>Class</th><th>Guardian</th><th>Overdue</th><th>Status</th></tr></thead>
            <tbody>
              {pageRows.map((r) => (
                <tr key={r.studentId}>
                  <td><b>{r.name}</b></td><td>{r.className}</td>
                  <td>{r.guardianName}<small className="block">{r.guardianPhone || 'no phone on file'}</small></td>
                  <td>{r.overdue}<small className="block">{r.items}</small></td>
                  <td>{!r.hasPhone ? <span className="badge rejected">● no valid phone</span> : r.remindedToday ? <span className="badge paid">● reminded today</span> : <span className="badge partial">● ready</span>}</td>
                </tr>
              ))}
              {rows && !pageRows.length && <tr><td colSpan={5} className="empty-row">{needle ? 'No students match.' : 'No overdue fees.'}</td></tr>}
              {!rows && <tr><td colSpan={5} className="empty-row">Loading…</td></tr>}
            </tbody>
          </table>
        </div>
        <Pagination page={page} pageSize={PAGE_SIZE} total={shown.length} onChange={setPage} />
      </section>
    </>
  );
}
