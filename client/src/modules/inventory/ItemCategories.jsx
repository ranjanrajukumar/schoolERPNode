import ResourcePage from '../../components/ResourcePage.jsx';

export default function ItemCategories() {
  return (
    <ResourcePage
      title="Item categories"
      path="/inventory/categories"
      fields={[{ key: 'name', label: 'Name', required: true }]}
      columns={[
        { key: 'name', label: 'Category' },
        { key: 'itemCount', label: 'Items' },
      ]}
    />
  );
}
