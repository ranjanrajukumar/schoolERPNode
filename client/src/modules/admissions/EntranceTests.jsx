import { useCallback, useEffect, useState } from 'react';
import Gate from '../../components/Gate.jsx';
import { api } from '../../services/api.js';
import Modal from '../../components/Modal.jsx';
import Pagination from '../../components/Pagination.jsx';
import PersonThumb from '../../components/PersonThumb.jsx';
import AdmissionDetails from './AdmissionDetails.jsx';
import { usePhotoSet } from '../../hooks/usePhotoSet.js';
import { useOpenNew } from '../../hooks/useOpenNew.js';
import { localDate } from '../../utils/dates.js';

const PAGE_SIZE = 25;
const EMPTY = { id: '', testDate: '', testMaxMarks: 100, testMarks: '' };
const TABS = [
  ['all', 'All tests'],
  ['waiting', 'Awaiting marks'],
  ['marked', 'Marked'],
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

/** Schedule an entrance test for an applicant, then enter the marks once it is taken. */
export default function EntranceTests() {
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
    api('/admissions/tests')
      .then(setRows)
      .catch((e) => setError(e.message));
    api('/admissions').then((all) =>
      setApplicants(all.filter((a) => ['applied', 'waitlisted', 'approved'].includes(a.status))),
    );
  }, []);
  useEffect(load, [load]);
  useOpenNew(() => {
    setForm(EMPTY);
    setEntry(true);
  });

  const run = async (fn) => {
    setError('');
    try {
      await fn();
      load();
    } catch (err) {
      setError(err.message);
    }
  };
  const save = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await api(`/admissions/${form.id}/test`, { method: 'PUT', body: form });
      setEntry(false);
      setForm(EMPTY);
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };
  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  const match = (r, k) =>
    k === 'all' ? true : k === 'waiting' ? r.testMarks === null : r.testMarks !== null;
  const count = (k) => rows.filter((r) => match(r, k)).length;
  const needle = q.trim().toLowerCase();
  const shown = rows.filter(
    (r) => match(r, tab) && (!needle || `${r.applicantName} ${r.className}`.toLowerCase().includes(needle)),
  );
  const pageRows = shown.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const photos = usePhotoSet(
    'enquiry',
    pageRows.map((r) => r.id),
  );
  const percents = rows
    .filter((r) => r.percent !== null && r.percent !== undefined && r.percent !== '')
    .map((r) => Number(r.percent));
  const average = percents.length ? Math.round(percents.reduce((n, p) => n + p, 0) / percents.length) : null;
  const today = localDate();
  const upcoming = rows.filter((r) => String(r.testDate).slice(0, 10) >= today).length;
  const openForm = () => {
    setError('');
    setForm(EMPTY);
    setEntry(true);
  };

  return (
    <>
      <div className="profile-head">
        <div>
          <h1>Entrance tests</h1>
          <p className="hint">
            Schedule a test for an applicant, then enter the marks once it is taken. To change a test, use
            Edit on its row.
          </p>
        </div>
        <div className="head-actions">
          <button type="button" className="big-action" onClick={openForm}>
            + Schedule test
          </button>
        </div>
      </div>
      {error && !entry && (
        <p className="error" role="alert">
          {error}
        </p>
      )}

      <div className="stats enquiry-tiles four">
        <Tile icon="✎" tone="blue" label="Tests scheduled" value={rows.length} />
        <Tile icon="◷" tone="amber" label="Awaiting marks" value={count('waiting')} />
        <Tile
          icon="✓"
          tone="green"
          label="Marked"
          value={count('marked')}
          hint={average === null ? null : `average ${average}%`}
        />
        <Tile icon="▤" tone="violet" label="Upcoming" value={upcoming} hint="today or later" />
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
              placeholder="Search applicant or class…"
              aria-label="Search tests"
            />
          </label>
          <span className="showing">{shown.length} tests</span>
        </div>
        <div className="table-scroll">
          <table className="enquiry-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Applicant</th>
                <th>Class</th>
                <th>Marks</th>
                <th>%</th>
                <th>Stage</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {pageRows.map((a) => (
                <tr key={a.id}>
                  <td>{a.testDate}</td>
                  <td>
                    <span className="person">
                      <PersonThumb id={a.id} entity="enquiry" has={photos.has(a.id)} name={a.applicantName} />
                      <b>{a.applicantName}</b>
                    </span>
                  </td>
                  <td>{a.className}</td>
                  <td>{a.testMarks === null ? 'not marked' : `${a.testMarks} / ${a.testMaxMarks}`}</td>
                  <td>{a.percent ?? ''}</td>
                  <td>
                    <span className={`badge ${a.status}`}>{a.status}</span>
                  </td>
                  <td className="row-actions">
                    <button
                      type="button"
                      className="ghost more-btn"
                      aria-label={`All details of ${a.applicantName}`}
                      title="All details"
                      onClick={() => setDetails(a)}
                    >
                      ⋯
                    </button>
                    <Gate action="edit">
                      <button
                        type="button"
                        onClick={() => {
                          setError('');
                          setForm({
                            id: a.id,
                            testDate: a.testDate,
                            testMaxMarks: a.testMaxMarks,
                            testMarks: a.testMarks ?? '',
                          });
                          setEntry(true);
                        }}
                      >
                        Edit
                      </button>
                    </Gate>
                    <Gate action="delete">
                      <button
                        type="button"
                        className="ghost"
                        onClick={() => run(() => api(`/admissions/${a.id}/test`, { method: 'DELETE' }))}
                      >
                        Remove
                      </button>
                    </Gate>
                  </td>
                </tr>
              ))}
              {!pageRows.length && (
                <tr>
                  <td colSpan={7} className="empty-row">
                    {needle || tab !== 'all' ? 'No tests match.' : 'No tests scheduled.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <Pagination page={page} pageSize={PAGE_SIZE} total={shown.length} onChange={setPage} />
      </section>

      <Modal open={entry} title="Entrance test" wide={false} onClose={() => setEntry(false)}>
        <form onSubmit={save} className="enquiry-form">
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          <div className="enq-grid">
            <label className="wide">
              <span>Applicant *</span>
              <select value={form.id} onChange={set('id')} required>
                <option value="">--</option>
                {applicants.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.applicantName} ({a.className ?? 'no class'})
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>Test date *</span>
              <input type="date" value={form.testDate} onChange={set('testDate')} required />
            </label>
            <label>
              <span>Out of</span>
              <input type="number" min="1" value={form.testMaxMarks} onChange={set('testMaxMarks')} />
            </label>
            <label className="wide">
              <span>Marks (after the test)</span>
              <input type="number" min="0" step="0.5" value={form.testMarks} onChange={set('testMarks')} />
            </label>
          </div>
          <div className="form-actions">
            <button type="submit" disabled={busy}>
              {busy ? 'Saving…' : 'Save'}
            </button>
            <button type="button" className="ghost" onClick={() => setEntry(false)}>
              Cancel
            </button>
          </div>
        </form>
      </Modal>

      <Modal open={Boolean(details)} title="Applicant details" onClose={() => setDetails(null)}>
        {details && <AdmissionDetails row={details} />}
      </Modal>
    </>
  );
}
