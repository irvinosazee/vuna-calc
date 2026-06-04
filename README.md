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
| Deploy | rsync over SSH → cPanel `public_html` | push to `main` |

See `docs/PIPELINE.md` for the full guide and one-time server setup.
