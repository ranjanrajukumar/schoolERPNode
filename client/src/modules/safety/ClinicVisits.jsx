import ResourcePage from '../../components/ResourcePage.jsx';

const OUTCOMES = [
  { value: 'returned_to_class', label: 'Returned to class' },
  { value: 'rested', label: 'Rested in clinic' },
  { value: 'sent_home', label: 'Sent home' },
  { value: 'referred', label: 'Referred to doctor' },
];

export default function ClinicVisits() {
  return (
    <ResourcePage
      title="Clinic visits"
      path="/safety/visits"
      fields={[
        { key: 'studentId', label: 'Student', required: true, typeahead: 'students' },
        { key: 'visitDate', label: 'Date', type: 'date', required: true },
        { key: 'complaint', label: 'Complaint', required: true },
        { key: 'treatment', label: 'Treatment given' },
        { key: 'medication', label: 'Medication given' },
        { key: 'outcome', label: 'Outcome', options: OUTCOMES },
        {
          key: 'parentInformed',
          label: 'Parent informed',
          options: [
            { value: 'true', label: 'Yes' },
            { value: 'false', label: 'No' },
          ],
        },
      ]}
      columns={[
        { key: 'visitDate', label: 'Date' },
        { key: 'studentName', label: 'Student' },
        { key: 'complaint', label: 'Complaint' },
        { key: 'treatment', label: 'Treatment' },
        {
          key: 'outcome',
          label: 'Outcome',
          render: (v) => OUTCOMES.find((o) => o.value === v.outcome)?.label,
        },
        { key: 'parentInformed', label: 'Parent told', render: (v) => (v.parentInformed ? 'Yes' : 'No') },
      ]}
    />
  );
}
