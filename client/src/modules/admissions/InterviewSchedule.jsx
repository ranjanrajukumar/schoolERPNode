import { useCallback, useEffect, useState } from 'react';
import { api } from '../../services/api.js';
import Modal from '../../components/Modal.jsx';
import Pagination from '../../components/Pagination.jsx';
import PersonThumb from '../../components/PersonThumb.jsx';
import AdmissionDetails from './AdmissionDetails.jsx';
import { usePhotoSet } from '../../hooks/usePhotoSet.js';
import { useOpenNew } from '../../hooks/useOpenNew.js';
import { localDate } from '../../utils/dates.js';

const PAGE_SIZE = 25;
const EMPTY = { id: '', interviewDate: '', interviewTime: '', interviewPanel: '', interviewResult: 'pending' };
const RESULTS = { pending: 'Pending', recommended: 'Recommended', not_recommended: 'Not recommended' };
const BADGE = { pending: 'partial', recommended: 'paid', not_recommended: 'rejected' };
const TABS = [['all', 'All'], ['pending', 'Pending'], ['recommended', 'Recommended'], ['not_recommended', 'Not recommended']];

function Tile({ icon, tone, label, value, hint }) {
  return (
    <div className="tile card">
      <span className={`tile-icon ${tone}`} aria-hidden="true">{icon}</span>
      <span className="tile-text"><span>{label}</span><b>{value}</b>{hint && <small>{hint}</small>}</span>
    </div>
  );
}

/** Schedule applicant interviews and record the panel's recommendation. */
export default function InterviewSchedule() {
  const [rows, setRows] = useState([]);
  const [applicants, setApplicants] = useState([]);
  const [form, setForm] = useState(EMPTY);
  const [entry, setEntry] = useState(false);
  const [tab, setTab] = useState('all');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [details, setDetails] = useState(null); // the grid row whose full details are open
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    api('/admissions/interviews').then(setRows).catch((e) => setError(e.message));
    api('/admissions').then((all) => setApplicants(all.filter((a) => ['applied', 'waitlisted', 'approved'].includes(a.status))));
  }, []);
  useEffect(load, [load]);
  useOpenNew(() => { setForm(EMPTY); setEntry(true); });

  const run = async (fn) => { setError(''); try { await fn(); load(); } catch (err) { setError(err.message); } };
  const save = async (e) => {
    e.preventDefault();
    setError(''); setBusy(true);
    try { await api(`/admissions/${form.id}/interview`, { method: 'PUT', body: form }); setEntry(false); setForm(EMPTY); load(); } catch (err) { setError(err.message); } finally { setBusy(false); }
  };
  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  const count = (k) => (k === 'all' ? rows.length : rows.filter((r) => (r.interviewResult ?? 'pending') === k).length);
  const needle = q.trim().toLowerCase();
  const shown = rows.filter((r) => (tab === 'all' || (r.interviewResult ?? 'pending') === tab) && (!needle || `${r.applicantName} ${r.className} ${r.interviewPanel}`.toLowerCase().includes(needle)));
  const pageRows = shown.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const photos = usePhotoSet('enquiry', pageRows.map((r) => r.id));
  const today = localDate();
  const upcoming = rows.filter((r) => String(r.interviewDate).slice(0, 10) >= today).length;

  return (
    <>
      <div className="profile-head">
        <div>
          <h1>Interview schedule</h1>
          <p className="hint">Schedule an interview for an applicant and record the panel's result. To change one, use Edit on its row.</p>
        </div>
        <div className="head-actions"><button type="button" className="big-action" onClick={() => { setError(''); setForm(EMPTY); setEntry(true); }}>+ Schedule interview</button></div>
      </div>
      {error && !entry && <p className="error" role="alert">{error}</p>}

      <div className="stats enquiry-tiles four">
        <Tile icon="▤" tone="blue" label="Interviews" value={rows.length} />
        <Tile icon="◷" tone="amber" label="Upcoming" value={upcoming} hint="today or later" />
        <Tile icon="✓" tone="green" label="Recommended" value={count('recommended')} />
        <Tile icon="×" tone="red" label="Not recommended" value={count('not_recommended')} />
      </div>

      <section className="card enquiry-card">
        <div className="tabs-line" role="tablist">
          {TABS.map(([k, l]) => <button key={k} type="button" role="tab" aria-selected={tab === k} className={tab === k ? 'on' : ''} onClick={() => { setTab(k); setPage(1); }}>{l}<span className="count">{count(k)}</span></button>)}
        </div>
        <div className="toolbar">
          <label className="search-field"><span aria-hidden="true">⌕</span><input value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} placeholder="Search applicant, class or panel…" aria-label="Search interviews" /></label>
          <span className="showing">{shown.length} interviews</span>
        </div>
        <div className="table-scroll">
          <table className="enquiry-table">
            <thead><tr><th>Date</th><th>Time</th><th>Applicant</th><th>Class</th><th>Panel</th><th>Result</th><th /></tr></thead>
            <tbody>
              {pageRows.map((a) => (
                <tr key={a.id}>
                  <td>{a.interviewDate}</td><td>{a.interviewTime}</td><td><span className="person"><PersonThumb id={a.id} entity="enquiry" has={photos.has(a.id)} name={a.applicantName} /><b>{a.applicantName}</b></span></td><td>{a.className}</td><td>{a.interviewPanel}</td>
                  <td><span className={`badge ${BADGE[a.interviewResult]}`}>● {RESULTS[a.interviewResult]}</span></td>
                  <td className="row-actions">
                    <button type="button" className="ghost more-btn" aria-label={`All details of ${a.applicantName}`} title="All details" onClick={() => setDetails(a)}>⋯</button>
                    <button type="button" onClick={() => { setError(''); setForm({ id: a.id, interviewDate: a.interviewDate, interviewTime: a.interviewTime ?? '', interviewPanel: a.interviewPanel ?? '', interviewResult: a.interviewResult ?? 'pending' }); setEntry(true); }}>Edit</button>
                    <button type="button" className="ghost" onClick={() => run(() => api(`/admissions/${a.id}/interview`, { method: 'DELETE' }))}>Remove</button>
                  </td>
                </tr>
              ))}
              {!pageRows.length && <tr><td colSpan={7} className="empty-row">{needle || tab !== 'all' ? 'No interviews match.' : 'No interviews scheduled.'}</td></tr>}
            </tbody>
          </table>
        </div>
        <Pagination page={page} pageSize={PAGE_SIZE} total={shown.length} onChange={setPage} />
      </section>

      <Modal open={entry} title="Interview" wide={false} onClose={() => setEntry(false)}>
        <form onSubmit={save} className="enquiry-form">
          {error && <p className="error" role="alert">{error}</p>}
          <div className="enq-grid">
            <label className="wide"><span>Applicant *</span>
              <select value={form.id} onChange={set('id')} required>
                <option value="">--</option>{applicants.map((a) => <option key={a.id} value={a.id}>{a.applicantName} ({a.className ?? 'no class'})</option>)}
              </select>
            </label>
            <label><span>Date *</span><input type="date" value={form.interviewDate} onChange={set('interviewDate')} required /></label>
            <label><span>Time *</span><input type="time" value={form.interviewTime} onChange={set('interviewTime')} required /></label>
            <label><span>Panel *</span><input value={form.interviewPanel} onChange={set('interviewPanel')} required /></label>
            <label><span>Result</span>
              <select value={form.interviewResult} onChange={set('interviewResult')}>{Object.entries(RESULTS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
            </label>
          </div>
          <div className="form-actions"><button type="submit" disabled={busy}>{busy ? 'Saving…' : 'Save'}</button><button type="button" className="ghost" onClick={() => setEntry(false)}>Cancel</button></div>
        </form>
      </Modal>

      <Modal open={Boolean(details)} title="Applicant details" onClose={() => setDetails(null)}>
        {details && <AdmissionDetails row={details} />}
      </Modal>
    </>
  );
}
