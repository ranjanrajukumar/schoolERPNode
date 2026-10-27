import { useCallback, useEffect, useState } from 'react';
import { api } from '../../services/api.js';
import TypeaheadSelect from '../../components/TypeaheadSelect.jsx';
import Modal from '../../components/Modal.jsx';
import Pagination from '../../components/Pagination.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useOpenNew } from '../../hooks/useOpenNew.js';

const PAGE_SIZE = 25;
const EMPTY = { name: '', section: 'A', room: '', branchId: '', classTeacherId: '' };
const TABS = [['all', 'All classes'], ['noTeacher', 'No class teacher'], ['empty', 'No students']];

function Tile({ icon, tone, label, value, hint }) {
  return (
    <div className="tile card">
      <span className={`tile-icon ${tone}`} aria-hidden="true">{icon}</span>
      <span className="tile-text"><span>{label}</span><b>{value}</b>{hint && <small>{hint}</small>}</span>
    </div>
  );
}

/** Classes and sections, each with its class teacher, room and campus. */
export default function Classes() {
  const canWrite = useAuth().user?.role === 'admin';
  const [rows, setRows] = useState([]);
  const [branches, setBranches] = useState([]);
  const [form, setForm] = useState(EMPTY);
  const [editId, setEditId] = useState(null);
  const [entry, setEntry] = useState(false);
  const [tab, setTab] = useState('all');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(() => { api('/classes').then(setRows).catch((e) => setError(e.message)); }, []);
  useEffect(load, [load]);
  useEffect(() => { api('/branches').then(setBranches).catch(() => {}); }, []);

  const openNew = () => { setError(''); setEditId(null); setForm(EMPTY); setEntry(true); };
  const openEdit = (c) => { setError(''); setEditId(c.id); setForm({ name: c.name, section: c.section, room: c.room ?? '', branchId: c.branchId ?? '', classTeacherId: c.classTeacherId ?? '' }); setEntry(true); };
  useOpenNew(openNew, canWrite);

  const save = async (e) => {
    e.preventDefault();
    setError(''); setBusy(true);
    try {
      await api(editId ? `/classes/${editId}` : '/classes', { method: editId ? 'PUT' : 'POST', body: form });
      setEntry(false); load();
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  };
  const remove = async (c) => {
    setError('');
    try { await api(`/classes/${c.id}`, { method: 'DELETE' }); load(); } catch (err) { setError(err.message); }
  };

  const inTab = (r, k) => k === 'all' || (k === 'noTeacher' ? !r.classTeacherId : r.studentCount === 0);
  const count = (k) => rows.filter((r) => inTab(r, k)).length;
  const needle = q.trim().toLowerCase();
  const shown = rows.filter((r) => inTab(r, tab) && (!needle || `${r.name} ${r.section} ${r.classTeacherName ?? ''} ${r.room ?? ''}`.toLowerCase().includes(needle)));
  const pageRows = shown.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const students = rows.reduce((n, r) => n + r.studentCount, 0);

  return (
    <>
      <div className="profile-head">
        <div>
          <h1>Classes &amp; sections</h1>
          <p className="hint">Every class and section with its class teacher, room and campus. The class teacher gets a My class page.</p>
        </div>
        {canWrite && <div className="head-actions"><button type="button" className="big-action" onClick={openNew}>+ Add class</button></div>}
      </div>
      {error && !entry && <p className="error" role="alert">{error}</p>}

      <div className="stats enquiry-tiles four">
        <Tile icon="▤" tone="blue" label="Classes" value={rows.length} />
        <Tile icon="♙" tone="green" label="Students" value={students} />
        <Tile icon="!" tone="amber" label="No class teacher" value={count('noTeacher')} />
        <Tile icon="○" tone="violet" label="Without students" value={count('empty')} />
      </div>

      <section className="card enquiry-card">
        <div className="tabs-line" role="tablist">
          {TABS.map(([k, l]) => <button key={k} type="button" role="tab" aria-selected={tab === k} className={tab === k ? 'on' : ''} onClick={() => { setTab(k); setPage(1); }}>{l}<span className="count">{count(k)}</span></button>)}
        </div>
        <div className="toolbar">
          <label className="search-field"><span aria-hidden="true">⌕</span><input value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} placeholder="Search class, teacher or room…" aria-label="Search classes" /></label>
          <span className="showing">{shown.length} classes</span>
        </div>
        <div className="table-scroll">
          <table className="enquiry-table">
            <thead><tr><th>Class</th><th>Section</th><th>Class teacher</th><th>Room</th>{branches.length > 0 && <th>Campus</th>}<th>Students</th>{canWrite && <th />}</tr></thead>
            <tbody>
              {pageRows.map((c) => (
                <tr key={c.id}>
                  <td><b>{c.name}</b></td>
                  <td>{c.section}</td>
                  <td>{c.classTeacherName ?? <span className="badge partial">not set</span>}</td>
                  <td>{c.room ?? '—'}</td>
                  {branches.length > 0 && <td>{branches.find((b) => b.id === c.branchId)?.name ?? '—'}</td>}
                  <td>{c.studentCount}</td>
                  {canWrite && (
                    <td className="row-actions">
                      <button type="button" className="ghost" onClick={() => openEdit(c)}>Edit</button>
                      <button type="button" className="ghost" onClick={() => remove(c)}>Delete</button>
                    </td>
                  )}
                </tr>
              ))}
              {!pageRows.length && <tr><td colSpan={7} className="empty-row">{needle || tab !== 'all' ? 'No classes match.' : 'No classes yet.'}</td></tr>}
            </tbody>
          </table>
        </div>
        <Pagination page={page} pageSize={PAGE_SIZE} total={shown.length} onChange={setPage} />
      </section>

      <Modal open={entry} title={editId ? 'Edit class' : 'Add class'} wide={false} onClose={() => setEntry(false)}>
        <form onSubmit={save} className="enquiry-form">
          {error && <p className="error" role="alert">{error}</p>}
          <div className="enq-grid">
            <label><span>Class *</span><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required maxLength={50} placeholder="e.g. Grade 5" /></label>
            <label><span>Section *</span><input value={form.section} onChange={(e) => setForm({ ...form, section: e.target.value })} required maxLength={10} /></label>
            <label className="wide"><span>Class teacher</span><TypeaheadSelect kind="staff" value={form.classTeacherId ?? ''} onChange={(id) => setForm({ ...form, classTeacherId: id })} filters={{ status: 'active' }} placeholder="Find a teacher…" /></label>
            <label><span>Room</span><input value={form.room} onChange={(e) => setForm({ ...form, room: e.target.value })} maxLength={30} /></label>
            {branches.length > 0 && (
              <label><span>Campus</span>
                <select value={form.branchId ?? ''} onChange={(e) => setForm({ ...form, branchId: e.target.value })}>
                  <option value="">--</option>{branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </label>
            )}
          </div>
          <div className="form-actions"><button type="submit" disabled={busy}>{busy ? 'Saving…' : editId ? 'Save changes' : 'Add class'}</button><button type="button" className="ghost" onClick={() => setEntry(false)}>Cancel</button></div>
        </form>
      </Modal>
    </>
  );
}
