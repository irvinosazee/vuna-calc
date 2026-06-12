# Guided Chapters + Walk Mode + Calculator Skin Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the live Veritas Journey self-explanatory (8 semester chapters, auto-cycling course ticker with "about" lines, pulsing leaf spotlight, legend) and turn the disabled Walk button into a real first-person grove walk, plus re-theme the calculator page to match.

**Architecture:** A new pure module `src/journey/chapters.ts` maps scroll progress → chapter/course (unit-tested, no Three.js). The overlay consumes that mapping every frame; `JourneyTree.setSpotlight()` pulses the matching leaf instance. `WalkRig` fills the existing `CameraRig` interface so the mode manager barely changes. The calculator skin is a CSS-variables override file — zero JS/markup-logic changes.

**Tech Stack:** Existing: Vite 8, TypeScript, Three.js 0.184, Vitest, Jest. No new dependencies.

**Spec:** `docs/superpowers/specs/2026-06-12-guided-chapters-walk-design.md`

**Branch:** create `feat/guided-chapters-walk` from `main` before Task 1.

---

## File map

| Path | Action | Responsibility |
|---|---|---|
| `src/data/journey.ts` | Modify | `Course.about` field + 79 description lines |
| `src/journey/chapters.ts` | Create | Pure progress → chapter/course mapping |
| `src/scene/tree.ts` | Modify | `setSpotlight()` leaf pulse |
| `src/rigs/WalkRig.ts` | Replace | First-person walk (keys + drag-look + touch joystick) |
| `src/ui/overlay.ts` | Replace | Chapter panel, ticker, legend, hints, walk button enabled |
| `src/ui/journey.css` | Append | Chapter panel / legend / hints / joystick styles |
| `src/main.ts` | Replace ×2 | Wire chapters+spotlight (Task 4), wire walk (Task 5) |
| `public/calculator/index.html` | Modify | +2 link tags (fonts, skin) |
| `public/calculator/assets/css/journey-skin.css` | Create | Green re-theme via CSS variable overrides |
| `tests/journey/chapters.test.ts` | Create | Mapping unit tests |
| `tests/journey/data.test.ts` | Modify | `about` integrity test |

---

### Task 0: Branch

- [ ] **Step 1:**
```bash
git checkout -b feat/guided-chapters-walk
npm ci
npm test && npm run test:unit   # baseline: 25 + 21 pass
```

---

### Task 1: Course `about` lines (TDD)

**Files:**
- Test: `tests/journey/data.test.ts`
- Modify: `src/data/journey.ts`

- [ ] **Step 1: Write the failing test** — add inside the existing `describe('journey data integrity', ...)` block:

```ts
  it('every course has a short about line', () => {
    for (const c of allCourses) {
      expect(c.about.length, `${c.code} about`).toBeGreaterThan(10);
      expect(c.about.length, `${c.code} about`).toBeLessThan(160);
    }
  });
```

- [ ] **Step 2: Run `npm run test:unit`** — expected: FAIL (typecheck error / undefined `about`). Note: with `strict` TS the suite may fail to compile, which counts as the red step.

- [ ] **Step 3: Add the field to the interface** in `src/data/journey.ts`:

```ts
export interface Course {
  code: string;
  title: string;
  units: number;
  /** One plain-English line shown in the guided ticker — edit freely. */
  about: string;
}
```

- [ ] **Step 4: Add `about` to every course object.** Insert `about: '<text>'` as the last property of each course, using EXACTLY these texts (code → about):

```text
GST111 → Foundations of clear English — grammar, comprehension, and writing for academic life.
GST113 → Nigeria's peoples, cultures, and national identity — where the country's story comes from.
GST115 → How science grew from early thinkers to today, and the big questions behind it.
GST121 → Finding, evaluating, and managing information — research and study skills with ICT tools.
GST171 → Right and wrong in personal and professional life — moral reasoning in practice.
MTH101 → Sets, algebra, and functions — the maths toolkit everything else builds on.
PHY101 → Mechanics — motion, forces, energy, and momentum in the physical world.
PHY107 → Hands-on lab work measuring and verifying the physics from PHY101.
SEN101 → First tour of computing — how computers work and what you can build with them.
SEN103 → Designing software people can actually use — interfaces, usability, and human factors.
SEN105 → What software engineering is — the discipline, lifecycle, and craft of building software.
SEN181 → Practical lab — first programs, tools, and computing exercises.
GST112 → Advanced English communication — essays, reports, and confident presentation.
GST122 → Thinking about thinking — logic, arguments, and life's big philosophical questions.
GST124 → Everyday French — basic vocabulary, grammar, and conversation.
GST142 → Giving back — organized service projects in the local community.
MTH102 → Calculus begins — limits, differentiation, and integration.
PHY102 → Electricity and magnetism — fields, circuits, and electromagnetic waves.
PHY108 → Lab experiments in electricity and magnetism.
SEN102 → First real programming — variables, control flow, functions, and problem solving in code.
SEN104 → How the web works — HTML, CSS, and your first web pages.
SEN106 → Crafting and testing user experiences — prototypes, evaluation, and design thinking.
SEN108 → Propositional and predicate logic — the formal reasoning behind computing.
SEN182 → Practical lab — programming and web exercises building on the semester's courses.
SEN190 → Supervised hands-on practice applying first-year skills.
GST211 → Foundations of Christian spiritual thought and practice.
GST221 → Understanding conflict and the skills to resolve it peacefully.
GST223 → Spotting opportunities and thinking like an entrepreneur.
MTH203 → Vectors, matrices, and linear systems — the maths behind graphics and machine learning.
SEN201 → Sets, relations, graphs, and combinatorics — the maths of computer science.
SEN203 → Turning fuzzy ideas into precise requirements and solid designs.
SEN205 → Inside the machine — CPUs, memory, and how hardware executes your code.
SEN207 → How to organize data and design fast algorithms — lists, trees, sorting, searching.
SEN209 → Structuring information so people can find and understand it.
SEN281 → Practical lab — data structures and design exercises.
GST272 → Catholic social thought — justice, dignity, and the common good.
SEN202 → Deeper programming — objects, recursion, and larger program design.
SEN204 → Writing real software well — coding standards, debugging, and building to spec.
SEN206 → Why algorithms are fast or slow — complexity analysis and design strategies.
SEN208 → How operating systems juggle processes, memory, and files under the hood.
SEN210 → The processes teams use to ship software — agile, plans, and quality gates.
SEN212 → Turning data into visuals people can read at a glance.
SEN214 → Programming tiny computers — embedded systems and hardware control.
SEN282 → Practical lab — algorithms, operating systems, and construction exercises.
SEN290 → First industrial attachment — real work experience in the field.
GST311 → Building a venture — business models, planning, and startup basics.
SEN301 → Modeling systems with objects — UML, patterns, and object-oriented design.
SEN303 → Programming industrial PLCs that run factories and machines.
SEN305 → Full web apps — front end to back end, databases to deployment.
SEN307 → Designing and querying databases — ER models, SQL, and normalization.
SEN309 → What makes programming languages tick — syntax, semantics, and paradigms compared.
SEN381 → Practical lab — web, database, and object-oriented design projects.
STA343 → Optimizing decisions mathematically — linear programming and modeling.
SEN302 → Versioning, releases, and keeping software healthy after launch.
SEN304 → Planning, estimating, and leading software projects.
SEN306 → How to do and write up research — methods, sources, and rigor.
SEN308 → Ethics, law, and professionalism for working engineers.
SEN310 → Building secure software — threats, vulnerabilities, and defenses.
SEN312 → Machines that reason — search, knowledge representation, and expert systems.
SEN314 → Designing and building apps for phones and tablets.
SEN316 → Finding bugs systematically — test design, automation, and quality assurance.
SEN382 → Practical lab — testing, security, and mobile projects.
SEN390 → Second industrial attachment — longer, deeper industry experience.
SEN401 → The money side of software — costs, value, and engineering trade-offs.
SEN403 → How people and computers interact — and how to design for humans.
SEN405 → Contributing to and building with open-source software.
SEN407 → Computing at scale — distributed systems, parallelism, and the cloud.
SEN409 → The big-picture structure of systems — architectures, styles, and trade-offs.
SEN411 → Emerging topics at the edge of software engineering.
SEN413 → Presenting and defending research — seminar practice for the final project.
SEN415 → Visual fundamentals for software — layout, color, and typography.
SEN481 → Practical lab — architecture and human-computer interaction projects.
SEN402 → Large-scale business applications — enterprise stacks and integration.
SEN404 → Building immersive virtual and augmented reality experiences.
SEN406 → Systems that survive failure — redundancy, recovery, and reliability.
SEN408 → Designing and building games — mechanics, engines, and play.
SEN410 → Simulating real-world systems with computational models.
SEN482 → The final lab — where this very website was built and deployed.
SEN490 → The capstone — a complete software project from idea to defense.
```

- [ ] **Step 5: Run `npm run test:unit`** — expected: PASS (22 tests now). `npm run typecheck` → 0. `npm run test:unit` data file count: 10 data tests total.

- [ ] **Step 6: Commit**
```bash
git add src/data/journey.ts tests/journey/data.test.ts
git commit -m "feat: add editable one-line about for all 79 courses"
```

---

### Task 2: chapters.ts — scroll → chapter/course mapping (TDD)

**Files:**
- Test: `tests/journey/chapters.test.ts`
- Create: `src/journey/chapters.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest';
import { chapterAt, leafIndexOf, CLIMB_START, CLIMB_END } from '../../src/journey/chapters';
import { levels, allCourses } from '../../src/data/journey';

describe('chapterAt', () => {
  it('is intro before the climb and finale after it', () => {
    expect(chapterAt(0, levels).phase).toBe('intro');
    expect(chapterAt(CLIMB_START - 0.001, levels).phase).toBe('intro');
    expect(chapterAt(CLIMB_END, levels).phase).toBe('finale');
    expect(chapterAt(1, levels).phase).toBe('finale');
  });

  it('opens each of the 8 zones with a chapter window, in chronological order', () => {
    const zoneSize = (CLIMB_END - CLIMB_START) / 8;
    for (let z = 0; z < 8; z++) {
      const p = CLIMB_START + z * zoneSize + zoneSize * 0.05; // inside chapter window
      const pos = chapterAt(p, levels);
      expect(pos.phase).toBe('chapter');
      expect(pos.levelIdx).toBe(Math.floor(z / 2));
      expect(pos.semIdx).toBe(z % 2);
      expect(pos.courseIdx).toBe(-1);
    }
  });

  it('visits every course exactly once, in catalog order, as progress sweeps', () => {
    const seen: number[] = [];
    for (let i = 0; i <= 20000; i++) {
      const pos = chapterAt(i / 20000, levels);
      if (pos.phase !== 'course') continue;
      const flat = leafIndexOf(levels, pos.levelIdx, pos.semIdx, pos.courseIdx);
      if (seen[seen.length - 1] !== flat) seen.push(flat);
    }
    expect(seen).toEqual([...Array(allCourses.length).keys()]);
  });

  it('reaches the first and last course of a zone', () => {
    const zoneSize = (CLIMB_END - CLIMB_START) / 8;
    const startOfCourses = CLIMB_START + zoneSize * 0.15 + 0.0005;
    expect(chapterAt(startOfCourses, levels)).toMatchObject({ phase: 'course', levelIdx: 0, semIdx: 0, courseIdx: 0 });
    const endOfZone = CLIMB_START + zoneSize - 0.0005;
    expect(chapterAt(endOfZone, levels)).toMatchObject({ phase: 'course', levelIdx: 0, semIdx: 0, courseIdx: 11 });
  });
});

describe('leafIndexOf', () => {
  it('matches the bottom-up leaf ordering', () => {
    expect(leafIndexOf(levels, 0, 0, 0)).toBe(0);
    expect(leafIndexOf(levels, 0, 1, 0)).toBe(12);
    expect(leafIndexOf(levels, 3, 1, 6)).toBe(78);
  });
});
```

- [ ] **Step 2: Run `npm run test:unit`** — expected FAIL (module not found).

- [ ] **Step 3: Create `src/journey/chapters.ts`**

```ts
// Pure mapping from scroll progress to "where in the story are we" —
// no Three.js, no DOM, fully unit-testable. The journey is 8 semester
// zones; each zone opens with a chapter window then scrubs through its
// courses one by one.
import type { Level } from '../data/journey';

export type ChapterPhase = 'intro' | 'chapter' | 'course' | 'finale';

export interface ChapterPosition {
  phase: ChapterPhase;
  levelIdx: number; // -1 outside the climb
  semIdx: number; // -1 outside the climb
  courseIdx: number; // -1 unless phase === 'course'
}

export const CLIMB_START = 0.18;
export const CLIMB_END = 0.93;
const CHAPTER_WINDOW = 0.15; // first 15% of each zone announces the semester

const OUTSIDE = { levelIdx: -1, semIdx: -1, courseIdx: -1 } as const;

export function chapterAt(progress: number, levels: Level[]): ChapterPosition {
  if (progress < CLIMB_START) return { phase: 'intro', ...OUTSIDE };
  if (progress >= CLIMB_END) return { phase: 'finale', ...OUTSIDE };

  const zones = levels.length * 2;
  const zoneSize = (CLIMB_END - CLIMB_START) / zones;
  const offset = progress - CLIMB_START;
  const zone = Math.min(zones - 1, Math.floor(offset / zoneSize));
  const levelIdx = Math.floor(zone / 2);
  const semIdx = zone % 2;
  const within = (offset - zone * zoneSize) / zoneSize;

  if (within < CHAPTER_WINDOW) return { phase: 'chapter', levelIdx, semIdx, courseIdx: -1 };

  const courses = levels[levelIdx].semesters[semIdx].courses.length;
  const courseIdx = Math.min(
    courses - 1,
    Math.floor(((within - CHAPTER_WINDOW) / (1 - CHAPTER_WINDOW)) * courses),
  );
  return { phase: 'course', levelIdx, semIdx, courseIdx };
}

/** Flat leaf-instance index of a course (leaves are built level→semester→course). */
export function leafIndexOf(
  levels: Level[],
  levelIdx: number,
  semIdx: number,
  courseIdx: number,
): number {
  let i = 0;
  for (let li = 0; li < levels.length; li++) {
    for (let si = 0; si < levels[li].semesters.length; si++) {
      if (li === levelIdx && si === semIdx) return i + courseIdx;
      i += levels[li].semesters[si].courses.length;
    }
  }
  return -1;
}
```

- [ ] **Step 4: Run `npm run test:unit`** — expected PASS (27 tests, 4 files). `npm run typecheck` → 0.

- [ ] **Step 5: Commit**
```bash
git add src/journey/chapters.ts tests/journey/chapters.test.ts
git commit -m "feat: add pure chapter/course scroll mapping with tests"
```

---

### Task 3: Leaf spotlight pulse in tree.ts

**Files:**
- Modify: `src/scene/tree.ts`

No unit tests (visual); gates: typecheck + existing tests + visual check in Task 7.

- [ ] **Step 1: Store per-leaf base transforms.** In the constructor, the leaf loop currently composes matrices from `pos`/`quat`/`scl` temps. Add a class field and record each leaf's transform. New field declarations next to `leafRefs`:

```ts
  private readonly leafTransforms: { pos: THREE.Vector3; quat: THREE.Quaternion; scale: number }[] = [];
  private spotlight: number | null = null;
  private readonly spotM = new THREE.Matrix4();
  private readonly spotS = new THREE.Vector3();
```

Inside the `leaves.forEach` loop, after `m.compose(pos, quat, scl);` add:

```ts
      this.leafTransforms.push({ pos: pos.clone(), quat: quat.clone(), scale: s });
```

- [ ] **Step 2: Add `setSpotlight` and a private restore helper** (methods on `JourneyTree`, after `setGrowth`):

```ts
  /** Pulse one leaf (the guided ticker's current course); null clears it. */
  setSpotlight(index: number | null): void {
    if (index === this.spotlight) return;
    if (this.spotlight !== null) this.restoreLeaf(this.spotlight);
    this.spotlight = index;
  }

  private restoreLeaf(i: number): void {
    const t = this.leafTransforms[i];
    this.spotS.setScalar(t.scale);
    this.spotM.compose(t.pos, t.quat, this.spotS);
    this.leafMesh.setMatrixAt(i, this.spotM);
    this.leafMesh.instanceMatrix.needsUpdate = true;
  }
```

- [ ] **Step 3: Pulse in `update`.** Replace the existing `update` method with:

```ts
  update(t: number): void {
    this.group.rotation.z = Math.sin(t * 0.4) * 0.008;
    this.group.rotation.x = Math.cos(t * 0.3) * 0.006;

    if (this.spotlight !== null && this.spotlight < this.leafMesh.count) {
      const lt = this.leafTransforms[this.spotlight];
      this.spotS.setScalar(lt.scale * (1 + 0.22 * Math.sin(t * 5)));
      this.spotM.compose(lt.pos, lt.quat, this.spotS);
      this.leafMesh.setMatrixAt(this.spotlight, this.spotM);
      this.leafMesh.instanceMatrix.needsUpdate = true;
    }
  }
```

- [ ] **Step 4: Verify** — `npm run typecheck` → 0; `npm run test:unit` → 27 pass; `npm run build` → success.

- [ ] **Step 5: Commit**
```bash
git add src/scene/tree.ts
git commit -m "feat: add leaf spotlight pulse for the guided ticker"
```

---

### Task 4: Overlay rework + main wiring (chapters, ticker, legend, hints)

**Files:**
- Replace: `src/ui/overlay.ts`
- Modify: `src/main.ts`
- Append: `src/ui/journey.css`

- [ ] **Step 1: Replace `src/ui/overlay.ts` entirely with:**

```ts
import {
  introBeats,
  levels,
  student,
  totalUnits,
  allCourses,
  theme,
  courseFamily,
  type Course,
} from '../data/journey';
import type { ChapterPosition } from '../journey/chapters';
import type { Mode } from '../rigs/types';

export interface CourseHit {
  course: Course;
  levelIdx: number;
  semIdx: number;
}

export interface OverlayHandles {
  update(progress: number, mode: Mode, pos: ChapterPosition): void;
  showCourse(hit: CourseHit): void;
  hideCourse(): void;
}

const LEGEND = [
  { color: theme.families.SEN, label: 'SEN core' },
  { color: theme.families.GST, label: 'General studies' },
  { color: theme.families.MTH, label: 'Maths & sciences' },
  { color: theme.families.LAB, label: 'Labs · SIWES' },
];

export function createOverlay(
  root: HTMLElement,
  onMode: (m: Mode) => void,
  touch: boolean,
): OverlayHandles {
  root.innerHTML = `
    <header class="hud-top">
      <div class="brand">🌳 Veritas Journey</div>
      <nav class="modes">
        <button class="mode-btn active" data-mode="journey">Journey</button>
        <button class="mode-btn" data-mode="explore">Explore</button>
        <button class="mode-btn" data-mode="walk">Walk</button>
        <a class="mode-btn calc-link" href="./calculator/">Calculator</a>
      </nav>
    </header>
    <div class="beats">
      ${introBeats
        .map((b, i) => `<section class="beat" data-beat="${i}"><h2>${b.title}</h2><p>${b.text}</p></section>`)
        .join('')}
    </div>
    <aside class="chapter-panel hidden">
      <div class="chapter-level"></div>
      <div class="chapter-sem"></div>
      <div class="chapter-meta"></div>
    </aside>
    <div class="leaf-hint hidden">🍃 each leaf is a course — click one</div>
    <div class="hud-bottom">
      <div class="legend">
        ${LEGEND.map((l) => `<span class="legend-item"><i style="background:${l.color}"></i>${l.label}</span>`).join('')}
      </div>
      <div class="level-label">Prologue</div>
      <div class="progress-track"><div class="progress-fill"></div></div>
      <div class="scroll-hint">Scroll to grow ↓</div>
    </div>
    <aside class="course-card hidden">
      <button class="card-close" aria-label="Close">×</button>
      <div class="card-code"></div>
      <h3 class="card-title"></h3>
      <p class="card-about"></p>
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
  const chapterPanel = root.querySelector<HTMLElement>('.chapter-panel')!;
  const chapterLevel = root.querySelector<HTMLElement>('.chapter-level')!;
  const chapterSem = root.querySelector<HTMLElement>('.chapter-sem')!;
  const chapterMeta = root.querySelector<HTMLElement>('.chapter-meta')!;
  const leafHint = root.querySelector<HTMLElement>('.leaf-hint')!;
  const fill = root.querySelector<HTMLElement>('.progress-fill')!;
  const label = root.querySelector<HTMLElement>('.level-label')!;
  const hint = root.querySelector<HTMLElement>('.scroll-hint')!;
  const finale = root.querySelector<HTMLElement>('.finale')!;
  const card = root.querySelector<HTMLElement>('.course-card')!;
  const cardCode = root.querySelector<HTMLElement>('.card-code')!;
  const cardTitle = root.querySelector<HTMLElement>('.card-title')!;
  const cardAbout = root.querySelector<HTMLElement>('.card-about')!;
  const cardMeta = root.querySelector<HTMLElement>('.card-meta')!;
  const modeButtons = [...root.querySelectorAll<HTMLButtonElement>('button.mode-btn[data-mode]')];

  let pinned = false; // a clicked leaf overrides the auto ticker until closed
  let shownChapter = ''; // "levelIdx-semIdx" currently in the panel
  let tickerKey = ''; // course currently in the ticker
  let leafHintDone = false;

  for (const btn of modeButtons) {
    btn.addEventListener('click', () => onMode(btn.dataset.mode as Mode));
  }
  card.querySelector('.card-close')!.addEventListener('click', () => {
    pinned = false;
    card.classList.add('hidden');
  });

  function renderCard(hit: CourseHit): void {
    const sem = levels[hit.levelIdx].semesters[hit.semIdx];
    cardCode.textContent = hit.course.code;
    cardCode.style.color = theme.families[courseFamily(hit.course.code)];
    cardTitle.textContent = hit.course.title;
    cardAbout.textContent = hit.course.about;
    cardMeta.textContent = `${hit.course.units} unit${hit.course.units === 1 ? '' : 's'} · ${(hit.levelIdx + 1) * 100} Level · ${sem.name} · ${sem.session}`;
    card.classList.remove('hidden');
  }

  return {
    update(progress: number, mode: Mode, pos: ChapterPosition): void {
      const journey = mode === 'journey';

      beats.forEach((el, i) => {
        const start = i * 0.06;
        el.classList.toggle('visible', journey && progress >= start && progress < start + 0.06);
      });

      fill.style.transform = `scaleX(${progress})`;
      hint.classList.toggle('hidden', !journey || progress > 0.03);
      finale.classList.toggle('hidden', !journey || pos.phase !== 'finale');
      for (const btn of modeButtons) btn.classList.toggle('active', btn.dataset.mode === mode);

      if (mode === 'walk') {
        label.textContent = touch
          ? 'Walk the grove — left thumb to move · right thumb to look'
          : 'Walk the grove — WASD / arrows to move · drag to look';
      } else if (mode === 'explore') {
        label.textContent = 'Free explore — drag, zoom, click a leaf';
      } else if (pos.phase === 'intro') {
        label.textContent = 'Prologue';
      } else if (pos.phase === 'finale') {
        label.textContent = 'The Canopy';
      } else {
        const sem = levels[pos.levelIdx].semesters[pos.semIdx];
        label.textContent = `${(pos.levelIdx + 1) * 100} Level · ${sem.name}`;
      }

      // Chapter panel
      const inClimb = journey && (pos.phase === 'chapter' || pos.phase === 'course');
      chapterPanel.classList.toggle('hidden', !inClimb);
      chapterPanel.classList.toggle('compact', pos.phase === 'course');
      if (inClimb) {
        const key = `${pos.levelIdx}-${pos.semIdx}`;
        if (key !== shownChapter) {
          shownChapter = key;
          const sem = levels[pos.levelIdx].semesters[pos.semIdx];
          const units = sem.courses.reduce((s, c) => s + c.units, 0);
          chapterLevel.textContent = `${(pos.levelIdx + 1) * 100} LEVEL`;
          chapterSem.textContent = `${sem.name} · ${sem.session}`;
          chapterMeta.textContent = `${sem.courses.length} courses · ${units} units`;
        }
        if (!leafHintDone) {
          leafHintDone = true;
          leafHint.classList.remove('hidden');
          setTimeout(() => leafHint.classList.add('hidden'), 6000);
        }
      }

      // Auto ticker (journey mode only, never over a pinned card)
      if (journey && !pinned) {
        if (pos.phase === 'course') {
          const key = `${pos.levelIdx}-${pos.semIdx}-${pos.courseIdx}`;
          if (key !== tickerKey) {
            tickerKey = key;
            renderCard({
              course: levels[pos.levelIdx].semesters[pos.semIdx].courses[pos.courseIdx],
              levelIdx: pos.levelIdx,
              semIdx: pos.semIdx,
            });
          }
        } else {
          tickerKey = '';
          card.classList.add('hidden');
        }
      }
    },

    showCourse(hit: CourseHit): void {
      pinned = true;
      renderCard(hit);
    },

    hideCourse(): void {
      pinned = false;
      card.classList.add('hidden');
    },
  };
}
```

- [ ] **Step 2: Replace `src/main.ts` entirely with** (walk stays guarded until Task 5):

```ts
import './ui/journey.css';
import * as THREE from 'three';
import { theme, levels } from './data/journey';
import { chapterAt, leafIndexOf } from './journey/chapters';
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
    if (next === mode || next === 'walk') return; // walk arrives in the next task
    rig.dispose();
    mode = next;
    rig = next === 'explore' ? orbitRig : scrollRig;
    rig.enter(camera);
    document.body.classList.toggle('mode-explore', next !== 'journey');
  }

  const ui = createOverlay(overlayRoot, setMode, isMobile);

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

    const pos = chapterAt(scrollRig.progress, levels);
    const growth =
      mode !== 'journey' ? 1 : Math.min(1, Math.max(0, (scrollRig.progress - 0.04) / 0.7));
    tree.setGrowth(growth);
    tree.setSpotlight(
      mode === 'journey' && pos.phase === 'course'
        ? leafIndexOf(levels, pos.levelIdx, pos.semIdx, pos.courseIdx)
        : null,
    );
    tree.update(t);
    env.update(t);
    ui.update(scrollRig.progress, mode, pos);
    renderer.render(scene, camera);
  });
}
```

- [ ] **Step 3: Append to `src/ui/journey.css`:**

```css
/* ── Guided chapters ───────────────────────────────────────────── */

.chapter-panel {
  position: fixed;
  top: 18%;
  left: 1.4rem;
  max-width: 300px;
  padding: 1.1rem 1.3rem;
  background: rgba(6, 40, 24, 0.7);
  border: 1px solid rgba(150, 255, 190, 0.25);
  border-radius: 16px;
  backdrop-filter: blur(10px);
  transition: opacity 0.4s, transform 0.4s;
  z-index: 5;
}

.chapter-panel.hidden {
  opacity: 0;
  transform: translateX(-12px);
  pointer-events: none;
}

.chapter-panel .chapter-level {
  font-weight: 800;
  font-size: 1.5rem;
  text-shadow: 0 0 18px rgba(52, 211, 153, 0.5);
}

.chapter-panel .chapter-sem {
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.8rem;
  color: #a8e6c5;
  margin-top: 0.2rem;
}

.chapter-panel .chapter-meta {
  font-size: 0.85rem;
  color: #d8ffe9;
  margin-top: 0.4rem;
}

.chapter-panel.compact {
  transform: scale(0.82);
  transform-origin: top left;
  opacity: 0.85;
}

/* ── Legend ────────────────────────────────────────────────────── */

.legend {
  display: flex;
  gap: 0.9rem;
  flex-wrap: wrap;
  font-size: 0.72rem;
  color: #a8e6c5;
}

.legend-item {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
}

.legend-item i {
  width: 0.65rem;
  height: 0.65rem;
  border-radius: 50%;
  display: inline-block;
}

/* ── Leaf hint ─────────────────────────────────────────────────── */

.leaf-hint {
  position: fixed;
  top: 5.2rem;
  left: 50%;
  transform: translateX(-50%);
  padding: 0.5rem 1.1rem;
  background: rgba(6, 40, 24, 0.75);
  border: 1px solid rgba(150, 255, 190, 0.3);
  border-radius: 999px;
  font-size: 0.85rem;
  backdrop-filter: blur(8px);
  transition: opacity 0.8s;
  z-index: 6;
}

.leaf-hint.hidden {
  opacity: 0;
  pointer-events: none;
}

/* ── Card about line ───────────────────────────────────────────── */

.card-about {
  margin: 0 0 0.6rem;
  font-size: 0.88rem;
  line-height: 1.45;
  color: #c4f0d8;
}
```

- [ ] **Step 4: Verify**
```bash
npm run typecheck && npm run test:unit && npm test && npm run lint && npm run build
```
All pass (27 vitest + 25 jest). Then `npm run dev`, open http://localhost:5173: scroll — chapter panels announce each semester then shrink while the course card auto-cycles with about lines and the matching leaf pulses; legend visible bottom-left; one-time leaf hint appears at first chapter; clicking a leaf pins its card; closing resumes the ticker. Stop the server.

- [ ] **Step 5: Commit**
```bash
git add src/ui/overlay.ts src/main.ts src/ui/journey.css
git commit -m "feat: guided chapters — semester panels, course ticker, spotlight wiring, legend"
```

---

### Task 5: Walk mode

**Files:**
- Replace: `src/rigs/WalkRig.ts`
- Modify: `src/main.ts` (3 small edits)
- Append: `src/ui/journey.css`

- [ ] **Step 1: Replace `src/rigs/WalkRig.ts` entirely with:**

```ts
import * as THREE from 'three';
import type { CameraRig } from './types';

const EYE_HEIGHT = 1.7;
const SPEED = 6; // world units / second
const MIN_R = 4; // can't walk into the trunk
const MAX_R = 45; // can't walk off the grove
const LOOK_SENS = 0.004;
const PITCH_LIMIT = Math.PI * 0.39; // ~70°
const JOY_RANGE = 60; // px of thumb travel for full speed

/**
 * First-person stroll on the grove floor.
 * Desktop: WASD/arrows move, pointer-drag looks.
 * Touch: left-half virtual joystick moves, right-half drag looks.
 */
export class WalkRig implements CameraRig {
  private yaw = 0;
  private pitch = 0;
  private readonly keys = new Set<string>();
  private lookId: number | null = null;
  private lookLast = { x: 0, y: 0 };
  private moveId: number | null = null;
  private moveVec = { x: 0, y: 0 }; // joystick offset in px
  private detach: (() => void)[] = [];
  private joyBase?: HTMLElement;
  private joyNub?: HTMLElement;

  constructor(
    private readonly dom: HTMLElement,
    private readonly touch: boolean,
  ) {}

  enter(camera: THREE.PerspectiveCamera): void {
    camera.position.set(0, EYE_HEIGHT, 14);
    this.yaw = 0; // facing -z = facing the trunk from +z
    this.pitch = 0.15; // a hint upward, toward the canopy

    const on = <K extends keyof WindowEventMap>(
      target: Window | HTMLElement,
      type: K | string,
      fn: (e: never) => void,
      opts?: AddEventListenerOptions,
    ): void => {
      target.addEventListener(type as string, fn as EventListener, opts);
      this.detach.push(() => target.removeEventListener(type as string, fn as EventListener, opts));
    };

    on(window, 'keydown', (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(k)) e.preventDefault();
      this.keys.add(k);
    });
    on(window, 'keyup', (e: KeyboardEvent) => this.keys.delete(e.key.toLowerCase()));

    on(this.dom, 'pointerdown', (e: PointerEvent) => {
      if (this.touch && e.clientX < window.innerWidth / 2 && this.moveId === null) {
        this.moveId = e.pointerId;
        this.moveVec = { x: 0, y: 0 };
        this.showJoystick(e.clientX, e.clientY);
      } else if (this.lookId === null) {
        this.lookId = e.pointerId;
        this.lookLast = { x: e.clientX, y: e.clientY };
      }
    });
    on(this.dom, 'pointermove', (e: PointerEvent) => {
      if (e.pointerId === this.lookId) {
        this.yaw -= (e.clientX - this.lookLast.x) * LOOK_SENS;
        this.pitch = Math.max(
          -PITCH_LIMIT,
          Math.min(PITCH_LIMIT, this.pitch - (e.clientY - this.lookLast.y) * LOOK_SENS),
        );
        this.lookLast = { x: e.clientX, y: e.clientY };
      } else if (e.pointerId === this.moveId) {
        const r = this.joyBase!.getBoundingClientRect();
        this.moveVec = {
          x: e.clientX - (r.left + r.width / 2),
          y: e.clientY - (r.top + r.height / 2),
        };
        const len = Math.hypot(this.moveVec.x, this.moveVec.y);
        if (len > JOY_RANGE) {
          this.moveVec.x *= JOY_RANGE / len;
          this.moveVec.y *= JOY_RANGE / len;
        }
        this.joyNub!.style.transform = `translate(${this.moveVec.x}px, ${this.moveVec.y}px)`;
      }
    });
    const release = (e: PointerEvent): void => {
      if (e.pointerId === this.lookId) this.lookId = null;
      if (e.pointerId === this.moveId) {
        this.moveId = null;
        this.moveVec = { x: 0, y: 0 };
        this.hideJoystick();
      }
    };
    on(this.dom, 'pointerup', release);
    on(this.dom, 'pointercancel', release);
  }

  update(camera: THREE.PerspectiveCamera, dt: number): void {
    let f = 0;
    let s = 0;
    if (this.keys.has('w') || this.keys.has('arrowup')) f += 1;
    if (this.keys.has('s') || this.keys.has('arrowdown')) f -= 1;
    if (this.keys.has('a') || this.keys.has('arrowleft')) s -= 1;
    if (this.keys.has('d') || this.keys.has('arrowright')) s += 1;
    f += -this.moveVec.y / JOY_RANGE;
    s += this.moveVec.x / JOY_RANGE;
    const len = Math.hypot(f, s);
    if (len > 1) {
      f /= len;
      s /= len;
    }

    const sinY = Math.sin(this.yaw);
    const cosY = Math.cos(this.yaw);
    // yaw 0 faces -z: forward = (-sinY, 0, -cosY), right = (cosY, 0, -sinY)
    camera.position.x += (-sinY * f + cosY * s) * SPEED * dt;
    camera.position.z += (-cosY * f - sinY * s) * SPEED * dt;

    const r = Math.hypot(camera.position.x, camera.position.z);
    if (r > 0 && (r < MIN_R || r > MAX_R)) {
      const clamped = Math.max(MIN_R, Math.min(MAX_R, r));
      camera.position.x *= clamped / r;
      camera.position.z *= clamped / r;
    }
    camera.position.y = EYE_HEIGHT;

    camera.rotation.set(0, 0, 0);
    camera.rotateY(this.yaw);
    camera.rotateX(this.pitch);
  }

  dispose(): void {
    this.detach.forEach((d) => d());
    this.detach = [];
    this.keys.clear();
    this.lookId = null;
    this.moveId = null;
    this.moveVec = { x: 0, y: 0 };
    this.hideJoystick();
  }

  private showJoystick(x: number, y: number): void {
    if (!this.joyBase) {
      this.joyBase = document.createElement('div');
      this.joyBase.className = 'joystick';
      this.joyNub = document.createElement('div');
      this.joyNub.className = 'joystick-nub';
      this.joyBase.appendChild(this.joyNub);
      document.body.appendChild(this.joyBase);
    }
    this.joyBase.style.left = `${x}px`;
    this.joyBase.style.top = `${y}px`;
    this.joyBase.classList.add('active');
    this.joyNub!.style.transform = 'translate(0, 0)';
  }

  private hideJoystick(): void {
    this.joyBase?.classList.remove('active');
  }
}
```

- [ ] **Step 2: Wire walk into `src/main.ts`.** Three edits:

(a) Add the import after the OrbitRig import:
```ts
import { WalkRig } from './rigs/WalkRig';
```

(b) After the `const orbitRig = ...` line (`isMobile` is already declared above it), add:
```ts
  const walkRig = new WalkRig(renderer.domElement, isMobile);
```

(c) Replace the `setMode` function with:
```ts
  function setMode(next: Mode): void {
    if (next === mode) return;
    rig.dispose();
    mode = next;
    rig = next === 'explore' ? orbitRig : next === 'walk' ? walkRig : scrollRig;
    rig.enter(camera);
    // Non-journey modes lock page scroll (class also used by explore).
    document.body.classList.toggle('mode-explore', next !== 'journey');
  }
```

- [ ] **Step 3: Append joystick styles to `src/ui/journey.css`:**

```css
/* ── Walk-mode virtual joystick ────────────────────────────────── */

.joystick {
  position: fixed;
  width: 110px;
  height: 110px;
  margin: -55px 0 0 -55px;
  border: 2px solid rgba(150, 255, 190, 0.4);
  border-radius: 50%;
  background: rgba(6, 40, 24, 0.35);
  display: none;
  z-index: 7;
  pointer-events: none;
}

.joystick.active {
  display: block;
}

.joystick-nub {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 44px;
  height: 44px;
  margin: -22px 0 0 -22px;
  border-radius: 50%;
  background: rgba(52, 211, 153, 0.6);
}
```

- [ ] **Step 4: Verify**
```bash
npm run typecheck && npm run test:unit && npm test && npm run lint && npm run build
```
Then `npm run dev`: click **Walk** — camera drops to the grove floor facing the trunk; WASD/arrows move (page does NOT scroll); drag looks around with pitch clamped; you cannot reach the trunk (stops at radius 4) or escape the grove (radius 45); clicking a leaf still opens its card; HUD shows the walk controls hint; switching back to Journey restores scroll. Stop the server.

- [ ] **Step 5: Commit**
```bash
git add src/rigs/WalkRig.ts src/main.ts src/ui/journey.css
git commit -m "feat: walk mode — first-person grove stroll with keys, drag-look, touch joystick"
```

---

### Task 6: Calculator journey skin

**Files:**
- Create: `public/calculator/assets/css/journey-skin.css`
- Modify: `public/calculator/index.html` (insert 2 link tags only)

The calculator's neumorphic theme is variable-driven (`:root` and `body.dark-mode` define `--neu-*` in `assets/css/neumorphic.css`), so the skin just re-points the variables at the journey palette and adds fonts. NO changes to `src/calculator.js`, `assets/js/script.js`, or any Jest test.

- [ ] **Step 1: Create `public/calculator/assets/css/journey-skin.css`:**

```css
/* ============================================================
   Journey skin — re-themes the calculator to match the Veritas
   Journey site. Loaded LAST so it only overrides variables and
   a few accents. Light mode = mint grove, dark mode = deep forest.
   Functionality and layout are untouched.
   ============================================================ */

:root {
  --neu-bg: #cfe8d8;
  --neu-text: #1d4434;
  --neu-muted: #56806a;
  --neu-accent: #1f9861;
  --neu-accent-strong: #157a4c;
  --neu-danger: #d97a55;
  --neu-shadow-dark: #a7c6b4;
  --neu-shadow-light: #f2fff8;
}

body.dark-mode {
  --neu-bg: #103626;
  --neu-text: #d8ffe9;
  --neu-muted: #8fc4a8;
  --neu-accent: #34d399;
  --neu-accent-strong: #2bbd88;
  --neu-danger: #ff8f7a;
  --neu-shadow-dark: #082417;
  --neu-shadow-light: #1c4f38;
}

/* Sky gradient behind the neumorphic surface (subtle, same hue family
   so the soft shadows still read correctly). */
body {
  background: linear-gradient(160deg, #b9dcc8 0%, #cfe8d8 45%, #dbf2e4 100%) !important;
  font-family: 'Sora', 'Inter', 'Segoe UI', sans-serif !important;
}

body.dark-mode {
  background: linear-gradient(160deg, #0b2a1c 0%, #103626 45%, #15452f 100%) !important;
}

/* Monospace display, like the journey's course codes */
#result {
  font-family: 'JetBrains Mono', monospace !important;
}

/* The back-to-journey link + theme toggle styled like journey mode buttons */
a[title='Back to the 3D journey'],
.theme-toggle-btn {
  font-family: 'Sora', sans-serif !important;
  font-weight: 600;
  color: var(--neu-text) !important;
  background: var(--neu-bg) !important;
  border: 1px solid var(--neu-accent) !important;
  border-radius: 999px !important;
}

a[title='Back to the 3D journey']:hover,
.theme-toggle-btn:hover {
  background: var(--neu-accent) !important;
  color: #06281a !important;
}
```

- [ ] **Step 2: Add the two link tags to `public/calculator/index.html`.** In `<head>`, after the existing `<link rel="stylesheet" href="assets/css/neumorphic.css">` line, insert:

```html
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link
    href="https://fonts.googleapis.com/css2?family=Sora:wght@400;600;800&family=JetBrains+Mono:wght@500&display=swap"
    rel="stylesheet" />
  <link rel="stylesheet" href="assets/css/journey-skin.css">
```

- [ ] **Step 3: Verify**
```bash
npm test                       # 25 jest tests untouched and passing
npm run build
ls dist/calculator/assets/css/journey-skin.css
```
Then `npm run dev`, open http://localhost:5173/calculator/: page shows mint-grove neumorphic theme; toggle 🌙 → deep-forest dark mode; all buttons/calculations work; "🌳 Journey" pill returns to `/`. Stop the server.

- [ ] **Step 4: Commit**
```bash
git add public/calculator/assets/css/journey-skin.css public/calculator/index.html
git commit -m "feat: journey skin for the calculator — mint grove / deep forest themes"
```

---

### Task 7: Final verification sweep

- [ ] **Step 1: Full gates**
```bash
npm run lint && npm test && npm run test:unit && npm run typecheck && npm run build
```
Expected: 25 jest + 27 vitest, everything exits 0.

- [ ] **Step 2: Browser verification (controller runs the Playwright harness):** journey chapters/ticker/spotlight/legend/hint, leaf-click pinning, walk mode movement + bounds, calculator skin in both modes, zero console errors.

- [ ] **Step 3: Repo hygiene**
```bash
git status --short    # clean
```

Merge decision is handled by superpowers:finishing-a-development-branch (NOT part of this plan).
