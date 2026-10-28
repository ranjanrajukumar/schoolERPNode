# LMS staging deployment

This guide prepares a staging environment; it does not deploy the application. The server runs Express and MySQL, the web client is a static Vite build, and LMS files are stored outside the database in a private filesystem directory.

## Required staging services

- A MySQL database and a dedicated database user. Current startup calls `CREATE DATABASE IF NOT EXISTS`, `sequelize.sync()`, and repeat-safe `ALTER TABLE` operations in `server/src/config/migration.js`. During initial staging setup, the database user needs database creation and schema alteration privileges. Do not point this startup flow at production data without a tested backup and migration window; schema upgrades are not yet tracked as versioned migration files.
- A persistent private volume for `LMS_STORAGE_DIR`, writable by the server process. Keep it outside the web server's static document root. Every API instance must use the same secured shared volume. No object storage adapter is included.
- An HTTPS reverse proxy or ingress that serves the web build and forwards `/api` to the Node server. Use one browser origin where possible. Enable `TRUST_PROXY=1` when the proxy is the trusted first hop so login throttling sees the visitor address.

## Environment

Create `server/.env` from `server/.env.example` or set these values in the staging secret manager. Never commit `.env` files.

```dotenv
NODE_ENV=production
PORT=4000
DB_HOST=mysql.internal
DB_PORT=3306
DB_USER=schoolerp_stage
DB_PASSWORD=<secret>
DB_NAME=schoolerp_stage
JWT_SECRET=<unique random secret, at least 32 characters>
ADMIN_EMAIL=stage-admin@example.edu
ADMIN_PASSWORD=<unique secret, at least 12 characters>
CLIENT_ORIGIN=https://stage.example.edu
LMS_STORAGE_DIR=/srv/schoolerp-stage/private/lms
TRUST_PROXY=1
```

Production startup now rejects the example JWT secret, a missing/default/short initial admin password, and non-HTTPS or missing `CLIENT_ORIGIN`. The admin seed credentials are used only when the users table is empty. If staging restores a backup or has any existing user, provision/reset an admin through the supported user administration flow; changing `ADMIN_PASSWORD` does not update existing hashes. Push notifications can generate VAPID keys in the database. SMTP/SMS and global registry credentials are optional for LMS core workflows; leave them unset if staging should not send external messages. Configure them only when those integrations are intentionally being tested.

## Build and start

Use the Node.js version supported by the lockfiles, install dependencies from the repository root, and build the web assets:

```powershell
npm run install:all
npm run build
npm run db:migrate
npm run start
```

`npm run db:migrate` is also the server startup migration path. Run it against a fresh staging database before the first start and review its output. The server listens on port 4000 by default. Publish `client/dist` through the HTTPS web server and configure the proxy to forward `/api/*` to the API. The Vite development proxy is only for local development and is not the staging web server.

For the optional Expo app, set `EXPO_PUBLIC_API_URL=https://stage.example.edu/api` in `app/.env` before building. The app's default API address is a local emulator address and is not suitable for staging distribution. Mobile result review and CSV reports currently use the web interface.

## Preflight checks

With a migrated staging API available and `API_URL`, `ADMIN_EMAIL`, and `ADMIN_PASSWORD` set for the test process:

```powershell
npm run test --prefix server
npm run test:lms --prefix server
npm run test:ui --prefix server
npm run build
```

The LMS integration test creates and removes temporary accounts and course records. Run it only against a disposable staging database, never a school database containing real student records. Verify the web app can sign in, create a course, enroll a test student, upload and retrieve a resource, submit and grade work, and export a filtered report. Also check the mobile app against the staging HTTPS API if mobile staging is in scope.

## Data and access controls

- Restrict database, backup, and LMS volume access to the application and operations accounts. Back up the database and LMS volume together; restoring database metadata without matching file bytes leaves broken references.
- The built-in JSON backup contains password hashes and LMS file bytes. Treat it as highly sensitive and store copies off-host with encryption and access controls.
- Course resources and student submissions are served through authenticated API routes with `private, no-store` caching and `nosniff`; do not expose the LMS storage directory as static content.
- Use a separate staging database, JWT secret, admin password, and file volume. Do not copy production student records into staging unless the school's privacy process allows it and the data is minimized or de-identified.
- Set the reverse proxy's body-size limit to permit the 25 MB teacher resource uploads plus HTTP overhead. Student assignment uploads use the existing 5 MB limit.
- Use the staging hostname in `CLIENT_ORIGIN`, terminate TLS at the proxy, and ensure browser and mobile clients use HTTPS.

## Remaining staging gates

The LMS is not certified production-ready by this audit. Before a real release, move schema changes to reviewed, versioned migrations with a rollback/restore rehearsal; add malware scanning for uploaded files; verify storage encryption, backup retention and restore procedures; run a dependency vulnerability review; and complete accessibility and responsive-device review with assistive technology and real mobile browsers. The filesystem adapter requires a single shared persistent volume and does not provide cloud object storage, high availability, or per-file retention cleanup. The existing app includes other school ERP areas whose security and privacy need a separate full application audit.
