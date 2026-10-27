import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../services/api.js';
import { useAuth } from '../../context/AuthContext.jsx';
import Modal from '../../components/Modal.jsx';
import Pagination from '../../components/Pagination.jsx';
import TypeaheadSelect from '../../components/TypeaheadSelect.jsx';
import { useOpenNew } from '../../hooks/useOpenNew.js';

const PAGE_SIZE = 10;
const TABS = [['all', 'All grades'], ['primary', 'Primary'], ['middle', 'Middle school'], ['secondary', 'Secondary']];
const BAND_KEY = { Primary: 'primary', 'Middle school': 'middle', Secondary: 'secondary' };
const GRADES = ['Kindergarten', ...Array.from({ length: 12 }, (_, i) => `Grade ${i + 1}`)];
const EMPTY = { name: 'Grade 1', section: 'A', classTeacherId: '', room: '' };
const csvCell = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
const initials = (name) => (name ?? '').split(' ').map((x) => x[0]).join('').slice(0, 2).toUpperCase();

function Tile({ icon, tone, label, value }) {
  return (
    <div className="tile card">
      <span className={`tile-icon ${tone}`} aria-hidden="true">{icon}</span>
      <span className="tile-text"><span>{label}</span><b>{value}</b></span>
    </div>
  );
}

function Quick({ to, icon, title, text }) {
  return (
    <Link className="quick-card card" to={to}>
      <span className="tile-icon blue" aria-hidden="true">{icon}</span>
      <span><b>{title}</b><small>{text}</small></span>
      <span className="arrow" aria-hidden="true">›</span>
    </Link>
  );
}

/** The Academics overview: classes, subjects, teaching staff and timetable at a glance, with the class list and its add / edit popup. */
export default function Academics() {
  const canWrite = useAuth().user?.role === 'admin';
  const [data, setData] = useState(null);
  const [year, setYear] = useState('');
  const [tab, setTab] = useState('all');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [entry, setEntry] = useState(null); // null | { id? }
  const [form, setForm] = useState(EMPTY);
  const [busy, setBusy] = useState(false);
  useOpenNew(() => openNew(), canWrite); // eslint-disable-line no-use-before-define

  const load = useCallback(() => { api('/classes/overview').then(setData).catch((e) => setError(e.message)); }, []);
  useEffect(load, [load]);
  useEffect(() => { api('/academic-years').then((ys) => setYear(ys.find((y) => y.isCurrent)?.name ?? '')).catch(() => {}); }, []);

  const openNew = () => { setError(''); setNotice(''); setForm(EMPTY); setEntry({}); };
  const openEdit = (r) => { setError(''); setNotice(''); setForm({ name: r.name, section: r.section, classTeacherId: r.classTeacherId ?? '', room: r.room ?? '' }); setEntry({ id: r.id }); };
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const save = async (e) => {
    e.preventDefault();
    setError(''); setBusy(true);
    try {
      await api(entry.id ? `/classes/${entry.id}` : '/classes', { method: entry.id ? 'PUT' : 'POST', body: form });
      setNotice(entry.id ? 'Class updated.' : 'Class added.');
      setEntry(null); load();
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  };
  const remove = async (r) => {
    setError(''); setNotice('');
    try { await api(`/classes/${r.id}`, { method: 'DELETE' }); setNotice('Class deleted.'); load(); } catch (err) { setError(err.message); }
  };

  const rows = data?.rows ?? [];
  const needle = q.trim().toLowerCase();
  const shown = rows.filter((r) => (tab === 'all' || BAND_KEY[r.band] === tab) && (!needle || `${r.name} ${r.section} ${r.teacher ?? ''} ${r.room ?? ''}`.toLowerCase().includes(needle)));
  const pageRows = shown.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const from = shown.length ? (page - 1) * PAGE_SIZE + 1 : 0;
  const goTab = (t) => { setTab(t); setPage(1); };

  const exportCsv = () => {
    const head = ['Class', 'Class teacher', 'Students', 'Subjects', 'Room', 'Grade band'];
    const lines = shown.map((r) => [`${r.name} · ${r.section}`, r.teacher, r.students, r.subjects, r.room, r.band].map(csvCell).join(','));
    const url = URL.createObjectURL(new Blob([[head.map(csvCell).join(','), ...lines].join('\r\n')], { type: 'text/csv' }));
    const a = document.createElement('a'); a.href = url; a.download = 'academic-classes.csv'; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
  };

  const s = data?.summary;
  return (
    <>
      <div className="profile-head">
        <div>
          <h1>Academics</h1>
          <p className="hint">Organize classes, subjects, teachers, and the school timetable.</p>
        </div>
        <div className="head-actions">
          {year && <span className="year-pill">Academic year · {year.replace('-', '–')}</span>}
          {canWrite && <button type="button" className="big-action" onClick={openNew}>＋ Add class</button>}
        </div>
      </div>
      {notice && <p className="success">{notice}</p>}
      {error && !entry && <p className="error" role="alert">{error}</p>}

      <div className="stats enquiry-tiles four">
        <Tile icon="▤" tone="blue" label="Classes & sections" value={s?.classes ?? '…'} />
        <Tile icon="♙" tone="green" label="Subjects" value={s?.subjects ?? '…'} />
        <Tile icon="♧" tone="amber" label="Teaching staff" value={s?.teachingStaff ?? '…'} />
        <Tile icon="◷" tone="violet" label="Timetable completion" value={s ? (s.timetableCompletion === null ? '—' : `${s.timetableCompletion}%`) : '…'} />
      </div>

      <div className="quick-row">
        <Quick to="/classes" icon="▤" title="Classes & Sections" text="Manage grades, sections, and class teachers" />
        <Quick to="/subjects" icon="▧" title="Subjects" text="Set subjects and assign teachers by grade" />
        <Quick to="/timetable" icon="◷" title="Timetable" text="View and manage weekly class schedules" />
      </div>

      <section className="card enquiry-card">
        <header className="card-head" style={{ padding: '22px 22px 18px', marginBottom: 0 }}>
          <span><h2>Classes &amp; sections</h2><small>Class setup and student enrollment overview</small></span>
          <button type="button" className="ghost" style={{ marginLeft: 'auto' }} onClick={exportCsv}>↓ Export</button>
        </header>
        <div className="tabs-line" role="tablist" style={{ borderTop: '1px solid var(--border)' }}>
          {TABS.map(([k, l]) => (
            <button key={k} type="button" role="tab" aria-selected={tab === k} className={tab === k ? 'on' : ''} onClick={() => goTab(k)}>
              {l}{data ? <span className="count">{data.bands[k]}</span> : null}
            </button>
          ))}
        </div>
        <div className="toolbar">
          <label className="search-field"><span aria-hidden="true">⌕</span><input value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} placeholder="Search class…" aria-label="Search class" /></label>
          <span className="showing">Showing <b>{from}–{Math.min(page * PAGE_SIZE, shown.length)}</b> of <b>{shown.length}</b> classes</span>
        </div>
        <div className="table-scroll">
          <table className="enquiry-table">
            <thead><tr><th>Class / section</th><th>Class teacher</th><th>Students</th><th>Subjects</th><th>Room</th><th>Grade band</th>{canWrite && <th />}</tr></thead>
            <tbody>
              {pageRows.map((r) => (
                <tr key={r.id}>
                  <td><b>{r.name} · {r.section}</b>{year && <small className="block">Academic year {year.replace('-', '–')}</small>}</td>
                  <td>{r.teacher ? <span className="person"><span className="avatar-chip blue" aria-hidden="true">{initials(r.teacher)}</span>{r.teacher}</span> : <span className="none">Not assigned</span>}</td>
                  <td>{r.students}</td>
                  <td><span className="badge applied">{r.subjects} {r.subjects === 1 ? 'subject' : 'subjects'}</span></td>
                  <td>{r.room ?? '—'}</td>
                  <td>{r.band}</td>
                  {canWrite && (
                    <td className="row-actions">
                      <button type="button" className="ghost" onClick={() => openEdit(r)}>Edit</button>
                      <button type="button" className="ghost danger" onClick={() => remove(r)}>Delete</button>
                    </td>
                  )}
                </tr>
              ))}
              {!pageRows.length && <tr><td colSpan={canWrite ? 7 : 6} className="empty-row">{needle || tab !== 'all' ? 'No classes match.' : 'No classes yet. Add the first with “Add class”.'}</td></tr>}
            </tbody>
          </table>
        </div>
        <Pagination page={page} pageSize={PAGE_SIZE} total={shown.length} onChange={setPage} />
      </section>

      <Modal open={Boolean(entry)} title={entry?.id ? 'Edit class & section' : 'Add class & section'} wide={false} onClose={() => setEntry(null)}>
        <form onSubmit={save} className="enquiry-form">
          {error && <p className="error" role="alert">{error}</p>}
          <div className="enq-grid">
            <label><span>Grade</span>
              <input list="grade-list" value={form.name} onChange={set('name')} required maxLength={50} />
              <datalist id="grade-list">{GRADES.map((g) => <option key={g} value={g} />)}</datalist>
            </label>
            <label><span>Section</span><input value={form.section} onChange={set('section')} placeholder="e.g. A" required maxLength={10} /></label>
            <label><span>Class teacher</span><TypeaheadSelect kind="staff" value={form.classTeacherId} onChange={(id) => setForm({ ...form, classTeacherId: id })} filters={{ status: 'active' }} placeholder="Teacher name" /></label>
            <label><span>Room</span><input value={form.room} onChange={set('room')} placeholder="e.g. 204" maxLength={20} /></label>
          </div>
          <div className="form-actions">
            <button type="submit" disabled={busy}>{busy ? 'Saving…' : 'Save class'}</button>
            <button type="button" className="ghost" onClick={() => setEntry(null)}>Cancel</button>
          </div>
        </form>
      </Modal>
    </>
  );
}
