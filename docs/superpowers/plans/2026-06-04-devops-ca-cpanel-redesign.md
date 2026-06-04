# VUNA-Calc DevOps CA Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Strip VUNA-Calc to digits/`+ − × ÷`/`=`/`AC`/`CE`/`nCr`/`nPr`, and replace the Vercel/Docker pipeline with a GitHub Actions → cPanel (SSH key + rsync) auto-deploy.

**Architecture:** A slimmed safe evaluator (tokenize → shunting-yard → RPN) supporting `+ - * /`, unary minus, and `nCr`/`nPr` binary operators. `script.js` keeps DOM wiring (now with `CE`), `index.html` shows only the allowed keys. CI runs lint+test; on push to `main`, a deploy job rsyncs the built `dist/` over SSH into `public_html`.

**Tech Stack:** Vanilla JS, Jest, ESLint 9, GitHub Actions, rsync-over-SSH (`easingthemes/ssh-deploy`), cPanel static hosting.

---

## File Structure

| File | Responsibility |
|------|----------------|
| `src/calculator.js` | pure evaluator: `tokenize`, `toRPN`, `evalRPN`, `evaluateExpression`, `combination`, `permutation` |
| `tests/calculator.test.js` | Jest tests for the stripped evaluator + nCr/nPr |
| `assets/js/script.js` | DOM wiring: digits/operators, `AC`, `CE`, `=`, keyboard |
| `index.html` | stripped neumorphic keypad |
| `.github/workflows/ci-cd.yml` | CI (lint+test) + deploy (rsync to cPanel) |
| `README.md`, `docs/PIPELINE.md` | docs for the cPanel/SSH pipeline |

**Removed:** `.github/workflows/ci.yml`, `vercel.json`, `Dockerfile`, `.dockerignore`.

**Behaviour contract:** calculator computes only `+ − × ÷` and `nCr`/`nPr`; `AC` clears all, `CE` clears the current entry; no `eval()`; neumorphic styling retained.

---

## Task 1: Strip and rebuild the evaluator (TDD)

**Files:**
- Modify (full rewrite): `src/calculator.js`
- Modify (full rewrite): `tests/calculator.test.js`

- [ ] **Step 1: Replace `tests/calculator.test.js` with the stripped-evaluator tests**

```js
const {
  evaluateExpression,
  combination,
  permutation,
} = require('../src/calculator');

describe('evaluateExpression — basic arithmetic', () => {
  it('adds', () => expect(evaluateExpression('2+3')).toBe(5));
  it('subtracts', () => expect(evaluateExpression('10-4')).toBe(6));
  it('multiplies', () => expect(evaluateExpression('6*7')).toBe(42));
  it('divides', () => expect(evaluateExpression('10/2')).toBe(5));
  it('respects precedence', () => expect(evaluateExpression('2+3*4')).toBe(14));
  it('handles decimals', () => expect(evaluateExpression('1.5+2.5')).toBe(4));
  it('ignores whitespace', () => expect(evaluateExpression(' 2 + 2 ')).toBe(4));
  it('unary minus negates', () => expect(evaluateExpression('-5+2')).toBe(-3));
  it('unary minus after operator', () => expect(evaluateExpression('3*-2')).toBe(-6));
});

describe('evaluateExpression — nCr / nPr', () => {
  it('combination 5C2 = 10', () => expect(evaluateExpression('5C2')).toBe(10));
  it('permutation 5P2 = 20', () => expect(evaluateExpression('5P2')).toBe(20));
  it('nCr binds tighter than *', () => expect(evaluateExpression('2*5C2')).toBe(20));
  it('6C0 = 1', () => expect(evaluateExpression('6C0')).toBe(1));
  it('6C6 = 1', () => expect(evaluateExpression('6C6')).toBe(1));
  it('10P3 = 720', () => expect(evaluateExpression('10P3')).toBe(720));
});

describe('combination / permutation helpers', () => {
  it('combination(5,2) = 10', () => expect(combination(5, 2)).toBe(10));
  it('permutation(5,2) = 20', () => expect(permutation(5, 2)).toBe(20));
  it('combination is symmetric: C(8,3) = C(8,5)', () =>
    expect(combination(8, 3)).toBe(combination(8, 5)));
});

describe('evaluateExpression — errors', () => {
  it('throws on division by zero', () => expect(() => evaluateExpression('1/0')).toThrow());
  it('throws on trailing operator', () => expect(() => evaluateExpression('3+')).toThrow());
  it('throws on empty input', () => expect(() => evaluateExpression('')).toThrow());
  it('throws on unexpected character', () => expect(() => evaluateExpression('2&3')).toThrow());
  it('nCr rejects r > n', () => expect(() => evaluateExpression('5C7')).toThrow());
  it('nCr rejects non-integer', () => expect(() => evaluateExpression('2.5C1')).toThrow());
  it('nPr rejects negatives', () => expect(() => evaluateExpression('-5P2')).toThrow());
});
```

- [ ] **Step 2: Run tests, verify they fail**

Run: `npm test -- calculator`
Expected: FAIL — old `calculator.js` still exports trig/`computePercent`; the new
`combination`/`permutation` exports and `5C2` parsing don't exist yet.

- [ ] **Step 3: Replace `src/calculator.js` entirely with the stripped evaluator**

```js
'use strict';

// ── Combination & permutation (the retained custom feature) ──────────
function permutation(n, r) {
  if (!Number.isInteger(n) || !Number.isInteger(r) || n < 0 || r < 0 || r > n) {
    throw new Error('Invalid nPr operands');
  }
  let result = 1;
  for (let i = n; i > n - r; i--) result *= i; // n·(n-1)···(n-r+1)
  return result;
}

function combination(n, r) {
  if (!Number.isInteger(n) || !Number.isInteger(r) || n < 0 || r < 0 || r > n) {
    throw new Error('Invalid nCr operands');
  }
  const k = Math.min(r, n - r);
  let num = 1;
  let den = 1;
  for (let i = 0; i < k; i++) {
    num *= n - i;
    den *= i + 1;
  }
  return num / den;
}

// ── Operators (binary unless unary:true). 'C' = nCr, 'P' = nPr ───────
const OPERATORS = {
  '+':  { prec: 2, assoc: 'L', fn: (a, b) => a + b },
  '-':  { prec: 2, assoc: 'L', fn: (a, b) => a - b },
  '*':  { prec: 3, assoc: 'L', fn: (a, b) => a * b },
  '/':  { prec: 3, assoc: 'L', fn: (a, b) => a / b },
  'C':  { prec: 4, assoc: 'L', fn: (n, r) => combination(n, r) },
  'P':  { prec: 4, assoc: 'L', fn: (n, r) => permutation(n, r) },
  'u-': { prec: 5, assoc: 'R', unary: true, fn: (a) => -a },
};

function tokenize(expr) {
  const tokens = [];
  const s = String(expr).replace(/\s+/g, '');
  const prev = () => tokens[tokens.length - 1];
  const unaryContext = () => {
    const p = prev();
    return !p || p.type === 'op';
  };
  let i = 0;
  while (i < s.length) {
    const ch = s[i];
    if (/[0-9.]/.test(ch)) {
      let num = '';
      while (i < s.length && /[0-9.]/.test(s[i])) num += s[i++];
      if ((num.match(/\./g) || []).length > 1) throw new Error('Invalid number: ' + num);
      tokens.push({ type: 'num', value: parseFloat(num) });
      continue;
    }
    if (ch === '+' || ch === '-') {
      if (unaryContext()) {
        if (ch === '-') tokens.push({ type: 'op', value: 'u-' });
      } else {
        tokens.push({ type: 'op', value: ch });
      }
      i++;
      continue;
    }
    if (ch === '*' || ch === '/' || ch === 'C' || ch === 'P') {
      tokens.push({ type: 'op', value: ch });
      i++;
      continue;
    }
    throw new Error('Unexpected character: ' + ch);
  }
  return tokens;
}

function toRPN(tokens) {
  const out = [];
  const stack = [];
  for (const t of tokens) {
    if (t.type === 'num') {
      out.push(t);
    } else {
      const o1 = OPERATORS[t.value];
      while (stack.length) {
        const o2 = OPERATORS[stack[stack.length - 1].value];
        if (o2.prec > o1.prec || (o2.prec === o1.prec && o1.assoc === 'L')) {
          out.push(stack.pop());
        } else {
          break;
        }
      }
      stack.push(t);
    }
  }
  while (stack.length) out.push(stack.pop());
  return out;
}

function evalRPN(rpn) {
  const stack = [];
  for (const t of rpn) {
    if (t.type === 'num') {
      stack.push(t.value);
      continue;
    }
    const op = OPERATORS[t.value];
    if (op.unary) {
      if (stack.length < 1) throw new Error('Invalid expression');
      stack.push(op.fn(stack.pop()));
    } else {
      if (stack.length < 2) throw new Error('Invalid expression');
      const b = stack.pop();
      const a = stack.pop();
      stack.push(op.fn(a, b));
    }
  }
  if (stack.length !== 1) throw new Error('Invalid expression');
  return stack[0];
}

function evaluateExpression(expr) {
  if (expr === null || expr === undefined || String(expr).trim() === '') {
    throw new Error('Empty expression');
  }
  const tokens = tokenize(expr);
  if (tokens.length === 0) throw new Error('Empty expression');
  const result = evalRPN(toRPN(tokens));
  if (!Number.isFinite(result)) throw new Error('Math error');
  return result;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { tokenize, toRPN, evalRPN, evaluateExpression, combination, permutation };
}
```

- [ ] **Step 4: Run tests, verify they pass**

Run: `npm test -- calculator`
Expected: PASS — all arithmetic, nCr/nPr, helper, and error tests green.

- [ ] **Step 5: Run full suite + lint**

Run: `npm test && npm run lint`
Expected: coverage ≥ thresholds on `src/`; lint 0 errors.

- [ ] **Step 6: Commit**

```bash
git add src/calculator.js tests/calculator.test.js
git commit -m "feat(calc): strip evaluator to + - * / and add nCr/nPr (combination & permutation)"
```

---

## Task 2: Rewrite `script.js` (CE, simplified operators, slim keyboard)

**Files:**
- Modify (full rewrite): `assets/js/script.js`

- [ ] **Step 1: Replace `assets/js/script.js` entirely**

```js
// ===============================
// VUNA Calculator — DOM wiring
// ===============================

var currentExpression = "";

// ------------------------------
// Theme Toggle Logic
// ------------------------------
function toggleTheme() {
  const body = document.body;
  const btn = document.getElementById("theme-toggle");

  body.classList.toggle("dark-mode");

  if (body.classList.contains("dark-mode")) {
    btn.innerHTML = "☀️";
    btn.title = "Switch to light mode";
    localStorage.setItem("theme", "dark");
  } else {
    btn.innerHTML = "🌙";
    btn.title = "Switch to dark mode";
    localStorage.setItem("theme", "light");
  }
}

// Set theme on page load and wire the toggle button
window.addEventListener("DOMContentLoaded", function () {
  const theme = localStorage.getItem("theme");
  const body = document.body;
  const btn = document.getElementById("theme-toggle");

  if (btn) {
    btn.addEventListener("click", toggleTheme);
    if (theme === "dark") {
      body.classList.add("dark-mode");
      btn.innerHTML = "☀️";
      btn.title = "Switch to light mode";
    } else {
      btn.innerHTML = "🌙";
      btn.title = "Switch to dark mode";
    }
  }
});

// ------------------------------
// Input handlers
// ------------------------------
function appendToResult(value) {
  currentExpression += value.toString();
  updateResult();
}

// Operators, incl. 'C' (nCr) and 'P' (nPr)
function operatorToResult(value) {
  currentExpression += value;
  updateResult();
}

// Delete one character (keyboard Backspace)
function backspace() {
  currentExpression = currentExpression.slice(0, -1);
  updateResult();
}

// AC — clear everything
function clearResult() {
  currentExpression = "";
  updateResult();
}

// CE — clear the current entry: drop the trailing number, else the trailing operator
function clearEntry() {
  if (!currentExpression) return;
  const stripped = currentExpression.replace(/[0-9.]+$/, "");
  if (stripped !== currentExpression) {
    currentExpression = stripped;
  } else {
    currentExpression = currentExpression.slice(0, -1);
  }
  updateResult();
}

// ------------------------------
// Evaluate
// ------------------------------
function calculateResult() {
  if (!currentExpression) return;
  try {
    const display = document.getElementById("result");
    const result = evaluateExpression(currentExpression);
    display.value = result;
    currentExpression = result.toString();
    updateResult();
  } catch {
    currentExpression = "Error";
    updateResult();
  }
}

function updateResult() {
  document.getElementById("result").value = currentExpression || "0";
}

// ------------------------------
// Keyboard Input
// ------------------------------
window.addEventListener("keydown", function (e) {
  if (e.ctrlKey || e.metaKey || e.altKey) return; // don't hijack browser shortcuts

  const k = e.key;
  if (k >= "0" && k <= "9") appendToResult(k);
  else if (k === ".") appendToResult(".");
  else if (k === "+" || k === "-" || k === "*" || k === "/") operatorToResult(k);
  else if (k === "Enter" || k === "=") { e.preventDefault(); calculateResult(); }
  else if (k === "Backspace") backspace();
  else if (k === "Escape") clearResult();    // AC
  else if (k === "Delete") clearEntry();     // CE
});
```

- [ ] **Step 2: Verify behaviour via the Node DOM shim**

Run:
```bash
node -e '
const vm=require("vm"),fs=require("fs");const store={};const L={};
const ctx={window:{addEventListener:(t,f)=>L[t]=f},document:{getElementById:()=>({set value(v){store.v=v},get value(){return store.v},addEventListener(){},set innerHTML(v){},set title(v){}})},localStorage:{getItem:()=>null,setItem(){}},console};
ctx.evaluateExpression=require("./src/calculator").evaluateExpression;
vm.createContext(ctx);vm.runInContext(fs.readFileSync("./assets/js/script.js","utf8"),ctx);
const show=()=>{ctx.updateResult();return store.v;};
ctx.clearResult();ctx.appendToResult(5);ctx.operatorToResult("C");ctx.appendToResult(2);ctx.calculateResult();console.log("5C2 =>",store.v);
ctx.clearResult();ctx.appendToResult(5);ctx.operatorToResult("P");ctx.appendToResult(2);ctx.calculateResult();console.log("5P2 =>",store.v);
ctx.clearResult();ctx.appendToResult(1);ctx.appendToResult(2);ctx.operatorToResult("+");ctx.appendToResult(3);console.log("typed 12+3 =>",show());ctx.clearEntry();console.log("CE =>",show());ctx.clearEntry();console.log("CE again =>",show());
ctx.clearResult();ctx.appendToResult(1);ctx.appendToResult(0);ctx.operatorToResult("/");ctx.appendToResult(0);ctx.calculateResult();console.log("10/0 =>",store.v);
'
```
Expected: `5C2 => 10`, `5P2 => 20`, `typed 12+3 => 12+3`, `CE => 12+`, `CE again => 12`, `10/0 => Error`.

- [ ] **Step 3: Lint**

Run: `npm run lint`
Expected: 0 errors, 0 warnings.

- [ ] **Step 4: Commit**

```bash
git add assets/js/script.js
git commit -m "refactor(ui): strip handlers to + - * / nCr nPr, add CE, slim keyboard"
```

---

## Task 3: Strip the `index.html` keypad

**Files:**
- Modify: `index.html`

- [ ] **Step 1: Replace the entire `<div class="btn-grid"> … </div>` block**

Find the `<div class="btn-grid">` element and replace the whole block (from `<div class="btn-grid">` through its closing `</div>`) with:

```html
                  <div class="btn-grid">
                    <button class="btn btn-action" onclick="clearResult()">AC</button>
                    <button class="btn btn-action" onclick="clearEntry()">CE</button>
                    <button class="btn btn-special" onclick="operatorToResult('C')">nCr</button>
                    <button class="btn btn-special" onclick="operatorToResult('P')">nPr</button>

                    <button class="btn btn-light" onclick="appendToResult(7)">7</button>
                    <button class="btn btn-light" onclick="appendToResult(8)">8</button>
                    <button class="btn btn-light" onclick="appendToResult(9)">9</button>
                    <button class="btn btn-operator" onclick="operatorToResult('/')">÷</button>

                    <button class="btn btn-light" onclick="appendToResult(4)">4</button>
                    <button class="btn btn-light" onclick="appendToResult(5)">5</button>
                    <button class="btn btn-light" onclick="appendToResult(6)">6</button>
                    <button class="btn btn-operator" onclick="operatorToResult('*')">×</button>

                    <button class="btn btn-light" onclick="appendToResult(1)">1</button>
                    <button class="btn btn-light" onclick="appendToResult(2)">2</button>
                    <button class="btn btn-light" onclick="appendToResult(3)">3</button>
                    <button class="btn btn-operator" onclick="operatorToResult('-')">−</button>

                    <button class="btn btn-light" onclick="appendToResult(0)">0</button>
                    <button class="btn btn-light" onclick="appendToResult('.')">.</button>
                    <button class="btn btn-equals" onclick="calculateResult()">=</button>
                    <button class="btn btn-operator" onclick="operatorToResult('+')">+</button>
                  </div>
```

- [ ] **Step 2: Visual sanity check**

Run: `python3 -m http.server 8000` then open `http://localhost:8000/`.
Verify the keypad shows exactly: `AC CE nCr nPr` / `7 8 9 ÷` / `4 5 6 ×` / `1 2 3 −` / `0 . = +`.
Test: `5 nCr 2 =` → 10; `7 + 8 =` → 15; `AC` clears; `CE` removes the last entry. Ctrl+C to stop.

- [ ] **Step 3: Commit**

```bash
git add index.html
git commit -m "feat(ui): stripped keypad — digits, + - * /, =, AC, CE, nCr, nPr"
```

---

## Task 4: Remove Vercel and Docker artifacts

**Files:**
- Remove: `vercel.json`, `Dockerfile`, `.dockerignore`

- [ ] **Step 1: Delete the files**

```bash
git rm vercel.json Dockerfile .dockerignore
```

- [ ] **Step 2: Confirm nothing references them**

Run: `grep -rni "vercel\|docker" --include=*.js --include=*.json --include=*.yml --include=*.html . | grep -v node_modules | grep -v package-lock`
Expected: no functional references (matches only in `docs/` history are fine — those get rewritten in Task 6).

- [ ] **Step 3: Commit**

```bash
git commit -m "chore: remove Vercel and Docker artifacts (cPanel deploy supersedes them)"
```

---

## Task 5: Add the cPanel CI/CD workflow

**Files:**
- Create: `.github/workflows/ci-cd.yml`
- Remove: `.github/workflows/ci.yml`

- [ ] **Step 1: Remove the old workflow**

```bash
git rm .github/workflows/ci.yml
```

- [ ] **Step 2: Create `.github/workflows/ci-cd.yml`**

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
  DEPLOY_PATH: /home/irvin.vudse26.cloud/public_html

jobs:
  ci:
    name: Lint & Test
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Set up Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Lint
        run: npm run lint

      - name: Test with coverage
        run: npm test

      - name: Upload coverage
        if: always()
        uses: actions/upload-artifact@v4
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
      url: http://irvin.vudse26.cloud
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Set up Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Build site (dist/)
        run: npm run build

      - name: Deploy to cPanel via rsync over SSH
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

- [ ] **Step 3: Validate the YAML**

Run: `python3 -c "import yaml; yaml.safe_load(open('.github/workflows/ci-cd.yml')); print('valid')"`
Expected: `valid`

- [ ] **Step 4: Commit**

```bash
git add .github/workflows/ci-cd.yml
git commit -m "ci: GitHub Actions pipeline — lint+test then rsync deploy to cPanel"
```

---

## Task 6: Rewrite the documentation

**Files:**
- Modify (full rewrite): `README.md`
- Modify (full rewrite): `docs/PIPELINE.md`

- [ ] **Step 1: Replace `README.md`**

````markdown
# VUNA Calculator

A browser calculator (HTML + Bootstrap + vanilla JS) for the SEN 482 DevOps CA, with a
CI/CD pipeline that auto-deploys to cPanel.

![CI/CD](https://github.com/USERNAME/vuna-calc/actions/workflows/ci-cd.yml/badge.svg)

**Live:** http://irvin.vudse26.cloud

## Features
- Digits `0–9`, decimal point, operators `+ − × ÷`, and `=`
- `AC` (all clear) and `CE` (clear current entry)
- **Combination & permutation** — `nCr` / `nPr` (e.g. `5 nCr 2 = 10`, `5 nPr 2 = 20`)
- Keyboard input (digits, operators, Enter, Backspace, Esc = AC, Delete = CE)
- Neumorphic soft-UI with light/dark theme
- No `eval()` — a safe expression evaluator (tokenizer → shunting-yard → RPN)

## Local development
```bash
npm install      # install dev tooling
npm test         # run unit tests with coverage
npm run lint     # run ESLint
npm run build    # assemble dist/
python3 -m http.server 8000   # then open http://localhost:8000
```

## Pipeline at a glance
| Stage | Tool | When |
|-------|------|------|
| Lint & Test | ESLint + Jest | every PR + push to main |
| Deploy | rsync over SSH → cPanel `public_html` | push to `main` |

See `docs/PIPELINE.md` for the full guide and one-time server setup.
````

- [ ] **Step 2: Replace `docs/PIPELINE.md`**

````markdown
# Pipeline Guide (GitHub Actions → cPanel)

## Flow
```
push to main ──▶ GitHub Actions
                 ├── ci: npm ci → lint → test (Jest + coverage)
                 └── deploy (needs ci): npm run build → rsync dist/ over SSH
                                        └─▶ /home/irvin.vudse26.cloud/public_html
                                            └─▶ http://irvin.vudse26.cloud
PRs run ci only (no deploy).
```

## CI/CD stages (`.github/workflows/ci-cd.yml`)
- **ci:** `npm ci` → `npm run lint` → `npm test` (coverage thresholds: branches 70,
  functions/lines/statements 80). Coverage uploaded as an artifact.
- **deploy:** builds `dist/` and rsyncs it into `public_html` over SSH using a dedicated
  deploy key. `--delete` mirrors the folder (server dirs `cgi-bin` / `.well-known` excluded).

## One-time setup

### 1. New GitHub repo
```bash
git remote add origin git@github.com:USERNAME/vuna-calc.git
git push -u origin main
```

### 2. Generate a dedicated deploy key and authorise it on the server
```bash
# locally
ssh-keygen -t ed25519 -C "github-actions-deploy" -f ~/.ssh/vuna_deploy -N ""

# authorise the PUBLIC key on the server (one password login, then rotate the password)
ssh-copy-id -i ~/.ssh/vuna_deploy.pub -p 22 irvin@159.198.47.177
#   OR cPanel → SSH Access → Manage SSH Keys → Import → Authorize

# test
ssh -i ~/.ssh/vuna_deploy -p 22 irvin@159.198.47.177 'echo OK && ls public_html'
```

### 3. Add GitHub Secrets (repo → Settings → Secrets and variables → Actions)
| Secret | Value |
|--------|-------|
| `SSH_HOST` | `159.198.47.177` |
| `SSH_USER` | `irvin` |
| `SSH_PORT` | `22` |
| `SSH_PRIVATE_KEY` | contents of `~/.ssh/vuna_deploy` (the private key) |

`DEPLOY_PATH` is set in the workflow (`/home/irvin.vudse26.cloud/public_html`).

### 4. Push and watch
Push to `main`, open the **Actions** tab, watch `ci` then `deploy` run, then refresh
`http://irvin.vudse26.cloud` to see the change live.

## How this maps to Mr. Iyke's manual (`CICD_Pipeline_Lab_Manual.docx`)
| Manual concept | Here |
|----------------|------|
| Node/Express app | static calculator (no server process) |
| Jest + coverage gate | same (on `src/calculator.js`) |
| ESLint | same (flat config) |
| Docker image + registry | not used — cPanel serves static files directly |
| SSH deploy to Linux server | **same** — rsync over SSH into `public_html` |
| GitHub Secrets for SSH | `SSH_HOST/USER/PORT/PRIVATE_KEY` |
| Post-deploy smoke test | refresh the live domain |

## Security
- Rotate the cPanel and SSH passwords that were shared.
- The pipeline uses a dedicated SSH **key**, never a password; the private key lives only
  in `SSH_PRIVATE_KEY` (GitHub Secret) and is never committed.
````

- [ ] **Step 3: Commit**

```bash
git add README.md docs/PIPELINE.md
git commit -m "docs: rewrite README and pipeline guide for cPanel/SSH deploy"
```

---

## Task 7: Final verification

**Files:** none (verification only)

- [ ] **Step 1: Full local gate**

```bash
npm run lint     # 0 errors
npm test         # all pass, coverage ≥ thresholds
npm run build    # dist/ produced
```

- [ ] **Step 2: Confirm the calculator surface and no stale tech**

```bash
grep -o "onclick=\"[a-zA-Z]*" index.html | sort | uniq -c   # only append/operator/clearResult/clearEntry/calculateResult
grep -rn "eval(" src/ assets/js/script.js                   # no matches
ls vercel.json Dockerfile .dockerignore 2>&1                # all: No such file
grep -rni "sin\|cos\|sqrt\|computePercent\|vercel\|docker" src/ assets/js/ index.html  # no matches
```
Expected: no scientific/percent/vercel/docker references remain; no `eval(`.

- [ ] **Step 3: Confirm `dist/` is deployable**

```bash
ls dist dist/assets/css dist/src   # index.html, assets (incl neumorphic.css), src/calculator.js
```

- [ ] **Step 4: Confirm clean git status**

Run: `git status`
Expected: working tree clean; `node_modules/`, `coverage/`, `dist/` git-ignored.

- [ ] **Step 5: (Manual, off-plan) Repo + secrets + server key**

Follow `docs/PIPELINE.md`: create the GitHub repo, push, add the four secrets, authorise
the deploy key on the server, then push a trivial change and confirm
`http://irvin.vudse26.cloud` updates automatically.

---

## Notes
- `nCr`/`nPr` are entered as the operators `C`/`P` internally (the buttons insert them);
  the evaluator gives them precedence above `× ÷`.
- `CE` clears the trailing number, then (on a second press) the trailing operator.
- The neumorphic stylesheet (`assets/css/neumorphic.css`) and `scripts/build.mjs` are
  unchanged and still apply.
