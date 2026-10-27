import ResourcePage from '../../components/ResourcePage.jsx';

export default function FeeTypes() {
  return (
    <ResourcePage title="Fee types" path="/accounts/fee-types" writeRoles={['admin', 'accountant']}
      extra={<p className="hint">The standard names used for fee items (Tuition, Transport, Exam...). Use the same name in the fee structure so reports group correctly.</p>}
      fields={[{ key: 'name', label: 'Name', required: true }, { key: 'description', label: 'Description' }]}
      columns={[{ key: 'name', label: 'Name' }, { key: 'description', label: 'Description' }]} />
  );
}
