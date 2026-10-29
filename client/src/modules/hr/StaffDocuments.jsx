import { useCallback, useEffect, useRef, useState } from 'react';
import Gate from '../../components/Gate.jsx';
import { api, fetchBlob, uploadFile } from '../../services/api.js';
import TypeaheadSelect from '../../components/TypeaheadSelect.jsx';
import Modal from '../../components/Modal.jsx';
import Pagination from '../../components/Pagination.jsx';
import { useOpenNew } from '../../hooks/useOpenNew.js';

const PAGE_SIZE = 25;
const kb = (n) =>
  n >= 1048576 ? `${(n / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`;

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

/** Contracts, certificates and ID proofs per staff member. Admin only; PDF, JPEG, PNG or WebP up to 5 MB. */
export default function StaffDocuments() {
  const [staffId, setStaffId] = useState('');
  const [files, setFiles] = useState([]);
  const [title, setTitle] = useState('');
  const [entry, setEntry] = useState(false);
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const input = useRef(null);

  const load = useCallback(() => {
    if (!staffId) {
      setFiles([]);
      return;
    }
    api(`/staff-files?staffId=${staffId}`)
      .then(setFiles)
      .catch((e) => setError(e.message));
  }, [staffId]);
  useEffect(load, [load]);
  useOpenNew(() => {
    if (staffId) {
      setTitle('');
      setEntry(true);
    }
  });

  const upload = async (e) => {
    e.preventDefault();
    const file = input.current?.files?.[0];
    if (!file) return;
    setError('');
    setBusy(true);
    try {
      const params = new URLSearchParams({ staffId, name: file.name });
      if (title.trim()) params.set('title', title.trim());
      await uploadFile(`/staff-files?${params}`, file);
      setTitle('');
      setEntry(false);
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
      if (input.current) input.current.value = '';
    }
  };
  const open = async (f) => {
    try {
      window.open(
        URL.createObjectURL(await fetchBlob(`/staff-files/${f.id}/download`)),
        '_blank',
        'noopener',
      );
    } catch (err) {
      setError(err.message);
    }
  };
  const remove = async (f) => {
    try {
      await api(`/staff-files/${f.id}`, { method: 'DELETE' });
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const needle = q.trim().toLowerCase();
  const shown = files.filter((f) => !needle || `${f.title} ${f.originalName}`.toLowerCase().includes(needle));
  const pageRows = shown.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const total = files.reduce((n, f) => n + Number(f.size), 0);
  const latest = files
    .map((f) => String(f.createdAt).slice(0, 10))
    .sort()
    .pop();

  return (
    <>
      <div className="profile-head">
        <div>
          <h1>Staff documents</h1>
          <p className="hint">
            Contracts, certificates and ID proofs per staff member. Choose a staff member to see and upload
            their documents.
          </p>
        </div>
        <div className="head-actions">
          <button
            type="button"
            className="big-action"
            disabled={!staffId}
            onClick={() => {
              setError('');
              setTitle('');
              setEntry(true);
            }}
          >
            + Upload document
          </button>
        </div>
      </div>
      {error && !entry && (
        <p className="error" role="alert">
          {error}
        </p>
      )}

      <div className="stats enquiry-tiles four">
        <Tile icon="▤" tone="blue" label="Documents" value={staffId ? files.length : '—'} />
        <Tile icon="▣" tone="violet" label="Total size" value={staffId ? kb(total) : '—'} />
        <Tile icon="◷" tone="green" label="Last uploaded" value={latest ?? '—'} />
        <Tile icon="♙" tone="amber" label="Staff member" value={staffId ? 'Selected' : 'None chosen'} />
      </div>

      <section className="card enquiry-card">
        <div className="toolbar">
          <label className="inline">
            <span>Staff member </span>
            <TypeaheadSelect
              kind="staff"
              value={staffId}
              onChange={(id) => {
                setStaffId(id);
                setPage(1);
              }}
            />
          </label>
          {staffId && (
            <label className="search-field">
              <span aria-hidden="true">⌕</span>
              <input
                value={q}
                onChange={(e) => {
                  setQ(e.target.value);
                  setPage(1);
                }}
                placeholder="Search document or file…"
                aria-label="Search documents"
              />
            </label>
          )}
          {staffId && <span className="showing">{shown.length} documents</span>}
        </div>
        {staffId && (
          <div className="table-scroll">
            <table className="enquiry-table">
              <thead>
                <tr>
                  <th>Document</th>
                  <th>File</th>
                  <th>Size</th>
                  <th>Uploaded</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {pageRows.map((f) => (
                  <tr key={f.id}>
                    <td>
                      <b>{f.title}</b>
                    </td>
                    <td>{f.originalName}</td>
                    <td>{kb(f.size)}</td>
                    <td>
                      {String(f.createdAt).slice(0, 10)} · {f.uploadedByName}
                    </td>
                    <td className="row-actions">
                      <button type="button" onClick={() => open(f)}>
                        View
                      </button>
                      <Gate action="delete">
                        <button type="button" className="ghost" onClick={() => remove(f)}>
                          Delete
                        </button>
                      </Gate>
                    </td>
                  </tr>
                ))}
                {!pageRows.length && (
                  <tr>
                    <td colSpan={5} className="empty-row">
                      {needle ? 'No documents match.' : 'No documents yet.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
        {!staffId && (
          <p className="empty-row" style={{ padding: 22 }}>
            Choose a staff member to see their documents.
          </p>
        )}
        {staffId && <Pagination page={page} pageSize={PAGE_SIZE} total={shown.length} onChange={setPage} />}
      </section>

      <Modal open={entry} title="Upload document" wide={false} onClose={() => setEntry(false)}>
        <form onSubmit={upload} className="enquiry-form">
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          <div className="enq-grid">
            <label className="wide">
              <span>Title (e.g. Appointment letter)</span>
              <input value={title} onChange={(e) => setTitle(e.target.value)} />
            </label>
            <label className="wide">
              <span>File *</span>
              <input
                type="file"
                ref={input}
                accept="application/pdf,image/jpeg,image/png,image/webp"
                disabled={busy}
                required
              />
            </label>
          </div>
          <div className="form-actions">
            <button type="submit" disabled={busy}>
              {busy ? 'Uploading…' : 'Upload'}
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
