import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, restoreSession, saveToken, setUnauthorizedHandler } from './api';

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

/** Parents and students use the portal; teachers, admins and accountants get the staff modules; anyone else is sent to the web app. */
export const audienceOf = (role) => (['parent', 'student'].includes(role) ? 'family' : ['teacher', 'admin', 'accountant'].includes(role) ? 'staff' : 'other');

export function AuthProvider({ children }) {
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState(null); // { id, name, role, staffId, classes, mustChangePassword }

  const clear = useCallback(async () => { await saveToken(null); setUser(null); }, []);
  const refresh = useCallback(async () => { const me = await api('/auth/me'); setUser(me); return me; }, []);

  useEffect(() => {
    setUnauthorizedHandler(() => { clear(); });
    (async () => {
      try { if (await restoreSession()) await refresh(); } catch { await clear(); }
      setReady(true);
    })();
  }, [clear, refresh]);

  const value = useMemo(() => ({
    ready,
    user,
    async signIn(identifier, password) {
      const result = await api('/auth/login', { method: 'POST', body: { email: identifier.trim(), password } });
      await saveToken(result.token);
      await refresh();
    },
    /** Signs in with the ticket the global registry gave after checking the person's mobile number or email and password. */
    async signInWithTicket(ticket) {
      const result = await api('/auth/sso', { method: 'POST', body: { ticket } });
      await saveToken(result.token);
      await refresh();
    },
    async changePassword(currentPassword, newPassword) {
      await api('/auth/change-password', { method: 'POST', body: { currentPassword, newPassword } });
      await refresh();
    },
    signOut: clear,
  }), [ready, user, clear, refresh]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
