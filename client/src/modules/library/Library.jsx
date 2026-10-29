import { useCallback, useEffect, useState } from 'react';
import { api } from '../../services/api.js';
import Modal from '../../components/Modal.jsx';
import Pagination from '../../components/Pagination.jsx';
import TypeaheadSelect from '../../components/TypeaheadSelect.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useOpenNew } from '../../hooks/useOpenNew.js';

const PAGE_SIZE = 10;
const EMPTY_BOOK = { title: '', author: '', categoryId: '', isbn: '', copies: 1 };
const TABS = [
  ['books', 'Books'],
  ['out', 'On loan'],
  ['overdue', 'Overdue'],
  ['returned', 'Returned'],
];
const date = (d) =>
  d
    ? new Date(`${String(d).slice(0, 10)}T00:00:00`).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : '—';
const csvCell = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;

function Tile({ icon, tone, label, value, hint, onClick }) {
  const body = (
    <>
      <span className={`tile-icon ${tone}`} aria-hidden="true">
        {icon}
      </span>
      <span className="tile-text">
        <span>{label}</span>
        <b>{value}</b>
        {hint && <small>{hint}</small>}
      </span>
    </>
  );
  return onClick ? (
    <button type="button" className="tile card tile-button" onClick={onClick}>
      {body}
    </button>
  ) : (
    <div className="tile card">{body}</div>
  );
}

/** The library desk: books, who has them, what is overdue. Issuing, returning and editing books happen in popups. */
export default function Library() {
  const { user } = useAuth();
  const canWrite = ['admin', 'teacher'].includes(user?.role);
  const [books, setBooks] = useState([]);
  const [issues, setIssues] = useState([]);
  const [categories, setCategories] = useState([]);
  const [summary, setSummary] = useState(null);
  const [tab, setTab] = useState('books');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [popup, setPopup] = useState(null); // { kind: 'book' | 'issue', id? }
  const [bookForm, setBookForm] = useState(EMPTY_BOOK);
  const [issueForm, setIssueForm] = useState({ bookId: '', studentId: '' });
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  useOpenNew(() => openIssue(), canWrite); // eslint-disable-line no-use-before-define

  const load = useCallback(() => {
    api('/library/books')
      .then(setBooks)
      .catch((e) => setError(e.message));
    api('/library/issues')
      .then(setIssues)
      .catch(() => {});
    api('/library/summary')
      .then(setSummary)
      .catch(() => {});
  }, []);
  useEffect(load, [load]);
  useEffect(() => {
    api('/library/categories')
      .then(setCategories)
      .catch(() => {});
  }, []);

  const run = async (fn, message) => {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const r = await fn();
      if (message) setNotice(typeof message === 'function' ? message(r) : message);
      load();
      return true;
    } catch (err) {
      setError(err.message);
      return false;
    } finally {
      setBusy(false);
    }
  };
  const openBook = (b) => {
    setError('');
    setNotice('');
    setBookForm(
      b
        ? {
            title: b.title,
            author: b.author ?? '',
            categoryId: b.categoryId ?? '',
            isbn: b.isbn ?? '',
            copies: b.copies,
          }
        : EMPTY_BOOK,
    );
    setPopup({ kind: 'book', id: b?.id });
  };
  const openIssue = () => {
    setError('');
    setNotice('');
    setIssueForm({ bookId: '', studentId: '' });
    setPopup({ kind: 'issue' });
  };
  const close = () => setPopup(null);

  const saveBook = async (e) => {
    e.preventDefault();
    if (
      await run(
        () =>
          api(popup.id ? `/library/books/${popup.id}` : '/library/books', {
            method: popup.id ? 'PUT' : 'POST',
            body: bookForm,
          }),
        popup.id ? 'Book updated.' : 'Book added.',
      )
    )
      close();
  };
  const issueBook = async (e) => {
    e.preventDefault();
    if (await run(() => api('/library/issues', { method: 'POST', body: issueForm }), 'Book issued.')) close();
  };
  const giveBack = (i) =>
    run(
      () => api(`/library/issues/${i.id}/return`, { method: 'POST' }),
      (r) =>
        Number(r.fine) > 0
          ? `Returned ${r.lateDays} day(s) late. Fine ${r.fine} has been added to the student's fees.`
          : 'Returned on time.',
    );
  const removeBook = (b) => run(() => api(`/library/books/${b.id}`, { method: 'DELETE' }), 'Book deleted.');
  const billPast = () =>
    run(
      () => api('/library/issues/bill-fines', { method: 'POST' }),
      (r) => `Past fines: ${r.created} added to fees, ${r.skipped} already billed.`,
    );

  const loans = {
    out: issues.filter((i) => !i.returnedOn),
    overdue: issues.filter((i) => !i.returnedOn && i.overdue),
    returned: issues.filter((i) => i.returnedOn),
  };
  const counts = {
    books: books.length,
    out: loans.out.length,
    overdue: loans.overdue.length,
    returned: loans.returned.length,
  };
  const needle = q.trim().toLowerCase();
  const shown =
    tab === 'books'
      ? books.filter(
          (b) =>
            !needle ||
            `${b.title} ${b.author ?? ''} ${b.isbn ?? ''} ${b.LibraryCategory?.name ?? ''}`
              .toLowerCase()
              .includes(needle),
        )
      : loans[tab].filter(
          (i) => !needle || `${i.bookTitle} ${i.studentName} ${i.admissionNo}`.toLowerCase().includes(needle),
        );
  const pageRows = shown.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const from = shown.length ? (page - 1) * PAGE_SIZE + 1 : 0;
  const goTab = (t) => {
    setTab(t);
    setQ('');
    setPage(1);
  };

  const exportCsv = () => {
    const rows =
      tab === 'books'
        ? [
            ['Title', 'Author', 'Category', 'ISBN', 'Available', 'Copies'],
            ...shown.map((b) => [b.title, b.author, b.LibraryCategory?.name, b.isbn, b.available, b.copies]),
          ]
        : [
            ['Book', 'Student', 'Issued', 'Due', 'Returned', 'Fine'],
            ...shown.map((i) => [i.bookTitle, i.studentName, i.issuedOn, i.dueOn, i.returnedOn, i.fine]),
          ];
    const url = URL.createObjectURL(
      new Blob([rows.map((r) => r.map(csvCell).join(',')).join('\r\n')], { type: 'text/csv' }),
    );
    const a = document.createElement('a');
    a.href = url;
    a.download = `library-${tab}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <div className="profile-head">
        <div>
          <h1>Library</h1>
          <p className="hint">Manage books, issue them to students and follow what is overdue.</p>
        </div>
        <div className="head-actions">
          <button type="button" className="ghost" onClick={exportCsv}>
            ↓ Export
          </button>
          {user?.role === 'admin' && (
            <button type="button" className="ghost" onClick={billPast} disabled={busy}>
              Bill earlier fines
            </button>
          )}
          {canWrite && (
            <button type="button" className="ghost" onClick={() => openBook()}>
              ＋ Add book
            </button>
          )}
          {canWrite && (
            <button type="button" className="big-action" onClick={openIssue}>
              Issue a book
            </button>
          )}
        </div>
      </div>
      {notice && <p className="success">{notice}</p>}
      {error && !popup && (
        <p className="error" role="alert">
          {error}
        </p>
      )}

      <div className="stats enquiry-tiles four">
        <Tile
          icon="▤"
          tone="blue"
          label="Book titles"
          value={summary?.titles ?? '…'}
          hint={summary ? `${summary.copies} copies` : null}
          onClick={() => goTab('books')}
        />
        <Tile
          icon="♙"
          tone="green"
          label="On loan"
          value={summary?.onLoan ?? '…'}
          onClick={() => goTab('out')}
        />
        <Tile
          icon="!"
          tone="red"
          label="Overdue"
          value={summary?.overdue ?? '…'}
          hint={summary?.overdue ? 'Need to come back' : 'Nothing overdue'}
          onClick={() => goTab('overdue')}
        />
        <Tile
          icon="▣"
          tone="amber"
          label="Fines charged"
          value={summary?.finesCharged ?? '…'}
          hint={summary ? `${summary.activeReservations} reservation(s)` : null}
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
              <span className="count">{counts[k]}</span>
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
              placeholder={tab === 'books' ? 'Search title, author or ISBN…' : 'Search book or student…'}
              aria-label="Search"
            />
          </label>
          <span className="showing">
            Showing{' '}
            <b>
              {from}–{Math.min(page * PAGE_SIZE, shown.length)}
            </b>{' '}
            of <b>{shown.length}</b>
          </span>
        </div>
        <div className="table-scroll">
          {tab === 'books' ? (
            <table className="enquiry-table">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Author</th>
                  <th>Category</th>
                  <th>ISBN</th>
                  <th>Available</th>
                  {canWrite && <th />}
                </tr>
              </thead>
              <tbody>
                {pageRows.map((b) => (
                  <tr key={b.id}>
                    <td>
                      <b>{b.title}</b>
                    </td>
                    <td>{b.author}</td>
                    <td>{b.LibraryCategory?.name ?? <span className="none">—</span>}</td>
                    <td className="muted-cell">{b.isbn}</td>
                    <td>
                      <span className={`badge ${b.available > 0 ? 'paid' : 'rejected'}`}>
                        ● {b.available} / {b.copies}
                      </span>
                    </td>
                    {canWrite && (
                      <td className="row-actions">
                        <button type="button" className="ghost" onClick={() => openBook(b)}>
                          Edit
                        </button>
                        <button type="button" className="ghost danger" onClick={() => removeBook(b)}>
                          Delete
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
                {!pageRows.length && (
                  <tr>
                    <td colSpan={canWrite ? 6 : 5} className="empty-row">
                      {needle ? 'No books match.' : 'No books yet. Add the first one.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          ) : (
            <table className="enquiry-table">
              <thead>
                <tr>
                  <th>Book</th>
                  <th>Student</th>
                  <th>Issued</th>
                  <th>Due</th>
                  <th>Returned</th>
                  <th>Fine</th>
                  {canWrite && <th />}
                </tr>
              </thead>
              <tbody>
                {pageRows.map((i) => (
                  <tr key={i.id}>
                    <td>
                      <b>{i.bookTitle}</b>
                    </td>
                    <td>
                      {i.studentName}
                      <small className="block">{i.admissionNo}</small>
                    </td>
                    <td>{date(i.issuedOn)}</td>
                    <td>
                      {date(i.dueOn)}
                      {i.overdue && !i.returnedOn && (
                        <span className="badge rejected" style={{ marginLeft: 6 }}>
                          overdue
                        </span>
                      )}
                    </td>
                    <td>{date(i.returnedOn)}</td>
                    <td>{i.fine}</td>
                    {canWrite && (
                      <td className="row-actions">
                        {!i.returnedOn && (
                          <button type="button" onClick={() => giveBack(i)} disabled={busy}>
                            Return
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
                {!pageRows.length && (
                  <tr>
                    <td colSpan={canWrite ? 7 : 6} className="empty-row">
                      {needle ? 'No loans match.' : 'No loans here.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
        <Pagination page={page} pageSize={PAGE_SIZE} total={shown.length} onChange={setPage} />
      </section>

      <Modal
        open={Boolean(popup)}
        title={popup?.kind === 'issue' ? 'Issue a book' : popup?.id ? 'Edit book' : 'Add a book'}
        wide={false}
        onClose={close}
      >
        {popup?.kind === 'issue' && (
          <form onSubmit={issueBook} className="enquiry-form">
            {error && (
              <p className="error" role="alert">
                {error}
              </p>
            )}
            <div className="enq-grid">
              <label className="wide">
                <span>Book *</span>
                <select
                  value={issueForm.bookId}
                  onChange={(e) => setIssueForm({ ...issueForm, bookId: e.target.value })}
                  required
                >
                  <option value="">Choose a book</option>
                  {books
                    .filter((b) => b.available > 0)
                    .map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.title} ({b.available} left)
                      </option>
                    ))}
                </select>
              </label>
              <label className="wide">
                <span>Student *</span>
                <TypeaheadSelect
                  kind="students"
                  value={issueForm.studentId}
                  onChange={(id) => setIssueForm({ ...issueForm, studentId: id })}
                  filters={{ status: 'active' }}
                  required
                />
              </label>
            </div>
            <div className="form-actions">
              <button type="submit" disabled={busy}>
                {busy ? 'Issuing…' : 'Issue'}
              </button>
              <button type="button" className="ghost" onClick={close}>
                Cancel
              </button>
            </div>
          </form>
        )}
        {popup?.kind === 'book' && (
          <form onSubmit={saveBook} className="enquiry-form">
            {error && (
              <p className="error" role="alert">
                {error}
              </p>
            )}
            <div className="enq-grid">
              <label className="wide">
                <span>Title *</span>
                <input
                  value={bookForm.title}
                  onChange={(e) => setBookForm({ ...bookForm, title: e.target.value })}
                  required
                  maxLength={200}
                />
              </label>
              <label>
                <span>Author</span>
                <input
                  value={bookForm.author}
                  onChange={(e) => setBookForm({ ...bookForm, author: e.target.value })}
                  maxLength={120}
                />
              </label>
              <label>
                <span>Category</span>
                <select
                  value={bookForm.categoryId}
                  onChange={(e) => setBookForm({ ...bookForm, categoryId: e.target.value })}
                >
                  <option value="">--</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span>ISBN</span>
                <input
                  value={bookForm.isbn}
                  onChange={(e) => setBookForm({ ...bookForm, isbn: e.target.value })}
                  maxLength={30}
                />
              </label>
              <label>
                <span>Copies</span>
                <input
                  type="number"
                  min="0"
                  value={bookForm.copies}
                  onChange={(e) => setBookForm({ ...bookForm, copies: e.target.value })}
                />
              </label>
            </div>
            <div className="form-actions">
              <button type="submit" disabled={busy}>
                {busy ? 'Saving…' : popup.id ? 'Save changes' : 'Add book'}
              </button>
              <button type="button" className="ghost" onClick={close}>
                Cancel
              </button>
            </div>
          </form>
        )}
      </Modal>
    </>
  );
}
