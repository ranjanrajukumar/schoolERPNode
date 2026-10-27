import ResourcePage from '../../components/ResourcePage.jsx';

const vehicleOption = { path: '/transport/vehicles', map: (v) => ({ value: v.id, label: v.regNo }) };

export default function TransportStaff() {
  return (
    <ResourcePage title="Drivers & attendants" path="/transport/staff"
      fields={[
        { key: 'name', label: 'Name', required: true },
        { key: 'role', label: 'Role', required: true, options: ['driver', 'attendant'].map((v) => ({ value: v, label: v })) },
        { key: 'phone', label: 'Phone' },
        { key: 'licenseNo', label: 'Licence no' },
        { key: 'licenseExpiry', label: 'Licence expires', type: 'date' },
        { key: 'vehicleId', label: 'Vehicle', optionsFrom: vehicleOption },
      ]}
      columns={[
        { key: 'name', label: 'Name' },
        { key: 'role', label: 'Role' },
        { key: 'phone', label: 'Phone' },
        { key: 'licenseNo', label: 'Licence' },
        { key: 'licenseExpiry', label: 'Expires' },
        { key: 'vehicleRegNo', label: 'Vehicle' },
      ]} />
  );
}
