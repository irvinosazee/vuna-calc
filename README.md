# VUNA Calculator

A browser calculator (HTML + Bootstrap + vanilla JS) with a gated CI/CD pipeline.

![CI](https://github.com/USERNAME/vuna-calc-482/actions/workflows/ci.yml/badge.svg)

**Live:** https://REPLACE-WITH-VERCEL-URL.vercel.app

## Features
- Arithmetic with correct precedence, parentheses, `**`, unary minus
- On-screen scientific keypad: degree-based trig (`sin`, `cos`, `tan`, ...), `sqrt`, `ln`, `log`, `pi`, `e`, `ans`
- Standard percent (`100 + 10% = 110`)
- Full keyboard input — digits, operators, `^` for power, and typed function names (`sin(30)`, `sqrt(9)`, `pi`); `Enter` to evaluate, `Backspace`, `Esc` to clear
- Neumorphic soft-UI design with light/dark theme
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
| Docker Build | Docker (nginx) | every PR + push to main |
| Deploy (preview) | Vercel | every branch/PR |
| Deploy (production) | Vercel | merge to `main` (gated by CI) |

See `docs/PIPELINE.md` for the full guide.
