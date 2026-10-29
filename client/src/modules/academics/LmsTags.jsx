import ResourcePage from '../../components/ResourcePage.jsx';

// The master list of course tags. Teachers pick from it when they tag a course.
export default function LmsTags() {
  return (
    <ResourcePage
      title="LMS Tags"
      path="/lms-tags"
      fields={[{ key: 'name', label: 'Tag', required: true }]}
      columns={[{ key: 'name', label: 'Tag' }]}
    />
  );
}
