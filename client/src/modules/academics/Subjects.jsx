import ResourcePage from '../../components/ResourcePage.jsx';

export default function Subjects() {
  return (
    <ResourcePage
      title="Subjects"
      path="/subjects"
      fields={[
        { key: 'name', label: 'Subject', required: true },
        { key: 'code', label: 'Code', required: true },
      ]}
      columns={[
        { key: 'name', label: 'Subject' },
        { key: 'code', label: 'Code' },
      ]}
    />
  );
}
