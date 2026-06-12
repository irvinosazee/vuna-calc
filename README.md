# VUNA Calculator

A browser calculator (HTML + Bootstrap + vanilla JS) for the SEN 482 DevOps CA, with a
CI/CD pipeline that auto-deploys to cPanel.

![CI/CD](https://github.com/irvinosazee/vuna-calc/actions/workflows/ci-cd.yml/badge.svg)

**Live:** http://irvin.vudse26.cloud

## Features
- Digits `0–9`, decimal point, operators `+ − × ÷`, and `=`
- `AC` (all clear) and `CE` (clear current entry)
- **Combination & permutation** — `nCr` / `nPr` (e.g. `5 nCr 2 = 10`, `5 nPr 2 = 20`)
- Keyboard input (digits, operators, Enter, Backspace, Esc = AC, Delete = CE)
- Neumorphic soft-UI with light/dark theme
- No `eval()` — a safe expression evaluator (tokenizer → shunting-yard → RPN)
- Containerised — published as `irvinuyi/vuna-calc` on Docker Hub by CI

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
| Docker Build & Push | Docker → Docker Hub (`irvinuyi/vuna-calc`) | push to `main` |
| Deploy | FTP → cPanel `public_html` (`http://irvin.vudse26.cloud`) | push to `main` |

> Hosting note: the server is **CyberPanel** with SSH locked down, so deploy uses **FTP**;
> Docker can't *run* on the shared host, so CI **builds + pushes** the image instead.

### Docs
- **`docs/CICD_DEEP_DIVE.md`** — full pipeline explanation, commit → live server (study for the defense).
- **`docs/DEFENSE.md`** — defense crib sheet (demo script + Q&A).
- **`docs/OPERATING.md`** — how to run, update, watch, and roll back the pipeline.
- **`docs/COURSEMATE_WALKTHROUGH.md`** — generic step-by-step guide to build this from scratch.
