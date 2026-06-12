# Polish Round — Avatar Climb, Tree Upgrade, Mobile, Calculator (Design Spec)

**Date:** 2026-06-12
**Status:** Approved design, pending implementation plan
**Builds on:** `2026-06-12-guided-chapters-walk-design.md` (shipped, live)

## Summary

Five upgrades to the live site:

1. **Avatar** — a procedural low-poly student figure present in every mode.
2. **Climb mode** — replaces Walk: a cinematic auto-climb of the tree by the
   avatar, level by level to the crown; drag swings the camera around it.
3. **Tree upgrade** — organic curved trunk + root flare, fuller non-clickable
   canopy, twiggy limbs, ground grass/flowers.
4. **Mobile overhaul** — bottom-sheet course card, slim chapter strip, safe
   areas, ≥44px targets, native-feeling scroll, lower GPU cost on phones.
5. **Calculator** — single mint-grove theme (dark toggle removed CSS-only),
   deepened "properly 3D" neumorphism, plus a site-wide tree favicon.

## Decisions made

| Topic | Decision |
|---|---|
| Avatar style | Low-poly primitives, journey palette, procedural animation (no model files) |
| Avatar presence | Journey: idle at tree base · Explore: ambient wander · Climb: the star |
| Climb interaction | Cinematic auto-climb; user drag orbits the view around the avatar; same on touch |
| Old WASD/joystick walking | Removed entirely (code + CSS) |
| Mode naming | `Mode = 'journey' \| 'explore' \| 'climb'`; button label "Climb" |
| Tree upgrades | ALL: organic trunk+roots, foliage clusters, twigs, ground life |
| Foliage clickability | Foliage/twigs are decorative; only course leaves raycast |
| Calculator theme | Mint grove only; toggle hidden via CSS; `body.dark-mode` vars remapped to mint; zero JS/test changes |
| Favicon | `public/favicon.svg` (stylized green tree), linked from both pages |

## 1. Avatar — `src/scene/avatar.ts`

- ~1.7 units tall, pivot at the feet. Parts: sphere head, tapered-cylinder
  torso, 4 cylinder limbs with shoulder/hip pivots (limb meshes parented to
  pivot groups so rotation swings them naturally), flat-shaded, palette:
  torso emerald `#2bbd88`, limbs deep green `#1d5c38`, head warm `#e8c39e`.
- API: `class Avatar { readonly group: THREE.Group; setPose(pose: 'idle' | 'walk' | 'climb'): void; update(t: number, dt: number): void; }`
  - `idle`: subtle breathing scale + slow sway.
  - `walk`: legs/arms counter-swing (sin), slight bob.
  - `climb`: alternating arm reach + leg push, body hugging the surface.
- Position/heading are set externally (rigs/ambient controller own movement;
  the Avatar only animates itself in place).

## 2. Climb mode — `src/rigs/ClimbRig.ts` + pure `src/journey/climb.ts`

### Pure timeline (`climb.ts`, unit-tested)
- `climbStateAt(elapsed: number, levelY: number[], trunkHeight: number): ClimbState`
  returns `{ phase: 'approach' | 'climb' | 'pause' | 'crown'; height: number; pauseLevel: number; done: boolean }`.
- Choreography: approach walk (~4s from spawn radius ~10 to the trunk),
  then climb at a steady rate (~1.6 units/s) with a ~1.8s pause at each
  level ring (`levelY`), finishing at `trunkHeight` ("crown", terminal state).
- Total runtime ≈ 35–45s; deterministic; rewinds are NOT supported (each
  Climb entry restarts at elapsed 0).

### ClimbRig
- Implements the existing `CameraRig` interface; owns an `elapsed` clock,
  drives the avatar: ground walk during approach (pose `walk`), trunk-surface
  ascent during climb (pose `climb`, positioned on the trunk at its current
  radius for that height, slight spiral), pose `idle` at pauses and crown.
- Camera: smooth-damped follow at an orbit offset (distance ~5, slight
  above), with pointer-drag adjusting yaw/pitch around the avatar (pitch
  clamped). Touch: one-finger drag does the same. No movement controls.
- Forces growth = 1; page scroll locked (existing non-journey body class).
- `dispose()` removes listeners; re-enter restarts the sequence.

### Other modes
- **Explore:** avatar wanders the grove floor: pick a random target within
  radius 6–20, walk to it, idle 2–4s, repeat (plain `Math.random`; not
  layout-deterministic). Orbit controls and leaf clicking unchanged.
- **Journey:** avatar idles at a fixed spot near the tree base, visible in
  the intro/low-scroll camera frames.
- HUD label in Climb: "Watch the climb — drag to swing the camera".

## 3. Tree upgrade — `layout.ts`, `tree.ts`, `environment.ts`

- **Organic trunk:** stacked low-poly tapered segments (≈6) whose centers
  follow a gentle S-curve (deterministic offsets via `pseudoRandom`), radius
  tapering 1.3 → 0.4. Root flare: 6 angled, flattened cones around the base.
  Trunk + roots live in a `trunkGroup` that scales for growth exactly as the
  single cylinder did (origin at ground).
- **Foliage canopy:** new `InstancedMesh` (`foliageMesh`) of icosahedra
  r 0.8–1.4 in two muted greens, 3–5 per semester limb placed around that
  limb's leaf cloud; NOT raycast (picking still targets `leafMesh` only);
  revealed with its limb's growth threshold (per-instance reveal by count,
  ordered like leaves). Course leaves get a size bump (0.42 → 0.5 base).
- **Twigs:** 2–3 thin cylinders per limb from limb tip toward the leaf
  cloud, same bark material, visibility tied to the limb.
- **Ground life:** instanced grass tufts (small cones, ~60 desktop / ~30
  mobile) and flowers (~20/10) scattered radius 3–30 via `pseudoRandom`,
  in `environment.ts`.
- Layout additions are pure and unit-tested: trunk spline points, foliage
  spots (count per semester, near-limb placement), twig endpoints.
- Poly budget stays low-poly (<80k tris total); instancing throughout.

## 4. Mobile overhaul — `journey.css`, small `overlay.ts` touches

- `@media (max-width: 640px)`:
  - Chapter panel → slim top-center strip below the header (level + sem on
    one line, meta on the next), max-width 92vw.
  - Course card → bottom sheet: full-width, anchored above the HUD, rounded
    top corners, slide-up transition, close target ≥44px.
  - Beats/finale typography scales down; finale actions stack vertically.
  - Legend: smaller dots/text, single row, scrollable if needed.
  - Mode buttons: tighter padding but ≥44px tap height.
- Safe areas: `viewport-fit=cover` on the meta tag + `env(safe-area-inset-*)`
  padding on hud-top/hud-bottom.
- Feel: `overscroll-behavior-y: none` artifacts avoided (keep default rubber
  band on the page but prevent overlay interference), `user-select: none` on
  overlay chrome, `-webkit-tap-highlight-color: transparent`.
- Performance on coarse pointers: pixel ratio cap 1.75, halved foliage/
  grass/particle counts (single `isMobile` flag already exists).

## 5. Calculator + favicon

- `journey-skin.css` (CSS-only, no JS/markup-logic changes):
  - `.theme-toggle-btn { display: none }` — toggle gone.
  - `body.dark-mode` variable block remapped to the SAME mint values as
    `:root` (so a stale `localStorage.theme === 'dark'` still renders mint).
  - Deepened neumorphism: larger dual shadows on the card/title panel,
    `:active` pressed-in (inset shadow) states on all buttons, sunken
    display well, slightly larger radii. Layout untouched.
- `src/calculator.js`, `script.js`, and all Jest tests remain untouched.
- **Favicon:** `public/favicon.svg` — stylized low-poly green tree on
  transparent background (hand-authored SVG, ~15 shapes). Linked via
  `<link rel="icon" type="image/svg+xml" href="/favicon.svg">` in the
  journey page and `href="../favicon.svg"` in the calculator page.

## Testing

- New Vitest suites: `climb.test.ts` (phase sequence, pause count = 4,
  monotonic height, terminal crown state), layout additions (foliage spot
  counts per semester, twig endpoints finite, trunk spline within bounds).
- All existing 53 tests (25 Jest + 28 Vitest) stay green.
- Browser verification including a 390×844 mobile viewport pass (chapter
  strip, bottom-sheet card, climb cinematic, explore wander, calculator
  single theme, favicon visible) before merge.

## Out of scope

- User-driven avatar movement (retired with WASD walking).
- Rigged/skinned 3D models or external assets.
- PNG/ICO favicon fallbacks for legacy browsers (SVG only).
- Journey-mode scroll choreography changes (chapters stay as shipped).
