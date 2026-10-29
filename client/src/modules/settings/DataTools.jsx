import TableCard from '../../components/TableCard.jsx';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api, fetchBlob, getToken } from '../../services/api.js';
import { localDate } from '../../utils/dates.js';

/** Saves a protected file through the browser's download. */
export async function download(path, filename) {
  const url = URL.createObjectURL(await fetchBlob(path));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

/** Posts file text as text/plain: the server's JSON parser must not see it, and the CSV or backup stays one string. */
export async function postText(path, text) {
  const res = await fetch(`/api${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain', Authorization: `Bearer ${getToken()}` },
    body: text,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

const STATUS = { new: ['paid', 'new'], exists: ['partial', 'already there'], error: ['overdue', 'problem'] };

/** Bulk loading, one kind of data at a time, in the order a school needs it. */
function Importer() {
  const [kinds, setKinds] = useState(null);
  const [params, setParams] = useSearchParams();
  const [current, setCurrent] = useState(params.get('kind') ?? 'classes');
  const [text, setText] = useState('');
  const [fileName, setFileName] = useState('');
  const [preview, setPreview] = useState(null);
  const [done, setDone] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const input = useRef(null);

  const load = useCallback(
    () =>
      api('/data/import/datasets')
        .then(setKinds)
        .catch((e) => setError(e.message)),
    [],
  );
  useEffect(() => {
    load();
  }, [load]);

  const reset = () => {
    setText('');
    setFileName('');
    setPreview(null);
    setError('');
    if (input.current) input.current.value = '';
  };
  const choose = (key) => {
    setCurrent(key);
    setDone(null);
    reset();
    setParams({ kind: key }, { replace: true });
  };

  if (!kinds) return error ? <p className="error">{error}</p> : <div className="skeleton hero-skeleton" />;
  const kind = kinds.find((k) => k.key === current) ?? kinds[0];
  const next = kinds[kinds.findIndex((k) => k.key === kind.key) + 1];

  const pick = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError('');
    setDone(null);
    setPreview(null);
    setBusy(true);
    try {
      const content = await file.text();
      setText(content);
      setFileName(file.name);
      setPreview(await postText(`/data/import/${kind.key}/preview`, content));
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };
  const run = async () => {
    setError('');
    setBusy(true);
    try {
      const r = await postText(`/data/import/${kind.key}`, text);
      setDone(r);
      reset();
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <h2>Fill your data from spreadsheets</h2>
      <p className="hint">
        Load a whole school at once instead of typing each record. Work down the list in order: later kinds
        refer to earlier ones (a class teacher is a staff member; a fee belongs to a class). Every file is
        checked before anything is saved, and uploading the same file again never creates duplicates.
      </p>

      <div className="import-layout">
        <ol className="import-steps">
          {kinds.map((k, i) => (
            <li key={k.key}>
              <button
                type="button"
                className={`import-step${k.key === kind.key ? ' on' : ''}${k.count > 0 ? ' filled' : ''}`}
                onClick={() => choose(k.key)}
              >
                <span className="import-no">{k.count > 0 ? '✓' : i + 1}</span>
                <span>
                  <b>{k.label}</b>
                  <small>{k.count} in the system</small>
                </span>
              </button>
            </li>
          ))}
        </ol>

        <section className="card import-panel">
          <h2 style={{ marginTop: 0 }}>{kind.label}</h2>
          <p className="hint" style={{ margin: '0 0 14px' }}>
            {kind.note}
          </p>

          <ol className="how">
            <li>
              <b>Download the template</b> and open it in Excel or Google Sheets. Keep the header row; delete
              the example row.
              <div>
                <button
                  type="button"
                  className="ghost"
                  onClick={() =>
                    download(`/data/import/${kind.key}/template`, `${kind.key}-template.csv`).catch((e) =>
                      setError(e.message),
                    )
                  }
                >
                  ⬇ {kind.label} template (.csv)
                </button>
              </div>
              <details>
                <summary>What goes in each column</summary>
                <TableCard>
                  <thead>
                    <tr>
                      <th>Column</th>
                      <th>Needed?</th>
                      <th>Example</th>
                      <th>Note</th>
                    </tr>
                  </thead>
                  <tbody>
                    {kind.columns.map((c) => (
                      <tr key={c.key}>
                        <td>
                          <code>{c.key}</code> <small>{c.label}</small>
                        </td>
                        <td>{c.required ? 'required' : 'optional'}</td>
                        <td>{c.example}</td>
                        <td>{c.help}</td>
                      </tr>
                    ))}
                  </tbody>
                </TableCard>
              </details>
            </li>
            <li>
              <b>Save it as CSV and upload it.</b> You will see a check of every row before anything is saved.
              <div>
                <input type="file" accept=".csv,text/csv" ref={input} onChange={pick} disabled={busy} />
              </div>
            </li>
            <li>
              <b>Look at the check, then import.</b> Rows already in the system are skipped; any problem stops
              the whole file so you can fix it and upload again.
            </li>
          </ol>

          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          {done && (
            <div className="import-done">
              <p className="success" style={{ margin: 0 }}>
                Imported {done.imported} {kind.label.toLowerCase()}
                {done.skipped ? `; ${done.skipped} were already there and left alone` : ''}.
              </p>
              {next && (
                <button type="button" onClick={() => choose(next.key)}>
                  Next: {next.label} →
                </button>
              )}
            </div>
          )}

          {preview && (
            <>
              <div className="chips">
                <span className="badge paid">{preview.newCount} new</span>
                <span className="badge partial">{preview.existingCount} already there</span>
                <span className={`badge ${preview.errorCount ? 'overdue' : ''}`}>
                  {preview.errorCount} with problems
                </span>
                <small>
                  {fileName} · {preview.total} row(s)
                  {preview.total > preview.rows.length && `, showing the first ${preview.rows.length}`}
                </small>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <TableCard>
                  <thead>
                    <tr>
                      <th>Line</th>
                      <th>Row</th>
                      <th>Result</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.rows.map((r) => (
                      <tr key={r.line} className={r.status === 'error' ? 'failed' : ''}>
                        <td>{r.line}</td>
                        <td>{r.summary}</td>
                        <td>
                          <span className={`badge ${STATUS[r.status][0]}`}>{STATUS[r.status][1]}</span>
                          {r.problems.length > 0 && (
                            <small style={{ marginLeft: 8 }}>{r.problems.join('; ')}</small>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </TableCard>
              </div>
              <p>
                {preview.errorCount === 0 && preview.newCount > 0 && (
                  <button type="button" disabled={busy} onClick={run}>
                    {busy ? 'Importing…' : `Import ${preview.newCount} ${kind.label.toLowerCase()}`}
                  </button>
                )}
                {preview.errorCount === 0 && preview.newCount === 0 && (
                  <span className="hint">Everything in this file is already in the system.</span>
                )}
                {preview.errorCount > 0 && (
                  <span className="error">
                    Fix the {preview.errorCount} problem row(s) in your file and upload it again. Nothing has
                    been saved.
                  </span>
                )}
                <button type="button" className="ghost" onClick={reset}>
                  Choose another file
                </button>
              </p>
            </>
          )}

          <p className="hint">
            Prefer to add them one at a time?{' '}
            <Link to={kind.link}>Open the {kind.label.toLowerCase()} screen</Link>.
          </p>
        </section>
      </div>
    </>
  );
}

export default function DataTools() {
  const [exports, setExports] = useState([]);
  const [error, setError] = useState('');
  const today = localDate();

  useEffect(() => {
    api('/data/exports')
      .then(setExports)
      .catch((e) => setError(e.message));
  }, []);
  const run = async (fn) => {
    setError('');
    try {
      await fn();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <>
      <h1>Data import / export</h1>
      {error && <p className="error">{error}</p>}
      <Importer />

      <h2>Export</h2>
      <p className="hint">Download a table as a CSV file that opens in Excel or Google Sheets.</p>
      <p>
        {exports.map((x) => (
          <button
            key={x.key}
            className="ghost"
            onClick={() => run(() => download(`/data/export/${x.key}`, `${x.key}-${today}.csv`))}
          >
            {x.label}
          </button>
        ))}
      </p>
    </>
  );
}
