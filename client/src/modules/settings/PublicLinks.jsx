import { useState } from 'react';
import { Link } from 'react-router-dom';

/** Every address the school shares outside the app. Add a line here and it appears on the page, with Copy and Open. */
const GROUPS = [
  {
    title: 'Share with families',
    icon: '📣',
    items: [
      {
        title: 'Admission enquiry form',
        path: '/apply',
        who: 'Prospective parents',
        note: 'No sign-in needed. Each submission arrives under Admissions → Admission Enquiries with the source "Website".',
        follow: ['/admissions', 'Open Admission Enquiries'],
      },
    ],
  },
  {
    title: 'Sign in',
    icon: '🔑',
    items: [
      {
        title: 'Sign-in page',
        path: '/login',
        who: 'Staff, teachers, parents and students',
        note: 'One page for everyone. After signing in, each person lands on their own screen: staff on the dashboard, parents and students on their portal.',
      },
      {
        title: 'Parent and student portal',
        path: '/portal',
        who: 'Parents and students',
        note: 'Opens after sign-in (anyone not signed in is sent to the sign-in page first). Accounts are created under Parent Portal → Parent Accounts and Students → Student Accounts.',
        follow: ['/parents', 'Open Parent Accounts'],
      },
    ],
  },
];

const absolute = (path) => `${window.location.origin}${path}`;

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    /* the page may not be allowed clipboard access: fall back to selecting */
  }
  const box = document.createElement('textarea');
  box.value = text;
  box.style.position = 'fixed';
  box.style.opacity = '0';
  document.body.appendChild(box);
  box.select();
  const done = document.execCommand('copy');
  box.remove();
  return done;
}

export default function PublicLinks() {
  const [copied, setCopied] = useState('');
  const local = ['localhost', '127.0.0.1'].includes(window.location.hostname);
  const copy = async (path) => {
    if (await copyText(absolute(path))) {
      setCopied(path);
      setTimeout(() => setCopied((c) => (c === path ? '' : c)), 2000);
    }
  };

  return (
    <>
      <div className="profile-head">
        <div>
          <h1>Public links</h1>
          <p className="hint">
            The addresses to share with families, staff and students. Copy a link to send it, or open it to
            check how it looks.
          </p>
        </div>
      </div>
      {local && (
        <p className="notice">
          You are on <b>{window.location.host}</b>, an address that only works on this computer. Once the
          school's site is online, these links use its real web address; share those instead.
        </p>
      )}

      {GROUPS.map((group) => (
        <section key={group.title} className="card link-group">
          <header className="card-head">
            <span className="tile-icon blue" aria-hidden="true">
              {group.icon}
            </span>
            <span>
              <h2>{group.title}</h2>
            </span>
          </header>
          <div className="link-list">
            {group.items.map((item) => (
              <div key={item.path} className="link-row">
                <div className="link-info">
                  <b>{item.title}</b>
                  <small>For: {item.who}</small>
                  <p className="hint">{item.note}</p>
                  {item.follow && <Link to={item.follow[0]}>{item.follow[1]} →</Link>}
                </div>
                <div className="link-action">
                  <input
                    readOnly
                    value={absolute(item.path)}
                    onFocus={(e) => e.target.select()}
                    aria-label={`${item.title} address`}
                  />
                  <span className="link-buttons">
                    <button type="button" onClick={() => copy(item.path)}>
                      {copied === item.path ? '✓ Copied' : 'Copy link'}
                    </button>
                    <a className="btn ghost" href={absolute(item.path)} target="_blank" rel="noreferrer">
                      Open
                    </a>
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>
      ))}
    </>
  );
}
