import { useCallback, useEffect, useState } from 'react';
import { api } from '../../services/api.js';
import Modal from '../../components/Modal.jsx';
import Pagination from '../../components/Pagination.jsx';
import { useOpenNew } from '../../hooks/useOpenNew.js';
import { localDate } from '../../utils/dates.js';

const PAGE_SIZE = 10;
const today = () => localDate();
const emptyForm = () => ({ itemId: '', quantity: '', unitCost: '', supplierId: '', party: '', note: '', date: today() });
const date = (d) => (d ? new Date(`${String(d).slice(0, 10)}T00:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—');
const money = (n) => Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const csvCell = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;

function Tile({ icon, tone, label, value, hint }) {
  return (
    <div className="tile card">
      <span className={`tile-icon ${tone}`} aria-hidden="true">{icon}</span>
      <span className="tile-text"><span>{label}</span><b>{value}</b>{hint && <small>{hint}</small>}</span>
    </div>
  );
}

/** Stock In (type "in") and Stock Out (type "out") share one page. Recording a movement happens in a popup. */
export default function StockMovements({ type }) {
  const isIn = type === 'in';
  const [rows, setRows] = useState([]);
  const [items, setItems] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [form, setForm] = useState(emptyForm());
  const [entry, setEntry] = useState(false);
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  useOpenNew(() => openNew(), true); // eslint-disable-line no-use-before-define

  const load = useCallback(() => {
    api(`/inventory/movements?type=${type}`).then(setRows).catch((e) => setError(e.message));
    api('/inventory/items').then(setItems).catch(() => {});
  }, [type]);
  useEffect(() => { setForm(emptyForm()); setNotice(''); setQ(''); setPage(1); load(); }, [load]);
  useEffect(() => { api('/inventory/suppliers').then(setSuppliers).catch(() => {}); }, []);

  const openNew = () => { setError(''); setNotice(''); setForm(emptyForm()); setEntry(true); };
  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });
  const item = items.find((i) => String(i.id) === String(form.itemId));

  const save = async (e) => {
    e.preventDefault();
    setBusy(true); setError('');
    try {
      await api('/inventory/movements', { method: 'POST', body: { ...form, type } });
      setNotice(`${isIn ? 'Added' : 'Issued'} ${form.quantity} ${item?.unit ?? ''} ${item?.name ?? ''}.`);
      setEntry(false); load();
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  };

  const needle = q.trim().toLowerCase();
  const shown = rows.filter((m) => !needle || `${m.itemName} ${m.supplierName ?? ''} ${m.party ?? ''} ${m.note ?? ''}`.toLowerCase().includes(needle));
  const pageRows = shown.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const from = shown.length ? (page - 1) * PAGE_SIZE + 1 : 0;
  const monthStart = `${today().slice(0, 8)}01`;
  const thisMonth = rows.filter((m) => String(m.date) >= monthStart);
  const units = (list) => list.reduce((n, m) => n + Number(m.quantity), 0);
  const value = rows.reduce((n, m) => n + Number(m.quantity) * Number(m.unitCost ?? 0), 0);
  const low = items.filter((i) => i.lowStock);

  const exportCsv = () => {
    const head = ['Date', 'Item', 'Quantity', 'Unit', ...(isIn ? ['Unit cost', 'Supplier'] : ['Issued to']), 'Note', 'By'];
    const lines = shown.map((m) => [m.date, m.itemName, m.quantity, m.unit, ...(isIn ? [m.unitCost, m.supplierName] : [m.party]), m.note, m.createdByName].map(csvCell).join(','));
    const url = URL.createObjectURL(new Blob([[head.map(csvCell).join(','), ...lines].join('\r\n')], { type: 'text/csv' }));
    const l = document.createElement('a'); l.href = url; l.download = `stock-${type}.csv`; document.body.appendChild(l); l.click(); l.remove(); URL.revokeObjectURL(url);
  };

  return (
    <>
      <div className="profile-head">
        <div>
          <h1>{isIn ? 'Stock in' : 'Stock out'}</h1>
          <p className="hint">{isIn ? 'Record items received without a purchase order (donations, returns, opening stock). Orders under Purchase Orders add their stock when marked received.' : 'Record items issued, used or written off. You cannot issue more than is in stock.'}</p>
        </div>
        <div className="head-actions">
          <button type="button" className="ghost" onClick={exportCsv}>↓ Export</button>
          <button type="button" className="big-action" onClick={openNew}>{isIn ? '＋ Add stock' : 'Issue stock'}</button>
        </div>
      </div>
      {notice && <p className="success">{notice}</p>}
      {error && !entry && <p className="error" role="alert">{error}</p>}

      <div className="stats enquiry-tiles four">
        <Tile icon="▤" tone="blue" label={isIn ? 'Received this month' : 'Issued this month'} value={units(thisMonth)} hint={`${thisMonth.length} movement${thisMonth.length === 1 ? '' : 's'}`} />
        <Tile icon="≡" tone="green" label="Movements recorded" value={rows.length} />
        {isIn ? <Tile icon="▣" tone="violet" label="Value received" value={money(value)} /> : <Tile icon="◷" tone="violet" label="Units issued" value={units(rows)} />}
        <Tile icon="!" tone="amber" label="Items low on stock" value={low.length} hint={low.length ? low.slice(0, 2).map((i) => i.name).join(', ') : 'All above reorder level'} />
      </div>

      <section className="card enquiry-card">
        <div className="toolbar">
          <label className="search-field"><span aria-hidden="true">⌕</span><input value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} placeholder={isIn ? 'Search item or supplier…' : 'Search item or who it went to…'} aria-label="Search" /></label>
          <span className="showing">Showing <b>{from}–{Math.min(page * PAGE_SIZE, shown.length)}</b> of <b>{shown.length}</b></span>
        </div>
        <div className="table-scroll">
          <table className="enquiry-table">
            <thead><tr><th>Date</th><th>Item</th><th>Quantity</th>{isIn && <th>Unit cost</th>}<th>{isIn ? 'Supplier' : 'Issued to'}</th><th>Note</th><th>By</th></tr></thead>
            <tbody>
              {pageRows.map((m) => (
                <tr key={m.id}>
                  <td>{date(m.date)}</td><td><b>{m.itemName}</b></td>
                  <td><span className={`badge ${isIn ? 'paid' : 'partial'}`}>{isIn ? '+' : '−'}{m.quantity} {m.unit}</span></td>
                  {isIn && <td>{m.unitCost ?? '—'}</td>}
                  <td>{(isIn ? m.supplierName : m.party) ?? '—'}</td><td>{m.note || '—'}</td><td>{m.createdByName}</td>
                </tr>
              ))}
              {!pageRows.length && <tr><td colSpan={isIn ? 7 : 6} className="empty-row">{needle ? 'Nothing matches.' : 'Nothing recorded yet.'}</td></tr>}
            </tbody>
          </table>
        </div>
        <Pagination page={page} pageSize={PAGE_SIZE} total={shown.length} onChange={setPage} />
      </section>

      <Modal open={entry} title={isIn ? 'Add stock' : 'Issue stock'} wide={false} onClose={() => setEntry(false)}>
        <form onSubmit={save} className="enquiry-form">
          {error && <p className="error" role="alert">{error}</p>}
          <div className="enq-grid">
            <label className="wide"><span>Item *</span>
              <select value={form.itemId} onChange={set('itemId')} required><option value="">Choose an item</option>{items.map((i) => <option key={i.id} value={i.id}>{i.name} ({i.quantity} {i.unit})</option>)}</select>
            </label>
            <label><span>Quantity *</span><input type="number" min="1" step="1" value={form.quantity} onChange={set('quantity')} required max={!isIn && item ? item.quantity : undefined} /></label>
            <label><span>Date</span><input type="date" value={form.date} onChange={set('date')} max={today()} /></label>
            {isIn ? (
              <>
                <label><span>Unit cost</span><input type="number" min="0" step="0.01" value={form.unitCost} onChange={set('unitCost')} /></label>
                <label><span>Supplier</span><select value={form.supplierId} onChange={set('supplierId')}><option value="">--</option>{suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></label>
              </>
            ) : (
              <label className="wide"><span>Issued to / reason</span><input value={form.party} onChange={set('party')} placeholder="e.g. Class 5-A, Science lab" maxLength={100} /></label>
            )}
            <label className="wide"><span>Note</span><input value={form.note} onChange={set('note')} maxLength={255} /></label>
          </div>
          <div className="form-actions"><button type="submit" disabled={busy}>{busy ? 'Saving…' : isIn ? 'Add stock' : 'Issue stock'}</button><button type="button" className="ghost" onClick={() => setEntry(false)}>Cancel</button></div>
        </form>
      </Modal>
    </>
  );
}
