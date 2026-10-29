import { useEffect, useState } from 'react';
import ResourcePage from '../../components/ResourcePage.jsx';
import { api } from '../../services/api.js';

const STATUS = [
  { value: 'in_use', label: 'In use' },
  { value: 'in_store', label: 'In store' },
  { value: 'under_repair', label: 'Under repair' },
  { value: 'disposed', label: 'Disposed' },
];
const label = (v) => STATUS.find((s) => s.value === v)?.label ?? v;

export default function Assets() {
  const [d, setD] = useState(null);
  useEffect(() => {
    api('/inventory/assets/summary')
      .then(setD)
      .catch(() => setD(null));
  }, []);

  return (
    <ResourcePage
      title="Asset register"
      path="/inventory/assets"
      extra={
        d && (
          <div className="stats">
            <div className="card">
              <span>Assets</span>
              <b>{d.total}</b>
              <small>
                {d.inUse} in use · {d.inStore} in store
              </small>
            </div>
            <div className="card">
              <span>Under repair</span>
              <b>{d.underRepair}</b>
            </div>
            <div className="card">
              <span>Book value</span>
              <b>{d.value}</b>
              <small>at purchase cost, excl. disposed</small>
            </div>
            <div className="card">
              <span>Service due</span>
              <b style={{ color: d.maintenanceDue.length ? '#dc2626' : undefined }}>
                {d.maintenanceDue.length}
              </b>
              <small>
                {d.maintenanceDue
                  .slice(0, 3)
                  .map((m) => `${m.assetTag} (${m.nextDue})`)
                  .join(', ') || 'none in 30 days'}
              </small>
            </div>
          </div>
        )
      }
      fields={[
        { key: 'assetTag', label: 'Asset tag', required: true },
        { key: 'name', label: 'Name', required: true },
        {
          key: 'categoryId',
          label: 'Category',
          optionsFrom: { path: '/inventory/categories', map: (c) => ({ value: c.id, label: c.name }) },
        },
        { key: 'location', label: 'Location' },
        { key: 'purchaseDate', label: 'Purchased on', type: 'date' },
        { key: 'cost', label: 'Cost', type: 'number' },
        { key: 'status', label: 'Status', options: STATUS },
        { key: 'notes', label: 'Notes' },
      ]}
      columns={[
        { key: 'assetTag', label: 'Tag' },
        { key: 'name', label: 'Asset' },
        { key: 'categoryName', label: 'Category' },
        { key: 'location', label: 'Location' },
        { key: 'cost', label: 'Cost' },
        { key: 'status', label: 'Status', render: (a) => label(a.status) },
      ]}
    />
  );
}
