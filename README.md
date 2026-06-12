# Veritas Journey + VUNA Calculator (SEN 482)

A 3D, scroll-driven "academic tree" of every course in my Software Engineering
degree at Veritas University (100–400 level), built with Vite + TypeScript +
Three.js. The original VUNA calculator lives on at `/calculator/`. Both deploy
through the same GitHub Actions → cPanel CI/CD pipeline.

## Commands

| Command | What it does |
|---|---|
| `npm run dev` | Dev server (journey at `/`, calculator at `/calculator/`) |
| `npm run build` | Static production build into `dist/` |
| `npm test` | Jest — calculator tests with coverage |
| `npm run test:unit` | Vitest — journey data/layout/fallback tests |
| `npm run typecheck` | TypeScript type checking |
| `npm run lint` | ESLint |

Course content, intro story text, and theme colors are all edited in one
file: `src/data/journey.ts`.

![CI/CD](https://github.com/irvinosazee/vuna-calc/actions/workflows/ci-cd.yml/badge.svg)

**Live:** http://irvin.vudse26.cloud

## Pipeline at a glance
| Stage | Tool | When |
|-------|------|------|
| Lint & Test | ESLint + Jest (coverage) + tsc + Vitest | every PR + push to main |
| Docker Build & Push | Docker → Docker Hub (`irvinuyi/vuna-calc`) | push to `main` |
| Deploy | FTP → cPanel `public_html` (`http://irvin.vudse26.cloud`) | push to `main` |

> Hosting note: the server is **CyberPanel** with SSH locked down, so deploy uses **FTP**;
> Docker can't *run* on the shared host, so CI **builds + pushes** the image instead.

### Docs
- **`docs/CICD_DEEP_DIVE.md`** — full pipeline explanation, commit → live server (study for the defense).
- **`docs/DEFENSE.md`** — defense crib sheet (demo script + Q&A).
- **`docs/OPERATING.md`** — how to run, update, watch, and roll back the pipeline.
- **`docs/COURSEMATE_WALKTHROUGH.md`** — generic step-by-step guide to build this from scratch.
