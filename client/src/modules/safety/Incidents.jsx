import ResourcePage from '../../components/ResourcePage.jsx';

export default function Incidents() {
  return (
    <ResourcePage title="Incidents" path="/safety/incidents"
      fields={[
        { key: 'incidentDate', label: 'Date', type: 'date', required: true },
        { key: 'studentId', label: 'Student (if any)', typeahead: 'students' },
        { key: 'location', label: 'Location' },
        { key: 'severity', label: 'Severity', options: ['minor', 'moderate', 'serious'].map((v) => ({ value: v, label: v })) },
        { key: 'description', label: 'What happened', type: 'textarea', required: true },
        { key: 'actionTaken', label: 'Action taken', type: 'textarea' },
        { key: 'status', label: 'Status', options: ['open', 'resolved'].map((v) => ({ value: v, label: v })) },
      ]}
      columns={[
        { key: 'incidentDate', label: 'Date' },
        { key: 'studentName', label: 'Student' },
        { key: 'location', label: 'Location' },
        { key: 'severity', label: 'Severity', render: (i) => <span className={`badge ${i.severity === 'serious' ? 'overdue' : i.severity === 'moderate' ? 'partial' : ''}`}>{i.severity}</span> },
        { key: 'description', label: 'What happened' },
        { key: 'status', label: 'Status', render: (i) => <span className={`badge ${i.status === 'resolved' ? 'paid' : 'partial'}`}>{i.status}</span> },
      ]} />
  );
}
