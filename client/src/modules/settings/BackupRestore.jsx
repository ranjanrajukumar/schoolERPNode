import { useEffect, useRef, useState } from 'react';
import { api } from '../../services/api.js';
import { download, postText } from './DataTools.jsx';
import { localDate } from '../../utils/dates.js';

function Tile({ icon, tone, label, value, hint }) {
  return (
    <div className="tile card">
      <span className={`tile-icon ${tone}`} aria-hidden="true">{icon}</span>
      <span className="tile-text"><span>{label}</span><b>{value}</b>{hint && <small>{hint}</small>}</span>
    </div>
  );
}

/** Download a full backup, or restore one (which replaces everything). */
export default function BackupRestore() {
  const [summary, setSummary] = useState(null);
  const [file, setFile] = useState(null);
  const [typed, setTyped] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const input = useRef(null);
  const today = localDate();

  useEffect(() => { api('/data/backup/summary').then(setSummary).catch((e) => setError(e.message)); }, []);

  const backup = async () => {
    setError(''); setNotice(''); setBusy(true);
    try { await download('/data/backup', `school-erp-backup-${today}.json`); setNotice('Backup downloaded. Keep it somewhere safe.'); } catch (err) { setError(err.message); } finally { setBusy(false); }
  };

  const restore = async () => {
    setError(''); setNotice(''); setBusy(true);
    try {
      const r = await postText('/data/restore?confirm=RESTORE', await file.text());
      setNotice(`Restored ${r.rows} rows in ${r.tables} tables from the backup made on ${String(r.backupCreatedAt).slice(0, 10)}. Sign in again.`);
      setFile(null); setTyped(''); input.current.value = '';
      setTimeout(() => { localStorage.removeItem('token'); window.location.href = '/login'; }, 4000);
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  };

  return (
    <>
      <div className="profile-head">
        <div>
          <h1>Backup &amp; restore</h1>
          <p className="hint">Download a copy of every record, or restore the system from one.</p>
        </div>
        <div className="head-actions"><button type="button" className="big-action" disabled={busy} onClick={backup}>{busy ? 'Working…' : '↓ Download backup'}</button></div>
      </div>
      {error && <p className="error" role="alert">{error}</p>}
      {notice && <p className="success">{notice}</p>}

      <div className="stats enquiry-tiles four">
        <Tile icon="▤" tone="blue" label="Records" value={summary ? summary.rows : '—'} />
        <Tile icon="▣" tone="violet" label="Tables" value={summary ? summary.tables : '—'} />
      </div>

      <section className="card">
        <header className="card-head"><span><h2>Back up</h2></span></header>
        <p className="hint">Downloads every record in the system as one file{summary && ` (${summary.rows} rows in ${summary.tables} tables)`}. It includes sign-in details (password hashes), so store it as carefully as the database itself. Uploaded photos and documents are <b>not</b> included: copy the <code>server/uploads</code> folder separately. For routine protection also schedule <code>mysqldump</code> on the database server.</p>
        <p><button type="button" disabled={busy} onClick={backup}>{busy ? 'Working…' : 'Download backup'}</button></p>
      </section>

      <section className="card">
        <header className="card-head"><span><h2>Restore</h2></span></header>
        <p className="error"><b>Restoring replaces everything.</b> All current records, users and settings are deleted and replaced by the backup. It is done in one step: if the file is damaged or from a different version, nothing changes. Download a fresh backup first. You will be signed out afterwards.</p>
        <div className="form">
          <label>Backup file<input type="file" accept=".json,application/json" ref={input} onChange={(e) => setFile(e.target.files?.[0] ?? null)} /></label>
          <label>Type RESTORE to confirm<input value={typed} onChange={(e) => setTyped(e.target.value)} /></label>
          <button type="button" className="danger" disabled={busy || !file || typed !== 'RESTORE'} onClick={restore}>{busy ? 'Restoring…' : 'Restore from this file'}</button>
        </div>
      </section>
    </>
  );
}
