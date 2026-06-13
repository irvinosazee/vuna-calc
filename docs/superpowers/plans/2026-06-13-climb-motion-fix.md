# Climb Motion Fix Round Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the avatar "planking" orientation bug and make the climb read as real climbing (hug + lean + reach rhythm + outward pauses + crown cheer), center the Calculator pill, and add an Explore follow-cam chip.

**Architecture:** Every owner of the avatar now writes its COMPLETE orientation each frame via a `'YXZ'` euler → quaternion (no partial `rotation.y =` writes anywhere). The climb bob is render-only — the pure `climbStateAt` timeline and all 62 tests stay untouched. Follow-cam is an `OrbitRig.setFollow()` target-lerp; the overlay owns the chip state.

**Tech Stack:** Existing Vite 8 + TypeScript + Three.js 0.184. No new files, no new deps.

**Spec:** `docs/superpowers/specs/2026-06-13-climb-motion-fix-design.md`

**Branch:** create `feat/climb-motion-fix` from `main` before Task 1. NOTE: the working tree has an uncommitted deletion of `docs/presentation.html` (owner's pending decision) — never stage it, never use `git add -A`.

---

## File map

| Path | Action | Responsibility |
|---|---|---|
| `src/scene/avatar.ts` | Replace | + `'cheer'` pose |
| `src/scene/wander.ts` | Replace | Quaternion-only headings (kills the lookAt pitch source) |
| `src/rigs/ClimbRig.ts` | Replace | Full-orientation frames, hug+lean, bob, outward pauses, cheer |
| `src/rigs/OrbitRig.ts` | Replace | `setFollow()` target chase |
| `src/ui/overlay.ts` | Modify | Follow chip + `onFollow` callback + labels |
| `src/ui/journey.css` | Modify | `.follow-chip` styles; `.mode-btn` flex centering |
| `src/main.ts` | Modify | Wire `onFollow` (1 call-site change) |

---

### Task 0: Branch

- [ ] **Step 1:**
```bash
git checkout -b feat/climb-motion-fix
npm test && npm run test:unit   # baseline 25 + 37 pass
```

---

### Task 1: Avatar `'cheer'` pose + upright wander headings

**Files:**
- Replace: `src/scene/avatar.ts`
- Replace: `src/scene/wander.ts`

- [ ] **Step 1: Replace `src/scene/avatar.ts` entirely with:**

```ts
import * as THREE from 'three';

export type AvatarPose = 'idle' | 'walk' | 'climb' | 'cheer';

const SKIN = '#e8c39e';
const TORSO = '#2bbd88';
const LIMB = '#1d5c38';

function flat(color: string): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color, flatShading: true, roughness: 0.8 });
}

/**
 * Procedural low-poly student figure, ~1.5 units tall, pivot at the feet.
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
    } else if (this.pose === 'cheer') {
      // Both arms straight up with a happy wiggle and a little victory bounce.
      const wiggle = Math.sin(t * 9);
      this.lArm.rotation.x = -2.9;
      this.rArm.rotation.x = -2.9;
      this.lArm.rotation.z = 0.25 + wiggle * 0.12;
      this.rArm.rotation.z = -0.25 - wiggle * 0.12;
      this.lLeg.rotation.x = 0;
      this.rLeg.rotation.x = 0;
      this.body.position.y = Math.abs(Math.sin(t * 6)) * 0.08;
      this.torso.scale.setScalar(1);
    } else {
      this.lLeg.rotation.x = 0;
      this.rLeg.rotation.x = 0;
      this.lArm.rotation.x = Math.sin(t * 1.5) * 0.06;
      this.rArm.rotation.x = -Math.sin(t * 1.5) * 0.06;
      this.body.position.y = 0;
      this.torso.scale.setScalar(1 + Math.sin(t * 2) * 0.015);
    }
    if (this.pose !== 'cheer') {
      this.lArm.rotation.z = 0;
      this.rArm.rotation.z = 0;
    }
  }
}
```

- [ ] **Step 2: Replace `src/scene/wander.ts` entirely with:**

```ts
import * as THREE from 'three';
import type { Avatar } from './avatar';

const WALK_SPEED = 1.7;
const BASE_SPOT = { x: 3.4, z: 2.4 }; // where the avatar stands in journey mode

/**
 * Drives the avatar when no rig owns it: standing at the tree base in
 * journey mode, wandering the grove floor in explore mode. Runtime
 * randomness is fine here (not part of the deterministic layout).
 *
 * Headings are written as a FULL quaternion (yaw only, perfectly upright) —
 * never via partial rotation.y writes, which previously let a stray pitch
 * from lookAt() survive and tilt the avatar.
 */
export class AmbientWander {
  private target = { x: BASE_SPOT.x, z: BASE_SPOT.z };
  private idleUntil = 0;
  private readonly euler = new THREE.Euler(0, 0, 0, 'YXZ');

  constructor(private readonly avatar: Avatar) {
    avatar.group.position.set(BASE_SPOT.x, 0, BASE_SPOT.z);
    this.setHeading(Math.atan2(-BASE_SPOT.x, -BASE_SPOT.z)); // face the tree
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
      this.setHeading(Math.atan2(dx, dz));
      this.avatar.setPose('walk');
    } else {
      this.avatar.setPose('idle');
      if (mode === 'journey') this.setHeading(Math.atan2(-g.position.x, -g.position.z));
      else if (this.idleUntil < t) this.idleUntil = t + 2 + Math.random() * 2;
    }
    g.position.y = 0;
    this.avatar.update(t);
  }

  private setHeading(yaw: number): void {
    this.euler.set(0, yaw, 0);
    this.avatar.group.quaternion.setFromEuler(this.euler);
  }

  private atTarget(): boolean {
    const g = this.avatar.group;
    return Math.hypot(this.target.x - g.position.x, this.target.z - g.position.z) <= 0.15;
  }
}
```

- [ ] **Step 3: Verify** — `npm run typecheck` 0; `npm run test:unit` 37; `npm run build` success.

- [ ] **Step 4: Commit**
```bash
git add src/scene/avatar.ts src/scene/wander.ts
git commit -m "feat: cheer pose; quaternion-only avatar headings (fixes inherited tilt)"
```

---

### Task 2: ClimbRig motion overhaul

**Files:**
- Replace: `src/rigs/ClimbRig.ts`

- [ ] **Step 1: Replace `src/rigs/ClimbRig.ts` entirely with:**

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
const HUG_GAP = 0.06; // body almost touches the bark
const LEAN = 0.21; // ~12° forward lean into the trunk while climbing
const BOB_AMP = 0.12; // inchworm pull per arm reach (render-only)
const BOB_FREQ = 5; // matches the climb pose's arm cycle (sin(t * 5))
const CHEER_SECS = 2.5;

/**
 * Cinematic auto-climb: drives the avatar (approach walk → trunk ascent with
 * level pauses → crown cheer) while the camera follows; pointer-drag swings
 * the viewpoint around the avatar. No movement controls.
 *
 * The avatar's orientation is written as a FULL quaternion every frame
 * (yaw eased shortest-path + lean), so no tilt can ever be inherited.
 */
export class ClimbRig implements CameraRig {
  private elapsed = 0;
  private yaw = 0.7;
  private pitch = 0.18;
  private lookId: number | null = null;
  private last = { x: 0, y: 0 };
  private detach: (() => void)[] = [];
  private avatarAngle = CLIMB_FACE_ANGLE;
  private avYaw = 0;
  private avLean = 0;
  private crownAt: number | null = null;
  private readonly avatarEuler = new THREE.Euler(0, 0, 0, 'YXZ');
  private readonly target = new THREE.Vector3();
  private readonly desired = new THREE.Vector3();
  private readonly headOffset = new THREE.Vector3(0, 1.3, 0); // aim at head height

  constructor(
    private readonly dom: HTMLElement,
    private readonly avatar: Avatar,
    private readonly layout: TreeLayout,
  ) {}

  enter(): void {
    this.disposeListeners();
    this.elapsed = 0;
    this.crownAt = null;
    this.avatarAngle = CLIMB_FACE_ANGLE;
    this.avLean = 0;

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
      const contactX = base.x + Math.cos(CLIMB_FACE_ANGLE) * (base.radius + HUG_GAP);
      const contactZ = base.z + Math.sin(CLIMB_FACE_ANGLE) * (base.radius + HUG_GAP);
      const ease = s.approachT * s.approachT * (3 - 2 * s.approachT);
      g.position.set(
        SPAWN.x + (contactX - SPAWN.x) * ease,
        0,
        SPAWN.z + (contactZ - SPAWN.z) * ease,
      );
      this.setAvatarOrientation(Math.atan2(contactX - SPAWN.x, contactZ - SPAWN.z), 0, dt);
      this.avatarAngle = CLIMB_FACE_ANGLE;
      this.avatar.setPose('walk');
    } else if (s.phase === 'climb' || s.phase === 'pause') {
      const p = trunkPointAt(this.layout, s.height);
      const a = CLIMB_FACE_ANGLE + s.height * 0.12; // slight spiral
      this.avatarAngle = a;
      // Render-only reach rhythm: each arm cycle visibly pulls the body up.
      const bob =
        s.phase === 'climb' ? Math.max(0, Math.sin(this.elapsed * BOB_FREQ)) * BOB_AMP : 0;
      g.position.set(
        p.x + Math.cos(a) * (p.radius + HUG_GAP),
        s.height + bob,
        p.z + Math.sin(a) * (p.radius + HUG_GAP),
      );
      const towardTrunk = Math.atan2(p.x - g.position.x, p.z - g.position.z);
      if (s.phase === 'pause') {
        // Turn outward and stand upright — take in the view at this level.
        this.setAvatarOrientation(towardTrunk + Math.PI, 0, dt);
        this.avatar.setPose('idle');
      } else {
        this.setAvatarOrientation(towardTrunk, LEAN, dt);
        this.avatar.setPose('climb');
      }
    } else {
      const top = trunkPointAt(this.layout, this.layout.trunkHeight);
      g.position.set(top.x, this.layout.trunkHeight + 0.1, top.z);
      if (this.crownAt === null) this.crownAt = this.elapsed;
      const sinceCrown = this.elapsed - this.crownAt;
      // Victory: cheer first, then the slow turn surveying the grove.
      this.avYaw += dt * (sinceCrown < CHEER_SECS ? 0 : 0.4);
      this.avLean = 0;
      this.avatarEuler.set(0, this.avYaw, 0);
      g.quaternion.setFromEuler(this.avatarEuler);
      this.avatar.setPose(sinceCrown < CHEER_SECS ? 'cheer' : 'idle');
    }
    this.avatar.update(this.elapsed);

    // Keep the camera on the avatar's side of the trunk while it spirals,
    // unless the user is actively dragging the view.
    if (this.lookId === null) {
      // Camera offset is (sin yaw, cos yaw) but the avatar sits at (cos a, sin a):
      // the radially-outside camera yaw is π/2 − a (+0.4 for a pleasing 3/4 view).
      const targetYaw = Math.PI / 2 - this.avatarAngle + 0.4;
      let d = targetYaw - this.yaw;
      d = Math.atan2(Math.sin(d), Math.cos(d)); // shortest path
      this.yaw += d * (1 - Math.exp(-1.2 * dt));
    }

    // Follow camera: orbit offset around a point just above the avatar.
    this.target.copy(g.position).add(this.headOffset);
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
    // Ground the avatar so the ambient wander never sees a mid-trunk position.
    this.avatar.group.position.y = 0;
  }

  /** Full-orientation write: yaw eased shortest-path, lean eased, roll locked to 0. */
  private setAvatarOrientation(targetYaw: number, lean: number, dt: number): void {
    let d = targetYaw - this.avYaw;
    d = Math.atan2(Math.sin(d), Math.cos(d));
    const k = 1 - Math.exp(-6 * dt);
    this.avYaw += d * k;
    this.avLean += (lean - this.avLean) * k;
    this.avatarEuler.set(this.avLean, this.avYaw, 0);
    this.avatar.group.quaternion.setFromEuler(this.avatarEuler);
  }
}
```

- [ ] **Step 2: Verify** — `npm run typecheck` 0; `npm run test:unit` 37; `npm run build` success.

- [ ] **Step 3: Commit**
```bash
git add src/rigs/ClimbRig.ts
git commit -m "fix: full-orientation climb frames — hug, lean, reach rhythm, outward pauses, crown cheer"
```

---

### Task 3: Explore follow-cam

**Files:**
- Replace: `src/rigs/OrbitRig.ts`
- Modify: `src/ui/overlay.ts` (4 small edits)
- Modify: `src/ui/journey.css` (append + 1 selector-list edit)
- Modify: `src/main.ts` (1 call-site change)

- [ ] **Step 1: Replace `src/rigs/OrbitRig.ts` entirely with:**

```ts
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import type { CameraRig } from './types';

const FOLLOW_OFFSET = new THREE.Vector3(0, 0.9, 0);

export class OrbitRig implements CameraRig {
  private controls?: OrbitControls;
  private follow: (() => THREE.Vector3) | null = null;
  private readonly defaultTarget = new THREE.Vector3();
  private readonly chase = new THREE.Vector3();

  constructor(
    private readonly dom: HTMLElement,
    private readonly trunkHeight: number,
  ) {
    this.defaultTarget.set(0, this.trunkHeight * 0.55, 0);
  }

  /** Follow a moving point (e.g., the avatar); null returns focus to the tree. */
  setFollow(target: (() => THREE.Vector3) | null): void {
    this.follow = target;
  }

  enter(camera: THREE.PerspectiveCamera): void {
    this.controls = new OrbitControls(camera, this.dom);
    this.controls.target.copy(this.defaultTarget);
    this.controls.enableDamping = true;
    this.controls.minDistance = 4;
    this.controls.maxDistance = 35;
    this.controls.maxPolarAngle = Math.PI * 0.55;
  }

  update(_camera: THREE.PerspectiveCamera, dt: number): void {
    if (!this.controls) return;
    const goal = this.follow ? this.chase.copy(this.follow()).add(FOLLOW_OFFSET) : this.defaultTarget;
    this.controls.target.lerp(goal, 1 - Math.exp(-3 * dt));
    this.controls.update();
  }

  dispose(): void {
    this.controls?.dispose();
    this.controls = undefined;
  }
}
```

- [ ] **Step 2: `src/ui/overlay.ts` — four edits:**

(a) Signature — change `createOverlay(root, onMode, touch)` to add a fourth parameter:
```ts
export function createOverlay(
  root: HTMLElement,
  onMode: (m: Mode) => void,
  touch: boolean,
  onFollow: (follow: boolean) => void,
): OverlayHandles {
```

(b) Template — in the `.hud-bottom` block, directly ABOVE the `<div class="level-label">` line, add:
```html
      <button class="follow-chip hidden">👁 Follow</button>
```

(c) After the existing element lookups (next to `const label = ...`), add the chip lookup, state, and listener:
```ts
  const followChip = root.querySelector<HTMLButtonElement>('.follow-chip')!;
  let following = false;
  followChip.addEventListener('click', () => {
    following = !following;
    followChip.classList.toggle('active', following);
    onFollow(following);
  });
```

(d) In `update()` — the chip is explore-only and releases on mode exit, and the explore label reflects follow state. Replace the line
```ts
      } else if (mode === 'explore') {
        label.textContent = 'Free explore — drag, zoom, click a leaf';
```
with
```ts
      } else if (mode === 'explore') {
        label.textContent = following
          ? 'Following — drag to orbit'
          : 'Free explore — drag, zoom, click a leaf';
```
and directly after the `for (const btn of modeButtons) ...active...` line add:
```ts
      followChip.classList.toggle('hidden', mode !== 'explore');
      if (mode !== 'explore' && following) {
        following = false;
        followChip.classList.remove('active');
        onFollow(false);
      }
```

- [ ] **Step 3: `src/ui/journey.css` — two edits:**

(a) In the pointer-events re-enable group, add the chip — the rule becomes:
```css
.modes,
.course-card,
.follow-chip,
.finale:not(.hidden) .finale-actions {
  pointer-events: auto;
}
```

(b) Append at the end of the file:
```css
/* ── Explore follow chip ───────────────────────────────────────── */

.follow-chip {
  align-self: flex-start;
  font: 600 0.75rem 'Sora', sans-serif;
  color: #d8ffe9;
  background: rgba(6, 40, 24, 0.55);
  border: 1px solid rgba(150, 255, 190, 0.25);
  border-radius: 999px;
  padding: 0.35rem 0.9rem;
  cursor: pointer;
  backdrop-filter: blur(8px);
  margin-bottom: 0.2rem;
  transition: opacity 0.3s, border-color 0.2s, background 0.2s;
}

.follow-chip.hidden {
  opacity: 0;
  pointer-events: none;
}

.follow-chip.active {
  background: rgba(52, 211, 153, 0.3);
  border-color: #34d399;
}
```

- [ ] **Step 4: `src/main.ts`** — change the `createOverlay` call to wire the follow callback:
```ts
  const ui = createOverlay(overlayRoot, setMode, isMobile, (follow) =>
    orbitRig.setFollow(follow ? () => avatar.group.position : null),
  );
```

- [ ] **Step 5: Verify** — `npm run typecheck` 0; `npm run test:unit` 37; `npm test` 25; `npm run lint` clean; `npm run build` success.

- [ ] **Step 6: Commit**
```bash
git add src/rigs/OrbitRig.ts src/ui/overlay.ts src/ui/journey.css src/main.ts
git commit -m "feat: explore follow-cam — chip toggles orbit target onto the wandering avatar"
```

---

### Task 4: Mode-button centering + final verification

**Files:**
- Modify: `src/ui/journey.css`

- [ ] **Step 1:** In `src/ui/journey.css`, find the existing `.mode-btn {` rule (the one with `font: 600 0.85rem ...` and `border-radius: 999px`) and add these three lines inside it:
```css
  display: inline-flex;
  align-items: center;
  justify-content: center;
```
(This makes `<a>` pills — header Calculator, finale links — center their labels exactly like `<button>` pills.)

- [ ] **Step 2: Full gates**
```bash
npm run lint && npm test && npm run test:unit && npm run typecheck && npm run build
```
All pass (25 + 37).

- [ ] **Step 3: Commit**
```bash
git add src/ui/journey.css
git commit -m "fix: center mode-button labels — anchor pills align with button pills"
```

- [ ] **Step 4: Browser verification (controller runs the Playwright harness):** climb sequence screenshots (upright avatar hugging trunk with lean, visible reach rhythm, outward-facing pause, crown cheer with raised arms), header buttons baseline-aligned screenshot, explore follow chip (appears only in explore; toggling tracks the wanderer; exiting explore releases), journey/mobile regression, zero console errors.

Merge/deploy decision via superpowers:finishing-a-development-branch (NOT part of this plan).
