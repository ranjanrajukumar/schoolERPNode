import { useLayoutEffect, useRef, useState } from 'react';
import Pagination from './Pagination.jsx';

const PAGE_SIZE = 10;
const SEARCH_FROM = 6; // a search box is only worth showing once there is a list to search

/**
 * The card every list page puts its table in: the Enquiries look, plus a search box and paging once the list is long.
 * Pass the table's <thead> and <tbody> as children. Rows are shown or hidden in place, so a page keeps rendering its own rows.
 * Rows that are one wide message cell ("No records") are left alone. Printing always shows every row.
 */
export default function TableCard({ children, className = '' }) {
  const table = useRef(null);
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [count, setCount] = useState({ rows: 0, matched: 0 });

  // After every render: work out which rows match the search, then show only this page's.
  useLayoutEffect(() => {
    const body = table.current?.tBodies?.[0];
    if (!body) return;
    // a table people type into (marks, attendance, prices) always shows every row, so nothing entered is out of sight
    if (body.querySelector('input:not([type=checkbox]), select, textarea')) {
      [...body.rows].forEach((r) => {
        r.hidden = false;
      });
      setCount((c) => (c.rows === 0 && c.matched === 0 ? c : { rows: 0, matched: 0 }));
      return;
    }
    const needle = q.trim().toLowerCase();
    const rows = [...body.rows].filter(
      (r) => !(r.cells.length === 1 && r.cells[0].colSpan > 1) && !r.querySelector('.empty-row'),
    );
    const matched = rows.filter((r) => !needle || r.textContent.toLowerCase().includes(needle));
    const pages = Math.max(Math.ceil(matched.length / PAGE_SIZE), 1);
    const current = Math.min(page, pages);
    const visible = new Set(matched.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE));
    rows.forEach((r) => {
      r.hidden = !visible.has(r);
    });
    if (current !== page) setPage(current);
    setCount((c) =>
      c.rows === rows.length && c.matched === matched.length
        ? c
        : { rows: rows.length, matched: matched.length },
    );
  });

  const from = count.matched ? (page - 1) * PAGE_SIZE + 1 : 0;
  return (
    <div className={`card enquiry-card ${className}`}>
      {count.rows >= SEARCH_FROM && (
        <div className="toolbar no-print">
          <label className="search-field">
            <span aria-hidden="true">⌕</span>
            <input
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setPage(1);
              }}
              placeholder="Search this list…"
              aria-label="Search this list"
            />
          </label>
          <span className="showing">
            Showing{' '}
            <b>
              {from}–{Math.min(page * PAGE_SIZE, count.matched)}
            </b>{' '}
            of <b>{count.matched}</b>
          </span>
        </div>
      )}
      <div className="table-scroll">
        <table ref={table} className="enquiry-table">
          {children}
        </table>
      </div>
      {count.matched > PAGE_SIZE && (
        <div className="no-print">
          <Pagination page={page} pageSize={PAGE_SIZE} total={count.matched} onChange={setPage} />
        </div>
      )}
    </div>
  );
}
