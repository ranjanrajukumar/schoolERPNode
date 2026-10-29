import ResourcePage from '../../components/ResourcePage.jsx';

export default function Designations() {
  return (
    <ResourcePage
      title="Designations"
      path="/hr/designations"
      extra={
        <p className="hint">
          Titles such as Principal, Teacher, Accountant. They appear as choices on the staff form.
        </p>
      }
      fields={[{ key: 'name', label: 'Designation', required: true }]}
      columns={[{ key: 'name', label: 'Designation' }]}
    />
  );
}
