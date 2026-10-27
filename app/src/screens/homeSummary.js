import { useState } from 'react';
import { ScrollView, Text, useWindowDimensions, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../api';
import { color, TONES, space } from '../theme';
import { Chips, Muted, money, todayKey, useLoad } from '../ui';
import { useChild } from './family/ChildContext';
import { Panel } from './HomeGrid';

const Stat = ({ label, value, tone = 'blue' }) => (
  <View style={{ flex: 1, backgroundColor: TONES[tone].bg, borderRadius: 12, padding: space.sm, marginHorizontal: 3 }}>
    <Text style={{ fontSize: 10, fontWeight: '800', letterSpacing: 0.5, color: TONES[tone].fg, textTransform: 'uppercase' }}>{label}</Text>
    <Text style={{ fontSize: 20, fontWeight: '800', color: color.ink }}>{value ?? '—'}</Text>
  </View>
);

const niceToday = () => { const [y, m, d] = todayKey().split('-'); return `${d}/${m}/${y}`; };

/** The big card under "Frequently used": today's date and the few numbers that matter. */
function SummaryCard({ title, stats, children }) {
  return (
    <Panel style={{ paddingVertical: space.lg }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 6, marginBottom: space.md }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 26, fontWeight: '800', color: color.ink }}>{title}</Text>
          <Text style={{ fontSize: 22, color: color.muted, marginTop: 4 }}>{niceToday()}</Text>
          {children}
        </View>
        <Ionicons name="calendar-outline" size={64} color={color.header} />
      </View>
      <View style={{ flexDirection: 'row' }}>{stats}</View>
    </Panel>
  );
}

export function StaffSummary({ role }) {
  const { data } = useLoad(() => api('/dashboard'), []);
  if (!data) return <SummaryCard title="Today's Summary" stats={null} />;
  const a = data.attendanceToday ?? {};
  const stats = role === 'accountant'
    ? [<Stat key="d" label="Fees due" value={money(data.feesDue)} tone="amber" />, <Stat key="c" label="Collected" value={money(data.collectedThisMonth)} tone="green" />, <Stat key="o" label="Overdue" value={data.overdueFees} tone={data.overdueFees ? 'red' : 'green'} />]
    : [<Stat key="p" label="Present" value={a.present} tone="green" />, <Stat key="a" label="Absent" value={a.absent} tone="red" />, <Stat key="u" label="Unmarked" value={data.unmarkedClasses?.length} tone="amber" />];
  return <SummaryCard title="Today's Summary" stats={stats} />;
}

/** A circle that fills to a percentage. */
function Ring({ percent, size = 76 }) {
  const stroke = 8;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const filled = Math.max(0, Math.min(100, percent ?? 0));
  const tone = percent !== null && percent < 75 ? color.red : color.header;
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={{ transform: [{ rotate: '-90deg' }] }}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke="#dbe3f4" strokeWidth={stroke} fill="none" />
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={tone} strokeWidth={stroke} fill="none" strokeLinecap="round" strokeDasharray={`${(c * filled) / 100} ${c}`} />
      </Svg>
      <Text style={{ position: 'absolute', fontSize: 15, fontWeight: '800', color: color.ink }}>{percent === null ? '—' : `${percent}%`}</Text>
    </View>
  );
}

/**
 * The cards under "Frequently used" for the selected child, swipe sideways: attendance as a ring, then what is due in fees.
 */
export function FamilySummary() {
  const kids = useChild();
  const child = kids?.child;
  const { width } = useWindowDimensions();
  const cardWidth = width - space.md * 2;
  const [page, setPage] = useState(0);
  const { data } = useLoad(() => (child ? api(`/portal/children/${child.id}/overview`) : Promise.resolve(null)), [child?.id]);
  const a = data?.attendance;

  const card = (children) => (
    <View style={{ width: cardWidth }}>
      <Panel style={{ marginBottom: 0, minHeight: 138, justifyContent: 'center' }}>{children}</Panel>
    </View>
  );

  return (
    <View style={{ marginBottom: space.md }}>
      {kids?.list?.length > 1 ? <Chips options={kids.list.map((c) => ({ value: c.id, label: c.name.split(' ')[0] }))} value={child?.id} onChange={kids.setChildId} /> : null}
      <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false} onScroll={(e) => setPage(Math.round(e.nativeEvent.contentOffset.x / cardWidth))} scrollEventThrottle={32} style={{ width: cardWidth }} snapToInterval={cardWidth} decelerationRate="fast">
        {card(
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Ring percent={a ? a.percentage : null} />
            <View style={{ marginLeft: space.lg, flex: 1 }}>
              <Text style={{ fontSize: 22, fontWeight: '800', color: color.ink }}>Attendance</Text>
              <Muted>{child ? child.name : ''}</Muted>
              <Muted>{a ? `${a.present} present · ${a.absent} absent · ${a.late} late` : ' '}</Muted>
            </View>
          </View>,
        )}
        {card(
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 6 }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 22, fontWeight: '800', color: color.ink }}>Payment Due</Text>
              <Text style={{ fontSize: 26, fontWeight: '800', color: data?.fees.overdueItems ? color.red : color.header, marginTop: 4 }}>{data ? money(data.fees.outstanding) : '—'}</Text>
              <Muted>{data ? (data.fees.overdueItems ? `${data.fees.overdueItems} overdue` : 'Nothing overdue') : ' '}</Muted>
            </View>
            <Ionicons name="cash-outline" size={56} color={color.header} />
          </View>,
        )}
      </ScrollView>
      <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: 8 }}>
        {[0, 1].map((i) => <View key={i} style={{ width: i === page ? 22 : 8, height: 5, borderRadius: 3, marginHorizontal: 3, backgroundColor: i === page ? color.header : '#c5cde0' }} />)}
      </View>
    </View>
  );
}
