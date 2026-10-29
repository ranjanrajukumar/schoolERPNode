import { useCallback, useEffect, useState } from 'react';
import { api } from '../../services/api.js';
import Modal from '../../components/Modal.jsx';
import Pagination from '../../components/Pagination.jsx';
import { GrievanceLadder, Timeline } from '../../components/GrievanceLadder.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useOpenNew } from '../../hooks/useOpenNew.js';

const PAGE_SIZE = 25;
const STATUS = {
  open: ['partial', 'Open'],
  in_progress: ['applied', 'In progress'],
  resolved: ['paid', 'Resolved'],
  closed: ['', 'Closed'],
};
const TABS = [
  ['all', 'All'],
  ['open', 'Open'],
  ['in_progress', 'In progress'],
  ['resolved', 'Resolved'],
  ['closed', 'Closed'],
];
const EMPTY = { kind: 'grievance', category: '', subject: '', details: '', rating: '', anonymous: false };
const date = (d) =>
  d ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
const stars = (n) => (n ? '★'.repeat(n) + '☆'.repeat(5 - n) : '');

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

/**
 * Feedback and grievances. A grievance climbs a ladder: class teacher or department head, then the school office, then the principal.
 * Whoever it is with can reply or escalate; an admin can act at any level; anyone sees what they sent themselves.
 */
export default function Feedback() {
  const isAdmin = useAuth().user?.role === 'admin';
  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState({ levels: [], escalateAfterDays: 0 });
  const [categories, setCategories] = useState([]);
  const [tab, setTab] = useState('all');
  const [kind, setKind] = useState('');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [form, setForm] = useState(null); // a new item
  const [open, setOpen] = useState(null); // { id, status, priority, response, escalateNote } of the item being handled
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  useOpenNew(() => openNew()); // eslint-disable-line no-use-before-define

  const load = useCallback(() => {
    api('/feedback')
      .then(setRows)
      .catch((e) => setError(e.message));
  }, []);
  useEffect(() => {
    load();
    api('/feedback/categories')
      .then(setCategories)
      .catch(() => {});
    api('/feedback/meta')
      .then(setMeta)
      .catch(() => {});
  }, [load]);

  const openNew = () => {
    setError('');
    setNotice('');
    setForm(EMPTY);
  };
  const send = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const out = await api('/feedback', { method: 'POST', body: form });
      setNotice(`Sent to ${out.levelLabel}. Your reference is ${out.ticketNo}.`);
      setForm(null);
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };
  const item = open && rows.find((r) => r.id === open.id);
  const show = (r) => {
    setError('');
    setOpen({
      id: r.id,
      status: r.status,
      priority: r.priority,
      response: r.response ?? '',
      escalateNote: '',
    });
  };
  const answer = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await api(`/feedback/${open.id}`, {
        method: 'PUT',
        body: { status: open.status, priority: open.priority, response: open.response },
      });
      setNotice('Saved. The sender has been notified.');
      setOpen(null);
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };
  const escalate = async () => {
    setBusy(true);
    setError('');
    try {
      await api(`/feedback/${open.id}/escalate`, { method: 'POST', body: { note: open.escalateNote } });
      setNotice('Escalated to the next level. The sender and the next level have been notified.');
      setOpen(null);
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const count = (k) => (k === 'all' ? rows.length : rows.filter((r) => r.status === k).length);
  const needle = q.trim().toLowerCase();
  const shown = rows.filter(
    (r) =>
      (tab === 'all' || r.status === tab) &&
      (!kind || r.kind === kind) &&
      (!needle ||
        `${r.ticketNo} ${r.subject} ${r.category} ${r.submittedByName} ${r.studentName ?? ''}`
          .toLowerCase()
          .includes(needle)),
  );
  const pageRows = shown.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const rated = rows.filter((r) => r.rating);
  const average = rated.length ? rated.reduce((s, r) => s + r.rating, 0) / rated.length : null;
  const live = rows.filter((r) => r.kind === 'grievance' && !['resolved', 'closed'].includes(r.status));
  const withLevel = (n) => live.filter((r) => r.level === n).length;

  return (
    <>
      <div className="profile-head">
        <div>
          <h1>Feedback &amp; grievance</h1>
          <p className="hint">
            Send feedback or raise a grievance. Whoever it is with replies; a grievance that is not settled
            moves up the ladder below.
          </p>
        </div>
        <div className="head-actions">
          <button type="button" className="big-action" onClick={openNew}>
            ＋ {isAdmin ? 'Record' : 'Send'} feedback / grievance
          </button>
        </div>
      </div>
      {notice && <p className="success">{notice}</p>}
      {error && !form && !open && (
        <p className="error" role="alert">
          {error}
        </p>
      )}

      <section className="card ladder-card">
        <h2>How a grievance is handled</h2>
        <GrievanceLadder levels={meta.levels} level={0} />
        <div className="ladder-counts">
          {meta.levels.map((l) => (
            <span key={l.level}>
              <b>{withLevel(l.level)}</b> waiting at {l.short}
            </span>
          ))}
        </div>
        <p className="hint">
          It starts with the student&apos;s class teacher (or the department head, for a staff member&apos;s
          grievance). If it is not settled it goes to the school office, then the principal.
          {meta.escalateAfterDays > 0
            ? ` One nobody has answered for ${meta.escalateAfterDays} day${meta.escalateAfterDays === 1 ? '' : 's'} moves up by itself.`
            : ' Automatic escalation is off.'}{' '}
          Whoever has it can also escalate it with a reason. Feedback (suggestions and praise) goes straight
          to the office.
        </p>
      </section>

      <div className="stats enquiry-tiles four">
        <Tile icon="◷" tone="amber" label="Open" value={count('open')} />
        <Tile icon="➤" tone="blue" label="In progress" value={count('in_progress')} />
        <Tile icon="!" tone="red" label="Grievances not settled" value={live.length} />
        <Tile
          icon="★"
          tone="green"
          label="Average rating"
          value={average === null ? '—' : average.toFixed(1)}
          hint={rated.length ? `${rated.length} rated` : undefined}
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
              placeholder="Search reference, subject or sender…"
              aria-label="Search"
            />
          </label>
          <select
            value={kind}
            onChange={(e) => {
              setKind(e.target.value);
              setPage(1);
            }}
            aria-label="Type"
          >
            <option value="">Feedback and grievances</option>
            <option value="feedback">Feedback</option>
            <option value="grievance">Grievances</option>
          </select>
          <span className="showing">{shown.length} items</span>
        </div>
        <div className="table-scroll">
          <table className="enquiry-table">
            <thead>
              <tr>
                <th>Reference</th>
                <th>Type</th>
                <th>Subject</th>
                <th>From</th>
                <th>Received</th>
                <th>With</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {pageRows.map((r) => (
                <tr key={r.id}>
                  <td>
                    <b>{r.ticketNo}</b>
                  </td>
                  <td>
                    {r.kind === 'grievance' ? (
                      <span className="badge rejected">● Grievance</span>
                    ) : (
                      <span className="badge applied">● Feedback</span>
                    )}
                    {r.priority === 'high' && r.kind === 'grievance' && (
                      <small className="block">high priority</small>
                    )}
                  </td>
                  <td>
                    <b>{r.subject}</b>
                    <small className="block">
                      {r.category}
                      {r.rating ? ` · ${stars(r.rating)}` : ''}
                    </small>
                    <small className="block">
                      {r.details.length > 120 ? `${r.details.slice(0, 120)}…` : r.details}
                    </small>
                  </td>
                  <td>
                    {r.submittedByName}
                    {r.submittedByRole && (
                      <small className="block" style={{ textTransform: 'capitalize' }}>
                        {r.submittedByRole}
                        {r.studentName ? ` of ${r.studentName}` : ''}
                        {r.className ? ` · ${r.className}` : ''}
                      </small>
                    )}
                  </td>
                  <td>{date(r.createdAt)}</td>
                  <td>
                    <span className={`level-pill l${r.level}`}>
                      {meta.levels.find((l) => l.level === r.level)?.short}
                    </span>
                    <small className="block">{r.levelLabel}</small>
                  </td>
                  <td>
                    <span className={`badge ${STATUS[r.status][0]}`}>● {STATUS[r.status][1]}</span>
                  </td>
                  <td className="row-actions">
                    <button type="button" className={r.canAct ? '' : 'ghost'} onClick={() => show(r)}>
                      {r.canAct ? (r.status === 'open' ? 'Handle' : 'Update') : 'View'}
                    </button>
                  </td>
                </tr>
              ))}
              {!pageRows.length && (
                <tr>
                  <td colSpan={8} className="empty-row">
                    {needle || tab !== 'all' || kind ? 'Nothing matches.' : 'Nothing yet.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <Pagination page={page} pageSize={PAGE_SIZE} total={shown.length} onChange={setPage} />
      </section>

      <Modal open={Boolean(form)} title="Feedback / grievance" wide={false} onClose={() => setForm(null)}>
        {form && (
          <form onSubmit={send} className="enquiry-form">
            {error && (
              <p className="error" role="alert">
                {error}
              </p>
            )}
            <div className="enq-grid">
              <label>
                <span>Type *</span>
                <select value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value })}>
                  <option value="grievance">Grievance (a complaint)</option>
                  <option value="feedback">Feedback (suggestion or praise)</option>
                </select>
              </label>
              <label>
                <span>Category *</span>
                <select
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  required
                >
                  <option value="">Choose</option>
                  {categories.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </label>
              <label className="wide">
                <span>Subject *</span>
                <input
                  value={form.subject}
                  onChange={(e) => setForm({ ...form, subject: e.target.value })}
                  required
                  maxLength={150}
                />
              </label>
              <label className="wide">
                <span>Details *</span>
                <textarea
                  rows={5}
                  value={form.details}
                  onChange={(e) => setForm({ ...form, details: e.target.value })}
                  required
                  maxLength={3000}
                />
              </label>
              {form.kind === 'feedback' && (
                <label>
                  <span>Rating</span>
                  <select value={form.rating} onChange={(e) => setForm({ ...form, rating: e.target.value })}>
                    <option value="">No rating</option>
                    {[5, 4, 3, 2, 1].map((n) => (
                      <option key={n} value={n}>
                        {stars(n)}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              <label className="check wide">
                <input
                  type="checkbox"
                  checked={form.anonymous}
                  onChange={(e) => setForm({ ...form, anonymous: e.target.checked })}
                />{' '}
                <span>Keep my name from the school office (you can still follow the reply)</span>
              </label>
            </div>
            <div className="form-actions">
              <button type="submit" disabled={busy}>
                {busy ? 'Sending…' : 'Send'}
              </button>
              <button type="button" className="ghost" onClick={() => setForm(null)}>
                Cancel
              </button>
            </div>
          </form>
        )}
      </Modal>

      <Modal
        open={Boolean(item)}
        title={item ? `${item.ticketNo}: ${item.subject}` : ''}
        onClose={() => setOpen(null)}
      >
        {item && open && (
          <div className="enquiry-form">
            {error && (
              <p className="error" role="alert">
                {error}
              </p>
            )}
            {item.kind === 'grievance' && (
              <GrievanceLadder
                levels={meta.levels}
                level={item.level}
                settled={['resolved', 'closed'].includes(item.status)}
              />
            )}
            <p>
              <b>{item.category}</b> · {item.submittedByName}
              {item.studentName ? ` (about ${item.studentName})` : ''} · {date(item.createdAt)}
            </p>
            <p style={{ whiteSpace: 'pre-wrap' }}>{item.details}</p>
            <h4>History</h4>
            <Timeline items={item.timeline} />
            {item.canAct ? (
              <form onSubmit={answer}>
                <div className="enq-grid">
                  <label>
                    <span>Status</span>
                    <select
                      value={open.status}
                      onChange={(e) => setOpen({ ...open, status: e.target.value })}
                    >
                      {Object.entries(STATUS).map(([v, [, l]]) => (
                        <option key={v} value={v}>
                          {l}
                        </option>
                      ))}
                    </select>
                  </label>
                  {isAdmin && (
                    <label>
                      <span>Priority</span>
                      <select
                        value={open.priority}
                        onChange={(e) => setOpen({ ...open, priority: e.target.value })}
                      >
                        <option value="low">Low</option>
                        <option value="normal">Normal</option>
                        <option value="high">High</option>
                      </select>
                    </label>
                  )}
                  <label className="wide">
                    <span>Response to the sender</span>
                    <textarea
                      rows={4}
                      value={open.response}
                      onChange={(e) => setOpen({ ...open, response: e.target.value })}
                      maxLength={3000}
                    />
                  </label>
                </div>
                <p className="hint">
                  A response is required to resolve or close. The sender gets a notification and sees it in
                  their portal.
                </p>
                <div className="form-actions">
                  <button type="submit" disabled={busy}>
                    {busy ? 'Saving…' : 'Save'}
                  </button>
                  <button type="button" className="ghost" onClick={() => setOpen(null)}>
                    Close
                  </button>
                </div>
                {item.canEscalate && (
                  <div className="escalate-box">
                    <h4>
                      Not settled? Escalate to {meta.levels.find((l) => l.level === item.level + 1)?.label}
                    </h4>
                    <label className="wide">
                      <span>Why is it being escalated? *</span>
                      <input
                        value={open.escalateNote}
                        onChange={(e) => setOpen({ ...open, escalateNote: e.target.value })}
                        maxLength={500}
                      />
                    </label>
                    <button
                      type="button"
                      className="ghost danger"
                      onClick={escalate}
                      disabled={busy || !open.escalateNote.trim()}
                    >
                      Escalate
                    </button>
                  </div>
                )}
              </form>
            ) : (
              <div className="form-actions">
                <span className="hint">
                  {['resolved', 'closed'].includes(item.status)
                    ? 'This item is settled.'
                    : `It is with ${item.levelLabel}.`}
                </span>
                <button type="button" className="ghost" onClick={() => setOpen(null)}>
                  Close
                </button>
              </div>
            )}
          </div>
        )}
      </Modal>
    </>
  );
}
