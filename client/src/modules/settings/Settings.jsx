import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../../services/api.js';
import { forgetPublicSettings } from '../../services/settings.js';

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

/** School-wide values; each can be put back to its default. */
export default function Settings() {
  const [params] = useSearchParams();
  const only = params.get('group'); // a menu entry can show a single group
  const [items, setItems] = useState([]);
  const [draft, setDraft] = useState({});
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const load = () =>
    api('/settings')
      .then((rows) => {
        setItems(rows);
        setDraft(Object.fromEntries(rows.map((r) => [r.key, r.value])));
      })
      .catch((e) => setError(e.message));
  useEffect(() => {
    load();
  }, []);

  // The school profile has its own page, so the general settings page leaves that group out.
  const groups = [...new Set(items.map((i) => i.group))].filter((g) =>
    only ? g === only : g !== 'School profile',
  );
  const dirty = items.filter((i) => String(draft[i.key] ?? '') !== String(i.value ?? ''));
  const shownItems = items.filter((i) => groups.includes(i.group));

  const save = async (e) => {
    e.preventDefault();
    setError('');
    setNotice('');
    try {
      await api('/settings', {
        method: 'PUT',
        body: { values: Object.fromEntries(dirty.map((i) => [i.key, draft[i.key]])) },
      });
      forgetPublicSettings();
      setNotice(`Saved ${dirty.length} setting${dirty.length === 1 ? '' : 's'}.`);
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const reset = async (item) => {
    setError('');
    setNotice('');
    try {
      await api('/settings/reset', { method: 'POST', body: { key: item.key } });
      forgetPublicSettings();
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <>
      <div className="profile-head">
        <div>
          <h1>{only ?? 'Settings'}</h1>
          <p className="hint">
            School-wide values used across the system. Changes apply immediately to new certificates, library
            loans, leave decisions and reports.
          </p>
        </div>
        <div className="head-actions">
          <button type="submit" form="settings-form" className="big-action" disabled={!dirty.length}>
            Save {dirty.length ? `${dirty.length} change${dirty.length === 1 ? '' : 's'}` : 'changes'}
          </button>
        </div>
      </div>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {notice && <p className="success">{notice}</p>}

      <div className="stats enquiry-tiles four">
        <Tile icon="▤" tone="blue" label="Groups" value={groups.length} />
        <Tile icon="✎" tone="violet" label="Settings" value={shownItems.length} />
        <Tile
          icon="✓"
          tone="green"
          label="Changed from default"
          value={shownItems.filter((i) => i.changed).length}
        />
        <Tile icon="!" tone="amber" label="Unsaved edits" value={dirty.length} />
      </div>

      <form id="settings-form" onSubmit={save}>
        {groups.map((group) => (
          <section className="card" key={group}>
            <header className="card-head">
              <span>
                <h2>{group}</h2>
              </span>
            </header>
            <div className="settings-grid">
              {items
                .filter((i) => i.group === group)
                .map((i) => (
                  <label key={i.key}>
                    <span>
                      {i.label}
                      {i.changed && <small> · changed</small>}
                    </span>
                    <input
                      type={i.type === 'text' ? 'text' : 'number'}
                      step={i.type === 'integer' ? 1 : 'any'}
                      min={i.min ?? undefined}
                      max={i.max ?? undefined}
                      value={draft[i.key] ?? ''}
                      onChange={(e) => setDraft({ ...draft, [i.key]: e.target.value })}
                    />
                    {i.help && <small>{i.help}</small>}
                    {i.changed && (
                      <button
                        type="button"
                        className="link"
                        style={{ color: '#2563eb' }}
                        onClick={() => reset(i)}
                      >
                        Use default ({i.default === '' ? 'blank' : String(i.default)})
                      </button>
                    )}
                  </label>
                ))}
            </div>
          </section>
        ))}
        <div className="form-actions">
          <button type="submit" disabled={!dirty.length}>
            Save {dirty.length ? `${dirty.length} change${dirty.length === 1 ? '' : 's'}` : 'changes'}
          </button>
        </div>
      </form>
    </>
  );
}
