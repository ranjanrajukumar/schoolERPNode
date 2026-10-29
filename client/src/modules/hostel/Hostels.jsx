import ResourcePage from '../../components/ResourcePage.jsx';

export default function Hostels() {
  return (
    <ResourcePage
      title="Hostels"
      path="/hostel/hostels"
      fields={[
        { key: 'name', label: 'Name', required: true },
        {
          key: 'type',
          label: 'Type',
          required: true,
          options: ['boys', 'girls', 'mixed'].map((v) => ({ value: v, label: v })),
        },
        { key: 'wardenName', label: 'Warden' },
        { key: 'wardenPhone', label: 'Warden phone' },
        { key: 'address', label: 'Address / block' },
      ]}
      columns={[
        { key: 'name', label: 'Hostel' },
        { key: 'type', label: 'Type' },
        {
          key: 'warden',
          label: 'Warden',
          render: (r) => [r.wardenName, r.wardenPhone].filter(Boolean).join(' · ') || '—',
        },
        { key: 'roomCount', label: 'Rooms' },
        { key: 'beds', label: 'Beds used', render: (r) => `${r.occupied} / ${r.capacity}` },
      ]}
    />
  );
}
