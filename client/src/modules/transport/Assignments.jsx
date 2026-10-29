import { useCallback, useEffect, useState } from 'react';
import Gate from '../../components/Gate.jsx';
import { api } from '../../services/api.js';
import Modal from '../../components/Modal.jsx';
import Pagination from '../../components/Pagination.jsx';
import TypeaheadSelect from '../../components/TypeaheadSelect.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useOpenNew } from '../../hooks/useOpenNew.js';

const PAGE_SIZE = 10;
const EMPTY = {
  studentId: '',
  routeId: '',
  stopId: '',
  startDate: '',
  tripType: 'both',
  authorizedPickupName: '',
  authorizedPickupPhone: '',
  remarks: '',
};
const TRIPS = [
  ['both', 'Morning and evening'],
  ['pickup', 'Morning pickup only'],
  ['drop', 'Evening drop only'],
];
const csvCell = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;

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

/** Which student rides which route and stop. Assigning and moving a rider happen in a popup. */
export default function Assignments() {
  const canWrite = useAuth().user?.role === 'admin';
  const [rows, setRows] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [stops, setStops] = useState([]);
  const [summary, setSummary] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [entry, setEntry] = useState(false);
  const [route, setRoute] = useState('');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  useOpenNew(() => openNew(), canWrite); // eslint-disable-line no-use-before-define

  const loadRoutes = () => {
    api('/transport/routes')
      .then(setRoutes)
      .catch(() => {});
    api('/transport/summary')
      .then(setSummary)
      .catch(() => {});
  };
  const load = useCallback(() => {
    api(`/transport/assignments${route ? `?routeId=${route}` : ''}`)
      .then(setRows)
      .catch((e) => setError(e.message));
  }, [route]);
  useEffect(() => {
    loadRoutes();
    api('/transport/stops')
      .then(setStops)
      .catch(() => {});
  }, []);
  useEffect(() => {
    setPage(1);
    load();
  }, [load]);

  const openNew = () => {
    setError('');
    setNotice('');
    setForm(EMPTY);
    setEntry(true);
  };
  const openEdit = (a) => {
    setError('');
    setNotice('');
    setForm(Object.fromEntries(Object.keys(EMPTY).map((k) => [k, a[k] ?? EMPTY[k]])));
    setEntry(true);
  };
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const moving = rows.some((a) => String(a.studentId) === String(form.studentId));
  const routeStops = stops.filter((s) => String(s.routeId) === String(form.routeId));

  const save = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await api('/transport/assignments', { method: 'POST', body: form });
      setNotice(moving ? 'Rider updated.' : 'Rider assigned.');
      setEntry(false);
      load();
      loadRoutes();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };
  const remove = async (a) => {
    setError('');
    setNotice('');
    try {
      await api(`/transport/assignments/${a.studentId}`, { method: 'DELETE' });
      setNotice('Rider removed.');
      load();
      loadRoutes();
    } catch (err) {
      setError(err.message);
    }
  };

  const needle = q.trim().toLowerCase();
  const shown = rows.filter(
    (a) =>
      !needle ||
      `${a.studentName} ${a.admissionNo} ${a.routeName} ${a.stopName}`.toLowerCase().includes(needle),
  );
  const pageRows = shown.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const from = shown.length ? (page - 1) * PAGE_SIZE + 1 : 0;
  const seats = summary?.vehicles.reduce((n, v) => n + v.capacity, 0) ?? 0;
  const taken = summary?.vehicles.reduce((n, v) => n + v.seatsTaken, 0) ?? 0;

  const exportCsv = () => {
    const head = [
      'Student',
      'Admission no',
      'Route',
      'Stop',
      'Pickup',
      'Trips',
      'Authorised pickup',
      'Phone',
      'Monthly fee',
      'From',
    ];
    const lines = shown.map((a) =>
      [
        a.studentName,
        a.admissionNo,
        a.routeName,
        a.stopName,
        a.pickupTime,
        TRIPS.find(([v]) => v === a.tripType)?.[1],
        a.authorizedPickupName,
        a.authorizedPickupPhone,
        a.monthlyFee,
        a.startDate,
      ]
        .map(csvCell)
        .join(','),
    );
    const url = URL.createObjectURL(
      new Blob([[head.map(csvCell).join(','), ...lines].join('\r\n')], { type: 'text/csv' }),
    );
    const l = document.createElement('a');
    l.href = url;
    l.download = 'transport-riders.csv';
    document.body.appendChild(l);
    l.click();
    l.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <div className="profile-head">
        <div>
          <h1>Student route assignment</h1>
          <p className="hint">
            Choosing a student who already has a route moves them to the new route or stop. A vehicle cannot
            carry more students than its seats.
          </p>
        </div>
        <div className="head-actions">
          <Gate action="export">
            <button type="button" className="ghost" onClick={exportCsv}>
              ↓ Export
            </button>
          </Gate>
          {canWrite && (
            <button type="button" className="big-action" onClick={openNew}>
              ＋ Assign a rider
            </button>
          )}
        </div>
      </div>
      {notice && <p className="success">{notice}</p>}
      {error && !entry && (
        <p className="error" role="alert">
          {error}
        </p>
      )}

      <div className="stats enquiry-tiles four">
        <Tile icon="♙" tone="blue" label="Riders" value={summary?.riders ?? '…'} />
        <Tile
          icon="▤"
          tone="green"
          label="Seats taken"
          value={summary ? `${taken} / ${seats}` : '…'}
          hint={
            summary ? `${summary.vehicles.length} vehicle${summary.vehicles.length === 1 ? '' : 's'}` : null
          }
        />
        <Tile
          icon="◷"
          tone="violet"
          label="Routes"
          value={summary?.routes.length ?? '…'}
          hint={summary ? `${summary.routes.reduce((n, r) => n + r.stopCount, 0)} stops` : null}
        />
        <Tile
          icon="!"
          tone="amber"
          label="Maintenance due"
          value={summary?.maintenanceDue ?? '…'}
          hint={summary ? `Spent: ${summary.maintenanceCost}` : null}
        />
      </div>

      <section className="card enquiry-card">
        <div className="toolbar">
          <label className="search-field">
            <span aria-hidden="true">⌕</span>
            <input
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setPage(1);
              }}
              placeholder="Search student, route or stop…"
              aria-label="Search"
            />
          </label>
          <select value={route} onChange={(e) => setRoute(e.target.value)} aria-label="Route">
            <option value="">All routes</option>
            {routes.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
          <span className="showing">
            Showing{' '}
            <b>
              {from}–{Math.min(page * PAGE_SIZE, shown.length)}
            </b>{' '}
            of <b>{shown.length}</b>
          </span>
        </div>
        <div className="table-scroll">
          <table className="enquiry-table">
            <thead>
              <tr>
                <th>Student</th>
                <th>Route</th>
                <th>Stop</th>
                <th>Pickup</th>
                <th>Trips</th>
                <th>Authorised pickup</th>
                <th>Monthly fee</th>
                {canWrite && <th />}
              </tr>
            </thead>
            <tbody>
              {pageRows.map((a) => (
                <tr key={a.studentId}>
                  <td>
                    <b>{a.studentName}</b>
                    <small className="block">{a.admissionNo}</small>
                  </td>
                  <td>{a.routeName}</td>
                  <td>{a.stopName}</td>
                  <td>{a.pickupTime ?? '—'}</td>
                  <td>
                    <span className="badge applied">{TRIPS.find(([v]) => v === a.tripType)?.[1]}</span>
                  </td>
                  <td>
                    {a.authorizedPickupName || '—'}
                    {a.authorizedPickupPhone && <small className="block">{a.authorizedPickupPhone}</small>}
                  </td>
                  <td>{a.monthlyFee}</td>
                  {canWrite && (
                    <td className="row-actions">
                      <Gate action="edit">
                        <button type="button" className="ghost" onClick={() => openEdit(a)}>
                          Edit
                        </button>
                      </Gate>
                      <Gate action="delete">
                        <button type="button" className="ghost danger" onClick={() => remove(a)}>
                          Remove
                        </button>
                      </Gate>
                    </td>
                  )}
                </tr>
              ))}
              {!pageRows.length && (
                <tr>
                  <td colSpan={canWrite ? 8 : 7} className="empty-row">
                    {needle || route ? 'No riders match.' : 'No students on transport yet.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <Pagination page={page} pageSize={PAGE_SIZE} total={shown.length} onChange={setPage} />
      </section>

      <Modal
        open={entry}
        title={moving ? 'Update or move a rider' : 'Assign a rider'}
        onClose={() => setEntry(false)}
      >
        <form onSubmit={save} className="enquiry-form">
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          <div className="enq-grid">
            <label className="wide">
              <span>Student *</span>
              <TypeaheadSelect
                kind="students"
                value={form.studentId}
                onChange={(id) => setForm({ ...form, studentId: id })}
                filters={{ status: 'active' }}
                required
              />
            </label>
            <label>
              <span>Route *</span>
              <select
                value={form.routeId}
                onChange={(e) => setForm({ ...form, routeId: e.target.value, stopId: '' })}
                required
              >
                <option value="">Choose a route</option>
                {routes.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name} ({r.studentCount} riders)
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>Stop *</span>
              <select value={form.stopId} onChange={set('stopId')} required disabled={!form.routeId}>
                <option value="">Choose a stop</option>
                {routeStops.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.sequence}. {s.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>From</span>
              <input type="date" value={form.startDate} onChange={set('startDate')} />
            </label>
            <label>
              <span>Trips</span>
              <select value={form.tripType} onChange={set('tripType')}>
                {TRIPS.map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>Authorised pickup person</span>
              <input
                value={form.authorizedPickupName}
                onChange={set('authorizedPickupName')}
                maxLength={100}
              />
            </label>
            <label>
              <span>Their phone</span>
              <input
                type="tel"
                value={form.authorizedPickupPhone}
                onChange={set('authorizedPickupPhone')}
                maxLength={20}
              />
            </label>
            <label className="wide">
              <span>Remarks</span>
              <input value={form.remarks} onChange={set('remarks')} maxLength={255} />
            </label>
          </div>
          <div className="form-actions">
            <button type="submit" disabled={busy}>
              {busy ? 'Saving…' : moving ? 'Update / move' : 'Assign'}
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
