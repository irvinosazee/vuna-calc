# Pipeline Guide (GitHub Actions → Docker Hub + cPanel/FTP)

## Flow
```
push to main ──▶ GitHub Actions
                 ├── ci      : npm ci → lint → test (Jest + coverage)
                 ├── docker  : build image → push to Docker Hub   (needs ci)
                 └── deploy  : npm run build → FTP dist/ into public_html (needs ci)
                                   └─▶ http://irvin.vudse26.cloud
PRs run ci only (no docker, no deploy).
```

Three jobs, all defined in `.github/workflows/ci-cd.yml`:

- **ci** — `npm ci` → `npm run lint` → `npm test` (coverage thresholds: branches 70,
  functions/lines/statements 80). Coverage uploaded as an artifact. Runs on every push and PR.
- **docker** — builds the multi-stage `Dockerfile` (Node build → nginx serve) and pushes
  `irvinuyi/vuna-calc:latest` + a commit-SHA tag to **Docker Hub**. Runs on push to `main`.
- **deploy** — builds `dist/` and uploads it over **FTP** into `public_html`. Runs on push
  to `main`. The live site updates automatically.

`docker` and `deploy` both `needs: [ci]`, so a failing test blocks both — broken code never
ships and never gets published as an image.

---

## Why FTP (not SSH/rsync)?

The server runs **CyberPanel**, and its SSH is locked down for this account:
- SSH user `irvin4909` is a **no-login** account (its shell prints a banner that corrupts
  SFTP — "Received message too long").
- SSH user `irvin` is a **restricted shell** (rbash) that closes SFTP and blocks
  `ssh-copy-id`.

So key-based SSH/rsync isn't possible here. **CyberPanel's FTP service is separate from SSH**
and works fine, so deployment uses an FTP account (`irvin_deploy`) scoped to the website,
uploading into `public_html`.

## Why Docker builds but doesn't run on the server

cPanel/CyberPanel shared hosting **serves static files** from `public_html` — there is no
Docker daemon for your user, so a container can't *run* there. The Docker requirement from the
lab manual is satisfied by **building the image and pushing it to Docker Hub** in CI (the
"containerize + registry" stages). The image (`nginx` serving the built calculator) is a real,
runnable artifact — just hosted on Docker Hub, while the live site is served by cPanel.

---

## One-time setup (already done for this repo)

### 1. GitHub repo
`github.com/irvinosazee/vuna-calc` (private). Pushed to `main`.

### 2. FTP account (CyberPanel)
CyberPanel → **Databases & FTP → Create FTP Account** → website `irvin.vudse26.cloud`,
username `deploy` (becomes `irvin_deploy`), set a password, leave Path empty (home dir
contains `public_html`).

### 3. Docker Hub access token
hub.docker.com → **Account settings → Personal access tokens → Generate** (Read & Write).

### 4. GitHub Secrets (repo → Settings → Secrets and variables → Actions)
| Secret | Value |
|--------|-------|
| `FTP_SERVER` | `159.198.47.177` |
| `FTP_USERNAME` | `irvin_deploy` |
| `FTP_PASSWORD` | the FTP account password |
| `DOCKERHUB_USERNAME` | `irvinuyi` |
| `DOCKERHUB_TOKEN` | Docker Hub access token |

The FTP `server-dir` (`public_html/`) is set in the workflow.

### 5. Push and watch
Push to `main` → **Actions** tab → `ci` → `docker` + `deploy` → refresh
`http://irvin.vudse26.cloud`.

---

## How this maps to Mr. Iyke's manual (`CICD_Pipeline_Lab_Manual.docx`)
| Manual concept | Here |
|----------------|------|
| Node/Express app | static calculator (no server process) |
| Jest + coverage gate | same (on `src/calculator.js`) |
| ESLint | same (flat config) |
| Multi-stage Dockerfile, non-root nginx | same (`Dockerfile`) |
| Build image + push to Docker Hub | **same** (`docker` job → `irvinuyi/vuna-calc`) |
| Deploy to a Linux server | **FTP** into cPanel `public_html` (server can't run containers) |
| GitHub Secrets for deploy creds | `FTP_*` + `DOCKERHUB_*` |
| Post-deploy smoke test | refresh the live domain / `curl` it |

---

## Security
- Rotate the cPanel password, the original `irvin` SSH password, the FTP deploy password, and
  the Docker Hub token periodically — all are stored as encrypted GitHub Secrets, never in the
  repo.
- `.gitignore` excludes `.env`, keys, `node_modules`, `dist`, `coverage`.
- The calculator has no `eval()` (safe evaluator), so no arbitrary-code-execution surface.
- FTP sends credentials in cleartext; the account is a dedicated, scoped deploy user, and the
  password is easy to rotate. Upgrade path: switch `protocol: ftp` → `ftps` in the workflow if
  the host's TLS cert is trusted.

See `docs/OPERATING.md` for day-to-day usage.
