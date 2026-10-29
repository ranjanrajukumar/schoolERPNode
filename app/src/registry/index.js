import { FAMILY_MODULES } from './family';
import { STAFF_MODULES } from './staff';

const REGISTRIES = { staff: STAFF_MODULES, family: FAMILY_MODULES };

export const findScreen = (registry, moduleKey, screenKey) => (REGISTRIES[registry] ?? []).find((m) => m.key === moduleKey)?.screens.find((s) => s.key === screenKey);
export const findModule = (registry, moduleKey) => (REGISTRIES[registry] ?? []).find((m) => m.key === moduleKey);
