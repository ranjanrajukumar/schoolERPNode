import { Linking, Pressable } from 'react-native';
import { api } from '../../api';
import { Badge, Banner, Card, Chips, Empty, Heading, Loading, Muted, Row, Screen, Tile, TileRow, Title, niceDate, useLoad } from '../../ui';
import { useClasses } from './useClasses';

const TONE = { present: 'green', late: 'amber', absent: 'red' };

/** One class today: who is here, who is absent, and leave waiting for a decision. */
export default function MyClassScreen() {
  const { options, classId, setClassId, loading: loadingClasses } = useClasses();
  const { data, error, loading, reload } = useLoad(() => (classId ? api(`/my-class/${classId}`) : Promise.resolve(null)), [classId]);

  return (
    <Screen onRefresh={reload} refreshing={loading && data !== null}>
      <Title sub={data ? `${niceDate(data.date)}${data.room ? ` · Room ${data.room}` : ''}` : 'Your class today'}>{data ? `${data.name}-${data.section}` : 'My class'}</Title>
      {loadingClasses ? <Loading /> : !options.length ? (
        <Empty>You are not the class teacher of any class yet. Ask the administrator to set you as class teacher.</Empty>
      ) : (
        <>
          <Chips options={options} value={classId} onChange={setClassId} />
          <Banner text={error} />
          {loading && !data ? <Loading /> : data && (
            <>
              <TileRow>
                <Tile label="Students" value={data.totals.students} tone="blue" />
                <Tile label="Present" value={data.totals.present} tone="green" />
                <Tile label="Absent" value={data.totals.absent} tone="red" />
                <Tile label="Not marked" value={data.totals.notMarked} tone="amber" hint={data.totals.pendingLeaves ? `${data.totals.pendingLeaves} leave to decide` : undefined} />
              </TileRow>
              <Card>
                <Heading>Roll</Heading>
                {data.students.map((s) => (
                  <Row
                    key={s.id}
                    left={s.name}
                    sub={s.leave ?? (s.guardianPhone ? `${s.guardianName ?? 'Guardian'} · ${s.guardianPhone}` : undefined)}
                    right={(
                      <Pressable onPress={() => s.guardianPhone && Linking.openURL(`tel:${s.guardianPhone}`)} disabled={!s.guardianPhone}>
                        <Badge text={s.today ?? 'not marked'} tone={TONE[s.today] ?? 'grey'} />
                      </Pressable>
                    )}
                  />
                ))}
                {!data.students.length && <Empty>No active students in this class.</Empty>}
                <Muted style={{ marginTop: 8 }}>Tap a status to call the guardian.</Muted>
              </Card>
            </>
          )}
        </>
      )}
    </Screen>
  );
}
