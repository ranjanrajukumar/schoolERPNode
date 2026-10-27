import ResourcePage from '../../components/ResourcePage.jsx';

export default function AssetMaintenance() {
  return (
    <ResourcePage title="Asset maintenance" path="/inventory/asset-maintenance"
      fields={[
        { key: 'assetId', label: 'Asset', required: true, optionsFrom: { path: '/inventory/assets', map: (a) => ({ value: a.id, label: `${a.assetTag} · ${a.name}` }) } },
        { key: 'serviceDate', label: 'Serviced on', type: 'date', required: true },
        { key: 'description', label: 'Work done', required: true },
        { key: 'cost', label: 'Cost', type: 'number' },
        { key: 'nextDue', label: 'Next due', type: 'date' },
      ]}
      columns={[
        { key: 'serviceDate', label: 'Date' },
        { key: 'assetTag', label: 'Tag' },
        { key: 'assetName', label: 'Asset' },
        { key: 'description', label: 'Work done' },
        { key: 'cost', label: 'Cost' },
        { key: 'nextDue', label: 'Next due' },
      ]} />
  );
}
