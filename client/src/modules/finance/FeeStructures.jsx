import ResourcePage from '../../components/ResourcePage.jsx';
import { classOption } from '../academics/ClassSubjects.jsx';

export default function FeeStructures() {
  return (
    <ResourcePage
      title="Fee structure"
      path="/fee-structures"
      writeRoles={['admin', 'accountant']}
      extra={
        <p className="hint">
          Items defined here are billed automatically when an applicant is enrolled, and in bulk from Fees
          &amp; payments.
        </p>
      }
      fields={[
        { key: 'classId', label: 'Class', required: true, optionsFrom: classOption },
        { key: 'title', label: 'Fee item', required: true },
        { key: 'amount', label: 'Amount', type: 'number', required: true },
        { key: 'dueDate', label: 'Due date', type: 'date' },
      ]}
      columns={[
        { key: 'className', label: 'Class' },
        { key: 'title', label: 'Fee item' },
        { key: 'amount', label: 'Amount' },
        { key: 'dueDate', label: 'Due' },
      ]}
    />
  );
}
