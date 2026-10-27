import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../services/api.js';
import Pagination from '../../components/Pagination.jsx';
import PersonThumb from '../../components/PersonThumb.jsx';
import AdmissionDetails from './AdmissionDetails.jsx';
import { usePhotoSet } from '../../hooks/usePhotoSet.js';
import Modal from '../../components/Modal.jsx';

const PAGE_SIZE = 25;
const TABS = [['all', 'All offers'], ['active', 'Open'], ['expired', 'Expired'], ['nodate', 'No date set']];

function Tile({ icon, tone, label, value, hint }) {
  return (
    <div className="tile card">
      <span className={`tile-icon ${tone}`} aria-hidden="true">{icon}</span>
      <span className="tile-text"><span>{label}</span><b>{value}</b>{hint && <small>{hint}</small>}</span>
    </div>
  );
}

/** Approved applicants hold an offer until the date the family must confirm by. */
export default function AdmissionOffers() {
  const [rows, setRows] = useState([]);
  const [tab, setTab] = useState('all');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [details, setDetails] = useState(null); // the grid row whose full details are open
  const [error, setError] = useState('');
  const load = useCallback(() => { api('/admissions/offers').then(setRows).catch((e) => setError(e.message)); }, []);
  useEffect(load, [load]);

  const setExpiry = async (a, offerExpiry) => {
    setError('');
    try { await api(`/admissions/${a.id}/offer`, { method: 'PUT', body: { offerExpiry } }); load(); } catch (err) { setError(err.message); }
  };

  const match = (r, k) => (k === 'all' ? true : k === 'expired' ? r.expired : k === 'nodate' ? !r.offerExpiry : r.offerExpiry && !r.expired);
  const count = (k) => rows.filter((r) => match(r, k)).length;
  const needle = q.trim().toLowerCase();
  const shown = rows.filter((r) => match(r, tab) && (!needle || `${r.applicantName} ${r.className} ${r.guardianName} ${r.guardianPhone}`.toLowerCase().includes(needle)));
  const pageRows = shown.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const photos = usePhotoSet('enquiry', pageRows.map((r) => r.id));

  return (
    <>
      <div className="profile-head">
        <div>
          <h1>Admission offers</h1>
          <p className="hint">Approved applicants hold an offer. Set the date by which the family must confirm; enroll them under <Link to="/admissions">Admissions</Link> once they accept. Past the date the offer shows as expired, so the seat can be given to the waiting list.</p>
        </div>
      </div>
      {error && <p className="error" role="alert">{error}</p>}

      <div className="stats enquiry-tiles four">
        <Tile icon="▤" tone="blue" label="Offers held" value={rows.length} />
        <Tile icon="✓" tone="green" label="Open with a date" value={count('active')} />
        <Tile icon="×" tone="red" label="Expired" value={count('expired')} />
        <Tile icon="◷" tone="amber" label="No date set" value={count('nodate')} />
      </div>

      <section className="card enquiry-card">
        <div className="tabs-line" role="tablist">
          {TABS.map(([k, l]) => <button key={k} type="button" role="tab" aria-selected={tab === k} className={tab === k ? 'on' : ''} onClick={() => { setTab(k); setPage(1); }}>{l}<span className="count">{count(k)}</span></button>)}
        </div>
        <div className="toolbar">
          <label className="search-field"><span aria-hidden="true">⌕</span><input value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} placeholder="Search applicant, class or guardian…" aria-label="Search offers" /></label>
          <span className="showing">{shown.length} offers</span>
        </div>
        <div className="table-scroll">
          <table className="enquiry-table">
            <thead><tr><th>Applicant</th><th>Class</th><th>Guardian</th><th>Phone</th><th>Confirm by</th><th /></tr></thead>
            <tbody>
              {pageRows.map((a) => (
                <tr key={a.id}>
                  <td><span className="person"><PersonThumb id={a.id} entity="enquiry" has={photos.has(a.id)} name={a.applicantName} /><b>{a.applicantName}</b></span></td><td>{a.className}</td><td>{a.guardianName}</td><td>{a.guardianPhone}</td>
                  <td><input type="date" value={a.offerExpiry ?? ''} onChange={(e) => setExpiry(a, e.target.value)} aria-label={`Confirm-by date for ${a.applicantName}`} />{a.expired && <span className="badge rejected" style={{ marginLeft: 6 }}>● expired</span>}</td>
                  <td className="row-actions"><button type="button" className="ghost more-btn" aria-label={`All details of ${a.applicantName}`} title="All details" onClick={() => setDetails(a)}>⋯</button></td>
                </tr>
              ))}
              {!pageRows.length && <tr><td colSpan={6} className="empty-row">{needle || tab !== 'all' ? 'No offers match.' : 'No open offers.'}</td></tr>}
            </tbody>
          </table>
        </div>
        <Pagination page={page} pageSize={PAGE_SIZE} total={shown.length} onChange={setPage} />
      </section>

      <Modal open={Boolean(details)} title="Applicant details" onClose={() => setDetails(null)}>
        {details && <AdmissionDetails row={details} />}
      </Modal>
    </>
  );
}
