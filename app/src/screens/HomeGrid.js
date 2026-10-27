import { useEffect, useMemo, useState } from 'react';
import { Alert, Image, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../auth';
import { color, radius, space } from '../theme';
import { bumpUsage, loadUsage } from '../usage';

/** An uploaded picture when the menu has one, otherwise the named outline icon (an unknown name falls back to a plain one). */
export function MenuIcon({ name, data, size = 36 }) {
  if (data) return <Image source={{ uri: data }} style={{ width: size, height: size }} resizeMode="contain" />;
  return <Ionicons name={name in Ionicons.glyphMap ? name : 'apps-outline'} size={size} color={color.header} />;
}

/** One icon with its label, four to a row. */
export function IconTile({ icon, iconData, label, onPress }) {
  return (
    <Pressable onPress={onPress} style={{ width: '25%', alignItems: 'center', paddingVertical: space.md, paddingHorizontal: 2 }} accessibilityRole="button" accessibilityLabel={label}>
      <MenuIcon name={icon} data={iconData} />
      <Text numberOfLines={2} style={{ marginTop: 6, fontSize: 13, fontWeight: '600', color: color.ink, textAlign: 'center' }}>{label}</Text>
    </Pressable>
  );
}

const Panel = ({ children, style }) => (
  <View style={[{ backgroundColor: '#fff', borderRadius: radius + 4, padding: space.md, marginBottom: space.md, shadowColor: '#0b1b3a', shadowOpacity: 0.08, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 2 }, style]}>{children}</View>
);

function confirmSignOut(signOut) {
  if (Platform.OS === 'web') { if (globalThis.confirm?.('Sign out?')) signOut(); return; }
  Alert.alert('Sign out?', undefined, [{ text: 'Stay', style: 'cancel' }, { text: 'Sign out', style: 'destructive', onPress: signOut }]);
}

/**
 * The home page of both apps: a greeting bar, the tiles this person opens most, a summary card, and every area as an icon grid.
 * Either tiles = [{ key, label, icon, go }] (one grid) or sections = [{ key, label, tiles }] (a titled grid per section).
 * summary = a node shown under "Frequently used"; onBell opens the notices.
 */
export default function HomeGrid({ tiles: flat, sections, summary, onBell }) {
  const tiles = useMemo(() => flat ?? sections.flatMap((s) => s.tiles), [flat, sections]);
  const insets = useSafeAreaInsets();
  const { user, signOut } = useAuth();
  const [usage, setUsage] = useState({});
  const [query, setQuery] = useState(null); // null: search closed

  useEffect(() => { loadUsage(user.id).then(setUsage); }, [user.id]);

  const open = (tile) => {
    bumpUsage(user.id, tile.key);
    setUsage((u) => ({ ...u, [tile.key]: (u[tile.key] ?? 0) + 1 }));
    tile.go();
  };

  const frequent = useMemo(() => {
    const used = tiles.filter((t) => usage[t.key]).sort((a, b) => usage[b.key] - usage[a.key]);
    return [...used, ...tiles.filter((t) => !usage[t.key])].slice(0, 4);
  }, [tiles, usage]);
  const matches = (t) => !query || t.label.toLowerCase().includes(query.trim().toLowerCase());
  const shown = tiles.filter(matches);
  const first = String(user?.name ?? '').split(' ')[0].toUpperCase();

  return (
    <View style={{ flex: 1, backgroundColor: color.bg }}>
      <View style={{ backgroundColor: color.header, paddingTop: insets.top + 10, paddingBottom: 14, paddingHorizontal: space.lg }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', marginRight: space.md }}>
            <Text style={{ fontSize: 22, fontWeight: '800', color: color.header }}>{first.slice(0, 1) || '?'}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: '#fff', fontSize: 20, fontWeight: '800', letterSpacing: 1 }}>HELLO</Text>
            <Text numberOfLines={1} style={{ color: '#fff', fontSize: 20, fontWeight: '800', letterSpacing: 1 }}>{first}</Text>
          </View>
          <Pressable onPress={() => setQuery(query === null ? '' : null)} hitSlop={8} style={{ padding: 8 }} accessibilityLabel="Search"><Ionicons name="search-outline" size={26} color="#fff" /></Pressable>
          {onBell ? <Pressable onPress={onBell} hitSlop={8} style={{ padding: 8 }} accessibilityLabel="Notices"><Ionicons name="notifications-outline" size={26} color="#fff" /></Pressable> : null}
          <Pressable onPress={() => confirmSignOut(signOut)} hitSlop={8} style={{ padding: 8 }} accessibilityLabel="Sign out"><Ionicons name="log-out-outline" size={26} color="#fff" /></Pressable>
        </View>
        {query !== null ? (
          <TextInput value={query} onChangeText={setQuery} autoFocus placeholder="Search the menu" placeholderTextColor="#9fb3d9" style={{ marginTop: space.md, backgroundColor: 'rgba(255,255,255,0.15)', color: '#fff', borderRadius: 10, paddingHorizontal: space.md, paddingVertical: 10, fontSize: 16 }} />
        ) : null}
      </View>

      <ScrollView contentContainerStyle={{ padding: space.md, paddingBottom: 32 }} keyboardShouldPersistTaps="handled">
        {query === null && frequent.length >= 4 ? (
          <Panel>
            <Text style={{ fontSize: 18, fontWeight: '800', color: color.ink, marginBottom: 4, paddingHorizontal: 4 }}>Frequently Used</Text>
            <View style={{ flexDirection: 'row' }}>{frequent.map((t) => <IconTile key={t.key} icon={t.icon} iconData={t.iconData} label={t.label} onPress={() => open(t)} />)}</View>
          </Panel>
        ) : null}
        {query === null ? summary : null}
        {sections ? sections.map((s) => {
          const inSection = s.tiles.filter(matches);
          return inSection.length ? (
            <Panel key={s.key}>
              <Text style={{ fontSize: 18, fontWeight: '800', color: color.ink, marginBottom: 4, paddingHorizontal: 4 }}>{s.label}</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>{inSection.map((t) => <IconTile key={t.key} icon={t.icon} iconData={t.iconData} label={t.label} onPress={() => open(t)} />)}</View>
            </Panel>
          ) : null;
        }) : (
          <Panel>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
              {shown.map((t) => <IconTile key={t.key} icon={t.icon} iconData={t.iconData} label={t.label} onPress={() => open(t)} />)}
            </View>
          </Panel>
        )}
        {!shown.length ? <Text style={{ textAlign: 'center', color: color.muted, padding: space.lg }}>Nothing matches.</Text> : null}
      </ScrollView>
    </View>
  );
}

export { Panel };
