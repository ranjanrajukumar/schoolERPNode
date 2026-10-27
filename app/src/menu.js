import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, store } from './api';
import { useAuth, audienceOf } from './auth';
import { buildDefaultMenu } from './registry/defaultMenu';
import { PASSWORD_TILE, STAFF_QUICK } from './registry/extras';
import { findScreen } from './registry';

/**
 * The menu comes from the school's database (admins edit labels, icons, order, visibility and uploaded pictures on the website).
 * The last copy is kept on the phone, and the built-in menu is used when there is neither, so the app always opens.
 */
const MenuContext = createContext({ items: [], source: 'builtin', reload: () => {} });
export const useMenu = () => useContext(MenuContext);

const cacheKey = (userId) => `schoolerp.menu.${userId}`;

/** The built-in menu filtered the way the server filters it: this audience, this role, parents' roles inherited by their pages. */
function builtinFor(role) {
  const audience = audienceOf(role) === 'family' ? 'family' : 'staff';
  const rows = buildDefaultMenu().filter((i) => i.audience === audience);
  const byKey = new Map(rows.map((r) => [r.key, r]));
  const allowed = (r) => {
    const parent = r.parentKey ? byKey.get(r.parentKey) : null;
    const roles = r.roles ?? parent?.roles ?? null;
    return !roles || roles.includes(role);
  };
  return rows.filter(allowed);
}

export function MenuProvider({ children }) {
  const { user } = useAuth();
  const [state, setState] = useState({ items: null, source: 'builtin' });

  const load = useCallback(async () => {
    if (!user) return;
    try {
      const items = await api('/app-menu');
      if (Array.isArray(items) && items.length) {
        setState({ items, source: 'server' });
        store.setItemAsync(cacheKey(user.id), JSON.stringify(items)).catch(() => {});
        return;
      }
    } catch { /* offline, or an older server without a menu: fall back below */ }
    try {
      const cached = JSON.parse((await store.getItemAsync(cacheKey(user.id))) ?? 'null');
      if (Array.isArray(cached) && cached.length) { setState({ items: cached, source: 'cache' }); return; }
    } catch { /* nothing cached */ }
    setState({ items: builtinFor(user.role), source: 'builtin' });
  }, [user]);

  useEffect(() => { setState({ items: null, source: 'builtin' }); load(); }, [load]);

  const value = useMemo(() => ({ items: state.items ?? builtinFor(user?.role), source: state.source, loading: state.items === null, reload: load }), [state, user?.role, load]);
  return <MenuContext.Provider value={value}>{children}</MenuContext.Provider>;
}

/** What a tile or page opens: a route in the navigator, with its parameters. Unknown keys (a page this app version lacks) return null. */
export function targetOf(audience, item) {
  if (item.key === PASSWORD_TILE.key) return { route: PASSWORD_TILE.route };
  if (audience === 'staff') {
    const quick = STAFF_QUICK.find((q) => q.key === item.key);
    if (quick) return { route: quick.route };
    if (!item.key.includes('.')) return { route: 'Module', params: { registry: 'staff', moduleKey: item.key } };
  } else if (!item.key.includes('.')) {
    return null; // a family section is a heading, not a page
  }
  const [moduleKey, ...rest] = item.key.split('.');
  const screenKey = rest.join('.');
  const cfg = findScreen(audience, moduleKey, screenKey);
  if (!cfg) return null;
  if (cfg.kind === 'custom') return { route: cfg.route, params: cfg.params };
  return { route: cfg.kind === 'stats' ? 'Stats' : 'List', params: { registry: audience, moduleKey, screenKey } };
}

const toTile = (audience, navigation) => (item) => {
  const target = targetOf(audience, item);
  return target ? { key: item.key, label: item.label, icon: item.icon, iconData: item.iconData, go: () => navigation.navigate(target.route, target.params) } : null;
};

/** The staff home tiles, in the database's order. Each is { key, label, icon, iconData, go }. */
export function homeTiles(items, audience, navigation) {
  return items.filter((i) => !i.parentKey).map(toTile(audience, navigation)).filter(Boolean);
}

/** The family home: titled sections, each with its icon tiles, in the database's order. Empty sections are left out. */
export function homeSections(items, navigation) {
  return items
    .filter((i) => !i.parentKey)
    .map((section) => ({ key: section.key, label: section.label, tiles: items.filter((i) => i.parentKey === section.key).map(toTile('family', navigation)).filter(Boolean) }))
    .filter((s) => s.tiles.length);
}
