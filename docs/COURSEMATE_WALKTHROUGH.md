# SEN 482 DevOps CA — In-Depth Walkthrough (my exact flow)

This is the **full, follow-along** version of how I built and shipped the CA — every step,
every command, and the real problems I hit and how I solved them. Follow it top to bottom and
you'll end with the same result: a stripped calculator, **tested**, **containerised on Docker
Hub**, and **auto-deployed to your live subdomain** on every `git push`.

> It's written so you copy commands almost verbatim — only swap the `<PLACEHOLDERS>` for your
> own values. Your *custom feature* will differ from mine (mine was combination & permutation,
> `nCr`/`nPr`); everything else is the same.

---

## What you'll end up with

```
edit code → git push (main)
                 │
                 ▼  GitHub Actions runs automatically
   ┌─────────────┼──────────────────────────┐
   ▼             ▼                            ▼
 ci             docker                       deploy
 lint + test    build image →  Docker Hub    build → FTP → public_html
 (the gate)     irvinuyi/vuna-calc:latest    http://<your-domain>
```

Three GitHub Actions jobs. `ci` must pass before `docker` and `deploy` run. A push to `main`
ships; a Pull Request only tests.

---

## Part 0 — Before you start

**Install:** Node.js v20, Git, VS Code, a terminal. Recommended: GitHub CLI (`gh`) and a free
**Docker Hub** account. Check:
```bash
node --version   # v20.x
npm --version
git --version
gh --version      # optional but makes repo creation 1 command
```

**Collect your personal values** (from the course-rep's sheet + your own choices). Keep a note:

| Placeholder | Meaning | Example (mine) |
|---|---|---|
| `<GH_USERNAME>` | GitHub username | `irvinosazee` |
| `<REPO_NAME>` | new repo name | `vuna-calc` |
| `<DOMAIN>` | your live subdomain | `irvin.vudse26.cloud` |
| `<FTP_SERVER>` | server IP | `159.198.47.177` |
| `<DOCKERHUB_USERNAME>` | Docker Hub username | `irvinuyi` |

> 🔐 **Never commit passwords or keys.** They go only into **GitHub Secrets** (encrypted).
> Change any password you typed somewhere shared after you're done.

---

## Part 1 — Strip the calculator and keep your feature

1. Copy last semester's calculator into a clean folder.
2. Open `index.html`, find the keypad (`<div class="btn-grid">` or your equivalent), and
   **delete every button** except:
   - digits `0–9` and `.`
   - `+ − × ÷` and `=`
   - `AC` and `CE`
   - the button(s) for **your feature**
3. In your JS, **delete the handlers** of the buttons you removed (no dead code).

**Make the logic testable** — split into two files:

`src/calculator.js` — pure maths, **no DOM, no `eval()`**, exported for tests:
```js
'use strict';
function evaluateExpression(expr) { /* parse "2+3" → 5, throw on error */ }
function myFeature(/* ... */) { /* your feature */ }

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { evaluateExpression, myFeature };
}
```
> I replaced `eval()` with a small **tokenizer → shunting-yard → RPN** evaluator. You don't
> have to go that far, but "no `eval()`" is a strong defense point. The key is: pure functions
> that take input and return a result.

`assets/js/script.js` — the wiring only (button clicks, keyboard, updating the display) that
**calls** the engine.

In `index.html`, load the engine **before** the wiring:
```html
<script src="src/calculator.js"></script>
<script src="assets/js/script.js"></script>
```

---

## Part 2 — Tests, linting, build

```bash
npm init -y
npm install --save-dev jest eslint @eslint/js
```

`package.json` — add scripts + a coverage gate:
```json
{
  "scripts": {
    "test": "jest --coverage",
    "lint": "eslint .",
    "build": "node scripts/build.mjs"
  },
  "jest": {
    "testEnvironment": "node",
    "collectCoverageFrom": ["src/**/*.js"],
    "coverageThreshold": { "global": { "branches": 60, "functions": 80, "lines": 80, "statements": 80 } }
  }
}
```

`eslint.config.js` (ESLint 9 flat config):
```js
const js = require('@eslint/js');
module.exports = [
  { ignores: ['dist/', 'coverage/', 'node_modules/', 'assets/js/bootstrap.min.js', 'assets/css/'] },
  js.configs.recommended,
  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 2021, sourceType: 'commonjs',
      globals: { window:'readonly', document:'readonly', localStorage:'readonly', console:'readonly',
                 module:'writable', require:'readonly', process:'readonly',
                 evaluateExpression:'readonly', describe:'readonly', it:'readonly', expect:'readonly' },
    },
    rules: { 'no-unused-vars':'warn', 'eqeqeq':'error', 'semi':['error','always'] },
  },
  { files:['**/*.mjs'], languageOptions:{ ecmaVersion:2021, sourceType:'module', globals:{ console:'readonly' } } },
];
```

`.gitignore`:
```
node_modules/
coverage/
dist/
.env
*.log
.DS_Store
```

`tests/calculator.test.js` — test arithmetic **and your feature**:
```js
const { evaluateExpression, myFeature } = require('../src/calculator');
describe('arithmetic', () => {
  it('adds', () => expect(evaluateExpression('2+3')).toBe(5));
  it('precedence', () => expect(evaluateExpression('2+3*4')).toBe(14));
  it('rejects nonsense', () => expect(() => evaluateExpression('2&3')).toThrow());
});
describe('my feature', () => {
  it('works', () => expect(myFeature(/* in */)).toBe(/* out */));
});
```

Run them until green:
```bash
npm test       # all pass, coverage met
npm run lint   # 0 errors
```

`scripts/build.mjs` — assembles the deployable folder:
```js
import { rmSync, mkdirSync, cpSync } from 'node:fs';
rmSync('dist', { recursive: true, force: true });
mkdirSync('dist', { recursive: true });
cpSync('index.html', 'dist/index.html');
cpSync('assets', 'dist/assets', { recursive: true });
cpSync('src', 'dist/src', { recursive: true });
console.log('Build complete -> dist/');
```
```bash
npm run build   # creates dist/
```

---

## Part 3 — Dockerfile (the Docker stage)

`Dockerfile`:
```dockerfile
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run lint && npm test && npm run build

FROM nginx:alpine AS production
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
```

`.dockerignore`:
```
node_modules
coverage
dist
.git
.github
docs
*.md
.DS_Store
```

> **Why Docker if cPanel can't run it?** Right — shared hosting serves static files; it has no
> Docker daemon. So the pipeline **builds the image and pushes it to Docker Hub** (the manual's
> "containerise + registry" stage). The live site is still the static files on cPanel. You can
> prove the image runs with `docker run -p 8080:80 <DOCKERHUB_USERNAME>/<REPO_NAME>:latest`.

---

## Part 4 — Create the GitHub repo

First commit:
```bash
git init
git add .
git commit -m "feat: stripped calculator with tests and Dockerfile"
```

Create the repo (I used `gh`, which does it in one command — keep it **private**):
```bash
gh auth login                                  # if not already logged in
gh repo create <REPO_NAME> --private --source=. --remote=origin
```
> No `--push` yet — we push **after** the secrets exist, so the first run can actually deploy.
> Prefer the website? Make an empty repo on github.com (no README), then
> `git remote add origin https://github.com/<GH_USERNAME>/<REPO_NAME>.git`.

---

## Part 5 — Docker Hub access token

1. hub.docker.com → log in.
2. Avatar → **Account settings → Personal access tokens → Generate new token**.
3. Description `github-actions`, permissions **Read & Write** → **Generate**.
4. **Copy it now** (shown once). Looks like `dckr_pat_xxxxxxxx`.

---

## Part 6 — Hosting: use **FTP** (this is the part that fights you)

> **The big lesson:** these shared accounts (cPanel / **CyberPanel**) usually **lock down SSH**,
> so SSH keys and `rsync` won't work. I burned an hour on SSH before switching to **FTP**, which
> is a separate service that just works. Save yourself the time — go straight to FTP.

What I actually hit (so you recognise it):
- CyberPanel's **"Add SSH Key"** button looked promising but **didn't save** the key.
- `ssh-copy-id` failed with `rbash: exec: restricted` (restricted shell).
- The website SSH user was **no-login** — SFTP died with `Received message too long`.

**So: create an FTP account instead.**

- **CyberPanel:** left menu → **Databases & FTP → Create FTP Account** → select your website →
  FTP Username `deploy` → set/note a password → **leave Path empty** → **Create FTP Account**.
- **cPanel:** **FTP Accounts** → create one, directory `public_html`.

**Find your exact FTP username — don't trust the preview.** CyberPanel showed me a side-preview
`irvin_deploy` but a success banner saying `irvin.vudse26.cloud_deploy`. **The one that actually
logged in was `irvin_deploy`.** So test both. Your web files live in **`public_html`** inside
the FTP home.

**Test the login from your terminal with `curl`** (works even without an FTP app):
```bash
curl --user "<FTP_USERNAME>:<FTP_PASSWORD>" "ftp://<FTP_SERVER>/public_html/"
```
- `530 Login authentication failed` → wrong username **or** password. Re-check the exact
  username; if unsure, in CyberPanel reset the FTP account password to a **plain letters+digits**
  value (special characters caused mismatches for me) and try again.
- A directory listing → 🎉 you're in. Confirm you can write:
```bash
echo hi > t.txt
curl --user "<FTP_USERNAME>:<FTP_PASSWORD>" -T t.txt "ftp://<FTP_SERVER>/public_html/t.txt"   # uploads
```

---

## Part 7 — Add the GitHub Secrets

Repo → **Settings → Secrets and variables → Actions → New repository secret**. Add five:

| Secret | Value |
|--------|-------|
| `FTP_SERVER` | `<FTP_SERVER>` |
| `FTP_USERNAME` | the username that logged in (e.g. `irvin_deploy`) |
| `FTP_PASSWORD` | your FTP password |
| `DOCKERHUB_USERNAME` | `<DOCKERHUB_USERNAME>` |
| `DOCKERHUB_TOKEN` | the `dckr_pat_…` token |

With `gh` it's faster:
```bash
gh secret set FTP_SERVER --body "<FTP_SERVER>"
gh secret set FTP_USERNAME --body "<FTP_USERNAME>"
gh secret set FTP_PASSWORD --body "<FTP_PASSWORD>"
gh secret set DOCKERHUB_USERNAME --body "<DOCKERHUB_USERNAME>"
gh secret set DOCKERHUB_TOKEN --body "dckr_pat_xxxxxxxx"
gh secret list
```

---

## Part 8 — The workflow file

`.github/workflows/ci-cd.yml` (change the **bold** values to yours):
```yaml
name: CI/CD

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

permissions:
  contents: read

jobs:
  ci:
    name: Lint & Test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20', cache: 'npm' }
      - run: npm ci
      - run: npm run lint
      - run: npm test
      - uses: actions/upload-artifact@v4
        if: always()
        with: { name: coverage, path: coverage/, retention-days: 14 }

  docker:
    name: Docker Build & Push
    runs-on: ubuntu-latest
    needs: [ci]
    if: github.ref == 'refs/heads/main' && github.event_name == 'push'
    steps:
      - uses: actions/checkout@v4
      - uses: docker/setup-buildx-action@v3
      - uses: docker/login-action@v3
        with:
          username: ${{ secrets.DOCKERHUB_USERNAME }}
          password: ${{ secrets.DOCKERHUB_TOKEN }}
      - uses: docker/build-push-action@v6
        with:
          context: .
          push: true
          tags: |
            ${{ secrets.DOCKERHUB_USERNAME }}/<REPO_NAME>:latest
            ${{ secrets.DOCKERHUB_USERNAME }}/<REPO_NAME>:${{ github.sha }}

  deploy:
    name: Deploy via FTP
    runs-on: ubuntu-latest
    needs: [ci]
    if: github.ref == 'refs/heads/main' && github.event_name == 'push'
    environment:
      name: production
      url: http://<DOMAIN>
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20', cache: 'npm' }
      - run: npm ci
      - run: npm run build
      - uses: SamKirkland/FTP-Deploy-Action@v4.3.5
        with:
          server:    ${{ secrets.FTP_SERVER }}
          username:  ${{ secrets.FTP_USERNAME }}
          password:  ${{ secrets.FTP_PASSWORD }}
          protocol:  ftp
          local-dir: ./dist/
          server-dir: ./public_html/
```

**What each part means:**
- `on:` — run on pushes to `main` and PRs into `main`.
- `ci` — installs, lints, tests; uploads the coverage report. The **gate**.
- `needs: [ci]` — `docker` and `deploy` only run if `ci` passed.
- `if: …main … push` — they only fire on a real push to `main`, never on PRs.
- `docker` — logs into Docker Hub and pushes your image.
- `deploy` — builds `dist/` and FTPs it into `public_html`.

---

## Part 9 — Push and watch it run

```bash
git add .
git commit -m "ci: GitHub Actions pipeline (test, docker build, FTP deploy)"
git push -u origin main
```

Watch it:
- **Browser:** `https://github.com/<GH_USERNAME>/<REPO_NAME>/actions` → click the run.
- **Terminal:** `gh run watch` (live), `gh run list` (recent), `gh run view --log` (full logs).

---

## Part 10 — Verify it actually worked

```bash
# live site
curl -s -o /dev/null -w "%{http_code}\n" http://<DOMAIN>/        # expect 200
curl -s http://<DOMAIN>/ | grep -i "calculator"                  # your content

# docker image (public repos)
curl -s "https://hub.docker.com/v2/repositories/<DOCKERHUB_USERNAME>/<REPO_NAME>/tags/"
```
Open `http://<DOMAIN>` in a browser — your calculator should be live.

---

## Part 11 — Prove the automation (do this in your defense)

```bash
# change something visible, e.g. a colour in your CSS
git add -A && git commit -m "tweak: change accent colour"
git push
gh run watch          # watch ci → docker → deploy go green
```
Refresh `http://<DOMAIN>` — the change appears in ~30s with no manual upload. **That is CI/CD.**

---

## The traps I hit (so you don't)

| Trap | What happened | Fix |
|------|---------------|-----|
| SSH keys on CyberPanel | "Add Key" didn't save; `rbash: restricted`; SFTP "message too long" | Don't use SSH on shared hosting — use **FTP**. |
| Wrong FTP username | Preview said `x_deploy`, banner said `domain_deploy`; only one logged in | **Test the login** with `curl`; use whichever returns a listing. |
| FTP `530` with special-char password | Generated password with `#@%` mismatched | Reset to **letters+digits only**. |
| First deploy failed | Secrets weren't set before the first push | Create repo → add secrets → *then* push. |
| Repo public would leak server IP | Docs contain the server IP/FTP user | Keep the repo **private**; add the lecturer as a collaborator. |
| "Node 20 deprecated" warning | Scary-looking annotation | It's a future-dated warning, **not** a failure. |

---

## Security (don't skip)
- Rotate any password/token you typed somewhere shared, after setup.
- All credentials live in **GitHub Secrets**, never in the repo.
- Keep the repo **private**; share with the lecturer via collaborator access.

## Final checklist
- [ ] Calculator shows only the allowed buttons + your feature.
- [ ] `npm test` + `npm run lint` pass locally.
- [ ] `Dockerfile` builds; new GitHub repo created.
- [ ] FTP login verified with `curl`; Docker Hub token created; **5 secrets** set.
- [ ] Push to `main` → `ci` → `docker` + `deploy`, **all green**.
- [ ] `http://<DOMAIN>` shows your change automatically; image is on Docker Hub.
- [ ] Passwords/tokens rotated; repo private; lecturer added.

> Mirrors Mr. Iyke's CI/CD manual — GitHub Actions + Jest + ESLint + **Docker image to a
> registry** — with **FTP** deployment because shared hosting can't run containers or accept
> SSH-key deploys.
