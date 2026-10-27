import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { TONES, color, radius, space } from './theme';

const pad = (n) => String(n).padStart(2, '0');
const keyOf = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/** Today as YYYY-MM-DD in the phone's own time zone. */
export const todayKey = () => keyOf(new Date());
export const shiftDay = (key, days) => { const d = new Date(`${key}T12:00:00`); d.setDate(d.getDate() + days); return keyOf(d); };
export const niceDate = (key) => (key ? new Date(`${String(key).slice(0, 10)}T12:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '');
export const money = (v) => `₹${Number(v ?? 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

/** Loads data and keeps its state: { data, error, loading, reload }. */
export function useLoad(fn, deps) {
  const [state, setState] = useState({ data: null, error: '', loading: true });
  const run = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: '' }));
    try { setState({ data: await fn(), error: '', loading: false }); } catch (err) { setState((s) => ({ data: s.data, error: err.message, loading: false })); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  useEffect(() => { run(); }, [run]);
  return { ...state, reload: run };
}

export function Screen({ children, onRefresh, refreshing = false, padded = true, back = false }) {
  const navigation = useNavigation();
  return (
    <SafeAreaView style={styles.screen} edges={['top', 'left', 'right']}>
      {back ? (
        <Pressable onPress={() => navigation.goBack()} hitSlop={10} style={{ paddingHorizontal: space.lg, paddingTop: space.md }}>
          <Text style={{ color: color.primary, fontWeight: '700', fontSize: 16 }}>{'‹ Back'}</Text>
        </Pressable>
      ) : null}
      <ScrollView
        contentContainerStyle={padded ? styles.content : undefined}
        keyboardShouldPersistTaps="handled"
        refreshControl={onRefresh ? <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={color.primary} /> : undefined}
      >
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

export const Title = ({ children, sub }) => (
  <View style={{ marginBottom: space.md }}>
    <Text style={styles.title}>{children}</Text>
    {sub ? <Text style={styles.muted}>{sub}</Text> : null}
  </View>
);
export const Muted = ({ children, style }) => <Text style={[styles.muted, style]}>{children}</Text>;
export const Card = ({ children, style }) => <View style={[styles.card, style]}>{children}</View>;
export const Heading = ({ children }) => <Text style={styles.heading}>{children}</Text>;

export function Button({ title, onPress, busy, kind = 'primary', disabled, style }) {
  const off = busy || disabled;
  return (
    <Pressable
      onPress={onPress}
      disabled={off}
      accessibilityRole="button"
      style={({ pressed }) => [styles.button, kind === 'ghost' && styles.buttonGhost, kind === 'danger' && styles.buttonDanger, off && { opacity: 0.5 }, pressed && { opacity: 0.8 }, style]}
    >
      {busy ? <ActivityIndicator color={kind === 'ghost' ? color.primary : '#fff'} /> : <Text style={[styles.buttonText, kind === 'ghost' && { color: color.primary }]}>{title}</Text>}
    </Pressable>
  );
}

export function Field({ label, style, ...props }) {
  return (
    <View style={[{ marginBottom: space.md }, style]}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <TextInput placeholderTextColor="#9aa3b5" style={styles.input} {...props} />
    </View>
  );
}

export function Tile({ label, value, hint, tone = 'blue' }) {
  return (
    <View style={[styles.tile, { backgroundColor: TONES[tone].bg }]}>
      <Text style={[styles.tileLabel, { color: TONES[tone].fg }]}>{label}</Text>
      <Text style={styles.tileValue}>{value}</Text>
      {hint ? <Text style={styles.muted}>{hint}</Text> : null}
    </View>
  );
}
export const TileRow = ({ children }) => <View style={styles.tileRow}>{children}</View>;

export function Badge({ text, tone = 'grey' }) {
  return <View style={[styles.badge, { backgroundColor: TONES[tone].bg }]}><Text style={[styles.badgeText, { color: TONES[tone].fg }]}>{text}</Text></View>;
}

export function Banner({ text, kind = 'error' }) {
  if (!text) return null;
  const tone = kind === 'error' ? TONES.red : TONES.green;
  return <View style={[styles.banner, { backgroundColor: tone.bg }]}><Text style={{ color: tone.fg, fontWeight: '600' }}>{text}</Text></View>;
}

export const Empty = ({ children }) => <Text style={styles.empty}>{children}</Text>;
export const Loading = () => <ActivityIndicator style={{ marginVertical: space.xl }} color={color.primary} />;

/** A row of choices (classes, subjects, children). Hidden when there is nothing to choose between. */
export function Chips({ options, value, onChange }) {
  if (options.length < 2) return null;
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: space.md, flexGrow: 0 }}>
      {options.map((o) => (
        <Pressable key={o.value} onPress={() => onChange(o.value)} style={[styles.chip, o.value === value && styles.chipOn]}>
          <Text style={[styles.chipText, o.value === value && { color: '#fff' }]}>{o.label}</Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

export const Row = ({ left, right, sub }) => (
  <View style={styles.row}>
    <View style={{ flex: 1, paddingRight: space.sm }}>
      <Text style={styles.rowText}>{left}</Text>
      {sub ? <Text style={styles.muted}>{sub}</Text> : null}
    </View>
    {right}
  </View>
);

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.bg },
  content: { padding: space.lg, paddingBottom: 40 },
  title: { fontSize: 22, fontWeight: '800', color: color.ink },
  heading: { fontSize: 15, fontWeight: '700', color: color.ink, marginBottom: space.sm },
  muted: { fontSize: 13, color: color.muted },
  card: { backgroundColor: color.card, borderRadius: radius, borderWidth: 1, borderColor: color.line, padding: space.lg, marginBottom: space.md },
  button: { backgroundColor: color.primary, borderRadius: 10, paddingVertical: 13, paddingHorizontal: space.lg, alignItems: 'center', justifyContent: 'center', minHeight: 46 },
  buttonGhost: { backgroundColor: 'transparent', borderWidth: 1, borderColor: color.primary },
  buttonDanger: { backgroundColor: color.red },
  buttonText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  label: { fontSize: 12, fontWeight: '700', color: color.muted, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 4 },
  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: color.line, borderRadius: 10, paddingHorizontal: space.md, paddingVertical: 11, fontSize: 16, color: color.ink },
  tileRow: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, marginBottom: space.md },
  tile: { flexGrow: 1, flexBasis: '45%', borderRadius: radius, padding: space.md },
  tileLabel: { fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.6 },
  tileValue: { fontSize: 24, fontWeight: '800', color: color.ink, marginVertical: 2 },
  badge: { alignSelf: 'flex-start', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3 },
  badgeText: { fontSize: 12, fontWeight: '700' },
  banner: { borderRadius: 10, padding: space.md, marginBottom: space.md },
  empty: { textAlign: 'center', color: color.muted, marginVertical: space.xl },
  chip: { borderWidth: 1, borderColor: color.line, backgroundColor: '#fff', borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8, marginRight: space.sm },
  chipOn: { backgroundColor: color.primary, borderColor: color.primary },
  chipText: { fontWeight: '700', color: color.ink },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: color.line },
  rowText: { fontSize: 15, color: color.ink, fontWeight: '600' },
});
