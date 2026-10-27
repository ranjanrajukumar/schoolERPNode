import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { MENU } from '../config/menu.js';
import SchoolBrand from './SchoolBrand.jsx';

// Shown to every signed-in user, whatever a custom role includes.
const ALWAYS = ['dashboard', 'help-and-support'];

/**
 * Several submenu items can open the same page. An item whose link carries a query (/portal?tab=Fees) wins when that query is in the
 * address; otherwise the first item for the page is highlighted.
 */
function activeKey(pathname, search, groups) {
  const current = new URLSearchParams(search);
  const all = groups.flatMap((group) => group.items.map((item) => ({ group, item })));
  const onPage = ({ item }) => {
    const target = item.to.split('?')[0];
    return target === '/' ? pathname === '/' : pathname === target || pathname.startsWith(`${target}/`);
  };
  const queryMatches = ({ item }) => item.to.includes('?') && item.to.split('?')[0] === pathname
    && [...new URLSearchParams(item.to.split('?')[1])].every(([k, v]) => current.get(k) === v);
  const hit = all.find(queryMatches) ?? all.find((x) => !x.item.to.includes('?') && onPage(x)) ?? all.find(onPage);
  return hit ? `${hit.group.slug}:${hit.item.label}` : null;
}

export default function Sidebar({ onNavigate }) {
  const { user, logout } = useAuth();
  const { pathname, search } = useLocation();
  const role = user?.role;

  // Hide groups and items the role can never use, and groups left with nothing to show.
  const groups = MENU
    .filter((g) => g.roles.includes(role))
    .filter((g) => !user?.permissions || ALWAYS.includes(g.slug) || g.slug in user.permissions)
    .map((g) => ({ ...g, items: g.items.filter((i) => i.roles.includes(role)) }))
    .filter((g) => g.items.length);

  const active = activeKey(pathname, search, groups);
  const activeGroup = active?.split(':')[0];
  const [open, setOpen] = useState(() => new Set(activeGroup ? [activeGroup] : []));
  const toggle = (slug) => setOpen((prev) => {
    const next = new Set(prev);
    if (next.has(slug)) next.delete(slug); else next.add(slug);
    return next;
  });

  return (
    <aside>
      <SchoolBrand />
      <nav>
        {groups.map((g) => {
          const expanded = open.has(g.slug) || g.slug === activeGroup;
          return (
            <div key={g.slug} className="nav-group">
              <button className={`nav-head ${g.slug === activeGroup ? 'current' : ''}`} onClick={() => toggle(g.slug)}
                aria-expanded={expanded}>
                <span><span className="nav-icon" aria-hidden="true">{g.icon}</span>{g.label}</span><span className="chev">{expanded ? '▾' : '▸'}</span>
              </button>
              {expanded && g.items.map((i) => (
                <Link key={i.label} to={i.to} onClick={onNavigate}
                  className={`nav-item ${active === `${g.slug}:${i.label}` ? 'active' : ''} ${i.built ? '' : 'planned'}`}>
                  {i.label}
                </Link>
              ))}
            </div>
          );
        })}
      </nav>
      <div className="whoami"><span className="avatar">{(user?.name ?? '?').slice(0, 1).toUpperCase()}</span><span>{user?.name}<br /><small style={{ color: 'inherit', opacity: .7 }}>{user?.customRole ?? role}</small></span></div>
      <button onClick={logout}>Logout</button>
    </aside>
  );
}
