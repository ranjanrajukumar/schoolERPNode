import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../../services/api.js';
import Modal from '../../components/Modal.jsx';
import Pagination from '../../components/Pagination.jsx';
import { useOpenNew } from '../../hooks/useOpenNew.js';
import AdmissionForm from './AdmissionForm.jsx';
import PersonThumb from '../../components/PersonThumb.jsx';
import EnquiryForm from './EnquiryForm.jsx';
import AdmissionDetails from './AdmissionDetails.jsx';

const PAGE_SIZE = 10;
const STAGES = [
  ['enquiry', 'New'],
  ['applied', 'Applied'],
  ['waitlisted', 'Waitlisted'],
  ['approved', 'Offered'],
  ['enrolled', 'Converted'],
  ['rejected', 'Closed'],
];
const SOURCES = [
  ['online', 'Website'],
  ['office', 'Walk-in'],
  ['phone', 'Phone'],
  ['referral', 'Referral'],
  ['social', 'Social media'],
  ['other', 'Other'],
];
const PILL = {
  New: '',
  'Follow-up': 'partial',
  Applied: 'applied',
  Waitlisted: 'waitlisted',
  Offered: 'approved',
  Converted: 'paid',
  Closed: 'rejected',
};
const NO_FILTERS = { classId: '', stage: '', source: '', from: '', to: '', visit: false };
const OPEN = ['enquiry', 'applied', 'waitlisted', 'approved'];
const date = (d) =>
  d ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '';

function Trend({ value, fallback }) {
  if (value === null || value === undefined)
    return fallback ? <span className="trend flat">{fallback}</span> : null;
  return (
    <span className={`trend ${value >= 0 ? 'up' : 'down'}`}>
      {value >= 0 ? '↗' : '↘'} {Math.abs(value)}%
    </span>
  );
}

function Tile({ icon, tone, label, value, trend, onClick }) {
  const body = (
    <>
      <span className={`tile-icon ${tone}`} aria-hidden="true">
        {icon}
      </span>
      <span className="tile-text">
        <span>{label}</span>
        <b>
          {value}
          {trend}
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

/** The enquiry desk: who is asking, who needs a call back, who is coming to visit, who has joined. */
export default function Admissions() {
  const nav = useNavigate();
  const [params] = useSearchParams();
  const [summary, setSummary] = useState(null);
  const [data, setData] = useState({ rows: [], total: 0 });
  const [classes, setClasses] = useState([]);
  const [tab, setTab] = useState('all');
  const [q, setQ] = useState('');
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({
    ...NO_FILTERS,
    stage: STAGES.some(([k]) => k === params.get('status')) ? params.get('status') : '',
  });
  const [more, setMore] = useState(false);
  const [page, setPage] = useState(1);
  const [details, setDetails] = useState(null); // the grid row whose full details are open
  const [entry, setEntry] = useState(null); // null | { kind: 'enquiry', id? } (the enquiry form) | { kind: 'full', id } (the long application form)
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  useOpenNew(() => setEntry({ kind: 'enquiry' }));

  const loadSummary = useCallback(
    () =>
      api('/admissions/enquiries/summary')
        .then(setSummary)
        .catch(() => {}),
    [],
  );
  const load = useCallback(() => {
    const p = new URLSearchParams({ page, pageSize: PAGE_SIZE, tab });
    if (search) p.set('q', search);
    Object.entries(filters).forEach(([k, v]) => v && p.set(k, v === true ? '1' : v));
    api(`/admissions/enquiries?${p}`)
      .then((d) => {
        setData(d);
        setError('');
      })
      .catch((e) => setError(e.message));
  }, [page, tab, search, filters]);
  const refresh = () => {
    load();
    loadSummary();
  };

  useEffect(() => {
    api('/classes')
      .then(setClasses)
      .catch(() => {});
    loadSummary();
  }, [loadSummary]);
  useEffect(load, [load]);
  // Searching waits for a pause in typing.
  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(q.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [q]);

  const setFilter = (k) => (e) => {
    setFilters({ ...filters, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });
    setPage(1);
  };
  const goTab = (t) => {
    setTab(t);
    setPage(1);
  };
  const activeFilters = ['source', 'from', 'to', 'visit'].filter((k) => filters[k]).length;
  const narrowed = Boolean(search || activeFilters || filters.classId || filters.stage || tab !== 'all');
  const first = data.total ? (page - 1) * PAGE_SIZE + 1 : 0;
  const last = Math.min(page * PAGE_SIZE, data.total);

  const act = async (fn, message) => {
    setError('');
    setNotice('');
    try {
      const r = await fn();
      if (message) setNotice(typeof message === 'function' ? message(r) : message);
      refresh();
    } catch (err) {
      setError(err.message);
    }
  };
  const enroll = (row) => {
    act(
      () => api(`/admissions/${row.id}/enroll`, { method: 'POST', body: {} }),
      (r) =>
        `Enrolled as ${r.admissionNo}; ${r.feesBilled} fee item(s) billed.${r.studentLogin ? ` Student login: username ${r.studentLogin.username}, starting password ${r.studentLogin.password}${r.studentLogin.isDefault ? ' (the school default)' : ''}. Note it down now; it is shown only once and the student must change it at first sign-in.` : ''}${r.followUps ? ` To do: ${r.followUps.join(' ')}` : ''}`,
    );
  };
  const remove = (row) => act(() => api(`/admissions/${row.id}`, { method: 'DELETE' }), 'Enquiry deleted.');
  const restore = (row) =>
    act(() => api(`/admissions/enquiries/${row.id}/restore`, { method: 'POST' }), 'Enquiry restored.');
  const purge = (row) =>
    act(() => api(`/admissions/${row.id}?permanent=1`, { method: 'DELETE' }), 'Enquiry permanently deleted.');

  const tabs = [
    ['all', 'All enquiries'],
    ['new', 'New'],
    ['followup', 'Follow-up'],
    ['converted', 'Converted'],
  ];

  return (
    <>
      <div className="profile-head">
        <div>
          <h1>Admission enquiries</h1>
        </div>
        <button
          type="button"
          className="big-action"
          onClick={() => {
            setError('');
            setEntry({ kind: 'enquiry' });
          }}
        >
          + New enquiry
        </button>
      </div>
      {notice && <p className="success">{notice}</p>}
      {error && !entry && (
        <p className="error" role="alert">
          {error}
        </p>
      )}

      <div className="stats enquiry-tiles">
        <Tile
          icon="🧒"
          tone="blue"
          label="Total enquiries"
          value={summary?.total ?? '…'}
          trend={
            summary && (
              <Trend
                value={summary.receivedTrend}
                fallback={summary.receivedThisMonth ? `+${summary.receivedThisMonth} this month` : null}
              />
            )
          }
        />
        <Tile
          icon="🕑"
          tone="amber"
          label="Needs follow-up"
          value={summary?.needsFollowUp ?? '…'}
          onClick={() => goTab('followup')}
        />
        <Tile
          icon="🏫"
          tone="violet"
          label="Visits scheduled"
          value={summary?.visitsScheduled ?? '…'}
          onClick={() => {
            setTab('all');
            setFilters({ ...NO_FILTERS, visit: true });
            setMore(true);
            setPage(1);
          }}
        />
        <Tile
          icon="✓"
          tone="green"
          label="Converted this month"
          value={summary?.convertedThisMonth ?? '…'}
          trend={summary && <Trend value={summary.convertedTrend} />}
          onClick={() => goTab('converted')}
        />
      </div>

      <section className="card enquiry-card">
        <div className="tabs-line" role="tablist">
          {tabs.map(([key, label]) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={tab === key}
              className={tab === key ? 'on' : ''}
              onClick={() => goTab(key)}
            >
              {label}
              {summary ? <span className="count">{summary.tabs[key]}</span> : null}
            </button>
          ))}
        </div>

        <div className="toolbar">
          <label className="search-field">
            <span aria-hidden="true">⌕</span>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search name, phone or ID…"
              aria-label="Search enquiries"
            />
          </label>
          <select value={filters.classId} onChange={setFilter('classId')} aria-label="Grade">
            <option value="">Grade: All grades</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}-{c.section}
              </option>
            ))}
          </select>
          <select value={filters.stage} onChange={setFilter('stage')} aria-label="Status">
            <option value="">Status: All</option>
            {STAGES.map(([k, l]) => (
              <option key={k} value={k}>
                {l}
              </option>
            ))}
          </select>
          <button
            type="button"
            className={`ghost${activeFilters ? ' on' : ''}`}
            onClick={() => setMore(!more)}
            aria-expanded={more}
          >
            ☷ Filters{activeFilters > 0 && ` (${activeFilters})`}
          </button>
          <span className="showing">
            Showing{' '}
            <b>
              {first}–{last}
            </b>{' '}
            of <b>{data.total}</b>
          </span>
        </div>

        {more && (
          <div className="toolbar filter-panel">
            <label>
              Source
              <select value={filters.source} onChange={setFilter('source')}>
                <option value="">All sources</option>
                {SOURCES.map(([k, l]) => (
                  <option key={k} value={k}>
                    {l}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Received from
              <input type="date" value={filters.from} onChange={setFilter('from')} />
            </label>
            <label>
              Received to
              <input type="date" value={filters.to} onChange={setFilter('to')} />
            </label>
            <label className="inline">
              <input type="checkbox" checked={filters.visit} onChange={setFilter('visit')} /> Visit scheduled
            </label>
            <button
              type="button"
              className="ghost"
              onClick={() => {
                setFilters(NO_FILTERS);
                setPage(1);
              }}
            >
              Clear filters
            </button>
          </div>
        )}

        <div className="table-scroll">
          <table className="enquiry-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Child</th>
                <th>Grade applying</th>
                <th>Parent / guardian</th>
                <th>Contact</th>
                <th>Enquiry date</th>
                <th>Source</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {data.rows.map((r) => (
                <tr key={r.id}>
                  <td className="muted-cell">
                    {r.deletedAt ? (
                      r.enquiryId
                    ) : (
                      <button
                        type="button"
                        className="id-link"
                        title="Open all details"
                        onClick={() => setDetails(r)}
                      >
                        {r.enquiryId}
                      </button>
                    )}
                  </td>
                  <td>
                    <span className="person">
                      <PersonThumb id={r.id} entity="enquiry" has={r.hasPhoto} name={r.applicantName} />
                      <span>
                        <b>{r.applicantName}</b>
                        {r.followUpOn && OPEN.includes(r.status) && (
                          <small className="block">
                            Follow up {date(r.followUpOn)}
                            {r.followUpTypeLabel && ` · ${r.followUpTypeLabel}`}
                          </small>
                        )}
                        {r.assignedToName && <small className="block">Assigned to {r.assignedToName}</small>}
                        {r.visitOn && OPEN.includes(r.status) && (
                          <small className="block">Visit {date(r.visitOn)}</small>
                        )}
                      </span>
                    </span>
                  </td>
                  <td>{r.className ?? <span className="none">Not chosen</span>}</td>
                  <td>{r.guardianName}</td>
                  <td>
                    {r.guardianPhone}
                    {r.email && <small className="block">{r.email}</small>}
                  </td>
                  <td>{date(r.enquiryDate)}</td>
                  <td>{r.sourceLabel}</td>
                  <td>
                    <span className={`badge ${PILL[r.stageLabel]}`}>● {r.stageLabel}</span>
                  </td>
                  <td className="row-actions">
                    {r.deletedAt ? (
                      <>
                        <button type="button" className="ghost" onClick={() => restore(r)}>
                          Restore
                        </button>
                        <button type="button" className="ghost danger" onClick={() => purge(r)}>
                          Delete permanently
                        </button>
                      </>
                    ) : (
                      <>
                        {r.status === 'enquiry' && (
                          <button
                            type="button"
                            title="Start the student application for this enquiry"
                            onClick={() => nav(`/applications/${r.id}`)}
                          >
                            Apply
                          </button>
                        )}
                        <button
                          type="button"
                          className="ghost"
                          title="Edit enquiry"
                          onClick={() => {
                            setError('');
                            setEntry({ kind: 'enquiry', id: r.id });
                          }}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="ghost danger"
                          title="Delete enquiry"
                          onClick={() => remove(r)}
                        >
                          Delete
                        </button>
                      </>
                    )}
                    {!r.deletedAt && r.status === 'approved' && (
                      <button type="button" onClick={() => enroll(r)}>
                        Enroll
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {!data.rows.length && (
                <tr>
                  <td colSpan={9} className="empty-row">
                    {narrowed
                      ? 'No enquiries match these filters.'
                      : 'No enquiries yet. Add the first with “New enquiry”.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <Pagination page={page} pageSize={PAGE_SIZE} total={data.total} onChange={setPage} />
      </section>

      <Modal open={Boolean(details)} title="Enquiry details" onClose={() => setDetails(null)}>
        {details && (
          <AdmissionDetails
            row={details}
            onEdit={(id) => {
              setDetails(null);
              setError('');
              setEntry({ kind: 'enquiry', id });
            }}
          />
        )}
      </Modal>

      <Modal
        open={entry?.kind === 'enquiry'}
        title={entry?.id ? 'Edit enquiry' : 'New enquiry'}
        onClose={() => setEntry(null)}
      >
        {entry?.kind === 'enquiry' && (
          <EnquiryForm
            id={entry.id}
            onCancel={() => setEntry(null)}
            onSaved={(r) => {
              setEntry(null);
              setNotice((r.created ? 'Enquiry added.' : 'Enquiry updated.') + (r.photoNote ?? ''));
              refresh();
            }}
          />
        )}
      </Modal>

      <Modal open={entry?.kind === 'full'} title="Full application details" onClose={() => setEntry(null)}>
        {entry?.kind === 'full' && (
          <AdmissionForm
            embedded
            id={entry.id}
            onCancel={() => setEntry(null)}
            onSaved={() => {
              setEntry(null);
              setNotice('Enquiry updated.');
              refresh();
            }}
          />
        )}
      </Modal>
    </>
  );
}
