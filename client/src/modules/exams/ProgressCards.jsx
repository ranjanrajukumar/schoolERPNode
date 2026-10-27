import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../services/api.js';
import Modal from '../../components/Modal.jsx';
import Pagination from '../../components/Pagination.jsx';
import { useAuth } from '../../context/AuthContext.jsx';

const PAGE_SIZE = 25;
const GRADES = ['A', 'B', 'C', 'D', 'E'];
const CATEGORIES = ['Skills', 'Attitude', 'Sports', 'Arts'];

function Tile({ icon, tone, label, value, hint }) {
  return (
    <div className="tile card">
      <span className={`tile-icon ${tone}`} aria-hidden="true">{icon}</span>
      <span className="tile-text"><span>{label}</span><b>{value}</b>{hint && <small>{hint}</small>}</span>
    </div>
  );
}

/** Holistic progress cards: grade each student's co-scholastic areas for a term, then open the combined card. */
export default function ProgressCards() {
  const isAdmin = useAuth().user?.role === 'admin';
  const [groups, setGroups] = useState([]);
  const [groupId, setGroupId] = useState('');
  const [data, setData] = useState(null);
  const [edits, setEdits] = useState({}); // `${studentId}:${areaId}` -> grade
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [area, setArea] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const loadSeq = useRef(0); // only the newest request may fill the page
  const load = useCallback(() => {
    if (!groupId) { setData(null); return; }
    const mine = (loadSeq.current += 1);
    setEdits({}); setPage(1);
    api(`/progress-card/groups/${groupId}/grades`).then((d) => { if (mine === loadSeq.current) setData(d); }).catch((e) => { if (mine === loadSeq.current) setError(e.message); });
  }, [groupId]);
  useEffect(() => { api('/exams/groups').then((g) => { setGroups(g); if (g[0]) setGroupId((id) => id || String(g[0].id)); }).catch((e) => setError(e.message)); }, []);
  // another term: drop the old students at once so they never sit under the new term
  useEffect(() => { setData(null); load(); }, [load]);

  const gradeOf = (s, a) => edits[`${s.studentId}:${a.id}`] ?? s.grades[a.id]?.grade ?? '';
  const dirty = Object.keys(edits).length > 0;
  const save = async () => {
    setError(''); setNotice(''); setBusy(true);
    const records = Object.entries(edits).map(([k, grade]) => { const [studentId, areaId] = k.split(':').map(Number); return { studentId, areaId, grade }; });
    try { await api(`/progress-card/groups/${data?.group.id ?? groupId}/grades`, { method: 'POST', body: { records } }); setNotice(`Saved ${records.length} grades.`); load(); } catch (err) { setError(err.message); } finally { setBusy(false); }
  };
  const addArea = async (e) => {
    e.preventDefault(); setBusy(true); setError('');
    try { await api('/progress-card/areas', { method: 'POST', body: area }); setArea(null); setNotice('Area added.'); load(); } catch (err) { setError(err.message); } finally { setBusy(false); }
  };
  const removeArea = async (a) => {
    if (dirty) { setError('Save or clear your grades first: removing an area reloads the table.'); return; }
    try { await api(`/progress-card/areas/${a.id}`, { method: 'DELETE' }); load(); } catch (err) { setError(err.message); }
  };

  const needle = q.trim().toLowerCase();
  const students = (data?.students ?? []).filter((s) => !needle || `${s.name} ${s.admissionNo}`.toLowerCase().includes(needle));
  const pageRows = students.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const areas = data?.areas ?? [];
  const graded = (data?.students ?? []).filter((s) => areas.length && areas.every((a) => s.grades[a.id])).length;

  return (
    <>
      <div className="profile-head">
        <div>
          <h1>Holistic progress card</h1>
          <p className="hint">Scholastic marks come from the term's exams; grade the co-scholastic areas here (A is best), then open each student's card to print.</p>
        </div>
        <div className="head-actions">
          <select value={groupId} onChange={(e) => setGroupId(e.target.value)} aria-label="Term" disabled={dirty} title={dirty ? 'Save your grades first' : undefined} style={{ minHeight: 44 }}>
            {groups.map((g) => <option key={g.id} value={g.id}>{g.name} · {g.className}</option>)}
          </select>
          {isAdmin && <button type="button" className="ghost" onClick={() => { setError(''); setArea({ name: '', category: 'Skills' }); }}>＋ Area</button>}
          <button type="button" className="big-action" onClick={save} disabled={busy || !dirty}>{busy ? 'Saving…' : dirty ? 'Save grades' : 'Saved'}</button>
        </div>
      </div>
      {notice && <p className="success">{notice}</p>}
      {error && !area && <p className="error" role="alert">{error}</p>}

      <div className="stats enquiry-tiles four">
        <Tile icon="♙" tone="blue" label="Students" value={data?.students.length ?? 0} />
        <Tile icon="▤" tone="violet" label="Co-scholastic areas" value={areas.length} />
        <Tile icon="✓" tone="green" label="Fully graded" value={graded} />
        <Tile icon="◷" tone="amber" label="Still to grade" value={(data?.students.length ?? 0) - graded} />
      </div>

      <section className="card enquiry-card">
        <div className="toolbar">
          <label className="search-field"><span aria-hidden="true">⌕</span><input value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} placeholder="Search student…" aria-label="Search students" /></label>
          <span className="showing">{students.length} students</span>
        </div>
        <div className="table-scroll">
          <table className="enquiry-table">
            <thead>
              <tr>
                <th>Student</th>
                {areas.map((a) => (
                  <th key={a.id}>{a.name}<small className="block">{a.category}</small>{isAdmin && <button type="button" className="ghost danger" onClick={() => removeArea(a)} aria-label={`Delete ${a.name}`}>Remove</button>}</th>
                ))}
                <th />
              </tr>
            </thead>
            <tbody>
              {pageRows.map((s) => (
                <tr key={s.studentId}>
                  <td><b>{s.name}</b><small className="block">{s.admissionNo}</small></td>
                  {areas.map((a) => (
                    <td key={a.id}>
                      <select value={gradeOf(s, a)} onChange={(e) => setEdits((ed) => ({ ...ed, [`${s.studentId}:${a.id}`]: e.target.value }))} aria-label={`${a.name} grade for ${s.name}`}>
                        <option value="">—</option>{GRADES.map((g) => <option key={g} value={g}>{g}</option>)}
                      </select>
                    </td>
                  ))}
                  <td className="row-actions"><Link className="ghost btn" to={`/progress-cards/${groupId}/${s.studentId}`}>Open card</Link></td>
                </tr>
              ))}
              {!pageRows.length && <tr><td colSpan={areas.length + 2} className="empty-row">{!groupId ? 'Create an exam group (Term) first.' : needle ? 'No students match.' : 'No students in this class.'}</td></tr>}
            </tbody>
          </table>
        </div>
        <Pagination page={page} pageSize={PAGE_SIZE} total={students.length} onChange={setPage} />
      </section>

      <Modal open={Boolean(area)} title="New co-scholastic area" wide={false} onClose={() => setArea(null)}>
        {area && (
          <form onSubmit={addArea} className="enquiry-form">
            {error && <p className="error" role="alert">{error}</p>}
            <div className="enq-grid">
              <label><span>Name *</span><input value={area.name} onChange={(e) => setArea({ ...area, name: e.target.value })} placeholder="Art & craft" required maxLength={80} /></label>
              <label><span>Category</span><select value={area.category} onChange={(e) => setArea({ ...area, category: e.target.value })}>{CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select></label>
            </div>
            <div className="form-actions"><button type="submit" disabled={busy}>{busy ? 'Saving…' : 'Add area'}</button><button type="button" className="ghost" onClick={() => setArea(null)}>Cancel</button></div>
          </form>
        )}
      </Modal>
    </>
  );
}
