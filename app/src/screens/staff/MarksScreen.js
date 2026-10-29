import { useEffect, useState } from 'react';
import { Text, TextInput, View } from 'react-native';
import { api } from '../../api';
import { useCan } from '../../rights';
import { color } from '../../theme';
import { Banner, Button, Card, Chips, Empty, Heading, Loading, Muted, Row, Screen, Title, useLoad } from '../../ui';

const keyOf = (studentId, subjectId) => `${studentId}:${subjectId}`;
// the server sends marks as decimals ("41.00"); show and compare them as plain numbers ("41")
const plain = (mark) => (mark === undefined || mark === null || mark === '' ? '' : String(Number(mark)));

/** Marks for one exam, one subject at a time, including theory and practical parts. */
export default function MarksScreen({ route }) {
  const can = useCan('exams');
  const { examId, title } = route.params;
  const { data, error, loading, reload } = useLoad(() => api(`/exams/${examId}/marks`), [examId]);
  const [subjectId, setSubjectId] = useState(null);
  const [values, setValues] = useState({});
  const [parts, setParts] = useState({});
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState({ text: '', kind: 'ok' });

  useEffect(() => {
    if (!data) return;
    const start = {};
    const splitStart = {};
    data.students.forEach((s) => {
      Object.entries(s.marks).forEach(([sub, mark]) => { start[keyOf(s.studentId, sub)] = plain(mark); });
      Object.entries(s.parts ?? {}).forEach(([sub, p]) => { splitStart[keyOf(s.studentId, sub)] = { theory: plain(p.theory), practical: plain(p.practical) }; });
    });
    setValues(start);
    setParts(splitStart);
    setSubjectId((id) => id ?? data.subjects.find((s) => s.editable)?.id ?? null);
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
      if (subject.split) {
        const part = parts[keyOf(s.studentId, subjectId)] ?? s.parts?.[subjectId];
        if (part) {
          for (const [name, value, limit] of [['theory', part.theory, subject.split.theory], ['practical', part.practical, subject.split.practical]]) {
            if (value !== '' && value !== undefined && (Number.isNaN(Number(value)) || Number(value) < 0 || Number(value) > limit)) { setMessage({ text: `${s.name}: ${name} marks must be between 0 and ${limit}.`, kind: 'error' }); return; }
          }
          records.push({ studentId: s.studentId, subjectId, theory: part.theory ?? '', practical: part.practical ?? '' });
        } else {
          if (now !== '' && (Number.isNaN(Number(now)) || Number(now) < 0 || Number(now) > max)) { setMessage({ text: `${s.name}: marks must be between 0 and ${max}.`, kind: 'error' }); return; }
          records.push({ studentId: s.studentId, subjectId, marks: now });
        }
      } else {
        if (now !== '' && (Number.isNaN(Number(now)) || Number(now) < 0 || Number(now) > max)) { setMessage({ text: `${s.name}: marks must be between 0 and ${max}.`, kind: 'error' }); return; }
        records.push({ studentId: s.studentId, subjectId, marks: now });
      }
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

  const changed = data && subject ? data.students.some((s) => {
    if (s.skips.includes(subjectId)) return false;
    if (!subject.split) return plain(values[keyOf(s.studentId, subjectId)]) !== original(s.studentId, subjectId);
    const current = parts[keyOf(s.studentId, subjectId)] ?? {};
    const initial = s.parts?.[subjectId] ?? {};
    return plain(current.theory) !== plain(initial.theory) || plain(current.practical) !== plain(initial.practical);
  }) : false;

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
          ) : (
            <Card>
              <Heading>{subject.name}</Heading>
              {subject.split ? <Muted>Enter each part separately: theory out of {subject.split.theory}, practical out of {subject.split.practical}. The server checks each part.</Muted> : null}
              {data.students.map((s) => {
                const skipped = s.skips.includes(subjectId);
                const part = parts[keyOf(s.studentId, subjectId)] ?? s.parts?.[subjectId] ?? {};
                return (
                  <Row
                    key={s.studentId}
                    left={s.name}
                    sub={skipped ? 'Does not take this subject' : s.admissionNo}
                    right={skipped ? <Muted>{'—'}</Muted> : subject.split ? (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                        {subject.split.theory > 0 ? <TextInput value={part.theory ?? ''} onChangeText={(t) => {
                          const theory = t.replace(/[^0-9.]/g, ''); const next = { ...part, theory };
                          setParts((p) => ({ ...p, [keyOf(s.studentId, subjectId)]: next }));
                          const filled = theory !== '' || (next.practical ?? '') !== '';
                          setValues((v) => ({ ...v, [keyOf(s.studentId, subjectId)]: filled ? String(Number(theory || 0) + Number(next.practical || 0)) : '' }));
                          setMessage({ text: '', kind: 'ok' });
                        }} keyboardType="decimal-pad" placeholder="Theory" style={markInput} /> : null}
                        {subject.split.practical > 0 ? <TextInput value={part.practical ?? ''} onChangeText={(t) => {
                          const practical = t.replace(/[^0-9.]/g, ''); const next = { ...part, practical };
                          setParts((p) => ({ ...p, [keyOf(s.studentId, subjectId)]: next }));
                          const filled = practical !== '' || (next.theory ?? '') !== '';
                          setValues((v) => ({ ...v, [keyOf(s.studentId, subjectId)]: filled ? String(Number(practical || 0) + Number(next.theory || 0)) : '' }));
                          setMessage({ text: '', kind: 'ok' });
                        }} keyboardType="decimal-pad" placeholder="Practical" style={markInput} /> : null}
                        <Text style={{ marginLeft: 3, color: color.muted }}>/ {max}</Text>
                      </View>
                    ) : (
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
          {subject?.editable && can('edit') ? <Button title={changed ? 'Save marks' : 'Saved'} onPress={save} busy={busy} disabled={!changed} /> : null}
        </>
      )}
    </Screen>
  );
}

const markInput = { width: 76, textAlign: 'center', borderWidth: 1, borderColor: color.line, borderRadius: 8, paddingVertical: 8, fontSize: 14, color: color.ink, backgroundColor: '#fff' };
