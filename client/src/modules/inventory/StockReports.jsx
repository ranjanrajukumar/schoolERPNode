import { useEffect, useState } from 'react';
import { api } from '../../services/api.js';

const csvCell = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;

function Tile({ icon, tone, label, value, hint }) {
  return (
    <div className="tile card">
      <span className={`tile-icon ${tone}`} aria-hidden="true">{icon}</span>
      <span className="tile-text"><span>{label}</span><b>{value}</b>{hint && <small>{hint}</small>}</span>
    </div>
  );
}

/** Stock at a glance: value, what needs reordering, open orders and this month's movement. */
export default function StockReports() {
  const [d, setD] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => { api('/inventory/summary').then(setD).catch((e) => setError(e.message)); }, []);
  if (error) return <p className="error">{error}</p>;
  if (!d) return <p>Loading…</p>;

  const exportCsv = () => {
    const head = ['Item', 'Category', 'In stock', 'Unit', 'Value'];
    const lines = d.items.map((i) => [i.name, i.categoryName, i.quantity, i.unit, i.value].map(csvCell).join(','));
    const url = URL.createObjectURL(new Blob([[head.map(csvCell).join(','), ...lines].join('\r\n')], { type: 'text/csv' }));
    const l = document.createElement('a'); l.href = url; l.download = 'stock.csv'; document.body.appendChild(l); l.click(); l.remove(); URL.revokeObjectURL(url);
  };

  return (
    <>
      <div className="profile-head">
        <div>
          <h1>Stock reports</h1>
          <p className="hint">Value, reorders and movement at a glance.</p>
        </div>
        <div className="head-actions"><button type="button" className="ghost" onClick={exportCsv}>↓ Export stock</button></div>
      </div>

      <div className="stats enquiry-tiles four">
        <Tile icon="▤" tone="blue" label="Items" value={d.itemCount} hint={`${d.openOrders} open order${d.openOrders === 1 ? '' : 's'}`} />
        <Tile icon="▣" tone="violet" label="Stock value" value={d.totalValue} hint="at latest purchase cost" />
        <Tile icon="!" tone="red" label="Low stock" value={d.lowStock.length} />
        <Tile icon="✓" tone="green" label="This month" value={`+${d.thisMonth.received} / −${d.thisMonth.issued}`} hint="received / issued" />
      </div>

      <section className="card enquiry-card">
        <header className="card-head" style={{ padding: '22px 22px 14px', marginBottom: 0 }}><span><h2>Needs reordering</h2><small>At or below the reorder level</small></span></header>
        <div className="table-scroll">
          <table className="enquiry-table">
            <thead><tr><th>Item</th><th>Category</th><th>In stock</th><th>Reorder level</th></tr></thead>
            <tbody>
              {d.lowStock.map((i) => <tr key={i.id}><td><b>{i.name}</b></td><td>{i.categoryName}</td><td><span className="badge rejected">● {i.quantity} {i.unit}</span></td><td>{i.reorderLevel}</td></tr>)}
              {!d.lowStock.length && <tr><td colSpan={4} className="empty-row">Everything is above its reorder level.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>

      <section className="card enquiry-card">
        <header className="card-head" style={{ padding: '22px 22px 14px', marginBottom: 0 }}><span><h2>All stock</h2><small>Quantity and value of every item</small></span></header>
        <div className="table-scroll">
          <table className="enquiry-table">
            <thead><tr><th>Item</th><th>Category</th><th>In stock</th><th>Value</th></tr></thead>
            <tbody>
              {d.items.map((i) => <tr key={i.id}><td><b>{i.name}</b></td><td>{i.categoryName}</td><td>{i.quantity} {i.unit}</td><td>{i.value}</td></tr>)}
              {!d.items.length && <tr><td colSpan={4} className="empty-row">No items yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
