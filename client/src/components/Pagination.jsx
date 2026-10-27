import { useEffect, useRef } from 'react';

export default function Pagination({ page, pageSize, total, onChange }) {
  const pages = Math.max(Math.ceil(total / pageSize), 1);
  const el = useRef(null);
  // The S.No column counts from the first row of this page: tell the list's table how many rows came before it.
  useEffect(() => {
    el.current?.closest('.card, section')?.querySelector('table.enquiry-table')?.style.setProperty('--sno-start', String((page - 1) * pageSize));
  }, [page, pageSize, total]);
  return (
    <div className="pagination" ref={el}>
      <button disabled={page <= 1} onClick={() => onChange(page - 1)}>Previous</button>
      <span>Page {page} of {pages} · {total} records</span>
      <button disabled={page >= pages} onClick={() => onChange(page + 1)}>Next</button>
    </div>
  );
}
