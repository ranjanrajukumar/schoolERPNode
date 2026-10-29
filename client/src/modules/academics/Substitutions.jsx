import { useCallback, useEffect, useState } from 'react';
import { api } from '../../services/api.js';
import Pagination from '../../components/Pagination.jsx';
import { localDate } from '../../utils/dates.js';

const PAGE_SIZE = 25;
const today = () => localDate();
const date = (d) =>
  d
    ? new Date(`${String(d).slice(0, 10)}T00:00:00`).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : '—';
const TABS = [
  ['open', 'Needs cover'],
  ['covered', 'Covered'],
  ['history', 'Cover arranged'],
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

/** Periods of teachers on approved leave, and who covers them. */
export default function Substitutions() {
  const [dateOn, setDate] = useState(today());
  const [needed, setNeeded] = useState([]);
  const [history, setHistory] = useState([]);
  const [free, setFree] = useState({}); // slotId -> teachers who can cover
  const [pick, setPick] = useState({});
  const [tab, setTab] = useState('open');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setError('');
    try {
      const rows = await api(`/scheduling/substitutions/needed?date=${dateOn}`);
      setNeeded(rows);
      const lists = {};
      await Promise.all(
        rows
          .filter((r) => !r.substitution)
          .map(async (r) => {
            lists[r.slotId] = await api(`/scheduling/substitutions/free?date=${dateOn}&period=${r.period}`);
          }),
      );
      setFree(lists);
    } catch (err) {
      setError(err.message);
      setNeeded([]);
    }
    api('/scheduling/substitutions')
      .then(setHistory)
      .catch(() => {});
  }, [dateOn]);
  useEffect(() => {
    load();
  }, [load]);

  const run = async (fn) => {
    setError('');
    try {
      await fn();
      load();
    } catch (err) {
      setError(err.message);
    }
  };
  const assign = (r) =>
    run(() =>
      api('/scheduling/substitutions', {
        method: 'POST',
        body: {
          slotId: r.slotId,
          date: dateOn,
          substituteId: pick[r.slotId],
          reason: 'Teacher on approved leave',
        },
      }),
    );

  const openRows = needed.filter((r) => !r.substitution);
  const coveredRows = needed.filter((r) => r.substitution);
  const count = (k) =>
    k === 'open' ? openRows.length : k === 'covered' ? coveredRows.length : history.length;
  const needle = q.trim().toLowerCase();
  const match = (r) =>
    !needle ||
    `${r.className} ${r.subjectName} ${r.teacherName} ${r.substitution?.substituteName ?? r.substituteName ?? ''}`
      .toLowerCase()
      .includes(needle);
  const shown = (tab === 'open' ? openRows : tab === 'covered' ? coveredRows : history).filter(match);
  const pageRows = shown.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const goTab = (t) => {
    setTab(t);
    setPage(1);
  };

  return (
    <>
      <div className="profile-head">
        <div>
          <h1>Substitution management</h1>
          <p className="hint">
            Shows the periods of teachers on approved leave on the chosen date. Only teachers who are free in
            that period (no lesson, no other cover, not on leave) can be chosen.
          </p>
        </div>
        <div className="head-actions">
          <input
            type="date"
            value={dateOn}
            min={today()}
            onChange={(e) => setDate(e.target.value)}
            aria-label="Date"
            style={{ minHeight: 44 }}
          />
        </div>
      </div>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}

      <div className="stats enquiry-tiles four">
        <Tile icon="♙" tone="blue" label="Periods needing cover" value={needed.length} hint={date(dateOn)} />
        <Tile icon="◷" tone="amber" label="Still to arrange" value={openRows.length} />
        <Tile icon="✓" tone="green" label="Covered" value={coveredRows.length} />
        <Tile icon="▤" tone="violet" label="Cover arranged (30 days)" value={history.length} />
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
              onClick={() => goTab(k)}
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
              placeholder="Search class, subject or teacher…"
              aria-label="Search periods"
            />
          </label>
          <span className="showing">{shown.length} periods</span>
        </div>
        <div className="table-scroll">
          {tab !== 'history' ? (
            <table className="enquiry-table">
              <thead>
                <tr>
                  <th>Period</th>
                  <th>Class</th>
                  <th>Subject</th>
                  <th>Absent teacher</th>
                  <th>Cover</th>
                </tr>
              </thead>
              <tbody>
                {pageRows.map((r) => (
                  <tr key={r.slotId}>
                    <td>{r.period}</td>
                    <td>{r.className}</td>
                    <td>{r.subjectName}</td>
                    <td>{r.teacherName}</td>
                    <td className="row-actions">
                      {r.substitution ? (
                        <>
                          <span className="badge paid">● {r.substitution.substituteName}</span>
                          <button
                            type="button"
                            className="ghost"
                            onClick={() =>
                              run(() =>
                                api(`/scheduling/substitutions/${r.substitution.id}`, { method: 'DELETE' }),
                              )
                            }
                          >
                            Remove
                          </button>
                        </>
                      ) : (
                        <>
                          <select
                            value={pick[r.slotId] ?? ''}
                            onChange={(e) => setPick({ ...pick, [r.slotId]: e.target.value })}
                            aria-label="Free teacher"
                          >
                            <option value="">-- free teachers ({free[r.slotId]?.length ?? 0}) --</option>
                            {(free[r.slotId] ?? []).map((t) => (
                              <option key={t.id} value={t.id}>
                                {t.name}
                              </option>
                            ))}
                          </select>
                          <button type="button" disabled={!pick[r.slotId]} onClick={() => assign(r)}>
                            Assign
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
                {!pageRows.length && (
                  <tr>
                    <td colSpan={5} className="empty-row">
                      {needle
                        ? 'No periods match.'
                        : tab === 'open' && needed.length
                          ? 'Every period has cover.'
                          : 'No periods need cover on this date (no teacher on approved leave has lessons that day).'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          ) : (
            <table className="enquiry-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Period</th>
                  <th>Class</th>
                  <th>Subject</th>
                  <th>Usual teacher</th>
                  <th>Covered by</th>
                </tr>
              </thead>
              <tbody>
                {pageRows.map((h) => (
                  <tr key={h.id}>
                    <td>{date(h.date)}</td>
                    <td>{h.period}</td>
                    <td>{h.className}</td>
                    <td>{h.subjectName}</td>
                    <td>{h.teacherName}</td>
                    <td>
                      <b>{h.substituteName}</b>
                    </td>
                  </tr>
                ))}
                {!pageRows.length && (
                  <tr>
                    <td colSpan={6} className="empty-row">
                      {needle ? 'No cover matches.' : 'No cover arranged yet.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
        <Pagination page={page} pageSize={PAGE_SIZE} total={shown.length} onChange={setPage} />
      </section>
    </>
  );
}
