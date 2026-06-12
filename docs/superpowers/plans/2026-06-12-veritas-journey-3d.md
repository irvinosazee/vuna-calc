# Veritas Journey 3D Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the root page with "Veritas Journey" — a scroll-driven 3D low-poly tree of all 79 Veritas University courses (100–400 level) — while preserving the calculator untouched at `/calculator/` and keeping the GitHub Actions → cPanel pipeline working.

**Architecture:** One Three.js scene built procedurally from a single editable `src/data/journey.ts`. Camera "rigs" (ScrollRig / OrbitRig / WalkRig-stub) swap without reload. The calculator is served as verbatim static files from `public/calculator/`, with `src/calculator.js` synced in by a prebuild script so Jest tests stay untouched.

**Tech Stack:** Vite, TypeScript, Three.js, Vitest (new TS tests), Jest (existing calculator tests), ESLint 9.

**Spec:** `docs/superpowers/specs/2026-06-12-veritas-journey-3d-design.md`

---

## File map

| Path | Action | Responsibility |
|---|---|---|
| `index.html` | Replace | Journey entry page (Vite entry) |
| `public/calculator/index.html` | Move from root `index.html` | Calculator page, verbatim + back-link |
| `public/calculator/assets/` | Move from root `assets/` | Calculator CSS/JS, verbatim |
| `public/calculator/src/calculator.js` | Generated (gitignored) | Synced copy for the page |
| `scripts/sync-calculator.mjs` | Create | Copies `src/calculator.js` into public/calculator |
| `scripts/build.mjs` | Delete | Replaced by `vite build` |
| `vite.config.ts`, `tsconfig.json` | Create | Toolchain |
| `src/data/journey.ts` | Create | ALL content: student, intro beats, theme, 79 courses |
| `src/journey/layout.ts` | Create | Pure layout math (positions, camera path) — unit tested |
| `src/scene/tree.ts` | Create | Procedural tree meshes + growth reveal |
| `src/scene/environment.ts` | Create | Ground, lights, fireflies, shrubs |
| `src/rigs/types.ts`, `ScrollRig.ts`, `OrbitRig.ts`, `WalkRig.ts` | Create | Camera modes |
| `src/ui/overlay.ts`, `journey.css`, `fallback.ts`, `webgl.ts` | Create | DOM overlay, styles, no-WebGL fallback |
| `src/main.ts` | Create | Bootstrap, render loop, mode manager, picking |
| `tests/journey/data.test.ts`, `layout.test.ts`, `fallback.test.ts` | Create | Vitest suites |
| `.github/workflows/ci-cd.yml`, `Dockerfile`, `eslint.config.js`, `package.json`, `.gitignore`, `README.md` | Modify | Pipeline + config |

Existing untouched: `src/calculator.js`, `tests/calculator.test.js`.

---

### Task 1: Toolchain scaffold (Vite + TypeScript + Vitest)

**Files:**
- Modify: `package.json`
- Create: `tsconfig.json`
- Create: `vite.config.ts`

- [ ] **Step 1: Install dependencies**

```bash
npm install three
npm install -D vite typescript vitest @types/three
```

Expected: `package.json` gains `three` under `dependencies` and the rest under `devDependencies`.

- [ ] **Step 2: Update package.json scripts and Jest scope**

Edit `package.json` — replace the `scripts` block and add `testMatch` to the `jest` block (so Jest never picks up the new `.test.ts` files):

```json
  "scripts": {
    "dev": "node scripts/sync-calculator.mjs && vite",
    "prebuild": "node scripts/sync-calculator.mjs",
    "build": "vite build",
    "preview": "vite preview",
    "test": "jest --coverage",
    "test:unit": "vitest run",
    "typecheck": "tsc --noEmit",
    "lint": "eslint ."
  },
```

```json
  "jest": {
    "testEnvironment": "node",
    "testMatch": ["**/tests/**/*.test.js"],
    "collectCoverageFrom": ["src/**/*.js"],
    "coverageThreshold": {
      "global": { "branches": 70, "functions": 80, "lines": 80, "statements": 80 }
    }
  }
```

- [ ] **Step 3: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "types": ["vite/client"],
    "strict": true,
    "noEmit": true,
    "skipLibCheck": true,
    "isolatedModules": true
  },
  "include": ["src/**/*.ts", "tests/**/*.ts", "vite.config.ts"]
}
```

- [ ] **Step 4: Create vite.config.ts**

```ts
/// <reference types="vitest/config" />
import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  build: { outDir: 'dist' },
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
    passWithNoTests: true,
  },
});
```

- [ ] **Step 5: Verify the existing suites still pass and the new tools run**

```bash
npm test
npm run typecheck
npm run test:unit
```

Expected: Jest passes with coverage as before. `typecheck` exits 0 (only vite.config.ts is checked so far). `test:unit` exits 0 with "no test files found" thanks to `passWithNoTests` (real tests arrive in Task 3).

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json tsconfig.json vite.config.ts
git commit -m "build: add Vite + TypeScript + Vitest toolchain"
```

---

### Task 2: Relocate calculator to /calculator/ and stub the journey entry

**Files:**
- Move: `index.html` → `public/calculator/index.html` (one line added)
- Move: `assets/` → `public/calculator/assets/`
- Create: `scripts/sync-calculator.mjs`
- Delete: `scripts/build.mjs`
- Create: `index.html` (new journey entry)
- Create: `src/main.ts` (stub)
- Create: `src/ui/journey.css` (base styles)
- Modify: `eslint.config.js`, `.gitignore`

- [ ] **Step 1: Move the calculator files with git mv**

```bash
mkdir -p public/calculator
git mv index.html public/calculator/index.html
git mv assets public/calculator/assets
git rm scripts/build.mjs
```

The calculator page's relative refs (`assets/css/...`, `src/calculator.js`, `assets/js/script.js`) now resolve under `/calculator/` — no path edits needed.

- [ ] **Step 2: Add a back-to-journey link to the calculator page**

In `public/calculator/index.html`, directly after the theme-toggle `<button>...</button>` element, insert:

```html
  <a href="../" class="btn btn-outline-secondary" title="Back to the 3D journey"
    style="position: fixed; top: 1rem; left: 1rem; z-index: 10">🌳 Journey</a>
```

- [ ] **Step 3: Create scripts/sync-calculator.mjs**

```js
import { mkdirSync, cpSync } from 'node:fs';

mkdirSync('public/calculator/src', { recursive: true });
cpSync('src/calculator.js', 'public/calculator/src/calculator.js');
console.log('Synced src/calculator.js -> public/calculator/src/calculator.js');
```

- [ ] **Step 4: Ignore the generated copy**

Append to `.gitignore`:

```
public/calculator/src/
```

- [ ] **Step 5: Update eslint.config.js ignores for the moved paths**

Replace the ignores line:

```js
  { ignores: ['dist/', 'coverage/', 'node_modules/', 'public/calculator/assets/js/bootstrap.min.js', 'public/calculator/assets/css/', 'public/calculator/src/'] },
```

- [ ] **Step 6: Create the new root index.html**

```html
<!DOCTYPE html>
<html lang="en">

<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Veritas Journey — Irvin's Academic Tree</title>
  <meta name="description"
    content="A 3D journey through Irvin Osazee's Software Engineering degree at Veritas University, Abuja — 100 to 400 level, one growing tree." />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link
    href="https://fonts.googleapis.com/css2?family=Sora:wght@400;600;800&family=JetBrains+Mono:wght@500&display=swap"
    rel="stylesheet" />
</head>

<body>
  <div id="app"></div>
  <div id="spacer" aria-hidden="true"></div>
  <div id="overlay"></div>
  <script type="module" src="/src/main.ts"></script>
</body>

</html>
```

- [ ] **Step 7: Create stub src/main.ts and base src/ui/journey.css**

`src/main.ts`:

```ts
import './ui/journey.css';

console.log('Veritas Journey — scene arrives in later tasks');
```

`src/ui/journey.css`:

```css
* {
  margin: 0;
  box-sizing: border-box;
}

html {
  scroll-behavior: smooth;
}

body {
  font-family: 'Sora', system-ui, sans-serif;
  color: #d8ffe9;
  background: linear-gradient(to top, #061f13 0%, #0a2e1d 40%, #16573a 78%, #2c8a5b 100%);
  background-attachment: fixed;
}

#spacer {
  height: 760vh;
}

canvas.webgl {
  position: fixed;
  inset: 0;
  display: block;
}

body.mode-explore {
  overflow: hidden;
}
```

- [ ] **Step 8: Verify dev pipeline end-to-end**

```bash
npm run build
ls dist/index.html dist/calculator/index.html dist/calculator/src/calculator.js dist/calculator/assets/js/script.js
npm run lint
npm test
```

Expected: build succeeds (prebuild sync runs first), all four `ls` paths exist, lint and Jest pass.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat: move calculator to /calculator/, stub Veritas Journey entry"
```

---

### Task 3: Journey data file (TDD)

**Files:**
- Test: `tests/journey/data.test.ts`
- Create: `src/data/journey.ts`

- [ ] **Step 1: Write the failing test**

`tests/journey/data.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { levels, allCourses, totalUnits, courseFamily, theme } from '../../src/data/journey';

describe('journey data integrity', () => {
  it('has 4 levels, each with 2 semesters', () => {
    expect(levels.map((l) => l.level)).toEqual([100, 200, 300, 400]);
    for (const level of levels) expect(level.semesters).toHaveLength(2);
  });

  it('matches courses.txt course counts per semester', () => {
    const counts = levels.flatMap((l) => l.semesters.map((s) => s.courses.length));
    expect(counts).toEqual([12, 13, 10, 10, 8, 10, 9, 7]);
  });

  it('matches courses.txt credit-unit totals per semester', () => {
    const totals = levels.flatMap((l) =>
      l.semesters.map((s) => s.courses.reduce((sum, c) => sum + c.units, 0)),
    );
    expect(totals).toEqual([24, 24, 21, 20, 20, 21, 17, 18]);
  });

  it('has 79 unique courses totalling 165 units', () => {
    expect(allCourses).toHaveLength(79);
    expect(new Set(allCourses.map((c) => c.code)).size).toBe(79);
    expect(totalUnits).toBe(165);
  });

  it('assigns every course a themed family color', () => {
    for (const course of allCourses) {
      expect(theme.families[courseFamily(course.code)]).toMatch(/^#/);
    }
  });

  it('classifies labs, SIWES and practicum as LAB', () => {
    expect(courseFamily('SEN181')).toBe('LAB');
    expect(courseFamily('SEN482')).toBe('LAB');
    expect(courseFamily('SEN290')).toBe('LAB');
    expect(courseFamily('SEN190')).toBe('LAB');
    expect(courseFamily('SEN490')).toBe('SEN');
    expect(courseFamily('GST111')).toBe('GST');
    expect(courseFamily('PHY101')).toBe('SCI');
    expect(courseFamily('STA343')).toBe('SCI');
    expect(courseFamily('MTH101')).toBe('MTH');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:unit`
Expected: FAIL — cannot resolve `../../src/data/journey`.

- [ ] **Step 3: Create src/data/journey.ts**

This is THE editable content file. All 79 courses below are transcribed from `courses.txt` (listed ascending by code for display).

```ts
// ─────────────────────────────────────────────────────────────────────
// Veritas Journey — single source of truth for ALL site content.
// Edit this file to update courses, story beats, or theme colors.
// ─────────────────────────────────────────────────────────────────────

export interface Course {
  code: string;
  title: string;
  units: number;
}

export interface Semester {
  name: 'First Semester' | 'Second Semester';
  session: string;
  courses: Course[];
}

export interface Level {
  level: 100 | 200 | 300 | 400;
  semesters: [Semester, Semester];
}

export interface IntroBeat {
  title: string;
  text: string;
}

export const student = {
  name: 'Irvin Ogbemudia Uyi Osazee',
  matric: 'VUG/SEN/22/8386',
  programme: 'Software Engineering',
  university: 'Veritas University, Abuja',
};

export const introBeats: IntroBeat[] = [
  { title: '2022', text: 'A seed lands in Abuja…' },
  { title: student.name, text: `${student.matric} · ${student.programme} · ${student.university}` },
  { title: 'It takes root', text: 'Scroll to grow the tree — four levels, eight semesters, 79 courses.' },
];

export const theme = {
  background: '#0a2e1d',
  trunk: '#3a6b3f',
  fog: { color: '#0a2e1d', density: 0.026 },
  particles: { desktop: 240, mobile: 80 },
  families: {
    SEN: '#34d399', // software engineering — bright emerald
    GST: '#a3e635', // general studies — lime
    MTH: '#2dd4bf', // mathematics — teal
    SCI: '#5eead4', // physics & statistics — light teal
    LAB: '#f0e68c', // labs, SIWES, practicum — gold-green
  },
} as const;

export type Family = keyof typeof theme.families;

export function courseFamily(code: string): Family {
  if (/^SEN[1-4]8[12]$/.test(code) || /^SEN[123]90$/.test(code)) return 'LAB';
  if (code.startsWith('SEN')) return 'SEN';
  if (code.startsWith('GST')) return 'GST';
  if (code.startsWith('MTH')) return 'MTH';
  return 'SCI';
}

export const levels: Level[] = [
  {
    level: 100,
    semesters: [
      {
        name: 'First Semester',
        session: '2022/2023',
        courses: [
          { code: 'GST111', title: 'Communication in English I', units: 2 },
          { code: 'GST113', title: 'Nigerian People and Culture', units: 2 },
          { code: 'GST115', title: 'History and Philosophy Of Science', units: 2 },
          { code: 'GST121', title: 'Use of Library, Study Skills and ICT', units: 2 },
          { code: 'GST171', title: 'Ethics', units: 0 },
          { code: 'MTH101', title: 'Elementary Mathematics I', units: 2 },
          { code: 'PHY101', title: 'General Physics I', units: 2 },
          { code: 'PHY107', title: 'General Practical Physics I', units: 1 },
          { code: 'SEN101', title: 'Introduction to Computing and Applications', units: 3 },
          { code: 'SEN103', title: 'Interaction Design and Usability Engineering', units: 3 },
          { code: 'SEN105', title: 'Introduction to Software Engineering', units: 3 },
          { code: 'SEN181', title: 'Software Engineering Lab I', units: 2 },
        ],
      },
      {
        name: 'Second Semester',
        session: '2022/2023',
        courses: [
          { code: 'GST112', title: 'Communication in English II', units: 2 },
          { code: 'GST122', title: 'Logic, Philosophy, and Human Existence', units: 2 },
          { code: 'GST124', title: 'Communication in French', units: 2 },
          { code: 'GST142', title: 'Community Service', units: 1 },
          { code: 'MTH102', title: 'General Mathematics II', units: 3 },
          { code: 'PHY102', title: 'General Physics II', units: 2 },
          { code: 'PHY108', title: 'General Practical Physics II', units: 1 },
          { code: 'SEN102', title: 'Principles of Programming I', units: 2 },
          { code: 'SEN104', title: 'Introduction to Web Technologies', units: 2 },
          { code: 'SEN106', title: 'User Experience Design and Evaluation', units: 2 },
          { code: 'SEN108', title: 'Logic and its Application in Computer Science', units: 2 },
          { code: 'SEN182', title: 'Software Engineering Lab II', units: 2 },
          { code: 'SEN190', title: 'Practicum', units: 1 },
        ],
      },
    ],
  },
  {
    level: 200,
    semesters: [
      {
        name: 'First Semester',
        session: '2023/2024',
        courses: [
          { code: 'GST211', title: 'Basic Spiritual Theology', units: 0 },
          { code: 'GST221', title: 'Peace Studies and Conflict Resolution', units: 2 },
          { code: 'GST223', title: 'Introduction to Entrepreneurship', units: 2 },
          { code: 'MTH203', title: 'Linear Algebra I', units: 2 },
          { code: 'SEN201', title: 'Discrete Structures', units: 3 },
          { code: 'SEN203', title: 'Software Requirements and Design', units: 2 },
          { code: 'SEN205', title: 'Computer Architecture Organisation', units: 3 },
          { code: 'SEN207', title: 'Data Structures and Algorithms', units: 3 },
          { code: 'SEN209', title: 'Information Architecture', units: 2 },
          { code: 'SEN281', title: 'Software Engineering Lab III', units: 2 },
        ],
      },
      {
        name: 'Second Semester',
        session: '2023/2024',
        courses: [
          { code: 'GST272', title: 'Social Teachings of the Church', units: 0 },
          { code: 'SEN202', title: 'Principles of programming II', units: 3 },
          { code: 'SEN204', title: 'Software Construction', units: 2 },
          { code: 'SEN206', title: 'Design and Analysis of Computer Algorithms', units: 2 },
          { code: 'SEN208', title: 'Principles of Operating Systems', units: 2 },
          { code: 'SEN210', title: 'Software Engineering Process', units: 2 },
          { code: 'SEN212', title: 'Information Visualization', units: 2 },
          { code: 'SEN214', title: 'Microcontroller Programming', units: 2 },
          { code: 'SEN282', title: 'Software Engineering Lab IV', units: 2 },
          { code: 'SEN290', title: 'SIWES I', units: 3 },
        ],
      },
    ],
  },
  {
    level: 300,
    semesters: [
      {
        name: 'First Semester',
        session: '2024/2025',
        courses: [
          { code: 'GST311', title: 'Introduction to Entrepreneurship Studies', units: 2 },
          { code: 'SEN301', title: 'Object-Oriented Analysis and Design', units: 3 },
          { code: 'SEN303', title: 'Programmable Logic Controller Programming', units: 2 },
          { code: 'SEN305', title: 'Web Application Development', units: 3 },
          { code: 'SEN307', title: 'Database Systems', units: 3 },
          { code: 'SEN309', title: 'Concept of Programming Language', units: 2 },
          { code: 'SEN381', title: 'Software Engineering Lab V', units: 2 },
          { code: 'STA343', title: 'Operation Research I', units: 3 },
        ],
      },
      {
        name: 'Second Semester',
        session: '2024/2025',
        courses: [
          { code: 'SEN302', title: 'Software Configuration Management & Maintenance', units: 2 },
          { code: 'SEN304', title: 'Software Engineering Project Management', units: 2 },
          { code: 'SEN306', title: 'Research Methodology', units: 1 },
          { code: 'SEN308', title: 'Software Engineering Professional Practice', units: 2 },
          { code: 'SEN310', title: 'Software Engineering Security', units: 2 },
          { code: 'SEN312', title: 'Artificial Intelligence & Expert System', units: 3 },
          { code: 'SEN314', title: 'Engineering Mobile Applications', units: 2 },
          { code: 'SEN316', title: 'Software Testing & Quality Assurance', units: 2 },
          { code: 'SEN382', title: 'Software Engineering Lab VI', units: 2 },
          { code: 'SEN390', title: 'SIWES II', units: 3 },
        ],
      },
    ],
  },
  {
    level: 400,
    semesters: [
      {
        name: 'First Semester',
        session: '2025/2026',
        courses: [
          { code: 'SEN401', title: 'Software Engineering Economics', units: 2 },
          { code: 'SEN403', title: 'Human-computer Interaction', units: 2 },
          { code: 'SEN405', title: 'Open-Source Software Development and Applications', units: 2 },
          { code: 'SEN407', title: 'Distributed, Parallel, and Cloud Computing', units: 2 },
          { code: 'SEN409', title: 'Software Architecture and Design', units: 2 },
          { code: 'SEN411', title: 'Special Topics in Software Engineering', units: 2 },
          { code: 'SEN413', title: 'Research Seminar', units: 1 },
          { code: 'SEN415', title: 'Visual Design', units: 2 },
          { code: 'SEN481', title: 'Software Engineering Lab VII', units: 2 },
        ],
      },
      {
        name: 'Second Semester',
        session: '2025/2026',
        courses: [
          { code: 'SEN402', title: 'Enterprise Application Development', units: 2 },
          { code: 'SEN404', title: 'Virtual and Augmented Reality', units: 2 },
          { code: 'SEN406', title: 'Fault—Tolerant Computing', units: 2 },
          { code: 'SEN408', title: 'Game Design and Development', units: 2 },
          { code: 'SEN410', title: 'Modelling and Computer simulation', units: 2 },
          { code: 'SEN482', title: 'Software Engineering Lab VIII', units: 2 },
          { code: 'SEN490', title: 'Project', units: 6 },
        ],
      },
    ],
  },
];

export const allCourses: Course[] = levels.flatMap((l) => l.semesters.flatMap((s) => s.courses));
export const totalUnits: number = allCourses.reduce((sum, c) => sum + c.units, 0);
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test:unit`
Expected: PASS — 6 tests in `tests/journey/data.test.ts`.

Run: `npm run typecheck`
Expected: exit 0.

- [ ] **Step 5: Commit**

```bash
git add src/data/journey.ts tests/journey/data.test.ts
git commit -m "feat: add journey data file with all 79 courses and integrity tests"
```

---

### Task 4: Layout math (TDD)

**Files:**
- Test: `tests/journey/layout.test.ts`
- Create: `src/journey/layout.ts`

- [ ] **Step 1: Write the failing test**

`tests/journey/layout.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { buildLayout, pseudoRandom } from '../../src/journey/layout';
import { levels, allCourses } from '../../src/data/journey';

describe('buildLayout', () => {
  const layout = buildLayout(levels);

  it('creates one leaf per course', () => {
    expect(layout.leaves).toHaveLength(allCourses.length);
  });

  it('creates one limb per semester', () => {
    expect(layout.limbs).toHaveLength(8);
  });

  it('stacks level heights ascending, below the trunk top', () => {
    const ys = layout.levelY;
    expect(ys).toHaveLength(4);
    for (let i = 1; i < ys.length; i++) expect(ys[i]).toBeGreaterThan(ys[i - 1]);
    expect(layout.trunkHeight).toBeGreaterThan(ys[ys.length - 1]);
  });

  it('produces finite coordinates everywhere', () => {
    const all = [
      ...layout.leaves.map((l) => l.pos),
      ...layout.cameraPoints,
      ...layout.limbs.flatMap((l) => [l.start, l.end]),
    ];
    for (const p of all) {
      expect(Number.isFinite(p.x) && Number.isFinite(p.y) && Number.isFinite(p.z)).toBe(true);
    }
  });

  it('orders leaves bottom-up so instanced reveal follows the climb', () => {
    const levelIdxs = layout.leaves.map((l) => l.levelIdx);
    expect(levelIdxs).toEqual([...levelIdxs].sort((a, b) => a - b));
  });

  it('camera path climbs from ground to above the canopy', () => {
    const pts = layout.cameraPoints;
    expect(pts[0].y).toBeLessThan(3);
    expect(pts[pts.length - 1].y).toBeGreaterThan(layout.trunkHeight);
  });
});

describe('pseudoRandom', () => {
  it('is deterministic and in [0,1)', () => {
    expect(pseudoRandom(42)).toBe(pseudoRandom(42));
    for (let k = 0; k < 50; k++) {
      const v = pseudoRandom(k);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:unit`
Expected: FAIL — cannot resolve `../../src/journey/layout`.

- [ ] **Step 3: Create src/journey/layout.ts**

```ts
// Pure layout math for the tree — no Three.js imports, fully unit-testable.
import type { Level } from '../data/journey';

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface LimbSpot {
  start: Vec3;
  end: Vec3;
  levelIdx: number;
  semIdx: number;
}

export interface LeafSpot {
  pos: Vec3;
  levelIdx: number;
  semIdx: number;
  courseIdx: number;
}

export interface TreeLayout {
  trunkHeight: number;
  levelY: number[];
  limbs: LimbSpot[];
  leaves: LeafSpot[];
  cameraPoints: Vec3[];
}

const LEVEL_BASE_Y = 6;
const LEVEL_GAP = 7;
const LIMB_LEN = 4.2;
const CAMERA_STEPS = 64;

/** Deterministic stand-in for Math.random — same key, same value. */
export function pseudoRandom(k: number): number {
  const x = Math.sin(k * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

export function buildLayout(levels: Level[]): TreeLayout {
  const levelY = levels.map((_, i) => LEVEL_BASE_Y + i * LEVEL_GAP);
  const trunkHeight = levelY[levelY.length - 1] + 5;
  const limbs: LimbSpot[] = [];
  const leaves: LeafSpot[] = [];

  levels.forEach((level, li) => {
    level.semesters.forEach((sem, si) => {
      const angle = li * 1.1 + si * Math.PI;
      const y = levelY[li] + si * 1.6;
      const start = { x: 0, y, z: 0 };
      const end = {
        x: Math.cos(angle) * LIMB_LEN,
        y: y + 1.2,
        z: Math.sin(angle) * LIMB_LEN,
      };
      limbs.push({ start, end, levelIdx: li, semIdx: si });

      sem.courses.forEach((_, ci) => {
        const k = li * 100 + si * 50 + ci;
        const a = angle + (pseudoRandom(k) - 0.5) * 1.8;
        const r = LIMB_LEN + 0.6 + pseudoRandom(k + 1) * 2.4;
        leaves.push({
          pos: {
            x: Math.cos(a) * r,
            y: end.y + (pseudoRandom(k + 2) - 0.3) * 2.2,
            z: Math.sin(a) * r,
          },
          levelIdx: li,
          semIdx: si,
          courseIdx: ci,
        });
      });
    });
  });

  const cameraPoints: Vec3[] = [];
  for (let i = 0; i < CAMERA_STEPS; i++) {
    const t = i / (CAMERA_STEPS - 1);
    const angle = t * Math.PI * 3;
    const radius = 11 - t * 3.5;
    cameraPoints.push({
      x: Math.cos(angle) * radius,
      y: 1.2 + t * (trunkHeight + 2),
      z: Math.sin(angle) * radius,
    });
  }

  return { trunkHeight, levelY, limbs, leaves, cameraPoints };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test:unit` and `npm run typecheck`
Expected: PASS (data + layout suites), typecheck exit 0.

- [ ] **Step 5: Commit**

```bash
git add src/journey/layout.ts tests/journey/layout.test.ts
git commit -m "feat: add pure tree layout math with unit tests"
```

---

### Task 5: WebGL detection + no-WebGL fallback (TDD)

**Files:**
- Test: `tests/journey/fallback.test.ts`
- Create: `src/ui/fallback.ts`
- Create: `src/ui/webgl.ts`
- Modify: `src/main.ts`

- [ ] **Step 1: Write the failing test**

`tests/journey/fallback.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { buildFallbackHTML } from '../../src/ui/fallback';
import { allCourses, student } from '../../src/data/journey';

describe('buildFallbackHTML', () => {
  const html = buildFallbackHTML();

  it('lists every course exactly once', () => {
    expect(html.match(/class="fb-course"/g)).toHaveLength(allCourses.length);
    expect(html).toContain('SEN101');
    expect(html).toContain('SEN490');
  });

  it('includes the student identity and all four levels', () => {
    expect(html).toContain(student.matric);
    for (const lvl of ['100 Level', '200 Level', '300 Level', '400 Level']) {
      expect(html).toContain(lvl);
    }
  });

  it('links to the calculator', () => {
    expect(html).toContain('href="./calculator/"');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:unit`
Expected: FAIL — cannot resolve `../../src/ui/fallback`.

- [ ] **Step 3: Create src/ui/fallback.ts**

```ts
import { levels, student, totalUnits, allCourses } from '../data/journey';

/** Pure HTML builder so the fallback is unit-testable without a DOM. */
export function buildFallbackHTML(): string {
  const sections = levels
    .map(
      (level) => `
    <section class="fb-level">
      <h2>${level.level} Level</h2>
      ${level.semesters
        .map(
          (sem) => `
      <h3>${sem.name} · ${sem.session}</h3>
      <ul>
        ${sem.courses
          .map(
            (c) =>
              `<li class="fb-course"><code>${c.code}</code> ${c.title} <em>(${c.units} units)</em></li>`,
          )
          .join('\n        ')}
      </ul>`,
        )
        .join('')}
    </section>`,
    )
    .join('');

  return `
  <div class="fallback">
    <h1>Veritas Journey</h1>
    <p>${student.name} · ${student.matric} · ${student.programme}</p>
    <p>Your browser does not support WebGL, so here is the journey as a list —
       ${allCourses.length} courses, ${totalUnits} credit units across 4 levels.</p>
    <p><a href="./calculator/">Open the calculator →</a></p>
    ${sections}
  </div>`;
}

export function renderFallback(root: HTMLElement): void {
  document.body.classList.add('no-webgl');
  root.innerHTML = buildFallbackHTML();
}
```

- [ ] **Step 4: Create src/ui/webgl.ts**

```ts
export function webglAvailable(): boolean {
  try {
    const canvas = document.createElement('canvas');
    return Boolean(canvas.getContext('webgl2') ?? canvas.getContext('webgl'));
  } catch {
    return false;
  }
}
```

- [ ] **Step 5: Wire fallback into src/main.ts (full replacement)**

```ts
import './ui/journey.css';
import { renderFallback } from './ui/fallback';
import { webglAvailable } from './ui/webgl';

const app = document.getElementById('app')!;

if (!webglAvailable()) {
  renderFallback(app);
} else {
  console.log('Veritas Journey — 3D scene arrives in Task 6/7');
}
```

- [ ] **Step 6: Append fallback styles to src/ui/journey.css**

```css
body.no-webgl #spacer {
  display: none;
}

.fallback {
  max-width: 720px;
  margin: 0 auto;
  padding: 3rem 1.5rem;
}

.fallback h1 {
  font-size: 2.2rem;
  margin-bottom: 0.5rem;
}

.fallback h2 {
  margin-top: 2rem;
  color: #a3e635;
}

.fallback h3 {
  margin: 1rem 0 0.4rem;
  font-weight: 600;
}

.fallback ul {
  list-style: none;
  padding: 0;
}

.fallback li {
  padding: 0.3rem 0;
  border-bottom: 1px solid rgba(150, 255, 190, 0.12);
}

.fallback code {
  font-family: 'JetBrains Mono', monospace;
  color: #34d399;
  margin-right: 0.5rem;
}

.fallback a {
  color: #a3e635;
}
```

- [ ] **Step 7: Run tests, typecheck, build**

```bash
npm run test:unit
npm run typecheck
npm run build
```

Expected: all pass.

- [ ] **Step 8: Commit**

```bash
git add src/ui/fallback.ts src/ui/webgl.ts src/main.ts src/ui/journey.css tests/journey/fallback.test.ts
git commit -m "feat: add WebGL detection and tested 2D fallback course list"
```

---

### Task 6: Scene modules — environment and procedural tree

**Files:**
- Create: `src/scene/environment.ts`
- Create: `src/scene/tree.ts`

No unit tests here (Three.js visuals); the gate is `npm run typecheck` + visual verification in Task 7.

- [ ] **Step 1: Create src/scene/environment.ts**

```ts
import * as THREE from 'three';
import { pseudoRandom } from '../journey/layout';

export class Environment {
  readonly group = new THREE.Group();
  private readonly fireflies: THREE.Points;

  constructor(particleCount: number, height: number) {
    const ground = new THREE.Mesh(
      new THREE.CircleGeometry(60, 32),
      new THREE.MeshStandardMaterial({ color: '#0c3622', roughness: 1 }),
    );
    ground.rotation.x = -Math.PI / 2;
    this.group.add(ground);

    this.group.add(new THREE.HemisphereLight('#bdf5d3', '#06281a', 1.1));
    const sun = new THREE.DirectionalLight('#eafff2', 1.4);
    sun.position.set(8, height + 10, 5);
    this.group.add(sun);

    const positions = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i++) {
      const a = pseudoRandom(i) * Math.PI * 2;
      const r = 3 + pseudoRandom(i + 0.1) * 16;
      positions[i * 3] = Math.cos(a) * r;
      positions[i * 3 + 1] = pseudoRandom(i + 0.2) * (height + 6);
      positions[i * 3 + 2] = Math.sin(a) * r;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.fireflies = new THREE.Points(
      geo,
      new THREE.PointsMaterial({
        color: '#c8f96e',
        size: 0.18,
        transparent: true,
        opacity: 0.85,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    );
    this.group.add(this.fireflies);

    const shrubMat = new THREE.MeshStandardMaterial({ color: '#1d5c38', flatShading: true, roughness: 1 });
    for (let i = 0; i < 14; i++) {
      const a = pseudoRandom(i + 50) * Math.PI * 2;
      const r = 5 + pseudoRandom(i + 51) * 20;
      const s = 0.4 + pseudoRandom(i + 52) * 1.4;
      const shrub = new THREE.Mesh(new THREE.IcosahedronGeometry(s, 0), shrubMat);
      shrub.position.set(Math.cos(a) * r, s * 0.45, Math.sin(a) * r);
      this.group.add(shrub);
    }
  }

  update(t: number): void {
    this.fireflies.rotation.y = t * 0.02;
    this.fireflies.position.y = Math.sin(t * 0.6) * 0.4;
  }
}
```

- [ ] **Step 2: Create src/scene/tree.ts**

```ts
import * as THREE from 'three';
import { levels, theme, courseFamily, type Course } from '../data/journey';
import { buildLayout, pseudoRandom, type TreeLayout } from '../journey/layout';

export interface LeafRef {
  course: Course;
  levelIdx: number;
  semIdx: number;
}

const UP = new THREE.Vector3(0, 1, 0);

function makeLabel(text: string): THREE.Sprite {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  ctx.font = 'bold 44px Sora, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#d8ffe9';
  ctx.shadowColor = 'rgba(60, 255, 160, 0.8)';
  ctx.shadowBlur = 16;
  ctx.fillText(text, 128, 64);
  const sprite = new THREE.Sprite(
    new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(canvas), transparent: true, depthWrite: false }),
  );
  sprite.scale.set(3.4, 1.7, 1);
  return sprite;
}

export class JourneyTree {
  readonly group = new THREE.Group();
  readonly layout: TreeLayout;
  readonly leafMesh: THREE.InstancedMesh;
  readonly leafRefs: LeafRef[] = [];
  private readonly trunk: THREE.Mesh;
  private readonly limbs: { mesh: THREE.Mesh; reveal: number }[] = [];

  constructor() {
    this.layout = buildLayout(levels);
    const { trunkHeight, levelY, limbs, leaves } = this.layout;

    const trunkGeo = new THREE.CylinderGeometry(0.5, 1.2, trunkHeight, 9, 6);
    trunkGeo.translate(0, trunkHeight / 2, 0);
    const barkMat = new THREE.MeshStandardMaterial({ color: theme.trunk, flatShading: true, roughness: 0.9 });
    this.trunk = new THREE.Mesh(trunkGeo, barkMat);
    this.group.add(this.trunk);

    for (const limb of limbs) {
      const start = new THREE.Vector3(limb.start.x, limb.start.y, limb.start.z);
      const end = new THREE.Vector3(limb.end.x, limb.end.y, limb.end.z);
      const dir = end.clone().sub(start);
      const len = dir.length();
      const mesh = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.22, len, 6, 1), barkMat);
      mesh.position.copy(start).addScaledVector(dir, 0.5);
      mesh.quaternion.setFromUnitVectors(UP, dir.normalize());
      this.group.add(mesh);
      this.limbs.push({ mesh, reveal: limb.start.y / trunkHeight });
    }

    const leafMat = new THREE.MeshStandardMaterial({ color: '#ffffff', flatShading: true, roughness: 0.55 });
    this.leafMesh = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.42, 0), leafMat, leaves.length);
    const m = new THREE.Matrix4();
    const color = new THREE.Color();
    leaves.forEach((leaf, i) => {
      const s = 0.8 + pseudoRandom(i * 7) * 0.5;
      m.makeScale(s, s, s).setPosition(leaf.pos.x, leaf.pos.y, leaf.pos.z);
      this.leafMesh.setMatrixAt(i, m);
      const course = levels[leaf.levelIdx].semesters[leaf.semIdx].courses[leaf.courseIdx];
      this.leafMesh.setColorAt(i, color.set(theme.families[courseFamily(course.code)]));
      this.leafRefs.push({ course, levelIdx: leaf.levelIdx, semIdx: leaf.semIdx });
    });
    if (this.leafMesh.instanceColor) this.leafMesh.instanceColor.needsUpdate = true;
    this.group.add(this.leafMesh);

    levelY.forEach((y, i) => {
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(1.8, 0.05, 8, 32),
        new THREE.MeshBasicMaterial({ color: theme.families.GST, transparent: true, opacity: 0.5 }),
      );
      ring.rotation.x = Math.PI / 2;
      ring.position.y = y;
      this.group.add(ring);

      const label = makeLabel(`${(i + 1) * 100} LEVEL`);
      label.position.set(3, y + 0.6, 0);
      this.group.add(label);
    });
  }

  /** p in [0,1]: trunk scales up, limbs appear, leaves reveal bottom-up. */
  setGrowth(p: number): void {
    const clamped = Math.min(1, Math.max(0, p));
    this.trunk.scale.y = Math.max(0.02, clamped);
    for (const limb of this.limbs) limb.mesh.visible = clamped >= limb.reveal;
    this.leafMesh.count = Math.round(clamped * this.leafRefs.length);
  }

  update(t: number): void {
    this.group.rotation.z = Math.sin(t * 0.4) * 0.008;
    this.group.rotation.x = Math.cos(t * 0.3) * 0.006;
  }
}
```

- [ ] **Step 3: Typecheck**

Run: `npm run typecheck`
Expected: exit 0.

- [ ] **Step 4: Commit**

```bash
git add src/scene/environment.ts src/scene/tree.ts
git commit -m "feat: add low-poly procedural tree and environment scene modules"
```

---

### Task 7: Camera rigs + main bootstrap (first visible 3D)

**Files:**
- Create: `src/rigs/types.ts`, `src/rigs/ScrollRig.ts`, `src/rigs/OrbitRig.ts`, `src/rigs/WalkRig.ts`
- Modify: `src/main.ts` (full replacement)

- [ ] **Step 1: Create src/rigs/types.ts**

```ts
import type * as THREE from 'three';

export type Mode = 'journey' | 'explore' | 'walk';

export interface CameraRig {
  enter(camera: THREE.PerspectiveCamera): void;
  update(camera: THREE.PerspectiveCamera, dt: number): void;
  dispose(): void;
}
```

- [ ] **Step 2: Create src/rigs/ScrollRig.ts**

```ts
import * as THREE from 'three';
import type { CameraRig } from './types';
import type { Vec3 } from '../journey/layout';

const easeInOut = (x: number): number => x * x * (3 - 2 * x);

export class ScrollRig implements CameraRig {
  progress = 0;
  private readonly curve: THREE.CatmullRomCurve3;

  constructor(cameraPoints: Vec3[]) {
    this.curve = new THREE.CatmullRomCurve3(cameraPoints.map((p) => new THREE.Vector3(p.x, p.y, p.z)));
  }

  enter(): void {}

  update(camera: THREE.PerspectiveCamera, dt: number): void {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    this.progress = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
    const target = this.curve.getPointAt(Math.min(0.999, easeInOut(this.progress)));
    camera.position.lerp(target, 1 - Math.exp(-4 * dt));
    camera.lookAt(0, target.y + 1.0, 0);
  }

  dispose(): void {}
}
```

- [ ] **Step 3: Create src/rigs/OrbitRig.ts**

```ts
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import type { CameraRig } from './types';

export class OrbitRig implements CameraRig {
  private controls?: OrbitControls;

  constructor(
    private readonly dom: HTMLElement,
    private readonly trunkHeight: number,
  ) {}

  enter(camera: THREE.PerspectiveCamera): void {
    this.controls = new OrbitControls(camera, this.dom);
    this.controls.target.set(0, this.trunkHeight * 0.55, 0);
    this.controls.enableDamping = true;
    this.controls.minDistance = 4;
    this.controls.maxDistance = 35;
    this.controls.maxPolarAngle = Math.PI * 0.55;
  }

  update(): void {
    this.controls?.update();
  }

  dispose(): void {
    this.controls?.dispose();
    this.controls = undefined;
  }
}
```

- [ ] **Step 4: Create src/rigs/WalkRig.ts**

```ts
import type { CameraRig } from './types';

/**
 * Phase 2 placeholder: first/third-person walk through forest clearings,
 * one clearing per level. The disabled "Walk" mode button reserves its
 * place in the UI. See the design spec, section "Phase 2".
 */
export class WalkRig implements CameraRig {
  enter(): void {}
  update(): void {}
  dispose(): void {}
}
```

- [ ] **Step 5: Replace src/main.ts (full file)**

```ts
import './ui/journey.css';
import * as THREE from 'three';
import { theme } from './data/journey';
import { JourneyTree } from './scene/tree';
import { Environment } from './scene/environment';
import { ScrollRig } from './rigs/ScrollRig';
import { OrbitRig } from './rigs/OrbitRig';
import type { CameraRig, Mode } from './rigs/types';
import { renderFallback } from './ui/fallback';
import { webglAvailable } from './ui/webgl';

const app = document.getElementById('app')!;

if (!webglAvailable()) {
  renderFallback(app);
} else {
  boot();
}

function boot(): void {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.domElement.classList.add('webgl');
  app.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(theme.fog.color, theme.fog.density);

  const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 200);

  const tree = new JourneyTree();
  scene.add(tree.group);

  const isMobile = window.matchMedia('(pointer: coarse)').matches;
  const env = new Environment(
    isMobile ? theme.particles.mobile : theme.particles.desktop,
    tree.layout.trunkHeight,
  );
  scene.add(env.group);

  const scrollRig = new ScrollRig(tree.layout.cameraPoints);
  const orbitRig = new OrbitRig(renderer.domElement, tree.layout.trunkHeight);
  let mode: Mode = 'journey';
  let rig: CameraRig = scrollRig;
  const p0 = tree.layout.cameraPoints[0];
  camera.position.set(p0.x, p0.y, p0.z);
  rig.enter(camera);

  // Exposed for the overlay (Task 8 wires real buttons to this).
  function setMode(next: Mode): void {
    if (next === mode || next === 'walk') return;
    rig.dispose();
    mode = next;
    rig = next === 'explore' ? orbitRig : scrollRig;
    rig.enter(camera);
    document.body.classList.toggle('mode-explore', next === 'explore');
  }
  void setMode;

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  const clock = new THREE.Clock();
  renderer.setAnimationLoop(() => {
    const dt = Math.min(clock.getDelta(), 0.05);
    const t = clock.elapsedTime;
    rig.update(camera, dt);
    const growth = mode === 'explore' ? 1 : Math.min(1, Math.max(0, (scrollRig.progress - 0.04) / 0.86));
    tree.setGrowth(growth);
    tree.update(t);
    env.update(t);
    renderer.render(scene, camera);
  });
}
```

- [ ] **Step 6: Verify visually with the dev server**

```bash
npm run dev
```

Open http://localhost:5173 — expected: green gradient sky, ground, fireflies; scrolling grows the tree (trunk rises, limbs pop in, colored leaves appear bottom-up) while the camera spirals up. Open http://localhost:5173/calculator/ — calculator works as before. Stop the server.

- [ ] **Step 7: Typecheck, tests, build**

```bash
npm run typecheck && npm run test:unit && npm test && npm run build
```

Expected: all pass.

- [ ] **Step 8: Commit**

```bash
git add src/rigs/ src/main.ts
git commit -m "feat: add camera rigs and 3D bootstrap — scroll-driven tree growth"
```

---

### Task 8: UI overlay — intro beats, HUD, course card, finale, mode switching

**Files:**
- Create: `src/ui/overlay.ts`
- Modify: `src/main.ts` (full replacement)
- Modify: `src/ui/journey.css` (append overlay styles)

- [ ] **Step 1: Create src/ui/overlay.ts**

```ts
import { introBeats, levels, student, totalUnits, allCourses, type Course } from '../data/journey';
import type { Mode } from '../rigs/types';

export interface CourseHit {
  course: Course;
  levelIdx: number;
  semIdx: number;
}

export interface OverlayHandles {
  update(progress: number, mode: Mode): void;
  showCourse(hit: CourseHit): void;
  hideCourse(): void;
}

export function levelLabel(progress: number): string {
  if (progress < 0.06) return 'Prologue';
  if (progress > 0.92) return 'The Canopy';
  const idx = Math.min(3, Math.floor((progress - 0.06) / ((0.92 - 0.06) / 4)));
  return `${(idx + 1) * 100} Level`;
}

export function createOverlay(root: HTMLElement, onMode: (m: Mode) => void): OverlayHandles {
  root.innerHTML = `
    <header class="hud-top">
      <div class="brand">🌳 Veritas Journey</div>
      <nav class="modes">
        <button class="mode-btn active" data-mode="journey">Journey</button>
        <button class="mode-btn" data-mode="explore">Explore</button>
        <button class="mode-btn" data-mode="walk" disabled title="Coming soon">Walk</button>
        <a class="mode-btn calc-link" href="./calculator/">Calculator</a>
      </nav>
    </header>
    <div class="beats">
      ${introBeats
        .map((b, i) => `<section class="beat" data-beat="${i}"><h2>${b.title}</h2><p>${b.text}</p></section>`)
        .join('')}
    </div>
    <div class="hud-bottom">
      <div class="level-label">Prologue</div>
      <div class="progress-track"><div class="progress-fill"></div></div>
      <div class="scroll-hint">Scroll to grow ↓</div>
    </div>
    <aside class="course-card hidden">
      <button class="card-close" aria-label="Close">×</button>
      <div class="card-code"></div>
      <h3 class="card-title"></h3>
      <div class="card-meta"></div>
    </aside>
    <section class="finale hidden">
      <h2>The Canopy</h2>
      <p class="finale-name">${student.name} · ${student.matric}</p>
      <p class="finale-stats">${levels.length} levels · ${levels.length * 2} semesters · ${allCourses.length} courses · ${totalUnits} credit units</p>
      <div class="finale-actions">
        <button class="mode-btn" data-mode="explore">Explore the tree</button>
        <a class="mode-btn calc-link" href="./calculator/">Open the calculator</a>
      </div>
    </section>`;

  const beats = [...root.querySelectorAll<HTMLElement>('.beat')];
  const fill = root.querySelector<HTMLElement>('.progress-fill')!;
  const label = root.querySelector<HTMLElement>('.level-label')!;
  const hint = root.querySelector<HTMLElement>('.scroll-hint')!;
  const finale = root.querySelector<HTMLElement>('.finale')!;
  const card = root.querySelector<HTMLElement>('.course-card')!;
  const modeButtons = [...root.querySelectorAll<HTMLButtonElement>('button.mode-btn[data-mode]')];

  for (const btn of modeButtons) {
    btn.addEventListener('click', () => {
      if (!btn.disabled) onMode(btn.dataset.mode as Mode);
    });
  }
  card.querySelector('.card-close')!.addEventListener('click', () => card.classList.add('hidden'));

  return {
    update(progress: number, mode: Mode): void {
      const exploring = mode === 'explore';
      beats.forEach((el, i) => {
        const start = i * 0.06;
        el.classList.toggle('visible', !exploring && progress >= start && progress < start + 0.06);
      });
      fill.style.transform = `scaleX(${progress})`;
      label.textContent = exploring ? 'Free explore — drag, zoom, click a leaf' : levelLabel(progress);
      hint.classList.toggle('hidden', exploring || progress > 0.03);
      finale.classList.toggle('hidden', exploring || progress < 0.93);
      for (const btn of modeButtons) btn.classList.toggle('active', btn.dataset.mode === mode);
    },
    showCourse({ course, levelIdx, semIdx }: CourseHit): void {
      const sem = levels[levelIdx].semesters[semIdx];
      card.querySelector('.card-code')!.textContent = course.code;
      card.querySelector('.card-title')!.textContent = course.title;
      card.querySelector('.card-meta')!.textContent =
        `${course.units} unit${course.units === 1 ? '' : 's'} · ${(levelIdx + 1) * 100} Level · ${sem.name} · ${sem.session}`;
      card.classList.remove('hidden');
    },
    hideCourse(): void {
      card.classList.add('hidden');
    },
  };
}
```

- [ ] **Step 2: Replace src/main.ts (full file, final version)**

```ts
import './ui/journey.css';
import * as THREE from 'three';
import { theme } from './data/journey';
import { JourneyTree } from './scene/tree';
import { Environment } from './scene/environment';
import { ScrollRig } from './rigs/ScrollRig';
import { OrbitRig } from './rigs/OrbitRig';
import type { CameraRig, Mode } from './rigs/types';
import { createOverlay } from './ui/overlay';
import { renderFallback } from './ui/fallback';
import { webglAvailable } from './ui/webgl';

const app = document.getElementById('app')!;
const overlayRoot = document.getElementById('overlay')!;

if (!webglAvailable()) {
  renderFallback(app);
} else {
  boot();
}

function boot(): void {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.domElement.classList.add('webgl');
  app.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(theme.fog.color, theme.fog.density);

  const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 200);

  const tree = new JourneyTree();
  scene.add(tree.group);

  const isMobile = window.matchMedia('(pointer: coarse)').matches;
  const env = new Environment(
    isMobile ? theme.particles.mobile : theme.particles.desktop,
    tree.layout.trunkHeight,
  );
  scene.add(env.group);

  const scrollRig = new ScrollRig(tree.layout.cameraPoints);
  const orbitRig = new OrbitRig(renderer.domElement, tree.layout.trunkHeight);
  let mode: Mode = 'journey';
  let rig: CameraRig = scrollRig;
  const p0 = tree.layout.cameraPoints[0];
  camera.position.set(p0.x, p0.y, p0.z);
  rig.enter(camera);

  function setMode(next: Mode): void {
    if (next === mode || next === 'walk') return;
    rig.dispose();
    mode = next;
    rig = next === 'explore' ? orbitRig : scrollRig;
    rig.enter(camera);
    document.body.classList.toggle('mode-explore', next === 'explore');
  }

  const ui = createOverlay(overlayRoot, setMode);

  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  let downAt = { x: 0, y: 0 };
  renderer.domElement.addEventListener('pointerdown', (e) => {
    downAt = { x: e.clientX, y: e.clientY };
  });
  renderer.domElement.addEventListener('pointerup', (e) => {
    if (Math.hypot(e.clientX - downAt.x, e.clientY - downAt.y) > 6) return;
    pointer.set((e.clientX / window.innerWidth) * 2 - 1, -(e.clientY / window.innerHeight) * 2 + 1);
    raycaster.setFromCamera(pointer, camera);
    const hit = raycaster.intersectObject(tree.leafMesh)[0];
    if (hit?.instanceId !== undefined) {
      ui.showCourse(tree.leafRefs[hit.instanceId]);
    } else {
      ui.hideCourse();
    }
  });

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  const clock = new THREE.Clock();
  renderer.setAnimationLoop(() => {
    const dt = Math.min(clock.getDelta(), 0.05);
    const t = clock.elapsedTime;
    rig.update(camera, dt);
    const growth = mode === 'explore' ? 1 : Math.min(1, Math.max(0, (scrollRig.progress - 0.04) / 0.86));
    tree.setGrowth(growth);
    tree.update(t);
    env.update(t);
    ui.update(scrollRig.progress, mode);
    renderer.render(scene, camera);
  });
}
```

- [ ] **Step 3: Append overlay styles to src/ui/journey.css**

```css
/* ── Overlay ───────────────────────────────────────────────────── */

/* The overlay never blocks scrolling/dragging on the canvas; individual
   interactive elements re-enable pointer-events below. */
#overlay {
  pointer-events: none;
}

.modes,
.course-card,
.finale-actions {
  pointer-events: auto;
}

.hud-top {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.4rem;
  z-index: 5;
}

.brand {
  font-weight: 800;
  font-size: 1.05rem;
  letter-spacing: 0.02em;
  text-shadow: 0 0 18px rgba(52, 211, 153, 0.6);
}

.modes {
  display: flex;
  gap: 0.5rem;
  pointer-events: auto;
}

.mode-btn {
  font: 600 0.85rem 'Sora', sans-serif;
  color: #d8ffe9;
  background: rgba(6, 40, 24, 0.55);
  border: 1px solid rgba(150, 255, 190, 0.22);
  border-radius: 999px;
  padding: 0.45rem 1rem;
  cursor: pointer;
  backdrop-filter: blur(8px);
  text-decoration: none;
  transition: background 0.2s, border-color 0.2s;
}

.mode-btn:hover:not(:disabled) {
  border-color: rgba(150, 255, 190, 0.6);
}

.mode-btn.active {
  background: rgba(52, 211, 153, 0.25);
  border-color: #34d399;
}

.mode-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.calc-link {
  border-color: rgba(240, 230, 140, 0.4);
}

/* ── Intro beats ───────────────────────────────────────────────── */

.beat {
  position: fixed;
  inset: 0;
  display: grid;
  place-content: center;
  text-align: center;
  opacity: 0;
  transform: translateY(14px);
  transition: opacity 0.6s, transform 0.6s;
  padding: 0 1.5rem;
}

.beat.visible {
  opacity: 1;
  transform: none;
}

.beat h2 {
  font-size: clamp(2rem, 6vw, 3.6rem);
  font-weight: 800;
  text-shadow: 0 0 30px rgba(52, 211, 153, 0.5);
}

.beat p {
  margin-top: 0.8rem;
  font-family: 'JetBrains Mono', monospace;
  font-size: clamp(0.85rem, 2.2vw, 1.05rem);
  color: #a8e6c5;
}

/* ── Bottom HUD ────────────────────────────────────────────────── */

.hud-bottom {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  padding: 1rem 1.4rem 1.2rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  z-index: 5;
}

.level-label {
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.8rem;
  color: #a8e6c5;
}

.progress-track {
  height: 4px;
  border-radius: 999px;
  background: rgba(150, 255, 190, 0.15);
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #34d399, #a3e635);
  transform-origin: left;
  transform: scaleX(0);
}

.scroll-hint {
  text-align: center;
  font-size: 0.85rem;
  color: #a8e6c5;
  animation: bob 1.8s ease-in-out infinite;
}

@keyframes bob {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(6px); }
}

/* ── Course card ───────────────────────────────────────────────── */

.course-card {
  position: fixed;
  top: 50%;
  right: 1.4rem;
  transform: translateY(-50%);
  width: min(320px, calc(100vw - 2.8rem));
  background: rgba(6, 40, 24, 0.75);
  border: 1px solid rgba(150, 255, 190, 0.25);
  border-radius: 18px;
  padding: 1.3rem 1.4rem;
  backdrop-filter: blur(12px);
  pointer-events: auto;
  z-index: 6;
  transition: opacity 0.25s, transform 0.25s;
}

.course-card.hidden {
  opacity: 0;
  transform: translateY(-50%) translateX(16px);
  pointer-events: none;
}

.card-close {
  position: absolute;
  top: 0.5rem;
  right: 0.7rem;
  background: none;
  border: none;
  color: #a8e6c5;
  font-size: 1.3rem;
  cursor: pointer;
}

.card-code {
  font-family: 'JetBrains Mono', monospace;
  color: #34d399;
  font-size: 0.85rem;
}

.card-title {
  margin: 0.3rem 0 0.6rem;
  font-size: 1.15rem;
}

.card-meta {
  font-size: 0.8rem;
  color: #a8e6c5;
}

/* ── Finale ────────────────────────────────────────────────────── */

.finale {
  position: fixed;
  inset: 0;
  display: grid;
  place-content: center;
  text-align: center;
  gap: 0.6rem;
  padding: 0 1.5rem;
  transition: opacity 0.6s;
}

.finale.hidden {
  opacity: 0;
  pointer-events: none;
}

.finale h2 {
  font-size: clamp(2rem, 6vw, 3.2rem);
  font-weight: 800;
  text-shadow: 0 0 30px rgba(52, 211, 153, 0.5);
}

.finale-name {
  font-family: 'JetBrains Mono', monospace;
  color: #a8e6c5;
}

.finale-stats {
  font-size: 1.05rem;
  color: #d8ffe9;
}

.finale-actions {
  margin-top: 1rem;
  display: flex;
  gap: 0.7rem;
  justify-content: center;
}

.scroll-hint {
  transition: opacity 0.4s;
}

.scroll-hint.hidden {
  opacity: 0;
}
```

Note: `.hidden` visibility is handled per-component (opacity + pointer-events, never `display: none`) so CSS transitions keep working.

- [ ] **Step 4: Verify the full experience in the dev server**

```bash
npm run dev
```

Check: intro beats fade in/out over the first scroll stretch; HUD level label advances (Prologue → 100 Level → … → The Canopy); progress bar fills; finale appears near the end with working Explore + Calculator buttons; Explore mode locks page scroll, allows drag/zoom, clicking a leaf opens the right course card; Journey button returns to scroll mode; Walk button is disabled with "Coming soon" tooltip. Stop the server.

- [ ] **Step 5: Typecheck, tests, build**

```bash
npm run typecheck && npm run test:unit && npm test && npm run lint && npm run build
```

Expected: all pass.

- [ ] **Step 6: Commit**

```bash
git add src/ui/overlay.ts src/main.ts src/ui/journey.css
git commit -m "feat: add journey overlay — intro beats, HUD, course card, finale, mode switching"
```

---

### Task 9: CI/CD workflow, Dockerfile, README

**Files:**
- Modify: `.github/workflows/ci-cd.yml`
- Modify: `Dockerfile`
- Modify: `README.md`

- [ ] **Step 1: Add typecheck + vitest steps to the ci job**

In `.github/workflows/ci-cd.yml`, after the "Test with coverage" step and before "Upload coverage", insert:

```yaml
      - name: Typecheck (TypeScript)
        run: npm run typecheck

      - name: Unit tests (Vitest)
        run: npm run test:unit
```

The deploy job needs no changes — `npm run build` now runs the calculator sync (prebuild) plus `vite build`, still emitting `dist/` for the FTP step.

- [ ] **Step 2: Update the Dockerfile build line**

Replace the `RUN` line in stage 1:

```dockerfile
RUN npm run lint && npm test && npm run test:unit && npm run typecheck && npm run build
```

- [ ] **Step 3: Update README.md**

Replace the README title/intro (first heading and paragraph) with:

```markdown
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
```

Keep the rest of the README (CI/CD documentation) as is.

- [ ] **Step 4: Validate the workflow file and run the full local gate**

```bash
npx --yes yaml-lint .github/workflows/ci-cd.yml 2>/dev/null || node -e "console.log('skip yaml-lint')"
npm run lint && npm test && npm run test:unit && npm run typecheck && npm run build
```

Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add .github/workflows/ci-cd.yml Dockerfile README.md
git commit -m "ci: run typecheck and vitest in pipeline; document Veritas Journey"
```

---

### Task 10: Final verification sweep

**Files:** none new.

- [ ] **Step 1: Full clean-room verification**

```bash
rm -rf node_modules dist
npm ci
npm run lint && npm test && npm run test:unit && npm run typecheck && npm run build
```

Expected: every command exits 0.

- [ ] **Step 2: Verify built output structure**

```bash
ls dist/index.html dist/calculator/index.html dist/calculator/src/calculator.js
! grep -rqi "CGPA" dist/assets
```

Expected: all three paths exist; the built journey bundle contains no grade/GPA data (privacy decision from the spec).

- [ ] **Step 3: Smoke-test the production build**

```bash
npm run preview
```

Open the preview URL: journey loads and scrolls; `/calculator/` works; calculator's "🌳 Journey" button returns to `/`. Stop the server.

- [ ] **Step 4: Commit any stragglers and report**

```bash
git status --short
```

Expected: clean. Report completion with the verification evidence (per superpowers:verification-before-completion).
