import { useCallback, useEffect, useMemo, useState } from 'react';
import { api, uploadFile } from '../../services/api.js';

const AUDIENCES = [
  ['staff', 'Staff app (admin, teacher, accountant)'],
  ['family', 'Parent and student app'],
];
const ROLES = {
  staff: [
    ['admin', 'Admin'],
    ['teacher', 'Teacher'],
    ['accountant', 'Accountant'],
  ],
  family: [
    ['parent', 'Parent'],
    ['student', 'Student'],
  ],
};
const KIND = { module: 'Module', quick: 'Shortcut', list: 'Page', stats: 'Summary', custom: 'Page' };

// A few of the outline icons the app can show (Ionicons names). Any name from the Ionicons set works; this list only suggests.
const ICON_NAMES = [
  'home-outline',
  'person-outline',
  'people-outline',
  'people-circle-outline',
  'school-outline',
  'book-outline',
  'library-outline',
  'create-outline',
  'document-text-outline',
  'document-attach-outline',
  'clipboard-outline',
  'checkbox-outline',
  'checkmark-circle-outline',
  'calendar-outline',
  'time-outline',
  'wallet-outline',
  'cash-outline',
  'receipt-outline',
  'card-outline',
  'pricetag-outline',
  'bus-outline',
  'map-outline',
  'location-outline',
  'navigate-outline',
  'bed-outline',
  'business-outline',
  'restaurant-outline',
  'cube-outline',
  'cart-outline',
  'storefront-outline',
  'briefcase-outline',
  'medkit-outline',
  'medical-outline',
  'alert-circle-outline',
  'ribbon-outline',
  'trophy-outline',
  'megaphone-outline',
  'chatbubbles-outline',
  'mail-outline',
  'mail-open-outline',
  'paper-plane-outline',
  'notifications-outline',
  'heart-outline',
  'help-circle-outline',
  'key-outline',
  'shield-checkmark-outline',
  'settings-outline',
  'stats-chart-outline',
  'bar-chart-outline',
  'trending-up-outline',
  'list-outline',
  'layers-outline',
  'folder-outline',
  'videocam-outline',
  'images-outline',
  'swap-horizontal-outline',
  'id-card-outline',
  'bookmark-outline',
  'walk-outline',
  'apps-outline',
  'star-outline',
];

/**
 * Settings, Mobile App Menu. The menu of the mobile app lives in the database: rename a tile, choose its icon (an outline icon name, or an uploaded
 * picture), move it, limit it to some roles, or hide it. What a page does is built into the app; this screen only changes how it is presented.
 */
export default function AppMenu() {
  const [audience, setAudience] = useState('staff');
  const [rows, setRows] = useState([]);
  const [q, setQ] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(() => {
    api(`/app-menu/admin?audience=${audience}`)
      .then(setRows)
      .catch((e) => setError(e.message));
  }, [audience]);
  useEffect(() => {
    setRows([]);
    setError('');
    setNotice('');
    load();
  }, [load]);

  const replace = (item) => setRows((all) => all.map((r) => (r.id === item.id ? item : r)));
  const save = async (item, patch, done) => {
    setError('');
    setNotice('');
    setBusyId(item.id);
    try {
      replace(await api(`/app-menu/${item.id}`, { method: 'PUT', body: patch }));
      if (done) setNotice(done);
    } catch (err) {
      setError(err.message);
      load();
    } finally {
      setBusyId(null);
    }
  };
  const upload = async (item, file) => {
    if (!file) return;
    setError('');
    setNotice('');
    setBusyId(item.id);
    try {
      replace(await uploadFile(`/app-menu/${item.id}/image`, file, 'PUT'));
      setNotice(`Picture saved for "${item.label}".`);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  };
  const removePicture = async (item) => {
    setError('');
    setBusyId(item.id);
    try {
      replace(await api(`/app-menu/${item.id}/image`, { method: 'DELETE' }));
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  };
  const move = async (item, dir) => {
    const siblings = rows
      .filter((r) => (r.parentKey ?? null) === (item.parentKey ?? null))
      .sort((a, b) => a.position - b.position || a.id - b.id);
    const at = siblings.findIndex((r) => r.id === item.id);
    const other = siblings[at + dir];
    if (!other) return;
    setError('');
    setNotice('');
    setBusyId(item.id);
    try {
      const a = await api(`/app-menu/${item.id}`, { method: 'PUT', body: { position: other.position } });
      const b = await api(`/app-menu/${other.id}`, { method: 'PUT', body: { position: item.position } });
      setRows((all) => all.map((r) => (r.id === a.id ? a : r.id === b.id ? b : r)));
    } catch (err) {
      setError(err.message);
      load();
    } finally {
      setBusyId(null);
    }
  };
  const reset = async () => {
    if (
      !window.confirm(
        'Put this whole menu back to the built-in labels, icons, order and visibility? Uploaded pictures are removed.',
      )
    )
      return;
    setError('');
    setNotice('');
    try {
      const r = await api(`/app-menu/reset?audience=${audience}&confirm=RESET`, { method: 'POST' });
      setNotice(`Menu reset (${r.restored} items).`);
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  // modules first (or shortcuts), each followed by its pages
  const ordered = useMemo(() => {
    const sort = (list) => [...list].sort((a, b) => a.position - b.position || a.id - b.id);
    const tops = sort(rows.filter((r) => !r.parentKey));
    return tops.flatMap((t) => [
      { item: t, depth: 0 },
      ...sort(rows.filter((r) => r.parentKey === t.key)).map((c) => ({ item: c, depth: 1 })),
    ]);
  }, [rows]);
  const needle = q.trim().toLowerCase();
  const shown = ordered.filter(
    ({ item }) => !needle || `${item.label} ${item.key}`.toLowerCase().includes(needle),
  );
  const hidden = rows.filter((r) => !r.active).length;

  return (
    <>
      <div className="profile-head">
        <div>
          <h1>Mobile app menu</h1>
          <p className="hint">
            Rename tiles, choose their icons, reorder them, limit them to roles, or hide them. The app picks
            the changes up the next time it is opened.
          </p>
        </div>
        <div className="head-actions">
          <button type="button" className="ghost danger" onClick={reset}>
            Reset to defaults
          </button>
        </div>
      </div>
      {notice && <p className="success">{notice}</p>}
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}

      <section className="card enquiry-card">
        <div className="tabs-line" role="tablist">
          {AUDIENCES.map(([k, l]) => (
            <button
              key={k}
              type="button"
              role="tab"
              aria-selected={audience === k}
              className={audience === k ? 'on' : ''}
              onClick={() => setAudience(k)}
            >
              {l}
            </button>
          ))}
        </div>
        <div className="toolbar">
          <label className="search-field">
            <span aria-hidden="true">⌕</span>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search the menu…"
              aria-label="Search the menu"
            />
          </label>
          <span className="showing">
            <b>{rows.length}</b> items{hidden ? `, ${hidden} hidden` : ''}
          </span>
        </div>
        <datalist id="menu-icons">
          {ICON_NAMES.map((n) => (
            <option key={n} value={n} />
          ))}
        </datalist>
        <div className="table-scroll">
          <table className="enquiry-table">
            <thead>
              <tr>
                <th>Item</th>
                <th>Label</th>
                <th>Icon name</th>
                <th>Picture</th>
                <th>Who sees it</th>
                <th>Shown</th>
                <th>Order</th>
              </tr>
            </thead>
            <tbody>
              {shown.map(({ item, depth }) => {
                const roles = item.roles ?? [];
                return (
                  <tr key={item.id} style={{ opacity: item.active ? 1 : 0.55 }}>
                    <td style={{ paddingLeft: 12 + depth * 22 }}>
                      <b style={{ fontWeight: depth ? 500 : 700 }}>
                        {depth ? '↳ ' : ''}
                        {item.key}
                      </b>
                      <small className="block">{KIND[item.kind] ?? item.kind}</small>
                    </td>
                    <td>
                      <input
                        defaultValue={item.label}
                        key={`l${item.id}${item.label}`}
                        maxLength={80}
                        aria-label={`Label for ${item.key}`}
                        onBlur={(e) =>
                          e.target.value.trim() !== item.label && save(item, { label: e.target.value })
                        }
                        style={{ minWidth: 150 }}
                      />
                    </td>
                    <td>
                      <input
                        defaultValue={item.icon}
                        key={`i${item.id}${item.icon}`}
                        list="menu-icons"
                        maxLength={60}
                        aria-label={`Icon for ${item.key}`}
                        onBlur={(e) =>
                          e.target.value.trim() !== item.icon && save(item, { icon: e.target.value })
                        }
                        style={{ minWidth: 150 }}
                      />
                    </td>
                    <td>
                      {item.iconData ? (
                        <img
                          src={item.iconData}
                          alt=""
                          width="28"
                          height="28"
                          style={{ verticalAlign: 'middle', marginRight: 8, objectFit: 'contain' }}
                        />
                      ) : null}
                      <label className="link" style={{ cursor: 'pointer' }}>
                        {item.hasImage ? 'Replace' : 'Upload'}
                        <input
                          type="file"
                          accept="image/png,image/jpeg,image/webp"
                          hidden
                          onChange={(e) => {
                            upload(item, e.target.files?.[0]);
                            e.target.value = '';
                          }}
                        />
                      </label>
                      {item.hasImage ? (
                        <>
                          {' '}
                          ·{' '}
                          <button type="button" className="link" onClick={() => removePicture(item)}>
                            Remove
                          </button>
                        </>
                      ) : null}
                    </td>
                    <td>
                      {ROLES[audience].map(([r, l]) => (
                        <label
                          key={r}
                          style={{
                            display: 'inline-flex',
                            gap: 4,
                            marginRight: 10,
                            alignItems: 'center',
                            fontSize: 13,
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={roles.length ? roles.includes(r) : true}
                            disabled={busyId === item.id}
                            onChange={(e) => {
                              const current = roles.length ? roles : ROLES[audience].map(([x]) => x);
                              const next = e.target.checked
                                ? [...new Set([...current, r])]
                                : current.filter((x) => x !== r);
                              if (!next.length) {
                                setError('Keep at least one role, or hide the item instead.');
                                return;
                              }
                              save(item, { roles: next.length === ROLES[audience].length ? null : next });
                            }}
                          />
                          {l}
                        </label>
                      ))}
                    </td>
                    <td>
                      <label style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
                        <input
                          type="checkbox"
                          checked={item.active}
                          disabled={busyId === item.id}
                          onChange={(e) => save(item, { active: e.target.checked })}
                        />{' '}
                        {item.active ? 'Shown' : 'Hidden'}
                      </label>
                    </td>
                    <td className="row-actions">
                      <button
                        type="button"
                        className="ghost"
                        onClick={() => move(item, -1)}
                        disabled={busyId === item.id}
                        aria-label={`Move ${item.key} up`}
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        className="ghost"
                        onClick={() => move(item, 1)}
                        disabled={busyId === item.id}
                        aria-label={`Move ${item.key} down`}
                      >
                        ↓
                      </button>
                    </td>
                  </tr>
                );
              })}
              {!shown.length && (
                <tr>
                  <td colSpan={7} className="empty-row">
                    {needle ? 'Nothing matches.' : 'Loading the menu…'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
      <p className="hint" style={{ marginTop: 12 }}>
        Icon names come from the Ionicons set (for example <code>wallet-outline</code>). An uploaded picture
        (PNG, JPEG or WebP, up to 60 KB, square works best) takes the place of the icon. A page inside a
        module follows its module&apos;s roles unless you set its own.
      </p>
    </>
  );
}
