import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../services/api.js';
import Modal from '../../components/Modal.jsx';
import { useOpenNew } from '../../hooks/useOpenNew.js';

const EMPTY = { name: '', description: '' };

function Tile({ icon, tone, label, value, hint }) {
  return (
    <div className="tile card">
      <span className={`tile-icon ${tone}`} aria-hidden="true">{icon}</span>
      <span className="tile-text"><span>{label}</span><b>{value}</b>{hint && <small>{hint}</small>}</span>
    </div>
  );
}

/** Groups of staff logins that can be emailed together. */
export default function UserGroups() {
  const [groups, setGroups] = useState([]);
  const [candidates, setCandidates] = useState([]);
  const [form, setForm] = useState(EMPTY);
  const [entry, setEntry] = useState(false);
  const [pick, setPick] = useState({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(() => { api('/user-groups').then(setGroups).catch((e) => setError(e.message)); }, []);
  useEffect(() => { load(); api('/user-groups/candidates').then(setCandidates).catch(() => {}); }, [load]);
  const openNew = () => { setError(''); setForm(EMPTY); setEntry(true); };
  useOpenNew(openNew);

  const run = async (fn) => { setError(''); try { await fn(); load(); } catch (err) { setError(err.message); } };
  const add = async (e) => {
    e.preventDefault();
    setError(''); setBusy(true);
    try { await api('/user-groups', { method: 'POST', body: form }); setEntry(false); setForm(EMPTY); load(); } catch (err) { setError(err.message); } finally { setBusy(false); }
  };

  const members = groups.reduce((n, g) => n + g.members.length, 0);

  return (
    <>
      <div className="profile-head">
        <div>
          <h1>User groups</h1>
          <p className="hint">Group staff logins (for example "Heads of department") and email the whole group in one step.</p>
        </div>
        <div className="head-actions"><button type="button" className="big-action" onClick={openNew}>+ Add group</button></div>
      </div>
      {error && !entry && <p className="error" role="alert">{error}</p>}

      <div className="stats enquiry-tiles four">
        <Tile icon="▤" tone="blue" label="Groups" value={groups.length} />
        <Tile icon="♙" tone="green" label="Memberships" value={members} />
        <Tile icon="○" tone="amber" label="Empty groups" value={groups.filter((g) => !g.members.length).length} />
        <Tile icon="★" tone="violet" label="Logins available" value={candidates.length} />
      </div>

      {groups.map((g) => (
        <section className="card enquiry-card" key={g.id}>
          <header className="card-head" style={{ padding: '22px 22px 14px', marginBottom: 0 }}><span><h2>{g.name}</h2><small>{g.members.length} member(s){g.description ? ` · ${g.description}` : ''}</small></span></header>
          <div className="table-scroll">
            <table className="enquiry-table">
              <thead><tr><th>Name</th><th>Email</th><th>Role</th><th /></tr></thead>
              <tbody>
                {g.members.map((m) => (
                  <tr key={m.id}><td><b>{m.name}</b></td><td>{m.email}</td><td>{m.role}</td>
                    <td className="row-actions"><button type="button" className="ghost" onClick={() => run(() => api(`/user-groups/${g.id}/members/${m.id}`, { method: 'DELETE' }))}>Remove</button></td></tr>
                ))}
                {!g.members.length && <tr><td colSpan={4} className="empty-row">No members yet.</td></tr>}
              </tbody>
            </table>
          </div>
          <div className="toolbar">
            <select value={pick[g.id] ?? ''} onChange={(e) => setPick({ ...pick, [g.id]: e.target.value })} aria-label={`Add a member to ${g.name}`}>
              <option value="">-- add a member --</option>
              {candidates.filter((c) => !g.members.some((m) => m.id === c.id)).map((c) => <option key={c.id} value={c.id}>{c.name} ({c.email})</option>)}
            </select>
            <button type="button" disabled={!pick[g.id]} onClick={() => run(async () => { await api(`/user-groups/${g.id}/members`, { method: 'POST', body: { userId: pick[g.id] } }); setPick({ ...pick, [g.id]: '' }); })}>Add</button>
            {g.members.length > 0 && <Link className="btn" to={`/send-message?channel=email&audience=group&groupId=${g.id}`}>Email this group</Link>}
            <button type="button" className="ghost" onClick={() => run(() => api(`/user-groups/${g.id}`, { method: 'DELETE' }))}>Delete group</button>
          </div>
        </section>
      ))}
      {!groups.length && <section className="card enquiry-card"><p className="empty-row" style={{ padding: 22 }}>No groups yet.</p></section>}

      <Modal open={entry} title="Add group" wide={false} onClose={() => setEntry(false)}>
        <form onSubmit={add} className="enquiry-form">
          {error && <p className="error" role="alert">{error}</p>}
          <div className="enq-grid">
            <label className="wide"><span>Group name *</span><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></label>
            <label className="wide"><span>Description</span><input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></label>
          </div>
          <div className="form-actions"><button type="submit" disabled={busy}>{busy ? 'Saving…' : 'Add group'}</button><button type="button" className="ghost" onClick={() => setEntry(false)}>Cancel</button></div>
        </form>
      </Modal>
    </>
  );
}
