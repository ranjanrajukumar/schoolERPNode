import ResourcePage from '../../components/ResourcePage.jsx';
import { api } from '../../services/api.js';

export default function AcademicYears() {
  return (
    <ResourcePage title="Academic years" path="/academic-years"
      fields={[
        { key: 'name', label: 'Name (e.g. 2026-27)', required: true },
        { key: 'startDate', label: 'Starts', type: 'date', required: true },
        { key: 'endDate', label: 'Ends', type: 'date', required: true },
      ]}
      columns={[
        { key: 'name', label: 'Year' },
        { key: 'startDate', label: 'Starts' },
        { key: 'endDate', label: 'Ends' },
        { key: 'isCurrent', label: 'Current', render: (r) => (r.isCurrent ? 'Yes' : '') },
      ]}
      rowActions={(r, reload) => !r.isCurrent && (
        <button onClick={async () => { await api(`/academic-years/${r.id}/set-current`, { method: 'POST' }); reload(); }}>
          Make current
        </button>
      )} />
  );
}
