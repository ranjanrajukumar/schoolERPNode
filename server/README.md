# Server (school API)

## Summary
Node.js + Express + Sequelize (MySQL) REST API with JWT auth. One instance serves one school: the web UI (`client/`) and the mobile app (`app/`) both call it. People who sign in through the mobile app arrive with a ticket from the registry (`global/`) that this server verifies at `POST /api/auth/sso`.

## Layout
```
src/
  index.js, app.js   startup; Express setup (helmet, CORS, JSON, uploads)
  config/            env checks, database connection, SSL, migration (sync + admin seed)
  models/            one Sequelize model per table, wired in index.js
  middleware/        auth, role checks, error handling
  modules/           feature code, one folder per domain: *.routes.js -> *.service.js
  routes/index.js    mounts every module under /api
  utils/             asyncHandler, generic CRUD router
scripts/             seed-demo, check-flow, check-pages, run-process
test/                node --test suites
```

## Configuration
Copy `.env.example` to `.env`. Required: `DB_HOST`, `DB_USER`, `DB_NAME`, `JWT_SECRET`. In production also a unique `ADMIN_PASSWORD` (12+ characters) and `CLIENT_ORIGIN` as exact HTTPS origins. Optional registry link: `GLOBAL_URL`, `GLOBAL_CLIENT_CODE`, `GLOBAL_CLIENT_KEY`.

## Run
`npm run db:migrate` creates tables and the admin user, `npm run dev` or `npm start` serves on port 4000, `npm test` runs the tests, `npm run seed:demo` loads demo data.

See [../docs/CODE_STRUCTURE.md](../docs/CODE_STRUCTURE.md) for the full map.

## Process (API)
1. **Request:** `app.js` applies helmet, CORS (`CLIENT_ORIGIN`) and JSON parsing, then `routes/index.js` hands it to a module under `/api`.
2. **Sign-in:** the web UI uses `POST /api/auth/login` (email and password); the mobile app uses `POST /api/auth/sso` with a registry ticket (signature, school, single use and expiry are checked). Both return a JWT; `mustChangePassword` forces a new password first.
3. **Guard:** auth middleware reads the JWT, a role or custom-role check follows, and writes are audited.
4. **Rules:** `*.routes.js` validates input and calls `*.service.js`, where the business rules live (no double billing, marks checked against the class's subjects, staff with payslips cannot be deleted); Sequelize models read and write MySQL.
5. **Hand-off:** a finished step feeds the next process (enrol creates the student and bills fees; marks feed results and report cards; payments update balances and receipts). See [../docs/PROCESS_GUIDE.md](../docs/PROCESS_GUIDE.md).
