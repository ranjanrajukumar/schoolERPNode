# Global registry

One small service and database that knows every school (client) and every login, so **one mobile app** can serve all schools. A person types a mobile number (or email) and password; the registry says which school and role they belong to; the app connects to that school's own server and signs in there. It sits next to `server/` (one school's API) and `app/` (the mobile app).

```
phone ──► global registry: mobile / email / admission no + password ──► { school, role, that school's API address, a 2-minute ticket }
  │
  └─────► that school's own server: POST /auth/sso { ticket } ──► the school's normal session (token) ──► the app
```

What the registry stores: for each school its name, city, code, logo and API address; and for each login at a school its role, name, mobile number, email, admission number (for students) and **password hash** (see *The database* below). Students' marks, fees, attendance and everything else stay in each school's own database. Each school remains the source of truth for its logins: it reports them to the registry, and the registry follows.

## How a sign-in works

1. The person enters a mobile number, an email or (students) an admission number, and a password.
2. The registry finds the logins with that phone (matched on the last ten digits, so `+91 98765 43210` and `09876543210` are the same), email or admission number, and checks the password against each. A wrong password and an unknown number get the same answer.
3. For each match it returns the school, the role, the school's API address and a **ticket**: a signed token (RS256) that names this person at this school, works **once**, for **two minutes**.
4. If there is one match the app connects straight to that school. If one person is, say, a teacher at one school and a parent at another, the app asks which account.
5. The app sends the ticket to that school's `POST /api/auth/sso`. The school checks the signature with the registry's public key, that the ticket names this school, that it has not been used, and that the login still exists, then answers like a normal sign-in.

So a school's server never sees a password from this path, and a ticket cannot be used at another school, twice, or after two minutes.

## Connecting a school

1. Add the school: `npm run client -- add --code greenfield --name "Greenfield School" --city Pune --api https://erp.greenfield.edu/api`. It prints the school's **key** once (`npm run client -- key greenfield` makes a new one and cancels the old).
2. Put three settings in that school's `server/.env`:
```
GLOBAL_URL=https://global.yourcompany.com/api
GLOBAL_CLIENT_CODE=greenfield
GLOBAL_CLIENT_KEY=<the key>
```
3. Restart the school's server. Ten seconds later it reports every login to the registry; after that it reports a login a moment after it is created or its password changes, and sends the complete list every 15 minutes (which also switches off logins that were deleted). `GET /api/global-sync` (admin) shows the state; `POST /api/global-sync` reports now.

Where a login's mobile number comes from: a teacher's staff profile phone, a parent's phone, a student's own phone or else their guardian's phone. An admin login with no staff profile is found by email only. A parent and their child who share a phone are both offered, and the person picks.

## The database

Five tables, each holding one kind of fact once, joined by foreign keys (third normal form):

```
clients ─────────┐            roles
  id  code         │ 1       id  code  (admin, teacher, accountant, parent, student)
  name  api_url    │            │ 1
  api_key_hash …   │            │
                   ▼ many       ▼ many
              identities ──────────────► mobile_numbers
                id                many ─► 1   id  number_key (unique)  digits
                client_id  → clients.id   ON DELETE CASCADE
                role_id    → roles.id     ON DELETE RESTRICT
                mobile_number_id → mobile_numbers.id   ON DELETE SET NULL
                local_user_id  (the login's id at that school)
                name  email  username  active
                  │ 1
                  ▼ 1
              credentials
                identity_id  → identities.id   ON DELETE CASCADE   (also its key)
                password_hash  updated_at
```

- **`identities`** is one row per login at one school. The school, role and phone number are references, not copies of their text, so a school renamed or a role added is one change and a typo cannot invent a role. `(client_id, local_user_id)` is unique.
- **`mobile_numbers`** holds each distinct phone once (matched on its last ten digits). A parent and a child who share a phone, or a person who works at two schools, point at the same row; signing in by phone is one indexed lookup. A number no login uses is removed.
- **`credentials`** keeps the password hash apart from who the person is: only sign-in reads it, and listings and joins on `identities` never carry it.
- **Deleting** follows the references: removing a school removes its logins and their passwords (nothing can be orphaned); a role that logins use cannot be removed; removing a phone number only clears the link.
- Every non-key column depends on its own table's key and nothing else: no repeated school codes, role names or phone numbers, and no lists in a column.

Upgrading from the first version (one wide `identities` table with the school code, role, phone and password hash on each row) is automatic: at start-up the registry rebuilds the new tables from the old table in one transaction, checks that every row of a school that still exists arrived, and only then drops the old table. Rows whose school had already been removed are not carried over.

## Run it

1. `cd global`, `npm install`.
2. Copy `.env.example` to `.env`: the MySQL settings, and a long random `GLOBAL_ADMIN_KEY`. The database (`school_erp_global` by default) is created on first start.
3. `npm start` (port 4100). `npm run dev` restarts on changes.

## Add a school

Command line (talks to the database directly, no key needed):

```
npm run client -- add --code greenfield --name "Greenfield School" --city Pune --state Maharashtra --api https://erp.greenfield.edu/api
npm run client -- list
npm run client -- update greenfield --name "Greenfield Public School"
npm run client -- update greenfield --active false     # stops offering it in the app
npm run client -- remove greenfield
```

`add` first asks the school's server (`<api>/health`) to answer, so a typo is caught now and not when a parent tries to sign in. Add `--skip-check` when the school's server is not up yet.

The same through the API, with the header `x-admin-key: <GLOBAL_ADMIN_KEY>`: `GET /api/admin/clients`, `POST /api/admin/clients`, `PUT /api/admin/clients/:code`, `DELETE /api/admin/clients/:code`. The admin API is switched off until a real key is set.

## What the app and the schools call

- `POST /api/auth/login { identifier, password }`: the sign-in above. Answers `{ accounts: [{ clientCode, clientName, city, logoUrl, apiUrl, role, name, ticket }] }`. Eight failed attempts for the same mobile number or email from one address make it wait 15 minutes; so do 200 from one address overall (`LOGIN_MAX_PER_ADDRESS`).
- `GET /api/public-key`: the key schools check tickets with.
- `POST /api/provision/identities`, `DELETE /api/provision/identities/:localUserId`, `GET /api/provision/status`: a school's server reports its logins, with `x-client-code` and `x-client-key`. It sends bcrypt hashes, never passwords; a complete list (`full: true`) switches off the rest.
- `GET /api/clients?q=green`: up to 20 active schools whose name, city or code contains the text (at least two characters; `%` and `_` are plain characters). Each answer is `{ code, name, city, state, logoUrl, apiUrl }`; the notes and dates are never sent.
- `GET /api/clients/greenfield`: one school by its code, for people who type the code they were given.
- Each address may make 90 requests a minute. Behind a reverse proxy, set `TRUST_PROXY=1` so the limit sees real phone addresses.

## School codes and addresses

- A code is 2 to 30 characters: lower-case letters, numbers and hyphens. It is what a parent types if they cannot find the school by name, so keep it short and easy to say.
- The API address is the school's server API, for example `https://erp.greenfield.edu/api`. Phones need to reach it: use a public https address in production. A school's server must allow requests from phones (mobile apps are not limited by browser cross-origin rules; the school web app's `CLIENT_ORIGIN` setting does not affect them).

## Check it

`npm test` (service running) covers the admin key, the checks on a school's details, searching, a school's key, what a school may send, switching logins and schools off, signing in by phone in four spellings, by email and by admission number, offering several accounts, the ticket's signature and lifetime, and the sign-in limit.

## Keys and production

- The registry signs tickets with a private key. Set `GLOBAL_PRIVATE_KEY` (PEM) in production; without it a key pair is made once in `global/keys/` (not committed). Back it up. A school can pin the public key with `GLOBAL_PUBLIC_KEY` instead of fetching it.
- Serve the registry and every school over https: tickets and passwords travel between the phone, the registry and the schools.
- The registry holds password hashes for every school, so protect its database like a school's own: restrict access, back it up, and keep `GLOBAL_ADMIN_KEY` secret.
