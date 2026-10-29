import { useCallback, useEffect, useState } from 'react';
import { api } from '../../services/api.js';
import { useAuth } from '../../context/AuthContext.jsx';
import Modal from '../../components/Modal.jsx';

const DAYS = [
  ['mon', 'Monday'],
  ['tue', 'Tuesday'],
  ['wed', 'Wednesday'],
  ['thu', 'Thursday'],
  ['fri', 'Friday'],
  ['sat', 'Saturday'],
  ['sun', 'Sunday'],
];
const MEALS = ['breakfast', 'lunch', 'snacks', 'dinner'];
const EMPTY = { day: 'mon', meal: 'breakfast', items: '' };
const todayKey = () => DAYS[(new Date().getDay() + 6) % 7][0];

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

/** The weekly mess menu of each hostel. Saving a day and meal again replaces what was there. */
export default function MessMenu() {
  const canWrite = useAuth().user?.role === 'admin';
  const [hostels, setHostels] = useState([]);
  const [hostelId, setHostelId] = useState('');
  const [meals, setMeals] = useState([]);
  const [entry, setEntry] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    if (!hostelId) {
      setMeals([]);
      return;
    }
    api(`/hostel/meals?hostelId=${hostelId}`)
      .then(setMeals)
      .catch((e) => setError(e.message));
  }, [hostelId]);
  useEffect(() => {
    api('/hostel/hostels')
      .then((h) => {
        setHostels(h);
        if (h[0]) setHostelId((id) => id || String(h[0].id));
      })
      .catch((e) => setError(e.message));
  }, []);
  useEffect(load, [load]);

  const cell = (day, meal) => meals.find((m) => m.day === day && m.meal === meal);
  const pick = (day, meal) => setForm({ day, meal, items: cell(day, meal)?.items ?? '' });
  const openEntry = (day = 'mon', meal = 'breakfast') => {
    setError('');
    pick(day, meal);
    setEntry(true);
  };

  const save = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await api('/hostel/meals', { method: 'POST', body: { ...form, hostelId } });
      setEntry(false);
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };
  const remove = async (m) => {
    try {
      await api(`/hostel/meals/${m.id}`, { method: 'DELETE' });
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const planned = meals.length;
  const today = todayKey();
  const todays = MEALS.filter((m) => cell(today, m)).length;

  return (
    <>
      <div className="profile-head">
        <div>
          <h1>Mess management</h1>
          <p className="hint">
            The weekly menu for each hostel. Saving a day and meal again replaces what was there.
          </p>
        </div>
        <div className="head-actions">
          <select
            value={hostelId}
            onChange={(e) => setHostelId(e.target.value)}
            aria-label="Hostel"
            style={{ minHeight: 44 }}
          >
            {hostels.map((h) => (
              <option key={h.id} value={h.id}>
                {h.name}
              </option>
            ))}
          </select>
          {canWrite && hostelId && (
            <button type="button" className="big-action" onClick={() => openEntry()}>
              + Add meal
            </button>
          )}
        </div>
      </div>
      {error && !entry && (
        <p className="error" role="alert">
          {error}
        </p>
      )}

      <div className="stats enquiry-tiles four">
        <Tile
          icon="▤"
          tone="blue"
          label="Meals planned"
          value={planned}
          hint={`of ${DAYS.length * MEALS.length} in the week`}
        />
        <Tile icon="✓" tone="green" label="Today's meals" value={todays} hint={`of ${MEALS.length}`} />
        <Tile icon="◷" tone="amber" label="Gaps in the week" value={DAYS.length * MEALS.length - planned} />
        <Tile icon="▣" tone="violet" label="Hostels" value={hostels.length} />
      </div>

      <section className="card enquiry-card">
        <div className="table-scroll">
          <table className="enquiry-table">
            <thead>
              <tr>
                <th>Day</th>
                {MEALS.map((m) => (
                  <th key={m} style={{ textTransform: 'capitalize' }}>
                    {m}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {DAYS.map(([d, label]) => (
                <tr key={d}>
                  <td>
                    <b>{label}</b>
                    {d === today && (
                      <span className="badge paid" style={{ marginLeft: 6 }}>
                        today
                      </span>
                    )}
                  </td>
                  {MEALS.map((meal) => {
                    const m = cell(d, meal);
                    return (
                      <td key={meal}>
                        {m ? (
                          <>
                            {m.items}
                            {canWrite && (
                              <small className="block">
                                <button type="button" className="link" onClick={() => openEntry(d, meal)}>
                                  Edit
                                </button>{' '}
                                ·{' '}
                                <button type="button" className="link" onClick={() => remove(m)}>
                                  Remove
                                </button>
                              </small>
                            )}
                          </>
                        ) : canWrite ? (
                          <button type="button" className="link" onClick={() => openEntry(d, meal)}>
                            + Add
                          </button>
                        ) : (
                          '—'
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
              {!hostelId && (
                <tr>
                  <td colSpan={5} className="empty-row">
                    Add a hostel first.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <Modal open={entry} title="Mess menu" wide={false} onClose={() => setEntry(false)}>
        <form onSubmit={save} className="enquiry-form">
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          <div className="enq-grid">
            <label>
              <span>Day</span>
              <select value={form.day} onChange={(e) => pick(e.target.value, form.meal)}>
                {DAYS.map(([d, l]) => (
                  <option key={d} value={d}>
                    {l}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>Meal</span>
              <select value={form.meal} onChange={(e) => pick(form.day, e.target.value)}>
                {MEALS.map((m) => (
                  <option key={m}>{m}</option>
                ))}
              </select>
            </label>
            <label className="wide">
              <span>Items *</span>
              <input
                value={form.items}
                onChange={(e) => setForm({ ...form, items: e.target.value })}
                required
                maxLength={200}
                placeholder="e.g. Poha, tea"
              />
            </label>
          </div>
          <div className="form-actions">
            <button type="submit" disabled={busy}>
              {busy ? 'Saving…' : 'Save'}
            </button>
            <button type="button" className="ghost" onClick={() => setEntry(false)}>
              Cancel
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}
