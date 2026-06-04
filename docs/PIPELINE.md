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
