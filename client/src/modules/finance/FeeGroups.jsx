import { useCallback, useEffect, useState } from 'react';
import { api } from '../../services/api.js';
import Modal from '../../components/Modal.jsx';
import { useOpenNew } from '../../hooks/useOpenNew.js';

const EMPTY_GROUP = { name: '', description: '' };
const EMPTY_ITEM = { title: '', amount: '', dueDate: '' };
const money = (n) =>
  Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

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

/** Fee groups: reusable bundles of fee items that can be applied to a class (and billed to its students). */
export default function FeeGroups() {
  const [groups, setGroups] = useState([]);
  const [classes, setClasses] = useState([]);
  const [form, setForm] = useState(EMPTY_GROUP);
  const [entry, setEntry] = useState(false);
  const [itemFor, setItemFor] = useState(null); // the group an item is being added to
  const [itemForm, setItemForm] = useState(EMPTY_ITEM);
  const [apply, setApply] = useState({});
  const [q, setQ] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    api('/fee-groups')
      .then(setGroups)
      .catch((e) => setError(e.message));
  }, []);
  useEffect(() => {
    load();
    api('/classes').then(setClasses);
  }, [load]);
  useOpenNew(() => {
    setForm(EMPTY_GROUP);
    setEntry(true);
  });

  const run = async (fn, message) => {
    setError('');
    setNotice('');
    try {
      const r = await fn();
      if (message) setNotice(message(r));
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const create = async (e) => {
    e.preventDefault();
    setError('');
    setNotice('');
    setBusy(true);
    try {
      await api('/fee-groups', { method: 'POST', body: form });
      setEntry(false);
      setForm(EMPTY_GROUP);
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };
  const addItem = async (e) => {
    e.preventDefault();
    setError('');
    setNotice('');
    setBusy(true);
    try {
      await api(`/fee-groups/${itemFor.id}/items`, { method: 'POST', body: itemForm });
      setItemFor(null);
      setItemForm(EMPTY_ITEM);
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };
  const applyTo = (g) => {
    const a = apply[g.id] ?? {};
    if (!a.classId) {
      setError('Choose a class to apply the group to');
      return;
    }
    run(
      () => api(`/fee-groups/${g.id}/apply`, { method: 'POST', body: a }),
      (r) =>
        `Fee structure: ${r.structureAdded} added, ${r.structureSkipped} already there.${a.bill ? ` Billed ${r.billed} fee item(s) across ${r.students} student(s); ${r.alreadyBilled} were already billed.` : ''}`,
    );
  };

  const needle = q.trim().toLowerCase();
  const shown = groups.filter(
    (g) =>
      !needle ||
      `${g.name} ${g.description ?? ''} ${g.items.map((i) => i.title).join(' ')}`
        .toLowerCase()
        .includes(needle),
  );
  const itemCount = groups.reduce((n, g) => n + g.items.length, 0);
  const grand = groups.reduce((n, g) => n + g.total, 0);
  const largest = groups.reduce((m, g) => (g.total > (m?.total ?? -1) ? g : m), null);

  return (
    <>
      <div className="profile-head">
        <div>
          <h1>Fee groups</h1>
          <p className="hint">
            A fee group is a reusable bundle of fee items. Applying it to a class adds the items to that
            class's fee structure (so new admissions are billed) and can bill the current students too.
            Nothing is ever billed twice.
          </p>
        </div>
        <div className="head-actions">
          <button
            type="button"
            className="big-action"
            onClick={() => {
              setError('');
              setForm(EMPTY_GROUP);
              setEntry(true);
            }}
          >
            + New group
          </button>
        </div>
      </div>
      {error && !entry && !itemFor && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {notice && <p className="success">{notice}</p>}

      <div className="stats enquiry-tiles four">
        <Tile icon="▤" tone="blue" label="Fee groups" value={groups.length} />
        <Tile icon="≡" tone="violet" label="Fee items" value={itemCount} />
        <Tile icon="▣" tone="green" label="Combined total" value={money(grand)} />
        <Tile
          icon="↑"
          tone="amber"
          label="Largest group"
          value={largest ? money(largest.total) : '—'}
          hint={largest?.name}
        />
      </div>

      <section className="card enquiry-card">
        <div className="toolbar">
          <label className="search-field">
            <span aria-hidden="true">⌕</span>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search group or item…"
              aria-label="Search fee groups"
            />
          </label>
          <span className="showing">{shown.length} groups</span>
        </div>
      </section>

      {shown.map((g) => {
        const a = apply[g.id] ?? { classId: '', bill: false };
        return (
          <section className="card enquiry-card" key={g.id}>
            <header className="card-head" style={{ padding: '22px 22px 14px', marginBottom: 0 }}>
              <span>
                <h2>{g.name}</h2>
                <small>
                  Total {money(g.total)}
                  {g.description ? ` · ${g.description}` : ''}
                </small>
              </span>
              <span className="row-actions">
                <button
                  type="button"
                  onClick={() => {
                    setError('');
                    setItemForm(EMPTY_ITEM);
                    setItemFor(g);
                  }}
                >
                  + Add item
                </button>
                <button
                  type="button"
                  className="ghost"
                  onClick={() => run(() => api(`/fee-groups/${g.id}`, { method: 'DELETE' }))}
                >
                  Delete group
                </button>
              </span>
            </header>
            <div className="table-scroll">
              <table className="enquiry-table">
                <thead>
                  <tr>
                    <th>Item</th>
                    <th>Amount</th>
                    <th>Due</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {g.items.map((i) => (
                    <tr key={i.id}>
                      <td>
                        <b>{i.title}</b>
                      </td>
                      <td>{i.amount}</td>
                      <td>{i.dueDate || '—'}</td>
                      <td className="row-actions">
                        <button
                          type="button"
                          className="ghost"
                          onClick={() =>
                            run(() => api(`/fee-groups/${g.id}/items/${i.id}`, { method: 'DELETE' }))
                          }
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                  {!g.items.length && (
                    <tr>
                      <td colSpan={4} className="empty-row">
                        No items yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            {g.items.length > 0 && (
              <div className="toolbar">
                <label className="inline">
                  <span>Apply to class </span>
                  <select
                    value={a.classId}
                    onChange={(e) => setApply({ ...apply, [g.id]: { ...a, classId: e.target.value } })}
                  >
                    <option value="">--</option>
                    {classes.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}-{c.section}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="inline">
                  <input
                    type="checkbox"
                    checked={a.bill}
                    onChange={(e) => setApply({ ...apply, [g.id]: { ...a, bill: e.target.checked } })}
                  />{' '}
                  Also bill current students
                </label>
                <button type="button" data-sure onClick={() => applyTo(g)}>
                  Apply
                </button>
              </div>
            )}
          </section>
        );
      })}
      {!shown.length && (
        <section className="card enquiry-card">
          <p className="empty-row" style={{ padding: 22 }}>
            {needle ? 'No fee groups match.' : 'No fee groups yet.'}
          </p>
        </section>
      )}

      <Modal open={entry} title="New fee group" wide={false} onClose={() => setEntry(false)}>
        <form onSubmit={create} className="enquiry-form">
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          <div className="enq-grid">
            <label className="wide">
              <span>Group name *</span>
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
            </label>
            <label className="wide">
              <span>Description</span>
              <input
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </label>
          </div>
          <div className="form-actions">
            <button type="submit" disabled={busy}>
              {busy ? 'Saving…' : 'Add group'}
            </button>
            <button type="button" className="ghost" onClick={() => setEntry(false)}>
              Cancel
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        open={Boolean(itemFor)}
        title={itemFor ? `Add item to ${itemFor.name}` : 'Add item'}
        wide={false}
        onClose={() => setItemFor(null)}
      >
        <form onSubmit={addItem} className="enquiry-form">
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          <div className="enq-grid">
            <label className="wide">
              <span>Item *</span>
              <input
                value={itemForm.title}
                onChange={(e) => setItemForm({ ...itemForm, title: e.target.value })}
                required
              />
            </label>
            <label>
              <span>Amount *</span>
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={itemForm.amount}
                onChange={(e) => setItemForm({ ...itemForm, amount: e.target.value })}
                required
              />
            </label>
            <label>
              <span>Due date</span>
              <input
                type="date"
                value={itemForm.dueDate}
                onChange={(e) => setItemForm({ ...itemForm, dueDate: e.target.value })}
              />
            </label>
          </div>
          <div className="form-actions">
            <button type="submit" disabled={busy}>
              {busy ? 'Saving…' : 'Add item'}
            </button>
            <button type="button" className="ghost" onClick={() => setItemFor(null)}>
              Cancel
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}
