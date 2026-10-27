import ResourcePage from '../../components/ResourcePage.jsx';

export default function MessageTemplates() {
  return (
    <ResourcePage title="Message templates" path="/messaging/templates"
      extra={<p className="hint">Reusable texts for the Send SMS / Send email pages. Placeholders filled per parent: {'{{guardian}} {{student}} {{class}} {{school}}'}.</p>}
      fields={[
        { key: 'name', label: 'Name', required: true },
        { key: 'channel', label: 'Channel', required: true, options: [{ value: 'sms', label: 'SMS' }, { value: 'email', label: 'Email' }] },
        { key: 'subject', label: 'Subject (email only)' },
        { key: 'body', label: 'Text', type: 'textarea', required: true },
      ]}
      columns={[
        { key: 'name', label: 'Name' },
        { key: 'channel', label: 'Channel' },
        { key: 'body', label: 'Text', render: (r) => <>{r.subject && <b>{r.subject}<br /></b>}{r.body}</> },
      ]} />
  );
}
