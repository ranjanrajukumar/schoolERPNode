import { useEffect, useState } from 'react';
import { Text, TextInput, View } from 'react-native';
import { api } from '../../api';
import { color } from '../../theme';
import { Banner, Button, Card, Chips, Empty, Heading, Loading, Muted, Row, Screen, Title, useLoad } from '../../ui';

const keyOf = (studentId, subjectId) => `${studentId}:${subjectId}`;
// the server sends marks as decimals ("41.00"); show and compare them as plain numbers ("41")
const plain = (mark) => (mark === undefined || mark === null || mark === '' ? '' : String(Number(mark)));

/** Marks for one exam, one subject at a time. Subjects marked as theory plus practical are entered on the web. */
export default function MarksScreen({ route }) {
  const { examId, title } = route.params;
  const { data, error, loading, reload } = useLoad(() => api(`/exams/${examId}/marks`), [examId]);
  const [subjectId, setSubjectId] = useState(null);
  const [values, setValues] = useState({});
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState({ text: '', kind: 'ok' });

  useEffect(() => {
    if (!data) return;
    const start = {};
    data.students.forEach((s) => Object.entries(s.marks).forEach(([sub, mark]) => { start[keyOf(s.studentId, sub)] = plain(mark); }));
    setValues(start);
    setSubjectId((id) => id ?? data.subjects.find((s) => s.editable && !s.split)?.id ?? null);
  }, [data]);

  const subject = data?.subjects.find((s) => s.id === subjectId) ?? null;
  const max = data?.exam.maxMarks;

  const original = (studentId, sub) => {
    return plain(data.students.find((s) => s.studentId === studentId)?.marks[sub]);
  };

  const save = async () => {
    const records = [];
    for (const s of data.students) {
      if (s.skips.includes(subjectId)) continue;
      const now = String(values[keyOf(s.studentId, subjectId)] ?? '').trim();
      if (plain(now) === original(s.studentId, subjectId)) continue;
      if (now !== '' && (Number.isNaN(Number(now)) || Number(now) < 0 || Number(now) > max)) { setMessage({ text: `${s.name}: marks must be between 0 and ${max}.`, kind: 'error' }); return; }
      records.push({ studentId: s.studentId, subjectId, marks: now });
    }
    if (!records.length) { setMessage({ text: 'Nothing has changed.', kind: 'ok' }); return; }
    setBusy(true); setMessage({ text: '', kind: 'ok' });
    try {
      await api(`/exams/${examId}/marks`, { method: 'POST', body: { records } });
      setMessage({ text: `Marks saved for ${records.length} student${records.length > 1 ? 's' : ''}.`, kind: 'ok' });
      reload();
    } catch (err) {
      setMessage({ text: err.message, kind: 'error' });
    } finally {
      setBusy(false);
    }
  };

  const changed = data && subject ? data.students.some((s) => !s.skips.includes(subjectId) && plain(values[keyOf(s.studentId, subjectId)]) !== original(s.studentId, subjectId)) : false;

  return (
    <Screen onRefresh={reload} refreshing={loading && data !== null} back>
      <Title sub={data ? `${data.exam.name} · out of ${max}` : undefined}>{title ?? 'Marks'}</Title>
      <Banner text={error} />
      <Banner text={message.text} kind={message.kind} />
      {loading && !data ? <Loading /> : data && (
        <>
          <Chips options={data.subjects.map((s) => ({ value: s.id, label: s.name }))} value={subjectId} onChange={(id) => { setSubjectId(id); setMessage({ text: '', kind: 'ok' }); }} />
          {!subject ? <Empty>You have no subjects to enter marks for in this class.</Empty> : !subject.editable ? (
            <Empty>This subject is not assigned to you. Only its own teacher or an administrator can enter its marks.</Empty>
          ) : subject.split ? (
            <Empty>{subject.name} is marked as theory plus practical. Please enter it on the web.</Empty>
          ) : (
            <Card>
              <Heading>{subject.name}</Heading>
              {data.students.map((s) => {
                const skipped = s.skips.includes(subjectId);
                return (
                  <Row
                    key={s.studentId}
                    left={s.name}
                    sub={skipped ? 'Does not take this subject' : s.admissionNo}
                    right={skipped ? <Muted>{'—'}</Muted> : (
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <TextInput
                          value={values[keyOf(s.studentId, subjectId)] ?? ''}
                          onChangeText={(t) => { setValues((v) => ({ ...v, [keyOf(s.studentId, subjectId)]: t.replace(/[^0-9.]/g, '') })); setMessage({ text: '', kind: 'ok' }); }}
                          keyboardType="decimal-pad"
                          maxLength={6}
                          placeholder="—"
                          style={{ width: 64, textAlign: 'center', borderWidth: 1, borderColor: color.line, borderRadius: 8, paddingVertical: 8, fontSize: 16, color: color.ink, backgroundColor: '#fff' }}
                        />
                        <Text style={{ marginLeft: 6, color: color.muted }}>/ {max}</Text>
                      </View>
                    )}
                  />
                );
              })}
              {!data.students.length && <Empty>No students in this class.</Empty>}
            </Card>
          )}
          {subject?.editable && !subject.split ? <Button title={changed ? 'Save marks' : 'Saved'} onPress={save} busy={busy} disabled={!changed} /> : null}
        </>
      )}
    </Screen>
  );
}
