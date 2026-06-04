# VUNA-Calc — DevOps CA Redesign (cPanel + SSH CI/CD)

- **Date:** 2026-06-04
- **Status:** Approved (pending spec review)
- **Author:** Irvin Uyi Osazee (VUG/SEN/22/8386) — SEN 482 DevOps CA
- **Supersedes:** `2026-06-03-cicd-pipeline-design.md` (Vercel-based model — replaced)
- **Source rubric:** Course-rep brief + `CICD_Pipeline_Lab_Manual.docx` (Mr. Iyke)

---

## 1. Overview

This is the SEN 482 CI/CD CA (30 marks). The course requires:

1. **Strip** the VUNA-Calc (last semester's project) down to digits `0–9`, basic
   operators `+ − × ÷`, the `CE`/`AC` utility buttons, and **the one feature the
   student personally added** — for this student, **combination & permutation (nCr/nPr)**.
2. Push the calculator to a **new GitHub repo**.
3. **Host it on the cloud** — on the student's provisioned **cPanel** (not Vercel).
4. Configure a **CI/CD pipeline per the lab manual** so that **every push to the repo
   automatically reflects on the live cPanel site**.

This redesign replaces the previously-built Vercel pipeline with a **GitHub Actions → cPanel
(SSH key + rsync)** pipeline, and simplifies the calculator to the required surface.

### Goal

> Push to `main` → GitHub Actions runs lint + tests → on success, rsyncs the built site
> over SSH into `public_html` → the live site at `http://irvin.vudse26.cloud` updates
> automatically. PRs run lint + tests only.

---

## 2. Provisioned environment (operational config — NOT secrets)

| Item | Value |
|------|-------|
| Live domain | `http://irvin.vudse26.cloud` |
| cPanel | `https://panel.vudse26.cloud` (`:8090`) |
| SSH host | `159.198.47.177` |
| SSH port | `22` |
| SSH user | `irvin` |
| Document root (deploy target) | `/home/irvin.vudse26.cloud/public_html` |

> **Security:** The cPanel and SSH **passwords were exposed in chat and must be rotated.**
> The pipeline will use a **dedicated SSH deploy key** (not the password). No password or
> private key is ever committed — the private key lives only in a GitHub Actions Secret.

---

## 3. Decisions (locked)

| # | Decision | Choice |
|---|----------|--------|
| 1 | Retained custom feature | **nCr / nPr** (combination & permutation) |
| 2 | Calculator surface | digits, `.`, `+ − × ÷`, `=`, `AC`, `CE`, `nCr`, `nPr` only |
| 3 | Deploy target | **cPanel** `public_html` (static hosting) |
| 4 | Deploy mechanism | **GitHub Actions → SSH key + rsync** |
| 5 | Trigger model | push to `main` auto-deploys; PRs run CI only |
| 6 | Docker | **removed** (cPanel serves static files; no container runtime) |
| 7 | Vercel | **removed** (`vercel.json` + all Vercel references deleted) |
| 8 | UI style | keep the **neumorphic** look |
| 9 | Decimal point | **kept** (`.`) |

---

## 4. Calculator stripping

### Buttons (4-column neumorphic grid)

```
 AC   CE   nCr  nPr
  7    8    9    ÷
  4    5    6    ×
  1    2    3    −
  0    .    =    +
```

### Behaviour
- **Digits / `.` / operators:** append to the current expression (existing handlers).
- **`AC` (All Clear):** reset the whole expression to empty (display shows `0`).
- **`CE` (Clear Entry):** remove the current entry — delete trailing characters back to
  (but not including) the previous operator, i.e. clear the number currently being typed.
  If the expression already ends at an operator, remove that operator.
- **`=`:** evaluate via the safe evaluator; on error show `Error`.
- **`nCr` / `nPr`:** infix operators. `5 nCr 2 =` → 10; `5 nPr 2 =` → 20.

### Removed from UI and evaluator
Scientific functions (`sin cos tan asin acos atan sqrt ln log`), constants (`pi e ans`),
`**`/`^` power, parentheses `( )`, percent `%`, and the "type letters to build function
names" keyboard behaviour.

### Keyboard support (kept, slimmed)
- `0–9`, `.`, `+ - * /`, `Enter`/`=` (evaluate), `Backspace` (delete one char),
  `Escape` (AC), `Delete` (CE).
- `nCr`/`nPr` are button-only (no natural single key); typing letters is disabled.
- `Ctrl`/`Cmd`/`Alt` combos are ignored so browser shortcuts still work.

---

## 5. The evaluator (stripped)

`src/calculator.js` keeps the tokenizer → shunting-yard → RPN architecture but with a
reduced surface:

- **Numbers:** integers and decimals.
- **Unary minus:** `-5`, `3 * -2`.
- **Binary operators:** `+ - * /` (existing precedence), plus `nCr`/`nPr`.
  - `nCr` and `nPr` are binary operators with precedence **above** `* /` (so `2*5nCr2`
    means `2*(5 nCr 2)`), left-associative.
  - Tokenized from the button output. The buttons insert distinct operator tokens
    (`C` for nCr, `P` for nPr); the tokenizer maps those to the operators.
- **Functions:** `nCr(n,r)` and `nPr(n,r)` math:
  - `nPr = n!/(n−r)!`, `nCr = n!/(r!·(n−r)!)`, computed iteratively.
  - Throw on: non-integer operands, negatives, or `r > n`.
- **Errors:** invalid syntax, division by zero / non-finite, and the nCr/nPr domain
  errors throw; `script.js` catches and shows `Error`.

Removed: `FUNCTIONS` trig/sqrt/log table, `CONSTANTS`, `**`, parentheses handling,
`computePercent`. Tests rewritten accordingly.

`module.exports` guard kept so Jest can `require()` it and the browser can load it via
`<script>`.

---

## 6. CI/CD architecture

### Workflow `.github/workflows/ci-cd.yml`

```
on: push (main), pull_request (main)
permissions: contents: read

jobs:
  ci:                      # runs on every push + PR
    - checkout
    - setup-node (cache npm)
    - npm ci
    - npm run lint
    - npm test             # Jest + coverage thresholds
    - upload coverage artifact

  deploy:                  # push to main only; needs: [ci]
    if: github.ref == 'refs/heads/main' && github.event_name == 'push'
    environment: production (url: http://irvin.vudse26.cloud)
    - checkout
    - setup-node
    - npm ci && npm run build        # produce dist/
    - rsync dist/ over SSH to DEPLOY_PATH using the deploy key
```

Deploy uses an rsync-over-SSH step (e.g. `easingthemes/ssh-deploy`, or raw `rsync`
with the key loaded via `webfactory/ssh-agent`). `--delete` keeps `public_html` in sync
with `dist/`.

### GitHub Secrets

| Secret | Value |
|--------|-------|
| `SSH_HOST` | `159.198.47.177` |
| `SSH_USER` | `irvin` |
| `SSH_PORT` | `22` |
| `SSH_PRIVATE_KEY` | contents of the dedicated deploy private key |

`DEPLOY_PATH` (`/home/irvin.vudse26.cloud/public_html`) is set as a workflow `env` value
(not secret-sensitive).

### One-time server setup (documented, run by the student)

```bash
# 1. Generate a dedicated deploy keypair locally
ssh-keygen -t ed25519 -C "github-actions-deploy" -f ~/.ssh/vuna_deploy -N ""

# 2. Add the PUBLIC key to the server (password login this once, then rotate password)
ssh-copy-id -i ~/.ssh/vuna_deploy.pub -p 22 irvin@159.198.47.177
#   OR cPanel → SSH Access → Manage SSH Keys → Import / Authorize

# 3. Test key auth
ssh -i ~/.ssh/vuna_deploy -p 22 irvin@159.198.47.177 'echo OK && ls public_html'

# 4. Paste the PRIVATE key (cat ~/.ssh/vuna_deploy) into GitHub Secret SSH_PRIVATE_KEY
```

---

## 7. File inventory

### Add
```
.github/workflows/ci-cd.yml     ← CI + SSH-rsync deploy (replaces ci.yml)
```

### Modify
```
src/calculator.js               ← strip to + - * / and nCr/nPr; rewrite exports
tests/calculator.test.js        ← rewrite tests for the stripped evaluator + nCr/nPr
assets/js/script.js             ← remove scientific/letter keyboard; add CE; keep AC
index.html                      ← strip scientific/bracket/% buttons; add nCr/nPr/CE
README.md                       ← cPanel/SSH pipeline; new live URL
docs/PIPELINE.md                ← rewrite for cPanel/SSH + manual mapping + server setup
package.json                    ← (only if scripts need changing — likely unchanged)
```

### Remove
```
.github/workflows/ci.yml        ← superseded by ci-cd.yml
vercel.json
Dockerfile
.dockerignore
```

`scripts/build.mjs`, `eslint.config.js`, `.gitignore` stay as-is. `dist/` is what gets
deployed.

---

## 8. Testing

- Jest unit tests on `src/calculator.js` (the pure logic). Coverage thresholds kept
  (branches 70, functions/lines/statements 80) on `src/`.
- Representative cases:

| Case | Expectation |
|------|-------------|
| `2+3` | 5 |
| `10-4` | 6 |
| `6*7` | 42 |
| `10/2` | 5 |
| `2+3*4` | 14 |
| `-5+2` | -3 (unary minus) |
| `1.5+2.5` | 4 |
| `5 nCr 2` (`5C2`) | 10 |
| `5 nPr 2` (`5P2`) | 20 |
| `6C0` / `6C6` | 1 |
| `1/0` | throws |
| `5C7` (r>n) | throws |
| `2.5C1` (non-integer) | throws |
| `3+` / empty | throws |

- CE/AC behaviour verified via the Node DOM-shim harness (used in prior rounds):
  AC empties; CE clears the current entry back to the previous operator.

---

## 9. Security & hardening

- Dedicated SSH **deploy key**, not the account password; rotate the leaked passwords.
- Workflow-level `permissions: contents: read`.
- Secrets only in GitHub Actions Secrets; never committed; `.gitignore` already excludes
  `.env`, keys, `node_modules`, `dist`, `coverage`.
- `rsync --delete` scoped to `public_html` so deploys are reproducible.
- No `eval()` in the calculator (safe evaluator retained).

---

## 10. Documentation deliverables

1. **`README.md`** — what the app is, the stripped feature set, local dev, the live URL,
   and a pipeline-at-a-glance table.
2. **`docs/PIPELINE.md`** — full guide: the push→deploy flow, the CI/CD workflow stages,
   GitHub Secrets, the one-time SSH-key server setup, and how it maps to Mr. Iyke's manual
   (Node app → static calc; Docker/registry → static rsync; SSH deploy → same).
3. **This spec** — design of record.

---

## 11. Out of scope (YAGNI)

- Docker / container hosting (cPanel is static file hosting).
- Vercel (removed).
- Scientific functions, parentheses, `%`, power (stripped per rubric).
- Branch protection automation (optional; documented but not required for the grade).
- Blue-green / staging environments.

---

## 12. Success criteria

- [ ] Calculator shows only: digits, `.`, `+ − × ÷`, `=`, `AC`, `CE`, `nCr`, `nPr`.
- [ ] `nCr`/`nPr` compute correctly and reject invalid input.
- [ ] `npm test` passes with coverage ≥ thresholds; `npm run lint` clean.
- [ ] `npm run build` produces a deployable `dist/`.
- [ ] Vercel/Docker artifacts removed from the repo.
- [ ] Pushing to `main` runs CI then rsyncs to `public_html`; PRs run CI only.
- [ ] After a push, `http://irvin.vudse26.cloud` reflects the change automatically.
