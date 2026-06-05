# Operating the Pipeline — Day-to-Day Guide

How to run, update, watch, and troubleshoot your VUNA Calculator CI/CD pipeline.

**The one rule:** you never upload files by hand. You **edit → commit → push**, and the
pipeline does the rest. Pushing to `main` is the deploy button.

---

## The mental model

```
edit code  →  git commit  →  git push   (to main)
                                  │
                                  ▼
                       GitHub Actions runs automatically
                       ├─ ci      : lint + tests   (must pass)
                       ├─ docker  : build image → push to Docker Hub
                       └─ deploy  : build dist/ → FTP into public_html
                                          │
                                          ▼
                              http://irvin.vudse26.cloud  (updated live)
```

- **Push to `main`** → all three jobs run → site goes live.
- **Open a Pull Request** → only `ci` runs (lint+test). Nothing deploys until you merge.
- If `ci` fails, `docker` and `deploy` are skipped — broken code can't go live.

---

## Make a change and deploy it

```bash
cd "path/to/vuna-calc-482"

# 1. edit files (e.g. change a colour in assets/css/neumorphic.css)

# 2. check it locally before pushing
npm run lint
npm test
npm run build          # builds dist/
python3 -m http.server 8000   # open http://localhost:8000 to eyeball it (Ctrl+C to stop)

# 3. commit and push — THIS deploys
git add -A
git commit -m "describe your change"
git push
```

Within ~30–60 seconds the change is live. That's the whole loop.

---

## Watch a run

**In the browser:** open https://github.com/irvinosazee/vuna-calc/actions — click the latest
run to see `ci`, `docker`, `deploy` and their logs live.

**From the terminal (GitHub CLI):**
```bash
gh run list --limit 5          # recent runs and their status
gh run watch                   # live-follow the most recent run until it finishes
gh run view --log              # full logs of the latest run
gh run view --job=<id> --log   # logs for one job
gh run rerun --failed          # re-run only the failed jobs
```

**Confirm the live site actually updated:**
```bash
curl -s -o /dev/null -w "%{http_code}\n" http://irvin.vudse26.cloud/   # expect 200
curl -s http://irvin.vudse26.cloud/ | grep "VUNA CALCULATOR"           # your content
```

---

## The Docker image

Every push to `main` builds and pushes an image to Docker Hub:
`docker.io/irvinuyi/vuna-calc:latest` (plus a tag with the commit SHA).

Run the containerised calculator anywhere Docker is installed:
```bash
docker run -d -p 8080:80 irvinuyi/vuna-calc:latest
# open http://localhost:8080
```
(Great for the defense — proves the app is containerised, not just static files.)

---

## Roll back a bad deploy

The site mirrors whatever is on `main`. To undo the last change:
```bash
git revert HEAD       # makes a new commit that undoes the previous one
git push              # pipeline redeploys the previous good version
```
Or redeploy a specific older commit by reverting to it and pushing. (There's no "delete on
server" step — the next deploy simply overwrites `public_html` with the new build.)

---

## Secrets (where the credentials live)

Stored encrypted in **GitHub → repo → Settings → Secrets and variables → Actions**. Never in
the code.

| Secret | Used by | Value |
|--------|---------|-------|
| `FTP_SERVER` | deploy | `159.198.47.177` |
| `FTP_USERNAME` | deploy | `irvin_deploy` |
| `FTP_PASSWORD` | deploy | (the FTP account password) |
| `DOCKERHUB_USERNAME` | docker | `irvinuyi` |
| `DOCKERHUB_TOKEN` | docker | Docker Hub access token |

**To rotate any of them:** change it at the source (CyberPanel FTP account / Docker Hub
token page), then update the matching secret:
```bash
gh secret set FTP_PASSWORD            # prompts/pipe the new value
# or in the GitHub UI: Settings → Secrets → click the secret → update
```
The next push picks up the new value automatically.

---

## Troubleshooting

| Symptom | Fix |
|--------|-----|
| `deploy` fails `530 Login authentication failed` | FTP password/username wrong — reset the FTP account password in CyberPanel and update `FTP_PASSWORD`. |
| `deploy` succeeds but site unchanged | Hard-refresh the browser (cache), or you pushed to a non-`main` branch (deploy only runs on `main`). |
| `docker` fails on login | Docker Hub token expired/revoked — generate a new token and update `DOCKERHUB_TOKEN`. |
| `ci` fails on tests/coverage | A test failed or coverage dropped — run `npm test` locally and fix. |
| Whole run didn't start | You're on a branch, or the push didn't reach `main`. Check `git status` / `git push`. |
| "Node.js 20 deprecated" warning | Harmless future-dated notice; not a failure. |

---

## Quick reference

```bash
npm test          # run unit tests + coverage
npm run lint      # check code style
npm run build     # produce dist/ (what gets deployed)
git push          # deploy to main → live
gh run watch      # follow the deploy
docker run -p 8080:80 irvinuyi/vuna-calc:latest   # run the image
```

Live site: **http://irvin.vudse26.cloud** · Repo: **github.com/irvinosazee/vuna-calc** ·
Image: **irvinuyi/vuna-calc**
