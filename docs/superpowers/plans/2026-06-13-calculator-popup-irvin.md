# Calculator Popup + Clickable Irvin Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the Calculator button open an in-page frosted-glass popup (real calculator via iframe) over the live grove with Irvin auto-wandering behind it, make Irvin clickable (wave + speech bubble), and delete the calculator's dark-mode toggle.

**Architecture:** The popup is an `<iframe src="./calculator/?embed=1">` inside a glass card in the overlay — the tested calculator and mint theme are reused, not rebuilt. Opening it drops the scene into explore + follow so the avatar roams behind the translucent card. Clicking the avatar triggers an Avatar `wave()` override and a DOM bubble anchored to his projected head position.

**Tech Stack:** Existing Vite 8 + TypeScript + Three.js 0.184. No new files in src/ (all edits to existing modules), no new deps.

**Spec:** `docs/superpowers/specs/2026-06-13-calculator-popup-irvin-design.md`

**Branch:** create `feat/calc-popup-irvin` from `main` before Task 1. NOTE: the working tree has an uncommitted deletion of `docs/presentation.html` plus untracked `.agents/`, `.claude/`, `skills-lock.json` (owner's files) — never stage them, never use `git add -A`; stage only each task's named files.

---

## File map

| Path | Action | Responsibility |
|---|---|---|
| `public/calculator/index.html` | Modify | Delete toggle button; add embed-class script |
| `public/calculator/assets/css/journey-skin.css` | Modify | `body.embed` rules (transparent, chrome hidden) |
| `vite.config.ts` | Modify | Calc dev middleware matches pathname (so `?embed=1` works) |
| `src/scene/avatar.ts` | Modify | `wave(now)` one-shot override |
| `src/ui/overlay.ts` | Replace | calc-modal + iframe + close + Esc; Irvin bubble; `onCalc`; calc buttons open popup; `setIrvinBubble` |
| `src/ui/journey.css` | Modify | `.calc-modal` glass card + `.irvin-bubble`; pointer-events |
| `src/main.ts` | Replace | Wire `onCalc`; avatar raycast → wave + bubble; project bubble each frame |

---

### Task 0: Branch

- [ ] **Step 1:**
```bash
git checkout -b feat/calc-popup-irvin
npm test && npm run test:unit   # baseline 25 + 37 pass
```

---

### Task 1: Calculator page — remove toggle, embed mode, dev middleware

**Files:**
- Modify: `public/calculator/index.html`
- Modify: `public/calculator/assets/css/journey-skin.css`
- Modify: `vite.config.ts`

- [ ] **Step 1: `public/calculator/index.html` — delete the toggle button.** Remove these four lines (21–25):
```html
  <!-- Theme Toggle Button -->
  <button class="btn btn-outline-secondary theme-toggle-btn" id="theme-toggle"
    title="Toggle dark/light mode">
    🌙
  </button>
```

- [ ] **Step 2: `public/calculator/index.html` — add the embed-class script.** Immediately after the `<body>` opening tag, insert as the first child:
```html
  <script>if (new URLSearchParams(location.search).has('embed')) document.body.classList.add('embed');</script>
```

- [ ] **Step 3: `public/calculator/assets/css/journey-skin.css` — append the embed block at the end of the file:**
```css
/* ── Embedded mode (calculator shown inside the journey popup) ──── */

body.embed {
  background: transparent !important;
}

body.embed .container {
  padding: 0 !important;
}

body.embed .title-panel,
body.embed a[title='Back to the 3D journey'],
body.embed #scroll-to-calculator,
body.embed .theme-toggle-btn {
  display: none !important;
}
```

- [ ] **Step 4: `vite.config.ts` — match the calculator route by pathname** so `./calculator/?embed=1` still serves the calculator (the old exact-string check broke on the query). Replace the `configureServer` body:
```ts
      configureServer(server) {
        server.middlewares.use((req, _res, next) => {
          const path = (req.url || '').split('?')[0];
          if (path === '/calculator' || path === '/calculator/') {
            req.url = '/calculator/index.html';
          }
          next();
        });
      },
```

- [ ] **Step 5: Verify**
```bash
npm test            # 25 jest pass — calculator.js untouched
npm run build
grep -c "theme-toggle" dist/calculator/index.html   # 0
grep -c "embed" dist/calculator/index.html           # >=1
```

- [ ] **Step 6: Commit**
```bash
git add public/calculator/index.html public/calculator/assets/css/journey-skin.css vite.config.ts
git commit -m "feat: calculator embed mode for popup; remove dark-mode toggle"
```

---

### Task 2: Avatar `wave()` one-shot

**Files:**
- Modify: `src/scene/avatar.ts`

- [ ] **Step 1: Add the wave field + method.** After the line `private readonly torso: THREE.Mesh;` add a new field:
```ts
  private waveUntil = 0;
```
And after the `setPose(pose: AvatarPose): void { this.pose = pose; }` method, add:
```ts
  /** One-shot wave that overrides the current pose for ~1.8s from `now`. */
  wave(now: number): void {
    this.waveUntil = now + 1.8;
  }
```

- [ ] **Step 2: Make `update(t)` honor the wave first.** Insert this block as the FIRST statement inside `update(t: number): void {` (before the existing `if (this.pose === 'walk')`):
```ts
    if (t < this.waveUntil) {
      this.lLeg.rotation.x = 0;
      this.rLeg.rotation.x = 0;
      this.lArm.rotation.x = 0;
      this.lArm.rotation.z = 0;
      this.rArm.rotation.x = -2.6; // right arm raised
      this.rArm.rotation.z = -0.3 + Math.sin(t * 10) * 0.45; // waving
      this.body.position.y = 0;
      this.torso.scale.setScalar(1);
      return;
    }
```

- [ ] **Step 3: Verify** — `npm run typecheck` 0; `npm run test:unit` 37; `npm run build` success.

- [ ] **Step 4: Commit**
```bash
git add src/scene/avatar.ts
git commit -m "feat: avatar wave() one-shot pose for the clickable Irvin greeting"
```

---

### Task 3: Overlay — calc popup, Irvin bubble, calc buttons

**Files:**
- Replace: `src/ui/overlay.ts`
- Modify: `src/ui/journey.css`

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
  setIrvinBubble(screen: { x: number; y: number } | null): void;
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
  onFollow: (follow: boolean) => void,
  onCalc: (open: boolean) => void,
): OverlayHandles {
  root.innerHTML = `
    <header class="hud-top">
      <div class="brand">🌳 Veritas Journey</div>
      <nav class="modes">
        <button class="mode-btn active" data-mode="journey">Journey</button>
        <button class="mode-btn" data-mode="explore">Explore</button>
        <button class="mode-btn" data-mode="climb">Climb</button>
        <button class="mode-btn calc-link" data-calc="1">Calculator</button>
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
      <button class="follow-chip hidden" aria-pressed="false">👁 Follow</button>
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
        <button class="mode-btn calc-link" data-calc="1">Open the calculator</button>
      </div>
    </section>
    <aside class="calc-modal hidden">
      <div class="calc-modal-head">
        <span class="calc-modal-title">🧮 SEN Calculator</span>
        <button class="calc-modal-close" aria-label="Close calculator">×</button>
      </div>
      <iframe class="calc-frame" title="VUNA Calculator"></iframe>
    </aside>
    <div class="irvin-bubble hidden">Hi, I'm Irvin 👋 · VUG/SEN/22/8386</div>`;

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
  const followChip = root.querySelector<HTMLButtonElement>('.follow-chip')!;
  const calcModal = root.querySelector<HTMLElement>('.calc-modal')!;
  const calcFrame = root.querySelector<HTMLIFrameElement>('.calc-frame')!;
  const irvinBubble = root.querySelector<HTMLElement>('.irvin-bubble')!;

  let following = false;
  let calcOpen = false;

  function setFollow(on: boolean): void {
    following = on;
    followChip.classList.toggle('active', on);
    followChip.setAttribute('aria-pressed', String(on));
    onFollow(on);
  }

  followChip.addEventListener('click', () => setFollow(!following));

  function openCalc(): void {
    if (calcOpen) return;
    if (!calcFrame.src) calcFrame.src = './calculator/?embed=1'; // lazy first load
    calcOpen = true;
    calcModal.classList.remove('hidden');
    onCalc(true); // main → explore mode
    setFollow(true); // camera tracks the roaming Irvin behind the glass
  }

  function closeCalc(): void {
    if (!calcOpen) return;
    calcOpen = false;
    calcModal.classList.add('hidden');
    setFollow(false);
    onCalc(false); // main → journey mode
  }

  for (const b of root.querySelectorAll<HTMLElement>('[data-calc]')) {
    b.addEventListener('click', openCalc);
  }
  calcModal.querySelector('.calc-modal-close')!.addEventListener('click', closeCalc);
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && calcOpen) closeCalc();
  });

  let pinned = false; // a clicked leaf overrides the auto ticker until closed
  let shownChapter = ''; // "levelIdx-semIdx" currently in the panel
  let tickerKey = ''; // course currently in the ticker
  let leafHintDone = false;

  for (const btn of modeButtons) {
    btn.addEventListener('click', () => {
      // A header mode button dismisses the calc popup (visual only) so the
      // chosen mode isn't hidden behind the card.
      if (calcOpen) {
        calcOpen = false;
        calcModal.classList.add('hidden');
        setFollow(false);
      }
      onMode(btn.dataset.mode as Mode);
    });
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

      if (!journey) {
        // Reset ticker state so re-entering journey re-renders the current
        // course card and re-announces the chapter.
        tickerKey = '';
        shownChapter = '';
        // Hide a lingering auto-ticker card (user-pinned cards stay).
        if (!pinned) card.classList.add('hidden');
      }

      beats.forEach((el, i) => {
        const start = i * 0.06;
        el.classList.toggle('visible', journey && progress >= start && progress < start + 0.06);
      });

      fill.style.transform = `scaleX(${progress})`;
      hint.classList.toggle('hidden', !journey || progress > 0.03);
      finale.classList.toggle('hidden', !journey || pos.phase !== 'finale');
      for (const btn of modeButtons) btn.classList.toggle('active', btn.dataset.mode === mode);
      followChip.classList.toggle('hidden', mode !== 'explore');
      if (mode !== 'explore' && following) setFollow(false);

      if (mode === 'climb') {
        label.textContent = 'Watch the climb — drag to swing the camera';
      } else if (mode === 'explore') {
        label.textContent = following
          ? 'Following — drag to orbit'
          : 'Free explore — drag, zoom, click a leaf';
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
      // Never combine .compact with .hidden — .compact's opacity would win the cascade.
      chapterPanel.classList.toggle('compact', inClimb && pos.phase === 'course');
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

    setIrvinBubble(screen: { x: number; y: number } | null): void {
      if (!screen) {
        irvinBubble.classList.add('hidden');
        return;
      }
      irvinBubble.style.left = `${screen.x}px`;
      irvinBubble.style.top = `${screen.y}px`;
      irvinBubble.classList.remove('hidden');
    },
  };
}
```

- [ ] **Step 2: `src/ui/journey.css` — add `.calc-modal` to the pointer-events re-enable group.** Find the rule:
```css
.modes,
.course-card,
.follow-chip,
.finale:not(.hidden) .finale-actions {
  pointer-events: auto;
}
```
and add `.calc-modal,` as a new line in that selector list (e.g. above `.course-card,`).

- [ ] **Step 3: `src/ui/journey.css` — append the popup + bubble styles at the end of the file:**
```css
/* ── Calculator popup (glass side-card) ────────────────────────── */

.calc-modal {
  position: fixed;
  top: 50%;
  right: 1.6rem;
  transform: translateY(-50%);
  width: 380px;
  max-width: calc(100vw - 3.2rem);
  height: min(560px, 82vh);
  display: flex;
  flex-direction: column;
  background: rgba(8, 42, 26, 0.55);
  border: 1px solid rgba(150, 255, 190, 0.3);
  border-radius: 22px;
  box-shadow: 0 24px 60px rgba(0, 0, 0, 0.45);
  backdrop-filter: blur(16px);
  overflow: hidden;
  z-index: 8;
  transition: opacity 0.3s, transform 0.3s;
}

.calc-modal.hidden {
  opacity: 0;
  transform: translateY(-50%) translateX(24px);
  pointer-events: none;
}

.calc-modal-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.7rem 1rem;
  font: 700 0.9rem 'Sora', sans-serif;
  color: #d8ffe9;
  border-bottom: 1px solid rgba(150, 255, 190, 0.18);
}

.calc-modal-close {
  background: none;
  border: none;
  color: #a8e6c5;
  font-size: 1.4rem;
  line-height: 1;
  cursor: pointer;
  min-width: 44px;
  min-height: 44px;
}

.calc-frame {
  flex: 1;
  width: 100%;
  border: 0;
  background: transparent;
}

/* ── Irvin speech bubble ───────────────────────────────────────── */

.irvin-bubble {
  position: fixed;
  transform: translate(-50%, -120%);
  padding: 0.45rem 0.85rem;
  background: rgba(6, 40, 24, 0.85);
  border: 1px solid rgba(150, 255, 190, 0.35);
  border-radius: 999px;
  font: 600 0.8rem 'Sora', sans-serif;
  color: #d8ffe9;
  white-space: nowrap;
  pointer-events: none;
  z-index: 7;
  transition: opacity 0.3s;
}

.irvin-bubble.hidden {
  opacity: 0;
}

@media (max-width: 640px) {
  .calc-modal {
    top: auto;
    bottom: 0;
    right: 0;
    left: 0;
    transform: none;
    width: 100vw;
    max-width: none;
    height: 60vh;
    border-radius: 22px 22px 0 0;
    border-left: none;
    border-right: none;
    border-bottom: none;
  }
  .calc-modal.hidden {
    transform: translateY(100%);
  }
}
```

- [ ] **Step 4: Verify** — `npm run typecheck` 0 (NOTE: `main.ts` still calls `createOverlay` with 4 args, so typecheck will FAIL here on arg count — that is expected and fixed in Task 4; if you want a green checkpoint, run `npm run test:unit` (37, unaffected) and `npm run lint`, and defer typecheck/build to Task 4). Commit regardless.

- [ ] **Step 5: Commit**
```bash
git add src/ui/overlay.ts src/ui/journey.css
git commit -m "feat: calculator popup card + Irvin speech bubble in the overlay"
```

---

### Task 4: main.ts wiring (onCalc, avatar click, bubble projection)

**Files:**
- Replace: `src/main.ts`

- [ ] **Step 1: Replace `src/main.ts` entirely with:**

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

  const clock = new THREE.Clock();
  let bubbleUntil = 0;
  const proj = new THREE.Vector3();

  function setMode(next: Mode): void {
    if (next === mode) return;
    rig.dispose();
    mode = next;
    rig = next === 'explore' ? orbitRig : next === 'climb' ? climbRig : scrollRig;
    rig.enter(camera);
    // Non-journey modes lock page scroll (class also used by explore).
    document.body.classList.toggle('mode-explore', next !== 'journey');
  }

  function onCalc(open: boolean): void {
    // Opening the calculator drops into the ambient explore view (Irvin roams
    // behind the glass card); closing returns to the guided journey.
    setMode(open ? 'explore' : 'journey');
  }

  const ui = createOverlay(
    overlayRoot,
    setMode,
    isMobile,
    (follow) => orbitRig.setFollow(follow ? () => avatar.group.position : null),
    onCalc,
  );

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
    const avatarHit = raycaster.intersectObject(avatar.group, true)[0];
    const leafHit = raycaster.intersectObject(tree.leafMesh)[0];
    if (avatarHit && (!leafHit || avatarHit.distance < leafHit.distance)) {
      avatar.wave(clock.elapsedTime);
      bubbleUntil = clock.elapsedTime + 3;
    } else if (leafHit?.instanceId !== undefined) {
      ui.showCourse(tree.leafRefs[leafHit.instanceId]);
    } else {
      ui.hideCourse();
    }
  });

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

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

    // Irvin speech bubble follows his projected head while active.
    if (t < bubbleUntil) {
      proj.set(avatar.group.position.x, avatar.group.position.y + 1.6, avatar.group.position.z);
      proj.project(camera);
      ui.setIrvinBubble(
        proj.z < 1
          ? { x: (proj.x * 0.5 + 0.5) * window.innerWidth, y: (-proj.y * 0.5 + 0.5) * window.innerHeight }
          : null,
      );
    } else {
      ui.setIrvinBubble(null);
    }

    renderer.render(scene, camera);
  });
}
```

- [ ] **Step 2: Verify**
```bash
npm run typecheck && npm run test:unit && npm test && npm run lint && npm run build
```
All pass (37 vitest + 25 jest). Then a quick dev smoke:
```bash
npm run dev &  # background
sleep 4
curl -s -o /dev/null -w "journey %{http_code}\n" http://localhost:5173/
curl -s "http://localhost:5173/calculator/?embed=1" | grep -c "SOFTWARE ENGINEERING CALCULATOR"   # 1 (middleware serves calc despite the query)
pkill -f vite
```

- [ ] **Step 3: Commit**
```bash
git add src/main.ts
git commit -m "feat: wire calc popup (explore+follow) and clickable-Irvin wave + bubble"
```

---

### Task 5: Final verification

- [ ] **Step 1: Full gates**
```bash
npm run lint && npm test && npm run test:unit && npm run typecheck && npm run build
```
Expected: 25 jest + 37 vitest, all exit 0.

- [ ] **Step 2: Browser verification (controller runs the Playwright harness):**
  - Click header **Calculator** → glass card slides in on the right; the grove + a wandering Irvin remain live behind/around it; the calculator inside computes (e.g. 7×8=56); ✕ and Esc close it and return to journey.
  - The card is translucent (scene visible through it); on a 390×844 viewport it is a bottom sheet.
  - Click **Irvin** in the scene → he waves and the "Hi, I'm Irvin 👋" bubble appears over his head, then fades (~3s).
  - The standalone `/calculator/` page has no dark-mode toggle; `/calculator/?embed=1` renders transparent (no title panel / back-link).
  - Journey/explore/climb regression intact; zero console errors.

- [ ] **Step 3: Repo hygiene** — `git status --short` shows only the owner's pre-existing untracked/deleted items, nothing stray.

Merge/deploy decision via superpowers:finishing-a-development-branch (NOT part of this plan).
