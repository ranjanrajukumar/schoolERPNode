import { useCallback, useEffect, useState } from 'react';
import { api } from '../../services/api.js';
import Modal from '../../components/Modal.jsx';
import Pagination from '../../components/Pagination.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useOpenNew } from '../../hooks/useOpenNew.js';
import { localDate } from '../../utils/dates.js';

const PAGE_SIZE = 25;
const TABS = [
  ['punches', 'Punches'],
  ['devices', 'Devices'],
];
const today = () => localDate();
const time = (d) =>
  new Date(d).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
const EMPTY = { name: '', serialNo: '', location: '' };

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

/** Device-integrated attendance: card, fingerprint and face readers post punches here and the matched students are marked present. */
export default function BiometricAttendance() {
  const isAdmin = useAuth().user?.role === 'admin';
  const [tab, setTab] = useState('punches');
  const [date, setDate] = useState(today());
  const [devices, setDevices] = useState([]);
  const [punches, setPunches] = useState([]);
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [form, setForm] = useState(null);
  const [shownKey, setShownKey] = useState(null); // { name, apiKey } of a device whose key was just issued
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  useOpenNew(() => openNew(), isAdmin); // eslint-disable-line no-use-before-define

  const loadDevices = useCallback(() => {
    api('/biometric/devices')
      .then(setDevices)
      .catch((e) => setError(e.message));
  }, []);
  useEffect(loadDevices, [loadDevices]);
  useEffect(() => {
    let live = true;
    setPage(1);
    api(`/biometric/punches?date=${date}`)
      .then((r) => {
        if (live) setPunches(r);
      })
      .catch((e) => {
        if (live) setError(e.message);
      });
    return () => {
      live = false;
    };
  }, [date]);

  const openNew = () => {
    setError('');
    setNotice('');
    setForm(EMPTY);
  };
  const run = async (fn, message) => {
    setError('');
    setNotice('');
    try {
      const out = await fn();
      if (message) setNotice(message);
      loadDevices();
      return out;
    } catch (err) {
      setError(err.message);
      return null;
    }
  };
  const create = async (e) => {
    e.preventDefault();
    setBusy(true);
    const out = await run(() => api('/biometric/devices', { method: 'POST', body: form }));
    if (out) {
      setShownKey({ name: form.name, apiKey: out.apiKey });
      setForm(null);
    }
    setBusy(false);
  };
  const rotate = async (d) => {
    const out = await run(() => api(`/biometric/devices/${d.id}/rotate-key`, { method: 'POST' }));
    if (out) setShownKey({ name: d.name, apiKey: out.apiKey });
  };
  const toggle = (d) =>
    run(
      () =>
        api(`/biometric/devices/${d.id}`, {
          method: 'PUT',
          body: { status: d.status === 'active' ? 'inactive' : 'active' },
        }),
      d.status === 'active' ? 'Device switched off.' : 'Device switched on.',
    );
  const remove = (d) => run(() => api(`/biometric/devices/${d.id}`, { method: 'DELETE' }), 'Device deleted.');

  const needle = q.trim().toLowerCase();
  const shown = punches.filter(
    (p) => !needle || `${p.name ?? ''} ${p.enrollId} ${p.device ?? ''}`.toLowerCase().includes(needle),
  );
  const pageRows = shown.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const matched = punches.filter((p) => p.studentId);
  const endpoint = `${window.location.origin}/api/device/punch`;

  return (
    <>
      <div className="profile-head">
        <div>
          <h1>Biometric attendance</h1>
          <p className="hint">
            Readers send each punch here; a student whose admission number matches is marked present, with the
            first punch of the day as the arrival time. Enrol students on the reader using their admission
            number.
          </p>
        </div>
        <div className="head-actions">
          <input
            type="date"
            value={date}
            max={today()}
            onChange={(e) => setDate(e.target.value || today())}
            aria-label="Date"
            style={{ minHeight: 44 }}
          />
          {isAdmin && (
            <button type="button" className="big-action" onClick={openNew}>
              ＋ Add device
            </button>
          )}
        </div>
      </div>
      {notice && <p className="success">{notice}</p>}
      {error && !form && (
        <p className="error" role="alert">
          {error}
        </p>
      )}

      <div className="stats enquiry-tiles four">
        <Tile icon="◉" tone="blue" label="Devices" value={devices.length} />
        <Tile icon="✓" tone="green" label="Online now" value={devices.filter((d) => d.online).length} />
        <Tile
          icon="☝"
          tone="violet"
          label="Students punched"
          value={new Set(matched.map((p) => p.studentId)).size}
          hint={date === today() ? 'today' : date}
        />
        <Tile
          icon="!"
          tone="red"
          label="Unknown cards"
          value={punches.length - matched.length}
          hint="no matching student"
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
              onClick={() => setTab(k)}
            >
              {l}
              <span className="count">{k === 'punches' ? punches.length : devices.length}</span>
            </button>
          ))}
        </div>

        {tab === 'punches' && (
          <>
            <div className="toolbar">
              <label className="search-field">
                <span aria-hidden="true">⌕</span>
                <input
                  value={q}
                  onChange={(e) => {
                    setQ(e.target.value);
                    setPage(1);
                  }}
                  placeholder="Search student, card id or device…"
                  aria-label="Search punches"
                />
              </label>
              <span className="showing">{shown.length} punches</span>
            </div>
            <div className="table-scroll">
              <table className="enquiry-table">
                <thead>
                  <tr>
                    <th>Time</th>
                    <th>Student</th>
                    <th>Card / admission no</th>
                    <th>Device</th>
                  </tr>
                </thead>
                <tbody>
                  {pageRows.map((p) => (
                    <tr key={p.id}>
                      <td>{time(p.punchedAt)}</td>
                      <td>
                        {p.name ? <b>{p.name}</b> : <span className="badge rejected">● not matched</span>}
                      </td>
                      <td>{p.enrollId}</td>
                      <td>{p.device}</td>
                    </tr>
                  ))}
                  {!pageRows.length && (
                    <tr>
                      <td colSpan={4} className="empty-row">
                        {needle ? 'No punches match.' : 'No punches on this date.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <Pagination page={page} pageSize={PAGE_SIZE} total={shown.length} onChange={setPage} />
          </>
        )}

        {tab === 'devices' && (
          <div className="table-scroll">
            <table className="enquiry-table">
              <thead>
                <tr>
                  <th>Device</th>
                  <th>Serial no</th>
                  <th>Location</th>
                  <th>Status</th>
                  <th>Last seen</th>
                  <th>Punches today</th>
                  {isAdmin && <th />}
                </tr>
              </thead>
              <tbody>
                {devices.map((d) => (
                  <tr key={d.id}>
                    <td>
                      <b>{d.name}</b>
                    </td>
                    <td>{d.serialNo}</td>
                    <td>{d.location ?? '—'}</td>
                    <td>
                      {d.status === 'inactive' ? (
                        <span className="badge rejected">● off</span>
                      ) : d.online ? (
                        <span className="badge paid">● online</span>
                      ) : (
                        <span className="badge partial">● offline</span>
                      )}
                    </td>
                    <td>{d.lastSeenAt ? new Date(d.lastSeenAt).toLocaleString() : 'never'}</td>
                    <td>{d.punchesToday}</td>
                    {isAdmin && (
                      <td className="row-actions">
                        <button type="button" className="ghost" onClick={() => toggle(d)}>
                          {d.status === 'active' ? 'Switch off' : 'Switch on'}
                        </button>
                        <button
                          type="button"
                          className="ghost"
                          onClick={() => setShownKey({ name: d.name, apiKey: d.apiKey })}
                        >
                          Show key
                        </button>
                        <button type="button" className="ghost" onClick={() => rotate(d)}>
                          New key
                        </button>
                        <button type="button" className="ghost danger" onClick={() => remove(d)}>
                          Delete
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
                {!devices.length && (
                  <tr>
                    <td colSpan={isAdmin ? 7 : 6} className="empty-row">
                      No devices yet.{isAdmin ? ' Add the first with “Add device”.' : ''}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {isAdmin && (
        <section className="card">
          <h2 style={{ marginTop: 0 }}>Connecting a reader</h2>
          <p className="hint">
            Have the reader (or its gateway software) send an HTTPS POST for every punch:
          </p>
          <pre style={{ overflowX: 'auto', margin: 0 }}>{`POST ${endpoint}
x-device-key: <the device key>
{ "enrollId": "ADM-1024", "time": "2026-10-26T08:12:40+05:30" }`}</pre>
          <p className="hint">
            Send <code>{'{ "punches": [ … ] }'}</code> to upload a batch (up to 500). <code>time</code> is
            optional and defaults to now. A repeated punch is ignored, so a reader may safely resend.
          </p>
        </section>
      )}

      <Modal open={Boolean(form)} title="Add biometric device" wide={false} onClose={() => setForm(null)}>
        {form && (
          <form onSubmit={create} className="enquiry-form">
            {error && (
              <p className="error" role="alert">
                {error}
              </p>
            )}
            <div className="enq-grid">
              <label>
                <span>Name *</span>
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Main gate reader"
                  required
                  maxLength={80}
                />
              </label>
              <label>
                <span>Serial number *</span>
                <input
                  value={form.serialNo}
                  onChange={(e) => setForm({ ...form, serialNo: e.target.value })}
                  required
                  maxLength={60}
                />
              </label>
              <label>
                <span>Location</span>
                <input
                  value={form.location}
                  onChange={(e) => setForm({ ...form, location: e.target.value })}
                  placeholder="Gate 1"
                  maxLength={120}
                />
              </label>
            </div>
            <div className="form-actions">
              <button type="submit" disabled={busy}>
                {busy ? 'Saving…' : 'Add device'}
              </button>
              <button type="button" className="ghost" onClick={() => setForm(null)}>
                Cancel
              </button>
            </div>
          </form>
        )}
      </Modal>

      <Modal
        open={Boolean(shownKey)}
        title={`Device key · ${shownKey?.name ?? ''}`}
        wide={false}
        onClose={() => setShownKey(null)}
      >
        {shownKey && (
          <div className="enquiry-form">
            <p className="hint">
              Enter this key on the reader as the <code>x-device-key</code> header. Anyone holding it can send
              punches, so keep it private.
            </p>
            <input
              readOnly
              value={shownKey.apiKey ?? ''}
              onFocus={(e) => e.target.select()}
              aria-label="Device key"
              style={{ width: '100%', fontFamily: 'monospace' }}
            />
            <div className="form-actions">
              <button type="button" onClick={() => navigator.clipboard?.writeText(shownKey.apiKey)}>
                Copy key
              </button>
              <button type="button" className="ghost" onClick={() => setShownKey(null)}>
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
