import { useCallback, useEffect, useState } from 'react';
import { api } from '../../services/api.js';
import Modal from '../../components/Modal.jsx';
import Pagination from '../../components/Pagination.jsx';
import { useOpenNew } from '../../hooks/useOpenNew.js';

const PAGE_SIZE = 25;
const EMPTY_OPENING = { title: '', departmentId: '', vacancies: 1, closingDate: '', description: '' };
const EMPTY_APPLICANT = { openingId: '', name: '', email: '', phone: '', qualification: '', notes: '' };
const LABEL = {
  shortlisted: 'Shortlist',
  interviewed: 'Interviewed',
  offered: 'Offer job',
  rejected: 'Reject',
  applied: 'Reopen',
};
const BADGE = {
  applied: '',
  shortlisted: 'partial',
  interviewed: 'partial',
  offered: 'paid',
  hired: 'paid',
  rejected: 'rejected',
};
const TABS = [
  ['openings', 'Openings'],
  ['applicants', 'Applicants'],
];

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

/** Recruitment: job openings and their applicants, from applied to hired. */
export default function Recruitment() {
  const [openings, setOpenings] = useState([]);
  const [applicants, setApplicants] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [opening, setOpening] = useState(EMPTY_OPENING);
  const [applicant, setApplicant] = useState(EMPTY_APPLICANT);
  const [entry, setEntry] = useState(null); // 'opening' | 'applicant'
  const [tab, setTab] = useState('openings');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const load = useCallback(() => {
    api('/recruitment/openings')
      .then(setOpenings)
      .catch((e) => setError(e.message));
    api(`/recruitment/applicants${filter ? `?openingId=${filter}` : ''}`).then(setApplicants);
  }, [filter]);
  useEffect(() => {
    api('/hr/departments')
      .then(setDepartments)
      .catch(() => {});
  }, []);
  useEffect(load, [load]);
  useOpenNew(() => {
    setOpening(EMPTY_OPENING);
    setEntry('opening');
  });

  const run = async (fn, message) => {
    setError('');
    setNotice('');
    try {
      const r = await fn();
      if (message) setNotice(message(r));
      load();
    } catch (err) {
      setError(err.message);
    }
  };
  const submit = (kind) => async (e) => {
    e.preventDefault();
    setError('');
    setNotice('');
    setBusy(true);
    try {
      if (kind === 'opening') {
        await api('/recruitment/openings', { method: 'POST', body: opening });
        setOpening(EMPTY_OPENING);
      } else {
        await api('/recruitment/applicants', { method: 'POST', body: applicant });
        setApplicant({ ...EMPTY_APPLICANT, openingId: applicant.openingId });
      }
      setEntry(null);
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };
  const setO = (k) => (e) => setOpening({ ...opening, [k]: e.target.value });
  const setA = (k) => (e) => setApplicant({ ...applicant, [k]: e.target.value });
  const goTab = (k) => {
    setTab(k);
    setQ('');
    setPage(1);
  };

  const needle = q.trim().toLowerCase();
  const shownOpenings = openings.filter(
    (o) => !needle || `${o.title} ${o.departmentName ?? ''}`.toLowerCase().includes(needle),
  );
  const shownApplicants = applicants.filter(
    (a) =>
      !needle ||
      `${a.name} ${a.openingTitle} ${a.qualification ?? ''} ${a.email ?? ''} ${a.phone ?? ''}`
        .toLowerCase()
        .includes(needle),
  );
  const shown = tab === 'openings' ? shownOpenings : shownApplicants;
  const from = (page - 1) * PAGE_SIZE;
  const hired = openings.reduce((n, o) => n + Number(o.hired), 0);

  return (
    <>
      <div className="profile-head">
        <div>
          <h1>Recruitment</h1>
          <p className="hint">
            Flow: applied → shortlisted → interviewed → offered → hired. Hiring creates the staff profile and
            closes the opening once its vacancies are filled.
          </p>
        </div>
        <div className="head-actions">
          <button
            type="button"
            className="ghost"
            onClick={() => {
              setError('');
              setApplicant(EMPTY_APPLICANT);
              setEntry('applicant');
            }}
          >
            + Add applicant
          </button>
          <button
            type="button"
            className="big-action"
            onClick={() => {
              setError('');
              setOpening(EMPTY_OPENING);
              setEntry('opening');
            }}
          >
            + New opening
          </button>
        </div>
      </div>
      {error && !entry && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {notice && <p className="success">{notice}</p>}

      <div className="stats enquiry-tiles four">
        <Tile
          icon="▤"
          tone="blue"
          label="Open positions"
          value={openings.filter((o) => o.status === 'open').length}
          hint={`${openings.length} opening${openings.length === 1 ? '' : 's'} in all`}
        />
        <Tile icon="♙" tone="violet" label="Applicants" value={applicants.length} />
        <Tile
          icon="✉"
          tone="amber"
          label="Offers made"
          value={applicants.filter((a) => a.status === 'offered').length}
        />
        <Tile icon="✓" tone="green" label="Hired" value={hired} />
      </div>

      <section className="card enquiry-card">
        <div className="tabs-line" role="tablist">
          {TABS.map(([k, l]) => (
            <button
              key={k}
              type="button"
              role="tab"
              aria-selected={tab === k}
              className={tab === k ? 'on' : ''}
              onClick={() => goTab(k)}
            >
              {l}
              <span className="count">{k === 'openings' ? openings.length : applicants.length}</span>
            </button>
          ))}
        </div>
        <div className="toolbar">
          <label className="search-field">
            <span aria-hidden="true">⌕</span>
            <input
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setPage(1);
              }}
              placeholder={
                tab === 'openings' ? 'Search opening or department…' : 'Search applicant, opening or contact…'
              }
              aria-label="Search"
            />
          </label>
          {tab === 'applicants' && (
            <select
              value={filter}
              onChange={(e) => {
                setFilter(e.target.value);
                setPage(1);
              }}
              aria-label="Show opening"
            >
              <option value="">All openings</option>
              {openings.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.title}
                </option>
              ))}
            </select>
          )}
          <span className="showing">
            {shown.length} {tab}
          </span>
        </div>
        <div className="table-scroll">
          {tab === 'openings' ? (
            <table className="enquiry-table">
              <thead>
                <tr>
                  <th>Opening</th>
                  <th>Department</th>
                  <th>Vacancies</th>
                  <th>Hired</th>
                  <th>Applicants</th>
                  <th>Apply by</th>
                  <th>Status</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {shownOpenings.slice(from, from + PAGE_SIZE).map((o) => (
                  <tr key={o.id}>
                    <td>
                      <b>{o.title}</b>
                    </td>
                    <td>{o.departmentName}</td>
                    <td>{o.vacancies}</td>
                    <td>{o.hired}</td>
                    <td>{o.applicants}</td>
                    <td>
                      {o.closingDate}
                      {o.expired && (
                        <>
                          {' '}
                          <span className="badge rejected">passed</span>
                        </>
                      )}
                    </td>
                    <td>
                      <span className={`badge ${o.status === 'open' ? 'paid' : ''}`}>● {o.status}</span>
                    </td>
                    <td className="row-actions">
                      <button
                        type="button"
                        onClick={() =>
                          run(() =>
                            api(`/recruitment/openings/${o.id}`, {
                              method: 'PUT',
                              body: { ...o, status: o.status === 'open' ? 'closed' : 'open' },
                            }),
                          )
                        }
                      >
                        {o.status === 'open' ? 'Close' : 'Reopen'}
                      </button>
                      <button
                        type="button"
                        className="ghost"
                        onClick={() => run(() => api(`/recruitment/openings/${o.id}`, { method: 'DELETE' }))}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
                {!shownOpenings.length && (
                  <tr>
                    <td colSpan={8} className="empty-row">
                      {needle ? 'No openings match.' : 'No openings yet.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          ) : (
            <table className="enquiry-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Opening</th>
                  <th>Contact</th>
                  <th>Qualification</th>
                  <th>Stage</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {shownApplicants.slice(from, from + PAGE_SIZE).map((a) => (
                  <tr key={a.id}>
                    <td>
                      <b>{a.name}</b>
                    </td>
                    <td>{a.openingTitle}</td>
                    <td>{[a.phone, a.email].filter(Boolean).join(' · ')}</td>
                    <td>{a.qualification}</td>
                    <td>
                      <span className={`badge ${BADGE[a.status]}`}>● {a.status}</span>
                    </td>
                    <td className="row-actions">
                      {a.nextStatuses.map((s) => (
                        <button
                          key={s}
                          type="button"
                          className={s === 'rejected' ? 'ghost' : ''}
                          onClick={() =>
                            run(() =>
                              api(`/recruitment/applicants/${a.id}/status`, {
                                method: 'POST',
                                body: { status: s },
                              }),
                            )
                          }
                        >
                          {LABEL[s]}
                        </button>
                      ))}
                      {a.status === 'offered' && (
                        <button
                          type="button"
                          onClick={() =>
                            run(
                              () => api(`/recruitment/applicants/${a.id}/hire`, { method: 'POST', body: {} }),
                              (r) => `Hired as ${r.staffNo}. Complete their profile under Staff.`,
                            )
                          }
                        >
                          Hire
                        </button>
                      )}
                      {a.status !== 'hired' && (
                        <button
                          type="button"
                          className="ghost"
                          onClick={() =>
                            run(() => api(`/recruitment/applicants/${a.id}`, { method: 'DELETE' }))
                          }
                        >
                          Delete
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {!shownApplicants.length && (
                  <tr>
                    <td colSpan={6} className="empty-row">
                      {needle || filter ? 'No applicants match.' : 'No applicants yet.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
        <Pagination page={page} pageSize={PAGE_SIZE} total={shown.length} onChange={setPage} />
      </section>

      <Modal open={entry === 'opening'} title="New job opening" wide={false} onClose={() => setEntry(null)}>
        <form onSubmit={submit('opening')} className="enquiry-form">
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          <div className="enq-grid">
            <label className="wide">
              <span>Job title *</span>
              <input value={opening.title} onChange={setO('title')} required />
            </label>
            <label>
              <span>Department</span>
              <select value={opening.departmentId} onChange={setO('departmentId')}>
                <option value="">--</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>Vacancies</span>
              <input type="number" min="1" value={opening.vacancies} onChange={setO('vacancies')} />
            </label>
            <label>
              <span>Apply by</span>
              <input type="date" value={opening.closingDate} onChange={setO('closingDate')} />
            </label>
            <label className="wide">
              <span>Details</span>
              <input value={opening.description} onChange={setO('description')} />
            </label>
          </div>
          <div className="form-actions">
            <button type="submit" disabled={busy}>
              {busy ? 'Saving…' : 'Add opening'}
            </button>
            <button type="button" className="ghost" onClick={() => setEntry(null)}>
              Cancel
            </button>
          </div>
        </form>
      </Modal>

      <Modal open={entry === 'applicant'} title="Add applicant" wide={false} onClose={() => setEntry(null)}>
        <form onSubmit={submit('applicant')} className="enquiry-form">
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          <div className="enq-grid">
            <label className="wide">
              <span>Opening *</span>
              <select value={applicant.openingId} onChange={setA('openingId')} required>
                <option value="">--</option>
                {openings
                  .filter((o) => o.status === 'open')
                  .map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.title}
                    </option>
                  ))}
              </select>
            </label>
            <label className="wide">
              <span>Name *</span>
              <input value={applicant.name} onChange={setA('name')} required />
            </label>
            <label>
              <span>Email</span>
              <input type="email" value={applicant.email} onChange={setA('email')} />
            </label>
            <label>
              <span>Phone</span>
              <input value={applicant.phone} onChange={setA('phone')} />
            </label>
            <label className="wide">
              <span>Qualification</span>
              <input value={applicant.qualification} onChange={setA('qualification')} />
            </label>
            <label className="wide">
              <span>Notes</span>
              <input value={applicant.notes} onChange={setA('notes')} />
            </label>
          </div>
          <div className="form-actions">
            <button type="submit" disabled={busy}>
              {busy ? 'Saving…' : 'Add applicant'}
            </button>
            <button type="button" className="ghost" onClick={() => setEntry(null)}>
              Cancel
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}
