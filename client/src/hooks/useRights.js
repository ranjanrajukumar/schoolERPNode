import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { api } from '../services/api.js';
import { MENU } from '../config/menu.js';
import { useAuth } from '../context/AuthContext.jsx';

let cache = null; // { role, rights } for the session

export const refreshRights = () => {
  cache = null;
};

/**
 * The module (sidebar group key) whose menu has this page. A page that is not in the menu itself (a student's profile, an exam's marks) takes
 * the module of the menu page that shares the first part of its address.
 */
function moduleOfRoute(pathname) {
  const exact = MENU.find((g) => g.items.some((i) => i.built && i.to.split('?')[0] === pathname));
  if (exact) return exact.key;
  const first = pathname.split('/')[1];
  if (!first) return null;
  return (
    MENU.find((g) => g.items.some((i) => i.built && i.to.split('?')[0].split('/')[1] === first))?.key ?? null
  );
}

/**
 * What the signed-in role may do on the current page, from the Role Rights page: can('create'), can('edit'), can('delete'),
 * can('approve'), can('export'). Everything is allowed until an admin switches something off, and until the rights have loaded.
 * This only hides buttons; the server refuses the request in any case.
 */
export function useCan(moduleKey) {
  const { user } = useAuth();
  const { pathname } = useLocation();
  const role = user?.role;
  const [rights, setRights] = useState(cache?.role === role ? cache.rights : null);
  useEffect(() => {
    if (!role) return;
    if (cache?.role === role) {
      setRights(cache.rights);
      return;
    }
    api('/role-rights/mine')
      .then((r) => {
        cache = { role, rights: r };
        setRights(r);
      })
      .catch(() => {});
  }, [role]);
  const mine = rights?.[moduleKey ?? moduleOfRoute(pathname)];
  return (action) => (mine ? mine[action] !== false : true);
}
