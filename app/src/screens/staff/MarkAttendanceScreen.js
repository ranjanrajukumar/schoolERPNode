import { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import { api } from '../../api';
import { useCan } from '../../rights';
import { Badge, Banner, Button, Card, Chips, Empty, Field, Heading, Loading, Muted, Row, Screen, Title, niceDate, shiftDay, todayKey, useLoad } from '../../ui';
import { useClasses } from './useClasses';

const TONE = { present: 'green', late: 'amber', absent: 'red' };
const NEXT = { null: 'present', present: 'absent', absent: 'late', late: 'present' };

/** Tap a student to cycle present, absent, late. Saving a past day asks for a reason, as on the web. */
export default function MarkAttendanceScreen() {
  const can = useCan('attendance');
  const { options, classId, setClassId, loading: loadingClasses } = useClasses();
  const [date, setDate] = useState(todayKey());
  const [marks, setMarks] = useState({});
  const [dirty, setDirty] = useState(false);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState({ text: '', kind: 'ok' });

  const { data, error, loading, reload } = useLoad(() => (classId ? api(`/attendance?date=${date}&classId=${classId}`) : Promise.resolve(null)), [classId, date]);

  useEffect(() => {
    if (!data) return;
    setMarks(Object.fromEntries(data.map((s) => [s.studentId, s.status])));
    setDirty(false);
  }, [data]);

  const isToday = date === todayKey();
  const cycle = (id) => { setMarks((m) => ({ ...m, [id]: NEXT[String(m[id] ?? null)] })); setDirty(true); setMessage({ text: '', kind: 'ok' }); };
  const allPresent = () => { setMarks(Object.fromEntries((data ?? []).map((s) => [s.studentId, 'present']))); setDirty(true); };

  const save = async () => {
    const records = Object.entries(marks).filter(([, status]) => status).map(([studentId, status]) => ({ studentId: Number(studentId), status }));
    if (!records.length) { setMessage({ text: 'Mark at least one student first.', kind: 'error' }); return; }
    setBusy(true); setMessage({ text: '', kind: 'ok' });
    try {
      await api('/attendance', { method: 'POST', body: { date, records, ...(reason.trim() && { reason: reason.trim() }) } });
      setMessage({ text: `Attendance saved for ${niceDate(date)}.`, kind: 'ok' });
      setDirty(false); setReason('');
      reload();
    } catch (err) {
      setMessage({ text: err.message, kind: 'error' });
    } finally {
      setBusy(false);
    }
  };

  const counts = (status) => Object.values(marks).filter((s) => s === status).length;
  const unmarked = (data ?? []).filter((s) => !marks[s.studentId]).length;

  return (
    <Screen onRefresh={reload} refreshing={loading && data !== null}>
      <Title sub={niceDate(date)}>Mark attendance</Title>
      {loadingClasses ? <Loading /> : !options.length ? <Empty>No classes to mark. Ask the administrator to assign your class.</Empty> : (
        <>
          <Chips options={options} value={classId} onChange={(id) => { setClassId(id); setMessage({ text: '', kind: 'ok' }); }} />
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
            <Button title={'‹ Day before'} kind="ghost" style={{ flex: 1 }} onPress={() => setDate(shiftDay(date, -1))} />
            <Button title={'Day after ›'} kind="ghost" style={{ flex: 1 }} disabled={isToday} onPress={() => setDate(shiftDay(date, 1))} />
          </View>
          <Banner text={error} />
          <Banner text={message.text} kind={message.kind} />
          {loading && !data ? <Loading /> : data && (
            <>
              <Card>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <Heading>{`${counts('present')} present · ${counts('absent')} absent · ${counts('late')} late`}</Heading>
                  <Pressable onPress={allPresent}><Badge text="All present" tone="blue" /></Pressable>
                </View>
                {data.map((s) => (
                  <Pressable key={s.studentId} onPress={() => cycle(s.studentId)}>
                    <Row
                      left={`${s.firstName} ${s.lastName}`}
                      sub={s.onApprovedLeave ? 'On approved leave' : s.admissionNo}
                      right={<Badge text={marks[s.studentId] ?? 'not marked'} tone={TONE[marks[s.studentId]] ?? 'grey'} />}
                    />
                  </Pressable>
                ))}
                {!data.length && <Empty>No active students in this class.</Empty>}
                <Muted style={{ marginTop: 8 }}>Tap a student to change present, absent or late.{unmarked ? ` ${unmarked} not marked yet.` : ''}</Muted>
              </Card>
              {!isToday && <Field label="Reason for changing a past day" value={reason} onChangeText={setReason} placeholder="Needed if a saved mark changes" />}
              {can('create') && <Button title={dirty ? 'Save attendance' : 'Saved'} onPress={save} busy={busy} disabled={!dirty} />}
            </>
          )}
        </>
      )}
    </Screen>
  );
}
