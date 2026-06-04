# Defense Crib Sheet — VUNA Calculator CI/CD (SEN 482)

A quick-reference for defending this project. Skim the **30-second pitch**, rehearse the
**live demo**, and read the **Q&A** so nothing catches you off guard.

---

## 30-second pitch

> "I took last semester's VUNA calculator, stripped it to the required surface — digits,
> `+ − × ÷`, `=`, `AC`, `CE`, plus my own feature (combination & permutation, `nCr`/`nPr`).
> I rebuilt the maths as a safe expression evaluator with no `eval()`, covered it with Jest
> unit tests, and wired up a GitHub Actions CI/CD pipeline. Every push to `main` runs lint
> and tests, then — if they pass — automatically deploys the site to my cPanel over SSH with
> rsync. So a `git push` updates `http://irvin.vudse26.cloud` with zero manual steps."

---

## Live demo script (rehearse this)

1. **Show the app** locally or live. Do `7 + 8 =` → 15. Do `5 nCr 2 =` → 10, `5 nPr 2 =` → 20.
   Show `AC` (clears all) and `CE` (clears the current entry). Toggle dark mode.
2. **Show the code structure** — three files: `index.html` (buttons), `assets/js/script.js`
   (UI wiring), `src/calculator.js` (the maths engine, no DOM).
3. **Run the tests** — `npm test`. Point at the green run and the coverage table.
4. **Show the workflow** — open `.github/workflows/ci-cd.yml`; explain the `ci` and `deploy` jobs.
5. **Make a real change** — edit a label or a colour, `git commit`, `git push`.
6. **Open the GitHub Actions tab** — watch `ci` (lint + test) then `deploy` (build + rsync) go green.
7. **Refresh** `http://irvin.vudse26.cloud` — the change is live. **That is CI/CD.**

> Tip: have the Actions tab and the live site open in two tabs before you start.

---

## Core concepts (be able to say these in your own words)

**CI (Continuous Integration):** automatically build, lint and test code on every change,
so problems are caught immediately. Here: the `ci` job runs ESLint + Jest on every push/PR.

**CD (Continuous Deployment):** automatically ship validated builds to the live server.
Here: the `deploy` job rsyncs the built site to cPanel after `ci` passes.

**The pipeline = CI + CD glued by GitHub Actions**, triggered by `git push`.

---

## Architecture (draw this if asked)

```
 index.html  ──▶  assets/js/script.js  ──▶  src/calculator.js
 (the keypad)     (DOM events, state)        (pure maths engine — no DOM, no eval)
```

- **`index.html`** — Bootstrap card + a 4-column CSS-grid keypad; each button has an
  `onclick`. Loads `calculator.js` then `script.js`.
- **`script.js`** — holds the `currentExpression` string and the handlers
  (`appendToResult`, `operatorToResult`, `clearResult`=AC, `clearEntry`=CE,
  `calculateResult`, `toggleTheme`) plus a keyboard listener.
- **`calculator.js`** — the engine: `tokenize → shunting-yard → RPN → evaluate`.
  Exports for tests via `module.exports`; global in the browser.

---

## How the maths engine works (the part examiners love)

Three stages, **no `eval()`**:

1. **Tokenize** — turn `"5C2"` into tokens `[5, C, 2]`. Unknown characters throw.
2. **Shunting-yard → RPN** — reorder by precedence into Reverse Polish Notation.
   Precedence: `+ −` < `× ÷` < `nCr/nPr` < unary minus. So `2+3*4` → `2 3 4 * +`.
3. **Evaluate RPN** — a stack machine: push numbers, pop operands per operator.
   Non-finite results (like `1/0`) throw → the UI shows `Error`.

**Why not `eval()`?** `eval` executes arbitrary JavaScript — a security hole and bad
practice. The custom evaluator only understands the operators I defined, nothing else.

### nCr / nPr (my feature)
- `nPr = n·(n−1)···(n−r+1)` (permutations — order matters)
- `nCr = nPr / r!` (combinations — order doesn't matter), computed with the multiplicative
  formula so it stays exact without giant factorials.
- Both validate: integers, `n ≥ r ≥ 0`; otherwise they throw and the display shows `Error`.

---

## The pipeline (`.github/workflows/ci-cd.yml`)

```
on: push→main, pull_request→main

ci      (every push + PR):   npm ci → lint → test (coverage gate) → upload coverage
deploy  (push→main only):    npm ci → build dist/ → rsync over SSH → public_html
        needs: ci            (so a failing test blocks the deploy)
```

- **Trigger:** `git push` to `main`.
- **Gate:** `deploy` has `needs: [ci]` — if lint or tests fail, nothing deploys.
- **PRs:** run `ci` only (no deploy) — safe to review before merging.
- **Deploy mechanics:** `easingthemes/ssh-deploy` runs **rsync over SSH**, using the
  `SSH_PRIVATE_KEY` secret to copy `dist/` into `/home/irvin.vudse26.cloud/public_html`.

---

## Security (likely a marked question)

- **No password in CI** — a dedicated **SSH deploy key**; the private key lives only in the
  encrypted GitHub Secret `SSH_PRIVATE_KEY`, never in the repo.
- **Secrets** (`SSH_HOST`, `SSH_USER`, `SSH_PORT`, `SSH_PRIVATE_KEY`) are encrypted by GitHub
  and masked in logs.
- **`.gitignore`** excludes `.env`, keys, `node_modules`, `dist`, `coverage`.
- **No `eval()`** — no arbitrary-code-execution surface.

---

## Anticipated questions & answers

**Q: What does a push actually trigger?**
A: GitHub receives the commit on `main` → Actions runs `ci` (lint + tests) → if green,
`deploy` builds `dist/` and rsyncs it to `public_html` → Apache serves it → the live URL updates.

**Q: Why GitHub Actions and not something else?**
A: It's built into GitHub, free for this, triggered directly by git events, and is exactly
what the lab manual uses. The workflow file is version-controlled with the code.

**Q: Why rsync over SSH instead of FTP or Docker?**
A: cPanel serves static files from `public_html`, so deployment is just copying files — no
container runtime exists there, so Docker isn't applicable. rsync over SSH is secure
(key-based), only transfers changed files, and matches the manual's "SSH deploy" step.

**Q: What is `rsync --delete`?**
A: It mirrors `dist/` to the server — files removed locally are removed on the server too,
so the live folder is an exact copy of the build. I exclude `cgi-bin` and `.well-known` so
cPanel's own folders survive.

**Q: What happens if a test fails?**
A: The `ci` job fails, and because `deploy` `needs: ci`, the deploy never runs. Broken code
can't reach production.

**Q: Why separate `app`/maths from the DOM?**
A: So the maths engine can be unit-tested in Node without a browser, and reused. It also
keeps each file single-purpose.

**Q: Why is there a `dist/` folder?**
A: It's the clean, deployable build — only `index.html`, `assets/`, and the engine. Tests,
`node_modules`, and docs never go to the server.

**Q: How do you know coverage is real?**
A: `package.json` sets Jest coverage thresholds (80% lines/functions/statements, 70%
branches). If coverage drops below that, `npm test` fails — so the gate can't be gamed.

**Q: Could two pushes collide?**
A: Each push runs its own workflow; the latest push to `main` produces the latest deploy.
(If needed, a `concurrency` block can queue deploys — mentioned in the manual.)

**Q: How is this different from the manual?**
A: Same backbone (GitHub Actions, Jest, ESLint, SSH deploy). Adaptations: the app is static
(no Express server), and Docker/registry is dropped because cPanel hosts static files directly.

**Q: Show me where the secrets are used.**
A: In the `deploy` job — `${{ secrets.SSH_PRIVATE_KEY }}` etc. They're set in GitHub →
Settings → Secrets and variables → Actions, never in the code.

---

## One-line answers to "explain X"

- **Tokenizer:** splits the expression string into numbers and operators.
- **Shunting-yard:** orders tokens by precedence into RPN.
- **RPN eval:** stack machine that computes the RPN.
- **ESLint:** static analysis that enforces code style/quality; fails CI on errors.
- **Jest:** the test runner; asserts the engine returns correct values.
- **Artifact:** the coverage report uploaded by the `ci` job for inspection.
- **`needs: ci`:** dependency that gates deploy behind passing tests.
- **rsync:** efficient file-sync that only transfers differences.
