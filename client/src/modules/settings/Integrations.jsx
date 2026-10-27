import { useEffect, useState } from 'react';
import { api } from '../../services/api.js';
import Modal from '../../components/Modal.jsx';

function Tile({ icon, tone, label, value, hint }) {
  return (
    <div className="tile card">
      <span className={`tile-icon ${tone}`} aria-hidden="true">{icon}</span>
      <span className="tile-text"><span>{label}</span><b>{value}</b>{hint && <small>{hint}</small>}</span>
    </div>
  );
}

function Checks({ title, live, checks, extra }) {
  return (
    <section className="card enquiry-card">
      <header className="card-head" style={{ padding: '22px 22px 14px', marginBottom: 0 }}>
        <span><h2>{title} <span className={`badge ${live ? 'paid' : 'partial'}`}>● {live ? 'live' : 'not delivering'}</span></h2>{extra && <small>{extra}</small>}</span>
      </header>
      <div className="table-scroll">
        <table className="enquiry-table">
          <thead><tr><th>Setting</th><th>State</th></tr></thead>
          <tbody>
            {Object.entries(checks).map(([k, ok]) => <tr key={k}><td><code>{k}</code></td><td>{ok ? '✓ set' : '✗ not set'}</td></tr>)}
          </tbody>
        </table>
      </div>
    </section>
  );
}

/** Whether email and SMS delivery are configured, plus a way to send a test message. */
export default function Integrations() {
  const [d, setD] = useState(null);
  const [test, setTest] = useState({ channel: 'email', to: '' });
  const [entry, setEntry] = useState(false);
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => { api('/integrations').then(setD).catch((e) => setError(e.message)); }, []);

  const send = async (e) => {
    e.preventDefault();
    setError(''); setResult(null); setBusy(true);
    try { setResult(await api('/integrations/test', { method: 'POST', body: test })); } catch (err) { setError(err.message); } finally { setBusy(false); }
  };
  const openTest = () => { setError(''); setResult(null); setEntry(true); };

  if (!d) return error ? <p className="error">{error}</p> : <p>Loading…</p>;
  return (
    <>
      <div className="profile-head">
        <div>
          <h1>Integrations</h1>
          <p className="hint">Delivery services are configured in <code>server/.env</code> (credentials are never shown here or sent to the browser). Restart the server after changing it. Until a service is live, messages are only recorded in the history and are <b>not delivered</b>.</p>
        </div>
        <div className="head-actions"><button type="button" className="big-action" onClick={openTest}>Send a test message</button></div>
      </div>
      {error && !entry && <p className="error" role="alert">{error}</p>}

      <div className="stats enquiry-tiles four">
        <Tile icon="✉" tone={d.email.live ? 'green' : 'amber'} label="Email (SMTP)" value={d.email.live ? 'Live' : 'Not delivering'} hint={d.email.host || null} />
        <Tile icon="☏" tone={d.sms.live ? 'green' : 'amber'} label="SMS (Twilio)" value={d.sms.live ? 'Live' : 'Not delivering'} />
        <Tile icon="+" tone="blue" label="Default country code" value={d.defaultCountryCode ?? 'not set'} />
        <Tile icon="▤" tone="violet" label="Allowed origins" value={d.clientOrigins.length || 'Any'} hint="CLIENT_ORIGIN" />
      </div>

      <Checks title="Email (SMTP)" live={d.email.live} checks={d.email.checks} extra={d.email.host && `Server: ${d.email.host}`} />
      <Checks title="SMS (Twilio)" live={d.sms.live} checks={d.sms.checks} />
      <section className="card enquiry-card" style={{ padding: 22 }}>
        <p>Default country code for phone numbers: <b>{d.defaultCountryCode ?? 'not set'}</b>. Numbers without a country code are rejected unless this is set.</p>
        <p>Allowed browser origins (<code>CLIENT_ORIGIN</code>): {d.clientOrigins.length ? d.clientOrigins.join(', ') : 'any (not restricted)'}</p>
      </section>

      <Modal open={entry} title="Send a test message" wide={false} onClose={() => setEntry(false)}>
        <form onSubmit={send} className="enquiry-form">
          {error && <p className="error" role="alert">{error}</p>}
          <div className="enq-grid">
            <label><span>Channel</span><select value={test.channel} onChange={(e) => setTest({ ...test, channel: e.target.value })}><option value="email">Email</option><option value="sms">SMS</option></select></label>
            <label><span>{test.channel === 'email' ? 'Email address' : 'Phone (with country code)'} *</span><input value={test.to} onChange={(e) => setTest({ ...test, to: e.target.value })} required /></label>
          </div>
          {result && (
            <p className={result.status === 'sent' ? 'success' : result.status === 'failed' ? 'error' : 'hint'}>
              {result.status === 'sent' && 'Delivered to the provider.'}
              {result.status === 'logged' && 'Recorded only: this channel is not live, so nothing was sent.'}
              {result.status === 'failed' && `Failed: ${result.error}`}
            </p>
          )}
          <div className="form-actions"><button type="submit" disabled={busy}>{busy ? 'Sending…' : 'Send test'}</button><button type="button" className="ghost" onClick={() => setEntry(false)}>Close</button></div>
        </form>
      </Modal>
    </>
  );
}
