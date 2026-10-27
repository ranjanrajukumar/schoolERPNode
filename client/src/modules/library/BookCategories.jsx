import ResourcePage from '../../components/ResourcePage.jsx';

export default function BookCategories() {
  return (
    <ResourcePage title="Book categories" path="/library/categories" writeRoles={['admin', 'teacher']}
      fields={[{ key: 'name', label: 'Name', required: true }]}
      columns={[{ key: 'name', label: 'Category' }, { key: 'bookCount', label: 'Titles' }]} />
  );
}
