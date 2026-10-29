import { useCallback, useEffect, useState } from 'react';
import { api } from '../../services/api.js';
import Modal from '../../components/Modal.jsx';
import Pagination from '../../components/Pagination.jsx';
import PersonThumb from '../../components/PersonThumb.jsx';
import StudentDetails from '../academics/StudentDetails.jsx';
import { usePhotoSet } from '../../hooks/usePhotoSet.js';
import TypeaheadSelect from '../../components/TypeaheadSelect.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useOpenNew } from '../../hooks/useOpenNew.js';

const PAGE_SIZE = 10;
const EMPTY = { studentId: '', memberSince: '', validUntil: '', maxBooks: '', status: 'active', notes: '' };
const TABS = [
  ['cards', 'Library cards'],
  ['nocard', 'Borrowers without a card'],
];
const date = (d) =>
  d
    ? new Date(`${String(d).slice(0, 10)}T00:00:00`).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : '';

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

/** Library members: a card gives a student a number, a validity date and a limit on books at a time. */
export default function LibraryMembers() {
  const canWrite = ['admin', 'teacher'].includes(useAuth().user?.role);
  const canSeeProfile = canWrite;
  const [cards, setCards] = useState([]);
  const [borrowers, setBorrowers] = useState([]);
  const [form, setForm] = useState(EMPTY);
  const [entry, setEntry] = useState(null); // null | { id? }
  const [tab, setTab] = useState('cards');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [details, setDetails] = useState(null); // a student id whose full details are open
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  useOpenNew(() => openNew(), canWrite); // eslint-disable-line no-use-before-define

  const load = useCallback(() => {
    api('/library/memberships')
      .then(setCards)
      .catch((e) => setError(e.message));
    api('/library/members')
      .then(setBorrowers)
      .catch(() => {});
  }, []);
  useEffect(load, [load]);

  const openNew = () => {
    setError('');
    setNotice('');
    setForm(EMPTY);
    setEntry({});
  };
  const openEdit = (c) => {
    setError('');
    setNotice('');
    setForm({
      studentId: c.studentId,
      memberSince: c.memberSince ?? '',
      validUntil: c.validUntil ?? '',
      maxBooks: c.maxBooks,
      status: c.status,
      notes: c.notes ?? '',
    });
    setEntry({ id: c.id });
  };
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const save = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await api(entry.id ? `/library/memberships/${entry.id}` : '/library/memberships', {
        method: entry.id ? 'PUT' : 'POST',
        body: form,
      });
      setNotice(entry.id ? 'Card updated.' : 'Card issued.');
      setEntry(null);
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };
  const withdraw = async (c) => {
    setError('');
    setNotice('');
    try {
      await api(`/library/memberships/${c.id}`, { method: 'DELETE' });
      setNotice('Card withdrawn.');
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const holders = new Set(cards.map((c) => c.studentId));
  const withoutCard = borrowers.filter((b) => !holders.has(b.studentId));
  const needle = q.trim().toLowerCase();
  const list =
    tab === 'cards'
      ? cards.filter(
          (c) => !needle || `${c.cardNo} ${c.studentName} ${c.admissionNo}`.toLowerCase().includes(needle),
        )
      : withoutCard.filter(
          (m) => !needle || `${m.studentName} ${m.admissionNo}`.toLowerCase().includes(needle),
        );
  const pageRows = list.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const photos = usePhotoSet(
    'student',
    pageRows.map((c) => c.studentId),
  );
  const from = list.length ? (page - 1) * PAGE_SIZE + 1 : 0;
  const expired = cards.filter((c) => c.expired).length;
  const goTab = (t) => {
    setTab(t);
    setQ('');
    setPage(1);
  };

  return (
    <>
      <div className="profile-head">
        <div>
          <h1>Library members</h1>
          <p className="hint">
            A library card gives a student a number, a validity date and a limit on books at a time. Students
            without a card can still borrow unless Settings → Library requires one.
          </p>
        </div>
        <div className="head-actions">
          {canWrite && (
            <button type="button" className="big-action" onClick={openNew}>
              ＋ Issue a card
            </button>
          )}
        </div>
      </div>
      {notice && <p className="success">{notice}</p>}
      {error && !entry && (
        <p className="error" role="alert">
          {error}
        </p>
      )}

      <div className="stats enquiry-tiles four">
        <Tile
          icon="▤"
          tone="blue"
          label="Library cards"
          value={cards.length}
          hint={`${cards.filter((c) => c.status === 'active').length} active`}
        />
        <Tile
          icon="♙"
          tone="green"
          label="On loan now"
          value={cards.reduce((n, c) => n + Number(c.onLoan), 0)}
        />
        <Tile icon="!" tone="red" label="Overdue" value={cards.reduce((n, c) => n + Number(c.overdue), 0)} />
        <Tile
          icon="◷"
          tone="amber"
          label="Expired cards"
          value={expired}
          hint={
            withoutCard.length
              ? `${withoutCard.length} borrower${withoutCard.length === 1 ? '' : 's'} without a card`
              : null
          }
        />
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
              <span className="count">{k === 'cards' ? cards.length : withoutCard.length}</span>
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
              placeholder="Search card or student…"
              aria-label="Search"
            />
          </label>
          <span className="showing">
            Showing{' '}
            <b>
              {from}–{Math.min(page * PAGE_SIZE, list.length)}
            </b>{' '}
            of <b>{list.length}</b>
          </span>
        </div>
        <div className="table-scroll">
          {tab === 'cards' ? (
            <table className="enquiry-table">
              <thead>
                <tr>
                  <th>Card</th>
                  <th>Student</th>
                  <th>Valid until</th>
                  <th>Limit</th>
                  <th>On loan</th>
                  <th>Overdue</th>
                  <th>Fines</th>
                  <th>Status</th>
                  {canWrite && <th />}
                </tr>
              </thead>
              <tbody>
                {pageRows.map((c) => (
                  <tr key={c.id}>
                    <td className="muted-cell">{c.cardNo}</td>
                    <td>
                      <span className="person">
                        <PersonThumb id={c.studentId} has={photos.has(c.studentId)} name={c.studentName} />
                        <span>
                          <b>{c.studentName}</b>
                          <small className="block">{c.admissionNo}</small>
                        </span>
                        <button
                          type="button"
                          className="ghost more-btn"
                          aria-label={`All details of ${c.studentName}`}
                          title="All details"
                          onClick={() => setDetails(c.studentId)}
                        >
                          ⋯
                        </button>
                      </span>
                    </td>
                    <td>
                      {c.validUntil ? date(c.validUntil) : 'no expiry'}
                      {c.expired && (
                        <span className="badge rejected" style={{ marginLeft: 6 }}>
                          expired
                        </span>
                      )}
                    </td>
                    <td>{c.maxBooks}</td>
                    <td>{c.onLoan}</td>
                    <td>
                      {Number(c.overdue) > 0 ? (
                        <span className="badge rejected">{c.overdue}</span>
                      ) : (
                        c.overdue
                      )}
                    </td>
                    <td>{c.fines}</td>
                    <td>
                      <span className={`badge ${c.status === 'active' ? 'paid' : 'partial'}`}>
                        ● {c.status === 'active' ? 'Active' : 'Suspended'}
                      </span>
                    </td>
                    {canWrite && (
                      <td className="row-actions">
                        <button type="button" className="ghost" onClick={() => openEdit(c)}>
                          Edit
                        </button>
                        <button type="button" className="ghost danger" onClick={() => withdraw(c)}>
                          Withdraw
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
                {!pageRows.length && (
                  <tr>
                    <td colSpan={canWrite ? 9 : 8} className="empty-row">
                      {needle ? 'No cards match.' : 'No library cards issued yet.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          ) : (
            <table className="enquiry-table">
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Books borrowed</th>
                  <th>On loan now</th>
                  <th>Overdue</th>
                  <th>Fines charged</th>
                </tr>
              </thead>
              <tbody>
                {pageRows.map((m) => (
                  <tr key={m.studentId}>
                    <td>
                      <b>{m.studentName}</b>
                      {m.status !== 'active' && <small> ({m.status})</small>}
                      <small className="block">{m.admissionNo}</small>
                    </td>
                    <td>{m.borrowed}</td>
                    <td>{m.onLoan}</td>
                    <td>
                      {Number(m.overdue) > 0 ? (
                        <span className="badge rejected">{m.overdue}</span>
                      ) : (
                        m.overdue
                      )}
                    </td>
                    <td>{m.fines}</td>
                  </tr>
                ))}
                {!pageRows.length && (
                  <tr>
                    <td colSpan={5} className="empty-row">
                      {needle ? 'No borrowers match.' : 'Every borrower has a card.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
        <Pagination page={page} pageSize={PAGE_SIZE} total={list.length} onChange={setPage} />
      </section>

      <Modal
        open={Boolean(entry)}
        title={entry?.id ? 'Edit library card' : 'Issue a library card'}
        wide={false}
        onClose={() => setEntry(null)}
      >
        <form onSubmit={save} className="enquiry-form">
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          <div className="enq-grid">
            <label className="wide">
              <span>Student *</span>
              <TypeaheadSelect
                kind="students"
                value={form.studentId}
                onChange={(id) => setForm({ ...form, studentId: id })}
                filters={{ status: 'active' }}
                exclude={entry?.id ? [] : [...holders]}
                disabled={Boolean(entry?.id)}
                required
              />
            </label>
            <label>
              <span>Member since</span>
              <input type="date" value={form.memberSince} onChange={set('memberSince')} />
            </label>
            <label>
              <span>Valid until</span>
              <input
                type="date"
                value={form.validUntil}
                onChange={set('validUntil')}
                min={form.memberSince || undefined}
              />
            </label>
            <label>
              <span>Books at a time</span>
              <input
                type="number"
                min="1"
                max="50"
                value={form.maxBooks}
                onChange={set('maxBooks')}
                placeholder="default"
              />
            </label>
            <label>
              <span>Status</span>
              <select value={form.status} onChange={set('status')}>
                <option value="active">Active</option>
                <option value="suspended">Suspended</option>
              </select>
            </label>
            <label className="wide">
              <span>Notes</span>
              <input value={form.notes} onChange={set('notes')} maxLength={255} />
            </label>
          </div>
          <div className="form-actions">
            <button type="submit" disabled={busy}>
              {busy ? 'Saving…' : entry?.id ? 'Update card' : 'Issue card'}
            </button>
            <button type="button" className="ghost" onClick={() => setEntry(null)}>
              Cancel
            </button>
          </div>
        </form>
      </Modal>

      <Modal open={Boolean(details)} title="Student details" onClose={() => setDetails(null)}>
        {details && <StudentDetails id={details} canEdit={false} canSeeProfile={canSeeProfile} />}
      </Modal>
    </>
  );
}
