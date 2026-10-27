import { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../../services/api.js';
import TypeaheadSelect from '../../components/TypeaheadSelect.jsx';
import Modal from '../../components/Modal.jsx';
import Pagination from '../../components/Pagination.jsx';
import { useOpenNew } from '../../hooks/useOpenNew.js';
import { localDate } from '../../utils/dates.js';

const PAGE_SIZE = 25;
const TYPES = [
  { value: 'bonafide', label: 'Bonafide certificate' },
  { value: 'transfer', label: 'Transfer certificate' },
  { value: 'character', label: 'Character certificate' },
  { value: 'fee', label: 'Fee certificate' },
];
const TABS = [['requested', 'Requested'], ['issued', 'Issued'], ['rejected', 'Rejected'], ['all', 'All']];
const date = (d) => (d ? new Date(`${String(d).slice(0, 10)}T00:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '');

function Tile({ icon, tone, label, value, hint }) {
  return (
    <div className="tile card">
      <span className={`tile-icon ${tone}`} aria-hidden="true">{icon}</span>
      <span className="tile-text"><span>{label}</span><b>{value}</b>{hint && <small>{hint}</small>}</span>
    </div>
  );
}

/** Certificate requests and the issued register. Issuing allocates the number and freezes what is printed. */
export default function Documents() {
  const [params, setParams] = useSearchParams();
  const typeFilter = params.get('type') ?? '';
  const [all, setAll] = useState([]);
  const [tab, setTab] = useState('requested');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [entry, setEntry] = useState(false);
  const [form, setForm] = useState({ studentId: '', type: typeFilter || 'bonafide', purpose: '' });
  const [issuing, setIssuing] = useState(null); // request being issued, with extra inputs
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const load = useCallback(() => { api('/documents').then(setAll).catch((e) => setError(e.message)); }, []);
  useEffect(load, [load]);
  useOpenNew(() => setEntry(true));

  const run = async (fn, message) => {
    setError(''); setNotice('');
    try { const r = await fn(); if (message) setNotice(message(r)); load(); return true; } catch (err) { setError(err.message); return false; }
  };

  const openNew = () => { setError(''); setForm({ studentId: '', type: typeFilter || 'bonafide', purpose: '' }); setEntry(true); };
  const create = async (e) => {
    e.preventDefault();
    setBusy(true);
    const ok = await run(() => api('/documents', { method: 'POST', body: form }), () => 'Request recorded.');
    setBusy(false);
    if (ok) setEntry(false);
  };

  const startIssue = (r) => {
    // Plain certificates need no extra input, so issue straight away.
    if (!['transfer', 'character'].includes(r.type)) {
      run(() => api(`/documents/${r.id}/issue`, { method: 'POST', body: {} }), (x) => `Issued ${x.certificateNo}.`);
      return;
    }
    setError('');
    setIssuing({ ...r, conduct: 'Good', leavingDate: localDate(), leavingReason: r.purpose ?? '', override: false });
  };
  const confirmIssue = async (e) => {
    e.preventDefault();
    const { id, conduct, leavingDate, leavingReason, override } = issuing;
    const ok = await run(() => api(`/documents/${id}/issue`, { method: 'POST', body: { conduct, leavingDate, leavingReason, override } }), (x) => `Issued ${x.certificateNo}.`);
    if (ok) setIssuing(null);
  };
  const rejectRequest = (r) => {
    const remarks = prompt(`Reason for rejecting the ${r.typeLabel.toLowerCase()} for ${r.studentName}`);
    if (remarks) run(() => api(`/documents/${r.id}/reject`, { method: 'POST', body: { remarks } }));
  };
  const remove = (r) => run(() => api(`/documents/${r.id}`, { method: 'DELETE' }));

  const ofType = all.filter((r) => !typeFilter || r.type === typeFilter);
  const count = (k) => (k === 'all' ? ofType.length : ofType.filter((r) => r.status === k).length);
  const needle = q.trim().toLowerCase();
  const shown = ofType.filter((r) => (tab === 'all' || r.status === tab) && (!needle || `${r.studentName} ${r.admissionNo} ${r.certificateNo ?? ''} ${r.purpose ?? ''}`.toLowerCase().includes(needle)));
  const pageRows = shown.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const thisMonth = new Date().toISOString().slice(0, 7);
  const issuedThisMonth = ofType.filter((r) => r.status === 'issued' && String(r.issuedOn ?? '').startsWith(thisMonth)).length;

  return (
    <>
      <div className="profile-head">
        <div>
          <h1>Certificates</h1>
          <p className="hint">Requests come from here or from parents in the portal. Issuing allocates the certificate number and freezes what is printed. A transfer certificate also marks the student as left.</p>
        </div>
        <div className="head-actions">
          <select value={typeFilter} onChange={(e) => { setParams(e.target.value ? { type: e.target.value } : {}); setPage(1); }} aria-label="Certificate type" style={{ minHeight: 44 }}>
            <option value="">All certificates</option>
            {TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
          <button type="button" className="big-action" onClick={openNew}>+ New request</button>
        </div>
      </div>
      {notice && <p className="success">{notice}</p>}
      {error && !entry && !issuing && <p className="error" role="alert">{error}</p>}

      <div className="stats enquiry-tiles four">
        <Tile icon="◷" tone="amber" label="Waiting to be issued" value={count('requested')} />
        <Tile icon="✓" tone="green" label="Issued" value={count('issued')} hint={`${issuedThisMonth} this month`} />
        <Tile icon="×" tone="red" label="Rejected" value={count('rejected')} />
        <Tile icon="▤" tone="blue" label="All requests" value={count('all')} />
      </div>

      <section className="card enquiry-card">
        <div className="tabs-line" role="tablist">
          {TABS.map(([k, l]) => <button key={k} type="button" role="tab" aria-selected={tab === k} className={tab === k ? 'on' : ''} onClick={() => { setTab(k); setPage(1); }}>{l}<span className="count">{count(k)}</span></button>)}
        </div>
        <div className="toolbar">
          <label className="search-field"><span aria-hidden="true">⌕</span><input value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} placeholder="Search student, number or purpose…" aria-label="Search certificates" /></label>
          <span className="showing">{shown.length} requests</span>
        </div>
        <div className="table-scroll">
          <table className="enquiry-table">
            <thead><tr><th>Certificate</th><th>Student</th><th>Purpose</th><th>Requested by</th><th>Status</th><th>No / date</th><th /></tr></thead>
            <tbody>
              {pageRows.map((r) => (
                <tr key={r.id}>
                  <td><b>{r.typeLabel}</b></td>
                  <td><b>{r.studentName}</b><small className="block">{r.admissionNo}</small></td>
                  <td>{r.purpose || '—'}{r.remarks && <small className="block">{r.remarks}</small>}</td>
                  <td style={{ textTransform: 'capitalize' }}>{r.appliedBy ?? <span className="none">—</span>}</td>
                  <td><span className={`badge ${r.status === 'issued' ? 'paid' : r.status === 'rejected' ? 'rejected' : 'partial'}`}>● {r.status}</span>{r.decidedByName && <small className="block">by {r.decidedByName}{r.decidedOn ? ` · ${date(r.decidedOn)}` : ''}</small>}</td>
                  <td>{r.certificateNo ?? '—'}{r.issuedOn && <small className="block">{date(r.issuedOn)}</small>}</td>
                  <td className="row-actions">
                    {r.status === 'requested' && <button type="button" onClick={() => startIssue(r)}>Issue</button>}
                    {r.status === 'requested' && <button type="button" className="ghost" onClick={() => rejectRequest(r)}>Reject</button>}
                    {r.status === 'issued' && <Link to={`/documents/${r.id}/print`}>View / print</Link>}
                    {r.status !== 'issued' && <button type="button" className="ghost" onClick={() => remove(r)}>Delete</button>}
                  </td>
                </tr>
              ))}
              {!pageRows.length && <tr><td colSpan={7} className="empty-row">{needle || tab !== 'all' ? 'No requests match.' : 'No requests yet.'}</td></tr>}
            </tbody>
          </table>
        </div>
        <Pagination page={page} pageSize={PAGE_SIZE} total={shown.length} onChange={setPage} />
      </section>

      <Modal open={entry} title="New certificate request" wide={false} onClose={() => setEntry(false)}>
        <form onSubmit={create} className="enquiry-form">
          {error && <p className="error" role="alert">{error}</p>}
          <div className="enq-grid">
            <label className="wide"><span>Student *</span>
              <TypeaheadSelect kind="students" value={form.studentId} onChange={(id) => setForm({ ...form, studentId: id })} required />
            </label>
            <label><span>Certificate</span>
              <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>{TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}</select>
            </label>
            <label><span>Purpose</span><input value={form.purpose} onChange={(e) => setForm({ ...form, purpose: e.target.value })} maxLength={200} /></label>
          </div>
          <div className="form-actions"><button type="submit" disabled={busy}>{busy ? 'Saving…' : 'Record request'}</button><button type="button" className="ghost" onClick={() => setEntry(false)}>Cancel</button></div>
        </form>
      </Modal>

      <Modal open={Boolean(issuing)} title={issuing ? `Issue ${issuing.typeLabel.toLowerCase()}` : ''} wide={false} onClose={() => setIssuing(null)}>
        {issuing && (
          <form onSubmit={confirmIssue} className="enquiry-form">
            {error && <p className="error" role="alert">{error}</p>}
            <p className="hint">{issuing.studentName} · {issuing.admissionNo}</p>
            <div className="enq-grid">
              <label><span>Conduct</span><input value={issuing.conduct} onChange={(e) => setIssuing({ ...issuing, conduct: e.target.value })} /></label>
              {issuing.type === 'transfer' && (
                <>
                  <label><span>Leaving date</span><input type="date" value={issuing.leavingDate} onChange={(e) => setIssuing({ ...issuing, leavingDate: e.target.value })} /></label>
                  <label className="wide"><span>Reason for leaving</span><input value={issuing.leavingReason} onChange={(e) => setIssuing({ ...issuing, leavingReason: e.target.value })} /></label>
                  <label className="wide inline"><input type="checkbox" checked={issuing.override} onChange={(e) => setIssuing({ ...issuing, override: e.target.checked })} /> Issue even if fees are outstanding</label>
                </>
              )}
            </div>
            <div className="form-actions"><button type="submit">Issue</button><button type="button" className="ghost" onClick={() => setIssuing(null)}>Cancel</button></div>
          </form>
        )}
      </Modal>
    </>
  );
}
