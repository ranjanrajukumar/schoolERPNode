# Running School ERP on Windows: a service behind IIS

How the pieces fit:

```
 browser ──HTTPS──▶ IIS (port 443)
                      ├─ serves the web app (client\dist)
                      └─ passes /api/... to ──▶ School ERP API (Windows service, Node.js, 127.0.0.1:4000) ──▶ MySQL
```

People only ever talk to IIS over HTTPS. The API is not reachable from outside the machine, and no one needs to install anything in
the browser.

Files in this repository that do the work:

| File | What it is |
|---|---|
| `deploy\windows\install-service.ps1` | Installs the API as a Windows service (start with the machine, restart on failure, own low-privilege account, logs) |
| `deploy\windows\uninstall-service.ps1` | Removes the service. Leaves the program, `.env` and data alone |
| `deploy\windows\web.config` | The IIS site: `/api` goes to the service, other addresses open the web app, caching and upload limits |

> **Status: written and checked, not yet run on a real server.** The scripts were syntax-checked and the installer's dry run was
> exercised, the rewrite rules were tested against the built web app, and `web.config` was checked as XML. The service install and
> the IIS proxy were **not** run, because the machine they were written on has neither NSSM nor the IIS URL Rewrite and proxy
> modules. Do the steps on a test server first and use the checklist in step 6.

---

## 1. What you need

| Need | Notes |
|---|---|
| Windows Server 2019+ (or Windows 10/11 for a trial) | |
| IIS | Server Manager > Add roles > Web Server (IIS). Include *Static Content*, *Default Document*, *HTTP Errors*, *Request Filtering* |
| **URL Rewrite** and **Application Request Routing (ARR)** | Free Microsoft add-ons for IIS. Install both from Microsoft's IIS site |
| Node.js **22 or later** | Install for all users, so the service account can run it |
| **NSSM** | The service wrapper. Download from <https://nssm.cc>, check it yourself, and keep it somewhere only administrators can write |
| MySQL | A server this machine can reach. A hosted one needs `DB_SSL=true` and its CA certificate (see `server\.env.example`) |
| A TLS certificate for your address | Bound to the IIS site in step 4 |

## 2. Prepare the program

In the folder you deploy to (for example `D:\SchoolErp`):

```powershell
cd D:\SchoolErp\server
npm ci --omit=dev

cd ..\client
npm ci
npm run build          # makes client\dist
```

Copy `server\.env.example` to `server\.env` and fill it in. These matter most in production, and the application refuses to start
without them:

| Setting | Rule |
|---|---|
| `JWT_SECRET` | A private random value, **32 characters or more**. Never share or reuse it |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD` | A unique password, **12 characters or more**. Used only while there are no users |
| `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` (`DB_PORT`, `DB_SSL`, `DB_SSL_CA_PEM`) | Your MySQL |
| `CLIENT_ORIGIN` | The address people type, with `https://`, for example `https://erp.school.example` |

The installer sets these for the service, so leave them out of `.env`: `NODE_ENV=production`, `PORT`, `TRUST_PROXY=1`,
`LMS_STORAGE_DIR`, `BACKUP_DIR`, `REPORT_TMP_DIR`.

Optional, for reports (defaults are fine for most schools):

| Setting | Default | Meaning |
|---|---|---|
| `REPORT_WORKERS` | 2 | Reports built at the same time. More uses more memory and processor |
| `REPORT_MAX_ACTIVE_PER_USER` | 3 | Reports one person can have in progress at once |
| `REPORT_FILE_TTL_MIN` | 60 | Minutes a finished PDF or Excel file is kept before it is deleted |
| `REPORT_TIMEOUT_MS` | 120000 | A report that takes longer than this is stopped |

## 3. Install the service

Open PowerShell **as administrator**, in `deploy\windows`. **Always run the dry run first**: it checks everything and prints what it
would do, and changes nothing.

```powershell
.\install-service.ps1 -Root D:\SchoolErp -Nssm C:\Tools\nssm\win64\nssm.exe -DryRun
.\install-service.ps1 -Root D:\SchoolErp -Nssm C:\Tools\nssm\win64\nssm.exe
```

It checks Node 22+, `server\.env` (it never prints a value), and refuses weak production settings. Then it creates
`D:\SchoolErpData` (`logs`, `reports`, `lms`, `backups`), installs the service `SchoolErpApi`, makes it start automatically and
restart if it stops, runs it as the virtual account `NT SERVICE\SchoolErpApi` (read the program, write only the data folder), starts
it, and waits for `http://127.0.0.1:4000/api/health`.

The first start also brings the database up to date, which can take a few minutes against a remote database. **Take a database
backup before the first start and before every update.**

Useful afterwards:

```powershell
Get-Service SchoolErpApi
Restart-Service SchoolErpApi
Get-Content D:\SchoolErpData\logs\api.err.log -Tail 50
```

## 4. Put IIS in front

1. **Install** URL Rewrite and ARR. In IIS Manager, select the *server* > **Application Request Routing Cache** > *Server Proxy
   Settings* > tick **Enable proxy**. Set **Time-out** to **300** seconds (the default of 120 is short for large reports).
2. **Create the site**: a folder such as `D:\Sites\SchoolErp`, and an IIS site pointing at it with a binding for your address and
   port 443 and your certificate.
3. **Publish the web app** into that folder, and add the configuration:

   ```powershell
   robocopy D:\SchoolErp\client\dist D:\Sites\SchoolErp /MIR /XF web.config
   Copy-Item D:\SchoolErp\deploy\windows\web.config D:\Sites\SchoolErp\web.config -Force
   ```

4. **Do not open port 4000** in the Windows firewall. Only IIS, on the same machine, should reach it.
5. Redirect port 80 to 443 if you want (IIS: *URL Rewrite* > *Add Rule(s)* > *Blank rule* with an HTTP-to-HTTPS redirect).

## 5. Updating

```powershell
Stop-Service SchoolErpApi
# take a database backup now
cd D:\SchoolErp; git pull
cd server; npm ci --omit=dev
cd ..\client; npm ci; npm run build
robocopy D:\SchoolErp\client\dist D:\Sites\SchoolErp /MIR /XF web.config
Start-Service SchoolErpApi          # the first start applies any database changes
```

## 6. Check it works

Run these from another computer, then open the site in a browser.

| Check | Expect |
|---|---|
| `https://erp.school.example/api/health` | `{"ok":true}` |
| `https://erp.school.example/report-designer` (after signing in) and a refresh of the page | The page loads, not a 404 |
| `http://<server>:4000/api/health` from another computer | **Does not answer** (the firewall is closed) |
| Sign in as the admin, open **Reports → Report Designer → Preview** | A PDF preview |
| **Reports → Saved Reports**, build a PDF and an Excel file | Both open or download |
| Stop the service, wait, and look: `Get-Service SchoolErpApi` | It is running again (it restarts itself) |
| Restart the machine | The service is running without anyone signing in |

## 7. Backups

Keep a copy, off the server, of: the **database**, `server\.env`, and `D:\SchoolErpData\lms` and `\backups`. Generated reports in
`D:\SchoolErpData\reports` are temporary and need no backup.

## 8. When something is wrong

| What you see | Likely cause and fix |
|---|---|
| IIS says **500.50** or **502** for `/api` | ARR proxy is not enabled, or the service is stopped. Step 4.1, and `Get-Service SchoolErpApi` |
| The site opens but nothing loads, `/api` gives 404 | `web.config` is missing from the site folder, or the rewrite module is not installed |
| The service stops straight away | `D:\SchoolErpData\logs\api.err.log`. Usually a missing or weak `.env` setting, or MySQL unreachable |
| Everyone seems to come from one address | `TRUST_PROXY=1` was not applied. Check `nssm get SchoolErpApi AppEnvironmentExtra` |
| A big report fails after about two minutes | The ARR time-out (step 4.1), or `REPORT_TIMEOUT_MS` |
| Uploads of large files fail | `maxAllowedContentLength` in `web.config` (100 MB) or the application's own limit |
| Reports are slow when many people ask at once | Raise `REPORT_WORKERS` a little; each one takes processor and memory |

## 9. Limits to know about

- **One API instance.** The per-person report limit and the report queue live in memory, so run a single copy of the service. Running
  several would multiply those limits.
- **Report files are temporary** and kept for an hour by default, then deleted. The record of who built what stays in the history.
- **Uninstalling** (`uninstall-service.ps1`) removes only the service.
