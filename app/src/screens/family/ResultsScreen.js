import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { api } from '../../api';
import { Badge, Card, Empty, Heading, Loading, Muted, Row, useLoad } from '../../ui';
import { ChildScreen } from './ChildContext';

const TONE = { pass: 'green', fail: 'red', incomplete: 'amber' };
const LABEL = { pass: 'Pass', fail: 'Fail', incomplete: 'Incomplete' };

/** Subject-by-subject marks for one exam, loaded when the result is opened. */
function ReportCard({ childId, examId }) {
  const { data, error, loading } = useLoad(() => api(`/portal/children/${childId}/report-card/${examId}`), [childId, examId]);
  if (loading && !data) return <Loading />;
  if (error) return <Muted>{error}</Muted>;
  return (
    <View style={{ marginTop: 8 }}>
      {data.subjects.map((s) => (
        <Row key={s.subjectId ?? s.subject} left={s.subject} sub={s.elective ? 'Elective' : undefined} right={<Muted>{s.marks ?? '—'} / {s.maxMarks}{s.grade ? `  ${s.grade}` : ''}</Muted>} />
      ))}
      {data.attendance ? <Muted style={{ marginTop: 8 }}>Attendance this term: {data.attendance.percentage ?? '—'}%</Muted> : null}
    </View>
  );
}

export default function ResultsScreen({ back = false }) {
  const [open, setOpen] = useState(null);
  return (
    <ChildScreen
      back={back}
      title="Results"
      sub="Tap an exam to see every subject."
      path={(c) => `/portal/children/${c.id}/results`}
      render={(rows, child) => (rows.length ? rows.map((r) => (
        <Card key={r.examId}>
          <Pressable onPress={() => setOpen(open === r.examId ? null : r.examId)}>
            <Heading>{r.name}</Heading>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Muted>{r.total}{r.outOf ? ` / ${r.outOf}` : ''} {'·'} {r.percentage}% {'·'} Grade {r.grade}{r.rank ? ` · Rank ${r.rank}` : ''}</Muted>
              <Badge text={LABEL[r.result] ?? r.result} tone={TONE[r.result] ?? 'grey'} />
            </View>
          </Pressable>
          {open === r.examId ? <ReportCard childId={child.id} examId={r.examId} /> : null}
        </Card>
      )) : <Empty>No results have been published yet.</Empty>)}
    />
  );
}
