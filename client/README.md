# Client (web UI)

## Summary
React 18 + Vite admin, teacher and parent web app for one school. It talks only to that school's `server/` over `/api/*` (Vite proxies `/api` to `http://localhost:4000` in development) and keeps the signed-in user in `context/AuthContext.jsx`.

## Layout
```
src/
  modules/     pages grouped by domain (academics, finance, exams, hr, library, ...)
  components/  shared UI: ResourcePage (generic CRUD page), Sidebar, Modal, TableCard, pickers
  config/      menu.js, the sidebar structure
  context/     AuthContext, ThemeContext
  hooks/       useOpenNew, usePhotoSet, useSchoolBrand
  layouts/     AppLayout (sidebar + page frame)
  routes/      route table, wrapped by ProtectedRoute
  services/    api.js (fetch wrapper, token, error handling), settings.js
  utils/       dates.js
```


## Process (web)
1. **Sign in:** email and password go to `POST /api/auth/login`; the JWT is kept in `localStorage`. Sign-in waits up to about 90 seconds for a sleeping free-tier server to wake.
2. **Session:** `AuthContext` reads the user from the token, then loads `/auth/me` for permissions, custom role, staff id and assigned classes. A temporary password must be replaced before anything else opens.
3. **Menu and routes:** `config/menu.js` builds the sidebar from the role and permissions; `ProtectedRoute` guards each route. The server enforces every permission again.
4. **Work:** each page in `modules/` follows the school's processes (admissions, academics, attendance, exams, fees, HR, library, transport, hostel, portal, communication, year end) through `services/api.js`. Reads retry briefly when the server restarts; saves are never retried.
5. **Sign out:** the token is cleared.

The business processes themselves, end to end, are in [../docs/PROCESS_GUIDE.md](../docs/PROCESS_GUIDE.md); the owner-level view is in [../docs/PROCESS_ARCHITECTURE.md](../docs/PROCESS_ARCHITECTURE.md).

## Run
`npm install`, then `npm run dev` (port 5173) or `npm run build` for `dist/`. From the repo root, `npm run dev` starts client, server and global together.

See [../docs/CODE_STRUCTURE.md](../docs/CODE_STRUCTURE.md) for the full map.
