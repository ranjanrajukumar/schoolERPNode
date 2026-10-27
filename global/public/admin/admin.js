// The registry's admin page: schools, their connection status, and their keys. Everything is built with textContent, never innerHTML,
// so a school's name or notes can never run as markup.
(() => {
  const $ = (id) => document.getElementById(id);
  const KEY = 'globalAdminKey';
  let schools = [];
  let editing = null; // the school being edited, or null when adding
  let timer = null;

  const el = (tag, props = {}, ...children) => {
    const node = document.createElement(tag);
    for (const [k, v] of Object.entries(props)) { if (k === 'class') node.className = v; else if (k === 'onclick') node.onclick = v; else node.setAttribute(k, v); }
    for (const c of children) node.append(c instanceof Node ? c : document.createTextNode(String(c)));
    return node;
  };
  const show = (node, on) => { node.hidden = !on; };
  const say = (id, text) => { const n = $(id); n.textContent = text ?? ''; show(n, Boolean(text)); };

  async function api(path, { method = 'GET', body } = {}) {
    const res = await fetch(`/api${path}`, { method, headers: { 'Content-Type': 'application/json', 'x-admin-key': sessionStorage.getItem(KEY) ?? '' }, body: body ? JSON.stringify(body) : undefined });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) { const err = new Error(data.error || `Request failed (${res.status})`); err.status = res.status; throw err; }
    return data;
  }

  const ago = (iso) => {
    if (!iso) return null;
    const s = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
    if (s < 60) return 'just now';
    if (s < 3600) return `${Math.round(s / 60)} min ago`;
    if (s < 86400) return `${Math.round(s / 3600)} h ago`;
    return `${Math.round(s / 86400)} d ago`;
  };
  const staleAfter = 60 * 60 * 1000; // a school reports every 15 minutes; an hour of silence is worth a look

  function envSnippet(code, key) { return `GLOBAL_URL=${location.origin}/api\nGLOBAL_CLIENT_CODE=${code}\nGLOBAL_CLIENT_KEY=${key}`; }

  function openKey(title, code, key) {
    $('keyTitle').textContent = title;
    $('keySnippet').textContent = envSnippet(code, key);
    $('keyCopy').textContent = 'Copy';
    $('keyDialog').showModal();
  }

  function render() {
    const needle = $('search').value.trim().toLowerCase();
    const shown = schools.filter((s) => !needle || `${s.code} ${s.name} ${s.city ?? ''}`.toLowerCase().includes(needle));
    const tbody = $('rows');
    tbody.replaceChildren();
    for (const s of shown) {
      const never = !s.lastSyncAt;
      const stale = !never && Date.now() - new Date(s.lastSyncAt).getTime() > staleAfter;
      const connection = !s.hasKey ? el('span', { class: 'badge bad' }, 'No key') : never ? el('span', { class: 'badge warn' }, 'Never') : stale ? el('span', { class: 'badge warn' }, ago(s.lastSyncAt)) : el('span', { class: 'badge ok' }, ago(s.lastSyncAt));
      const row = el('tr', { style: s.active ? '' : 'opacity:.6' },
        el('td', {}, el('b', {}, s.name), el('span', { class: 'sub' }, `${s.code}${s.city ? ` · ${s.city}` : ''}${s.state ? `, ${s.state}` : ''}`)),
        el('td', { class: 'api' }, s.apiUrl),
        el('td', {}, el('span', { class: `badge ${s.active ? 'ok' : 'off'}` }, s.active ? 'Active' : 'Switched off')),
        el('td', {}, String(s.logins)),
        el('td', {}, connection),
        el('td', {}, s.hasKey ? 'Set' : 'None'),
        el('td', { class: 'actions' },
          el('button', { class: 'ghost small', onclick: (e) => check(s, e.target) }, 'Check'),
          el('button', { class: 'ghost small', onclick: () => openEdit(s) }, 'Edit'),
          el('button', { class: 'ghost small', onclick: () => rotate(s) }, 'New key'),
          el('button', { class: 'ghost small', onclick: () => toggle(s) }, s.active ? 'Switch off' : 'Switch on'),
          el('button', { class: 'ghost small', style: 'color:#b3261e;border-color:#b3261e', onclick: () => removeSchool(s) }, 'Remove')));
      tbody.append(row);
    }
    show($('emptyHint'), !schools.length);
    const totalLogins = schools.reduce((n, s) => n + s.logins, 0);
    const silent = schools.filter((s) => s.active && (!s.lastSyncAt || Date.now() - new Date(s.lastSyncAt).getTime() > staleAfter)).length;
    const tiles = $('tiles');
    tiles.replaceChildren(
      el('div', { class: 'tile' }, el('span', {}, 'Schools'), el('b', {}, String(schools.length))),
      el('div', { class: 'tile' }, el('span', {}, 'Active'), el('b', {}, String(schools.filter((s) => s.active).length))),
      el('div', { class: 'tile' }, el('span', {}, 'Logins'), el('b', {}, totalLogins.toLocaleString())),
      el('div', { class: `tile${silent ? ' warn' : ''}` }, el('span', {}, 'Not reporting'), el('b', {}, String(silent))),
    );
  }

  async function load() {
    try { schools = await api('/admin/clients'); say('error', ''); render(); } catch (err) {
      if (err.status === 401 || err.status === 503) { lock(err.message); return; }
      say('error', err.message);
    }
  }

  const run = async (fn) => { say('error', ''); say('notice', ''); try { await fn(); } catch (err) { say('error', err.message); } };

  async function check(s, button) {
    button.disabled = true; button.textContent = 'Checking…';
    await run(async () => {
      const r = await api(`/admin/clients/${s.code}/check`, { method: 'POST' });
      if (r.ok) say('notice', `${s.name} answered in ${r.ms} ms.`); else say('error', r.error);
    });
    button.disabled = false; button.textContent = 'Check';
  }
  const toggle = (s) => run(async () => { await api(`/admin/clients/${s.code}`, { method: 'PUT', body: { active: !s.active } }); say('notice', `${s.name} is ${s.active ? 'switched off: people there cannot sign in through the app' : 'switched on'}.`); await load(); });
  const rotate = (s) => run(async () => {
    if (!window.confirm(`Make a new key for ${s.name}? Its server stops reporting logins until the new key is in its .env.`)) return;
    const r = await api(`/admin/clients/${s.code}/rotate-key`, { method: 'POST' });
    openKey(`New key for ${s.name}`, r.code, r.apiKey);
    await load();
  });
  const removeSchool = (s) => run(async () => {
    const typed = window.prompt(`This removes ${s.name} and all ${s.logins} of its logins from the registry. Its own server and data are not touched.\n\nType the school code (${s.code}) to confirm.`);
    if (typed === null) return;
    if (typed.trim().toLowerCase() !== s.code) { say('error', 'The code did not match, so nothing was removed.'); return; }
    await api(`/admin/clients/${s.code}`, { method: 'DELETE' });
    say('notice', `${s.name} was removed.`);
    await load();
  });

  function openAdd() {
    editing = null;
    $('schoolTitle').textContent = 'Add a school';
    for (const id of ['fCode', 'fName', 'fCity', 'fState', 'fApi', 'fLogo', 'fNotes']) $(id).value = '';
    $('fCode').disabled = false; $('fVerify').checked = true;
    say('schoolError', '');
    $('schoolDialog').showModal();
  }
  function openEdit(s) {
    editing = s;
    $('schoolTitle').textContent = `Edit ${s.name}`;
    $('fCode').value = s.code; $('fCode').disabled = true; // a code is how people find the school and is what its server reports as: it does not change
    $('fName').value = s.name; $('fCity').value = s.city ?? ''; $('fState').value = s.state ?? ''; $('fApi').value = s.apiUrl; $('fLogo').value = s.logoUrl ?? ''; $('fNotes').value = s.notes ?? '';
    $('fVerify').checked = false;
    say('schoolError', '');
    $('schoolDialog').showModal();
  }

  async function saveSchool(event) {
    event.preventDefault();
    const body = { name: $('fName').value, city: $('fCity').value, state: $('fState').value, apiUrl: $('fApi').value, logoUrl: $('fLogo').value, notes: $('fNotes').value };
    $('schoolSave').disabled = true; say('schoolError', '');
    try {
      if (editing) {
        await api(`/admin/clients/${editing.code}`, { method: 'PUT', body: { ...body, verify: $('fVerify').checked } });
        $('schoolDialog').close(); say('notice', `${body.name} was saved.`);
      } else {
        const created = await api('/admin/clients', { method: 'POST', body: { ...body, code: $('fCode').value, verify: $('fVerify').checked } });
        $('schoolDialog').close();
        openKey(`${created.name} was added: its key`, created.code, created.apiKey);
      }
      await load();
    } catch (err) { say('schoolError', err.message); } finally { $('schoolSave').disabled = false; }
  }

  function lock(message) {
    sessionStorage.removeItem(KEY);
    clearInterval(timer);
    show($('panel'), false); show($('barActions'), false); show($('gate'), true);
    say('gateError', message ?? '');
    $('keyInput').value = '';
  }
  async function open(key) {
    sessionStorage.setItem(KEY, key);
    try { schools = await api('/admin/clients'); } catch (err) { lock(err.status === 401 ? 'That key is not right.' : err.message); return; }
    say('gateError', '');
    show($('gate'), false); show($('panel'), true); show($('barActions'), true);
    render();
    clearInterval(timer); timer = setInterval(load, 30000);
  }

  $('gateForm').addEventListener('submit', (e) => { e.preventDefault(); open($('keyInput').value.trim()); });
  $('signOut').onclick = () => lock();
  $('refresh').onclick = () => run(load);
  $('addSchool').onclick = openAdd;
  $('search').addEventListener('input', render);
  $('schoolForm').addEventListener('submit', saveSchool);
  $('schoolCancel').onclick = () => $('schoolDialog').close();
  $('keyDone').onclick = () => { $('keyDialog').close(); $('keySnippet').textContent = ''; };
  $('keyCopy').onclick = async () => { try { await navigator.clipboard.writeText($('keySnippet').textContent); $('keyCopy').textContent = 'Copied'; } catch { $('keyCopy').textContent = 'Select the text and copy it'; } };

  if (sessionStorage.getItem(KEY)) open(sessionStorage.getItem(KEY));
})();
