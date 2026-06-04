# SEN 482 DevOps CA — Step-by-Step Guide (for everyone)

A complete, beginner-friendly walkthrough for the CI/CD CA. It is written to fit **any**
student: your own custom calculator feature, your own GitHub account, and your own cPanel
subdomain. Wherever you see a `<PLACEHOLDER>`, swap in **your** value — the guide tells you
where each value comes from.

> **What you're building:** a stripped-down calculator, hosted on your cPanel subdomain, with
> a pipeline so that **every `git push` automatically updates your live site**.

---

## 0. What the CA asks for (the rubric, in plain English)

1. **Strip** last semester's calculator to: digits `0–9`, the decimal point, the basic
   operators `+ − × ÷`, the `=` button, the `CE` and `AC` utility buttons, **and the one
   feature you personally added** (yours might be %, memory, square root, BMI, combinations…
   — whatever you built).
2. **Create a new GitHub repository** and push the calculator to it.
3. **Host** the calculator on **your cPanel** (your subdomain).
4. **Build a CI/CD pipeline** (GitHub Actions) connecting your repo to your cPanel, so a
   push automatically reflects on your live site.

---

## Your personal values (fill these in first)

Get these from the course-rep's Google sheet / the credentials message. Write them down:

| Placeholder | What it is | Example | Where to find it |
|-------------|-----------|---------|------------------|
| `<GH_USERNAME>` | your GitHub username | `irvin` | github.com |
| `<REPO_NAME>` | your new repo name | `vuna-calc` | you choose |
| `<DOMAIN>` | your live subdomain | `irvin.vudse26.cloud` | the sheet |
| `<SSH_HOST>` | server IP | `159.198.47.177` | the sheet |
| `<SSH_PORT>` | SSH port | `22` | the sheet |
| `<SSH_USER>` | cPanel/SSH username | `irvin` | the sheet |
| `<DEPLOY_PATH>` | your web root on the server | `/home/<SSH_USER>.vudse26.cloud/public_html` | cPanel File Manager |
| `<YOUR_FEATURE>` | the feature you keep | e.g. % or memory | your old project |

> ⚠️ **Security:** treat the cPanel/SSH passwords in the sheet as private. After setup, change
> them (cPanel → Modify User; SSH → `passwd`). **Never** put a password or private key in your
> repo — they go in GitHub **Secrets** only.

---

## Tools to install (once)

- **Node.js** (v18+ ; v20 recommended) and **npm** → https://nodejs.org
- **Git** → https://git-scm.com
- A code editor (VS Code).
- A terminal (macOS/Linux Terminal, or Git Bash / WSL on Windows).
- Optional: **GitHub CLI** (`gh`) → https://cli.github.com (lets you create the repo from the terminal).

Verify:
```bash
node --version    # v18+ or v20
npm --version
git --version
```

---

## Phase 1 — Get and strip the calculator

1. Put last semester's calculator files in a fresh folder, e.g. `mycalc/`.
   Typical files: `index.html`, `assets/css/…`, `assets/js/…`.
2. Open `index.html`. Find the keypad (the block of `<button>`s).
3. **Delete every button you don't need.** Keep only:
   - digits `0 1 2 3 4 5 6 7 8 9` and `.`
   - `+ − × ÷` and `=`
   - `AC` (all clear) and `CE` (clear entry)
   - the button(s) for **`<YOUR_FEATURE>`**
4. In your JavaScript, **delete the handlers** for the buttons you removed, so no dead code
   remains.

> Goal: the screen should show only the allowed buttons, and everything still works.

---

## Phase 2 — Make the maths testable (important for the marks)

CI needs **automated tests**, and tests are easiest when the maths is separated from the
buttons. Split your JS into two files:

- `src/calculator.js` — **pure logic only**: functions that take input and return a result.
  **No `document`, no buttons, no `eval()`.** Example shape:
  ```js
  'use strict';
  function evaluateExpression(expr) {
    // parse expr (e.g. "2+3") and return a number; throw on error
  }
  // your feature, e.g.:
  function myFeature(x) { /* ... */ return result; }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { evaluateExpression, myFeature };
  }
  ```
  The `module.exports` guard lets Node/Jest `require()` it **and** lets the browser use it via
  a `<script>` tag (no build tool needed).

- `assets/js/script.js` — **the wiring only**: reads/writes the display, handles button
  clicks, and **calls** `evaluateExpression(...)`. It keeps one string of the current input
  and calls the engine when `=` is pressed.

In `index.html`, load the engine **before** the wiring:
```html
<script src="src/calculator.js"></script>
<script src="assets/js/script.js"></script>
```

> Why split? So you can test the maths in Node without a browser, and so each file does one job.
> Replacing `eval()` with a small parser is also a strong talking point in your defense.

---

## Phase 3 — Add Node tooling (tests + linting)

In your project folder:

```bash
npm init -y
npm install --save-dev jest eslint @eslint/js
```

Edit `package.json` so the `scripts` and Jest config look like this (keep your own `name`):
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
    "coverageThreshold": {
      "global": { "branches": 60, "functions": 80, "lines": 80, "statements": 80 }
    }
  }
}
```

Create `eslint.config.js` (ESLint 9 flat config):
```js
const js = require('@eslint/js');
module.exports = [
  { ignores: ['dist/', 'coverage/', 'node_modules/', 'assets/js/bootstrap.min.js', 'assets/css/'] },
  js.configs.recommended,
  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 2021,
      sourceType: 'commonjs',
      globals: {
        window: 'readonly', document: 'readonly', localStorage: 'readonly', console: 'readonly',
        module: 'writable', require: 'readonly', process: 'readonly',
        // add the engine functions your script.js calls, e.g.:
        evaluateExpression: 'readonly',
        describe: 'readonly', it: 'readonly', expect: 'readonly',
      },
    },
    rules: { 'no-unused-vars': 'warn', 'eqeqeq': 'error', 'semi': ['error', 'always'] },
  },
  { files: ['**/*.mjs'], languageOptions: { ecmaVersion: 2021, sourceType: 'module', globals: { console: 'readonly' } } },
];
```

Create `.gitignore`:
```
node_modules/
coverage/
dist/
.env
.env.*
*.log
.DS_Store
```

---

## Phase 4 — Write tests

Create `tests/calculator.test.js`. Test your engine **and** your feature:
```js
const { evaluateExpression, myFeature } = require('../src/calculator');

describe('arithmetic', () => {
  it('adds', () => expect(evaluateExpression('2+3')).toBe(5));
  it('multiplies', () => expect(evaluateExpression('6*7')).toBe(42));
  it('respects precedence', () => expect(evaluateExpression('2+3*4')).toBe(14));
  it('rejects nonsense', () => expect(() => evaluateExpression('2&3')).toThrow());
});

describe('my feature', () => {
  it('does the thing', () => expect(myFeature(/* input */)).toBe(/* expected */));
});
```
Run them:
```bash
npm test      # all green, and coverage must meet the thresholds
npm run lint  # 0 errors
```
Add more tests until coverage passes. **Tests must be green — CI will block deploy if not.**

---

## Phase 5 — Add a build step (clean deploy folder)

Create `scripts/build.mjs`:
```js
import { rmSync, mkdirSync, cpSync } from 'node:fs';
rmSync('dist', { recursive: true, force: true });
mkdirSync('dist', { recursive: true });
cpSync('index.html', 'dist/index.html');
cpSync('assets', 'dist/assets', { recursive: true });
cpSync('src', 'dist/src', { recursive: true });
console.log('Build complete -> dist/');
```
Run `npm run build` → it creates `dist/` (only the files you actually deploy). If your file
layout differs, adjust the `cpSync` lines to copy whatever your site needs.

---

## Phase 6 — Create the GitHub repo and push

```bash
git init
git add .
git commit -m "feat: stripped calculator with tests"
```

**With GitHub CLI (easiest):**
```bash
gh auth login
gh repo create <REPO_NAME> --public --source=. --remote=origin --push
```

**Or manually:** create an empty repo named `<REPO_NAME>` on github.com (no README), then:
```bash
git remote add origin https://github.com/<GH_USERNAME>/<REPO_NAME>.git
git branch -M main
git push -u origin main
```

---

## Phase 7 — Find your cPanel web root

1. Log into cPanel (the panel URL in the sheet).
2. Open **File Manager**. Your site files live in your **document root**, usually
   `/home/<SSH_USER>.vudse26.cloud/public_html` — confirm the exact path; that's your
   `<DEPLOY_PATH>`.
3. (Optional sanity check) Put a temporary `index.html` there and open `http://<DOMAIN>` to
   confirm the subdomain serves that folder.

---

## Phase 8 — Create a deploy SSH key and authorise it

The pipeline logs into your server with a **key**, not your password.

```bash
# 1) generate a dedicated keypair (no passphrase)
ssh-keygen -t ed25519 -C "github-actions-deploy" -f ~/.ssh/deploy_key -N ""

# 2) authorise the PUBLIC key on the server (use your password this once)
ssh-copy-id -i ~/.ssh/deploy_key.pub -p <SSH_PORT> <SSH_USER>@<SSH_HOST>
#   (Windows / if ssh-copy-id is missing: in cPanel → SSH Access → Manage SSH Keys →
#    Import → paste the contents of ~/.ssh/deploy_key.pub → Authorize)

# 3) test it works without a password
ssh -i ~/.ssh/deploy_key -p <SSH_PORT> <SSH_USER>@<SSH_HOST> 'echo OK && ls public_html'
```
If step 3 prints `OK`, the key works.

---

## Phase 9 — Add GitHub Secrets

In your repo on GitHub → **Settings → Secrets and variables → Actions → New repository secret**.
Add these four:

| Secret name | Value |
|-------------|-------|
| `SSH_HOST` | `<SSH_HOST>` |
| `SSH_USER` | `<SSH_USER>` |
| `SSH_PORT` | `<SSH_PORT>` |
| `SSH_PRIVATE_KEY` | the **entire** contents of `~/.ssh/deploy_key` (the private key, including the BEGIN/END lines) |

> Get the private key text with: `cat ~/.ssh/deploy_key`

---

## Phase 10 — Add the CI/CD workflow

Create `.github/workflows/ci-cd.yml`. **Change `DEPLOY_PATH` and the `url:` to yours:**
```yaml
name: CI/CD

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

permissions:
  contents: read

env:
  DEPLOY_PATH: /home/<SSH_USER>.vudse26.cloud/public_html   # <-- YOUR web root

jobs:
  ci:
    name: Lint & Test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npm run lint
      - run: npm test
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: coverage
          path: coverage/
          retention-days: 14

  deploy:
    name: Deploy to cPanel
    runs-on: ubuntu-latest
    needs: [ci]
    if: github.ref == 'refs/heads/main' && github.event_name == 'push'
    environment:
      name: production
      url: http://<DOMAIN>                                  # <-- YOUR domain
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npm run build
      - name: Deploy via rsync over SSH
        uses: easingthemes/ssh-deploy@v5.1.0
        with:
          SSH_PRIVATE_KEY: ${{ secrets.SSH_PRIVATE_KEY }}
          REMOTE_HOST:     ${{ secrets.SSH_HOST }}
          REMOTE_USER:     ${{ secrets.SSH_USER }}
          REMOTE_PORT:     ${{ secrets.SSH_PORT }}
          SOURCE:          "dist/"
          TARGET:          ${{ env.DEPLOY_PATH }}
          ARGS:            "-rltgoDzvO --delete"
          EXCLUDE:         "/cgi-bin/, /.well-known/"
```

> `npm ci` requires a committed `package-lock.json` — make sure it's committed (it is, if you
> ran `npm install`). If you don't have one, use `npm install` instead of `npm ci` in both jobs.

Commit and push:
```bash
git add .github/workflows/ci-cd.yml package.json eslint.config.js scripts/ tests/ src/ .gitignore
git commit -m "ci: add GitHub Actions pipeline (lint+test then deploy to cPanel)"
git push
```

---

## Phase 11 — Watch it deploy

1. On GitHub, open the **Actions** tab. You'll see your workflow running.
2. `ci` runs first (lint + tests). Then `deploy` builds and rsyncs to your server.
3. When both are green, open `http://<DOMAIN>` — your calculator is live.
4. **Prove it's automatic:** change a colour or label, `git commit`, `git push`, watch Actions
   run again, refresh the site — the change appears with no manual upload. **That's CI/CD.**

---

## Troubleshooting

| Symptom | Likely cause / fix |
|--------|--------------------|
| `deploy` fails: "Permission denied (publickey)" | Public key not authorised on the server (redo Phase 8), or `SSH_PRIVATE_KEY` pasted incompletely (include BEGIN/END lines). |
| `deploy` fails: "Host key verification" | Usually handled by the action; re-run the job. |
| `ci` fails on `npm ci` | No `package-lock.json` committed — run `npm install`, commit the lockfile, or switch `npm ci` → `npm install`. |
| `ci` fails on tests/coverage | A test failed or coverage is below threshold — fix tests or lower thresholds in `package.json`. |
| Site doesn't change after deploy | Wrong `DEPLOY_PATH` (check File Manager), or browser cache (hard refresh), or you pushed to a branch other than `main`. |
| `deploy` job didn't run at all | It only runs on **push to `main`**. PRs and other branches run `ci` only. |
| `rsync --delete` wiped a server folder | Add it to `EXCLUDE` (e.g. `/cgi-bin/, /.well-known/`). |

---

## Final checklist (tick before you defend)

- [ ] Calculator shows only the allowed buttons + your feature.
- [ ] `npm test` passes with coverage; `npm run lint` is clean.
- [ ] New GitHub repo exists and `main` is pushed.
- [ ] 4 GitHub Secrets added; deploy key authorised on the server.
- [ ] `.github/workflows/ci-cd.yml` has **your** `DEPLOY_PATH` and `url`.
- [ ] A push to `main` runs `ci` then `deploy`, both green.
- [ ] `http://<DOMAIN>` shows the latest change automatically.
- [ ] You changed the cPanel/SSH passwords after setup.
- [ ] You can explain the flow: push → lint+test → build → rsync over SSH → live.

> This guide mirrors Mr. Iyke's CI/CD manual, adapted for a static calculator on cPanel:
> same GitHub Actions + Jest + ESLint + SSH-deploy backbone, with Docker/registry omitted
> because cPanel serves files directly.
