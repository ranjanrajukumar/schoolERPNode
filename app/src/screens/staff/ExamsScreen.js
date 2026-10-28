import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { api } from '../../api';
import { useAuth } from '../../auth';
import ActionModal from '../../components/ActionModal';
import { Banner, Button, Card, Empty, Heading, Loading, Muted, Screen, Title, niceDate, useLoad } from '../../ui';

/** Pick an exam to enter marks for. */
export default function ExamsScreen({ navigation }) {
  const { data, error, loading, reload } = useLoad(() => api('/exams'), []);
  const { user } = useAuth();
  const [active, setActive] = useState(null);
  const [notice, setNotice] = useState('');
  const isAdmin = user?.role === 'admin';
  const fields = (exam = null) => [
    { key: 'name', label: 'Exam name', required: true, default: exam?.name },
    { key: 'classId', label: 'Class', optionsPath: '/classes', required: true, default: exam?.classId },
    { key: 'startDate', label: 'Start date (YYYY-MM-DD)', default: exam?.startDate },
    { key: 'endDate', label: 'End date (YYYY-MM-DD)', default: exam?.endDate },
    { key: 'maxMarks', label: 'Maximum marks', keyboard: 'number-pad', required: true, default: exam?.maxMarks ?? 100 },
  ];
  const saveAction = (exam = null) => ({ label: exam ? 'Edit exam' : 'Create exam', path: exam ? `/exams/${exam.id}` : '/exams', method: exam ? 'PUT' : 'POST', fields: fields(exam), body: (v) => ({ ...v, classId: Number(v.classId), maxMarks: Number(v.maxMarks) }) });
  return (
    <Screen onRefresh={reload} refreshing={loading && data !== null}>
      <Title sub="Manage exams and enter marks.">Examinations</Title>
      <Banner text={error} />
      <Banner text={notice} kind="ok" />
      {isAdmin && <Button title="Create exam" onPress={() => setActive({ action: saveAction() })} style={{ marginBottom: 12 }} />}
      {loading && !data ? <Loading /> : data && (data.length ? data.map((e) => (
        <Card key={e.id}>
          <Pressable onPress={() => navigation.navigate('Marks', { examId: e.id, title: e.name })}>
            <Heading>{e.name}</Heading>
            <Muted>{e.className} {'·'} out of {e.maxMarks}{e.startDate ? ` · ${niceDate(e.startDate)}` : ''}</Muted>
          </Pressable>
          {isAdmin && <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
            <Button kind="ghost" title="Edit" style={{ flex: 1 }} onPress={() => setActive({ action: saveAction(e) })} />
            <Button kind="danger" title="Delete" style={{ flex: 1 }} onPress={() => setActive({ action: { label: 'Delete exam', confirm: `Delete ${e.name} and its marks?`, path: `/exams/${e.id}`, method: 'DELETE', fields: [] } })} />
          </View>}
        </Card>
      )) : <Empty>No exams yet. An administrator can create one here.</Empty>)}
      <ActionModal visible={Boolean(active)} action={active?.action} onClose={() => setActive(null)} onDone={() => { setNotice(active?.action?.method === 'DELETE' ? 'Exam deleted.' : 'Exam saved.'); setActive(null); reload(); }} />
    </Screen>
  );
}
