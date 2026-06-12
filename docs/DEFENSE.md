# Defense Crib Sheet — VUNA Calculator CI/CD (SEN 482)

Quick reference for defending the project. Rehearse the **demo**, skim the **Q&A**.

---

## 30-second pitch

> "I stripped last semester's VUNA calculator to digits, `+ − × ÷`, `=`, `AC`, `CE`, and my
> own feature — combination & permutation (`nCr`/`nPr`). I rebuilt the maths as a safe
> expression evaluator with no `eval()`, covered it with Jest tests, and built a GitHub Actions
> CI/CD pipeline. On every push to `main` it lints and tests, builds a **Docker image and
> pushes it to Docker Hub**, and **deploys the site over FTP to my cPanel**. So a `git push`
> updates `http://irvin.vudse26.cloud` automatically — no manual upload."

---

## Live demo script

1. **Show the app** (live or local). `7 + 8 =` → 15. `5 nCr 2 =` → 10, `5 nPr 2 =` → 20.
   Show `AC` (clear all) and `CE` (clear last entry). Toggle dark mode.
2. **Show the structure** — `index.html` (buttons), `assets/js/script.js` (UI wiring),
   `src/calculator.js` (the maths engine, no DOM, no eval).
3. **Run the tests** — `npm test` → green + coverage table.
4. **Show the workflow** — `.github/workflows/ci-cd.yml`: the three jobs `ci`, `docker`, `deploy`.
5. **Make a real change** — edit a colour/label, `git commit`, `git push`.
6. **Open the Actions tab** — watch `ci` → `docker` (pushing to Docker Hub) + `deploy` (FTP) go green.
7. **Refresh** `http://irvin.vudse26.cloud` — the change is live. **That's CI/CD.**
8. **Bonus:** `docker run -p 8080:80 irvinuyi/vuna-calc:latest` — the same app running as a container.

---

## Core concepts

- **CI (Continuous Integration):** auto build/lint/test every change. Here: the `ci` job.
- **CD (Continuous Deployment):** auto-ship validated builds. Here: `docker` (publish image) +
  `deploy` (publish site).
- **Pipeline = CI + CD via GitHub Actions**, triggered by `git push`.

---

## Architecture

```
 index.html  ──▶  assets/js/script.js  ──▶  src/calculator.js
 (the keypad)     (DOM events, state)        (pure maths engine — no DOM, no eval)
```

- **`index.html`** — Bootstrap card + 4-column CSS-grid keypad; loads `calculator.js` then `script.js`.
- **`script.js`** — `currentExpression` string + handlers (`appendToResult`, `operatorToResult`,
  `clearResult`=AC, `clearEntry`=CE, `calculateResult`, `toggleTheme`) + keyboard listener.
- **`calculator.js`** — engine: `tokenize → shunting-yard → RPN → evaluate`. Exported for Jest.

---

## How the maths engine works (no `eval()`)

1. **Tokenize** — `"5C2"` → `[5, C, 2]`. Unknown characters throw.
2. **Shunting-yard → RPN** — reorder by precedence. `+ −` < `× ÷` < `nCr/nPr` < unary minus.
3. **Evaluate RPN** — stack machine; push numbers, pop operands per operator. Non-finite (e.g.
   `1/0`) throws → UI shows `Error`.

**No `eval()`** because `eval` runs arbitrary JS — a security hole. The evaluator only knows the
operators I defined.

### nCr / nPr (my feature)
- `nPr = n·(n−1)···(n−r+1)`; `nCr = nPr / r!` (multiplicative formula, stays exact).
- Validates integers, `n ≥ r ≥ 0`; otherwise throws → `Error`. (`C`/`P` are the internal
  operator symbols the buttons insert.)

---

## The pipeline (`.github/workflows/ci-cd.yml`)

```
on: push→main, pull_request→main

ci      (push + PR):  npm ci → lint → test (coverage gate) → typecheck → test:unit → upload coverage
docker  (push→main):  build Dockerfile → push irvinuyi/vuna-calc:{latest,sha} to Docker Hub
deploy  (push→main):  npm run build → FTP dist/ into public_html
docker & deploy both: needs: [ci]   (failing tests block both)
```

**Secrets** (GitHub → Settings → Secrets): `FTP_SERVER`, `FTP_USERNAME`, `FTP_PASSWORD`,
`DOCKERHUB_USERNAME`, `DOCKERHUB_TOKEN`. Encrypted, masked in logs, never in the repo.

---

## Anticipated questions & answers

**Q: What does a push trigger?**
A: Actions runs `ci` (lint+test); if green, `docker` builds+pushes the image to Docker Hub and
`deploy` FTPs the built site into `public_html`. The live URL updates.

**Q: Why FTP instead of SSH/rsync?**
A: The host is **CyberPanel** with SSH locked down — one SSH user is no-login (SFTP stream
corrupts), the other is a restricted shell that blocks key install and SFTP. CyberPanel's FTP
service is separate and works, so I deploy over FTP with a dedicated, scoped FTP account.

**Q: Docker is in the manual — where does it run?**
A: Shared cPanel hosting can't run containers (no Docker daemon for my user). So the Docker
stage **builds the image and pushes it to Docker Hub** — a real, runnable artifact. The live
site is served by cPanel from static files. I can prove the image runs with
`docker run -p 8080:80 irvinuyi/vuna-calc:latest`.

**Q: What if a test fails?**
A: `ci` fails, and `docker`/`deploy` both `needs: ci`, so neither runs. Nothing ships.

**Q: Why separate the maths from the DOM?**
A: So the engine can be unit-tested in Node without a browser, and each file has one job.

**Q: Why is there a `dist/` folder?**
A: It's the clean deployable build (just `index.html`, `assets/`, the engine). Tests,
`node_modules`, docs never go to the server.

**Q: Is coverage real?**
A: Yes — `package.json` sets Jest thresholds (80% lines/functions/statements, 70% branches).
Below that, `npm test` fails, so the gate can't be gamed.

**Q: Is FTP secure?**
A: Plain FTP sends credentials in cleartext, so I use a dedicated, easily-rotated deploy
account scoped to the website. It can be upgraded to FTPS by switching one workflow setting.

**Q: How do PRs behave?**
A: A PR runs `ci` only — no image push, no deploy — so I can review before merging. Merging to
`main` triggers the full pipeline.

**Q: Show me where secrets are used.**
A: In `docker` (`${{ secrets.DOCKERHUB_* }}`) and `deploy` (`${{ secrets.FTP_* }}`). Set in
GitHub repo settings, never in code.

---

## One-line answers to "explain X"

- **Tokenizer / shunting-yard / RPN:** split → order by precedence → stack-evaluate.
- **ESLint / Jest / tsc / Vitest:** style checker / Jest unit tests with coverage / TypeScript type check / Vitest unit tests; all four gate CI.
- **`needs: ci`:** dependency that blocks docker+deploy behind passing tests.
- **Docker Hub:** public registry where CI publishes the container image.
- **FTP deploy:** uploads the built site into `public_html` over CyberPanel's FTP service.
