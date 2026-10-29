import { useEffect, useState } from 'react';
import { api } from '../../services/api.js';
import PushToggle from '../../components/PushToggle.jsx';
import { useAuth } from '../../context/AuthContext.jsx';

const AUDIENCES = [
  ['staff', 'All staff'],
  ['parents', 'All parents'],
  ['students', 'All students'],
  ['everyone', 'Everyone'],
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

/** Push notifications: each person turns them on per device; admins can send one to an audience. */
export default function PushNotifications() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin' && !user?.customRole;
  const [form, setForm] = useState({ audience: 'parents', title: '', body: '', url: '' });
  const [size, setSize] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!isAdmin) return;
    setSize(null);
    api(`/push/audience?audience=${form.audience}`)
      .then(setSize)
      .catch(() => {});
  }, [form.audience, isAdmin]);

  const send = async (e) => {
    e.preventDefault();
    setError('');
    setResult(null);
    setBusy(true);
    try {
      setResult(await api('/push/send', { method: 'POST', body: { ...form, url: form.url || undefined } }));
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  return (
    <>
      <div className="profile-head">
        <div>
          <h1>Push notifications</h1>
          <p className="hint">
            Short alerts that pop up on a phone or computer, even when School ERP is not open. Each person
            turns them on once per device. They work over https (or on localhost) and need the person's
            permission.
          </p>
        </div>
      </div>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {result && (
        <p className={result.failed ? 'error' : 'success'}>
          {result.delivered} of {result.devices} device(s) delivered
          {result.failed > 0 && `, ${result.failed} failed`}
          {result.removed > 0 && `, ${result.removed} expired device(s) removed`}.
        </p>
      )}

      {isAdmin && (
        <div className="stats enquiry-tiles four">
          <Tile
            icon="▣"
            tone="blue"
            label="Devices reachable"
            value={size ? size.devices : '—'}
            hint={AUDIENCES.find(([v]) => v === form.audience)?.[1]}
          />
          <Tile icon="♙" tone="green" label="People reachable" value={size ? size.people : '—'} />
          <Tile
            icon="✓"
            tone="violet"
            label="Last send: delivered"
            value={result ? result.delivered : '—'}
            hint={result ? `of ${result.devices} device(s)` : null}
          />
          <Tile icon="×" tone="red" label="Last send: failed" value={result ? result.failed : '—'} />
        </div>
      )}

      <section className="card enquiry-card">
        <header className="card-head" style={{ padding: '22px 22px 14px', marginBottom: 0 }}>
          <span>
            <h2>Notifications on this device</h2>
            <small>Turn alerts on or off for this browser</small>
          </span>
        </header>
        <div style={{ padding: '0 22px 22px' }}>
          <PushToggle />
        </div>
      </section>

      {isAdmin && (
        <section className="card enquiry-card">
          <header className="card-head" style={{ padding: '22px 22px 14px', marginBottom: 0 }}>
            <span>
              <h2>Send a notification</h2>
              <small>
                {size
                  ? `${size.devices} device(s) belonging to ${size.people} people have notifications on.`
                  : 'Choose who should receive it.'}
                {size?.devices === 0 && ' Nobody can receive it yet.'}
              </small>
            </span>
          </header>
          <form onSubmit={send} className="enquiry-form" style={{ padding: '0 22px 22px' }}>
            <div className="enq-grid">
              <label>
                <span>To</span>
                <select value={form.audience} onChange={set('audience')}>
                  {AUDIENCES.map(([v, l]) => (
                    <option key={v} value={v}>
                      {l}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span>Title *</span>
                <input value={form.title} onChange={set('title')} required maxLength={80} />
              </label>
              <label className="wide">
                <span>Message *</span>
                <textarea rows={3} value={form.body} onChange={set('body')} required maxLength={300} />
              </label>
              <label className="wide">
                <span>Open this page when tapped (optional)</span>
                <input value={form.url} onChange={set('url')} placeholder="/notices" />
              </label>
            </div>
            <div className="form-actions" style={{ marginTop: 18 }}>
              <button type="submit" data-sure disabled={busy || size?.devices === 0}>
                {busy ? 'Sending…' : 'Send'}
              </button>
            </div>
          </form>
        </section>
      )}
    </>
  );
}
