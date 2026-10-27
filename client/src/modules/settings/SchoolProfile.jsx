import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, fetchBlob, uploadFile } from '../../services/api.js';
import { forgetPublicSettings } from '../../services/settings.js';
import { schoolProfileChanged } from '../../hooks/useSchoolBrand.js';

const LANGUAGE = {
  'en-IN': 'English (India)', 'en-GB': 'English (UK)', 'en-US': 'English (US)', 'hi-IN': 'Hindi', 'mr-IN': 'Marathi', 'gu-IN': 'Gujarati',
  'bn-IN': 'Bengali', 'ta-IN': 'Tamil', 'te-IN': 'Telugu', 'kn-IN': 'Kannada', 'ml-IN': 'Malayalam',
};
const ZONE = { 'Asia/Kolkata': 'Asia / Kolkata (IST)', 'Asia/Dubai': 'Asia / Dubai (GST)', 'Asia/Dhaka': 'Asia / Dhaka', 'Asia/Kathmandu': 'Asia / Kathmandu', 'Asia/Colombo': 'Asia / Colombo', 'Asia/Singapore': 'Asia / Singapore', 'Europe/London': 'Europe / London', 'America/New_York': 'America / New York', 'Australia/Sydney': 'Australia / Sydney', UTC: 'UTC' };
const DISPLAY = { 'school.language': LANGUAGE, 'school.timezone': ZONE };

/** The four cards, in the order the page shows them. `wide` fields take the whole row. */
const CARDS = [
  { id: 'info', icon: '🏫', tone: 'blue', title: 'School information', sub: 'Official identity and registration', fields: ['school.name', 'school.code', 'type', 'school.board', 'school.established', 'school.registrationNo'] },
  { id: 'contact', icon: '📞', tone: 'green', title: 'Contact details', sub: 'How families can reach your school', fields: ['school.phone', 'school.email', 'school.website', 'school.address'], wide: ['school.website', 'school.address'] },
  { id: 'brand', icon: '✨', tone: 'violet', title: 'Branding & leadership', sub: 'Make your school profile your own', fields: ['logo', 'school.principal', 'school.motto'], wide: ['logo'] },
  { id: 'academic', icon: '🕘', tone: 'amber', title: 'Academic preferences', sub: 'Default settings for your school', fields: ['year', 'school.timezone', 'school.language', 'school.dateFormat'] },
];
const LABEL = { 'school.name': 'School name', 'school.code': 'School code', type: 'School type', 'school.board': 'Board / curriculum', 'school.established': 'Established', 'school.registrationNo': 'Registration no.', 'school.phone': 'Phone number', 'school.email': 'Email address', 'school.website': 'Website', 'school.address': 'School address', logo: 'School logo', 'school.principal': 'Principal', 'school.motto': 'School motto', year: 'Current academic year', 'school.timezone': 'Time zone', 'school.language': 'Default language', 'school.dateFormat': 'Date format' };

const kb = (n) => (n >= 1048576 ? `${(n / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);

export default function SchoolProfile() {
  const [data, setData] = useState(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({});
  const [yearId, setYearId] = useState('');
  const [logoUrl, setLogoUrl] = useState(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const fileInput = useRef(null);

  const load = useCallback(async () => {
    try {
      const d = await api('/settings/profile');
      setData(d);
      setDraft(Object.fromEntries(d.fields.map((f) => [f.key, f.value])));
      setYearId(String(d.years.find((y) => y.isCurrent)?.id ?? ''));
      if (d.logo) { fetchBlob('/settings/logo').then((b) => setLogoUrl((old) => { if (old) URL.revokeObjectURL(old); return URL.createObjectURL(b); })).catch(() => setLogoUrl(null)); } else setLogoUrl(null);
    } catch (err) { setError(err.message); }
  }, []);
  useEffect(() => { load(); }, [load]);

  if (!data) return error ? <p className="error">{error}</p> : <div className="skeleton hero-skeleton" />;

  const field = (key) => data.fields.find((f) => f.key === key);
  const value = (key) => (editing ? draft[key] : field(key)?.value) ?? '';
  const show = (key) => { const v = field(key)?.value; return v ? (DISPLAY[key]?.[v] ?? v) : null; };
  const currentYear = data.years.find((y) => y.isCurrent);
  const type = [show('school.ownership'), show('school.mode')].filter(Boolean).join(' · ');
  const updated = data.lastUpdated ? new Date(data.lastUpdated).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : null;

  const cancel = () => { setEditing(false); setError(''); load(); };
  const save = async (e) => {
    e.preventDefault();
    setError(''); setBusy(true);
    try {
      const changed = Object.fromEntries(data.fields.filter((f) => draft[f.key] !== f.value).map((f) => [f.key, draft[f.key]]));
      if (Object.keys(changed).length) await api('/settings/profile', { method: 'PUT', body: { values: changed } });
      if (yearId && yearId !== String(currentYear?.id ?? '')) await api(`/academic-years/${yearId}/set-current`, { method: 'POST' });
      forgetPublicSettings();
      schoolProfileChanged();
      setEditing(false); setNotice('Profile saved.');
      await load();
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  };

  const upload = async () => {
    const file = fileInput.current?.files?.[0];
    if (!file) return;
    setError(''); setBusy(true);
    try { await uploadFile(`/settings/logo?name=${encodeURIComponent(file.name)}`, file); setNotice('Logo updated.'); schoolProfileChanged(); await load(); } catch (err) { setError(err.message); } finally { setBusy(false); fileInput.current.value = ''; }
  };
  const removeLogo = async () => {
    setError('');
    try { await api('/settings/logo', { method: 'DELETE' }); schoolProfileChanged(); await load(); } catch (err) { setError(err.message); }
  };

  const set = (key) => (e) => setDraft({ ...draft, [key]: e.target.value });
  const input = (key) => {
    const f = field(key);
    if (key === 'type') {
      return (
        <span className="pair">
          <select value={draft['school.ownership']} onChange={set('school.ownership')}><option value="">Ownership</option>{field('school.ownership').options.map((o) => <option key={o}>{o}</option>)}</select>
          <select value={draft['school.mode']} onChange={set('school.mode')}><option value="">Admission type</option>{field('school.mode').options.map((o) => <option key={o}>{o}</option>)}</select>
        </span>
      );
    }
    if (key === 'year') {
      if (!data.years.length) return <span>No academic year yet. <Link to="/academic-years">Add one</Link></span>;
      return <select value={yearId} onChange={(e) => setYearId(e.target.value)}>{data.years.map((y) => <option key={y.id} value={y.id}>{y.name}</option>)}</select>;
    }
    if (key === 'logo') {
      return (
        <div className="logo-row">
          <div className="logo-box">{logoUrl ? <img src={logoUrl} alt="School logo" /> : <span aria-hidden="true">🏫</span>}</div>
          <div>
            <b>{data.logo?.name ?? 'No logo yet'}</b>
            <small className="block">PNG or JPG · up to 1 MB · recommended 512 × 512 px</small>
            <input type="file" ref={fileInput} accept="image/png,image/jpeg" onChange={upload} disabled={busy} />
            {data.logo && <button type="button" className="danger" onClick={removeLogo}>Remove logo</button>}
          </div>
        </div>
      );
    }
    if (f.options) {
      return <select value={draft[key]} onChange={set(key)}>{!f.required && <option value="">--</option>}{f.options.map((o) => <option key={o} value={o}>{DISPLAY[key]?.[o] ?? o}</option>)}</select>;
    }
    if (key === 'school.address') return <textarea rows={3} maxLength={f.max} value={draft[key]} onChange={set(key)} />;
    return <input type={key === 'school.email' ? 'email' : key === 'school.phone' ? 'tel' : 'text'} maxLength={f.max} value={draft[key]} onChange={set(key)} required={f.key === 'school.name'} />;
  };

  const display = (key) => {
    if (key === 'type') return type || null;
    if (key === 'year') return currentYear?.name ?? (data.years.length ? 'None chosen' : null);
    if (key === 'logo') {
      return (
        <div className="logo-row">
          <div className="logo-box">{logoUrl ? <img src={logoUrl} alt="School logo" /> : <span aria-hidden="true">🏫</span>}</div>
          <div><b>{data.logo?.name ?? 'No logo uploaded'}</b>{data.logo && <small className="block">{kb(data.logo.size)}</small>}</div>
        </div>
      );
    }
    if (key === 'school.website') { const w = show(key); return w && <a href={/^https?:\/\//.test(w) ? w : `https://${w}`} target="_blank" rel="noreferrer">{w}</a>; }
    if (key === 'school.address') { const a = show(key); return a && <span style={{ whiteSpace: 'pre-line' }}>{a}</span>; }
    return show(key);
  };

  return (
    <form onSubmit={save} className="profile-page">
      <div className="profile-head">
        <div>
          <h1>School Profile</h1>
          <p className="hint">Manage your school&apos;s identity, contact information, and preferences.</p>
        </div>
        {!editing && <button type="button" className="big-action" onClick={() => { setEditing(true); setNotice(''); }}>✎ Edit profile</button>}
      </div>
      {error && <p className="error" role="alert">{error}</p>}
      {notice && <p className="success">{notice}</p>}

      <section className="card identity">
        <div className="identity-logo">{logoUrl ? <img src={logoUrl} alt="" /> : <span aria-hidden="true">🏫</span>}</div>
        <div className="identity-text">
          <h2>{show('school.name') ?? 'Your school'}</h2>
          <p>
            {show('school.board') && <span className="pill blue">{show('school.board')} Affiliated</span>}
            {currentYear && <span className="pill green">● {currentYear.name}</span>}
            {show('school.motto') && <span className="pill violet">{show('school.motto')}</span>}
          </p>
        </div>
        {updated && <small className="identity-meta">Profile last updated · {updated}</small>}
      </section>

      <div className="profile-cards">
        {CARDS.map((card) => (
          <section className="card" key={card.id}>
            <header className="card-head">
              <span className={`tile-icon ${card.tone}`} aria-hidden="true">{card.icon}</span>
              <span><h2>{card.title}</h2><small>{card.sub}</small></span>
            </header>
            <div className="kv-grid">
              {card.fields.map((key) => (
                <div key={key} className={`kv${card.wide?.includes(key) ? ' wide' : ''}`}>
                  <span className="kv-label">{LABEL[key]}</span>
                  {editing ? <div id={`f-${key}`} className="kv-edit">{input(key)}</div> : <div className="kv-value">{display(key) ?? <span className="none">Not set</span>}</div>}
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>

      {editing && (
        <div className="save-bar">
          <span className="hint">Time zone, language and date format are saved as your defaults; screens adopt them as they are updated.</span>
          <button type="button" className="ghost" onClick={cancel} disabled={busy}>Cancel</button>
          <button type="submit" disabled={busy}>{busy ? 'Saving…' : 'Save changes'}</button>
        </div>
      )}
      {!editing && <p className="hint">Other settings (library, leave, notifications, payments) are under <Link to="/settings">System preferences</Link>.</p>}
    </form>
  );
}
