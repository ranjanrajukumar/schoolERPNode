import { useEffect, useState } from 'react';
import { api } from '../services/api.js';
import { MENU, applyStoredMenu } from '../config/menu.js';
import { useAuth } from '../context/AuthContext.jsx';

let cache = null; // { role, rows } kept for the session so every screen that shows the menu reuses one request

/** The website menu: the one stored in the database (labels, icons, order, visibility, roles), or the built-in one until it arrives. */
export function useWebMenu() {
  const { user } = useAuth();
  const role = user?.role;
  const [rows, setRows] = useState(cache?.role === role ? cache.rows : null);
  useEffect(() => {
    if (!role) return;
    if (cache?.role === role) {
      setRows(cache.rows);
      return;
    }
    api('/app-menu/web')
      .then((list) => {
        cache = { role, rows: list };
        setRows(list);
      })
      .catch(() => {});
  }, [role]);
  return rows ? applyStoredMenu(rows, role) : MENU;
}

/** Forget the stored menu so the next screen reads the edited one. */
export const refreshWebMenu = () => {
  cache = null;
};
