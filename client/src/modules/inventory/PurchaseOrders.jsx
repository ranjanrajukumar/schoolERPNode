import { useCallback, useEffect, useState } from 'react';
import { api } from '../../services/api.js';
import Modal from '../../components/Modal.jsx';
import Pagination from '../../components/Pagination.jsx';
import { useOpenNew } from '../../hooks/useOpenNew.js';
import { localDate } from '../../utils/dates.js';

const PAGE_SIZE = 10;
const today = () => localDate();
const TABS = [['all', 'All orders'], ['ordered', 'Ordered'], ['received', 'Received'], ['cancelled', 'Cancelled']];
const PILL = { ordered: 'partial', received: 'paid', cancelled: 'rejected' };
const LABEL = { ordered: 'Ordered', received: 'Received', cancelled: 'Cancelled' };
const EMPTY_LINE = { itemId: '', quantity: '', unitCost: '' };
const emptyForm = () => ({ supplierId: '', orderDate: today(), expectedDate: '', note: '' });
const money = (n) => Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const date = (d) => (d ? new Date(`${String(d).slice(0, 10)}T00:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '');
const csvCell = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;

function Tile({ icon, tone, label, value, hint, onClick }) {
  const body = (
    <>
      <span className={`tile-icon ${tone}`} aria-hidden="true">{icon}</span>
      <span className="tile-text"><span>{label}</span><b>{value}</b>{hint && <small>{hint}</small>}</span>
    </>
  );
  return onClick ? <button type="button" className="tile card tile-button" onClick={onClick}>{body}</button> : <div className="tile card">{body}</div>;
}

/** Purchase orders: place an order in a popup; marking it received adds every line to stock, once. */
export default function PurchaseOrders() {
  const [orders, setOrders] = useState([]);
  const [items, setItems] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [form, setForm] = useState(emptyForm());
  const [lines, setLines] = useState([{ ...EMPTY_LINE }]);
  const [entry, setEntry] = useState(false);
  const [tab, setTab] = useState('all');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  useOpenNew(() => openNew(), true); // eslint-disable-line no-use-before-define

  const load = useCallback(() => { api('/inventory/orders').then(setOrders).catch((e) => setError(e.message)); }, []);
  useEffect(() => { load(); api('/inventory/items').then(setItems).catch(() => {}); api('/inventory/suppliers').then(setSuppliers).catch(() => {}); }, [load]);

  const openNew = () => { setError(''); setNotice(''); setForm(emptyForm()); setLines([{ ...EMPTY_LINE }]); setEntry(true); };
  const setLine = (i, key) => (e) => setLines(lines.map((l, n) => (n === i ? { ...l, [key]: e.target.value } : l)));
  const total = lines.reduce((s, l) => s + (Number(l.quantity) || 0) * (Number(l.unitCost) || 0), 0);

  const create = async (e) => {
    e.preventDefault();
    setBusy(true); setError('');
    try { await api('/inventory/orders', { method: 'POST', body: { ...form, lines: lines.filter((l) => l.itemId) } }); setNotice('Order placed.'); setEntry(false); load(); } catch (err) { setError(err.message); } finally { setBusy(false); }
  };
  const act = async (o, action, question, done) => {
    setError(''); setNotice('');
    try { await api(`/inventory/orders/${o.id}/${action}`, { method: 'POST' }); setNotice(done); load(); api('/inventory/items').then(setItems).catch(() => {}); } catch (err) { setError(err.message); }
  };

  const count = (k) => (k === 'all' ? orders.length : orders.filter((o) => o.status === k).length);
  const needle = q.trim().toLowerCase();
  const shown = orders.filter((o) => (tab === 'all' || o.status === tab) && (!needle || `${o.id} ${o.supplierName} ${o.lines.map((l) => l.itemName).join(' ')}`.toLowerCase().includes(needle)));
  const pageRows = shown.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const from = shown.length ? (page - 1) * PAGE_SIZE + 1 : 0;
  const open = orders.filter((o) => o.status === 'ordered');
  const overdue = open.filter((o) => o.expectedDate && o.expectedDate < today());
  const goTab = (t) => { setTab(t); setPage(1); };

  const exportCsv = () => {
    const head = ['Order', 'Supplier', 'Items', 'Total', 'Ordered', 'Expected', 'Received', 'Status'];
    const lines2 = shown.map((o) => [o.id, o.supplierName, o.lines.map((l) => `${l.quantity} ${l.unit} ${l.itemName}`).join('; '), o.total, o.orderDate, o.expectedDate, o.receivedOn, o.status].map(csvCell).join(','));
    const url = URL.createObjectURL(new Blob([[head.map(csvCell).join(','), ...lines2].join('\r\n')], { type: 'text/csv' }));
    const l = document.createElement('a'); l.href = url; l.download = 'purchase-orders.csv'; document.body.appendChild(l); l.click(); l.remove(); URL.revokeObjectURL(url);
  };

  return (
    <>
      <div className="profile-head">
        <div>
          <h1>Purchase orders</h1>
          <p className="hint">Mark an order received when the goods arrive: every line is then added to stock automatically, once.</p>
        </div>
        <div className="head-actions">
          <button type="button" className="ghost" onClick={exportCsv}>↓ Export</button>
          <button type="button" className="big-action" onClick={openNew}>＋ New order</button>
        </div>
      </div>
      {notice && <p className="success">{notice}</p>}
      {error && !entry && <p className="error" role="alert">{error}</p>}

      <div className="stats enquiry-tiles four">
        <Tile icon="▤" tone="blue" label="Orders" value={orders.length} onClick={() => goTab('all')} />
        <Tile icon="◷" tone="amber" label="Waiting for goods" value={open.length} hint={open.length ? money(open.reduce((n, o) => n + Number(o.total), 0)) : null} onClick={() => goTab('ordered')} />
        <Tile icon="!" tone="red" label="Past expected date" value={overdue.length} hint={overdue.length ? 'Chase the supplier' : 'Nothing late'} onClick={() => goTab('ordered')} />
        <Tile icon="✓" tone="green" label="Received" value={count('received')} hint={count('received') ? money(orders.filter((o) => o.status === 'received').reduce((n, o) => n + Number(o.total), 0)) : null} onClick={() => goTab('received')} />
      </div>

      <section className="card enquiry-card">
        <div className="tabs-line" role="tablist">
          {TABS.map(([k, l]) => <button key={k} type="button" role="tab" aria-selected={tab === k} className={tab === k ? 'on' : ''} onClick={() => goTab(k)}>{l}<span className="count">{count(k)}</span></button>)}
        </div>
        <div className="toolbar">
          <label className="search-field"><span aria-hidden="true">⌕</span><input value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} placeholder="Search order, supplier or item…" aria-label="Search orders" /></label>
          <span className="showing">Showing <b>{from}–{Math.min(page * PAGE_SIZE, shown.length)}</b> of <b>{shown.length}</b></span>
        </div>
        <div className="table-scroll">
          <table className="enquiry-table">
            <thead><tr><th>Order</th><th>Supplier</th><th>Items</th><th>Total</th><th>Dates</th><th>Status</th><th /></tr></thead>
            <tbody>
              {pageRows.map((o) => (
                <tr key={o.id}>
                  <td className="muted-cell">PO-{String(o.id).padStart(4, '0')}</td><td><b>{o.supplierName}</b></td>
                  <td>{o.lines.map((l) => <div key={l.id}>{l.quantity} {l.unit} {l.itemName} <small>@ {l.unitCost}</small></div>)}</td>
                  <td><b>{money(o.total)}</b></td>
                  <td>{date(o.orderDate)}{o.expectedDate && <small className="block">due {date(o.expectedDate)}</small>}{o.receivedOn && <small className="block">received {date(o.receivedOn)}</small>}</td>
                  <td><span className={`badge ${PILL[o.status]}`}>● {LABEL[o.status]}</span></td>
                  <td className="row-actions">
                    {o.status === 'ordered' && <button type="button" onClick={() => act(o, 'receive', `Mark order PO-${String(o.id).padStart(4, '0')} received and add its items to stock?`, 'Order received. Stock updated.')}>Receive</button>}
                    {o.status === 'ordered' && <button type="button" className="ghost danger" onClick={() => act(o, 'cancel', `Cancel order PO-${String(o.id).padStart(4, '0')}?`, 'Order cancelled.')}>Cancel</button>}
                  </td>
                </tr>
              ))}
              {!pageRows.length && <tr><td colSpan={7} className="empty-row">{needle || tab !== 'all' ? 'No orders match.' : 'No purchase orders yet. Place the first with “New order”.'}</td></tr>}
            </tbody>
          </table>
        </div>
        <Pagination page={page} pageSize={PAGE_SIZE} total={shown.length} onChange={setPage} />
      </section>

      <Modal open={entry} title="New purchase order" onClose={() => setEntry(false)}>
        <form onSubmit={create} className="enquiry-form">
          {error && <p className="error" role="alert">{error}</p>}
          <div className="enq-grid">
            <label><span>Supplier *</span><select value={form.supplierId} onChange={(e) => setForm({ ...form, supplierId: e.target.value })} required><option value="">Choose a supplier</option>{suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></label>
            <label><span>Order date *</span><input type="date" value={form.orderDate} onChange={(e) => setForm({ ...form, orderDate: e.target.value })} required /></label>
            <label><span>Expected</span><input type="date" value={form.expectedDate} min={form.orderDate} onChange={(e) => setForm({ ...form, expectedDate: e.target.value })} /></label>
            <label><span>Note</span><input value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} maxLength={255} /></label>
          </div>
          <h3 className="section-title" style={{ margin: '18px 0 10px' }}>Items</h3>
          {lines.map((l, i) => (
            <div className="enq-grid order-line" key={i}>
              <label><span>Item {i === 0 && '*'}</span><select value={l.itemId} onChange={setLine(i, 'itemId')} required={i === 0}><option value="">Choose an item</option>{items.map((it) => <option key={it.id} value={it.id}>{it.name}</option>)}</select></label>
              <label><span>Quantity {i === 0 && '*'}</span><input type="number" min="1" step="1" value={l.quantity} onChange={setLine(i, 'quantity')} required={i === 0 || Boolean(l.itemId)} /></label>
              <label><span>Unit cost</span><input type="number" min="0" step="0.01" value={l.unitCost} onChange={setLine(i, 'unitCost')} /></label>
              {lines.length > 1 && <button type="button" className="ghost danger" data-sure="off" onClick={() => setLines(lines.filter((_, n) => n !== i))}>Remove</button>}
            </div>
          ))}
          <button type="button" className="ghost" onClick={() => setLines([...lines, { ...EMPTY_LINE }])}>＋ Add another item</button>
          <div className="form-actions"><span className="req-note">Order total <b>{money(total)}</b></span><button type="submit" disabled={busy}>{busy ? 'Placing…' : 'Place order'}</button><button type="button" className="ghost" onClick={() => setEntry(false)}>Cancel</button></div>
        </form>
      </Modal>
    </>
  );
}
