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
- **lint-and-test:** `npm ci` then `npm run lint` then `npm test` (Jest with coverage thresholds: branches 70, functions/lines/statements 80). Coverage uploaded as an artifact.
- **docker-build:** builds the multi-stage `Dockerfile` (node build then nginx) with GitHub Actions layer cache. Validation only; nothing is pushed to a registry.

## One-time setup

### 1. Push to GitHub
```bash
git remote add origin git@github.com:USERNAME/vuna-calc-482.git
git push -u origin main
```

### 2. Branch protection (Settings then Branches then Add rule for `main`)
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
| Multi-stage Dockerfile, non-root | node build then nginx serve |
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
