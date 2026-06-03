# VUNA Calculator — CI/CD Pipeline Design

- **Date:** 2026-06-03
- **Status:** Approved (pending spec review)
- **Author:** Software Engineering set 2025/26 (SEN 482)
- **Source inspiration:** `CICD_Pipeline_Lab_Manual.docx` (Node.js + GitHub Actions + Docker + Linux deploy)

---

## 1. Overview

The VUNA Calculator is a **static client-side web app** (HTML + Bootstrap + vanilla
JavaScript). This project adds a **production-grade CI/CD pipeline** around it using
**GitHub Actions** for CI and **Vercel** for CD, adapting the concepts from the lab manual
(which targeted a Node.js Express service) to a static site.

The model is a **gated, branch-based "turn-around" workflow**: all work happens on feature
branches, GitHub Actions validates each pull request, branch protection blocks merges until
CI is green, and Vercel auto-deploys — previews per branch, production only from `main`.
Because nothing reaches `main` without passing CI, **production is only ever built from
passed code.**

### Goal

> Feature branch → PR → GitHub Actions CI (lint → test → docker-build) runs as **required
> status checks** → merge to `main` is **blocked until CI passes** → Vercel auto-deploys
> `main` to production. PRs get automatic **Vercel preview** deploys. CI is the gatekeeper;
> Vercel is the deployer.

---

## 2. Background: current project state

```
vuna-calc-482/
├── index.html              ← calculator UI (Bootstrap grid of buttons)
├── assets/
│   ├── css/                ← bootstrap.min.css, styles.css, calculator.css
│   └── js/
│       ├── bootstrap.min.js
│       └── script.js       ← ALL logic: DOM wiring + math (uses eval())
└── CICD_Pipeline_Lab_Manual.docx
```

Observed facts that shape the design:

- **No** `package.json`, **no** tests, **no** Node tooling (git initialized for this work).
- `script.js` mixes DOM access (`document.getElementById`, `onclick` handlers) with the
  math logic, making the math untestable in isolation.
- Computation is done with **`eval()`** — a security/quality smell flagged by linters.
- `normalizeExpression()` rewrites `sin(` → `sinDeg(`, `cos(` → `cosDeg(`, etc., but
  **those `*Deg` functions are never defined**, so any trig expression currently errors.
  (The UI also has no trig buttons yet — trig is referenced but unreachable.)

---

## 3. Decisions (locked)

| # | Decision | Choice |
|---|----------|--------|
| 1 | Pipeline philosophy | **Hybrid** — manual's stage structure + GitHub Actions CI, static-site hosting |
| 2 | Testing depth | **Refactor + real unit tests** with coverage thresholds |
| 3 | Deploy target | **Vercel**, via its **native Git integration** (not a CLI job in Actions) |
| 4 | Deploy gating | **Branch protection** on `main` requires CI checks to pass before merge |
| 5 | Docker scope | **Build-only validation** (Nginx image; not pushed to any registry) |
| 6 | `eval()` + trig bug | **Solve both** — replace `eval()` with a safe expression evaluator that also implements degree-based trig |

---

## 4. Architecture

### The gated branch flow

```
  feature branch ──push──▶  GitHub Actions CI
        │                   (lint · test+coverage · docker build)
        │                          │
        │                          ▼
        │                   ✅ required status checks
        │                          │
   open PR to main                 │        ┌─ Vercel PREVIEW deploy
        │◀─────────────────────────┘        │  (automatic, per branch/PR,
        │                                    │   throwaway URL for review)
        ▼                                    │
  Branch protection on `main`:  ◀────────────┘
   • PR required
   • CI checks must be green
   • (optional) 1 approving review
        │
        ▼  merge allowed ONLY when green
   merge to main
        │
        ▼
  Vercel auto-deploys `main` ──▶  PRODUCTION
                                  https://<app>.vercel.app
                                  (always a passed build)
```

- **GitHub Actions = CI / gatekeeper.** Runs lint, tests (with coverage gate), and a Docker
  build validation on every PR. These appear as **required status checks**.
- **Branch protection = the lock.** `main` cannot be pushed to directly; merges require a PR
  whose CI checks are green.
- **Vercel = CD / deployer.** Its GitHub App watches the repo: every branch/PR gets a
  **preview** deployment; `main` gets the **production** deployment. We do **not** deploy
  from Actions and store **no Vercel secrets** in GitHub.

> **Why this split?** Vercel's auto-deploy is desirable (instant previews, zero-config
> production). The risk with naive auto-deploy is shipping unvalidated code. Branch
> protection neutralizes that risk: since `main` only ever receives CI-passed code,
> Vercel's production builds are always from passed builds. Best of both worlds.

> **Note on previews:** Vercel builds PR previews independently of CI status — that's fine,
> previews are disposable. Only **production** (`main`) is gated, which is what matters.

### Separation of concerns (the refactor)

| Unit | Responsibility | Depends on | Tested? |
|------|----------------|------------|---------|
| `src/calculator.js` | **Pure** math: tokenize, parse, evaluate expressions. No DOM, no globals. | nothing | ✅ Jest |
| `assets/js/script.js` | DOM wiring only: button handlers, display updates, theme toggle. Calls `calculator.js`. | `calculator.js`, DOM | manual/e2e (out of scope) |
| `index.html` | Markup; loads `calculator.js` then `script.js`. | both scripts | — |

`src/calculator.js` ends with a dual-environment export so **no bundler is needed**:

```js
// Browser: attach to window so inline onclick + script.js can use it.
// Node/Jest: export via CommonJS so tests can require() it.
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { tokenize, evaluateExpression, computePercent, normalizeExpression };
}
```

---

## 5. The safe expression evaluator (replaces `eval()`)

A small, self-contained evaluator in `src/calculator.js`:

1. **Tokenizer** — splits an expression string into numbers, operators, parentheses,
   function names, and constants.
2. **Shunting-yard** — converts the token stream to Reverse Polish Notation, honoring
   operator precedence and right-associativity of `**`.
3. **RPN evaluator** — folds the RPN stack into a single `Number`.

**Supported surface (matches and extends current UI):**

- Binary operators: `+  -  *  /  **  %`  (with correct precedence; `**` right-assoc)
- Unary minus: `-5`, `3 * -2`
- Parentheses and decimals
- Constants: `pi` → π, `e` → Euler's number, `ans` → last result
- Functions (**degrees**, fixing the trig bug): `sin cos tan asin acos atan`,
  plus `sqrt ln log`
- Percent: `computePercent()` keeps the existing "x + y%" semantics

**Error handling:** invalid syntax, unbalanced parentheses, division by zero (→ `Infinity`),
and `NaN`/non-finite results all throw a typed error; `script.js` catches it and shows
`Error` in the display — preserving current UX.

This single change resolves **both** flagged issues: `eval()` is gone (no `no-eval` lint
suppression needed) and trig works because the functions genuinely exist.

---

## 6. File inventory

### New files

```
package.json                    ← scripts (test, lint, build, dev) + devDeps (jest, eslint)
.eslintrc.json                  ← envs: browser, node, es2021, jest; recommended rules
.gitignore                      ← node_modules, coverage, dist, .vercel, .DS_Store
src/calculator.js               ← extracted pure evaluator (no DOM, no eval)
tests/calculator.test.js        ← Jest unit tests + coverage
Dockerfile                      ← FROM nginx:alpine, serves dist/
.dockerignore
vercel.json                     ← buildCommand: npm run build, outputDirectory: dist
scripts/build.mjs               ← assembles dist/ (copies index.html + assets + src)
.github/
└── workflows/
    └── ci.yml                  ← CI checks: lint-and-test → docker-build (no deploy)
README.md                       ← project docs + CI badge + setup guide
docs/
├── superpowers/specs/2026-06-03-cicd-pipeline-design.md   ← this file
└── PIPELINE.md                 ← deep-dive: stages, branch protection, Vercel setup, manual mapping
```

### Modified files

```
assets/js/script.js   ← strip math logic; call into calculator.js
index.html            ← add <script src="src/calculator.js"> before script.js
```

### The `build` stage / `dist/`

`scripts/build.mjs` copies the deployable site into `dist/`:

```
dist/
├── index.html
├── src/calculator.js
└── assets/  (css + js)
```

`dist/` is the single artifact used by the Docker validation **and** by Vercel (its
`outputDirectory`), so what we test, containerize, and ship is identical. Excludes the
`.docx`, `node_modules`, `tests/`, and docs.

---

## 7. Testing strategy

- **Framework:** Jest (`testEnvironment: node`).
- **Targets:** `src/calculator.js` only (the pure logic). DOM code is out of test scope.
- **Coverage thresholds** (enforced in CI, like the manual):
  `branches 70%, functions 80%, lines 80%, statements 80%` on `src/`.

Representative cases:

| Case | Expectation |
|------|-------------|
| `2 + 3` | `5` |
| `2 ** 3` | `8` (right-assoc: `2**2**3` = 256) |
| `10 / 2` | `5` |
| `(1 + 2) * 3` | `9` |
| `-5 + 2` | `-3` (unary minus) |
| `1 / 0` | throws (non-finite rejected) |
| `sin(30)` | `0.5` (degrees) |
| `cos(60)` | `0.5` |
| `sqrt(9)` | `3` |
| `pi` | ≈ 3.14159 |
| `2 + 50%` (via computePercent) | matches current percent semantics |
| `"3 +"` / `"(1+2"` | throws (syntax / unbalanced) |

---

## 8. CI workflow (`.github/workflows/ci.yml`)

```yaml
name: CI
on:
  pull_request: { branches: [ main ] }   # the gate: runs on every PR
  push:         { branches: [ main ] }    # post-merge sanity check
permissions:
  contents: read                          # least privilege

jobs:
  lint-and-test:          # required status check
    - checkout
    - setup-node (cache npm)
    - npm ci
    - npm run lint        # ESLint
    - npm test            # Jest --coverage (fails under threshold)
    - upload coverage artifact

  docker-build:           # required status check; needs lint-and-test
    - checkout
    - npm ci && npm run build   # produce dist/
    - docker build (validate; no push)
```

**No deploy job and no Vercel secrets in GitHub Actions** — Vercel's Git integration owns
deployment. CI's only job is to produce the green checks that branch protection requires.

### Branch protection (configured in GitHub repo settings)

Settings → Branches → add rule for `main`:

- ✅ Require a pull request before merging
- ✅ Require status checks to pass: **`lint-and-test`**, **`docker-build`**
- ✅ Require branches to be up to date before merging
- ✅ (optional) Require 1 approving review
- ✅ Do not allow bypassing the above settings

### Vercel setup (one-time, in the Vercel dashboard)

- Import the GitHub repo into Vercel (installs the Vercel GitHub App).
- Framework preset: **Other**; Build Command: `npm run build`; Output Directory: `dist`.
- Production branch: `main`. Preview deployments: enabled for all other branches/PRs.
- No tokens stored in GitHub — Vercel authenticates via its own GitHub App.

---

## 9. Security & hardening (from the manual, adapted)

- Workflow-level `permissions: contents: read`; jobs request more only if needed.
- **No deploy secrets in GitHub** — smaller secret surface than the manual's SSH model.
- Branch protection prevents direct pushes to `main` (even by admins, if "no bypass" set).
- Docker image serves static files only via `nginx:alpine` (small attack surface).
- `eval()` removed entirely — no arbitrary code execution path in the calculator.
- Optional follow-ups (out of scope): pin actions to commit SHA, add Dependabot,
  add a Trivy scan of the Nginx image.

---

## 10. Documentation deliverables

1. **`README.md`** — what the app is, how to run/test locally, the pipeline at a glance,
   a CI status badge, and the live Vercel URL.
2. **`docs/PIPELINE.md`** — the "all needed knowledge" guide: the gated branch model, each
   CI stage explained, branch-protection setup, Vercel Git-integration setup, how this maps
   back to the lab manual's 30 steps, and how to extend it (registry push, staging, etc.).
3. **This spec** — the design of record.

---

## 11. Out of scope (YAGNI)

- SSH / Linux-server deployment (replaced by Vercel).
- Deploying from GitHub Actions / storing Vercel credentials (Vercel Git integration owns CD).
- Pushing Docker images to a registry (build-only by decision).
- Adding new scientific buttons to the UI (evaluator supports trig, but wiring new buttons
  is a separate UI task — noted as a possible extension).
- Blue-green deploy, Slack notifications (manual extensions documented in `PIPELINE.md`
  but not implemented).

---

## 12. Success criteria

- [ ] `npm test` passes locally with ≥80% line coverage on `src/`.
- [ ] `npm run lint` reports zero errors.
- [ ] `npm run build` produces a working `dist/`.
- [ ] `docker build` succeeds and the container serves `/` on port 80.
- [ ] Opening a PR runs `lint-and-test` + `docker-build` as status checks.
- [ ] Branch protection blocks merging the PR until both checks are green.
- [ ] Merging to `main` triggers a Vercel **production** deploy; PRs get **preview** deploys.
- [ ] Calculator behaves identically in the browser (no `eval()`, trig works).
