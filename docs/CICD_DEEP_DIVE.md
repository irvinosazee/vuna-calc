# CI/CD Pipeline — Deep Dive (Defense Reference)

An exhaustive explanation of the pipeline and every supporting component, tracing **one commit
from `git commit` all the way to the live server**. This is the document to study for the
defense: it focuses on the **CI/CD implementation** and the concepts behind each moving part,
not the calculator itself.

> Real values used throughout: repo `github.com/irvinosazee/vuna-calc`, image
> `irvinuyi/vuna-calc`, live site `http://irvin.vudse26.cloud`, server `159.198.47.177`.

---

## Table of contents
1. [What CI/CD is and why it exists](#1)
2. [The 10,000-ft picture of THIS pipeline](#2)
3. [Stage 0 — Git: the commit and the push](#3)
4. [Stage 1 — GitHub receives the push and fires an event](#4)
5. [Stage 2 — GitHub Actions: the engine](#5)
6. [Anatomy of the workflow file, line by line](#6)
7. [The runner: an ephemeral virtual machine](#7)
8. [Job 1 — `ci` (lint + test): the quality gate](#8)
9. [Job 2 — `docker` (build + push to Docker Hub)](#9)
10. [Job 3 — `deploy` (FTP to cPanel)](#10)
11. [How the live server serves the files](#11)
12. [Secrets and security model](#12)
13. [Job orchestration: needs, if, parallelism](#13)
14. [Full lifecycle trace of one commit](#14)
15. [Failure modes (what blocks what)](#15)
16. [Glossary](#16)
17. [Likely exam questions → where to look](#17)

---

<a name="1"></a>
## 1. What CI/CD is and why it exists

**CI — Continuous Integration:** every code change is automatically **built, linted and
tested** the moment it's shared, so defects are caught in minutes, not at release time.

**CD — Continuous Deployment/Delivery:** every change that passes CI is automatically
**packaged and shipped** to its destination (a server, a registry) with no manual steps.

**The problem they solve:** manual testing and manual `FTP-the-files-up` is slow, error-prone,
and inconsistent ("works on my machine"). A pipeline makes the process **automatic,
repeatable, and gated** — bad code can't reach production because the tests stand in the way.

**A "pipeline"** is just an ordered set of automated stages triggered by an event (here, a
`git push`). Our pipeline = **GitHub Actions** (the automation engine) running three stages:
test → containerise → deploy.

---

<a name="2"></a>
## 2. The 10,000-ft picture of THIS pipeline

```
  Developer            GitHub                     GitHub Actions runners              Targets
 ┌─────────┐  push    ┌──────────┐   event   ┌──────────────────────────────┐
 │ git     │ ───────▶ │  repo    │ ────────▶ │  ci      (lint + Jest)        │
 │ commit  │   main   │  (main)  │           │   │ pass                       │
 └─────────┘          └──────────┘           │   ├─▶ docker (build → push) ───┼─▶ Docker Hub
                                             │   └─▶ deploy (build → FTP) ────┼─▶ cPanel public_html
                                             └──────────────────────────────┘        │
                                                                                      ▼
                                                                       http://irvin.vudse26.cloud
```

- **Trigger:** a `push` to `main` (or a `pull_request`, which runs `ci` only).
- **Gate:** `docker` and `deploy` only run **after `ci` passes**.
- **Outputs:** a Docker image on Docker Hub, and the live website on cPanel.

---

<a name="3"></a>
## 3. Stage 0 — Git: the commit and the push

**Git** is a distributed version-control system. Key objects/terms:

- **Commit:** an immutable snapshot of your files plus metadata (author, message, parent
  commit, and a unique **SHA-1 hash** like `89e729b…`). The hash is the commit's identity.
- **Branch (`main`):** a movable pointer to the latest commit on a line of work.
- **Remote (`origin`):** a named link to the GitHub copy of the repo
  (`https://github.com/irvinosazee/vuna-calc.git`).
- **`git commit`** records the snapshot **locally** — nothing leaves your machine yet.
- **`git push`** uploads your new commits to the remote and moves the remote's `main` pointer
  to match yours. *This push is the event that starts everything.*

So the pipeline's "start button" is literally `git push`. The commit SHA created here travels
all the way through — it even becomes a **Docker image tag** (`vuna-calc:89e729b…`), giving you
end-to-end traceability from a running image back to the exact source commit.

---

<a name="4"></a>
## 4. Stage 2 — GitHub receives the push and fires an event

When the push reaches GitHub:
1. GitHub updates the server-side `main` to your new commit.
2. GitHub looks in **`.github/workflows/`** for any workflow whose `on:` triggers match the
   event. Our `ci-cd.yml` listens for `push` to `main` → **match** → GitHub creates a
   **workflow run**.
3. Each `pull_request` to `main` also matches → a run with only the `ci` job effectively
   (the others are gated by an `if` — see §13).

A **workflow run** is one execution of the whole file for one event. Inside it are **jobs**,
inside jobs are **steps**.

---

<a name="5"></a>
## 5. Stage 2 — GitHub Actions: the engine

**GitHub Actions** is GitHub's built-in automation/CI-CD service. Vocabulary:

| Term | Meaning |
|------|---------|
| **Workflow** | A YAML file in `.github/workflows/`. Defines triggers + jobs. |
| **Event/Trigger** | What starts a run (`push`, `pull_request`, `schedule`, manual…). |
| **Run** | One execution of a workflow for one event. |
| **Job** | A group of steps that runs on **one runner**. Jobs run in parallel by default. |
| **Step** | A single command (`run:`) or a reusable **action** (`uses:`). |
| **Action** | A packaged, shareable unit (e.g. `actions/checkout`, `docker/login-action`). |
| **Runner** | The machine that executes a job (here GitHub-hosted `ubuntu-latest`). |
| **Artifact** | A file saved from a run for download (we save the coverage report). |
| **Secret** | An encrypted variable injected at runtime (FTP/Docker creds). |

Why Actions here: it's **built into GitHub** (no extra server), it's **event-driven** (a push
runs it), and the config lives **with the code** (version-controlled, auditable).

---

<a name="6"></a>
## 6. Anatomy of the workflow file, line by line

This is the real `.github/workflows/ci-cd.yml`, explained.

```yaml
name: CI/CD                      # display name in the Actions tab
```

```yaml
on:                              # WHEN this workflow runs
  push:
    branches: [ main ]           # a commit landing on main → full pipeline
  pull_request:
    branches: [ main ]           # a PR targeting main → tests only
```
`on:` is the trigger map. Two events: real pushes to `main`, and pull requests into `main`.

```yaml
permissions:
  contents: read                 # least privilege: the auto GITHUB_TOKEN can only READ the repo
```
By default the automatic `GITHUB_TOKEN` can write to the repo. We **down-scope** it to
read-only — a security best practice (principle of least privilege).

```yaml
jobs:
  ci:
    name: Lint & Test
    runs-on: ubuntu-latest       # spin up a fresh Ubuntu VM for this job
    steps:
      - uses: actions/checkout@v4          # clone the repo at this commit onto the runner
      - uses: actions/setup-node@v4        # install Node.js + enable npm caching
        with: { node-version: '20', cache: 'npm' }
      - run: npm ci                         # clean, reproducible dependency install
      - run: npm run lint                   # ESLint — static code-quality check
      - run: npm test                       # Jest — unit tests + coverage gate
      - uses: actions/upload-artifact@v4    # keep the coverage report as a downloadable artifact
        with: { name: coverage, path: coverage/, retention-days: 14 }
```

```yaml
  docker:
    name: Docker Build & Push
    runs-on: ubuntu-latest
    needs: [ci]                                   # wait for ci to PASS first
    if: github.ref == 'refs/heads/main'
        && github.event_name == 'push'            # only on a real push to main (not PRs)
    steps:
      - uses: actions/checkout@v4
      - uses: docker/setup-buildx-action@v3       # set up Buildx, Docker's advanced builder
      - uses: docker/login-action@v3              # log in to Docker Hub using secrets
        with:
          username: ${{ secrets.DOCKERHUB_USERNAME }}
          password: ${{ secrets.DOCKERHUB_TOKEN }}
      - uses: docker/build-push-action@v6         # build the Dockerfile and push the image
        with:
          context: .
          push: true
          tags: |
            ${{ secrets.DOCKERHUB_USERNAME }}/vuna-calc:latest
            ${{ secrets.DOCKERHUB_USERNAME }}/vuna-calc:${{ github.sha }}
          cache-from: type=gha
          cache-to: type=gha,mode=max
```

```yaml
  deploy:
    name: Deploy to cPanel (FTP)
    runs-on: ubuntu-latest
    needs: [ci]
    if: github.ref == 'refs/heads/main' && github.event_name == 'push'
    environment:                                  # named GitHub "Environment" → shows the URL
      name: production
      url: http://irvin.vudse26.cloud
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20', cache: 'npm' }
      - run: npm ci
      - run: npm run build                        # produce dist/ (the deployable files)
      - uses: SamKirkland/FTP-Deploy-Action@v4.3.5 # upload dist/ over FTP
        with:
          server:    ${{ secrets.FTP_SERVER }}
          username:  ${{ secrets.FTP_USERNAME }}
          password:  ${{ secrets.FTP_PASSWORD }}
          protocol:  ftp
          local-dir: ./dist/
          server-dir: ./public_html/
```

**Expression syntax** `${{ ... }}` is GitHub Actions' templating. `secrets.X` reads a secret;
`github.ref`/`github.event_name`/`github.sha` are **context variables** describing the event.

---

<a name="7"></a>
## 7. The runner: an ephemeral virtual machine

Each job's `runs-on: ubuntu-latest` gives it a **brand-new, throwaway Ubuntu VM** hosted by
GitHub. Important consequences:

- **Clean every time** — no leftover state, which is *why builds are reproducible*.
- **Nothing persists between jobs** unless explicitly passed (via artifacts or job outputs).
  That's why `docker` and `deploy` each run `checkout` + `npm ci` again — they're separate VMs.
- The runner already has Git, Docker, Node tooling, etc. preinstalled; actions add the rest.

**`actions/checkout@v4`** clones your repo onto the runner at the exact commit that triggered
the run — so the runner is working with precisely your pushed code.

**`actions/setup-node@v4`** installs the requested Node.js version and (with `cache: 'npm'`)
restores the npm cache keyed on `package-lock.json`, so repeat installs are fast.

`@v4` is the **action version** (a Git tag of that action's repo) — pinning a version keeps
builds stable.

---

<a name="8"></a>
## 8. Job 1 — `ci` (lint + test): the quality gate

This is the **gate**: if it fails, nothing ships.

**`npm ci`** ("clean install") installs dependencies **exactly** as pinned in
`package-lock.json`. Unlike `npm install`, it deletes `node_modules` first and never silently
changes the lockfile → **reproducible, deterministic** installs. CI always uses `npm ci`.

**`npm run lint` → ESLint.** *Linting* is **static analysis**: reading the code (without
running it) to flag style problems and likely bugs — undefined variables, `==` vs `===`,
missing semicolons. Our config (`eslint.config.js`, ESLint 9 "flat config") declares the
allowed globals and rules. A lint **error** makes the step exit non-zero → the job fails.

**`npm test` → Jest with coverage.** *Jest* is the test runner. Our tests call the pure
evaluator and assert results (`evaluateExpression('5C2')` → `10`). Two key ideas:
- **Unit test:** checks one small piece in isolation — fast, precise.
- **Code coverage:** the % of code actually exercised by tests. `package.json` sets
  **coverage thresholds** (lines/functions/statements 80%, branches 70%). If coverage drops
  below them, `npm test` **fails** — so you can't merge untested code. The gate can't be gamed.

**`actions/upload-artifact`** saves the generated `coverage/` folder as a downloadable
**artifact** attached to the run — evidence/record of the test coverage.

Exit codes are the glue: every step that returns non-zero fails the job. Lint error, failing
test, or low coverage → `ci` red → `docker`/`deploy` skipped.

---

<a name="9"></a>
## 9. Job 2 — `docker` (build + push to Docker Hub)

**Docker concepts (be able to define these):**
- **Image:** a read-only, layered template containing an app + its runtime/OS libs. Built from
  a **Dockerfile**.
- **Container:** a running instance of an image (an isolated process).
- **Registry:** a server that stores images. **Docker Hub** is the public default registry.
- **Tag:** a label on an image (`:latest`, `:89e729b…`) identifying a version.
- **Layer:** each Dockerfile instruction creates a cached layer; unchanged layers are reused.

**The Dockerfile (multi-stage), explained:**
```dockerfile
FROM node:20-alpine AS build      # STAGE 1: a small Node image to build the site
WORKDIR /app
COPY package*.json ./             # copy manifests first → better layer caching
RUN npm ci                        # install deps
COPY . .                          # copy the rest of the source
RUN npm run lint && npm test && npm run build   # quality-check INSIDE the image, then build dist/

FROM nginx:alpine AS production   # STAGE 2: a tiny web server image
COPY --from=build /app/dist /usr/share/nginx/html   # take ONLY the built dist/ from stage 1
EXPOSE 80                         # document the port the container serves on
```
**Why multi-stage?** The final image is just **nginx + your built files** — it does **not**
contain Node, npm, tests, or `node_modules`. That makes it small (~26 MB) and secure (smaller
attack surface). Stage 1 is the "workshop"; stage 2 is the "shipped product".

**The job steps:**
- **`docker/setup-buildx-action`** enables **Buildx** (BuildKit) — Docker's modern builder with
  caching and multi-platform support.
- **`docker/login-action`** authenticates to Docker Hub using `DOCKERHUB_USERNAME` +
  `DOCKERHUB_TOKEN` (an access token, not your account password — revocable, scoped).
- **`docker/build-push-action`** builds the image from the Dockerfile and, with `push: true`,
  uploads it to Docker Hub under two tags: `:latest` (the moving "newest") and
  `:${{ github.sha }}` (immutable, tied to the exact commit). `cache-from/to: type=gha` reuses
  layers from GitHub's cache to speed up rebuilds.

Result: `docker.io/irvinuyi/vuna-calc:latest` (+ sha) — a runnable artifact anyone with Docker
can `docker run -p 8080:80 irvinuyi/vuna-calc:latest`.

> **Why build Docker but deploy by FTP?** cPanel shared hosting can't *run* containers (no
> Docker daemon for your user). So Docker satisfies the manual's **containerise + registry**
> requirement, while the live site is served from static files. Two complementary outputs.

---

<a name="10"></a>
## 10. Job 3 — `deploy` (FTP to cPanel)

**What "deploy" means here:** copy the freshly **built static files** into the web server's
public folder so the world sees the new version.

Steps:
1. `checkout` + `setup-node` + `npm ci` (fresh VM, remember).
2. **`npm run build`** runs `scripts/build.mjs`, which assembles **`dist/`** = `index.html` +
   `assets/` + `src/calculator.js`. Only these go live (no tests, no `node_modules`).
3. **`SamKirkland/FTP-Deploy-Action`** opens an **FTP** connection and uploads `dist/`:
   - **FTP (File Transfer Protocol):** a standard protocol for moving files to a server. It
     authenticates with a username + password and transfers files over the network.
   - `server` / `username` / `password` come from **secrets**.
   - `local-dir: ./dist/` — what to upload (the build output).
   - `server-dir: ./public_html/` — where it lands. cPanel serves the web root from
     `public_html`, so the calculator's `index.html` becomes the site's homepage.
   - The action only transfers **changed files** (it tracks state), so redeploys are fast.

**Why FTP instead of SSH/rsync (defense point):** the server runs **CyberPanel** with SSH
locked down — the website SSH user is *no-login* (SFTP stream corrupts) and the main user is a
*restricted shell* (blocks key install and SFTP). FTP is a **separate service** that works, so
the pipeline deploys over FTP with a dedicated, scoped FTP account.

---

<a name="11"></a>
## 11. How the live server serves the files

Once `dist/` is in `/home/irvin.vudse26.cloud/public_html`:
1. A visitor's browser requests `http://irvin.vudse26.cloud/`.
2. **DNS** resolves the subdomain to the server's IP (`159.198.47.177`).
3. The server's **web server** (LiteSpeed/Apache, managed by CyberPanel) maps the domain to
   that `public_html` folder and returns `index.html`.
4. The browser then requests the linked assets (`assets/css/…`, `src/calculator.js`), the
   server returns them, and the calculator renders and runs **entirely in the browser**
   (it's a static client-side app — no server-side code executes).

So "the server" just hands out files; all the calculator logic runs on the visitor's machine.

---

<a name="12"></a>
## 12. Secrets and security model

**GitHub Secrets** are encrypted values stored per-repo (Settings → Secrets and variables →
Actions). At runtime they're injected into `${{ secrets.X }}` and **masked** in logs (printed
as `***`). They are **never** in the repository.

Our five secrets:
| Secret | Used by | Purpose |
|--------|---------|---------|
| `FTP_SERVER` | deploy | server address |
| `FTP_USERNAME` | deploy | FTP login |
| `FTP_PASSWORD` | deploy | FTP password |
| `DOCKERHUB_USERNAME` | docker | registry login |
| `DOCKERHUB_TOKEN` | docker | registry access token (revocable) |

Other hardening in the pipeline:
- **`permissions: contents: read`** — least privilege for the automatic token.
- **Access token, not a password,** for Docker Hub — can be revoked without changing your
  account password.
- **`.gitignore`** keeps `.env`, keys, `node_modules`, `dist`, `coverage` out of the repo.
- The app has **no `eval()`** — no arbitrary-code-execution surface.
- The repo is **private** — the server IP/username in docs aren't world-readable.

---

<a name="13"></a>
## 13. Job orchestration: `needs`, `if`, parallelism

By default, jobs in a workflow run **in parallel**. We shape that with two mechanisms:

- **`needs: [ci]`** on `docker` and `deploy` creates a **dependency**: they wait for `ci` to
  finish **successfully**. If `ci` fails, both are **skipped**. This is the gate.
- **`if: github.ref == 'refs/heads/main' && github.event_name == 'push'`** restricts `docker`
  and `deploy` to **real pushes to `main`**. On a **pull request**, the condition is false, so
  only `ci` runs — you get test feedback on the PR without publishing or deploying.

Resulting dependency graph:
```
            ┌─▶ docker   (needs ci, main+push only)   → Docker Hub
ci ─ pass ──┤
            └─▶ deploy   (needs ci, main+push only)   → cPanel
```
`docker` and `deploy` run **in parallel** with each other once `ci` is green.

**Branch model:** work on a branch → open a PR (CI tests it) → merge to `main` → full pipeline
deploys. For this project, pushing straight to `main` also works and deploys immediately.

---

<a name="14"></a>
## 14. Full lifecycle trace of one commit

Follow commit `89e729b` from keyboard to live site:

1. **You** edit a file, `git add`, `git commit` → a snapshot + SHA `89e729b` is recorded locally.
2. **`git push`** → the commit travels to GitHub; server-side `main` advances to `89e729b`.
3. **GitHub** sees a `push` to `main`, matches `ci-cd.yml`'s `on:`, and **creates a run**.
4. **Runner A** boots (Ubuntu VM) for **`ci`**: checkout `89e729b` → `setup-node` → `npm ci` →
   `npm run lint` → `npm test` (coverage gate) → upload coverage. ✅ (~20s)
5. `ci` passing **unblocks** `docker` and `deploy` (their `needs` is satisfied; it's a
   main-push so their `if` is true). They start **in parallel**.
6. **Runner B** for **`docker`**: checkout → Buildx → login to Docker Hub → build the
   multi-stage image → **push** `irvinuyi/vuna-calc:latest` and `:89e729b`. ✅ (~30s)
7. **Runner C** for **`deploy`**: checkout → `npm ci` → `npm run build` (makes `dist/`) →
   FTP `dist/` into `public_html`. ✅ (~15s)
8. **cPanel** now serves the new `index.html`; a browser hitting `http://irvin.vudse26.cloud`
   gets the updated calculator. **Total: well under a minute, fully automatic.**

Every hop is logged and visible in the **Actions** tab; the commit SHA ties the running image
and the deployed site back to the exact source.

---

<a name="15"></a>
## 15. Failure modes (what blocks what)

| If this fails… | …then | Live site / image |
|----------------|-------|-------------------|
| Lint error | `ci` fails | `docker`+`deploy` **skipped** — nothing changes |
| A unit test fails | `ci` fails | skipped — old version stays live |
| Coverage below threshold | `ci` fails | skipped |
| Docker Hub login (bad token) | `docker` fails | image not pushed; **deploy still runs** (independent of docker) |
| FTP auth (`530`) | `deploy` fails | site unchanged; image may still have pushed |
| Push to a non-`main` branch | only `ci` runs | no deploy/image by design |

Key property: **the test gate protects production.** Broken code cannot deploy because `deploy`
depends on `ci`. (`docker` and `deploy` are independent of each other — one can fail without
stopping the other, since both only `need: ci`.)

---

<a name="16"></a>
## 16. Glossary

- **CI / CD** — Continuous Integration / Continuous Deployment.
- **Pipeline** — the ordered automated stages triggered by an event.
- **Workflow** — the YAML file defining the pipeline.
- **Job / Step / Action** — group of steps on one runner / a single command or action / a
  reusable packaged step.
- **Runner** — the (ephemeral) machine that executes a job.
- **Trigger / Event** — what starts a run (`push`, `pull_request`).
- **`needs`** — a job dependency (run after another succeeds).
- **`if`** — a condition controlling whether a job/step runs.
- **Secret** — an encrypted, masked credential injected at runtime.
- **Artifact** — a file saved from a run (our coverage report).
- **`npm ci`** — clean, lockfile-exact dependency install.
- **Lint / ESLint** — static code-quality analysis.
- **Jest / coverage / threshold** — test runner / % code tested / minimum that must be met.
- **Docker image / container / registry / tag / layer / Dockerfile** — see §9.
- **Multi-stage build** — build in one image, ship only the result in a smaller one.
- **Buildx / BuildKit** — Docker's modern caching builder.
- **FTP** — file transfer protocol used to upload the built site.
- **`dist/`** — the built, deployable output folder.
- **`public_html`** — the web root cPanel serves to the internet.
- **SHA / commit hash** — the unique id of a commit; also used as an image tag.
- **Least privilege** — granting only the minimum permissions needed.

---

<a name="17"></a>
## 17. Likely exam questions → where to look

| Question | Section |
|----------|---------|
| "What is CI/CD and why use it?" | §1 |
| "Walk me through what happens when you push." | §14 (trace), §4–§10 |
| "What triggers the pipeline?" | §6 (`on:`), §13 |
| "How do tests stop a bad deploy?" | §8, §13, §15 |
| "Explain your Dockerfile / why multi-stage." | §9 |
| "Why Docker if it doesn't run on the server?" | §2, §9 (note) |
| "Why FTP and not SSH?" | §10 |
| "Where are the credentials? Are they safe?" | §12 |
| "What's a runner? Why fresh each time?" | §7 |
| "What does `needs` / `if` do?" | §13 |
| "What is `npm ci` vs `npm install`?" | §8 |
| "What is linting / coverage threshold?" | §8 |
| "How does the change actually reach the browser?" | §10–§11 |

---

*Study tip:* be able to **draw §2**, **narrate §14 from memory**, and define every term in §16
in one sentence. If you can do those three, you can defend the pipeline.
