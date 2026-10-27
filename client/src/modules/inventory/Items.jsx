import ResourcePage from '../../components/ResourcePage.jsx';

export default function Items() {
  return (
    <ResourcePage title="Inventory items" path="/inventory/items"
      extra={<p className="hint">Stock levels change only through Stock In, Stock Out and received purchase orders, so every change has a record.</p>}
      fields={[
        { key: 'name', label: 'Item', required: true },
        { key: 'categoryId', label: 'Category', optionsFrom: { path: '/inventory/categories', map: (c) => ({ value: c.id, label: c.name }) } },
        { key: 'unit', label: 'Unit (pcs, box, kg…)' },
        { key: 'reorderLevel', label: 'Reorder at or below', type: 'number' },
      ]}
      columns={[
        { key: 'name', label: 'Item' },
        { key: 'categoryName', label: 'Category' },
        { key: 'quantity', label: 'In stock', render: (r) => `${r.quantity} ${r.unit}` },
        { key: 'reorderLevel', label: 'Reorder level' },
        { key: 'lowStock', label: 'Status', render: (r) => <span className={`badge ${r.lowStock ? 'overdue' : 'paid'}`}>{r.lowStock ? 'low stock' : 'ok'}</span> },
      ]} />
  );
}
