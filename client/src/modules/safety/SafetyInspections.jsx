import ResourcePage from '../../components/ResourcePage.jsx';

const RESULTS = [{ value: 'pass', label: 'Pass' }, { value: 'needs_action', label: 'Needs action' }, { value: 'fail', label: 'Fail' }];

export default function SafetyInspections() {
  return (
    <ResourcePage title="Safety inspections" path="/safety/inspections"
      fields={[
        { key: 'inspectionDate', label: 'Inspected on', type: 'date', required: true },
        { key: 'area', label: 'Area (e.g. Fire extinguishers, Lab 2)', required: true },
        { key: 'inspector', label: 'Inspector' },
        { key: 'result', label: 'Result', options: RESULTS },
        { key: 'notes', label: 'Notes', type: 'textarea' },
        { key: 'nextDue', label: 'Next due', type: 'date' },
      ]}
      columns={[
        { key: 'inspectionDate', label: 'Date' },
        { key: 'area', label: 'Area' },
        { key: 'inspector', label: 'Inspector' },
        { key: 'result', label: 'Result', render: (i) => <span className={`badge ${i.result === 'pass' ? 'paid' : i.result === 'fail' ? 'overdue' : 'partial'}`}>{RESULTS.find((r) => r.value === i.result)?.label}</span> },
        { key: 'notes', label: 'Notes' },
        { key: 'nextDue', label: 'Next due' },
      ]} />
  );
}
