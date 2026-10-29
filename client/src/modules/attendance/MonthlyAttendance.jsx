import { useCallback, useEffect, useRef, useState } from 'react';
import Gate from '../../components/Gate.jsx';
import { api } from '../../services/api.js';
import Modal from '../../components/Modal.jsx';
import Pagination from '../../components/Pagination.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { localDate } from '../../utils/dates.js';

const PAGE_SIZE = 25;
const EMPTY_DATA = { days: 0, rows: [], offs: {} };
const CODE = { present: 'P', late: 'L', absent: 'A', leave: 'Lv', half: 'HL' };
const WORD = { present: 'Present', late: 'Late', absent: 'Absent', leave: 'Leave', half: 'Half-day leave' };
const PARTS = [
  ['first_half', 'First half'],
  ['second_half', 'Second half'],
  ['full', 'Other (whole days)'],
];
const MARKS = [
  ['present', 'Present'],
  ['late', 'Late'],
  ['absent', 'Absent'],
];
const thisMonth = () => localDate().slice(0, 7);
const todayStr = () => localDate();
const csvCell = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
const two = (n) => String(n).padStart(2, '0');

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
 * A month-at-a-glance register: a row per person, a column per day. W is the weekly off, H a holiday.
 * Click a day to open that person's record: mark present, late or absent for one day or a range, or apply for leave.
 * `kind` is "student" or "staff".
 */
export default function MonthlyAttendance({ kind }) {
  const staff = kind === 'staff';
  const canEdit = ['admin', 'teacher'].includes(useAuth().user?.role);
  const [edits, setEdits] = useState({}); // `${id}:${day}` -> status, from the ✓ under a day number; not saved yet
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [month, setMonth] = useState(thisMonth());
  const [classId, setClassId] = useState('');
  const [category, setCategory] = useState('');
  const [classes, setClasses] = useState([]);
  const [types, setTypes] = useState([]);
  const [data, setData] = useState(EMPTY_DATA);
  const loadSeq = useRef(0); // only the newest request may fill the page
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [error, setError] = useState('');
  const [record, setRecord] = useState(null); // { row, day, choice, to, remark, dayPart, fromTime, toTime } while the popup is open
  const [assumeAbsent, setAssumeAbsent] = useState(true); // display only: a past working day nobody marked shows as A

  useEffect(() => {
    if (!staff)
      api('/classes')
        .then(setClasses)
        .catch(() => {});
  }, [staff]);
  useEffect(() => {
    api(`/leave-types?kind=${kind}`)
      .then(setTypes)
      .catch(() => {});
  }, [kind]);
  const load = useCallback(() => {
    const mine = (loadSeq.current += 1);
    setError('');
    setEdits({});
    const url = staff
      ? `/hr/attendance/monthly?month=${month}${category ? `&category=${category}` : ''}`
      : `/attendance/monthly?month=${month}${classId ? `&classId=${classId}` : ''}`;
    api(url)
      .then((d) => {
        if (mine === loadSeq.current) setData(d);
      })
      .catch((e) => {
        if (mine === loadSeq.current) setError(e.message);
      });
  }, [staff, month, classId, category]);
  // a different month, class or category: clear the old rows at once so they never sit under the new filter
  useEffect(() => {
    setPage(1);
    setNotice('');
    setData(EMPTY_DATA);
    load();
  }, [load]);

  const needle = q.trim().toLowerCase();
  const shown = data.rows.filter(
    (r) =>
      !needle ||
      `${r.no} ${r.name} ${r.className ?? ''} ${r.designation ?? ''}`.toLowerCase().includes(needle),
  );
  const pageRows = shown.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const days = Array.from({ length: data.days }, (_, i) => i + 1);

  const dayStr = (d) => `${month}-${two(d)}`;
  const isFuture = (d) => dayStr(d) > todayStr();
  const valueOf = (r, d) => edits[`${r.id}:${d}`] ?? r.marks[d];
  const weekday = (d) =>
    new Date(`${dayStr(d)}T00:00:00`)
      .toLocaleDateString('en-GB', { weekday: 'short' })
      .slice(0, 1)
      .toUpperCase();

  // ✓ under a day number: mark everyone shown present for that day, leaving days that already have a mark alone
  const markDayPresent = (d) => {
    setEdits((e) => {
      const next = { ...e };
      for (const r of shown) if (!valueOf(r, d)) next[`${r.id}:${d}`] = 'present';
      return next;
    });
  };
  const dirty = Object.keys(edits).length;

  const sendChanges = async (changes) => {
    const url = staff ? '/hr/attendance/monthly' : '/attendance/monthly';
    const send = (reason) => api(url, { method: 'POST', body: { month, changes, reason } });
    try {
      return await send();
    } catch (err) {
      if (!/reason is required/i.test(err.message)) throw err;
      const given = prompt(`${err.message}\n\nReason for the change:`);
      if (!given?.trim()) throw new Error('Not saved: a reason is required to change past attendance.');
      return send(given.trim());
    }
  };
  const savedMessage = (out) =>
    `Saved ${out.saved} mark${out.saved === 1 ? '' : 's'}${out.corrected ? ` (${out.corrected} correction${out.corrected === 1 ? '' : 's'} logged)` : ''}.`;
  const saveBulk = async () => {
    setError('');
    setNotice('');
    setBusy(true);
    try {
      const out = await sendChanges(
        Object.entries(edits).map(([k, status]) => {
          const [id, d] = k.split(':');
          return { id: Number(id), date: dayStr(d), status };
        }),
      );
      setNotice(savedMessage(out));
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    if (!dirty) return undefined;
    const warn = (e) => {
      e.preventDefault();
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  const openRecord = (row, day) => {
    setNotice('');
    if (dirty) {
      setError('Save or clear the ✓ changes first (the Save button above).');
      return;
    }
    setError('');
    const mark = row.marks[day];
    setRecord({
      row,
      day,
      choice: mark && mark !== 'leave' && mark !== 'half' ? mark : '',
      to: dayStr(day),
      remark: row.details?.[day]?.note ?? '',
      dayPart: 'full',
      fromTime: '',
      toTime: '',
    });
  };

  const saveRecord = async (e) => {
    e.preventDefault();
    const { row, day, choice, to, remark } = record;
    if (!choice) {
      setError('Choose how to mark this day.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      if (choice.startsWith('leave:')) {
        const timely = Boolean(record.fromTime || record.toTime);
        const half = record.dayPart !== 'full';
        const body = {
          [staff ? 'staffId' : 'studentId']: row.id,
          leaveTypeId: Number(choice.slice(6)),
          fromDate: dayStr(day),
          toDate: timely || half ? dayStr(day) : to,
          dayPart: timely ? 'time' : record.dayPart,
          fromTime: timely ? record.fromTime : undefined,
          toTime: timely ? record.toTime : undefined,
          reason: remark.trim() || (staff ? undefined : 'Leave recorded from the monthly register'),
        };
        const out = await api(staff ? '/hr/leaves' : '/student-leaves', { method: 'POST', body });
        setNotice(
          staff && out.status === 'approved'
            ? 'Leave recorded and approved.'
            : 'Leave recorded. It shows as Lv once approved.',
        );
      } else {
        const changes = [];
        for (let d = day; d <= Number(to.slice(8)); d += 1) {
          const skip = d !== day && data.offs[d] && !row.marks[d]; // a range skips weekly offs and holidays
          if (!isFuture(d) && !skip)
            changes.push({
              id: row.id,
              date: dayStr(d),
              status: choice,
              ...(remark.trim() && !staff && { note: remark.trim() }),
            });
        }
        if (!changes.length) throw new Error('There is no day to mark in that range.');
        setNotice(savedMessage(await sendChanges(changes)));
      }
      setRecord(null);
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const withMarks = data.rows.filter((r) => r.percentage !== null);
  const average = withMarks.length
    ? withMarks.reduce((s, r) => s + r.percentage, 0) / withMarks.length
    : null;

  const exportCsv = () => {
    const head = [
      staff ? 'Staff no' : 'Admission no',
      'Name',
      staff ? 'Designation' : 'Class',
      ...days,
      'Present',
      'Late',
      'Absent',
      'Leave',
      'Attendance %',
    ];
    const lines = shown.map((r) =>
      [
        r.no,
        r.name,
        staff ? r.designation : r.className,
        ...days.map((d) => CODE[r.marks[d]] ?? data.offs[d]?.code ?? ''),
        r.present,
        r.late,
        r.absent,
        r.leave,
        r.percentage,
      ]
        .map(csvCell)
        .join(','),
    );
    const url = URL.createObjectURL(
      new Blob([[head.map(csvCell).join(','), ...lines].join('\r\n')], { type: 'text/csv' }),
    );
    const a = document.createElement('a');
    a.href = url;
    a.download = `${kind}-attendance-${month}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const set = (k) => (e) => setRecord({ ...record, [k]: e.target.value });
  const current = record ? (record.row.marks[record.day] ?? null) : null;

  return (
    <>
      <div className="profile-head">
        <div>
          <h1>{staff ? 'Monthly staff attendance' : 'Monthly student attendance'}</h1>
          <p className="hint">
            P present · L late · A absent · Lv leave · HL half-day leave · W weekly off · H holiday.{' '}
            {canEdit
              ? 'Click a day to open the record: mark it for one day or a range, or apply for leave. The ✓ under a date marks everyone shown present for that day.'
              : ''}
          </p>
        </div>
        <div className="head-actions no-print">
          <input
            type="month"
            value={month}
            max={thisMonth()}
            onChange={(e) => setMonth(e.target.value || thisMonth())}
            aria-label="Month"
            disabled={dirty > 0}
            title={dirty > 0 ? 'Save or clear your changes first' : undefined}
            style={{ minHeight: 44 }}
          />
          {staff ? (
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              aria-label="Staff category"
              disabled={dirty > 0}
              title={dirty > 0 ? 'Save or clear your changes first' : undefined}
              style={{ minHeight: 44 }}
            >
              <option value="">All staff</option>
              <option value="teaching">Teaching</option>
              <option value="non_teaching">Non-teaching</option>
            </select>
          ) : (
            <select
              value={classId}
              onChange={(e) => setClassId(e.target.value)}
              aria-label="Class"
              disabled={dirty > 0}
              title={dirty > 0 ? 'Save or clear your changes first' : undefined}
              style={{ minHeight: 44 }}
            >
              <option value="">All classes</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}-{c.section}
                </option>
              ))}
            </select>
          )}
          {canEdit && dirty > 0 && (
            <button type="button" className="big-action" onClick={saveBulk} disabled={busy}>
              {busy ? 'Saving…' : `Save ${dirty} change${dirty === 1 ? '' : 's'}`}
            </button>
          )}
          {dirty > 0 && (
            <button type="button" className="ghost" onClick={() => setEdits({})}>
              Clear
            </button>
          )}
          <label className="check" title="Display only: nothing is saved or counted">
            <input
              type="checkbox"
              checked={assumeAbsent}
              onChange={(e) => setAssumeAbsent(e.target.checked)}
            />{' '}
            <span>Show unmarked as absent</span>
          </label>
          <Gate action="export">
            <button type="button" className="ghost" onClick={exportCsv}>
              ↓ Export
            </button>
          </Gate>
          <button type="button" className="ghost" onClick={() => window.print()}>
            Print
          </button>
        </div>
      </div>
      {notice && <p className="success">{notice}</p>}
      {error && !record && (
        <p className="error" role="alert">
          {error}
        </p>
      )}

      <div className="stats enquiry-tiles four">
        <Tile icon="♙" tone="blue" label={staff ? 'Staff' : 'Students'} value={data.rows.length} />
        <Tile
          icon="✓"
          tone="green"
          label="Average attendance"
          value={average === null ? '—' : `${average.toFixed(1)}%`}
        />
        <Tile icon="×" tone="red" label="Absences" value={data.rows.reduce((s, r) => s + r.absent, 0)} />
        <Tile icon="◷" tone="amber" label="Late marks" value={data.rows.reduce((s, r) => s + r.late, 0)} />
      </div>

      <section className="card enquiry-card">
        <div className="toolbar no-print">
          <label className="search-field">
            <span aria-hidden="true">⌕</span>
            <input
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setPage(1);
              }}
              placeholder={staff ? 'Search name or staff no…' : 'Search name, admission no or class…'}
              aria-label="Search"
            />
          </label>
          <span className="showing">
            {shown.length} {staff ? 'staff' : 'students'}
          </span>
        </div>
        <div className="table-scroll">
          <table className="enquiry-table no-sno month-register">
            <thead>
              <tr>
                <th className="col-no">#</th>
                <th className="col-who">{staff ? 'Employee name' : 'Student name'}</th>
                <th className="col-code">{staff ? 'Employee code' : 'Admission no'}</th>
                {days.map((d) => (
                  <th key={d} className={`day${data.offs[d] ? ' off' : ''}`} title={data.offs[d]?.label}>
                    {two(d)}
                    {canEdit && !isFuture(d) && !data.offs[d] && (
                      <button
                        type="button"
                        className="day-all no-print"
                        onClick={() => markDayPresent(d)}
                        title={`Mark everyone shown present on day ${d} (unmarked only)`}
                        aria-label={`Mark all present on day ${d}`}
                      >
                        ✓
                      </button>
                    )}
                    <small>{weekday(d)}</small>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pageRows.map((r, i) => (
                <tr key={r.id}>
                  <td className="col-no">{(page - 1) * PAGE_SIZE + i + 1}</td>
                  <td className="col-who">
                    <b>{r.name}</b>
                    {(staff ? r.designation : r.className) && (
                      <small className="block">{staff ? r.designation : r.className}</small>
                    )}
                  </td>
                  <td className="col-code">{r.no}</td>
                  {days.map((d) => {
                    const v = valueOf(r, d);
                    const off = data.offs[d];
                    const assumed = !v && !off && !isFuture(d) && assumeAbsent;
                    const shownCode = CODE[v] ?? (off ? off.code : assumed ? 'A' : '');
                    const tone = v ?? (off ? `off-${off.code}` : assumed ? 'absent assumed' : '');
                    const title =
                      v === 'leave' || v === 'half'
                        ? `${WORD[v]}: ${r.leaveTypes?.[d] ?? 'Leave'}`
                        : v
                          ? WORD[v]
                          : assumed
                            ? 'Not marked (shown as absent)'
                            : off?.label;
                    const edited = `${r.id}:${d}` in edits;
                    return (
                      <td key={d} title={title} className={`mark ${tone}${edited ? ' edited' : ''}`}>
                        {canEdit && !isFuture(d) ? (
                          <button
                            type="button"
                            className="cell-btn"
                            onClick={() => openRecord(r, d)}
                            aria-label={`${r.name}, day ${d}: ${title ?? 'not marked'}`}
                          >
                            {shownCode || ' '}
                          </button>
                        ) : (
                          shownCode
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
              {!pageRows.length && (
                <tr>
                  <td colSpan={days.length + 3} className="empty-row">
                    {needle ? 'No match.' : `No ${staff ? 'staff' : 'students'} to show.`}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <Pagination page={page} pageSize={PAGE_SIZE} total={shown.length} onChange={setPage} />
      </section>

      <Modal
        open={Boolean(record)}
        title={record ? `Record of ${record.row.name} (${record.row.no})` : ''}
        wide={false}
        onClose={() => setRecord(null)}
      >
        {record && (
          <form onSubmit={saveRecord} className="enquiry-form record-form">
            {error && (
              <p className="error" role="alert">
                {error}
              </p>
            )}
            <label className="wide">
              <span>Remark</span>
              <textarea
                rows={3}
                value={record.remark}
                onChange={set('remark')}
                maxLength={staff ? 200 : 120}
              />
            </label>
            <div className="enq-grid">
              <label>
                <span>Date from</span>
                <input type="date" value={dayStr(record.day)} readOnly />
              </label>
              <label>
                <span>To</span>
                <input
                  type="date"
                  value={record.to}
                  min={dayStr(record.day)}
                  max={`${month}-${two(data.days)}`}
                  onChange={set('to')}
                  disabled={record.dayPart !== 'full' || Boolean(record.fromTime || record.toTime)}
                  required
                />
              </label>
            </div>
            <fieldset className="radio-list">
              <legend>Mark as</legend>
              {MARKS.map(([v, l]) => (
                <label key={v} className="radio">
                  <input
                    type="radio"
                    name="choice"
                    checked={record.choice === v}
                    onChange={() => setRecord({ ...record, choice: v })}
                  />{' '}
                  {l}
                </label>
              ))}
            </fieldset>
            <fieldset className="radio-list">
              <legend>Or apply for leave</legend>
              <div className="radio-scroll">
                {types.map((t) => (
                  <label key={t.id} className="radio">
                    <input
                      type="radio"
                      name="choice"
                      checked={record.choice === `leave:${t.id}`}
                      onChange={() => setRecord({ ...record, choice: `leave:${t.id}` })}
                    />{' '}
                    {t.name}
                    {t.yearlyDays !== null ? ` · ${t.yearlyDays} days a year` : ''}
                  </label>
                ))}
                {!types.length && (
                  <small>No leave types are set up (Settings → Leave Types &amp; Approval).</small>
                )}
              </div>
              {record.choice.startsWith('leave:') && (
                <small>
                  The request follows the leave type&apos;s approval rule; approved leave then shows as Lv (HL
                  for a half day). Timely leave uses no leave days.
                </small>
              )}
            </fieldset>
            <fieldset className="radio-list inline">
              <legend>Leave covers</legend>
              {PARTS.map(([v, l]) => (
                <label key={v} className="radio">
                  <input
                    type="radio"
                    name="part"
                    checked={record.dayPart === v}
                    onChange={() =>
                      setRecord({ ...record, dayPart: v, to: v === 'full' ? record.to : dayStr(record.day) })
                    }
                  />{' '}
                  {l}
                </label>
              ))}
            </fieldset>
            <div className="enq-grid">
              <label>
                <span>Timely leave: time from</span>
                <input type="time" value={record.fromTime} onChange={set('fromTime')} />
              </label>
              <label>
                <span>To</span>
                <input type="time" value={record.toTime} onChange={set('toTime')} />
              </label>
            </div>
            <table className="mini-table">
              <thead>
                <tr>
                  <th>Data of</th>
                  <th>Att date</th>
                  <th>Status</th>
                  <th>In</th>
                  <th>Out</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Attendance</td>
                  <td>{dayStr(record.day).split('-').reverse().join('/')}</td>
                  <td>{current ? CODE[current] : (data.offs[record.day]?.code ?? '—')}</td>
                  <td>{record.row.details?.[record.day]?.in ?? ''}</td>
                  <td>{record.row.details?.[record.day]?.out ?? ''}</td>
                </tr>
              </tbody>
            </table>
            <div className="form-actions">
              <button type="submit" disabled={busy}>
                {busy ? 'Saving…' : 'Save'}
              </button>
              <button type="button" className="ghost" onClick={() => setRecord(null)}>
                Cancel
              </button>
            </div>
          </form>
        )}
      </Modal>
    </>
  );
}
