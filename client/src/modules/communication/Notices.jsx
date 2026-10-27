import ResourcePage from '../../components/ResourcePage.jsx';

export default function Notices() {
  return (
    <ResourcePage title="Notices" path="/notices"
      fields={[
        { key: 'title', label: 'Title', required: true },
        { key: 'audience', label: 'Audience', options: ['all', 'teachers', 'parents', 'students'].map((v) => ({ value: v, label: v })) },
        { key: 'body', label: 'Message', type: 'textarea', required: true },
      ]}
      columns={[
        { key: 'title', label: 'Title' },
        { key: 'audience', label: 'Audience' },
        { key: 'body', label: 'Message' },
        { key: 'createdAt', label: 'Posted', render: (r) => String(r.createdAt ?? '').slice(0, 10) },
      ]} />
  );
}
