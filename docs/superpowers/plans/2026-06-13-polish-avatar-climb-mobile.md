# Polish Round Implementation Plan — Avatar Climb, Tree Upgrade, Mobile, Calculator

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a procedural low-poly avatar that cinematically climbs the tree (replacing Walk mode), upgrade the tree (organic trunk, roots, foliage, twigs, crown canopy, ground life), drastically improve mobile UX, make the calculator a single sculpted mint-grove theme, and add a favicon.

**Architecture:** The climb choreography is a pure, unit-tested timeline (`src/journey/climb.ts`); the avatar (`src/scene/avatar.ts`) only animates in place while rigs/controllers own its position. Tree geometry additions are computed in the pure `layout.ts` (unit-tested) and rendered by `tree.ts` with instancing. Mobile is a CSS media-query layer plus three tiny JS knobs. Calculator changes stay CSS-only.

**Tech Stack:** Existing Vite 8 + TypeScript + Three.js 0.184 + Vitest + Jest. No new dependencies.

**Spec:** `docs/superpowers/specs/2026-06-12-polish-avatar-climb-mobile-design.md`

**Branch:** create `feat/polish-avatar-climb` from `main` before Task 1.

---

## File map

| Path | Action | Responsibility |
|---|---|---|
| `public/favicon.svg` | Create | Stylized tree favicon (both pages) |
| `index.html` | Modify | favicon link + `viewport-fit=cover` |
| `public/calculator/index.html` | Modify | favicon link only |
| `public/calculator/assets/css/journey-skin.css` | Replace | Single mint theme, toggle hidden, deep neumorphism |
| `src/journey/climb.ts` | Create | Pure climb timeline (TDD) |
| `src/journey/layout.ts` | Replace | + trunkSpine, foliage, twigs, crown, trunkPointAt (TDD) |
| `src/scene/tree.ts` | Replace | Organic trunk, roots, foliage/twig meshes, bigger leaves |
| `src/scene/environment.ts` | Replace | + grass tufts and flowers |
| `src/scene/avatar.ts` | Create | Procedural avatar with idle/walk/climb poses |
| `src/scene/wander.ts` | Create | Ambient avatar controller (journey idle, explore wander) |
| `src/rigs/ClimbRig.ts` | Create | Cinematic climb camera + avatar driver |
| `src/rigs/WalkRig.ts` | Delete | Replaced by ClimbRig |
| `src/rigs/types.ts` | Modify | `Mode` = journey \| explore \| climb |
| `src/ui/overlay.ts` | Modify | Climb button/label |
| `src/ui/journey.css` | Modify | Remove joystick CSS; append mobile layer |
| `src/main.ts` | Replace | Wire avatar/wander/ClimbRig; mobile pixel cap |
| `tests/journey/climb.test.ts` | Create | Timeline tests |
| `tests/journey/layout.test.ts` | Modify | New layout-feature tests |

---

### Task 0: Branch

- [ ] **Step 1:**
```bash
git checkout -b feat/polish-avatar-climb
npm ci
npm test && npm run test:unit   # baseline: 25 + 28 pass
```

---

### Task 1: Favicon + calculator single-theme deep neumorphism

**Files:**
- Create: `public/favicon.svg`
- Modify: `index.html` (2 small edits)
- Modify: `public/calculator/index.html` (1 line)
- Replace: `public/calculator/assets/css/journey-skin.css`

- [ ] **Step 1: Create `public/favicon.svg`:**

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect x="29" y="36" width="6" height="22" rx="2.5" fill="#5b4631"/>
  <circle cx="32" cy="22" r="14" fill="#2bbd88"/>
  <circle cx="20" cy="30" r="9" fill="#34d399"/>
  <circle cx="44" cy="30" r="9" fill="#1f9861"/>
  <circle cx="32" cy="34" r="8" fill="#a3e635"/>
</svg>
```

- [ ] **Step 2: `index.html`** — (a) change the viewport meta to
`<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />`;
(b) after the `<meta name="description" ...>` tag add:
`<link rel="icon" type="image/svg+xml" href="/favicon.svg" />`

- [ ] **Step 3: `public/calculator/index.html`** — after the existing `<link rel="stylesheet" href="assets/css/journey-skin.css">` line add:
`<link rel="icon" type="image/svg+xml" href="../favicon.svg">`

- [ ] **Step 4: Replace `public/calculator/assets/css/journey-skin.css` entirely with:**

```css
/* ============================================================
   Journey skin — single mint-grove theme with deep "3D"
   neumorphism. Loaded LAST so it overrides variables/accents.
   The dark-mode toggle is hidden; a stale localStorage "dark"
   preference still renders mint because body.dark-mode maps to
   the same palette. Functionality and layout untouched.
   ============================================================ */

:root,
body.dark-mode {
  --neu-bg: #cfe8d8;
  --neu-text: #1d4434;
  --neu-muted: #56806a;
  --neu-accent: #1f9861;
  --neu-accent-strong: #157a4c;
  --neu-danger: #d97a55;
  --neu-shadow-dark: #9cc1ab;
  --neu-shadow-light: #f6fffa;
}

body,
body.dark-mode {
  background: linear-gradient(160deg, #b9dcc8 0%, #cfe8d8 45%, #dbf2e4 100%) !important;
  font-family: 'Sora', 'Inter', 'Segoe UI', sans-serif !important;
}

/* Dark/light toggle retired — single sculpted theme. */
.theme-toggle-btn {
  display: none !important;
}

/* Deeper extrusion on the two cards */
.title-panel,
.calculator-card {
  border-radius: 24px !important;
  box-shadow:
    14px 14px 28px var(--neu-shadow-dark),
    -14px -14px 28px var(--neu-shadow-light) !important;
}

/* Sunken display well */
.display-container {
  border-radius: 18px !important;
  box-shadow:
    inset 7px 7px 14px var(--neu-shadow-dark),
    inset -7px -7px 14px var(--neu-shadow-light) !important;
}

#result {
  font-family: 'JetBrains Mono', monospace !important;
  background: transparent !important;
  box-shadow: none !important;
}

/* Sculpted keys: raised at rest, pressed-in on tap */
.btn-grid .btn {
  border-radius: 16px !important;
  box-shadow:
    7px 7px 14px var(--neu-shadow-dark),
    -7px -7px 14px var(--neu-shadow-light) !important;
  transition: box-shadow 0.12s ease, transform 0.12s ease !important;
}

.btn-grid .btn:active {
  box-shadow:
    inset 5px 5px 10px var(--neu-shadow-dark),
    inset -5px -5px 10px var(--neu-shadow-light) !important;
  transform: scale(0.97);
}

/* Back-to-journey pill */
a[title='Back to the 3D journey'] {
  font-family: 'Sora', sans-serif !important;
  font-weight: 600;
  color: var(--neu-text) !important;
  background: var(--neu-bg) !important;
  border: 1px solid var(--neu-accent) !important;
  border-radius: 999px !important;
  box-shadow:
    5px 5px 10px var(--neu-shadow-dark),
    -5px -5px 10px var(--neu-shadow-light) !important;
}

a[title='Back to the 3D journey']:hover {
  background: var(--neu-accent) !important;
  color: #06281a !important;
}
```

- [ ] **Step 5: Verify**
```bash
npm test                                # 25 pass — calculator JS untouched
npm run build
ls dist/favicon.svg dist/calculator/assets/css/journey-skin.css
grep -c "favicon.svg" dist/index.html dist/calculator/index.html   # 1 each
```

- [ ] **Step 6: Commit**
```bash
git add public/favicon.svg index.html public/calculator/index.html public/calculator/assets/css/journey-skin.css
git commit -m "feat: tree favicon; calculator single mint theme with deep neumorphism"
```

---

### Task 2: Climb timeline (TDD)

**Files:**
- Test: `tests/journey/climb.test.ts`
- Create: `src/journey/climb.ts`

- [ ] **Step 1: Write the failing test:**

```ts
import { describe, it, expect } from 'vitest';
import { climbStateAt, APPROACH_SECS, CLIMB_RATE, PAUSE_SECS } from '../../src/journey/climb';

const LEVEL_Y = [6, 13, 20, 27];
const TRUNK_HEIGHT = 32;

describe('climbStateAt', () => {
  it('starts with a ground approach', () => {
    expect(climbStateAt(0, LEVEL_Y, TRUNK_HEIGHT)).toMatchObject({ phase: 'approach', height: 0, done: false });
    const mid = climbStateAt(APPROACH_SECS / 2, LEVEL_Y, TRUNK_HEIGHT);
    expect(mid.phase).toBe('approach');
    expect(mid.approachT).toBeCloseTo(0.5);
  });

  it('pauses exactly once at each level ring, in order', () => {
    const seen: number[] = [];
    for (let s = 0; s <= 60; s += 0.05) {
      const st = climbStateAt(s, LEVEL_Y, TRUNK_HEIGHT);
      if (st.phase === 'pause' && seen[seen.length - 1] !== st.pauseLevel) seen.push(st.pauseLevel);
    }
    expect(seen).toEqual([0, 1, 2, 3]);
  });

  it('pause heights equal the level ring heights', () => {
    for (let s = 0; s <= 60; s += 0.05) {
      const st = climbStateAt(s, LEVEL_Y, TRUNK_HEIGHT);
      if (st.phase === 'pause') expect(LEVEL_Y[st.pauseLevel]).toBe(st.height);
    }
  });

  it('height never decreases', () => {
    let last = -1;
    for (let s = 0; s <= 60; s += 0.05) {
      const h = climbStateAt(s, LEVEL_Y, TRUNK_HEIGHT).height;
      expect(h).toBeGreaterThanOrEqual(last);
      last = h;
    }
  });

  it('terminates at the crown and stays there', () => {
    const total =
      APPROACH_SECS + TRUNK_HEIGHT / CLIMB_RATE + LEVEL_Y.length * PAUSE_SECS;
    const end = climbStateAt(total + 1, LEVEL_Y, TRUNK_HEIGHT);
    expect(end).toMatchObject({ phase: 'crown', height: TRUNK_HEIGHT, done: true });
    expect(climbStateAt(total + 100, LEVEL_Y, TRUNK_HEIGHT).phase).toBe('crown');
  });
});
```

- [ ] **Step 2: `npm run test:unit`** — FAIL (module not found); existing 28 still pass.

- [ ] **Step 3: Create `src/journey/climb.ts`:**

```ts
// Pure climb choreography: elapsed seconds -> where the avatar is on the
// tree. No Three.js, no DOM. Each Climb-mode entry restarts at elapsed 0.

export interface ClimbState {
  phase: 'approach' | 'climb' | 'pause' | 'crown';
  /** Height up the trunk (0 = ground). */
  height: number;
  /** 0..1 progress of the ground approach walk (1 once climbing). */
  approachT: number;
  /** Level index currently paused at (-1 otherwise). */
  pauseLevel: number;
  done: boolean;
}

export const APPROACH_SECS = 4;
export const CLIMB_RATE = 1.6; // trunk units per second
export const PAUSE_SECS = 1.8; // beat at each level ring

export function climbStateAt(elapsed: number, levelY: number[], trunkHeight: number): ClimbState {
  if (elapsed < APPROACH_SECS) {
    return {
      phase: 'approach',
      height: 0,
      approachT: Math.max(0, elapsed / APPROACH_SECS),
      pauseLevel: -1,
      done: false,
    };
  }

  let t = elapsed - APPROACH_SECS;
  let h = 0;
  for (let i = 0; i < levelY.length; i++) {
    const seg = (levelY[i] - h) / CLIMB_RATE;
    if (t < seg) return { phase: 'climb', height: h + t * CLIMB_RATE, approachT: 1, pauseLevel: -1, done: false };
    t -= seg;
    h = levelY[i];
    if (t < PAUSE_SECS) return { phase: 'pause', height: h, approachT: 1, pauseLevel: i, done: false };
    t -= PAUSE_SECS;
  }

  const finalSeg = (trunkHeight - h) / CLIMB_RATE;
  if (t < finalSeg) return { phase: 'climb', height: h + t * CLIMB_RATE, approachT: 1, pauseLevel: -1, done: false };
  return { phase: 'crown', height: trunkHeight, approachT: 1, pauseLevel: -1, done: true };
}
```

- [ ] **Step 4: `npm run test:unit`** — PASS (33 tests, 5 files). `npm run typecheck` → 0.

- [ ] **Step 5: Commit**
```bash
git add src/journey/climb.ts tests/journey/climb.test.ts
git commit -m "feat: add pure climb choreography timeline with tests"
```

---

### Task 3: Layout additions — trunk spine, foliage, twigs, crown (TDD)

**Files:**
- Modify: `tests/journey/layout.test.ts` (append a describe block)
- Replace: `src/journey/layout.ts`

- [ ] **Step 1: Append to `tests/journey/layout.test.ts`** (new top-level describe; also extend the import line to `import { buildLayout, pseudoRandom, trunkPointAt } from '../../src/journey/layout';`):

```ts
describe('tree dressing layout', () => {
  const layout = buildLayout(levels);

  it('builds a 7-point trunk spine anchored at the ground and reaching the top', () => {
    expect(layout.trunkSpine).toHaveLength(7);
    expect(Math.abs(layout.trunkSpine[0].x)).toBeLessThan(0.001);
    expect(Math.abs(layout.trunkSpine[0].z)).toBeLessThan(0.001);
    expect(layout.trunkSpine[0].y).toBe(0);
    expect(layout.trunkSpine[6].y).toBeCloseTo(layout.trunkHeight);
    for (let i = 1; i < 7; i++) expect(layout.trunkSpine[i].y).toBeGreaterThan(layout.trunkSpine[i - 1].y);
  });

  it('places 4 foliage clusters per semester plus a 10-cluster crown, reveals ascending', () => {
    expect(layout.foliage).toHaveLength(8 * 4 + 10);
    for (let i = 1; i < layout.foliage.length; i++) {
      expect(layout.foliage[i].reveal).toBeGreaterThanOrEqual(layout.foliage[i - 1].reveal);
    }
    const crown = layout.foliage.slice(-10);
    for (const c of crown) expect(c.pos.y).toBeGreaterThan(layout.trunkHeight);
  });

  it('gives every limb two finite twigs', () => {
    expect(layout.twigs).toHaveLength(16);
    for (const tw of layout.twigs) {
      for (const p of [tw.start, tw.end]) {
        expect(Number.isFinite(p.x) && Number.isFinite(p.y) && Number.isFinite(p.z)).toBe(true);
      }
    }
  });

  it('trunkPointAt tapers from base to top along the spine', () => {
    expect(trunkPointAt(layout, 0).radius).toBeCloseTo(1.3);
    expect(trunkPointAt(layout, layout.trunkHeight).radius).toBeCloseTo(0.4);
    const mid = trunkPointAt(layout, layout.trunkHeight / 2);
    expect(mid.radius).toBeGreaterThan(0.4);
    expect(mid.radius).toBeLessThan(1.3);
  });
});
```

- [ ] **Step 2: `npm run test:unit`** — FAIL (trunkSpine/foliage/twigs/trunkPointAt missing).

- [ ] **Step 3: Replace `src/journey/layout.ts` entirely with:**

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

export interface FoliageSpot {
  pos: Vec3;
  scale: number;
  reveal: number;
}

export interface TwigSpot {
  start: Vec3;
  end: Vec3;
  reveal: number;
}

export interface TreeLayout {
  trunkHeight: number;
  levelY: number[];
  limbs: LimbSpot[];
  leaves: LeafSpot[];
  cameraPoints: Vec3[];
  trunkSpine: Vec3[];
  foliage: FoliageSpot[];
  twigs: TwigSpot[];
}

const LEVEL_BASE_Y = 6;
const LEVEL_GAP = 7;
const LIMB_LEN = 4.2;
const CAMERA_STEPS = 64;
const TRUNK_SEGMENTS = 6;
export const TRUNK_BASE_R = 1.3;
export const TRUNK_TOP_R = 0.4;

/** Deterministic stand-in for Math.random — same key, same value. */
export function pseudoRandom(k: number): number {
  const x = Math.sin(k * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

export function buildLayout(levels: Level[]): TreeLayout {
  if (levels.length === 0) throw new Error('buildLayout: levels must not be empty');
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
        // ×3 stride: each leaf owns a non-overlapping (k, k+1, k+2) key triple
        const k = (li * 100 + si * 50 + ci) * 3;
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

  // Organic trunk: gently S-curved centerline, anchored at ground and top.
  const trunkSpine: Vec3[] = [];
  for (let i = 0; i <= TRUNK_SEGMENTS; i++) {
    const f = i / TRUNK_SEGMENTS;
    const bend = Math.sin(f * Math.PI) * 0.7; // 0 at both ends
    trunkSpine.push({
      x: Math.sin(f * Math.PI * 1.6) * bend * 0.6,
      y: f * trunkHeight,
      z: Math.cos(f * Math.PI * 1.1) * bend * 0.4,
    });
  }

  // Decorative foliage (not clickable) around each limb's leaf cloud,
  // then a crown dome capping the trunk. Built in limb order so reveals
  // ascend and count-based reveal works.
  const foliage: FoliageSpot[] = [];
  const twigs: TwigSpot[] = [];
  limbs.forEach((limb, li2) => {
    const reveal = limb.start.y / trunkHeight;
    const limbAngle = Math.atan2(limb.end.z, limb.end.x);
    for (let f = 0; f < 4; f++) {
      const k = 5000 + li2 * 40 + f * 3;
      const a = limbAngle + (pseudoRandom(k) - 0.5) * 1.6;
      const r = 3.6 + pseudoRandom(k + 1) * 2.6;
      foliage.push({
        pos: {
          x: Math.cos(a) * r,
          y: limb.end.y + (pseudoRandom(k + 2) - 0.25) * 2.0,
          z: Math.sin(a) * r,
        },
        scale: 0.8 + pseudoRandom(k + 1) * 0.6,
        reveal,
      });
    }
    for (let w = 0; w < 2; w++) {
      const k = 7000 + li2 * 20 + w * 5;
      const a = limbAngle + (pseudoRandom(k) - 0.5) * 1.2;
      const len = 1.1 + pseudoRandom(k + 1) * 0.7;
      twigs.push({
        start: { ...limb.end },
        end: {
          x: limb.end.x + Math.cos(a) * len,
          y: limb.end.y + 0.5 + pseudoRandom(k + 2) * 0.6,
          z: limb.end.z + Math.sin(a) * len,
        },
        reveal,
      });
    }
  });

  const top = trunkSpine[trunkSpine.length - 1];
  for (let c = 0; c < 10; c++) {
    const k = 9000 + c * 7;
    const a = pseudoRandom(k) * Math.PI * 2;
    const r = 0.6 + pseudoRandom(k + 1) * 1.9;
    foliage.push({
      pos: {
        x: top.x + Math.cos(a) * r,
        y: trunkHeight + 0.4 + pseudoRandom(k + 2) * 1.8,
        z: top.z + Math.sin(a) * r,
      },
      scale: 1.6 + pseudoRandom(k + 1) * 1.0,
      reveal: 0.98,
    });
  }

  return { trunkHeight, levelY, limbs, leaves, cameraPoints, trunkSpine, foliage, twigs };
}

/** Interpolated trunk centerline point and tapered radius at a height. */
export function trunkPointAt(layout: TreeLayout, h: number): { x: number; z: number; radius: number } {
  const f = Math.min(1, Math.max(0, h / layout.trunkHeight));
  const seg = f * TRUNK_SEGMENTS;
  const i = Math.min(TRUNK_SEGMENTS - 1, Math.floor(seg));
  const u = seg - i;
  const a = layout.trunkSpine[i];
  const b = layout.trunkSpine[i + 1];
  return {
    x: a.x + (b.x - a.x) * u,
    z: a.z + (b.z - a.z) * u,
    radius: TRUNK_BASE_R + (TRUNK_TOP_R - TRUNK_BASE_R) * f,
  };
}
```

- [ ] **Step 4: `npm run test:unit`** — PASS (37 tests). `npm run typecheck` → 0.

- [ ] **Step 5: Commit**
```bash
git add src/journey/layout.ts tests/journey/layout.test.ts
git commit -m "feat: layout for organic trunk, foliage canopy, twigs and crown dome"
```

---

### Task 4: Tree + environment rendering upgrade

**Files:**
- Replace: `src/scene/tree.ts`
- Replace: `src/scene/environment.ts`
- Modify: `src/main.ts` (one constructor call)

- [ ] **Step 1: Replace `src/scene/tree.ts` entirely with:**

```ts
import * as THREE from 'three';
import { levels, theme, courseFamily, type Course } from '../data/journey';
import { buildLayout, pseudoRandom, TRUNK_BASE_R, TRUNK_TOP_R, type TreeLayout } from '../journey/layout';

export interface LeafRef {
  course: Course;
  levelIdx: number;
  semIdx: number;
}

const UP = new THREE.Vector3(0, 1, 0);
const FOLIAGE_GREENS = ['#1f7a4a', '#2a9d62'];

function makeLabel(text: string): THREE.Sprite {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 128;
  const texture = new THREE.CanvasTexture(canvas);

  const draw = (): void => {
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.font = 'bold 44px Sora, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#d8ffe9';
    ctx.shadowColor = 'rgba(60, 255, 160, 0.8)';
    ctx.shadowBlur = 16;
    ctx.fillText(text, 128, 64);
    texture.needsUpdate = true;
  };

  draw();
  // Redraw once webfonts finish loading so labels use Sora, not the fallback.
  document.fonts.ready.then(draw).catch(() => {});

  const sprite = new THREE.Sprite(
    new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false }),
  );
  sprite.scale.set(3.4, 1.7, 1);
  return sprite;
}

/** Cylinder mesh oriented from start to end (shared by limbs/twigs/trunk segments). */
function boneMesh(
  start: THREE.Vector3,
  end: THREE.Vector3,
  rBottom: number,
  rTop: number,
  mat: THREE.Material,
  radialSegments = 6,
): THREE.Mesh {
  const dir = end.clone().sub(start);
  const len = dir.length();
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(rTop, rBottom, len, radialSegments, 1), mat);
  mesh.position.copy(start).addScaledVector(dir, 0.5);
  mesh.quaternion.setFromUnitVectors(UP, dir.normalize());
  return mesh;
}

export class JourneyTree {
  readonly group = new THREE.Group();
  readonly layout: TreeLayout;
  readonly leafMesh: THREE.InstancedMesh;
  readonly leafRefs: LeafRef[] = [];
  private readonly trunkGroup = new THREE.Group();
  private readonly foliageMesh: THREE.InstancedMesh;
  private readonly foliageReveals: number[] = [];
  private readonly limbs: { mesh: THREE.Mesh; reveal: number }[] = [];
  private readonly leafTransforms: { pos: THREE.Vector3; quat: THREE.Quaternion; scale: number }[] = [];
  private spotlight: number | null = null;
  private readonly spotM = new THREE.Matrix4();
  private readonly spotS = new THREE.Vector3();

  constructor() {
    this.layout = buildLayout(levels);
    const { trunkHeight, levelY, limbs, leaves, trunkSpine, foliage, twigs } = this.layout;

    const barkMat = new THREE.MeshStandardMaterial({ color: theme.trunk, flatShading: true, roughness: 0.9 });

    // Organic trunk: stacked tapered segments along the S-curved spine.
    for (let i = 0; i < trunkSpine.length - 1; i++) {
      const a = new THREE.Vector3(trunkSpine[i].x, trunkSpine[i].y, trunkSpine[i].z);
      const b = new THREE.Vector3(trunkSpine[i + 1].x, trunkSpine[i + 1].y, trunkSpine[i + 1].z);
      const f0 = i / (trunkSpine.length - 1);
      const f1 = (i + 1) / (trunkSpine.length - 1);
      const r0 = TRUNK_BASE_R + (TRUNK_TOP_R - TRUNK_BASE_R) * f0;
      const r1 = TRUNK_BASE_R + (TRUNK_TOP_R - TRUNK_BASE_R) * f1;
      this.trunkGroup.add(boneMesh(a, b, r0 * 1.04, r1, barkMat, 8));
    }

    // Root flare around the base.
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + pseudoRandom(400 + i) * 0.5;
      const start = new THREE.Vector3(Math.cos(a) * 0.5, 0.9, Math.sin(a) * 0.5);
      const end = new THREE.Vector3(Math.cos(a) * (1.9 + pseudoRandom(410 + i) * 0.8), 0.02, Math.sin(a) * (1.9 + pseudoRandom(410 + i) * 0.8));
      this.trunkGroup.add(boneMesh(start, end, 0.42, 0.05, barkMat, 5));
    }
    this.group.add(this.trunkGroup);

    for (const limb of limbs) {
      const mesh = boneMesh(
        new THREE.Vector3(limb.start.x, limb.start.y, limb.start.z),
        new THREE.Vector3(limb.end.x, limb.end.y, limb.end.z),
        0.22,
        0.1,
        barkMat,
      );
      this.group.add(mesh);
      this.limbs.push({ mesh, reveal: limb.start.y / trunkHeight });
    }

    // Twigs share limb visibility behavior.
    for (const tw of twigs) {
      const mesh = boneMesh(
        new THREE.Vector3(tw.start.x, tw.start.y, tw.start.z),
        new THREE.Vector3(tw.end.x, tw.end.y, tw.end.z),
        0.07,
        0.02,
        barkMat,
        4,
      );
      this.group.add(mesh);
      this.limbs.push({ mesh, reveal: tw.reveal });
    }

    // Decorative foliage canopy (NOT raycast — picking targets leafMesh only).
    const foliageMat = new THREE.MeshStandardMaterial({ color: '#ffffff', flatShading: true, roughness: 0.85 });
    this.foliageMesh = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 0), foliageMat, foliage.length);
    {
      const m = new THREE.Matrix4();
      const color = new THREE.Color();
      foliage.forEach((spot, i) => {
        m.makeScale(spot.scale, spot.scale * 0.85, spot.scale).setPosition(spot.pos.x, spot.pos.y, spot.pos.z);
        this.foliageMesh.setMatrixAt(i, m);
        color.set(FOLIAGE_GREENS[Math.floor(pseudoRandom(i + 0.5) * FOLIAGE_GREENS.length)]);
        this.foliageMesh.setColorAt(i, color);
        this.foliageReveals.push(spot.reveal);
      });
    }
    if (this.foliageMesh.instanceColor) this.foliageMesh.instanceColor.needsUpdate = true;
    this.foliageMesh.computeBoundingSphere();
    this.group.add(this.foliageMesh);

    // Course leaves — clickable, slightly larger than before.
    const leafMat = new THREE.MeshStandardMaterial({ color: '#ffffff', flatShading: true, roughness: 0.55 });
    this.leafMesh = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.5, 0), leafMat, leaves.length);
    const m = new THREE.Matrix4();
    const color = new THREE.Color();
    const pos = new THREE.Vector3();
    const quat = new THREE.Quaternion();
    const scl = new THREE.Vector3();
    leaves.forEach((leaf, i) => {
      const s = 0.8 + pseudoRandom(i * 7) * 0.5;
      pos.set(leaf.pos.x, leaf.pos.y, leaf.pos.z);
      quat.setFromAxisAngle(UP, pseudoRandom(i * 7 + 3) * Math.PI * 2);
      scl.set(s, s, s);
      m.compose(pos, quat, scl);
      this.leafMesh.setMatrixAt(i, m);
      this.leafTransforms.push({ pos: pos.clone(), quat: quat.clone(), scale: s });
      const course = levels[leaf.levelIdx].semesters[leaf.semIdx].courses[leaf.courseIdx];
      this.leafMesh.setColorAt(i, color.set(theme.families[courseFamily(course.code)]));
      this.leafRefs.push({ course, levelIdx: leaf.levelIdx, semIdx: leaf.semIdx });
    });
    if (this.leafMesh.instanceColor) this.leafMesh.instanceColor.needsUpdate = true;
    // Compute the bounding sphere now, while count covers all instances —
    // computed lazily later it can be cached empty (count starts at 0), killing raycasts.
    this.leafMesh.computeBoundingSphere();
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
      // Place each label perpendicular to its level's first-semester limb so they never overlap.
      const labelAngle = i * 1.1 + Math.PI / 2;
      label.position.set(Math.cos(labelAngle) * 3, y + 0.6, Math.sin(labelAngle) * 3);
      this.group.add(label);
    });
  }

  /** p in [0,1]: trunk scales up, limbs/twigs appear, foliage and leaves reveal bottom-up. */
  setGrowth(p: number): void {
    const clamped = Math.min(1, Math.max(0, p));
    this.trunkGroup.scale.y = Math.max(0.02, clamped);
    for (const limb of this.limbs) limb.mesh.visible = clamped >= limb.reveal;

    let foliageCount = 0;
    while (foliageCount < this.foliageReveals.length && this.foliageReveals[foliageCount] <= clamped) foliageCount++;
    this.foliageMesh.count = foliageCount;

    const nextCount = Math.round(clamped * this.leafRefs.length);
    // If the spotlighted leaf is scrolling out of the visible window, reset its
    // matrix so it reappears in canonical state rather than mid-pulse.
    if (this.spotlight !== null && nextCount <= this.spotlight && this.leafMesh.count > this.spotlight) {
      this.restoreLeaf(this.spotlight);
    }
    this.leafMesh.count = nextCount;
  }

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
}
```

- [ ] **Step 2: Replace `src/scene/environment.ts` entirely with:**

```ts
import * as THREE from 'three';
import { pseudoRandom } from '../journey/layout';

export class Environment {
  readonly group = new THREE.Group();
  private readonly fireflies: THREE.Points;

  constructor(particleCount: number, height: number, lush: boolean) {
    const ground = new THREE.Mesh(
      new THREE.CircleGeometry(60, 32),
      new THREE.MeshStandardMaterial({ color: '#0c3622', roughness: 1 }),
    );
    ground.rotation.x = -Math.PI / 2;
    this.group.add(ground);

    this.group.add(new THREE.HemisphereLight('#bdf5d3', '#06281a', 2.2));
    const sun = new THREE.DirectionalLight('#eafff2', 2.2);
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
      shrub.position.set(Math.cos(a) * r, s * 0.9, Math.sin(a) * r);
      this.group.add(shrub);
    }

    // Ground life — grass tufts and tiny flowers (halved on mobile).
    const grassCount = lush ? 60 : 30;
    const grassMat = new THREE.MeshStandardMaterial({ color: '#2e8b57', flatShading: true, roughness: 1 });
    const grass = new THREE.InstancedMesh(new THREE.ConeGeometry(0.07, 0.26, 4), grassMat, grassCount);
    const gm = new THREE.Matrix4();
    for (let i = 0; i < grassCount; i++) {
      const a = pseudoRandom(i + 700) * Math.PI * 2;
      const r = 3 + pseudoRandom(i + 701) * 27;
      const s = 0.7 + pseudoRandom(i + 702) * 0.9;
      gm.makeScale(s, s, s).setPosition(Math.cos(a) * r, 0.13 * s, Math.sin(a) * r);
      grass.setMatrixAt(i, gm);
    }
    this.group.add(grass);

    const flowerCount = lush ? 20 : 10;
    const flowerMat = new THREE.MeshStandardMaterial({ color: '#f0e68c', flatShading: true, roughness: 0.7 });
    const flowers = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.08, 0), flowerMat, flowerCount);
    for (let i = 0; i < flowerCount; i++) {
      const a = pseudoRandom(i + 800) * Math.PI * 2;
      const r = 4 + pseudoRandom(i + 801) * 24;
      gm.makeScale(1, 1, 1).setPosition(Math.cos(a) * r, 0.1, Math.sin(a) * r);
      flowers.setMatrixAt(i, gm);
    }
    this.group.add(flowers);
  }

  update(t: number): void {
    this.fireflies.rotation.y = t * 0.02;
    this.fireflies.position.y = Math.sin(t * 0.6) * 0.4;
  }
}
```

- [ ] **Step 3: `src/main.ts`** — update the Environment construction to pass the new third argument:

```ts
  const env = new Environment(
    isMobile ? theme.particles.mobile : theme.particles.desktop,
    tree.layout.trunkHeight,
    !isMobile,
  );
```

- [ ] **Step 4: Verify**
```bash
npm run typecheck && npm run test:unit && npm run build
```
0 errors, 37 tests, build success.

- [ ] **Step 5: Commit**
```bash
git add src/scene/tree.ts src/scene/environment.ts src/main.ts
git commit -m "feat: organic trunk with roots, foliage canopy, crown dome, twigs, ground life"
```

---

### Task 5: Avatar + ambient wander

**Files:**
- Create: `src/scene/avatar.ts`
- Create: `src/scene/wander.ts`

No unit tests (visual/procedural animation); gate: typecheck + build, browser check at the end.

- [ ] **Step 1: Create `src/scene/avatar.ts`:**

```ts
import * as THREE from 'three';

export type AvatarPose = 'idle' | 'walk' | 'climb';

const SKIN = '#e8c39e';
const TORSO = '#2bbd88';
const LIMB = '#1d5c38';

function flat(color: string): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color, flatShading: true, roughness: 0.8 });
}

/**
 * Procedural low-poly student figure, ~1.7 units tall, pivot at the feet.
 * Movement/heading are driven externally (rigs/wander); the avatar only
 * animates its own limbs according to the current pose.
 */
export class Avatar {
  readonly group = new THREE.Group();
  private pose: AvatarPose = 'idle';
  private readonly body = new THREE.Group();
  private readonly lArm = new THREE.Group();
  private readonly rArm = new THREE.Group();
  private readonly lLeg = new THREE.Group();
  private readonly rLeg = new THREE.Group();
  private readonly torso: THREE.Mesh;

  constructor() {
    this.torso = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.2, 0.55, 6), flat(TORSO));
    this.torso.position.y = 0.88;
    this.body.add(this.torso);

    const head = new THREE.Mesh(new THREE.IcosahedronGeometry(0.15, 0), flat(SKIN));
    head.position.y = 1.32;
    this.body.add(head);

    const limb = (parent: THREE.Group, x: number, y: number, len: number, r: number): void => {
      parent.position.set(x, y, 0);
      const mesh = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 0.8, len, 5), flat(LIMB));
      mesh.position.y = -len / 2;
      parent.add(mesh);
      this.body.add(parent);
    };
    limb(this.lArm, -0.26, 1.1, 0.5, 0.05);
    limb(this.rArm, 0.26, 1.1, 0.5, 0.05);
    limb(this.lLeg, -0.1, 0.62, 0.62, 0.07);
    limb(this.rLeg, 0.1, 0.62, 0.62, 0.07);

    this.group.add(this.body);
  }

  setPose(pose: AvatarPose): void {
    this.pose = pose;
  }

  update(t: number): void {
    if (this.pose === 'walk') {
      const swing = Math.sin(t * 7);
      this.lLeg.rotation.x = swing * 0.65;
      this.rLeg.rotation.x = -swing * 0.65;
      this.lArm.rotation.x = -swing * 0.5;
      this.rArm.rotation.x = swing * 0.5;
      this.body.position.y = Math.abs(Math.cos(t * 7)) * 0.05;
      this.torso.scale.setScalar(1);
    } else if (this.pose === 'climb') {
      const reach = Math.sin(t * 5);
      this.lArm.rotation.x = -2.5 + reach * 0.45;
      this.rArm.rotation.x = -2.5 - reach * 0.45;
      this.lLeg.rotation.x = 0.5 + reach * 0.4;
      this.rLeg.rotation.x = 0.5 - reach * 0.4;
      this.body.position.y = 0;
      this.torso.scale.setScalar(1);
    } else {
      this.lLeg.rotation.x = 0;
      this.rLeg.rotation.x = 0;
      this.lArm.rotation.x = Math.sin(t * 1.5) * 0.06;
      this.rArm.rotation.x = -Math.sin(t * 1.5) * 0.06;
      this.body.position.y = 0;
      this.torso.scale.setScalar(1 + Math.sin(t * 2) * 0.015);
    }
  }
}
```

- [ ] **Step 2: Create `src/scene/wander.ts`:**

```ts
import type { Avatar } from './avatar';

const WALK_SPEED = 1.7;
const BASE_SPOT = { x: 3.4, z: 2.4 }; // where the avatar stands in journey mode

/**
 * Drives the avatar when no rig owns it: standing at the tree base in
 * journey mode, wandering the grove floor in explore mode. Runtime
 * randomness is fine here (not part of the deterministic layout).
 */
export class AmbientWander {
  private target = { x: BASE_SPOT.x, z: BASE_SPOT.z };
  private idleUntil = 0;

  constructor(private readonly avatar: Avatar) {
    avatar.group.position.set(BASE_SPOT.x, 0, BASE_SPOT.z);
    avatar.group.lookAt(0, 1, 0);
  }

  /** Call every frame in journey/explore modes (NOT in climb — ClimbRig owns the avatar). */
  update(t: number, dt: number, mode: 'journey' | 'explore'): void {
    const g = this.avatar.group;

    if (mode === 'journey') {
      // Walk home if displaced (e.g., after a climb), otherwise idle facing the tree.
      this.target = { x: BASE_SPOT.x, z: BASE_SPOT.z };
    } else if (t >= this.idleUntil && this.atTarget()) {
      const a = Math.random() * Math.PI * 2;
      const r = 6 + Math.random() * 14;
      this.target = { x: Math.cos(a) * r, z: Math.sin(a) * r };
    }

    const dx = this.target.x - g.position.x;
    const dz = this.target.z - g.position.z;
    const dist = Math.hypot(dx, dz);
    if (dist > 0.15) {
      const step = Math.min(dist, WALK_SPEED * dt);
      g.position.x += (dx / dist) * step;
      g.position.z += (dz / dist) * step;
      g.rotation.y = Math.atan2(dx, dz);
      this.avatar.setPose('walk');
    } else {
      this.avatar.setPose('idle');
      if (mode === 'journey') g.rotation.y = Math.atan2(-g.position.x, -g.position.z);
      else if (this.idleUntil < t) this.idleUntil = t + 2 + Math.random() * 2;
    }
    g.position.y = 0;
    this.avatar.update(t);
  }

  private atTarget(): boolean {
    const g = this.avatar.group;
    return Math.hypot(this.target.x - g.position.x, this.target.z - g.position.z) <= 0.15;
  }
}
```

- [ ] **Step 3: Verify** — `npm run typecheck` → 0; `npm run test:unit` → 37; `npm run build` → success (modules not yet imported by main; that's fine).

- [ ] **Step 4: Commit**
```bash
git add src/scene/avatar.ts src/scene/wander.ts
git commit -m "feat: procedural low-poly avatar with idle/walk/climb poses and ambient wander"
```

---

### Task 6: ClimbRig + mode rename + main wiring (Walk retired)

**Files:**
- Create: `src/rigs/ClimbRig.ts`
- Delete: `src/rigs/WalkRig.ts`
- Modify: `src/rigs/types.ts`
- Modify: `src/ui/overlay.ts` (2 small edits)
- Modify: `src/ui/journey.css` (remove joystick block)
- Replace: `src/main.ts`

- [ ] **Step 1: `src/rigs/types.ts`** — change the Mode line to:

```ts
export type Mode = 'journey' | 'explore' | 'climb';
```

- [ ] **Step 2: Create `src/rigs/ClimbRig.ts`:**

```ts
import * as THREE from 'three';
import { climbStateAt } from '../journey/climb';
import { trunkPointAt, type TreeLayout } from '../journey/layout';
import type { Avatar } from '../scene/avatar';
import type { CameraRig } from './types';

const LOOK_SENS = 0.005;
const PITCH_LIMIT = Math.PI * 0.35;
const CAM_DIST = 5.2;
const CLIMB_FACE_ANGLE = 0.9; // which side of the trunk the avatar climbs
const SPAWN = { x: 9, z: 5 };

/**
 * Cinematic auto-climb: drives the avatar (approach walk → trunk ascent with
 * level pauses → crown) while the camera follows; pointer-drag swings the
 * viewpoint around the avatar. No movement controls.
 */
export class ClimbRig implements CameraRig {
  private elapsed = 0;
  private yaw = 0.7;
  private pitch = 0.18;
  private lookId: number | null = null;
  private last = { x: 0, y: 0 };
  private detach: (() => void)[] = [];
  private readonly target = new THREE.Vector3();
  private readonly desired = new THREE.Vector3();

  constructor(
    private readonly dom: HTMLElement,
    private readonly avatar: Avatar,
    private readonly layout: TreeLayout,
  ) {}

  enter(): void {
    this.disposeListeners();
    this.elapsed = 0;

    const down = (e: PointerEvent): void => {
      if (this.lookId !== null) return;
      this.dom.setPointerCapture(e.pointerId);
      this.lookId = e.pointerId;
      this.last = { x: e.clientX, y: e.clientY };
    };
    const move = (e: PointerEvent): void => {
      if (e.pointerId !== this.lookId) return;
      this.yaw -= (e.clientX - this.last.x) * LOOK_SENS;
      this.pitch = Math.max(
        -PITCH_LIMIT,
        Math.min(PITCH_LIMIT, this.pitch + (e.clientY - this.last.y) * LOOK_SENS),
      );
      this.last = { x: e.clientX, y: e.clientY };
    };
    const up = (e: PointerEvent): void => {
      if (e.pointerId === this.lookId) this.lookId = null;
    };
    this.dom.addEventListener('pointerdown', down);
    this.dom.addEventListener('pointermove', move);
    this.dom.addEventListener('pointerup', up);
    this.dom.addEventListener('pointercancel', up);
    this.detach = [
      () => this.dom.removeEventListener('pointerdown', down),
      () => this.dom.removeEventListener('pointermove', move),
      () => this.dom.removeEventListener('pointerup', up),
      () => this.dom.removeEventListener('pointercancel', up),
    ];
  }

  update(camera: THREE.PerspectiveCamera, dt: number): void {
    this.elapsed += dt;
    const s = climbStateAt(this.elapsed, this.layout.levelY, this.layout.trunkHeight);
    const g = this.avatar.group;

    if (s.phase === 'approach') {
      const base = trunkPointAt(this.layout, 0);
      const contactX = base.x + Math.cos(CLIMB_FACE_ANGLE) * (base.radius + 0.25);
      const contactZ = base.z + Math.sin(CLIMB_FACE_ANGLE) * (base.radius + 0.25);
      const ease = s.approachT * s.approachT * (3 - 2 * s.approachT);
      g.position.set(
        SPAWN.x + (contactX - SPAWN.x) * ease,
        0,
        SPAWN.z + (contactZ - SPAWN.z) * ease,
      );
      g.rotation.y = Math.atan2(contactX - SPAWN.x, contactZ - SPAWN.z);
      this.avatar.setPose('walk');
    } else if (s.phase === 'climb' || s.phase === 'pause') {
      const p = trunkPointAt(this.layout, s.height);
      const a = CLIMB_FACE_ANGLE + s.height * 0.12; // slight spiral
      g.position.set(p.x + Math.cos(a) * (p.radius + 0.22), s.height, p.z + Math.sin(a) * (p.radius + 0.22));
      g.rotation.y = Math.atan2(p.x - g.position.x, p.z - g.position.z); // face the trunk
      this.avatar.setPose(s.phase === 'pause' ? 'idle' : 'climb');
    } else {
      const top = trunkPointAt(this.layout, this.layout.trunkHeight);
      g.position.set(top.x, this.layout.trunkHeight + 0.1, top.z);
      g.rotation.y += dt * 0.4; // slow victorious turn in the crown
      this.avatar.setPose('idle');
    }
    this.avatar.update(this.elapsed);

    // Follow camera: orbit offset around a point just above the avatar.
    this.target.copy(g.position).add(new THREE.Vector3(0, 1.1, 0));
    const cp = Math.cos(this.pitch);
    this.desired.set(
      this.target.x + Math.sin(this.yaw) * cp * CAM_DIST,
      this.target.y + Math.sin(this.pitch) * CAM_DIST + 0.6,
      this.target.z + Math.cos(this.yaw) * cp * CAM_DIST,
    );
    camera.position.lerp(this.desired, 1 - Math.exp(-4 * dt));
    camera.lookAt(this.target);
  }

  dispose(): void {
    this.disposeListeners();
    this.lookId = null;
  }

  private disposeListeners(): void {
    this.detach.forEach((d) => d());
    this.detach = [];
  }
}
```

- [ ] **Step 3: Delete the old rig and joystick CSS**

```bash
git rm src/rigs/WalkRig.ts
```

In `src/ui/journey.css`, delete the entire block from the comment
`/* ── Walk-mode virtual joystick ────────────────────────────────── */`
through the end of the `.joystick-nub { ... }` rule.

- [ ] **Step 4: `src/ui/overlay.ts`** — two edits:

(a) Mode button: change `<button class="mode-btn" data-mode="walk">Walk</button>` to
`<button class="mode-btn" data-mode="climb">Climb</button>`

(b) HUD label: replace the walk branch in `update()`:

```ts
      if (mode === 'climb') {
        label.textContent = 'Watch the climb — drag to swing the camera';
      } else if (mode === 'explore') {
```

- [ ] **Step 5: Replace `src/main.ts` entirely with:**

```ts
import './ui/journey.css';
import * as THREE from 'three';
import { theme, levels } from './data/journey';
import { chapterAt, leafIndexOf } from './journey/chapters';
import { JourneyTree } from './scene/tree';
import { Environment } from './scene/environment';
import { Avatar } from './scene/avatar';
import { AmbientWander } from './scene/wander';
import { ScrollRig } from './rigs/ScrollRig';
import { OrbitRig } from './rigs/OrbitRig';
import { ClimbRig } from './rigs/ClimbRig';
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
  const isMobile = window.matchMedia('(pointer: coarse)').matches;

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, isMobile ? 1.75 : 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.domElement.classList.add('webgl');
  app.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(theme.fog.color, theme.fog.density);

  const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 200);

  const tree = new JourneyTree();
  scene.add(tree.group);

  const env = new Environment(
    isMobile ? theme.particles.mobile : theme.particles.desktop,
    tree.layout.trunkHeight,
    !isMobile,
  );
  scene.add(env.group);

  const avatar = new Avatar();
  scene.add(avatar.group);
  const wander = new AmbientWander(avatar);

  const scrollRig = new ScrollRig(tree.layout.cameraPoints);
  const orbitRig = new OrbitRig(renderer.domElement, tree.layout.trunkHeight);
  const climbRig = new ClimbRig(renderer.domElement, avatar, tree.layout);
  let mode: Mode = 'journey';
  let rig: CameraRig = scrollRig;
  const p0 = tree.layout.cameraPoints[0];
  camera.position.set(p0.x, p0.y, p0.z);
  rig.enter(camera);

  function setMode(next: Mode): void {
    if (next === mode) return;
    rig.dispose();
    mode = next;
    rig = next === 'explore' ? orbitRig : next === 'climb' ? climbRig : scrollRig;
    rig.enter(camera);
    // Non-journey modes lock page scroll (class also used by explore).
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

    // Always derived from scroll progress (not the active rig) so the guided
    // position is preserved when the user dips into explore/climb and back.
    const pos = chapterAt(scrollRig.progress, levels);
    const growth =
      mode !== 'journey' ? 1 : Math.min(1, Math.max(0, (scrollRig.progress - 0.04) / 0.7));
    tree.setGrowth(growth);
    tree.setSpotlight(
      mode === 'journey' && pos.phase === 'course'
        ? leafIndexOf(levels, pos.levelIdx, pos.semIdx, pos.courseIdx)
        : null,
    );
    if (mode !== 'climb') wander.update(t, dt, mode);
    tree.update(t);
    env.update(t);
    ui.update(scrollRig.progress, mode, pos);
    renderer.render(scene, camera);
  });
}
```

- [ ] **Step 6: Verify**
```bash
npm run typecheck && npm run test:unit && npm test && npm run lint && npm run build
```
All pass (37 vitest + 25 jest). Quick dev-server curl check, then kill vite.

- [ ] **Step 7: Commit**
```bash
git add -A
git commit -m "feat: cinematic climb mode with avatar; retire WASD walk"
```

---

### Task 7: Mobile overhaul

**Files:**
- Modify: `src/ui/journey.css` (append mobile layer + touch hygiene)

- [ ] **Step 1: Append to `src/ui/journey.css`:**

```css
/* ── Touch hygiene (all sizes) ─────────────────────────────────── */

.hud-top,
.hud-bottom,
.beat,
.finale,
.chapter-panel,
.leaf-hint {
  user-select: none;
  -webkit-user-select: none;
}

.mode-btn,
.card-close {
  -webkit-tap-highlight-color: transparent;
}

.mode-btn {
  min-height: 44px;
}

.card-close {
  min-width: 44px;
  min-height: 44px;
  display: grid;
  place-content: center;
}

.hud-top {
  padding-top: calc(1rem + env(safe-area-inset-top));
}

.hud-bottom {
  padding-bottom: calc(1.2rem + env(safe-area-inset-bottom));
}

/* ── Phone layout (≤640px) ─────────────────────────────────────── */

@media (max-width: 640px) {
  .brand {
    font-size: 0.85rem;
  }

  .modes {
    gap: 0.3rem;
  }

  .mode-btn {
    padding: 0.4rem 0.7rem;
    font-size: 0.75rem;
  }

  /* Chapter panel becomes a slim top-center strip under the header */
  .chapter-panel {
    top: calc(3.9rem + env(safe-area-inset-top));
    left: 50%;
    transform: translateX(-50%);
    max-width: 92vw;
    width: max-content;
    padding: 0.55rem 1rem;
    display: flex;
    align-items: baseline;
    gap: 0.6rem;
    white-space: nowrap;
  }

  .chapter-panel.hidden {
    transform: translateX(-50%) translateY(-10px);
  }

  .chapter-panel.compact {
    transform: translateX(-50%) scale(0.9);
    transform-origin: top center;
  }

  .chapter-panel .chapter-level {
    font-size: 1rem;
  }

  .chapter-panel .chapter-sem {
    font-size: 0.62rem;
    margin-top: 0;
  }

  .chapter-panel .chapter-meta {
    font-size: 0.62rem;
    margin-top: 0;
    color: #a8e6c5;
  }

  /* Course card becomes a bottom sheet above the HUD */
  .course-card {
    top: auto;
    right: 0;
    left: 0;
    bottom: 0;
    transform: none;
    width: 100vw;
    max-width: none;
    border-radius: 20px 20px 0 0;
    border-left: none;
    border-right: none;
    border-bottom: none;
    padding: 1.1rem 1.3rem calc(4.6rem + env(safe-area-inset-bottom));
    transition: opacity 0.25s, transform 0.3s;
  }

  .course-card.hidden {
    opacity: 0;
    transform: translateY(100%);
  }

  .leaf-hint {
    font-size: 0.74rem;
    max-width: 92vw;
    white-space: nowrap;
  }

  .legend {
    gap: 0.55rem;
    font-size: 0.6rem;
  }

  .beat p {
    font-size: 0.78rem;
  }

  .finale-stats {
    font-size: 0.9rem;
  }

  .finale-actions {
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
  }
}
```

- [ ] **Step 2: Verify** — `npm run lint && npm run build` pass. (Visual mobile pass happens in Task 8 via the controller's 390×844 browser harness.)

- [ ] **Step 3: Commit**
```bash
git add src/ui/journey.css
git commit -m "feat: mobile overhaul — bottom-sheet card, chapter strip, safe areas, touch targets"
```

---

### Task 8: Final verification sweep

- [ ] **Step 1: Full gates**
```bash
npm run lint && npm test && npm run test:unit && npm run typecheck && npm run build
```
Expected: 25 jest + 37 vitest, all exit 0.

- [ ] **Step 2: Browser verification (controller runs the Playwright harness):** desktop 1280×800 — upgraded tree (curved trunk, roots, foliage, crown dome — no more bare pillar top), avatar idle at base in journey, explore wander, full climb cinematic (approach → 4 pauses → crown) with drag-orbit, chapters/ticker regression, calculator single mint theme + pressed buttons + favicon; mobile 390×844 — chapter strip, bottom-sheet card, tap targets, climb on touch. Zero console errors.

- [ ] **Step 3: Repo hygiene** — `git status --short` clean.

Merge/deploy decision via superpowers:finishing-a-development-branch (NOT part of this plan).
