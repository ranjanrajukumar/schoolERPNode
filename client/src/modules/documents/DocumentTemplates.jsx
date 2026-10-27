import { useCallback, useEffect, useState } from 'react';
import { api } from '../../services/api.js';
import { renderParagraphs, templateVars } from './templateText.js';

const TITLE = { bonafide: 'Bonafide certificate', transfer: 'Transfer certificate', character: 'Character certificate', fee: 'Fee certificate' };
const SAMPLE = {
  studentName: 'Asha Verma', admissionNo: 'ADM-2026-0001', className: '5-A', guardianName: 'Rohit Verma', dob: '2015-04-12', academicYear: '2026-27',
  gender: 'female', purpose: 'a passport application', conduct: 'Good', leavingDate: '2026-10-01', leavingReason: 'Relocation', duesCleared: true,
  feesBilled: '12000.00', feesPaid: '9000.00', feesOutstanding: '3000.00',
};

function Tile({ icon, tone, label, value, hint }) {
  return (
    <div className="tile card">
      <span className={`tile-icon ${tone}`} aria-hidden="true">{icon}</span>
      <span className="tile-text"><span>{label}</span><b>{value}</b>{hint && <small>{hint}</small>}</span>
    </div>
  );
}

/** Edit the wording of each certificate, with a live preview for a sample student. */
export default function DocumentTemplates() {
  const [data, setData] = useState(null);
  const [type, setType] = useState('bonafide');
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const load = useCallback(() => {
    api('/documents/templates').then((d) => { setData(d); setText(d.templates.find((t) => t.type === type)?.body ?? ''); }).catch((e) => setError(e.message));
  }, [type]);
  useEffect(load, [load]);

  const current = data?.templates.find((t) => t.type === type);
  const run = async (fn, message) => {
    setError(''); setNotice('');
    try { await fn(); setNotice(message); load(); } catch (err) { setError(err.message); }
  };

  if (!data) return error ? <p className="error">{error}</p> : <p>Loading…</p>;
  const custom = data.templates.filter((t) => t.custom).length;
  return (
    <>
      <div className="profile-head">
        <div>
          <h1>Document templates</h1>
          <p className="hint">Edit the wording of each certificate. Blank lines start a new paragraph and <code>{'{{placeholders}}'}</code> are filled from the student's record. Certificates already issued keep the wording they were issued with.</p>
        </div>
      </div>
      {notice && <p className="success">{notice}</p>}
      {error && <p className="error" role="alert">{error}</p>}

      <div className="stats enquiry-tiles four">
        <Tile icon="▤" tone="blue" label="Templates" value={data.templates.length} />
        <Tile icon="✎" tone="green" label="Custom wording" value={custom} />
        <Tile icon="▣" tone="violet" label="Built-in wording" value={data.templates.length - custom} />
        <Tile icon="◷" tone="amber" label="Placeholders" value={Object.keys(data.placeholders).length} />
      </div>

      <section className="card enquiry-card">
        <div className="tabs-line" role="tablist">
          {data.templates.map((t) => <button key={t.type} type="button" role="tab" aria-selected={t.type === type} className={t.type === type ? 'on' : ''} onClick={() => setType(t.type)}>{TITLE[t.type]}{t.custom && ' ✎'}</button>)}
        </div>
        <form className="enquiry-form" style={{ padding: 22 }} onSubmit={(e) => e.preventDefault()}>
          <div className="enq-grid">
            <label className="wide"><span>Wording ({current.custom ? `custom, last saved by ${current.updatedByName}` : 'built-in'})</span>
              <textarea rows={10} value={text} maxLength={4000} onChange={(e) => setText(e.target.value)} />
            </label>
          </div>
          <div className="form-actions">
            <button type="button" onClick={() => run(() => api(`/documents/templates/${type}`, { method: 'PUT', body: { body: text } }), 'Wording saved. It applies to certificates issued from now on.')}>Save</button>
            <button type="button" className="ghost" onClick={() => setText(current.defaultBody)}>Load built-in wording</button>
            {current.custom && <button type="button" className="ghost" onClick={() => run(() => api(`/documents/templates/${type}`, { method: 'DELETE' }), 'Back to the built-in wording.')}>Reset</button>}
          </div>
        </form>
      </section>

      <section className="card enquiry-card">
        <header className="card-head" style={{ padding: '22px 22px 14px', marginBottom: 0 }}><span><h2>Preview</h2><small>Sample student</small></span></header>
        <div style={{ padding: '0 22px 22px' }}>
          {renderParagraphs(text, templateVars(SAMPLE, 'Your School')).map((p, i) => <p key={i} style={{ whiteSpace: 'pre-line' }}>{p}</p>)}
        </div>
      </section>

      <section className="card enquiry-card">
        <header className="card-head" style={{ padding: '22px 22px 14px', marginBottom: 0 }}><span><h2>Placeholders</h2><small>Filled from the student's record</small></span></header>
        <div className="table-scroll">
          <table className="enquiry-table">
            <tbody>
              {Object.entries(data.placeholders).map(([k, label]) => <tr key={k}><td><code>{`{{${k}}}`}</code></td><td>{label}</td></tr>)}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
