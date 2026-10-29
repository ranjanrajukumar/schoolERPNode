import { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from '../components/Sidebar.jsx';
import CommandPalette from '../components/CommandPalette.jsx';
import SchoolBrand, { AppFooter, PrintLetterhead } from '../components/SchoolBrand.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useTheme } from '../context/ThemeContext.jsx';
import { useSureClicks } from '../components/useSureClicks.js';

const THEME = {
  auto: { icon: '🌓', label: 'Theme: follows your device' },
  light: { icon: '☀️', label: 'Theme: light' },
  dark: { icon: '🌙', label: 'Theme: dark' },
};
const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform);

/**
 * Desktop: sidebar beside the page, with a slim header (search, theme) above it.
 * Phone and tablet: the sidebar becomes a drawer opened from the ☰ in that same header.
 */
export default function AppLayout() {
  const [open, setOpen] = useState(false);
  const [searching, setSearching] = useState(false);
  const { pathname, search } = useLocation();
  const { user } = useAuth();
  const { mode, cycle } = useTheme();
  useSureClicks(); // delete / remove / enroll… need a second click

  // Choosing a page closes the drawer; so does Escape.
  useEffect(() => {
    setOpen(false);
  }, [pathname, search]);
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  // Ctrl+K / Cmd+K opens the search from anywhere.
  useEffect(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setSearching((s) => !s);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div className={`shell${open ? ' nav-open' : ''}`}>
      <Sidebar onNavigate={() => setOpen(false)} />
      <div className="scrim" onClick={() => setOpen(false)} aria-hidden="true" />
      <div className="content">
        <header className="topbar no-print">
          <button
            type="button"
            className="menu-btn"
            aria-label="Open menu"
            aria-expanded={open}
            onClick={() => setOpen(true)}
          >
            ☰
          </button>
          <SchoolBrand className="brand topbar-brand" />
          <button
            type="button"
            className="search-btn"
            onClick={() => setSearching(true)}
            aria-label="Search pages and students"
          >
            <span aria-hidden="true">🔍</span>
            <span className="search-text">Search pages and students…</span>
            <kbd>{isMac ? '⌘' : 'Ctrl'} K</kbd>
          </button>
          <button
            type="button"
            className="icon-btn"
            onClick={cycle}
            title={THEME[mode].label}
            aria-label={THEME[mode].label}
          >
            {THEME[mode].icon}
          </button>
          <span className="avatar topbar-avatar" title={user?.name}>
            {(user?.name ?? '?').slice(0, 1).toUpperCase()}
          </span>
        </header>
        <PrintLetterhead />
        <main key={pathname} className="page">
          <Outlet />
        </main>
        <AppFooter />
      </div>
      <CommandPalette open={searching} onClose={() => setSearching(false)} />
    </div>
  );
}
