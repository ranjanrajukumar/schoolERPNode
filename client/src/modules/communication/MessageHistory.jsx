import { useEffect, useState } from 'react';
import { api } from '../../services/api.js';
import Pagination from '../../components/Pagination.jsx';

const PAGE_SIZE = 25;
const BADGE = { sent: 'paid', logged: 'partial', failed: 'rejected' };
const LABEL = { sent: 'delivered', logged: 'recorded only', failed: 'failed' };
const KINDS = {
  direct: 'Direct',
  broadcast: 'Broadcast',
  absence: 'Absence alert',
  fee_reminder: 'Fee reminder',
};
const TABS = [
  ['all', 'All'],
  ['sent', 'Delivered'],
  ['logged', 'Recorded only'],
  ['failed', 'Failed'],
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

/** Every email and SMS the system sent or tried to send (latest 300). */
export default function MessageHistory() {
  const [rows, setRows] = useState(null);
  const [filter, setFilter] = useState({ channel: '', kind: '' });
  const [tab, setTab] = useState('all');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [error, setError] = useState('');

  useEffect(() => {
    const p = new URLSearchParams(Object.entries(filter).filter(([, v]) => v)).toString();
    api(`/messaging/history${p ? `?${p}` : ''}`)
      .then(setRows)
      .catch((e) => setError(e.message));
  }, [filter]);
  const set = (key) => (e) => {
    setFilter({ ...filter, [key]: e.target.value });
    setPage(1);
  };

  const all = rows ?? [];
  const count = (k) => (k === 'all' ? all.length : all.filter((m) => m.status === k).length);
  const needle = q.trim().toLowerCase();
  const shown = all.filter(
    (m) =>
      (tab === 'all' || m.status === tab) &&
      (!needle ||
        `${m.recipientName ?? ''} ${m.recipient} ${m.subject ?? ''} ${m.body}`
          .toLowerCase()
          .includes(needle)),
  );
  const pageRows = shown.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <>
      <div className="profile-head">
        <div>
          <h1>Communication history</h1>
          <p className="hint">
            Every email and SMS the system sent or tried to send (latest 300). "Recorded only" means no
            provider was configured, so nothing was delivered.
          </p>
        </div>
      </div>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}

      <div className="stats enquiry-tiles four">
        <Tile icon="✉" tone="blue" label="Messages" value={all.length} />
        <Tile icon="✓" tone="green" label="Delivered" value={count('sent')} />
        <Tile icon="◷" tone="amber" label="Recorded only" value={count('logged')} />
        <Tile icon="×" tone="red" label="Failed" value={count('failed')} />
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
              placeholder="Search recipient or message…"
              aria-label="Search messages"
            />
          </label>
          <select value={filter.channel} onChange={set('channel')} aria-label="Channel">
            <option value="">All channels</option>
            <option value="sms">SMS</option>
            <option value="email">Email</option>
          </select>
          <select value={filter.kind} onChange={set('kind')} aria-label="Type">
            <option value="">All types</option>
            {Object.entries(KINDS).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
          <span className="showing">{shown.length} messages</span>
        </div>
        <div className="table-scroll">
          <table className="enquiry-table">
            <thead>
              <tr>
                <th>When</th>
                <th>To</th>
                <th>Type</th>
                <th>Message</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {pageRows.map((m) => (
                <tr key={m.id} className={m.status === 'failed' ? 'failed' : ''}>
                  <td>
                    {new Date(m.createdAt).toLocaleString()}
                    <small className="block">{m.sentByName}</small>
                  </td>
                  <td>
                    {m.recipientName && <b>{m.recipientName}</b>}
                    <small className="block">
                      {m.channel.toUpperCase()} · {m.recipient}
                    </small>
                  </td>
                  <td>{KINDS[m.kind]}</td>
                  <td>
                    {m.subject && (
                      <b>
                        {m.subject}
                        <br />
                      </b>
                    )}
                    {m.body}
                  </td>
                  <td>
                    <span className={`badge ${BADGE[m.status]}`}>● {LABEL[m.status]}</span>
                    {m.error && <small className="block">{m.error}</small>}
                  </td>
                </tr>
              ))}
              {rows && !pageRows.length && (
                <tr>
                  <td colSpan={5} className="empty-row">
                    {needle || tab !== 'all' ? 'No messages match.' : 'No messages yet.'}
                  </td>
                </tr>
              )}
              {!rows && (
                <tr>
                  <td colSpan={5} className="empty-row">
                    Loading…
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <Pagination page={page} pageSize={PAGE_SIZE} total={shown.length} onChange={setPage} />
      </section>
    </>
  );
}
