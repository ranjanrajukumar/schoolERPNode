import ResourcePage from '../../components/ResourcePage.jsx';

export default function Vehicles() {
  return (
    <ResourcePage
      title="Vehicles"
      path="/transport/vehicles"
      fields={[
        { key: 'regNo', label: 'Registration no', required: true },
        { key: 'model', label: 'Make / model' },
        { key: 'capacity', label: 'Seats', type: 'number', required: true },
        { key: 'insuranceExpiry', label: 'Insurance expires', type: 'date' },
        {
          key: 'status',
          label: 'Status',
          options: ['active', 'inactive'].map((v) => ({ value: v, label: v })),
        },
      ]}
      columns={[
        { key: 'regNo', label: 'Reg. no' },
        { key: 'model', label: 'Model' },
        { key: 'seats', label: 'Seats used', render: (r) => `${r.seatsTaken} / ${r.capacity}` },
        { key: 'insuranceExpiry', label: 'Insurance' },
        { key: 'status', label: 'Status' },
      ]}
    />
  );
}
