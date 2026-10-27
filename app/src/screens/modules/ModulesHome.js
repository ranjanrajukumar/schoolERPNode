import { Pressable, Text, View } from 'react-native';
import { useAuth } from '../../auth';
import { useMenu } from '../../menu';
import { color, space } from '../../theme';
import { Card, Empty, Screen, Title } from '../../ui';
import { findModule, findScreen } from '../../registry';
import { MenuIcon } from '../HomeGrid';
import { useChild } from '../family/ChildContext';
import { StatsScreen } from './StatsView';

/**
 * The pages of one module, as the menu in the database lists them: its labels, icons and order, and only the pages this role may see.
 * A page the database knows but this app version lacks is skipped.
 */
export function ModuleScreen({ navigation, route }) {
  const { registry, moduleKey } = route.params;
  const { items } = useMenu();
  const mod = items.find((i) => i.key === moduleKey);
  const pages = items
    .filter((i) => i.parentKey === moduleKey)
    .map((i) => ({ item: i, cfg: findScreen(registry, moduleKey, i.key.slice(moduleKey.length + 1)) }))
    .filter((p) => p.cfg);

  const open = ({ cfg }) => {
    if (cfg.kind === 'custom') navigation.navigate(cfg.route, cfg.params);
    else navigation.navigate(cfg.kind === 'stats' ? 'Stats' : 'List', { registry, moduleKey, screenKey: cfg.key });
  };

  return (
    <Screen back>
      <Title sub={`${pages.length} page${pages.length === 1 ? '' : 's'}`}>{mod?.label ?? findModule(registry, moduleKey)?.title ?? 'Module'}</Title>
      {pages.length ? (
        <Card style={{ padding: 0 }}>
          {pages.map((p, i) => (
            <Pressable key={p.item.key} onPress={() => open(p)} style={{ flexDirection: 'row', alignItems: 'center', padding: 16, borderTopWidth: i ? 1 : 0, borderTopColor: color.line }}>
              <View style={{ width: 36, alignItems: 'center', marginRight: space.md }}><MenuIcon name={p.item.icon} data={p.item.iconData} size={26} /></View>
              <Text style={{ flex: 1, fontSize: 16, fontWeight: '600', color: color.ink }}>{p.item.label}</Text>
              <Text style={{ color: color.muted, fontSize: 18 }}>{'›'}</Text>
            </Pressable>
          ))}
        </Card>
      ) : <Empty>Nothing in this module is available to you.</Empty>}
    </Screen>
  );
}

/** A summary page opened from a module; its title follows the menu's label. */
export function StatsRoute({ route }) {
  const { registry, moduleKey, screenKey } = route.params;
  const { user } = useAuth();
  const { items } = useMenu();
  const cfg = findScreen(registry, moduleKey, screenKey);
  const kids = useChild();
  const label = items.find((i) => i.key === `${moduleKey}.${screenKey}`)?.label;
  return <StatsScreen cfg={label ? { ...cfg, title: label } : cfg} role={user?.role} child={cfg.scope === 'child' ? kids?.child ?? null : null} />;
}
