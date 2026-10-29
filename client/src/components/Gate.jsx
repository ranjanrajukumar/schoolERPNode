import { useCan } from '../hooks/useRights.js';

/** Shows its children only when the signed-in role has this right on the current page (set on the Role Rights page). */
export default function Gate({ action, module, children }) {
  const can = useCan(module);
  return can(action) ? children : null;
}
