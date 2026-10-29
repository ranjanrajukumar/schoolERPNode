import { useCallback, useEffect, useState } from 'react';
import Gate from '../../components/Gate.jsx';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../../services/api.js';
import Modal from '../../components/Modal.jsx';
import Pagination from '../../components/Pagination.jsx';
import { useOpenNew } from '../../hooks/useOpenNew.js';
import { useAuth } from '../../context/AuthContext.jsx';

const PAGE_SIZE = 25;
const KINDS = [
  ['event', 'Event'],
  ['celebration', 'Celebration'],
  ['competition', 'Competition'],
  ['sport', 'Sport'],
  ['field_trip', 'Field trip'],
  ['club', 'Club'],
];
const KIND_LABEL = Object.fromEntries(KINDS);
const STATUS_BADGE = { planned: 'partial', open: 'paid', completed: '', cancelled: 'rejected' };
const TABS = [
  ['', 'All'],
  ['planned', 'Planned'],
  ['open', 'Open'],
  ['completed', 'Completed'],
  ['cancelled', 'Cancelled'],
];
const EMPTY = {
  kind: 'event',
  title: '',
  venue: '',
  startDate: '',
  endDate: '',
  classId: '',
  capacity: '',
  fee: '',
  organizer: '',
  description: '',
};

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

/** Plan school activities, register students, record who took part and their results. */
export default function Activities() {
  const { user } = useAuth();
  const canWrite = ['admin', 'teacher'].includes(user?.role);
  const [params, setParams] = useSearchParams();
  const kind = params.get('kind') ?? '';
  const status = params.get('status') ?? '';
  const [rows, setRows] = useState([]);
  const [classes, setClasses] = useState([]);
  const [form, setForm] = useState({ ...EMPTY, kind: kind || 'event' });
  const [entry, setEntry] = useState(false);
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    const q = new URLSearchParams(Object.entries({ kind, status }).filter(([, v]) => v));
    api(`/activities?${q}`)
      .then(setRows)
      .catch((e) => setError(e.message));
  }, [kind, status]);
  useEffect(() => {
    api('/classes').then(setClasses);
  }, []);
  useEffect(load, [load]);
  useEffect(() => {
    if (kind) setForm((f) => ({ ...f, kind }));
  }, [kind]);
  useOpenNew(() => setEntry(true), canWrite);

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });
  const setFilter = (key, value) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next);
    setPage(1);
  };

  const create = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await api('/activities', { method: 'POST', body: form });
      setForm({ ...EMPTY, kind: form.kind });
      setEntry(false);
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const move = async (a, next) => {
    setError('');
    try {
      await api(`/activities/${a.id}/status`, { method: 'POST', body: { status: next } });
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const remove = async (a) => {
    try {
      await api(`/activities/${a.id}`, { method: 'DELETE' });
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const title = kind ? `${KIND_LABEL[kind]}s` : 'School activities';
  const needle = q.trim().toLowerCase();
  const shown = rows.filter(
    (a) =>
      !needle ||
      `${a.title} ${a.venue ?? ''} ${a.className ?? ''} ${a.kindLabel}`.toLowerCase().includes(needle),
  );
  const pageRows = shown.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const countOf = (s) => rows.filter((a) => a.status === s).length;
  const registered = rows.reduce((n, a) => n + Number(a.registered ?? 0), 0);

  return (
    <>
      <div className="profile-head">
        <div>
          <h1>{title}</h1>
          <p className="hint">
            Plan an activity, register students, record who took part and their results. Field trips ask
            parents for consent in the portal.
          </p>
        </div>
        {canWrite && (
          <div className="head-actions">
            <button
              type="button"
              className="big-action"
              onClick={() => {
                setError('');
                setEntry(true);
              }}
            >
              + Add {KIND_LABEL[form.kind].toLowerCase()}
            </button>
          </div>
        )}
      </div>
      {error && !entry && (
        <p className="error" role="alert">
          {error}
        </p>
      )}

      <div className="stats enquiry-tiles four">
        <Tile icon="▤" tone="blue" label="Activities" value={rows.length} />
        <Tile icon="◷" tone="amber" label="Planned" value={countOf('planned')} />
        <Tile icon="✓" tone="green" label="Open for registration" value={countOf('open')} />
        <Tile icon="♙" tone="violet" label="Students registered" value={registered} />
      </div>

      <section className="card enquiry-card">
        <div className="tabs-line" role="tablist">
          {TABS.map(([k, l]) => (
            <button
              key={k || 'all'}
              type="button"
              role="tab"
              aria-selected={status === k}
              className={status === k ? 'on' : ''}
              onClick={() => setFilter('status', k)}
            >
              {l}
              {status === k && <span className="count">{rows.length}</span>}
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
              placeholder="Search activity, venue or class…"
              aria-label="Search activities"
            />
          </label>
          <select value={kind} onChange={(e) => setFilter('kind', e.target.value)} aria-label="Type">
            <option value="">All types</option>
            {KINDS.map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
          <span className="showing">{shown.length} activities</span>
        </div>
        <div className="table-scroll">
          <table className="enquiry-table">
            <thead>
              <tr>
                <th>Activity</th>
                <th>When</th>
                <th>For</th>
                <th>Registered</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {pageRows.map((a) => (
                <tr key={a.id}>
                  <td>
                    <b>{a.title}</b>
                    <small className="block">
                      {a.kindLabel}
                      {a.venue && ` · ${a.venue}`}
                      {Number(a.fee) > 0 && ` · fee ${a.fee}`}
                    </small>
                  </td>
                  <td>
                    {a.startDate}
                    {a.endDate !== a.startDate && ` → ${a.endDate}`}
                  </td>
                  <td>{a.className ?? 'Whole school'}</td>
                  <td>
                    {a.registered}
                    {a.capacity && ` / ${a.capacity}`}
                    {a.requiresConsent && a.consentPending > 0 && (
                      <small className="block error">{a.consentPending} consent pending</small>
                    )}
                    {a.status !== 'planned' && a.registered > 0 && (
                      <small className="block">{a.attended} attended</small>
                    )}
                  </td>
                  <td>
                    <span className={`badge ${STATUS_BADGE[a.status]}`}>● {a.status}</span>
                  </td>
                  <td className="row-actions">
                    <Link className="btn" to={`/activities/${a.id}`}>
                      {canWrite ? 'Manage' : 'View'}
                    </Link>
                    {canWrite &&
                      a.nextStatuses.map((s) => (
                        <button key={s} type="button" className="ghost" onClick={() => move(a, s)}>
                          {
                            {
                              open: 'Open',
                              planned: 'Back to planned',
                              completed: 'Complete',
                              cancelled: 'Cancel',
                            }[s]
                          }
                        </button>
                      ))}
                    {canWrite && a.status !== 'completed' && (
                      <Gate action="delete">
                        <button type="button" className="ghost" onClick={() => remove(a)}>
                          Delete
                        </button>
                      </Gate>
                    )}
                  </td>
                </tr>
              ))}
              {!pageRows.length && (
                <tr>
                  <td colSpan={6} className="empty-row">
                    {needle || kind || status ? 'No activities match.' : 'Nothing here yet.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <Pagination page={page} pageSize={PAGE_SIZE} total={shown.length} onChange={setPage} />
      </section>

      {canWrite && (
        <Modal
          open={entry}
          title={`Add ${KIND_LABEL[form.kind].toLowerCase()}`}
          onClose={() => setEntry(false)}
        >
          <form onSubmit={create} className="enquiry-form">
            {error && (
              <p className="error" role="alert">
                {error}
              </p>
            )}
            <div className="enq-grid">
              <label>
                <span>Type</span>
                <select value={form.kind} onChange={set('kind')}>
                  {KINDS.map(([v, l]) => (
                    <option key={v} value={v}>
                      {l}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span>Title *</span>
                <input value={form.title} onChange={set('title')} required />
              </label>
              <label>
                <span>Venue</span>
                <input value={form.venue} onChange={set('venue')} />
              </label>
              <label>
                <span>Teacher in charge</span>
                <input value={form.organizer} onChange={set('organizer')} />
              </label>
              <label>
                <span>From *</span>
                <input type="date" value={form.startDate} onChange={set('startDate')} required />
              </label>
              <label>
                <span>To (blank = one day)</span>
                <input type="date" value={form.endDate} onChange={set('endDate')} />
              </label>
              <label>
                <span>Only for class</span>
                <select value={form.classId} onChange={set('classId')}>
                  <option value="">Whole school</option>
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}-{c.section}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span>Places (blank = unlimited)</span>
                <input type="number" min="1" value={form.capacity} onChange={set('capacity')} />
              </label>
              <label>
                <span>Fee per student</span>
                <input type="number" min="0" step="0.01" value={form.fee} onChange={set('fee')} />
              </label>
              <label className="wide">
                <span>Details</span>
                <input value={form.description} onChange={set('description')} />
              </label>
            </div>
            <div className="form-actions">
              <button type="submit" disabled={busy}>
                {busy ? 'Saving…' : `Add ${KIND_LABEL[form.kind].toLowerCase()}`}
              </button>
              <button type="button" className="ghost" onClick={() => setEntry(false)}>
                Cancel
              </button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
