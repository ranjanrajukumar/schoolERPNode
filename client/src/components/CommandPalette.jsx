import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useTheme } from '../context/ThemeContext.jsx';
import { MENU } from '../config/menu.js';

const ALWAYS = ['dashboard', 'help-and-support'];
const THEME_LABEL = { auto: 'Follow device', light: 'Light', dark: 'Dark' };

/**
 * Ctrl+K (or Cmd+K): jump to any page the person can open, find a student by typing a name or admission number,
 * or switch theme. Pages are filtered by the same role rules as the sidebar.
 */
export default function CommandPalette({ open, onClose }) {
  const nav = useNavigate();
  const { user, logout } = useAuth();
  const { mode, cycle } = useTheme();
  const input = useRef(null);
  const [query, setQuery] = useState('');
  const [students, setStudents] = useState([]);
  const [active, setActive] = useState(0);
  const role = user?.role;

  const pages = useMemo(() => {
    const seen = new Set();
    const list = [];
    for (const g of MENU) {
      if (!g.roles.includes(role)) continue;
      if (user?.permissions && !ALWAYS.includes(g.slug) && !(g.slug in user.permissions)) continue;
      for (const i of g.items) {
        if (!i.built || !i.roles.includes(role) || seen.has(i.to)) continue;
        seen.add(i.to);
        list.push({ kind: 'page', key: `p-${i.to}`, label: i.label, hint: g.label, icon: g.icon, to: i.to });
      }
    }
    return list;
  }, [role, user?.permissions]);

  useEffect(() => {
    if (open) {
      setQuery('');
      setStudents([]);
      setActive(0);
      setTimeout(() => input.current?.focus(), 30);
    }
  }, [open]);

  // Students are looked up on the server as the person types.
  const canFindStudents = ['admin', 'teacher'].includes(role);
  useEffect(() => {
    if (!open || !canFindStudents || query.trim().length < 2) {
      setStudents([]);
      return undefined;
    }
    const t = setTimeout(() => {
      api(`/lookup/students?${new URLSearchParams({ q: query.trim(), limit: 5 })}`)
        .then((rows) =>
          setStudents(
            rows.map((r) => ({
              kind: 'student',
              key: `s-${r.id}`,
              label: r.label,
              hint: r.sub,
              icon: '🎓',
              to: `/students/${r.id}/profile`,
            })),
          ),
        )
        .catch(() => setStudents([]));
    }, 250);
    return () => clearTimeout(t);
  }, [query, open, canFindStudents]);

  const results = useMemo(() => {
    const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
    const match = (p) => words.every((w) => `${p.label} ${p.hint}`.toLowerCase().includes(w));
    const actions = [
      {
        kind: 'action',
        key: 'a-theme',
        label: `Switch theme (now: ${THEME_LABEL[mode]})`,
        hint: 'Appearance',
        icon: '🌓',
        run: cycle,
      },
      {
        kind: 'action',
        key: 'a-out',
        label: 'Sign out',
        hint: 'Account',
        icon: '🚪',
        run: () => {
          logout();
          nav('/login');
        },
      },
    ];
    const pageHits = (words.length ? pages.filter(match) : pages.slice(0, 8)).slice(0, 8);
    return [...students, ...pageHits, ...(words.length ? actions.filter(match) : actions)];
  }, [query, pages, students, mode, cycle, logout, nav]);

  useEffect(() => {
    setActive(0);
  }, [query]);

  if (!open) return null;

  const choose = (item) => {
    if (!item) return;
    if (item.run) item.run();
    else nav(item.to);
    if (item.kind !== 'action' || item.key === 'a-out') onClose();
  };
  const onKey = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      choose(results[active]);
    } else if (e.key === 'Escape') onClose();
  };

  return (
    <div className="palette-backdrop" onMouseDown={onClose}>
      <div
        className="palette"
        role="dialog"
        aria-modal="true"
        aria-label="Search"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <input
          ref={input}
          className="palette-input"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={onKey}
          placeholder="Search pages, or type a student's name…"
          role="combobox"
          aria-expanded="true"
          aria-controls="palette-list"
          autoComplete="off"
        />
        <ul id="palette-list" role="listbox" className="palette-list">
          {results.map((r, i) => (
            <li
              key={r.key}
              role="option"
              aria-selected={i === active}
              className={i === active ? 'on' : ''}
              onMouseEnter={() => setActive(i)}
              onMouseDown={(e) => {
                e.preventDefault();
                choose(r);
              }}
            >
              <span className="palette-icon" aria-hidden="true">
                {r.icon}
              </span>
              <span className="palette-label">{r.label}</span>
              <small>{r.hint}</small>
            </li>
          ))}
          {!results.length && <li className="palette-note">Nothing matches “{query}”.</li>}
        </ul>
        <div className="palette-foot">
          <span>
            <kbd>↑</kbd>
            <kbd>↓</kbd> move
          </span>
          <span>
            <kbd>Enter</kbd> open
          </span>
          <span>
            <kbd>Esc</kbd> close
          </span>
        </div>
      </div>
    </div>
  );
}
