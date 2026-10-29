import ResourcePage from '../../components/ResourcePage.jsx';

export default function Suppliers() {
  return (
    <ResourcePage
      title="Suppliers"
      path="/inventory/suppliers"
      fields={[
        { key: 'name', label: 'Name', required: true },
        { key: 'contactPerson', label: 'Contact person' },
        { key: 'phone', label: 'Phone' },
        { key: 'email', label: 'Email', type: 'email' },
        { key: 'address', label: 'Address' },
      ]}
      columns={[
        { key: 'name', label: 'Supplier' },
        {
          key: 'contact',
          label: 'Contact',
          render: (r) => [r.contactPerson, r.phone, r.email].filter(Boolean).join(' · ') || '—',
        },
        { key: 'address', label: 'Address' },
      ]}
    />
  );
}
