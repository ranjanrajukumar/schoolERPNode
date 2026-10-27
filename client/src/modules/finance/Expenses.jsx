import ResourcePage from '../../components/ResourcePage.jsx';

const METHODS = ['cash', 'card', 'upi', 'bank'].map((v) => ({ value: v, label: v }));

export default function Expenses() {
  return (
    <ResourcePage title="Expenses" path="/accounts/expenses" writeRoles={['admin', 'accountant']}
      fields={[
        { key: 'category', label: 'Category', required: true },
        { key: 'description', label: 'Description' },
        { key: 'amount', label: 'Amount', type: 'number', required: true },
        { key: 'spentOn', label: 'Date', type: 'date', required: true },
        { key: 'method', label: 'Method', options: METHODS },
        { key: 'reference', label: 'Bill / reference no' },
      ]}
      columns={[
        { key: 'spentOn', label: 'Date' },
        { key: 'category', label: 'Category' },
        { key: 'description', label: 'Description' },
        { key: 'amount', label: 'Amount' },
        { key: 'method', label: 'Method' },
        { key: 'reference', label: 'Reference' },
      ]} />
  );
}
