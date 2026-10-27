import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { ApiError, clearServerUrl, saveServerUrl, store } from './api';
import { useAuth } from './auth';
import { GLOBAL_URL, REQUEST_TIMEOUT_MS } from './config';

/**
 * One app for many schools. The person signs in with a mobile number (or email) and password; the global registry checks them, says which
 * school and role they belong to, and gives a short-lived ticket. The app then connects to that school's own server and presents the ticket.
 * With no registry configured (single-school mode) there is nothing to look up and the app signs in at one school as before.
 */
export const globalMode = Boolean(GLOBAL_URL);

const CLIENT_KEY = 'schoolerp.client';
const ClientContext = createContext({ client: null, ready: true, connect: async () => {}, forget: async () => {} });
export const useClient = () => useContext(ClientContext);

/**
 * Asks the registry who these credentials belong to. Resolves with the matching accounts: { clientCode, clientName, city, logoUrl, apiUrl, role,
 * name, ticket }. Usually one; several when the same phone or email is a parent at one school and a teacher at another.
 */
export async function globalLogin(identifier, password) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(`${GLOBAL_URL}/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ identifier: identifier.trim(), password }), signal: controller.signal });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new ApiError(data.error || `The sign-in service answered with an error (${res.status})`, res.status);
    return data.accounts ?? [];
  } catch (err) {
    if (err instanceof ApiError) throw err;
    throw new ApiError(err.name === 'AbortError' ? 'The sign-in service did not answer in time.' : 'Cannot reach the sign-in service. Check your connection.', 0);
  } finally {
    clearTimeout(timer);
  }
}

export function ClientProvider({ children }) {
  const [state, setState] = useState({ ready: !globalMode, client: null });

  useEffect(() => {
    if (!globalMode) return;
    (async () => {
      let client = null;
      try {
        client = JSON.parse((await store.getItemAsync(CLIENT_KEY)) ?? 'null');
        if (client?.apiUrl) await saveServerUrl(client.apiUrl); // every call goes to the school the person last signed in to
        else client = null;
      } catch { client = null; }
      setState({ ready: true, client });
    })();
  }, []);

  /** Points the app at the school an account belongs to, and remembers it. */
  const connect = useCallback(async (account) => {
    const school = { code: account.clientCode, name: account.clientName, city: account.city ?? null, logoUrl: account.logoUrl ?? null, apiUrl: account.apiUrl };
    await saveServerUrl(school.apiUrl);
    await store.setItemAsync(CLIENT_KEY, JSON.stringify(school));
    setState({ ready: true, client: school });
  }, []);

  const forget = useCallback(async () => {
    await clearServerUrl();
    await store.deleteItemAsync(CLIENT_KEY);
    setState({ ready: true, client: null });
  }, []);

  const value = useMemo(() => ({ ...state, connect, forget }), [state, connect, forget]);
  return <ClientContext.Provider value={value}>{state.ready ? children : null}</ClientContext.Provider>;
}

/** Signs out and forgets which school this phone was connected to, so the next sign-in can be anyone's. */
export function useChangeSchool() {
  const { signOut } = useAuth();
  const { forget } = useClient();
  return useCallback(async () => { await signOut(); await forget(); }, [signOut, forget]);
}
