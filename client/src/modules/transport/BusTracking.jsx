import { useCallback, useEffect, useState } from 'react';
import { api } from '../../services/api.js';
import Modal from '../../components/Modal.jsx';
import { useAuth } from '../../context/AuthContext.jsx';

const REFRESH_MS = 15000;

/** An OpenStreetMap view centred on a position, with a marker. */
export function BusMap({ latitude, longitude, height = 320 }) {
  const d = 0.008;
  const bbox = [longitude - d, latitude - d, longitude + d, latitude + d].join('%2C');
  return (
    <iframe
      title="Bus location"
      loading="lazy"
      style={{ width: '100%', height, border: 0, borderRadius: 12 }}
      src={`https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${latitude}%2C${longitude}`}
    />
  );
}

export const ago = (at) => {
  const s = Math.max(0, Math.round((Date.now() - new Date(at).getTime()) / 1000));
  return s < 60
    ? `${s}s ago`
    : s < 3600
      ? `${Math.round(s / 60)} min ago`
      : s < 86400
        ? `${Math.round(s / 3600)} h ago`
        : new Date(at).toLocaleString();
};

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

/** Live GPS of every school bus, refreshed every few seconds. */
export default function BusTracking() {
  const isAdmin = useAuth().user?.role === 'admin';
  const [fleet, setFleet] = useState([]);
  const [selected, setSelected] = useState(null);
  const [key, setKey] = useState(null); // { regNo, apiKey }
  const [error, setError] = useState('');

  const load = useCallback(() => {
    api('/transport/tracking')
      .then((f) => {
        setFleet(f);
        setError('');
      })
      .catch((e) => setError(e.message));
  }, []); // a later good poll clears an earlier failure
  useEffect(() => {
    load();
    const t = setInterval(load, REFRESH_MS);
    return () => clearInterval(t);
  }, [load]);

  const bus = fleet.find((v) => v.vehicleId === selected) ?? fleet.find((v) => v.position) ?? null;
  const showKey = async (v, replace) => {
    setError('');
    try {
      const keys = replace ? null : await api('/transport/tracking/keys');
      const apiKey =
        replace || !keys[v.vehicleId]
          ? (await api(`/transport/tracking/${v.vehicleId}/key`, { method: 'POST' })).apiKey
          : keys[v.vehicleId];
      setKey({ regNo: v.regNo, apiKey });
      load();
    } catch (err) {
      setError(err.message);
    }
  };
  const endpoint = `${window.location.origin}/api/device/location`;

  return (
    <>
      <div className="profile-head">
        <div>
          <h1>Bus tracking</h1>
          <p className="hint">
            Where every bus was last seen. Positions update by themselves; a bus that has not reported for 5
            minutes shows as offline.
          </p>
        </div>
        <div className="head-actions">
          <button type="button" className="ghost" onClick={load}>
            Refresh
          </button>
        </div>
      </div>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}

      <div className="stats enquiry-tiles four">
        <Tile icon="▣" tone="blue" label="Buses" value={fleet.length} />
        <Tile icon="●" tone="green" label="Live now" value={fleet.filter((v) => v.live).length} />
        <Tile
          icon="➤"
          tone="violet"
          label="Moving"
          value={fleet.filter((v) => v.live && v.position?.speed > 2).length}
        />
        <Tile icon="!" tone="amber" label="No GPS signal" value={fleet.filter((v) => !v.live).length} />
      </div>

      <section className="card enquiry-card">
        <div className="table-scroll">
          <table className="enquiry-table">
            <thead>
              <tr>
                <th>Bus</th>
                <th>Routes</th>
                <th>Status</th>
                <th>Speed</th>
                <th>Last seen</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {fleet.map((v) => (
                <tr key={v.vehicleId}>
                  <td>
                    <b>{v.regNo}</b>
                    <small className="block">{v.model}</small>
                  </td>
                  <td>{v.routes.join(', ') || '—'}</td>
                  <td>
                    {v.live ? (
                      <span className="badge paid">● live</span>
                    ) : v.position ? (
                      <span className="badge partial">● offline</span>
                    ) : (
                      <span className="badge rejected">
                        ● {v.hasTracker ? 'no signal yet' : 'no GPS unit'}
                      </span>
                    )}
                  </td>
                  <td>{v.position?.speed == null ? '—' : `${v.position.speed} km/h`}</td>
                  <td>{v.position ? ago(v.position.recordedAt) : '—'}</td>
                  <td className="row-actions">
                    {v.position && (
                      <button type="button" className="ghost" onClick={() => setSelected(v.vehicleId)}>
                        Show on map
                      </button>
                    )}
                    {isAdmin && (
                      <button type="button" className="ghost" onClick={() => showKey(v, false)}>
                        {v.hasTracker ? 'GPS key' : 'Set up GPS'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {!fleet.length && (
                <tr>
                  <td colSpan={6} className="empty-row">
                    No active vehicles. Add one under Transport → Vehicles.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {bus?.position && (
        <section className="card">
          <h2 style={{ marginTop: 0 }}>
            {bus.regNo}
            {bus.routes.length > 0 && <small> · {bus.routes.join(', ')}</small>}
          </h2>
          <BusMap latitude={bus.position.latitude} longitude={bus.position.longitude} />
          <p className="hint">
            {bus.position.latitude.toFixed(5)}, {bus.position.longitude.toFixed(5)} ·{' '}
            {ago(bus.position.recordedAt)} ·{' '}
            <a
              href={`https://www.google.com/maps?q=${bus.position.latitude},${bus.position.longitude}`}
              target="_blank"
              rel="noreferrer"
            >
              Open in Google Maps
            </a>
          </p>
        </section>
      )}

      {isAdmin && (
        <section className="card">
          <h2 style={{ marginTop: 0 }}>Connecting a GPS unit</h2>
          <p className="hint">
            Each bus's tracker sends its position with an HTTPS POST (every 10–30 seconds is plenty):
          </p>
          <pre style={{ overflowX: 'auto', margin: 0 }}>{`POST ${endpoint}
x-tracker-key: <the bus's GPS key>
{ "latitude": 28.6139, "longitude": 77.2090, "speed": 32 }`}</pre>
          <p className="hint">
            <code>speed</code> is km/h and <code>time</code> (ISO 8601) is optional. Positions are kept for 7
            days.
          </p>
        </section>
      )}

      <Modal
        open={Boolean(key)}
        title={`GPS key · ${key?.regNo ?? ''}`}
        wide={false}
        onClose={() => setKey(null)}
      >
        {key && (
          <div className="enquiry-form">
            <p className="hint">
              Enter this key in the bus's GPS unit as the <code>x-tracker-key</code> header. Anyone holding it
              can report this bus's position, so keep it private.
            </p>
            <input
              readOnly
              value={key.apiKey}
              onFocus={(e) => e.target.select()}
              aria-label="GPS key"
              style={{ width: '100%', fontFamily: 'monospace' }}
            />
            <div className="form-actions">
              <button type="button" onClick={() => navigator.clipboard?.writeText(key.apiKey)}>
                Copy key
              </button>
              <button
                type="button"
                className="ghost"
                onClick={() => {
                  const v = fleet.find((f) => f.regNo === key.regNo);
                  setKey(null);
                  if (v) showKey(v, true);
                }}
              >
                Issue a new key
              </button>
              <button type="button" className="ghost" onClick={() => setKey(null)}>
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
