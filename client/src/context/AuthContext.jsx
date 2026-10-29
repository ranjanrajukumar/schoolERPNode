import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, clearToken, getToken, setToken } from '../services/api.js';

const AuthContext = createContext(null);

/** Reads the signed-in user from the JWT payload. The server still enforces every permission. */
function userFromToken(token) {
  try {
    const payload = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(atob(payload));
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [token, setTokenState] = useState(getToken());
  // A custom role narrows the menu to some modules; the server is the one that enforces it. null = no narrowing.
  const [access, setAccess] = useState({ permissions: null, customRole: null, staffId: null, classes: [] });
  const [mustChange, setMustChange] = useState(false); // a temporary password: it has to be replaced before anything else opens
  useEffect(() => {
    if (!token) {
      setAccess({ permissions: null, customRole: null, staffId: null, classes: [] });
      setMustChange(false);
      return;
    }
    api('/auth/me')
      .then((me) => {
        setMustChange(Boolean(me.mustChangePassword));
        setAccess({
          permissions: me.permissions,
          customRole: me.customRole,
          staffId: me.staffId ?? null,
          classes: me.classes ?? [],
        });
      })
      .catch(() => {});
  }, [token]);

  const login = useCallback(async (email, password) => {
    const { token: t, mustChangePassword } = await api('/auth/login', {
      method: 'POST',
      body: { email, password },
      patient: true,
    });
    setToken(t);
    setMustChange(Boolean(mustChangePassword));
    setTokenState(t);
  }, []);

  const logout = useCallback(() => {
    clearToken();
    setTokenState(null);
  }, []);

  const value = useMemo(
    () => ({
      isAuthenticated: Boolean(token),
      user: token ? { ...userFromToken(token), ...access, mustChangePassword: mustChange } : null,
      login,
      logout,
      passwordChanged: () => setMustChange(false),
    }),
    [token, access, mustChange, login, logout],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
