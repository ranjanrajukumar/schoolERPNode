import { useState } from 'react';
import { View } from 'react-native';
import { Badge, Button, Card, Empty, Row, Tile, TileRow, niceDate, todayKey } from '../../ui';
import { ChildScreen } from './ChildContext';

const TONE = { present: 'green', late: 'amber', absent: 'red' };

/** The first and last day of a month, from a YYYY-MM key. */
const monthRange = (ym) => {
  const [y, m] = ym.split('-').map(Number);
  const last = new Date(y, m, 0).getDate();
  return { from: `${ym}-01`, to: `${ym}-${String(last).padStart(2, '0')}` };
};
const shiftMonth = (ym, by) => {
  const [y, m] = ym.split('-').map(Number);
  const d = new Date(y, m - 1 + by, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};
const monthName = (ym) => new Date(`${ym}-01T12:00:00`).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });

export default function AttendanceScreen({ back = false }) {
  const [month, setMonth] = useState(todayKey().slice(0, 7));
  const { from, to } = monthRange(month);
  const isCurrent = month === todayKey().slice(0, 7);

  return (
    <ChildScreen
      back={back}
      title="Attendance"
      sub={monthName(month)}
      path={(c) => `/portal/children/${c.id}/attendance?from=${from}&to=${to}`}
      deps={[month]}
      header={(
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
          <Button title={'‹ Earlier'} kind="ghost" style={{ flex: 1 }} onPress={() => setMonth(shiftMonth(month, -1))} />
          <Button title={'Later ›'} kind="ghost" style={{ flex: 1 }} disabled={isCurrent} onPress={() => setMonth(shiftMonth(month, 1))} />
        </View>
      )}
      render={(rows) => {
        const count = (s) => rows.filter((r) => r.status === s).length;
        return (
          <>
            <TileRow>
              <Tile label="Present" value={count('present')} tone="green" />
              <Tile label="Late" value={count('late')} tone="amber" />
              <Tile label="Absent" value={count('absent')} tone="red" />
            </TileRow>
            <Card>
              {rows.length ? rows.map((r) => <Row key={String(r.date)} left={niceDate(r.date)} right={<Badge text={r.status} tone={TONE[r.status]} />} />) : <Empty>No attendance recorded this month.</Empty>}
            </Card>
          </>
        );
      }}
    />
  );
}
