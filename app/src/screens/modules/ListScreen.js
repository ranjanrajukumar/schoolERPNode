import { useCallback, useRef, useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { api } from '../../api';
import ActionModal from '../../components/ActionModal';
import { color, space } from '../../theme';
import { Badge, Banner, Button, Card, Chips, Empty, Loading, Muted, Screen, Title, useLoad } from '../../ui';
import { autoRow } from '../../registry/format';
import { findScreen } from '../../registry';
import { useChild } from '../family/ChildContext';

const LIMIT = 100;

/** Any list module: read from the API, search, optional filters, optional "new" form; tapping a row opens its detail. */
export default function ListScreen({ route, navigation }) {
  const { registry, moduleKey, screenKey } = route.params;
  const cfg = findScreen(registry, moduleKey, screenKey);
  const kids = useChild(); // only present in the parent and student app
  const child = cfg.scope === 'child' ? kids?.child ?? null : null;
  const path = typeof cfg.path === 'function' ? cfg.path(child) : cfg.path;

  const { data, error, loading, reload } = useLoad(() => (path ? api(path) : Promise.resolve(null)), [path]);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState(0);
  const [creating, setCreating] = useState(false);
  const [notice, setNotice] = useState('');

  // refresh when coming back from a detail page where something may have changed
  const seen = useRef(false);
  useFocusEffect(useCallback(() => { if (seen.current) reload(); seen.current = true; }, [reload]));

  const rowOf = cfg.row ?? autoRow;
  const all = Array.isArray(data) ? data : (data && cfg.pick ? cfg.pick(data) : null) ?? [];
  const filters = cfg.filters ? [{ label: 'All', test: () => true }, ...cfg.filters] : null;
  const needle = query.trim().toLowerCase();
  const shown = all
    .filter((r) => (filters ? filters[filter].test(r) : true))
    .filter((r) => {
      if (!needle) return true;
      const v = rowOf(r, child);
      return `${v.title} ${v.sub ?? ''} ${Object.values(r).filter((x) => typeof x === 'string' || typeof x === 'number').join(' ')}`.toLowerCase().includes(needle);
    });

  return (
    <Screen back={!route.params.root} onRefresh={reload} refreshing={loading && data !== null}>
      <Title sub={cfg.sub}>{cfg.title}</Title>
      {cfg.scope === 'child' && kids ? <Chips options={kids.list.map((c) => ({ value: c.id, label: c.name.split(' ')[0] }))} value={kids.child?.id} onChange={kids.setChildId} /> : null}
      {cfg.create ? <Button title={cfg.create.label} onPress={() => setCreating(true)} style={{ marginBottom: space.md }} /> : null}
      <Banner text={notice} kind="ok" />
      <Banner text={error} />
      {all.length > 6 ? (
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search"
          placeholderTextColor="#9aa3b5"
          style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: color.line, borderRadius: 10, paddingHorizontal: space.md, paddingVertical: 10, fontSize: 16, marginBottom: space.md, color: color.ink }}
        />
      ) : null}
      {filters ? <Chips options={filters.map((f, i) => ({ value: i, label: f.label }))} value={filter} onChange={setFilter} /> : null}

      {loading && !data ? <Loading /> : data !== null && (shown.length ? (
        <>
          {shown.slice(0, LIMIT).map((r, i) => {
            const v = rowOf(r, child);
            return (
              <Pressable key={r.id ?? r.studentId ?? i} onPress={() => navigation.navigate('Detail', { registry, moduleKey, screenKey, row: r })}>
                <Card style={{ paddingVertical: space.md }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <View style={{ flex: 1, paddingRight: space.sm }}>
                      <Text style={{ fontSize: 16, fontWeight: '700', color: color.ink }}>{v.title}</Text>
                      {v.sub ? <Muted>{v.sub}</Muted> : null}
                    </View>
                    {v.badge ? <Badge text={v.badge.text} tone={v.badge.tone} /> : v.right !== undefined ? <Text style={{ fontWeight: '700', color: color.ink }}>{v.right}</Text> : null}
                  </View>
                </Card>
              </Pressable>
            );
          })}
          {shown.length > LIMIT ? <Muted style={{ textAlign: 'center' }}>Showing the first {LIMIT} of {shown.length}. Search to narrow the list.</Muted> : null}
        </>
      ) : <Empty>{needle || filter ? 'Nothing matches.' : cfg.empty ?? 'Nothing here yet.'}</Empty>)}

      <ActionModal
        visible={creating}
        action={cfg.create}
        row={null}
        child={child}
        onClose={() => setCreating(false)}
        onDone={(res) => { setCreating(false); setNotice(cfg.create?.done ? cfg.create.done(res) : 'Saved.'); reload(); }}
      />
    </Screen>
  );
}
