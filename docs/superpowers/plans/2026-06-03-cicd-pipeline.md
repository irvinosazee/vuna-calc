# VUNA Calculator CI/CD Pipeline — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a gated, branch-based CI/CD pipeline (GitHub Actions CI + Vercel CD) around the static VUNA Calculator, refactoring its math into a tested, `eval()`-free module.

**Architecture:** Extract calculator math into a pure `src/calculator.js` (tokenizer → shunting-yard → RPN, no DOM, no `eval`). Jest tests gate quality with coverage thresholds. GitHub Actions runs lint + test + Docker build as required status checks; branch protection blocks merges to `main` until green; Vercel's Git integration auto-deploys previews (branches/PRs) and production (`main`).

**Tech Stack:** Vanilla JS, Jest, ESLint 9 (flat config), Docker (nginx:alpine multi-stage), GitHub Actions, Vercel.

---

## File Structure

| File | Responsibility |
|------|----------------|
| `package.json` | npm scripts (test/lint/build) + Jest config + devDeps |
| `package-lock.json` | reproducible installs (generated) |
| `eslint.config.js` | ESLint 9 flat config (browser + node + jest globals) |
| `.dockerignore` | keep build context small |
| `src/calculator.js` | **pure** evaluator: `tokenize`, `toRPN`, `evalRPN`, `evaluateExpression`, `computePercent` |
| `tests/calculator.test.js` | Jest unit tests against the evaluator |
| `assets/js/script.js` | DOM wiring only (calls into `calculator.js`) + keyboard input |
| `index.html` | loads `src/calculator.js` before `script.js` |
| `scripts/build.mjs` | assembles `dist/` |
| `Dockerfile` | multi-stage: node build → nginx serve |
| `vercel.json` | Vercel build command + output dir |
| `.github/workflows/ci.yml` | CI: lint-and-test + docker-build |
| `README.md` | overview, local dev, badge, live URL |
| `docs/PIPELINE.md` | full pipeline knowledge + setup + manual mapping |

**Behavior contract:** the browser calculator must behave identically after the refactor, except for three intentional improvements: (1) `eval()` removed, (2) degree-based trig now actually works, (3) `%` now uses standard calculator percent semantics. Keyboard input is added.

---

## Task 1: Scaffold Node tooling

**Files:**
- Create: `package.json`, `eslint.config.js`, `.dockerignore`
- Modify: `.gitignore` (already has node_modules/coverage/dist/.vercel/.DS_Store)

- [ ] **Step 1: Create `package.json`**

```json
{
  "name": "vuna-calc-482",
  "version": "1.0.0",
  "description": "VUNA Calculator with a GitHub Actions + Vercel CI/CD pipeline",
  "private": true,
  "scripts": {
    "test": "jest --coverage",
    "lint": "eslint .",
    "build": "node scripts/build.mjs"
  },
  "devDependencies": {
    "@eslint/js": "^9.13.0",
    "eslint": "^9.13.0",
    "jest": "^29.7.0"
  },
  "jest": {
    "testEnvironment": "node",
    "collectCoverageFrom": ["src/**/*.js"],
    "coverageThreshold": {
      "global": { "branches": 70, "functions": 80, "lines": 80, "statements": 80 }
    }
  }
}
```

- [ ] **Step 2: Create `eslint.config.js`** (ESLint 9 flat config)

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
        window: 'readonly',
        document: 'readonly',
        localStorage: 'readonly',
        console: 'readonly',
        module: 'writable',
        require: 'readonly',
        process: 'readonly',
        // calculator.js globals consumed by script.js (loaded via <script>)
        evaluateExpression: 'readonly',
        computePercent: 'readonly',
        // jest
        describe: 'readonly',
        it: 'readonly',
        expect: 'readonly',
      },
    },
    rules: {
      'no-unused-vars': 'warn',
      'no-undef': 'error',
      'eqeqeq': 'error',
      'semi': ['error', 'always'],
    },
  },
  {
    // ES module build scripts
    files: ['**/*.mjs'],
    languageOptions: {
      ecmaVersion: 2021,
      sourceType: 'module',
      globals: { console: 'readonly' },
    },
    rules: {
      'semi': ['error', 'always'],
    },
  },
];
```

- [ ] **Step 3: Create `.dockerignore`**

```
node_modules
coverage
dist
.git
.github
tests
docs
*.docx
*.md
.DS_Store
```

- [ ] **Step 4: Install dependencies** (generates `package-lock.json`)

Run: `npm install`
Expected: creates `node_modules/` and `package-lock.json`, no errors.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json eslint.config.js .dockerignore .gitignore
git commit -m "chore: add Node tooling (jest, eslint, scripts)"
```

---

## Task 2: Evaluator — basic arithmetic (TDD)

**Files:**
- Create: `src/calculator.js`
- Test: `tests/calculator.test.js`

- [ ] **Step 1: Write failing tests**

```js
// tests/calculator.test.js
const { evaluateExpression } = require('../src/calculator');

describe('evaluateExpression — basic arithmetic', () => {
  it('adds', () => expect(evaluateExpression('2+3')).toBe(5));
  it('subtracts', () => expect(evaluateExpression('10-4')).toBe(6));
  it('multiplies', () => expect(evaluateExpression('6*7')).toBe(42));
  it('divides', () => expect(evaluateExpression('10/2')).toBe(5));
  it('respects precedence', () => expect(evaluateExpression('2+3*4')).toBe(14));
  it('respects parentheses', () => expect(evaluateExpression('(1+2)*3')).toBe(9));
  it('handles decimals', () => expect(evaluateExpression('1.5+2.5')).toBe(4));
  it('ignores whitespace', () => expect(evaluateExpression(' 2 + 2 ')).toBe(4));
});
```

- [ ] **Step 2: Run tests, verify they fail**

Run: `npm test -- calculator`
Expected: FAIL — `Cannot find module '../src/calculator'`.

- [ ] **Step 3: Create `src/calculator.js` with the core evaluator**

```js
'use strict';

const CONSTANTS = { pi: Math.PI, e: Math.E };

const FUNCTIONS = {
  sin: (x) => Math.sin((x * Math.PI) / 180),
  cos: (x) => Math.cos((x * Math.PI) / 180),
  tan: (x) => Math.tan((x * Math.PI) / 180),
  asin: (x) => (Math.asin(x) * 180) / Math.PI,
  acos: (x) => (Math.acos(x) * 180) / Math.PI,
  atan: (x) => (Math.atan(x) * 180) / Math.PI,
  sqrt: (x) => Math.sqrt(x),
  ln: (x) => Math.log(x),
  log: (x) => Math.log10(x),
};

const OPERATORS = {
  '+':  { prec: 2, assoc: 'L', args: 2, fn: (a, b) => a + b },
  '-':  { prec: 2, assoc: 'L', args: 2, fn: (a, b) => a - b },
  '*':  { prec: 3, assoc: 'L', args: 2, fn: (a, b) => a * b },
  '/':  { prec: 3, assoc: 'L', args: 2, fn: (a, b) => a / b },
  '**': { prec: 4, assoc: 'R', args: 2, fn: (a, b) => a ** b },
  'u-': { prec: 4, assoc: 'R', args: 1, fn: (a) => -a },
};

function tokenize(expr, consts) {
  const tokens = [];
  const s = String(expr).replace(/\s+/g, '');
  const prev = () => tokens[tokens.length - 1];
  const unaryContext = () => {
    const p = prev();
    return !p || p.type === 'op' || p.type === 'lparen';
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
    if (/[a-zA-Z]/.test(ch)) {
      let id = '';
      while (i < s.length && /[a-zA-Z]/.test(s[i])) id += s[i++];
      if (Object.prototype.hasOwnProperty.call(FUNCTIONS, id)) {
        tokens.push({ type: 'func', value: id });
      } else if (Object.prototype.hasOwnProperty.call(consts, id)) {
        tokens.push({ type: 'num', value: consts[id] });
      } else {
        throw new Error('Unknown identifier: ' + id);
      }
      continue;
    }
    if (ch === '*' && s[i + 1] === '*') { tokens.push({ type: 'op', value: '**' }); i += 2; continue; }
    if (ch === '+' || ch === '-') {
      if (unaryContext()) { if (ch === '-') tokens.push({ type: 'op', value: 'u-' }); }
      else tokens.push({ type: 'op', value: ch });
      i++; continue;
    }
    if (ch === '*' || ch === '/') { tokens.push({ type: 'op', value: ch }); i++; continue; }
    if (ch === '(') { tokens.push({ type: 'lparen' }); i++; continue; }
    if (ch === ')') { tokens.push({ type: 'rparen' }); i++; continue; }
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
    } else if (t.type === 'func') {
      stack.push(t);
    } else if (t.type === 'op') {
      const o1 = OPERATORS[t.value];
      while (stack.length) {
        const top = stack[stack.length - 1];
        if (top.type !== 'op') break;
        const o2 = OPERATORS[top.value];
        if (o2.prec > o1.prec || (o2.prec === o1.prec && o1.assoc === 'L')) out.push(stack.pop());
        else break;
      }
      stack.push(t);
    } else if (t.type === 'lparen') {
      stack.push(t);
    } else if (t.type === 'rparen') {
      while (stack.length && stack[stack.length - 1].type !== 'lparen') out.push(stack.pop());
      if (!stack.length) throw new Error('Mismatched parentheses');
      stack.pop();
      if (stack.length && stack[stack.length - 1].type === 'func') out.push(stack.pop());
    }
  }
  while (stack.length) {
    const top = stack.pop();
    if (top.type === 'lparen') throw new Error('Mismatched parentheses');
    out.push(top);
  }
  return out;
}

function evalRPN(rpn) {
  const stack = [];
  for (const t of rpn) {
    if (t.type === 'num') {
      stack.push(t.value);
    } else if (t.type === 'op') {
      const op = OPERATORS[t.value];
      if (op.args === 1) {
        if (stack.length < 1) throw new Error('Invalid expression');
        stack.push(op.fn(stack.pop()));
      } else {
        if (stack.length < 2) throw new Error('Invalid expression');
        const b = stack.pop();
        const a = stack.pop();
        stack.push(op.fn(a, b));
      }
    } else if (t.type === 'func') {
      if (stack.length < 1) throw new Error('Invalid expression');
      stack.push(FUNCTIONS[t.value](stack.pop()));
    }
  }
  if (stack.length !== 1) throw new Error('Invalid expression');
  return stack[0];
}

function evaluateExpression(expr, lastResult = 0) {
  if (expr === null || expr === undefined || String(expr).trim() === '') {
    throw new Error('Empty expression');
  }
  const consts = Object.assign({}, CONSTANTS, { ans: Number(lastResult) || 0 });
  const tokens = tokenize(expr, consts);
  if (tokens.length === 0) throw new Error('Empty expression');
  const result = evalRPN(toRPN(tokens));
  if (!Number.isFinite(result)) throw new Error('Math error');
  return result;
}

module.exports = { tokenize, toRPN, evalRPN, evaluateExpression };
```

- [ ] **Step 4: Run tests, verify they pass**

Run: `npm test -- calculator`
Expected: PASS — all 8 basic-arithmetic tests green.

- [ ] **Step 5: Commit**

```bash
git add src/calculator.js tests/calculator.test.js
git commit -m "feat(calc): safe expression evaluator for basic arithmetic"
```

---

## Task 3: Evaluator — power, unary minus, constants, functions (TDD)

**Files:**
- Modify: `tests/calculator.test.js`
- Modify: `src/calculator.js` (no code change expected — Task 2 already implements these; this task proves it)

- [ ] **Step 1: Add tests**

```js
describe('evaluateExpression — power, unary, constants, functions', () => {
  it('exponentiates', () => expect(evaluateExpression('2**3')).toBe(8));
  it('exponent is right-associative', () => expect(evaluateExpression('2**2**3')).toBe(256));
  it('unary minus negates', () => expect(evaluateExpression('-5+2')).toBe(-3));
  it('unary minus after operator', () => expect(evaluateExpression('3*-2')).toBe(-6));
  it('exponent binds tighter than unary minus', () => expect(evaluateExpression('-2**2')).toBe(-4));
  it('parenthesised negative power', () => expect(evaluateExpression('(-2)**2')).toBe(4));
  it('knows pi', () => expect(evaluateExpression('pi')).toBeCloseTo(Math.PI, 10));
  it('knows e', () => expect(evaluateExpression('e')).toBeCloseTo(Math.E, 10));
  it('computes degree sine', () => expect(evaluateExpression('sin(30)')).toBeCloseTo(0.5, 10));
  it('computes degree cosine', () => expect(evaluateExpression('cos(60)')).toBeCloseTo(0.5, 10));
  it('computes sqrt', () => expect(evaluateExpression('sqrt(9)')).toBe(3));
  it('substitutes ans', () => expect(evaluateExpression('ans+1', 41)).toBe(42));
});
```

- [ ] **Step 2: Run tests, verify they pass**

Run: `npm test -- calculator`
Expected: PASS. (If any fail, the bug is in Task 2's evaluator — fix there.)

- [ ] **Step 3: Commit**

```bash
git add tests/calculator.test.js
git commit -m "test(calc): cover power, unary minus, constants, trig, ans"
```

---

## Task 4: Evaluator — error handling (TDD)

**Files:**
- Modify: `tests/calculator.test.js`

- [ ] **Step 1: Add tests**

```js
describe('evaluateExpression — errors', () => {
  it('throws on division by zero (non-finite)', () => expect(() => evaluateExpression('1/0')).toThrow());
  it('throws on trailing operator', () => expect(() => evaluateExpression('3+')).toThrow());
  it('throws on unbalanced open paren', () => expect(() => evaluateExpression('(1+2')).toThrow());
  it('throws on unbalanced close paren', () => expect(() => evaluateExpression('1+2)')).toThrow());
  it('throws on empty input', () => expect(() => evaluateExpression('')).toThrow());
  it('throws on unknown identifier', () => expect(() => evaluateExpression('foo(2)')).toThrow());
});
```

- [ ] **Step 2: Run tests, verify they pass**

Run: `npm test -- calculator`
Expected: PASS — all error cases throw. (If `1+2)` does not throw, ensure `toRPN` errors when a `)` finds no matching `(`.)

- [ ] **Step 3: Commit**

```bash
git add tests/calculator.test.js
git commit -m "test(calc): cover error handling"
```

---

## Task 5: Evaluator — standard percent semantics (TDD)

This **fixes** the original buggy percent (which discarded the left operand and appended `*`). New semantics match a standard calculator.

**Files:**
- Modify: `tests/calculator.test.js`
- Modify: `src/calculator.js`

- [ ] **Step 1: Add failing tests**

```js
const { computePercent } = require('../src/calculator');

describe('computePercent', () => {
  it('bare number becomes a fraction', () => expect(computePercent('50')).toBe('0.5'));
  it('addition: percent is relative to the left value', () => {
    expect(evaluateExpression(computePercent('100+10'))).toBeCloseTo(110, 10);
  });
  it('subtraction: percent is relative to the left value', () => {
    expect(evaluateExpression(computePercent('100-10'))).toBeCloseTo(90, 10);
  });
  it('multiplication: percent is the literal fraction', () => {
    expect(evaluateExpression(computePercent('200*50'))).toBeCloseTo(100, 10);
  });
  it('returns input unchanged when it cannot parse', () => expect(computePercent('')).toBe(''));
});
```

- [ ] **Step 2: Run tests, verify they fail**

Run: `npm test -- calculator`
Expected: FAIL — `computePercent is not a function`.

- [ ] **Step 3: Add `computePercent` to `src/calculator.js`**

Insert before the `module.exports` line:

```js
function computePercent(expr) {
  if (!expr) return expr;
  const m = String(expr).match(/^(.*?)([+\-*/])([0-9.]+)$/);
  if (!m) {
    const n = parseFloat(expr);
    if (Number.isNaN(n)) return expr;
    return String(n / 100);
  }
  const [, leftExpr, op, rightNum] = m;
  const right = parseFloat(rightNum);
  let leftVal;
  try {
    leftVal = evaluateExpression(leftExpr);
  } catch {
    return expr;
  }
  const percentValue = (op === '+' || op === '-') ? (leftVal * right) / 100 : right / 100;
  return `${leftExpr}${op}${percentValue}`;
}
```

Then update the exports line:

```js
module.exports = { tokenize, toRPN, evalRPN, evaluateExpression, computePercent };
```

- [ ] **Step 4: Run tests, verify they pass**

Run: `npm test -- calculator`
Expected: PASS.

- [ ] **Step 5: Run full suite + coverage gate**

Run: `npm test`
Expected: PASS with coverage ≥ thresholds (branches 70, functions 80, lines/statements 80) on `src/`.

- [ ] **Step 6: Commit**

```bash
git add src/calculator.js tests/calculator.test.js
git commit -m "feat(calc): standard percent semantics, replacing buggy version"
```

---

## Task 6: Dual-environment export for the browser

So `src/calculator.js` works both under Jest (CommonJS) and in the browser (plain `<script>`).

**Files:**
- Modify: `src/calculator.js`

- [ ] **Step 1: Replace the `module.exports` line with a guarded export**

```js
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { tokenize, toRPN, evalRPN, evaluateExpression, computePercent };
}
```

(In the browser, top-level `function` declarations are already global, so `evaluateExpression` and `computePercent` are reachable from `script.js`. The guard just prevents a `ReferenceError` on `module` in the browser.)

- [ ] **Step 2: Run tests, verify still green**

Run: `npm test -- calculator`
Expected: PASS (require still returns the functions).

- [ ] **Step 3: Lint**

Run: `npm run lint`
Expected: zero errors (warnings allowed).

- [ ] **Step 4: Commit**

```bash
git add src/calculator.js
git commit -m "feat(calc): dual CommonJS/browser export guard"
```

---

## Task 7: Refactor `script.js` to use the evaluator + add keyboard input

**Files:**
- Modify: `assets/js/script.js`

- [ ] **Step 1: Replace the math sections of `assets/js/script.js`**

Remove `normalizeExpression`, the old `percentToResult`, and the `eval`-based `calculateResult`. Replace them with the versions below. Keep `toggleTheme`, the `DOMContentLoaded` theme loader, `currentExpression`/`LAST_RESULT`, `appendToResult`, `bracketToResult`, `backspace`, `operatorToResult`, `clearResult`, and `updateResult` exactly as they are.

Add this directive comment at the very top of the file (tells ESLint these are used by inline `onclick`):

```js
/* exported toggleTheme, appendToResult, bracketToResult, backspace, operatorToResult, clearResult, percentToResult, calculateResult */
```

New `percentToResult`:

```js
function percentToResult() {
  if (!currentExpression) return;
  currentExpression = computePercent(currentExpression);
  updateResult();
}
```

New `calculateResult`:

```js
function calculateResult() {
  if (!currentExpression) return;
  try {
    const display = document.getElementById("result");
    const result = evaluateExpression(currentExpression, LAST_RESULT);
    LAST_RESULT = result;
    display.value = result;
    currentExpression = result.toString();
    updateResult();
  } catch (e) {
    currentExpression = "Error";
    updateResult();
  }
}
```

- [ ] **Step 2: Add keyboard support at the end of `script.js`**

```js
// ------------------------------
// Keyboard Input
// ------------------------------
window.addEventListener("keydown", function (e) {
  const k = e.key;
  if (k >= "0" && k <= "9") appendToResult(k);
  else if (k === ".") appendToResult(".");
  else if (k === "+" || k === "-" || k === "*" || k === "/") operatorToResult(k);
  else if (k === "(" || k === ")") bracketToResult(k);
  else if (k === "%") percentToResult();
  else if (k === "Enter" || k === "=") { e.preventDefault(); calculateResult(); }
  else if (k === "Backspace") backspace();
  else if (k === "Escape") clearResult();
});
```

- [ ] **Step 3: Lint**

Run: `npm run lint`
Expected: zero errors.

- [ ] **Step 4: Commit**

```bash
git add assets/js/script.js
git commit -m "refactor(ui): use safe evaluator, drop eval, add keyboard input"
```

---

## Task 8: Wire `calculator.js` into `index.html`

**Files:**
- Modify: `index.html`

- [ ] **Step 1: Add the calculator script before `script.js`**

Find this line (near the bottom of `index.html`):

```html
          <script src="assets/js/bootstrap.min.js"></script>
          <script src="https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js"></script>
          <script src="assets/js/script.js"></script>
```

Replace it with (adds `calculator.js` before `script.js`):

```html
          <script src="assets/js/bootstrap.min.js"></script>
          <script src="https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js"></script>
          <script src="src/calculator.js"></script>
          <script src="assets/js/script.js"></script>
```

- [ ] **Step 2: Manual browser check**

Run: `python3 -m http.server 8000` then open `http://localhost:8000/`
Verify: `2+3=` shows `5`; `(1+2)*3=` shows `9`; `sin(30)=` shows `0.5`; `100+10` then `%` then `=` shows `110`; keyboard typing works; `1/0=` shows `Error`. Stop the server with Ctrl+C.

- [ ] **Step 3: Commit**

```bash
git add index.html
git commit -m "feat(ui): load calculator.js before script.js"
```

---

## Task 9: Build script (`dist/`)

**Files:**
- Create: `scripts/build.mjs`

- [ ] **Step 1: Create `scripts/build.mjs`**

```js
import { rmSync, mkdirSync, cpSync } from 'node:fs';

rmSync('dist', { recursive: true, force: true });
mkdirSync('dist', { recursive: true });

cpSync('index.html', 'dist/index.html');
cpSync('assets', 'dist/assets', { recursive: true });
cpSync('src', 'dist/src', { recursive: true });

console.log('Build complete -> dist/');
```

- [ ] **Step 2: Run the build**

Run: `npm run build`
Expected: prints `Build complete -> dist/`; `dist/` contains `index.html`, `assets/`, `src/calculator.js`.

- [ ] **Step 3: Verify the built site serves**

Run: `python3 -m http.server 8000 --directory dist` then open `http://localhost:8000/` and confirm the calculator works. Ctrl+C to stop.

- [ ] **Step 4: Commit**

```bash
git add scripts/build.mjs
git commit -m "build: assemble dist/ from index.html, assets, src"
```

---

## Task 10: Dockerfile (multi-stage, build-only validation)

**Files:**
- Create: `Dockerfile`

- [ ] **Step 1: Create `Dockerfile`**

```dockerfile
# Stage 1: build the static site
FROM node:24-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run lint && npm test && npm run build

# Stage 2: serve with nginx
FROM nginx:alpine AS production
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
```

- [ ] **Step 2: Build the image locally**

Run: `docker build -t vuna-calc:local .`
Expected: build succeeds; lint + tests run inside the build and pass.

- [ ] **Step 3: Run and smoke-test the container**

```bash
docker run -d -p 8080:80 --name vuna vuna-calc:local
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:8080/   # expect 200
docker rm -f vuna
```

- [ ] **Step 4: Commit**

```bash
git add Dockerfile
git commit -m "build: multi-stage Dockerfile (node build -> nginx serve)"
```

---

## Task 11: Vercel configuration

**Files:**
- Create: `vercel.json`

- [ ] **Step 1: Create `vercel.json`**

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "framework": null
}
```

- [ ] **Step 2: Commit**

```bash
git add vercel.json
git commit -m "ci: add Vercel build configuration"
```

---

## Task 12: GitHub Actions CI workflow

**Files:**
- Create: `.github/workflows/ci.yml`

- [ ] **Step 1: Create `.github/workflows/ci.yml`**

```yaml
name: CI

on:
  pull_request:
    branches: [ main ]
  push:
    branches: [ main ]

permissions:
  contents: read

jobs:
  lint-and-test:
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

  docker-build:
    name: Docker Build
    runs-on: ubuntu-latest
    needs: [lint-and-test]
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Build image (validate, no push)
        uses: docker/build-push-action@v6
        with:
          context: .
          push: false
          tags: vuna-calc:ci
          cache-from: type=gha
          cache-to: type=gha,mode=max
```

- [ ] **Step 2: Validate YAML locally**

Run: `python3 -c "import yaml,sys; yaml.safe_load(open('.github/workflows/ci.yml')); print('valid')"`
Expected: prints `valid`.

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/ci.yml
git commit -m "ci: add GitHub Actions pipeline (lint+test, docker build)"
```

---

## Task 13: Documentation — README and PIPELINE

**Files:**
- Create: `README.md`, `docs/PIPELINE.md`

- [ ] **Step 1: Create `README.md`**

````markdown
# VUNA Calculator

A browser calculator (HTML + Bootstrap + vanilla JS) with a gated CI/CD pipeline.

![CI](https://github.com/USERNAME/vuna-calc-482/actions/workflows/ci.yml/badge.svg)

**Live:** https://REPLACE-WITH-VERCEL-URL.vercel.app

## Features
- Arithmetic with correct precedence, parentheses, `**`, unary minus
- Degree-based trig (`sin`, `cos`, `tan`, ...), `sqrt`, `ln`, `log`, `pi`, `e`, `ans`
- Standard percent (`100 + 10% = 110`)
- Keyboard input (digits, operators, Enter, Backspace, Esc)
- Light/dark theme
- No `eval()` — a safe expression evaluator

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
| Docker Build | Docker (nginx) | every PR + push to main |
| Deploy (preview) | Vercel | every branch/PR |
| Deploy (production) | Vercel | merge to `main` (gated by CI) |

See `docs/PIPELINE.md` for the full guide.
````

- [ ] **Step 2: Create `docs/PIPELINE.md`** (the "all needed knowledge" guide)

````markdown
# Pipeline Guide

## The gated branch model
1. Create a feature branch and push commits.
2. Open a PR to `main`. GitHub Actions runs **Lint & Test** and **Docker Build**.
3. Vercel posts a **preview deployment** on the PR.
4. Branch protection blocks the merge until both CI checks pass (and a review, if enabled).
5. Merge to `main`. Vercel deploys **production** from `main` — always a passed build.

```
feature branch -> PR -> CI (lint, test, docker) -> branch protection gate -> merge -> Vercel prod
                              \-> Vercel preview (per PR)
```

## CI stages (`.github/workflows/ci.yml`)
- **lint-and-test:** `npm ci` → `npm run lint` → `npm test` (Jest with coverage thresholds: branches 70, functions/lines/statements 80). Coverage uploaded as an artifact.
- **docker-build:** builds the multi-stage `Dockerfile` (node build → nginx) with GitHub Actions layer cache. Validation only; nothing is pushed to a registry.

## One-time setup

### 1. Push to GitHub
```bash
git remote add origin git@github.com:USERNAME/vuna-calc-482.git
git push -u origin main
```

### 2. Branch protection (Settings → Branches → Add rule for `main`)
- Require a pull request before merging
- Require status checks to pass: **Lint & Test**, **Docker Build**
- Require branches to be up to date before merging
- (optional) Require 1 approving review
- Do not allow bypassing the above settings

### 3. Vercel (dashboard)
- Import the GitHub repo (installs the Vercel GitHub App).
- Framework preset: **Other**; Build Command `npm run build`; Output Directory `dist`.
- Production Branch: `main`. Preview deployments: enabled for other branches.
- No tokens are stored in GitHub — Vercel authenticates via its own GitHub App.
- Copy the production URL into `README.md`.

## How this maps to the lab manual (`CICD_Pipeline_Lab_Manual.docx`)
| Manual concept | Here |
|----------------|------|
| Node/Express app | static calculator (no server) |
| Jest + coverage gate | same (on `src/calculator.js`) |
| ESLint | same (flat config) |
| Multi-stage Dockerfile, non-root | node build → nginx serve |
| Push image to Docker Hub | build-only validation (no registry) |
| SSH deploy to Linux server | replaced by Vercel Git integration |
| GitHub Secrets for deploy | none needed (Vercel App handles auth) |
| Branch protection + required checks | same |
| Post-deploy smoke test | Vercel build + preview URL |

## Extending the pipeline
- Push the image to GitHub Container Registry (`ghcr.io`) using the built-in `GITHUB_TOKEN`.
- Add Dependabot (`.github/dependabot.yml`) for npm + actions updates.
- Add a Trivy scan of the nginx image.
- Add a staging environment that deploys from a `develop` branch.
````

- [ ] **Step 3: Commit**

```bash
git add README.md docs/PIPELINE.md
git commit -m "docs: add README and pipeline guide"
```

---

## Task 14: Final verification

**Files:** none (verification only)

- [ ] **Step 1: Full local gate**

Run each and confirm:
```bash
npm run lint     # zero errors
npm test         # all pass, coverage meets thresholds
npm run build    # dist/ produced
docker build -t vuna-calc:final .   # succeeds
```

- [ ] **Step 2: Confirm `eval(` is gone from shipped code**

Run: `grep -rn "eval(" src/ assets/js/script.js`
Expected: no matches.

- [ ] **Step 3: Confirm clean git status**

Run: `git status`
Expected: working tree clean; `node_modules/`, `coverage/`, `dist/` are git-ignored.

- [ ] **Step 4: (Manual, off-plan) Push and finish setup**

Push to GitHub, then complete branch protection + Vercel import per `docs/PIPELINE.md`. Open a test PR from a branch and confirm: CI runs, a Vercel preview appears, the merge is blocked until checks pass, and merging deploys production.

---

## Notes on intentional behavior changes
- **`eval()` removed** — replaced by the tokenizer/shunting-yard/RPN evaluator. No arbitrary code execution.
- **Trig works** — `sin/cos/tan/...` are implemented in degrees (the old `normalizeExpression` referenced undefined `*Deg` functions).
- **Percent fixed** — `computePercent` now uses standard calculator semantics (`100+10% = 110`) instead of discarding the left operand.
- **Keyboard input added** — non-breaking enhancement.
- Everything else in the UI (markup, CSS classes `btn-light`/`btn-operator`/`btn-equals`/etc., theme toggle, button handlers) is unchanged.
