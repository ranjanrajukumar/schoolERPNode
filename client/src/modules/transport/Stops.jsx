import ResourcePage from '../../components/ResourcePage.jsx';

export default function Stops() {
  return (
    <ResourcePage
      title="Stops"
      path="/transport/stops"
      extra={
        <p className="hint">
          Number stops in the order the bus reaches them. Pickup time is 24-hour, e.g. 07:30.
        </p>
      }
      fields={[
        {
          key: 'routeId',
          label: 'Route',
          required: true,
          optionsFrom: { path: '/transport/routes', map: (r) => ({ value: r.id, label: r.name }) },
        },
        { key: 'name', label: 'Stop name', required: true },
        { key: 'sequence', label: 'Order', type: 'number' },
        { key: 'pickupTime', label: 'Pickup time (HH:MM)' },
      ]}
      columns={[
        { key: 'routeName', label: 'Route' },
        { key: 'sequence', label: 'Order' },
        { key: 'name', label: 'Stop' },
        { key: 'pickupTime', label: 'Pickup' },
      ]}
    />
  );
}
