import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

const ThemeContext = createContext(null);
const KEY = 'theme';
const MODES = ['auto', 'light', 'dark'];

const stored = () => { try { const v = localStorage.getItem(KEY); return MODES.includes(v) ? v : 'auto'; } catch { return 'auto'; } };

/** "auto" follows the device; light and dark are the person's own choice, remembered in this browser. */
export function ThemeProvider({ children }) {
  const [mode, setMode] = useState(stored);
  useEffect(() => {
    const root = document.documentElement;
    if (mode === 'auto') root.removeAttribute('data-theme'); else root.setAttribute('data-theme', mode);
    try { localStorage.setItem(KEY, mode); } catch { /* private mode: the choice just lasts this visit */ }
  }, [mode]);
  const cycle = useCallback(() => setMode((m) => MODES[(MODES.indexOf(m) + 1) % MODES.length]), []);
  const value = useMemo(() => ({ mode, setMode, cycle }), [mode, cycle]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export const useTheme = () => useContext(ThemeContext);
