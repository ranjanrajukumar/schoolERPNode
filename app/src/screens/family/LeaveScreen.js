import { useState } from 'react';
import { Alert } from 'react-native';
import { api } from '../../api';
import { Badge, Banner, Button, Card, Chips, Empty, Field, Heading, Muted, Row, niceDate, todayKey, useLoad } from '../../ui';
import { ChildScreen } from './ChildContext';
import { useCan } from '../../rights';

const TONE = { approved: 'green', pending: 'amber', rejected: 'red', cancelled: 'grey' };

function ApplyForm({ child, onSaved }) {
  const { data: types } = useLoad(() => api('/portal/leave-types'), []);
  const [typeId, setTypeId] = useState(null);
  const [from, setFrom] = useState(todayKey());
  const [to, setTo] = useState(todayKey());
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState('');
  const chosen = typeId ?? types?.[0]?.id ?? null;

  const submit = async () => {
    setError(''); setDone('');
    setBusy(true);
    try {
      await api(`/portal/children/${child.id}/leaves`, { method: 'POST', body: { leaveTypeId: chosen, fromDate: from, toDate: to, reason } });
      setReason('');
      setDone('Leave request sent. The class teacher will decide.');
      onSaved();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <Heading>Apply for leave</Heading>
      <Banner text={error} />
      <Banner text={done} kind="ok" />
      {types?.length ? <Chips options={types.map((t) => ({ value: t.id, label: t.name }))} value={chosen} onChange={setTypeId} /> : null}
      <Field label="From (YYYY-MM-DD)" value={from} onChangeText={setFrom} keyboardType="numbers-and-punctuation" maxLength={10} />
      <Field label="To (YYYY-MM-DD)" value={to} onChangeText={setTo} keyboardType="numbers-and-punctuation" maxLength={10} />
      <Field label="Reason" value={reason} onChangeText={setReason} multiline style={{ minHeight: 60 }} />
      <Button title="Send request" onPress={submit} busy={busy} disabled={!chosen} />
    </Card>
  );
}

export default function LeaveScreen() {
  const can = useCan('academic', 'leave');
  const [error, setError] = useState('');

  const cancel = (child, leave, reload) => {
    Alert.alert('Withdraw this request?', `${niceDate(leave.fromDate)} to ${niceDate(leave.toDate)}`, [
      { text: 'Keep it', style: 'cancel' },
      {
        text: 'Withdraw',
        style: 'destructive',
        onPress: async () => {
          try { await api(`/portal/children/${child.id}/leaves/${leave.id}/cancel`, { method: 'POST' }); setError(''); reload(); } catch (err) { setError(err.message); }
        },
      },
    ]);
  };

  return (
    <ChildScreen
      back
      title="Leave"
      sub="Ask for leave and follow the decision."
      path={(c) => `/portal/children/${c.id}/leaves`}
      render={(leaves, child, reload) => (
        <>
          {can('create') ? <ApplyForm child={child} onSaved={reload} /> : null}
          <Banner text={error} />
          <Card>
            <Heading>Requests</Heading>
            {leaves.length ? leaves.map((l) => (
              <Row
                key={l.id}
                left={`${niceDate(l.fromDate)} – ${niceDate(l.toDate)}`}
                sub={[l.leaveType, l.reason, l.remarks].filter(Boolean).join(' · ')}
                right={(
                  <>
                    <Badge text={l.status} tone={TONE[l.status] ?? 'grey'} />
                    {l.status === 'pending' ? <Button title="Withdraw" kind="ghost" style={{ marginLeft: 8, minHeight: 34, paddingVertical: 6 }} onPress={() => cancel(child, l, reload)} /> : null}
                  </>
                )}
              />
            )) : <Empty>No leave requests yet.</Empty>}
            <Muted style={{ marginTop: 8 }}>Leave cannot be requested for dates that are already over.</Muted>
          </Card>
        </>
      )}
    />
  );
}
