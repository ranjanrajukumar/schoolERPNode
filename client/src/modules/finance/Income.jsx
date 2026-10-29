import ResourcePage from '../../components/ResourcePage.jsx';

const METHODS = ['cash', 'card', 'upi', 'bank'].map((v) => ({ value: v, label: v }));

export default function Income() {
  return (
    <ResourcePage
      title="Other income"
      path="/accounts/income"
      writeRoles={['admin', 'accountant']}
      extra={
        <p className="hint">
          Money other than student fees (donations, rent, events). Fee payments are recorded under Fees &amp;
          payments.
        </p>
      }
      fields={[
        { key: 'source', label: 'Source', required: true },
        { key: 'description', label: 'Description' },
        { key: 'amount', label: 'Amount', type: 'number', required: true },
        { key: 'receivedOn', label: 'Date', type: 'date', required: true },
        { key: 'method', label: 'Method', options: METHODS },
        { key: 'reference', label: 'Reference' },
      ]}
      columns={[
        { key: 'receivedOn', label: 'Date' },
        { key: 'source', label: 'Source' },
        { key: 'description', label: 'Description' },
        { key: 'amount', label: 'Amount' },
        { key: 'method', label: 'Method' },
      ]}
    />
  );
}
