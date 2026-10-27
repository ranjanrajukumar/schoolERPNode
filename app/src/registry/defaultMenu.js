import { MODULE_ICON, SCREEN_ICON } from '../icons';
import { STAFF_QUICK, PASSWORD_TILE } from './extras';
import { FAMILY_MODULES } from './family';
import { STAFF_MODULES } from './staff';

const KIND_ICON = { list: 'list-outline', stats: 'stats-chart-outline', custom: 'open-outline' };
const screenIcon = (moduleKey, s) => SCREEN_ICON[`${moduleKey}.${s.key}`] ?? SCREEN_ICON[s.key] ?? KIND_ICON[s.kind] ?? 'ellipse-outline';

/**
 * The built-in menu, one row per home tile and per module page: { audience, key, parentKey, kind, label, icon, roles, position }.
 * The server stores it in the database (generated into server/src/modules/appmenu/defaults.json by npm run gen:menu); the app uses it
 * as is when the server has no menu to give.
 */
export function buildDefaultMenu() {
  const items = [];
  const counters = {};
  const add = (audience, item) => {
    const bucket = `${audience}|${item.parentKey ?? ''}`;
    counters[bucket] = (counters[bucket] ?? 0) + 1;
    items.push({ audience, parentKey: null, roles: null, ...item, position: counters[bucket] * 10 });
  };

  // staff: quick tiles, then each module with its pages, then the password tile
  for (const q of STAFF_QUICK) add('staff', { key: q.key, label: q.label, icon: q.icon, roles: q.roles, kind: 'quick' });
  for (const m of STAFF_MODULES) {
    add('staff', { key: m.key, label: m.title, icon: MODULE_ICON[m.key] ?? 'apps-outline', roles: m.roles ?? null, kind: 'module' });
    for (const s of m.screens) add('staff', { key: `${m.key}.${s.key}`, parentKey: m.key, label: s.title, icon: screenIcon(m.key, s), roles: s.roles ?? null, kind: s.kind });
  }
  add('staff', { key: PASSWORD_TILE.key, label: PASSWORD_TILE.label, icon: PASSWORD_TILE.icon, kind: 'quick' });

  // family: each module is a titled section of the home screen, with its pages as the icons inside it
  for (const m of FAMILY_MODULES) {
    add('family', { key: m.key, label: m.title, icon: MODULE_ICON[m.key] ?? 'apps-outline', roles: m.roles ?? null, kind: 'section' });
    for (const s of m.screens) add('family', { key: `${m.key}.${s.key}`, parentKey: m.key, label: s.title, icon: screenIcon(m.key, s), roles: s.roles ?? null, kind: s.kind });
  }
  return items;
}
