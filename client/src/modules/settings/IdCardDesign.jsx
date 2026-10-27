import { useEffect, useState } from 'react';
import { api } from '../../services/api.js';
import { IdCard, FIELD_LABEL } from '../../components/IdCardSheet.jsx';
import { DEFAULT_DESIGN, useLogoUrl } from '../../components/idCardDesign.js';

const SAMPLE = {
  student: { studentId: 0, staffId: 0, name: 'Aarav Mehta', admissionNo: 'ADM-2026-0001', rollNo: '14', className: 'Grade 5-A', dob: '2015-04-12', guardianName: 'Rohan Mehta', guardianPhone: '+91 98765 43210', hasPhoto: false },
  staff: { staffId: 0, name: 'Neha Verma', staffNo: 'STF-2026-0007', designation: 'Mathematics teacher', departmentName: 'Science', phone: '+91 98220 45123', email: 'neha@school.example', joinDate: '2021-06-01', hasPhoto: false },
};

/** One place to set how student and staff ID cards look. Saved once; every printed card follows it. */
export default function IdCardDesign() {
  const [design, setDesign] = useState(DEFAULT_DESIGN);
  const [fields, setFields] = useState(null);
  const [school, setSchool] = useState('Your School Name');
  const [year, setYear] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const logoUrl = useLogoUrl(design.showLogo);

  useEffect(() => {
    api('/documents/id-card-design').then((r) => { setDesign(r.design); setFields(r.fields); }).catch((e) => setError(e.message));
    api('/settings/profile').then((p) => { const n = p.fields?.find((f) => f.key === 'school.name')?.value; if (n) setSchool(n); setYear(p.years?.find((y) => y.isCurrent)?.name ?? ''); }).catch(() => {});
  }, []);

  const set = (k) => (e) => setDesign((d) => ({ ...d, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));
  const setPart = (kind, k, v) => setDesign((d) => ({ ...d, [kind]: { ...d[kind], [k]: v } }));
  const toggle = (kind, f) => setPart(kind, 'fields', design[kind].fields.includes(f) ? design[kind].fields.filter((x) => x !== f) : [...design[kind].fields, f]);

  const save = async (e) => {
    e.preventDefault();
    setError(''); setNotice(''); setBusy(true);
    try { const r = await api('/documents/id-card-design', { method: 'PUT', body: design }); setDesign(r.design); setNotice('ID card design saved. Student and staff cards now use it.'); } catch (err) { setError(err.message); } finally { setBusy(false); }
  };
  const reset = async () => {
    setError(''); setNotice('');
    try { const r = await api('/documents/id-card-design', { method: 'DELETE' }); setDesign(r.design); setNotice('Standard design restored.'); } catch (err) { setError(err.message); }
  };

  return (
    <>
      <div className="profile-head">
        <div>
          <h1>ID card design</h1>
          <p className="hint">Set up how student and staff ID cards look. The same colours and layout apply to both.</p>
        </div>
      </div>
      {notice && <p className="success">{notice}</p>}
      {error && <p className="error" role="alert">{error}</p>}

      <form onSubmit={save} className="idcard-setup">
        <div>
          <section className="card">
            <header className="card-head"><span className="tile-icon violet" aria-hidden="true">✦</span><span><h2>Look</h2><small>Colours and what appears on every card</small></span></header>
            <div className="enq-grid">
              <label><span>Header colour</span><input type="color" value={design.headerColor} onChange={set('headerColor')} /></label>
              <label><span>Accent colour (title bar)</span><input type="color" value={design.accentColor} onChange={set('accentColor')} /></label>
              <label className="wide check-row"><span>On the card</span>
                <span className="check-list">
                  <label><input type="checkbox" checked={design.showLogo} onChange={set('showLogo')} /> School logo (from School Profile)</label>
                  <label><input type="checkbox" checked={design.showAcademicYear} onChange={set('showAcademicYear')} /> Academic year</label>
                </span>
              </label>
              <label><span>Signature label (optional)</span><input value={design.signatureLabel} onChange={set('signatureLabel')} maxLength={40} placeholder="e.g. Principal" /></label>
              <label><span>Footer text (optional)</span><input value={design.footerText} onChange={set('footerText')} maxLength={60} placeholder="e.g. If found, call 020 1234 5678" /></label>
            </div>
          </section>

          {['student', 'staff'].map((kind) => (
            <section className="card" key={kind} style={{ marginTop: 16 }}>
              <header className="card-head"><span className={`tile-icon ${kind === 'student' ? 'blue' : 'green'}`} aria-hidden="true">{kind === 'student' ? '♙' : '♧'}</span><span><h2>{kind === 'student' ? 'Student card' : 'Staff card'}</h2><small>Choose the title and the details shown under the name</small></span></header>
              <div className="enq-grid">
                <label className="wide"><span>Card title</span><input value={design[kind].title} onChange={(e) => setPart(kind, 'title', e.target.value)} maxLength={30} required /></label>
                <label className="wide check-row"><span>Details to show</span>
                  <span className="check-list">
                    {Object.keys(fields?.[kind] ?? FIELD_LABEL[kind]).map((f) => (
                      <label key={f}><input type="checkbox" checked={design[kind].fields.includes(f)} onChange={() => toggle(kind, f)} /> {fields?.[kind]?.[f] ?? FIELD_LABEL[kind][f]}</label>
                    ))}
                  </span>
                </label>
              </div>
            </section>
          ))}

          <div className="form-actions" style={{ position: 'static', borderTop: 0 }}>
            <button type="submit" disabled={busy}>{busy ? 'Saving…' : 'Save design'}</button>
            <button type="button" className="ghost" onClick={reset}>Restore standard design</button>
          </div>
        </div>

        <aside className="card preview" aria-label="Preview">
          <small className="hint">Preview (sample details)</small>
          <IdCard kind="student" person={SAMPLE.student} school={school} academicYear={year || '2026-2027'} design={design} logoUrl={logoUrl} />
          <IdCard kind="staff" person={SAMPLE.staff} school={school} academicYear={year || '2026-2027'} design={design} logoUrl={logoUrl} />
        </aside>
      </form>
    </>
  );
}
