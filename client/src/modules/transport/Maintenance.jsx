import ResourcePage from '../../components/ResourcePage.jsx';

export default function Maintenance() {
  return (
    <ResourcePage title="Vehicle maintenance" path="/transport/maintenance"
      fields={[
        { key: 'vehicleId', label: 'Vehicle', required: true, optionsFrom: { path: '/transport/vehicles', map: (v) => ({ value: v.id, label: v.regNo }) } },
        { key: 'serviceDate', label: 'Serviced on', type: 'date', required: true },
        { key: 'description', label: 'Work done', required: true },
        { key: 'cost', label: 'Cost', type: 'number' },
        { key: 'nextDue', label: 'Next due', type: 'date' },
      ]}
      columns={[
        { key: 'serviceDate', label: 'Date' },
        { key: 'vehicleRegNo', label: 'Vehicle' },
        { key: 'description', label: 'Work done' },
        { key: 'cost', label: 'Cost' },
        { key: 'nextDue', label: 'Next due' },
      ]} />
  );
}
