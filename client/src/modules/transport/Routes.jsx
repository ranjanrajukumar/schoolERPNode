import ResourcePage from '../../components/ResourcePage.jsx';

export default function TransportRoutes() {
  return (
    <ResourcePage title="Routes" path="/transport/routes"
      fields={[
        { key: 'name', label: 'Route name', required: true },
        { key: 'vehicleId', label: 'Vehicle', optionsFrom: { path: '/transport/vehicles', map: (v) => ({ value: v.id, label: `${v.regNo} (${v.capacity} seats)` }) } },
        { key: 'monthlyFee', label: 'Monthly fee', type: 'number', required: true },
      ]}
      columns={[
        { key: 'name', label: 'Route' },
        { key: 'vehicleRegNo', label: 'Vehicle' },
        { key: 'monthlyFee', label: 'Monthly fee' },
        { key: 'stopCount', label: 'Stops' },
        { key: 'studentCount', label: 'Students' },
      ]} />
  );
}
