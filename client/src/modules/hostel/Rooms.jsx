import ResourcePage from '../../components/ResourcePage.jsx';

export default function Rooms() {
  return (
    <ResourcePage title="Hostel rooms" path="/hostel/rooms"
      fields={[
        { key: 'hostelId', label: 'Hostel', required: true, optionsFrom: { path: '/hostel/hostels', map: (h) => ({ value: h.id, label: h.name }) } },
        { key: 'roomNo', label: 'Room no', required: true },
        { key: 'capacity', label: 'Beds', type: 'number', required: true },
        { key: 'monthlyFee', label: 'Monthly fee', type: 'number' },
      ]}
      columns={[
        { key: 'hostelName', label: 'Hostel' },
        { key: 'roomNo', label: 'Room' },
        { key: 'beds', label: 'Beds used', render: (r) => `${r.occupied} / ${r.capacity}` },
        { key: 'monthlyFee', label: 'Monthly fee' },
      ]} />
  );
}
