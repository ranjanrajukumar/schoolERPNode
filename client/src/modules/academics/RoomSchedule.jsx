import { useCallback, useEffect, useState } from 'react';
import Gate from '../../components/Gate.jsx';
import { api } from '../../services/api.js';
import Modal from '../../components/Modal.jsx';
import Pagination from '../../components/Pagination.jsx';
import { useOpenNew } from '../../hooks/useOpenNew.js';

const PAGE_SIZE = 25;
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const PERIODS = [1, 2, 3, 4, 5, 6, 7, 8];
const KINDS = ['classroom', 'lab', 'hall', 'library', 'ground', 'other'];
const TABS = [['all', 'All'], ...KINDS.map((k) => [k, k[0].toUpperCase() + k.slice(1)])];
const EMPTY_ROOM = { name: '', kind: 'classroom', capacity: '' };
const EMPTY_BOOKING = { date: '', period: 1, purpose: '' };
const date = (d) =>
  d
    ? new Date(`${String(d).slice(0, 10)}T00:00:00`).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : '—';

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

/** Rooms and resources, each room's weekly timetable, and one-off bookings. */
export default function RoomSchedule() {
  const [rooms, setRooms] = useState([]);
  const [roomForm, setRoomForm] = useState(EMPTY_ROOM);
  const [editId, setEditId] = useState(null);
  const [entry, setEntry] = useState(false);
  const [bookEntry, setBookEntry] = useState(false);
  const [roomId, setRoomId] = useState('');
  const [schedule, setSchedule] = useState(null);
  const [booking, setBooking] = useState(EMPTY_BOOKING);
  const [tab, setTab] = useState('all');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const loadRooms = useCallback(() => {
    api('/scheduling/rooms')
      .then(setRooms)
      .catch((e) => setError(e.message));
  }, []);
  const loadSchedule = useCallback(() => {
    if (!roomId) {
      setSchedule(null);
      return;
    }
    api(`/scheduling/rooms/${roomId}/schedule`)
      .then(setSchedule)
      .catch((e) => setError(e.message));
  }, [roomId]);
  useEffect(loadRooms, [loadRooms]);
  useEffect(loadSchedule, [loadSchedule]);
  useOpenNew(() => {
    setEditId(null);
    setRoomForm(EMPTY_ROOM);
    setEntry(true);
  });

  const run = async (fn) => {
    setError('');
    setBusy(true);
    try {
      await fn();
      loadRooms();
      loadSchedule();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };
  const saveRoom = (e) => {
    e.preventDefault();
    run(async () => {
      await api(editId ? `/scheduling/rooms/${editId}` : '/scheduling/rooms', {
        method: editId ? 'PUT' : 'POST',
        body: roomForm,
      });
      setRoomForm(EMPTY_ROOM);
      setEditId(null);
      setEntry(false);
    });
  };
  const book = (e) => {
    e.preventDefault();
    run(async () => {
      await api('/scheduling/bookings', { method: 'POST', body: { ...booking, roomId } });
      setBooking(EMPTY_BOOKING);
      setBookEntry(false);
    });
  };

  const cell = (day, period) => schedule?.slots.find((s) => s.day === day && s.period === period);
  const count = (k) => (k === 'all' ? rooms.length : rooms.filter((r) => r.kind === k).length);
  const needle = q.trim().toLowerCase();
  const shown = rooms.filter(
    (r) =>
      (tab === 'all' || r.kind === tab) && (!needle || `${r.name} ${r.kind}`.toLowerCase().includes(needle)),
  );
  const pageRows = shown.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const capacity = rooms.reduce((n, r) => n + (Number(r.capacity) || 0), 0);
  const upcoming = rooms.reduce((n, r) => n + (Number(r.upcomingBookings) || 0), 0);

  return (
    <>
      <div className="profile-head">
        <div>
          <h1>Room &amp; resource schedule</h1>
          <p className="hint">
            Rooms are chosen per period on the Timetable page; a room cannot be used by two classes in the
            same period. Use bookings for one-off uses (exams, meetings, practice).
          </p>
        </div>
        <div className="head-actions">
          <button
            type="button"
            className="big-action"
            onClick={() => {
              setError('');
              setEditId(null);
              setRoomForm(EMPTY_ROOM);
              setEntry(true);
            }}
          >
            + Add room
          </button>
        </div>
      </div>
      {error && !entry && !bookEntry && (
        <p className="error" role="alert">
          {error}
        </p>
      )}

      <div className="stats enquiry-tiles four">
        <Tile icon="▤" tone="blue" label="Rooms & resources" value={rooms.length} />
        <Tile icon="♙" tone="green" label="Total capacity" value={capacity} />
        <Tile icon="◷" tone="amber" label="Upcoming bookings" value={upcoming} />
        <Tile icon="✓" tone="violet" label="Labs & halls" value={count('lab') + count('hall')} />
      </div>

      <section className="card enquiry-card">
        <div className="tabs-line" role="tablist">
          {TABS.map(([k, l]) => (
            <button
              key={k}
              type="button"
              role="tab"
              aria-selected={tab === k}
              className={tab === k ? 'on' : ''}
              onClick={() => {
                setTab(k);
                setPage(1);
              }}
            >
              {l}
              <span className="count">{count(k)}</span>
            </button>
          ))}
        </div>
        <div className="toolbar">
          <label className="search-field">
            <span aria-hidden="true">⌕</span>
            <input
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setPage(1);
              }}
              placeholder="Search room…"
              aria-label="Search rooms"
            />
          </label>
          <span className="showing">{shown.length} rooms</span>
        </div>
        <div className="table-scroll">
          <table className="enquiry-table">
            <thead>
              <tr>
                <th>Room</th>
                <th>Type</th>
                <th>Capacity</th>
                <th>Periods / week</th>
                <th>Upcoming bookings</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {pageRows.map((r) => (
                <tr key={r.id}>
                  <td>
                    <b>{r.name}</b>
                  </td>
                  <td style={{ textTransform: 'capitalize' }}>{r.kind}</td>
                  <td>{r.capacity ?? '—'}</td>
                  <td>{r.periodsPerWeek}</td>
                  <td>{r.upcomingBookings}</td>
                  <td className="row-actions">
                    <button type="button" onClick={() => setRoomId(String(r.id))}>
                      Schedule
                    </button>
                    <Gate action="edit">
                      <button
                        type="button"
                        className="ghost"
                        onClick={() => {
                          setError('');
                          setEditId(r.id);
                          setRoomForm({ name: r.name, kind: r.kind, capacity: r.capacity ?? '' });
                          setEntry(true);
                        }}
                      >
                        Edit
                      </button>
                    </Gate>
                    <Gate action="delete">
                      <button
                        type="button"
                        className="ghost"
                        onClick={() => run(() => api(`/scheduling/rooms/${r.id}`, { method: 'DELETE' }))}
                      >
                        Delete
                      </button>
                    </Gate>
                  </td>
                </tr>
              ))}
              {!pageRows.length && (
                <tr>
                  <td colSpan={6} className="empty-row">
                    {needle || tab !== 'all' ? 'No rooms match.' : 'No rooms yet.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <Pagination page={page} pageSize={PAGE_SIZE} total={shown.length} onChange={setPage} />
      </section>

      {schedule && (
        <>
          <section className="card enquiry-card">
            <header className="card-head" style={{ padding: '22px 22px 14px', marginBottom: 0 }}>
              <span>
                <h2>{schedule.room.name}</h2>
                <small>Weekly timetable</small>
              </span>
            </header>
            <div className="table-scroll">
              <table className="grid">
                <thead>
                  <tr>
                    <th>Period</th>
                    {DAYS.map((d) => (
                      <th key={d}>{d}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {PERIODS.map((p) => (
                    <tr key={p}>
                      <th>{p}</th>
                      {DAYS.map((d, i) => {
                        const s = cell(i + 1, p);
                        return (
                          <td key={d}>
                            {s && (
                              <>
                                <b>{s.className}</b>
                                <br />
                                <small>{s.subjectName}</small>
                              </>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="card enquiry-card">
            <header className="card-head" style={{ padding: '22px 22px 14px', marginBottom: 0 }}>
              <span>
                <h2>Bookings</h2>
                <small>One-off uses of {schedule.room.name}</small>
              </span>
              <button
                type="button"
                onClick={() => {
                  setError('');
                  setBooking(EMPTY_BOOKING);
                  setBookEntry(true);
                }}
              >
                + Book
              </button>
            </header>
            <div className="table-scroll">
              <table className="enquiry-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Period</th>
                    <th>Purpose</th>
                    <th>Booked by</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {schedule.bookings.map((b) => (
                    <tr key={b.id}>
                      <td>{date(b.date)}</td>
                      <td>{b.period}</td>
                      <td>{b.purpose}</td>
                      <td>{b.bookedByName}</td>
                      <td className="row-actions">
                        <button
                          type="button"
                          className="ghost"
                          onClick={() => run(() => api(`/scheduling/bookings/${b.id}`, { method: 'DELETE' }))}
                        >
                          Cancel
                        </button>
                      </td>
                    </tr>
                  ))}
                  {!schedule.bookings.length && (
                    <tr>
                      <td colSpan={5} className="empty-row">
                        No upcoming bookings.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}

      <Modal
        open={entry}
        title={editId ? 'Edit room' : 'Add room'}
        wide={false}
        onClose={() => setEntry(false)}
      >
        <form onSubmit={saveRoom} className="enquiry-form">
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          <div className="enq-grid">
            <label className="wide">
              <span>Room / resource *</span>
              <input
                value={roomForm.name}
                onChange={(e) => setRoomForm({ ...roomForm, name: e.target.value })}
                required
              />
            </label>
            <label>
              <span>Type</span>
              <select
                value={roomForm.kind}
                onChange={(e) => setRoomForm({ ...roomForm, kind: e.target.value })}
              >
                {KINDS.map((k) => (
                  <option key={k}>{k}</option>
                ))}
              </select>
            </label>
            <label>
              <span>Capacity</span>
              <input
                type="number"
                min="1"
                value={roomForm.capacity ?? ''}
                onChange={(e) => setRoomForm({ ...roomForm, capacity: e.target.value })}
              />
            </label>
          </div>
          <div className="form-actions">
            <button type="submit" disabled={busy}>
              {busy ? 'Saving…' : editId ? 'Update' : 'Add room'}
            </button>
            <button type="button" className="ghost" onClick={() => setEntry(false)}>
              Cancel
            </button>
          </div>
        </form>
      </Modal>

      <Modal open={bookEntry} title="Book room" wide={false} onClose={() => setBookEntry(false)}>
        <form onSubmit={book} className="enquiry-form">
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          <div className="enq-grid">
            <label>
              <span>Date *</span>
              <input
                type="date"
                value={booking.date}
                onChange={(e) => setBooking({ ...booking, date: e.target.value })}
                required
              />
            </label>
            <label>
              <span>Period</span>
              <select
                value={booking.period}
                onChange={(e) => setBooking({ ...booking, period: e.target.value })}
              >
                {PERIODS.map((p) => (
                  <option key={p}>{p}</option>
                ))}
              </select>
            </label>
            <label className="wide">
              <span>Purpose *</span>
              <input
                value={booking.purpose}
                onChange={(e) => setBooking({ ...booking, purpose: e.target.value })}
                required
              />
            </label>
          </div>
          <div className="form-actions">
            <button type="submit" disabled={busy}>
              {busy ? 'Saving…' : 'Book'}
            </button>
            <button type="button" className="ghost" onClick={() => setBookEntry(false)}>
              Cancel
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}
