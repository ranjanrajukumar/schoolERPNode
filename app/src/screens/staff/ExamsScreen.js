import { Pressable } from 'react-native';
import { api } from '../../api';
import { Banner, Card, Empty, Heading, Loading, Muted, Screen, Title, niceDate, useLoad } from '../../ui';

/** Pick an exam to enter marks for. */
export default function ExamsScreen({ navigation }) {
  const { data, error, loading, reload } = useLoad(() => api('/exams'), []);
  return (
    <Screen onRefresh={reload} refreshing={loading && data !== null}>
      <Title sub="Choose an exam to enter marks.">Marks</Title>
      <Banner text={error} />
      {loading && !data ? <Loading /> : data && (data.length ? data.map((e) => (
        <Pressable key={e.id} onPress={() => navigation.navigate('Marks', { examId: e.id, title: e.name })}>
          <Card>
            <Heading>{e.name}</Heading>
            <Muted>{e.className} {'·'} out of {e.maxMarks}{e.startDate ? ` · ${niceDate(e.startDate)}` : ''}</Muted>
          </Card>
        </Pressable>
      )) : <Empty>No exams yet. An administrator creates exams on the web.</Empty>)}
    </Screen>
  );
}
