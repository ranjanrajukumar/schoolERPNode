import { useCallback, useEffect, useState } from 'react';
import { api } from '../../services/api.js';
import Modal from '../../components/Modal.jsx';
import Pagination from '../../components/Pagination.jsx';
import TypeaheadSelect from '../../components/TypeaheadSelect.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useOpenNew } from '../../hooks/useOpenNew.js';

const PAGE_SIZE = 10;
const EMPTY = { studentId: '', roomId: '', startDate: '', bedNo: '', mealPlan: '', localGuardianName: '', localGuardianPhone: '', localGuardianRelation: '', securityDeposit: '', consentReceived: false, remarks: '' };
const MEALS = [['veg', 'Vegetarian'], ['non_veg', 'Non-vegetarian'], ['jain', 'Jain'], ['other', 'Other']];
const date = (d) => (d ? new Date(`${String(d).slice(0, 10)}T00:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—');
const csvCell = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;

function Tile({ icon, tone, label, value, hint }) {
  return (
    <div className="tile card">
      <span className={`tile-icon ${tone}`} aria-hidden="true">{icon}</span>
      <span className="tile-text"><span>{label}</span><b>{value}</b>{hint && <small>{hint}</small>}</span>
    </div>
  );
}

/** Who sleeps where: boarders, rooms and beds, allocation and moves in a popup. */
export default function RoomAllocation() {
  const canWrite = useAuth().user?.role === 'admin';
  const [rows, setRows] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [hostels, setHostels] = useState([]);
  const [summary, setSummary] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [entry, setEntry] = useState(false);
  const [hostel, setHostel] = useState('');
  const [consent, setConsent] = useState('');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  useOpenNew(() => openNew(), canWrite); // eslint-disable-line no-use-before-define

  const loadRooms = () => { api('/hostel/rooms').then(setRooms).catch(() => {}); api('/hostel/summary').then(setSummary).catch(() => {}); };
  const load = useCallback(() => { api(`/hostel/allocations${hostel ? `?hostelId=${hostel}` : ''}`).then(setRows).catch((e) => setError(e.message)); }, [hostel]);
  useEffect(() => { loadRooms(); api('/hostel/hostels').then(setHostels).catch(() => {}); }, []);
  useEffect(() => { setPage(1); load(); }, [load]);

  const openNew = () => { setError(''); setNotice(''); setForm(EMPTY); setEntry(true); };
  const openEdit = (a) => { setError(''); setNotice(''); setForm({ ...Object.fromEntries(Object.keys(EMPTY).map((k) => [k, a[k] ?? EMPTY[k]])), studentId: a.studentId, roomId: a.roomId }); setEntry(true); };
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const moving = rows.some((a) => String(a.studentId) === String(form.studentId));

  const save = async (e) => {
    e.preventDefault();
    setBusy(true); setError('');
    try { await api('/hostel/allocations', { method: 'POST', body: form }); setNotice(moving ? 'Room updated.' : 'Student allocated.'); setEntry(false); load(); loadRooms(); } catch (err) { setError(err.message); } finally { setBusy(false); }
  };
  const remove = async (a) => {
    setError(''); setNotice('');
    try { await api(`/hostel/allocations/${a.studentId}`, { method: 'DELETE' }); setNotice('Student removed from the hostel.'); load(); loadRooms(); } catch (err) { setError(err.message); }
  };

  const needle = q.trim().toLowerCase();
  const shown = rows.filter((a) => (!consent || (consent === 'yes') === Boolean(a.consentReceived)) && (!needle || `${a.studentName} ${a.admissionNo} ${a.roomNo} ${a.hostelName}`.toLowerCase().includes(needle)));
  const pageRows = shown.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const from = shown.length ? (page - 1) * PAGE_SIZE + 1 : 0;
  const capacity = summary?.hostels.reduce((n, h) => n + h.capacity, 0) ?? 0;
  const occupied = summary?.hostels.reduce((n, h) => n + h.occupied, 0) ?? 0;

  const exportCsv = () => {
    const head = ['Student', 'Admission no', 'Hostel', 'Room', 'Bed', 'Meal', 'Local guardian', 'Phone', 'Deposit', 'Consent', 'Monthly fee', 'Since'];
    const lines = shown.map((a) => [a.studentName, a.admissionNo, a.hostelName, a.roomNo, a.bedNo, MEALS.find(([v]) => v === a.mealPlan)?.[1], a.localGuardianName, a.localGuardianPhone, a.securityDeposit, a.consentReceived ? 'received' : 'pending', a.monthlyFee, a.startDate].map(csvCell).join(','));
    const url = URL.createObjectURL(new Blob([[head.map(csvCell).join(','), ...lines].join('\r\n')], { type: 'text/csv' }));
    const l = document.createElement('a'); l.href = url; l.download = 'hostel-allocation.csv'; document.body.appendChild(l); l.click(); l.remove(); URL.revokeObjectURL(url);
  };

  return (
    <>
      <div className="profile-head">
        <div>
          <h1>Room allocation</h1>
          <p className="hint">A room holds no more students than its beds, and boys&apos; and girls&apos; hostels only take matching students. Choosing a student who already has a bed moves them.</p>
        </div>
        <div className="head-actions">
          <button type="button" className="ghost" onClick={exportCsv}>↓ Export</button>
          {canWrite && <button type="button" className="big-action" onClick={openNew}>＋ Allocate a bed</button>}
        </div>
      </div>
      {notice && <p className="success">{notice}</p>}
      {error && !entry && <p className="error" role="alert">{error}</p>}

      <div className="stats enquiry-tiles four">
        <Tile icon="♙" tone="blue" label="Boarders" value={summary?.boarders ?? '…'} />
        <Tile icon="▤" tone="green" label="Beds taken" value={summary ? `${occupied} / ${capacity}` : '…'} hint={summary ? `${summary.emptyRooms} empty room${summary.emptyRooms === 1 ? '' : 's'}` : null} />
        <Tile icon="!" tone="amber" label="Full rooms" value={summary?.fullRooms ?? '…'} />
        <Tile icon="▣" tone="violet" label="Monthly hostel income" value={summary?.monthlyIncome ?? '…'} />
      </div>

      <section className="card enquiry-card">
        <div className="toolbar">
          <label className="search-field"><span aria-hidden="true">⌕</span><input value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} placeholder="Search student, room or hostel…" aria-label="Search" /></label>
          <select value={hostel} onChange={(e) => setHostel(e.target.value)} aria-label="Hostel"><option value="">All hostels</option>{hostels.map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}</select>
          <select value={consent} onChange={(e) => { setConsent(e.target.value); setPage(1); }} aria-label="Consent"><option value="">Any consent</option><option value="yes">Consent received</option><option value="no">Consent pending</option></select>
          <span className="showing">Showing <b>{from}–{Math.min(page * PAGE_SIZE, shown.length)}</b> of <b>{shown.length}</b></span>
        </div>
        <div className="table-scroll">
          <table className="enquiry-table">
            <thead><tr><th>Student</th><th>Hostel / room</th><th>Bed</th><th>Meal</th><th>Local guardian</th><th>Deposit</th><th>Consent</th><th>Monthly fee</th><th>Since</th>{canWrite && <th />}</tr></thead>
            <tbody>
              {pageRows.map((a) => (
                <tr key={a.studentId}>
                  <td><b>{a.studentName}</b><small className="block">{a.admissionNo}</small></td>
                  <td>{a.hostelName}<small className="block">Room {a.roomNo}</small></td>
                  <td>{a.bedNo || '—'}</td><td>{MEALS.find(([v]) => v === a.mealPlan)?.[1] ?? '—'}</td>
                  <td>{a.localGuardianName || '—'}{a.localGuardianPhone && <small className="block">{a.localGuardianRelation && `${a.localGuardianRelation} · `}{a.localGuardianPhone}</small>}</td>
                  <td>{a.securityDeposit ?? '—'}</td>
                  <td><span className={`badge ${a.consentReceived ? 'paid' : 'partial'}`}>● {a.consentReceived ? 'Received' : 'Pending'}</span></td>
                  <td>{a.monthlyFee}</td><td>{date(a.startDate)}</td>
                  {canWrite && <td className="row-actions"><button type="button" className="ghost" onClick={() => openEdit(a)}>Edit</button><button type="button" className="ghost danger" onClick={() => remove(a)}>Remove</button></td>}
                </tr>
              ))}
              {!pageRows.length && <tr><td colSpan={canWrite ? 10 : 9} className="empty-row">{needle || hostel || consent ? 'No boarders match.' : 'No students in the hostel yet.'}</td></tr>}
            </tbody>
          </table>
        </div>
        <Pagination page={page} pageSize={PAGE_SIZE} total={shown.length} onChange={setPage} />
      </section>

      <Modal open={entry} title={moving ? 'Update or move a boarder' : 'Allocate a bed'} onClose={() => setEntry(false)}>
        <form onSubmit={save} className="enquiry-form">
          {error && <p className="error" role="alert">{error}</p>}
          <div className="enq-grid">
            <label><span>Student *</span><TypeaheadSelect kind="students" value={form.studentId} onChange={(id) => setForm({ ...form, studentId: id })} filters={{ status: 'active' }} required /></label>
            <label><span>Room *</span>
              <select value={form.roomId} onChange={set('roomId')} required><option value="">Choose a room</option>{rooms.map((r) => <option key={r.id} value={r.id}>{r.hostelName} · {r.roomNo} ({r.occupied}/{r.capacity})</option>)}</select>
            </label>
            <label><span>From</span><input type="date" value={form.startDate} onChange={set('startDate')} /></label>
            <label><span>Bed no</span><input value={form.bedNo} onChange={set('bedNo')} maxLength={20} /></label>
            <label><span>Meal plan</span><select value={form.mealPlan} onChange={set('mealPlan')}><option value="">--</option>{MEALS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></label>
            <label><span>Security deposit</span><input type="number" min="0" step="0.01" value={form.securityDeposit} onChange={set('securityDeposit')} /></label>
            <label><span>Local guardian</span><input value={form.localGuardianName} onChange={set('localGuardianName')} maxLength={100} /></label>
            <label><span>Local guardian phone</span><input type="tel" value={form.localGuardianPhone} onChange={set('localGuardianPhone')} maxLength={20} /></label>
            <label><span>Relation</span><input value={form.localGuardianRelation} onChange={set('localGuardianRelation')} maxLength={40} /></label>
            <label><span>Remarks</span><input value={form.remarks} onChange={set('remarks')} maxLength={255} /></label>
            <label className="wide check-row"><span className="check-list"><label><input type="checkbox" checked={form.consentReceived} onChange={(e) => setForm({ ...form, consentReceived: e.target.checked })} /> Parent consent form received</label></span></label>
          </div>
          <div className="form-actions"><button type="submit" disabled={busy}>{busy ? 'Saving…' : moving ? 'Update / move' : 'Allocate'}</button><button type="button" className="ghost" onClick={() => setEntry(false)}>Cancel</button></div>
        </form>
      </Modal>
    </>
  );
}
