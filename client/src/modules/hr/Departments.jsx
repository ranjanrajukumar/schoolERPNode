import ResourcePage from '../../components/ResourcePage.jsx';

/** Departments. The head approves the leave of their department's staff when the leave type is set to "department head". */
export default function Departments() {
  return (
    <ResourcePage
      title="Departments"
      path="/hr/departments"
      fields={[
        { key: 'name', label: 'Department', required: true },
        { key: 'headStaffId', label: 'Department head', typeahead: 'staff' },
      ]}
      columns={[
        { key: 'name', label: 'Department' },
        { key: 'headName', label: 'Head', render: (r) => r.headName ?? '—' },
      ]}
    />
  );
}
