# Ambience Round Implementation Plan — Day/Night, Photo, Sound

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a day/night toggle (smooth morph to deep-indigo night with stars + bloomed fireflies), a photo button (downloads a clean PNG of the 3D scene), and WebAudio-synthesized sound (ambient pad + card chime + climb rustle, mute toggle) — three independent ambience features on the existing scene/overlay.

**Architecture:** Three isolated modules — `src/scene/sky.ts` (lerps lights/fog/fireflies/CSS-gradient/stars between day & night palettes in `theme.sky`), `src/audio/sound.ts` (one lazy AudioContext, synthesized pad/chime/rustle behind a master gain), `src/ui/photo.ts` (captures the WebGL canvas via `toBlob`). The overlay grows three icon buttons; `main.ts` constructs the controllers, wires the buttons, advances the sky lerp, and fires chime/rustle.

**Tech Stack:** Existing Vite 8 + TypeScript + Three.js + Vitest + Jest + Web Audio API (built-in). No new deps, no asset files.

**Spec:** `docs/superpowers/specs/2026-06-13-ambience-daynight-photo-sound-design.md`

**Branch:** create `feat/ambience-daynight-photo-sound` from `main` before Task 1. Untracked `.agents/`, `.claude/`, `skills-lock.json` are the owner's — never stage them, never `git add -A`; stage only each task's named files.

---

## File map

| Path | Action | Responsibility |
|---|---|---|
| `src/audio/notes.ts` | Create | Pure `noteToFreq()` |
| `src/ui/photo.ts` | Create | Pure `photoFilename()` + `capturePhoto()` |
| `tests/journey/ambience.test.ts` | Create | Vitest for the two pure fns |
| `src/data/journey.ts` | Modify | `theme.sky` day/night palettes |
| `src/scene/environment.ts` | Modify | Expose `hemi`, `sun`, `fireflyMaterial` |
| `src/scene/sky.ts` | Create | Day/night controller + star field |
| `src/audio/sound.ts` | Create | WebAudio pad/chime/rustle + mute |
| `src/ui/overlay.ts` | Modify | 3 icon buttons + ambience callbacks + `flashSaved` |
| `src/ui/journey.css` | Modify | `.icon-btn`, `.photo-toast` styles |
| `src/main.ts` | Replace | Construct + wire Sky/Sound/photo; sky.update; chime; rustle |

---

### Task 0: Branch

- [ ] **Step 1:**
```bash
git checkout -b feat/ambience-daynight-photo-sound
npm test && npm run test:unit   # baseline 25 + 59 pass
```

---

### Task 1: Pure helpers (`notes.ts`, `photo.ts`) — TDD

**Files:**
- Test: `tests/journey/ambience.test.ts`
- Create: `src/audio/notes.ts`
- Create: `src/ui/photo.ts`

- [ ] **Step 1: Write the failing test:**

```ts
import { describe, it, expect } from 'vitest';
import { noteToFreq } from '../../src/audio/notes';
import { photoFilename } from '../../src/ui/photo';

describe('noteToFreq', () => {
  it('A4 (0) is 440Hz', () => expect(noteToFreq(0)).toBeCloseTo(440));
  it('one octave up doubles', () => expect(noteToFreq(12)).toBeCloseTo(880));
  it('one octave down halves', () => expect(noteToFreq(-12)).toBeCloseTo(220));
  it('a fifth up (~7 semitones)', () => expect(noteToFreq(7)).toBeCloseTo(659.255, 2));
});

describe('photoFilename', () => {
  it('formats a zero-padded timestamped png name', () => {
    expect(photoFilename(new Date(2026, 5, 13, 3, 7, 9))).toBe('veritas-journey-2026-06-13-030709.png');
  });
  it('pads double-digit parts', () => {
    expect(photoFilename(new Date(2026, 10, 21, 14, 30, 45))).toBe('veritas-journey-2026-11-21-143045.png');
  });
});
```

- [ ] **Step 2: `npm run test:unit`** — FAIL (modules missing).

- [ ] **Step 3: Create `src/audio/notes.ts`:**

```ts
/** Frequency (Hz) of a note `n` semitones from A4 (440Hz). Pure. */
export function noteToFreq(semitonesFromA4: number): number {
  return 440 * Math.pow(2, semitonesFromA4 / 12);
}
```

- [ ] **Step 4: Create `src/ui/photo.ts`:**

```ts
import type * as THREE from 'three';

/** Clean, timestamped download name for a captured scene photo. Pure. */
export function photoFilename(d: Date): string {
  const p = (n: number): string => String(n).padStart(2, '0');
  return `veritas-journey-${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}.png`;
}

/**
 * Capture the WebGL canvas (the 3D scene only — the DOM overlay is never part
 * of the canvas, so the photo is inherently clean) and download it as a PNG.
 * The renderer must be created with `preserveDrawingBuffer: true` so the last
 * rendered frame is still readable here.
 */
export function capturePhoto(renderer: THREE.WebGLRenderer, onSaved: () => void): void {
  renderer.domElement.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = photoFilename(new Date());
    a.click();
    URL.revokeObjectURL(url);
    onSaved();
  }, 'image/png');
}
```

- [ ] **Step 5: `npm run test:unit`** PASS (~65 tests). `npm run typecheck` 0.

- [ ] **Step 6: Commit**
```bash
git add src/audio/notes.ts src/ui/photo.ts tests/journey/ambience.test.ts
git commit -m "feat: pure noteToFreq + photoFilename/capturePhoto helpers with tests"
```

---

### Task 2: Day/night — theme palettes, Environment exposure, Sky controller

**Files:**
- Modify: `src/data/journey.ts`
- Modify: `src/scene/environment.ts`
- Create: `src/scene/sky.ts`

- [ ] **Step 1: `src/data/journey.ts` — add day/night palettes.** Inside the `theme` object, immediately before the closing `} as const;`, add a trailing `sky` key (keep all existing keys unchanged):

```ts
  sky: {
    day: {
      grad: ['#061f13', '#0a2e1d', '#16573a', '#2c8a5b'],
      fog: '#16573a',
      hemiSky: '#bdf5d3', hemiGround: '#06281a', hemiInt: 2.2,
      sun: '#eafff2', sunInt: 2.2,
      fly: '#c8f96e', flyOpacity: 0.85, flySize: 0.18,
      star: 0,
    },
    night: {
      grad: ['#05060f', '#0a0e2a', '#141a3a', '#20264f'],
      fog: '#0a0e2a',
      hemiSky: '#2a3470', hemiGround: '#05060f', hemiInt: 0.7,
      sun: '#9fb3ff', sunInt: 0.5,
      fly: '#dcff9e', flyOpacity: 1, flySize: 0.32,
      star: 0.9,
    },
  },
```

- [ ] **Step 2: `src/scene/environment.ts` — expose the lights and firefly material.** Add three public fields at the top of the class (next to `readonly group`):
```ts
  readonly hemi: THREE.HemisphereLight;
  readonly sun: THREE.DirectionalLight;
  readonly fireflyMaterial: THREE.PointsMaterial;
```
Replace the inline hemisphere/sun creation:
```ts
    this.group.add(new THREE.HemisphereLight('#bdf5d3', '#06281a', 2.2));
    const sun = new THREE.DirectionalLight('#eafff2', 2.2);
    sun.position.set(8, height + 10, 5);
    this.group.add(sun);
```
with:
```ts
    this.hemi = new THREE.HemisphereLight('#bdf5d3', '#06281a', 2.2);
    this.group.add(this.hemi);
    this.sun = new THREE.DirectionalLight('#eafff2', 2.2);
    this.sun.position.set(8, height + 10, 5);
    this.group.add(this.sun);
```
Then extract the firefly material so it's a field. Replace the `this.fireflies = new THREE.Points(geo, new THREE.PointsMaterial({...}));` block with:
```ts
    this.fireflyMaterial = new THREE.PointsMaterial({
      color: '#c8f96e',
      size: 0.18,
      transparent: true,
      opacity: 0.85,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    this.fireflies = new THREE.Points(geo, this.fireflyMaterial);
```

- [ ] **Step 3: Create `src/scene/sky.ts`:**

```ts
import * as THREE from 'three';
import { theme } from '../data/journey';

const D = theme.sky.day;
const N = theme.sky.night;
const MORPH_SECS = 1.5;
const STAR_COUNT = 600;

/**
 * Day/night controller: lerps fog, hemisphere + sun lights, the firefly
 * material, a star field, and the CSS body gradient between the day and night
 * palettes. `set()` chooses a target; `update(dt)` advances the ~1.5s morph.
 */
export class Sky {
  private readonly stars: THREE.Points;
  private readonly starMat: THREE.PointsMaterial;
  private cur: number; // 0 = day, 1 = night
  private target: number;
  private readonly gDay = D.grad.map((h) => new THREE.Color(h));
  private readonly gNight = N.grad.map((h) => new THREE.Color(h));
  private readonly tmp = new THREE.Color();
  private readonly tmp2 = new THREE.Color();

  constructor(
    private readonly scene: THREE.Scene,
    private readonly hemi: THREE.HemisphereLight,
    private readonly sun: THREE.DirectionalLight,
    private readonly flyMat: THREE.PointsMaterial,
    startNight: boolean,
  ) {
    const pos = new Float32Array(STAR_COUNT * 3);
    for (let i = 0; i < STAR_COUNT; i++) {
      const ru = frac(Math.sin(i * 12.9898) * 43758.5453);
      const rv = frac(Math.sin(i * 78.233) * 43758.5453);
      const theta = ru * Math.PI * 2;
      const phi = Math.acos(2 * rv - 1);
      const R = 90;
      pos[i * 3] = R * Math.sin(phi) * Math.cos(theta);
      pos[i * 3 + 1] = Math.abs(R * Math.cos(phi)) * 0.8 + 12; // upper dome only
      pos[i * 3 + 2] = R * Math.sin(phi) * Math.sin(theta);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    this.starMat = new THREE.PointsMaterial({
      color: '#eaf2ff',
      size: 0.55,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    this.stars = new THREE.Points(geo, this.starMat);
    this.scene.add(this.stars);

    this.cur = startNight ? 1 : 0;
    this.target = this.cur;
    this.apply();
  }

  set(night: boolean): void {
    this.target = night ? 1 : 0;
  }

  isNight(): boolean {
    return this.target > 0.5;
  }

  update(dt: number): void {
    if (this.cur === this.target) return;
    const step = dt / MORPH_SECS;
    this.cur =
      this.cur < this.target
        ? Math.min(this.target, this.cur + step)
        : Math.max(this.target, this.cur - step);
    this.apply();
  }

  private apply(): void {
    const t = this.cur;
    if (this.scene.fog) {
      (this.scene.fog as THREE.FogExp2).color.copy(this.lerpHex(D.fog, N.fog, t));
    }
    this.hemi.color.copy(this.lerpHex(D.hemiSky, N.hemiSky, t));
    this.hemi.groundColor.copy(this.lerpHex(D.hemiGround, N.hemiGround, t));
    this.hemi.intensity = lerp(D.hemiInt, N.hemiInt, t);
    this.sun.color.copy(this.lerpHex(D.sun, N.sun, t));
    this.sun.intensity = lerp(D.sunInt, N.sunInt, t);
    this.flyMat.color.copy(this.lerpHex(D.fly, N.fly, t));
    this.flyMat.opacity = lerp(D.flyOpacity, N.flyOpacity, t);
    this.flyMat.size = lerp(D.flySize, N.flySize, t);
    this.starMat.opacity = lerp(D.star, N.star, t);

    const stops = this.gDay.map((c, i) =>
      '#' + this.tmp2.copy(c).lerp(this.gNight[i], t).getHexString(),
    );
    document.body.style.backgroundImage =
      `linear-gradient(to top, ${stops[0]} 0%, ${stops[1]} 40%, ${stops[2]} 78%, ${stops[3]} 100%)`;
  }

  private lerpHex(a: string, b: string, t: number): THREE.Color {
    return this.tmp.set(a).lerp(this.tmp2.set(b), t);
  }
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function frac(x: number): number {
  return x - Math.floor(x);
}
```

- [ ] **Step 4: Verify** — `npm run typecheck` 0; `npm run test:unit` (~65) pass; `npm run build` success (Sky not yet wired — fine).

- [ ] **Step 5: Commit**
```bash
git add src/data/journey.ts src/scene/environment.ts src/scene/sky.ts
git commit -m "feat: day/night palettes, exposed lights, and Sky morph controller with stars"
```

---

### Task 3: Sound (`src/audio/sound.ts`)

**Files:**
- Create: `src/audio/sound.ts`

- [ ] **Step 1: Create `src/audio/sound.ts`:**

```ts
import { noteToFreq } from './notes';

const MASTER_VOL = 0.5;

/**
 * WebAudio ambience: a soft synthesized pad (started on first unmute), a short
 * chime when a course card opens, and a filtered-noise rustle during the climb.
 * One lazily-created AudioContext (autoplay policy needs a user gesture); a
 * master gain implements mute. All methods no-op safely when muted or when no
 * AudioContext is available (headless/SSR).
 */
export class Sound {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private muted: boolean;

  constructor(startMuted: boolean) {
    this.muted = startMuted;
  }

  isMuted(): boolean {
    return this.muted;
  }

  /** Toggle mute. Call from a user gesture — first unmute builds the graph. */
  setMuted(muted: boolean): void {
    this.muted = muted;
    if (!muted) this.ensure();
    if (this.ctx && this.master) {
      this.master.gain.setTargetAtTime(muted ? 0 : MASTER_VOL, this.ctx.currentTime, 0.12);
    }
  }

  chime(): void {
    const ctx = this.active();
    if (!ctx) return;
    const now = ctx.currentTime;
    [7, 11, 14].forEach((semi, i) => {
      // a rising E–G#–B-ish arpeggio above A4
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = 'sine';
      o.frequency.value = noteToFreq(semi);
      const t0 = now + i * 0.08;
      g.gain.setValueAtTime(0, t0);
      g.gain.linearRampToValueAtTime(0.22, t0 + 0.02);
      g.gain.exponentialRampToValueAtTime(0.001, t0 + 0.5);
      o.connect(g);
      g.connect(this.master!);
      o.start(t0);
      o.stop(t0 + 0.55);
    });
  }

  rustle(): void {
    const ctx = this.active();
    if (!ctx) return;
    const dur = 0.45;
    const buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * dur), ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / data.length); // decaying noise
    }
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 2600;
    bp.Q.value = 0.7;
    const g = ctx.createGain();
    g.gain.value = 0.16;
    src.connect(bp);
    bp.connect(g);
    g.connect(this.master!);
    src.start();
  }

  /** AudioContext if usable and unmuted, else null. */
  private active(): AudioContext | null {
    return this.muted || !this.ctx || !this.master ? null : this.ctx;
  }

  private ensure(): void {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') void this.ctx.resume();
      return;
    }
    const Ctor: typeof AudioContext | undefined =
      window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return;
    const ctx = new Ctor();
    this.ctx = ctx;
    this.master = ctx.createGain();
    this.master.gain.value = this.muted ? 0 : MASTER_VOL;
    this.master.connect(ctx.destination);

    // Ambient pad: detuned saws → lowpass, with a slow LFO breathing the gain.
    const pad = ctx.createGain();
    pad.gain.value = 0.1;
    pad.connect(this.master);
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 460;
    filter.connect(pad);
    for (const f of [110, 110 * 1.005, 164.81]) {
      const o = ctx.createOscillator();
      o.type = 'sawtooth';
      o.frequency.value = f;
      o.connect(filter);
      o.start();
    }
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.07;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 0.05;
    lfo.connect(lfoGain);
    lfoGain.connect(pad.gain);
    lfo.start();
  }
}
```

- [ ] **Step 2: Verify** — `npm run typecheck` 0; `npm run test:unit` pass; `npm run build` success.

- [ ] **Step 3: Commit**
```bash
git add src/audio/sound.ts
git commit -m "feat: WebAudio sound — ambient pad, card chime, climb rustle, mute"
```

---

### Task 4: Overlay buttons + CSS + main wiring

**Files:**
- Modify: `src/ui/overlay.ts`
- Modify: `src/ui/journey.css`
- Replace: `src/main.ts`

- [ ] **Step 1: `src/ui/overlay.ts` — add the ambience options type + `flashSaved` to the handles.** Add this interface above `createOverlay` (after `OverlayHandles`):
```ts
export interface AmbienceOpts {
  night0: boolean;
  muted0: boolean;
  onTime: (night: boolean) => void;
  onSound: (muted: boolean) => void;
  onPhoto: () => void;
}
```
and add to the `OverlayHandles` interface:
```ts
  flashSaved(): void;
```

- [ ] **Step 2: `src/ui/overlay.ts` — add the 6th param.** Change the signature to:
```ts
export function createOverlay(
  root: HTMLElement,
  onMode: (m: Mode) => void,
  touch: boolean,
  onFollow: (follow: boolean) => void,
  onCalc: (open: boolean) => void,
  ambience: AmbienceOpts,
): OverlayHandles {
```

- [ ] **Step 3: `src/ui/overlay.ts` — add the icon buttons + toast to the markup.** In the `<nav class="modes">`, insert these three buttons BEFORE the `<button class="mode-btn active" data-mode="journey">` line:
```html
        <button class="icon-btn" data-act="time" aria-label="Toggle day and night">${ambience.night0 ? '☾' : '☀'}</button>
        <button class="icon-btn" data-act="sound" aria-label="Toggle sound">${ambience.muted0 ? '🔇' : '🔊'}</button>
        <button class="icon-btn" data-act="photo" aria-label="Save a photo">📷</button>
```
And add the toast as the last element of the template (after the `.irvin-bubble` line):
```html
    <div class="photo-toast hidden">Saved 📷</div>
```

- [ ] **Step 4: `src/ui/overlay.ts` — wire the icon buttons.** After the existing `[data-calc]` open wiring (just before the `let pinned = false;` line), add:
```ts
  const photoToast = root.querySelector<HTMLElement>('.photo-toast')!;
  const timeBtn = root.querySelector<HTMLButtonElement>('[data-act="time"]')!;
  const soundBtn = root.querySelector<HTMLButtonElement>('[data-act="sound"]')!;
  let night = ambience.night0;
  let muted = ambience.muted0;
  timeBtn.addEventListener('click', () => {
    night = !night;
    timeBtn.textContent = night ? '☾' : '☀';
    ambience.onTime(night);
  });
  soundBtn.addEventListener('click', () => {
    muted = !muted;
    soundBtn.textContent = muted ? '🔇' : '🔊';
    ambience.onSound(muted);
  });
  root.querySelector('[data-act="photo"]')!.addEventListener('click', () => ambience.onPhoto());
```

- [ ] **Step 5: `src/ui/overlay.ts` — implement `flashSaved` in the returned handles** (add as a new property in the returned object, e.g. after `setIrvinBubble`):
```ts
    flashSaved(): void {
      photoToast.classList.remove('hidden');
      window.setTimeout(() => photoToast.classList.add('hidden'), 1500);
    },
```

- [ ] **Step 6: `src/ui/journey.css` — append icon-button + toast styles:**
```css
/* ── HUD icon buttons (day/night, sound, photo) ────────────────── */

.icon-btn {
  min-width: 44px;
  min-height: 44px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 1.05rem;
  line-height: 1;
  color: #d8ffe9;
  background: rgba(6, 40, 24, 0.55);
  border: 1px solid rgba(150, 255, 190, 0.22);
  border-radius: 999px;
  cursor: pointer;
  backdrop-filter: blur(8px);
  -webkit-tap-highlight-color: transparent;
  transition: border-color 0.2s, background 0.2s;
}

.icon-btn:hover {
  border-color: rgba(150, 255, 190, 0.6);
}

.photo-toast {
  position: fixed;
  bottom: calc(5rem + env(safe-area-inset-bottom));
  left: 50%;
  transform: translateX(-50%);
  padding: 0.5rem 1.1rem;
  background: rgba(6, 40, 24, 0.85);
  border: 1px solid rgba(150, 255, 190, 0.35);
  border-radius: 999px;
  font: 600 0.85rem 'Sora', sans-serif;
  color: #d8ffe9;
  pointer-events: none;
  z-index: 9;
  transition: opacity 0.3s;
}

.photo-toast.hidden {
  opacity: 0;
}
```

- [ ] **Step 7: Replace `src/main.ts` entirely with:**

```ts
import './ui/journey.css';
import * as THREE from 'three';
import { theme, levels } from './data/journey';
import { chapterAt, leafIndexOf } from './journey/chapters';
import { JourneyTree } from './scene/tree';
import { Environment } from './scene/environment';
import { Avatar } from './scene/avatar';
import { AmbientWander } from './scene/wander';
import { Sky } from './scene/sky';
import { Sound } from './audio/sound';
import { capturePhoto } from './ui/photo';
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

  // preserveDrawingBuffer lets photo mode read the last frame from the canvas.
  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true,
    preserveDrawingBuffer: true,
  });
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

  // Ambience: day/night + sound, restored from localStorage.
  const startNight = localStorage.getItem('vj-time') === 'night';
  const startMuted = localStorage.getItem('vj-sound') !== 'on'; // muted by default
  const sky = new Sky(scene, env.hemi, env.sun, env.fireflyMaterial, startNight);
  const sound = new Sound(startMuted);

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
  let rustleAccum = 0;
  const proj = new THREE.Vector3();

  function setMode(next: Mode): void {
    if (next === mode) return;
    rig.dispose();
    mode = next;
    rig = next === 'explore' ? orbitRig : next === 'climb' ? climbRig : scrollRig;
    rig.enter(camera);
    document.body.classList.toggle('mode-explore', next !== 'journey');
  }

  function onCalc(open: boolean): void {
    setMode(open ? 'explore' : 'journey');
  }

  const ui = createOverlay(
    overlayRoot,
    setMode,
    isMobile,
    (follow) => orbitRig.setFollow(follow ? () => avatar.group.position : null),
    onCalc,
    {
      night0: startNight,
      muted0: startMuted,
      onTime: (night) => {
        sky.set(night);
        localStorage.setItem('vj-time', night ? 'night' : 'day');
      },
      onSound: (muted) => {
        sound.setMuted(muted);
        localStorage.setItem('vj-sound', muted ? 'off' : 'on');
      },
      onPhoto: () => capturePhoto(renderer, () => ui.flashSaved()),
    },
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
      sound.chime(); // a soft chime when a course card opens
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
    sky.update(dt);

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

    // Gentle periodic rustle while climbing.
    if (mode === 'climb') {
      rustleAccum += dt;
      if (rustleAccum >= 4) {
        rustleAccum = 0;
        sound.rustle();
      }
    } else {
      rustleAccum = 0;
    }

    tree.update(t);
    env.update(t);
    ui.update(scrollRig.progress, mode, pos);

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

- [ ] **Step 8: Verify**
```bash
npm run typecheck && npm run test:unit && npm test && npm run lint && npm run build
```
All pass (~65 vitest + 25 jest). Dev smoke: `npm run dev` background, `curl -s -o /dev/null -w "%{http_code}\n" http://localhost:5173/` → 200, pkill vite.

- [ ] **Step 9: Commit**
```bash
git add src/ui/overlay.ts src/ui/journey.css src/main.ts
git commit -m "feat: wire day/night, sound, and photo HUD controls into the journey"
```

---

### Task 5: Final verification

- [ ] **Step 1: Full gates**
```bash
npm run lint && npm test && npm run test:unit && npm run typecheck && npm run build
```
Expected: 25 jest + ~65 vitest, all exit 0.

- [ ] **Step 2: Browser verification (controller runs the Playwright harness):**
  - Click **☀** → smooth ~1.5s morph to deep-indigo night: sky darkens, stars fade in, sun dims to a cool moon tone, fireflies brighten/enlarge. Icon flips to ☾. Reload → still night (persisted). Toggle back → day restored.
  - Click **📷** → a `veritas-journey-*.png` downloads containing the clean 3D scene (no HUD); a "Saved 📷" toast flashes.
  - Click **🔊/🔇** → muted by default; first unmute starts the ambient pad; clicking a course leaf plays a chime; climbing plays a periodic rustle; mute silences all and persists on reload.
  - 390×844 mobile: the three icon buttons are tappable (≥44px); night morph + photo + sound all work.
  - Journey/explore/climb/calculator unaffected; WebGL-fallback path unaffected; zero console errors.

- [ ] **Step 3: Repo hygiene** — `git status --short` shows only the owner's untracked tooling dirs.

Merge/deploy decision via superpowers:finishing-a-development-branch (NOT part of this plan).
