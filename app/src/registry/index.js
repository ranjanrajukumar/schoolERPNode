import { FAMILY_MODULES } from './family';
import { STAFF_MODULES } from './staff';

const REGISTRIES = { staff: STAFF_MODULES, family: FAMILY_MODULES };

/** Modules (menu groups) a role may open. A module or a screen without `roles` is open to everyone who gets the registry. */
export const modulesFor = (registry, role) => (REGISTRIES[registry] ?? [])
  .filter((m) => !m.roles || m.roles.includes(role))
  .map((m) => ({ ...m, screens: m.screens.filter((s) => !(s.roles ?? m.roles) || (s.roles ?? m.roles).includes(role)) }))
  .filter((m) => m.screens.length);

export const findScreen = (registry, moduleKey, screenKey) => (REGISTRIES[registry] ?? []).find((m) => m.key === moduleKey)?.screens.find((s) => s.key === screenKey);
export const findModule = (registry, moduleKey) => (REGISTRIES[registry] ?? []).find((m) => m.key === moduleKey);
