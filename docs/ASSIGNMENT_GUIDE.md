# SEN 482 DevOps CA — Step-by-Step Guide (for everyone)

A complete, beginner-friendly walkthrough for the CI/CD CA, written to fit **any** student:
your own custom calculator feature, your own GitHub account, and your own hosting subdomain.
Swap in **your** values wherever you see `<PLACEHOLDER>`.

> **What you're building:** a stripped-down calculator, hosted on your subdomain, with a
> pipeline so that **every `git push` automatically (1) tests, (2) builds & pushes a Docker
> image, and (3) updates your live site.**

---

## 0. What the CA asks for

1. **Strip** last semester's calculator to: digits `0–9`, decimal point, `+ − × ÷`, `=`,
   the `CE`/`AC` buttons, **and your own added feature** (yours might be %, memory, √, etc.).
2. **Create a new GitHub repo** and push the calculator.
3. **Host** it on your cloud subdomain.
4. **Build a CI/CD pipeline** (GitHub Actions) so a push auto-updates the live site. The lab
   manual also expects a **Docker** stage.

---

## Your personal values (fill these in)

| Placeholder | What it is | Where to find it |
|-------------|-----------|------------------|
| `<GH_USERNAME>` | your GitHub username | github.com |
| `<REPO_NAME>` | your new repo name | you choose, e.g. `vuna-calc` |
| `<DOMAIN>` | your live subdomain | the course-rep sheet |
| `<PANEL>` | your hosting panel (cPanel / CyberPanel) | the sheet |
| `<FTP_SERVER>` | server IP | the sheet (e.g. `159.198.47.177`) |
| `<FTP_USERNAME>` | the FTP account login (see Phase 8) | shown when you create it |
| `<FTP_PASSWORD>` | the FTP account password | you set it |
| `<DOCKERHUB_USERNAME>` | your Docker Hub username | hub.docker.com |
| `<YOUR_FEATURE>` | the feature you keep | your old project |

> ⚠️ **Security:** never put a password or key in your repo. They go in GitHub **Secrets** only.
> Change any password you typed in a chat/shared place afterwards.

---

## Tools (install once)
Node.js v18+ (v20 ideal), Git, a code editor, a terminal. Optional: GitHub CLI (`gh`) and a
free **Docker Hub** account. Verify: `node --version`, `npm --version`, `git --version`.

---

## Phase 1 — Strip the calculator
Open `index.html`, delete every button except digits, `.`, `+ − × ÷`, `=`, `AC`, `CE`, and your
feature. Delete the JavaScript handlers for the removed buttons.

## Phase 2 — Separate maths from the DOM (so it's testable)
- `src/calculator.js` — **pure logic only** (no `document`, no `eval()`). Export it:
  ```js
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { evaluateExpression, myFeature };
  }
  ```
- `assets/js/script.js` — button/keyboard wiring that **calls** the engine.
- In `index.html`, load `src/calculator.js` **before** `assets/js/script.js`.

## Phase 3 — Node tooling
```bash
npm init -y
npm install --save-dev jest eslint @eslint/js
```
Add to `package.json`: scripts `test` (`jest --coverage`), `lint` (`eslint .`),
`build` (`node scripts/build.mjs`), and a Jest `coverageThreshold`. Add `eslint.config.js`
(ESLint 9 flat config) and a `.gitignore` (ignore `node_modules/ coverage/ dist/ .env`).

## Phase 4 — Tests
Create `tests/calculator.test.js` covering arithmetic **and your feature**. Run `npm test`
(green, coverage met) and `npm run lint` (clean).

## Phase 5 — Build step
`scripts/build.mjs` copies `index.html`, `assets/`, `src/` into `dist/` — the only files you
deploy. Run `npm run build`.

## Phase 6 — Dockerfile (the Docker stage)
Create `Dockerfile`:
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
Add a `.dockerignore` (ignore `node_modules dist coverage .git`).

## Phase 7 — New GitHub repo + push
```bash
git init && git add . && git commit -m "feat: stripped calculator with tests"
gh repo create <REPO_NAME> --private --source=. --remote=origin   # or create on github.com
git branch -M main
```
(Don't push yet — push after the secrets exist, so the first run can deploy.)

## Phase 8 — Create an FTP account (works even when SSH is locked down)
Most of these shared accounts (cPanel/CyberPanel) **restrict SSH**, so use FTP:
- **CyberPanel:** Databases & FTP → Create FTP Account → select your website → username
  `deploy` → set a password → leave Path empty → Create. Note the **full username** shown
  (e.g. `<owner>_deploy`).
- **cPanel:** FTP Accounts → create one with directory `public_html`.

Your web files live in **`public_html`** inside the FTP home. Test it works:
```bash
curl --user "<FTP_USERNAME>:<FTP_PASSWORD>" "ftp://<FTP_SERVER>/public_html/"
```

## Phase 9 — Docker Hub access token
hub.docker.com → Account settings → Personal access tokens → Generate (Read & Write). Copy it.

## Phase 10 — GitHub Secrets (repo → Settings → Secrets and variables → Actions)
| Secret | Value |
|--------|-------|
| `FTP_SERVER` | `<FTP_SERVER>` |
| `FTP_USERNAME` | `<FTP_USERNAME>` |
| `FTP_PASSWORD` | `<FTP_PASSWORD>` |
| `DOCKERHUB_USERNAME` | `<DOCKERHUB_USERNAME>` |
| `DOCKERHUB_TOKEN` | your Docker Hub token |

## Phase 11 — The workflow
Create `.github/workflows/ci-cd.yml` with three jobs (change the **bold** values to yours):
```yaml
name: CI/CD
on:
  push: { branches: [ main ] }
  pull_request: { branches: [ main ] }
permissions: { contents: read }
jobs:
  ci:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20', cache: 'npm' }
      - run: npm ci
      - run: npm run lint
      - run: npm test
  docker:
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
          tags: ${{ secrets.DOCKERHUB_USERNAME }}/<REPO_NAME>:latest
  deploy:
    runs-on: ubuntu-latest
    needs: [ci]
    if: github.ref == 'refs/heads/main' && github.event_name == 'push'
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20', cache: 'npm' }
      - run: npm ci
      - run: npm run build
      - uses: SamKirkland/FTP-Deploy-Action@v4.3.5
        with:
          server: ${{ secrets.FTP_SERVER }}
          username: ${{ secrets.FTP_USERNAME }}
          password: ${{ secrets.FTP_PASSWORD }}
          protocol: ftp
          local-dir: ./dist/
          server-dir: ./public_html/
```
Commit everything, then `git push -u origin main`.

## Phase 12 — Watch it deploy
GitHub → **Actions** tab → watch `ci` → `docker` + `deploy`. When green, open
`http://<DOMAIN>`. Then **prove it's automatic:** change a colour, commit, push, watch it
redeploy. That's CI/CD.

---

## Troubleshooting
| Symptom | Fix |
|--------|-----|
| `530 Login authentication failed` | Wrong FTP username/password — re-check the exact username your panel shows; reset the password and update `FTP_PASSWORD`. |
| Site unchanged after deploy | Wrong `server-dir` (should reach `public_html`), browser cache, or you pushed to a non-`main` branch. |
| `docker` login fails | Token expired/wrong — regenerate the Docker Hub token, update `DOCKERHUB_TOKEN`. |
| SSH/SFTP won't work | Expected on many shared accounts — use FTP (Phase 8). |
| `ci` fails | A test failed or coverage too low — run `npm test` locally and fix. |

## Final checklist
- [ ] Only allowed buttons + your feature.
- [ ] `npm test` + `npm run lint` pass.
- [ ] New GitHub repo pushed.
- [ ] FTP account works; Docker Hub token created; 5 secrets added.
- [ ] Push to `main` runs `ci` → `docker` + `deploy`, all green.
- [ ] `http://<DOMAIN>` shows your change automatically; image is on Docker Hub.
- [ ] Passwords/tokens rotated after setup.

> This matches Mr. Iyke's CI/CD manual: GitHub Actions + Jest + ESLint + **Docker image to a
> registry**, with deployment by **FTP** because shared hosting can't run containers or
> (usually) accept SSH key deploys.
