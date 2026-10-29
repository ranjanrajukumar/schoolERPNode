import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { api, fetchBlob, uploadFile } from '../services/api.js';
import { loadMasters } from './MasterSelect.jsx';

const kb = (n) =>
  n >= 1048576 ? `${(n / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`;
const MAX = 5 * 1024 * 1024;
const same = (a, b) =>
  String(a ?? '')
    .trim()
    .toLowerCase() ===
  String(b ?? '')
    .trim()
    .toLowerCase();

/**
 * Where each kind of record keeps its documents. `title` is the required document's name from Master data, so a slot is filled
 * when a file with that title exists. Student and staff files live on disk, application files in the database.
 */
const DOC_KINDS = {
  application: {
    master: 'application_document',
    list: (id) => `/admissions/applications/${id}`,
    pick: (d) => d.documents ?? [],
    upload: (id, title, name) =>
      `/admissions/applications/${id}/documents?name=${encodeURIComponent(name)}&title=${encodeURIComponent(title)}`,
    remove: (id, f) => `/admissions/applications/${id}/documents/${f.id}`,
    download: (id, f) => `/admissions/applications/${id}/documents/${f.id}`,
    nameOf: (f) => f.name,
  },
  student: {
    master: 'student_document',
    list: (id) => `/student-files?studentId=${id}&kind=document`,
    pick: (d) => d,
    upload: (id, title, name) =>
      `/student-files?studentId=${id}&kind=document&title=${encodeURIComponent(title)}&name=${encodeURIComponent(name)}`,
    remove: (_id, f) => `/student-files/${f.id}`,
    download: (_id, f) => `/student-files/${f.id}/download`,
    nameOf: (f) => f.originalName,
  },
  staff: {
    master: 'staff_document',
    list: (id) => `/staff-files?staffId=${id}`,
    pick: (d) => d,
    upload: (id, title, name) =>
      `/staff-files?staffId=${id}&title=${encodeURIComponent(title)}&name=${encodeURIComponent(name)}`,
    remove: (_id, f) => `/staff-files/${f.id}`,
    download: (_id, f) => `/staff-files/${f.id}/download`,
    nameOf: (f) => f.originalName,
  },
};

/** The documents the school asks for in this process (Settings → Master data), required ones first. */
function useRequirements(kind) {
  const [list, setList] = useState([]);
  useEffect(() => {
    loadMasters().then((all) =>
      setList(
        (all[DOC_KINDS[kind].master] ?? [])
          .filter((i) => i.active)
          .map((i) => ({ name: i.name, required: i.required })),
      ),
    );
  }, [kind]);
  return list;
}

/**
 * One record's documents against the school's checklist. With an `id` files are uploaded straight away; without one (a record not yet
 * saved) they wait in `pending` and `flush(newId)` uploads them once the record exists.
 */
export function useDocuments(kind, id, { ensureId } = {}) {
  const cfg = DOC_KINDS[kind];
  const [files, setFiles] = useState([]);
  const [pending, setPending] = useState([]); // [{ title, file }]
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const requirements = useRequirements(kind);

  const load = useCallback(
    async (forId = id) => {
      if (!forId) {
        setFiles([]);
        return;
      }
      try {
        setFiles(cfg.pick(await api(cfg.list(forId))));
      } catch (err) {
        setError(err.message);
      }
    },
    [id, kind],
  ); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    load();
  }, [load]);

  const add = async (title, file) => {
    setError('');
    if (file.size > MAX) {
      setError(`${file.name} is larger than 5 MB`);
      return;
    }
    const target = id ?? (ensureId ? await ensureId() : null);
    if (!target) {
      setPending((p) => [...p.filter((x) => !same(x.title, title) || !title), { title, file }]);
      return;
    }
    setBusy(true);
    try {
      // a slot holds one file: replace what is there
      for (const old of files.filter((f) => title && same(f.title, title)))
        await api(cfg.remove(target, old), { method: 'DELETE' });
      await uploadFile(cfg.upload(target, title, file.name), file);
      await load(target);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };
  const remove = async (f) => {
    setError('');
    setBusy(true);
    try {
      await api(cfg.remove(id, f), { method: 'DELETE' });
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };
  const open = async (f) => {
    try {
      window.open(URL.createObjectURL(await fetchBlob(cfg.download(id, f))), '_blank', 'noopener');
    } catch (err) {
      setError(err.message);
    }
  };
  const dropPending = (p) => setPending((list) => list.filter((x) => x !== p));
  /** Upload what was picked before the record existed. Returns the names that failed. */
  const flush = async (newId) => {
    const failed = [];
    for (const { title, file } of pending) {
      try {
        await uploadFile(cfg.upload(newId, title, file.name), file);
      } catch (err) {
        failed.push(`${file.name} (${err.message})`);
      }
    }
    setPending([]);
    return failed;
  };

  const missing = requirements
    .filter(
      (r) =>
        r.required &&
        !files.some((f) => same(f.title, r.name)) &&
        !pending.some((p) => same(p.title, r.name)),
    )
    .map((r) => r.name);
  return { cfg, requirements, files, pending, error, busy, add, remove, open, dropPending, flush, missing };
}

/** The checklist: one row per document the school asks for, then any other files. Rows say Required or Optional and what is missing. */
export default function DocumentSlots({ docs, disabled = false, title = 'Supporting documents' }) {
  const { cfg, requirements, files, pending, error, busy, add, remove, open, dropPending, missing } = docs;
  const picker = useRef(null);
  const [slot, setSlot] = useState(null); // the title the open file picker is for
  const choose = (name) => {
    setSlot(name);
    setTimeout(() => picker.current?.click(), 0);
  };
  const onFile = (e) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (f) add(slot === null || slot === '' ? f.name.replace(/\.[^.]+$/, '') : slot, f);
  };
  const known = useMemo(() => new Set(requirements.map((r) => r.name.toLowerCase())), [requirements]);
  const others = files.filter((f) => !known.has(String(f.title ?? '').toLowerCase()));
  const otherPending = pending.filter((p) => !known.has(String(p.title ?? '').toLowerCase()));

  return (
    <div className="doc-slots">
      <span className="field-title">{title}</span>
      {missing.length > 0 && <p className="doc-missing">Still needed: {missing.join(', ')}</p>}
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <ul className="slot-list">
        {requirements.map((r) => {
          const file = files.find((f) => same(f.title, r.name));
          const queued = pending.find((p) => same(p.title, r.name));
          return (
            <li key={r.name} className={file || queued ? 'filled' : r.required ? 'needed' : ''}>
              <span className="slot-state" aria-hidden="true">
                {file || queued ? '✓' : r.required ? '!' : '○'}
              </span>
              <span className="slot-name">
                <b>{r.name}</b> <small>{r.required ? 'Required' : 'Optional'}</small>
                {file && (
                  <a
                    href="#open"
                    className="slot-file"
                    onClick={(e) => {
                      e.preventDefault();
                      open(file);
                    }}
                  >
                    {cfg.nameOf(file)} <small>{kb(file.size)}</small>
                  </a>
                )}
                {queued && !file && (
                  <span className="slot-file">
                    {queued.file.name} <small>{kb(queued.file.size)} · uploads when you save</small>
                  </span>
                )}
              </span>
              <span className="slot-actions">
                {!disabled && (
                  <button type="button" className="ghost" disabled={busy} onClick={() => choose(r.name)}>
                    {file || queued ? 'Replace' : 'Upload'}
                  </button>
                )}
                {!disabled && file && (
                  <button type="button" className="ghost danger" disabled={busy} onClick={() => remove(file)}>
                    Remove
                  </button>
                )}
                {!disabled && queued && !file && (
                  <button type="button" className="ghost danger" onClick={() => dropPending(queued)}>
                    Remove
                  </button>
                )}
              </span>
            </li>
          );
        })}
        {others.map((f) => (
          <li key={f.id} className="filled">
            <span className="slot-state" aria-hidden="true">
              ✓
            </span>
            <span className="slot-name">
              <b>{f.title || cfg.nameOf(f)}</b> <small>Other</small>
              <a
                href="#open"
                className="slot-file"
                onClick={(e) => {
                  e.preventDefault();
                  open(f);
                }}
              >
                {cfg.nameOf(f)} <small>{kb(f.size)}</small>
              </a>
            </span>
            <span className="slot-actions">
              {!disabled && (
                <button type="button" className="ghost danger" disabled={busy} onClick={() => remove(f)}>
                  Remove
                </button>
              )}
            </span>
          </li>
        ))}
        {otherPending.map((p, i) => (
          <li key={`p${i}`} className="filled">
            <span className="slot-state" aria-hidden="true">
              ✓
            </span>
            <span className="slot-name">
              <b>{p.title}</b> <small>Other · uploads when you save</small>
              <span className="slot-file">{p.file.name}</span>
            </span>
            <span className="slot-actions">
              <button type="button" className="ghost danger" onClick={() => dropPending(p)}>
                Remove
              </button>
            </span>
          </li>
        ))}
      </ul>
      {!disabled && (
        <button type="button" className="ghost" disabled={busy} onClick={() => choose('')}>
          ＋ Add another document
        </button>
      )}
      <small className="hint block">PDF, JPG or PNG · Maximum 5 MB per file</small>
      <input ref={picker} type="file" accept=".pdf,.jpg,.jpeg,.png,.webp" hidden onChange={onFile} />
    </div>
  );
}
