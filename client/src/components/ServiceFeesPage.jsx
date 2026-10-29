import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api.js';

const money = (n) =>
  Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const monthLabel = (m) =>
  new Date(`${m}-01T00:00:00`).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });

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
 * The monthly fee run for a service (hostel or transport): bills everyone who uses it their room's or route's monthly fee. The
 * bills appear in Fees & payments and are collected like any other fee; running a month twice never bills twice.
 * `people` is the list of users with their monthly fee, `generatePath` the API that bills them.
 */
export default function ServiceFeesPage({ title, who, hint, listPath, generatePath, button }) {
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [dueDate, setDueDate] = useState('');
  const [people, setPeople] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api(listPath)
      .then(setPeople)
      .catch(() => setPeople([]));
  }, [listPath]);

  const total = (people ?? []).reduce((n, p) => n + Number(p.monthlyFee ?? 0), 0);
  const generate = async (e) => {
    e.preventDefault();
    setError('');
    setResult(null);
    setBusy(true);
    try {
      setResult(await api(generatePath, { method: 'POST', body: { month, dueDate: dueDate || undefined } }));
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <div className="profile-head">
        <div>
          <h1>{title}</h1>
          <p className="hint">{hint}</p>
        </div>
      </div>

      <div className="stats enquiry-tiles four">
        <Tile
          icon="♙"
          tone="blue"
          label={`Students ${who === 'boarders' ? 'in the hostel' : 'on transport'}`}
          value={people?.length ?? '…'}
        />
        <Tile
          icon="▣"
          tone="violet"
          label="Billed each month"
          value={people ? money(total) : '…'}
          hint="if everyone is billed"
        />
        <Tile icon="◷" tone="amber" label="Month" value={monthLabel(month)} />
        <Tile
          icon="✓"
          tone="green"
          label="Last run"
          value={result ? `${result.created} billed` : '—'}
          hint={result ? `${result.skipped} already billed` : 'Not run in this visit'}
        />
      </div>

      <section className="card">
        <form onSubmit={generate} className="enquiry-form">
          <div className="enq-grid">
            <label>
              <span>Month *</span>
              <input
                type="month"
                value={month}
                onChange={(e) => e.target.value && setMonth(e.target.value)}
                required
              />
            </label>
            <label>
              <span>Due date</span>
              <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </label>
          </div>
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          {result && (
            <p className="success">
              &quot;{result.title}&quot;: {result.created} bill(s) created, {result.skipped} already billed.{' '}
              <Link to="/fees">Open Fees &amp; payments</Link>
            </p>
          )}
          <div className="form-actions" style={{ position: 'static', borderTop: 0 }}>
            <button type="submit" data-sure disabled={busy || !people?.length}>
              {busy ? 'Billing…' : button}
            </button>
            {people && !people.length && <span className="hint">Nobody to bill yet.</span>}
          </div>
        </form>
      </section>
    </>
  );
}
