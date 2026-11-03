import { useCallback, useEffect, useState } from 'react';
import Modal from '../../components/Modal.jsx';
import { api } from '../../services/api.js';

const EMPTY = {
  visitorName: '',
  phone: '',
  organisation: '',
  purpose: '',
  whomToMeet: '',
  idProof: '',
  badgeNo: '',
  note: '',
};
const SHOW = [
  ['today', 'Today'],
  ['inside', 'Still inside'],
  ['all', 'All'],
];
const when = (d) =>
  d
    ? new Date(d).toLocaleString([], { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
    : '';

function Tile({ icon, tone, label, value }) {
  return (
    <div className="tile card">
      <span className={`tile-icon ${tone}`} aria-hidden="true">
        {icon}
      </span>
      <span className="tile-text">
        <span>{label}</span>
        <b>{value}</b>
      </span>
    </div>
  );
}

/** The front-office visitor log: who came, why, whom they met, and when they came in and left. */
export default function VisitorRecords() {
  const [show, setShow] = useState('today');
  const [q, setQ] = useState('');
  const [rows, setRows] = useState([]);
  const [form, setForm] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const load = useCallback(() => {
    const params = new URLSearchParams({ show, ...(q.trim() && { q: q.trim() }) });
    api(`/visitors?${params}`)
      .then(setRows)
      .catch((e) => setError(e.message));
  }, [show, q]);
  useEffect(load, [load]);

  const checkIn = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await api('/visitors', { method: 'POST', body: form });
      setNotice(`${form.visitorName} checked in.`);
      setForm(null);
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const checkOut = async (v) => {
    setError('');
    try {
      await api(`/visitors/${v.id}/checkout`, { method: 'PUT' });
      setNotice(`${v.visitorName} checked out.`);
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const inside = rows.filter((r) => !r.checkOut).length;
  const field = (key, label, props = {}) => (
    <label>
      <span>{label}</span>
      <input value={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} {...props} />
    </label>
  );

  return (
    <>
      <div className="profile-head">
        <div>
          <h1>Visitor records</h1>
          <p className="hint">
            Check visitors in at the gate or reception and out when they leave. Note the ID that was shown
            (kind and last digits, not a copy).
          </p>
        </div>
        <div className="head-actions">
          <button
            type="button"
            className="big-action"
            onClick={() => {
              setError('');
              setForm(EMPTY);
            }}
          >
            + Check in a visitor
          </button>
        </div>
      </div>
      {notice && <p className="success">{notice}</p>}
      {error && !form && (
        <p className="error" role="alert">
          {error}
        </p>
      )}

      <div className="stats enquiry-tiles four">
        <Tile
          icon="▤"
          tone="blue"
          label={show === 'today' ? 'Visitors today' : 'Shown'}
          value={rows.length}
        />
        <Tile icon="●" tone="amber" label="Still inside" value={inside} />
      </div>

      <section className="card enquiry-card">
        <div className="toolbar">
          <div className="tabs-line" role="tablist">
            {SHOW.map(([v, text]) => (
              <button
                key={v}
                type="button"
                role="tab"
                aria-selected={show === v}
                className={`tab${show === v ? ' active' : ''}`}
                onClick={() => setShow(v)}
              >
                {text}
              </button>
            ))}
          </div>
          <label className="search-field">
            <span aria-hidden="true">⌕</span>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search name, phone, purpose…"
              aria-label="Search visitors"
            />
          </label>
        </div>
        <div className="table-scroll">
          <table className="enquiry-table">
            <thead>
              <tr>
                <th>Visitor</th>
                <th>Purpose</th>
                <th>To meet</th>
                <th>ID shown</th>
                <th>Badge</th>
                <th>In</th>
                <th>Out</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map((v) => (
                <tr key={v.id}>
                  <td>
                    <b>{v.visitorName}</b>
                    {(v.phone || v.organisation) && (
                      <small style={{ display: 'block' }}>
                        {[v.phone, v.organisation].filter(Boolean).join(' · ')}
                      </small>
                    )}
                  </td>
                  <td>{v.purpose}</td>
                  <td>{v.whomToMeet ?? '—'}</td>
                  <td>{v.idProof ?? '—'}</td>
                  <td>{v.badgeNo ?? '—'}</td>
                  <td>{when(v.checkIn)}</td>
                  <td>{v.checkOut ? when(v.checkOut) : <span className="badge partial">inside</span>}</td>
                  <td className="row-actions">
                    {!v.checkOut && (
                      <button type="button" className="ghost" onClick={() => checkOut(v)}>
                        Check out
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {!rows.length && (
                <tr>
                  <td colSpan={8} className="empty-row">
                    {q ? 'No visitors match.' : show === 'inside' ? 'Nobody is inside.' : 'No visitors yet.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <Modal open={Boolean(form)} title="Check in a visitor" onClose={() => setForm(null)}>
        {form && (
          <form onSubmit={checkIn} className="enquiry-form">
            {error && (
              <p className="error" role="alert">
                {error}
              </p>
            )}
            <div className="enq-grid">
              {field('visitorName', 'Visitor name *', { required: true, maxLength: 100 })}
              {field('phone', 'Phone', { type: 'tel', maxLength: 30 })}
              {field('organisation', 'Company / organisation', { maxLength: 120 })}
              {field('purpose', 'Purpose of the visit *', { required: true, maxLength: 200 })}
              {field('whomToMeet', 'Whom to meet', { maxLength: 120 })}
              {field('idProof', 'ID shown (kind and last digits)', {
                maxLength: 80,
                placeholder: 'e.g. Aadhaar ending 4521',
              })}
              {field('badgeNo', 'Visitor badge no', { maxLength: 20 })}
              {field('note', 'Note', { maxLength: 300 })}
            </div>
            <div className="form-actions">
              <button type="submit" disabled={busy}>
                {busy ? 'Saving…' : 'Check in'}
              </button>
              <button type="button" className="ghost" onClick={() => setForm(null)}>
                Cancel
              </button>
            </div>
          </form>
        )}
      </Modal>
    </>
  );
}
