import { useCallback, useEffect, useState } from 'react';
import Gate from '../../components/Gate.jsx';
import { useLocation } from 'react-router-dom';
import { api } from '../../services/api.js';
import Pagination from '../../components/Pagination.jsx';
import { useOpenNew } from '../../hooks/useOpenNew.js';
import Modal from '../../components/Modal.jsx';
import PersonThumb from '../../components/PersonThumb.jsx';
import ApplicationForm from './ApplicationForm.jsx';
import AdmissionDetails from './AdmissionDetails.jsx';
import ApplicationProcess from './ApplicationProcess.jsx';
import PageReports from '../reports/PageReports.jsx';

const PAGE_SIZE = 10;
const TABS = [
  ['all', 'All applications'],
  ['review', 'Under review'],
  ['assessment', 'Assessment'],
  ['offer', 'Offer sent'],
  ['enrolled', 'Enrolled'],
  ['draft', 'Drafts'],
];
const PIPELINE = [
  ['all', 'Applications'],
  ['review', 'Under review'],
  ['assessment', 'Assessment'],
  ['offer', 'Offer sent'],
  ['enrolled', 'Enrolled'],
];
const FLOW = [
  ['review', 'Under review'],
  ['assessment', 'Assessment'],
  ['offer', 'Offer sent'],
  ['enrolled', 'Enrolled'],
];
const PILL = {
  draft: '',
  review: 'partial',
  assessment: 'applied',
  offer: 'approved',
  enrolled: 'paid',
  closed: 'rejected',
  enquiry: '',
};
const date = (d) =>
  d ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '';
const csvCell = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
const yearLabel = (y) => (y ? y.replace('-', '–') : '—');

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

/** Applications moving through admission: under review, assessment, offer sent, enrolled. */
export default function Applications() {
  const [summary, setSummary] = useState(null);
  const [data, setData] = useState({ rows: [], total: 0 });
  const [classes, setClasses] = useState([]);
  const [years, setYears] = useState([]);
  const [tab, setTab] = useState('all');
  const [filters, setFilters] = useState({ q: '', classId: '', academicYear: '' });
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [details, setDetails] = useState(null); // the grid row whose full details are open
  const [view, setView] = useState('list'); // list | board (one column per stage of the flow)
  const [board, setBoard] = useState({});
  const [process, setProcess] = useState(null); // the row whose step-by-step process is open
  const [entry, setEntry] = useState(null); // null | { id? }: the application popup
  const location = useLocation();
  useOpenNew(() => setEntry({}), true);
  useEffect(() => {
    if (location.state?.notice) {
      setNotice(location.state.notice);
      window.history.replaceState({}, '');
    }
  }, [location.state]);

  const load = useCallback(() => {
    const p = new URLSearchParams({ page, pageSize: PAGE_SIZE, tab });
    Object.entries(filters).forEach(([k, v]) => v && p.set(k, v));
    api(`/admissions/applications?${p}`)
      .then(setData)
      .catch((e) => setError(e.message));
    api('/admissions/applications/summary')
      .then(setSummary)
      .catch(() => {});
    if (view === 'board') {
      const f = new URLSearchParams({ page: 1, pageSize: 50 });
      Object.entries(filters).forEach(([k, v]) => v && f.set(k, v));
      Promise.all(FLOW.map(([k]) => api(`/admissions/applications?${f}&tab=${k}`)))
        .then((rs) => setBoard(Object.fromEntries(FLOW.map(([k], i) => [k, rs[i]]))))
        .catch((e) => setError(e.message));
    }
  }, [page, tab, filters, view]);
  useEffect(load, [load]);
  useEffect(() => {
    api('/classes')
      .then(setClasses)
      .catch(() => {});
    api('/academic-years')
      .then(setYears)
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
    setPage(1);
  };
  const current = years.find((y) => y.isCurrent)?.name;

  const act = async (fn, message) => {
    setError('');
    setNotice('');
    try {
      const r = await fn();
      setNotice(typeof message === 'function' ? message(r) : message);
      load();
    } catch (err) {
      setError(err.message);
    }
  };
  const enroll = (r) =>
    act(
      () => api(`/admissions/${r.id}/enroll`, { method: 'POST', body: {} }),
      (x) =>
        `Enrolled as ${x.admissionNo}.${x.studentLogin ? ` Student login: username ${x.studentLogin.username}, starting password ${x.studentLogin.password}${x.studentLogin.isDefault ? ' (the school default)' : ''}. Note it down now; it is shown only once and the student must change it at first sign-in.` : ''}${x.followUps ? ` To do: ${x.followUps.join(' ')}` : ' Subjects, activities, transport and fees are set up.'}${x.notCopied ? ` Not copied: ${x.notCopied.join('; ')}.` : ''}`,
    );
  const remove = (r) => act(() => api(`/admissions/${r.id}`, { method: 'DELETE' }), 'Application deleted.');

  // Downloads every application that matches the current stage, search and filters.
  const exportCsv = async () => {
    setError('');
    try {
      const rows = [];
      for (let p = 1; ; p += 1) {
        const qs = new URLSearchParams({ page: p, pageSize: 100, tab });
        Object.entries(filters).forEach(([k, v]) => v && qs.set(k, v));
        const r = await api(`/admissions/applications?${qs}`);
        rows.push(...r.rows);
        if (rows.length >= r.total || !r.rows.length) break;
      }
      const head = [
        'Application ID',
        'Student',
        'Grade',
        'Parent / guardian',
        'Submitted',
        'Academic year',
        'Status',
      ];
      const lines = rows.map((r) =>
        [
          r.applicationId,
          r.applicantName,
          r.className,
          r.guardianName,
          r.submitted,
          r.academicYear,
          r.stageLabel,
        ]
          .map(csvCell)
          .join(','),
      );
      const url = URL.createObjectURL(
        new Blob([[head.map(csvCell).join(','), ...lines].join('\r\n')], { type: 'text/csv' }),
      );
      const a = document.createElement('a');
      a.href = url;
      a.download = 'applications.csv';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err.message);
    }
  };

  const c = summary?.counts;
  const from = data.total ? (page - 1) * PAGE_SIZE + 1 : 0;
  return (
    <>
      <div className="profile-head">
        <div>
          <h1>Admission</h1>
          <p className="hint">Manage applications and guide students through the admission process.</p>
        </div>
        <div className="head-actions">
          <PageReports page="admissions" />
          <Gate action="export">
            <button type="button" className="ghost" onClick={exportCsv}>
              ↓ Export
            </button>
          </Gate>
          <button
            type="button"
            className="big-action"
            onClick={() => {
              setError('');
              setNotice('');
              setEntry({});
            }}
          >
            + New admission
          </button>
        </div>
      </div>
      {notice && <p className="success">{notice}</p>}
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}

      <div className="stats enquiry-tiles">
        <Tile
          icon="♙"
          tone="blue"
          label="Total applicants"
          value={c?.all ?? '…'}
          note={summary?.applicantsThisWeek ? `↗ ${summary.applicantsThisWeek} this week` : null}
          onClick={() => goTab('all')}
        />
        <Tile
          icon="◷"
          tone="amber"
          label="Under review"
          value={c?.review ?? '…'}
          onClick={() => goTab('review')}
        />
        <Tile
          icon="▣"
          tone="violet"
          label="Offers sent"
          value={c?.offer ?? '…'}
          onClick={() => goTab('offer')}
        />
        <Tile
          icon="✓"
          tone="green"
          label="Enrolled"
          value={c?.enrolled ?? '…'}
          note={summary?.enrolledThisMonth ? `↗ ${summary.enrolledThisMonth} this month` : null}
          onClick={() => goTab('enrolled')}
        />
      </div>

      <section className="card pipeline">
        <header>
          <h2>Admission pipeline</h2>
          {current && <small>Academic year {yearLabel(current)}</small>}
        </header>
        <div className="pipeline-steps">
          {PIPELINE.map(([k, l]) => (
            <button key={k} type="button" className={tab === k ? 'on' : ''} onClick={() => goTab(k)}>
              {l}
              <span className="count">{c?.[k] ?? 0}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="card enquiry-card">
        <div className="view-switch" role="group" aria-label="View">
          {[
            ['list', 'List'],
            ['board', 'Flow board'],
          ].map(([k, l]) => (
            <button key={k} type="button" className={view === k ? 'on' : ''} onClick={() => setView(k)}>
              {l}
            </button>
          ))}
        </div>
        <div className="tabs-line" role="tablist" hidden={view === 'board'}>
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
              {c ? <span className="count">{c[k]}</span> : null}
            </button>
          ))}
        </div>
        <div className="toolbar">
          <label className="search-field">
            <span aria-hidden="true">⌕</span>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search student, application ID or parent…"
              aria-label="Search applications"
            />
          </label>
          <select value={filters.classId} onChange={setFilter('classId')} aria-label="Grade">
            <option value="">All grades</option>
            {classes.map((cl) => (
              <option key={cl.id} value={cl.id}>
                {cl.name}-{cl.section}
              </option>
            ))}
          </select>
          <select
            value={filters.academicYear}
            onChange={setFilter('academicYear')}
            aria-label="Academic year"
          >
            <option value="">All years</option>
            {years.map((y) => (
              <option key={y.id} value={y.name}>
                {yearLabel(y.name)}
              </option>
            ))}
          </select>
          <span className="showing" hidden={view === 'board'}>
            Showing{' '}
            <b>
              {from}–{Math.min(page * PAGE_SIZE, data.total)}
            </b>{' '}
            of <b>{data.total}</b>
          </span>
        </div>
        {view === 'board' && (
          <div className="flow-board">
            {FLOW.map(([k, l]) => (
              <div key={k} className="flow-col">
                <h3>
                  {l} <span className="count">{board[k]?.total ?? 0}</span>
                </h3>
                {(board[k]?.rows ?? []).map((r) => (
                  <div key={r.id} className="flow-card">
                    <button type="button" className="id-link" onClick={() => setDetails(r)}>
                      {r.applicationId}
                    </button>
                    <b>{r.applicantName}</b>
                    <small>
                      {r.className ?? 'Grade not chosen'} · {date(r.submitted)}
                    </small>
                    {r.guardianName && <small>{r.guardianName}</small>}
                    <div className="flow-actions">
                      {(k === 'review' || k === 'assessment') && (
                        <button type="button" onClick={() => setProcess(r)}>
                          Process steps →
                        </button>
                      )}
                      {k === 'offer' && (
                        <button type="button" onClick={() => enroll(r)}>
                          Enroll →
                        </button>
                      )}
                      <button type="button" className="ghost" onClick={() => setEntry({ id: r.id })}>
                        Edit
                      </button>
                    </div>
                  </div>
                ))}
                {!(board[k]?.rows ?? []).length && <p className="hint">None</p>}
              </div>
            ))}
          </div>
        )}
        <div className="table-scroll" hidden={view === 'board'}>
          <table className="enquiry-table">
            <thead>
              <tr>
                <th>Application ID</th>
                <th>Student</th>
                <th>Grade</th>
                <th>Parent / guardian</th>
                <th>Submitted</th>
                <th>Academic year</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {data.rows.map((r) => (
                <tr key={r.id}>
                  <td className="muted-cell">
                    <button
                      type="button"
                      className="id-link"
                      title="Open all details"
                      onClick={() => setDetails(r)}
                    >
                      {r.applicationId}
                    </button>
                  </td>
                  <td>
                    <span className="person">
                      <PersonThumb id={r.id} entity="enquiry" has={r.hasPhoto} name={r.applicantName} />
                      <span>
                        <b>{r.applicantName}</b>
                        <small className="block">{r.sourceLabel}</small>
                      </span>
                    </span>
                  </td>
                  <td>{r.className ?? <span className="none">Not chosen</span>}</td>
                  <td>{r.guardianName}</td>
                  <td>{date(r.submitted)}</td>
                  <td>{yearLabel(r.academicYear)}</td>
                  <td>
                    <span className={`badge ${PILL[r.stage] ?? ''}`}>● {r.stageLabel}</span>
                  </td>
                  <td className="row-actions">
                    {r.stage === 'draft' && <small className="hint">Not submitted</small>}
                    {(r.stage === 'review' || r.stage === 'assessment') && (
                      <button type="button" onClick={() => setProcess(r)}>
                        Process steps
                      </button>
                    )}
                    {r.stage === 'offer' && (
                      <button type="button" onClick={() => enroll(r)}>
                        Enroll
                      </button>
                    )}
                    <button
                      type="button"
                      className="ghost"
                      onClick={() => {
                        setError('');
                        setNotice('');
                        setEntry({ id: r.id });
                      }}
                    >
                      {r.stage === 'draft' ? 'Continue' : 'Edit'}
                    </button>
                    <Gate action="delete">
                      <button type="button" className="ghost danger" onClick={() => remove(r)}>
                        Delete
                      </button>
                    </Gate>
                  </td>
                </tr>
              ))}
              {!data.rows.length && (
                <tr>
                  <td colSpan={8} className="empty-row">
                    {filters.q || filters.classId || filters.academicYear || tab !== 'all'
                      ? 'No applications match these filters.'
                      : 'No applications yet. Add the first with “New admission”.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {view === 'list' && (
          <Pagination page={page} pageSize={PAGE_SIZE} total={data.total} onChange={setPage} />
        )}
      </section>

      <Modal open={Boolean(process)} title="Admission process" onClose={() => setProcess(null)}>
        {process && (
          <ApplicationProcess
            row={process}
            onEdit={(id) => {
              setProcess(null);
              setEntry({ id });
            }}
            onDone={(message) => {
              setProcess(null);
              setNotice(message);
              load();
            }}
          />
        )}
      </Modal>

      <Modal open={Boolean(details)} title="Admission details" onClose={() => setDetails(null)}>
        {details && (
          <AdmissionDetails
            row={details}
            onEdit={(id) => {
              setDetails(null);
              setError('');
              setNotice('');
              setEntry({ id });
            }}
          />
        )}
      </Modal>

      <Modal
        open={Boolean(entry)}
        title={entry?.id ? 'Edit admission' : 'New admission'}
        onClose={() => {
          setEntry(null);
          load();
        }}
      >
        {entry && (
          <ApplicationForm
            id={entry.id ? String(entry.id) : undefined}
            onClose={() => {
              setEntry(null);
              load();
            }}
            onDone={(message) => {
              setEntry(null);
              setNotice(message);
              load();
            }}
          />
        )}
      </Modal>
    </>
  );
}
