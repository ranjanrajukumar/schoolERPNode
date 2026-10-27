import { Card, Empty, Heading, Row } from '../../ui';
import { ChildScreen } from './ChildContext';

const DAYS = ['', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export default function TimetableScreen({ back = false }) {
  return (
    <ChildScreen
      back={back}
      title="Timetable"
      sub={(c) => c?.className ?? ''}
      path={(c) => `/portal/children/${c.id}/timetable`}
      render={(slots) => {
        const days = [...new Set(slots.map((s) => s.day))].sort((a, b) => a - b);
        if (!days.length) return <Empty>The timetable has not been set up yet.</Empty>;
        return days.map((d) => (
          <Card key={d}>
            <Heading>{DAYS[d] ?? `Day ${d}`}</Heading>
            {slots.filter((s) => s.day === d).map((s) => <Row key={s.id} left={`Period ${s.period}: ${s.subjectName}`} sub={s.teacherName ?? undefined} />)}
          </Card>
        ));
      }}
    />
  );
}
