import { api } from '../../api';
import { Banner, Card, Empty, Heading, Loading, Muted, Screen, Title, niceDate, useLoad } from '../../ui';
import { Text } from 'react-native';
import { color } from '../../theme';

export default function NoticesScreen() {
  const { data, error, loading, reload } = useLoad(() => api('/portal/notices'), []);
  return (
    <Screen onRefresh={reload} refreshing={loading && data !== null} back>
      <Title sub="Announcements from the school.">Notices</Title>
      <Banner text={error} />
      {loading && !data ? <Loading /> : data && (data.length ? data.map((n) => (
        <Card key={n.id}>
          <Heading>{n.title}</Heading>
          <Muted>{niceDate(n.createdAt)}</Muted>
          <Text style={{ marginTop: 8, color: color.ink, lineHeight: 20 }}>{n.body}</Text>
        </Card>
      )) : <Empty>No notices right now.</Empty>)}
    </Screen>
  );
}
