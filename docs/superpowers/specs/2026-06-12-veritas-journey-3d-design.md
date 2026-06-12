# Veritas Journey — 3D Academic Tree Website (Design Spec)

**Date:** 2026-06-12
**Status:** Approved design, pending implementation plan
**Owner:** Irvin Ogbemudia Uyi Osazee (VUG/SEN/22/8386)

## Summary

Transform the vuna-calc-482 site into "Veritas Journey": a 3D, scroll-driven,
green-themed website where a low-poly tree grows through Irvin's academic
journey at Veritas University — 4 levels (100–400), 8 semesters, 79 courses —
sourced from `courses.txt`. The existing neumorphic calculator is preserved
unchanged at a `/calculator/` route, reachable via a button. The existing
GitHub Actions → cPanel CI/CD pipeline continues to deploy the static `dist/`
output (SEN 482 assignment requirement).

## Decisions made

| Topic | Decision |
|---|---|
| Primary mode | Scroll-driven climb (cinematic, guided) |
| Other modes | Free-orbit explorer via mode button; walk-through world deferred to Phase 2 (button greyed "coming soon") |
| Mode architecture | One scene, swappable camera rigs — no page reloads between modes |
| Course detail | Courses only: code, title, credit units. No scores, grades, GPA (privacy) |
| Data source | `courses.txt` (complete: all 8 semesters, 79 courses) |
| Editability | Single `src/data/journey.ts` file holds all content |
| Tech stack | Vite + Three.js + TypeScript, static multi-page build |
| Art style | Stylized low-poly, flat-shaded, green theme |
| Intro | Short cinematic seed-to-sprout intro (2–3 scroll beats, editable text) |
| Calculator | Moved intact to `/calculator/`; Jest tests and `src/calculator.js` untouched |
| Deployment | Existing GitHub Actions → cPanel pipeline; build step becomes Vite build |

## 1. The Experience

1. **Intro (scroll beats):** Page opens on a 3D green world (gradient sky,
   misty ground, fireflies). A glowing seed falls — "2022. A seed lands in
   Abuja…" — name / matric no / programme fade in — the seed sprouts.
   Beat text lives in `journey.ts` and is editable.
2. **The climb:** Scrolling grows the tree and spirals the camera up the
   trunk. Each level (100–400) is a branch whorl with a floating ring label;
   each semester is a limb; each course is a glowing leaf/fruit. Approaching
   or clicking a leaf opens a card: course code, title, credit units.
3. **Canopy finale:** Stats ("4 levels · 8 semesters · 165 credit units"),
   plus buttons: Explore mode and Calculator.
4. **Mode switcher (top corner):** Journey (default) · Explore (orbit + click)
   · Walk (disabled, "coming soon"). Switching modes animates the camera from
   its current position into the new rig — no reload.

## 2. Visual design

- Low-poly flat-shaded geometry throughout; soft fog; floating particles;
  gentle idle sway on branches.
- Palette: deep forest background `#0a2e1d` graduating to soft mint at the
  canopy; emerald trunk.
- Leaf color coding by course family: SEN = bright emerald; GST = lime;
  MTH/PHY/STA = teal; labs/SIWES/practicum = gold-green accent.
- Typography: display font for headings, monospace for course codes.
- Theme tokens (colors, fog density, particle counts) live in `journey.ts`.

## 3. Architecture

Vite + TypeScript + Three.js. Modules with single responsibilities:

- **`src/data/journey.ts`** — all content: intro beats, levels → semesters →
  courses, theme tokens. The only file to edit for content changes.
- **`src/scene/tree.ts`** — procedural tree builder: trunk spline, one limb
  per semester, instanced leaf meshes per course. Generated from data, so
  data edits reshape the tree automatically.
- **`src/scene/environment.ts`** — sky, ground, fog, lights, particles.
- **`src/rigs/`** — `CameraRig` interface (`update(dt)`, `enter(from)`,
  `dispose()`); `ScrollRig` (scroll progress → position on a camera path),
  `OrbitRig` (OrbitControls + raycast leaf clicking), `WalkRig` stub
  (Phase 2).
- **`src/ui/`** — DOM overlay: intro beat text, course card, mode switcher,
  progress HUD, calculator button.
- **`src/main.ts`** — bootstrap, render loop, mode manager, WebGL detection.

## 4. Routes & deployment

- `/` — the 3D journey (new `index.html`, Vite entry).
- `/calculator/` — the existing calculator page and assets moved intact
  (second Vite entry / static copy). `src/calculator.js` and
  `tests/calculator.test.js` unchanged.
- Vite multi-page build outputs static files to `dist/`; the existing
  GitHub Actions workflow deploys `dist/` to cPanel over SSH. Only the
  workflow's build step changes (to the Vite build). Tests continue to run
  in CI before deploy.

## 5. Performance & fallback

- Poly budget under ~50k triangles; instanced meshes for leaves; pixel ratio
  capped at 2; reduced particle count on mobile (pointer/coarse media query).
- WebGL unavailable → graceful fallback: a styled 2D list of the journey
  (levels, semesters, courses) renders in place of the canvas. No blank page.

## 6. Error handling & testing

- Data integrity unit tests: 8 semesters present, course counts per semester
  match courses.txt, credit-unit totals per semester match (24, 24, 21, 20,
  20, 21, 17, 18).
- Tree layout math (pure functions: branch angles, leaf placement) unit
  tested.
- Calculator Jest tests remain in CI unchanged.
- Visual verification via Vite dev server during implementation.

## Phase 2 (separate future spec)

Walk-through world mode: first/third-person path through forest clearings,
one clearing per level. The `WalkRig` stub and disabled mode button reserve
its place in the UI.

## Out of scope

- Displaying scores, grades, GPA/CGPA (privacy decision).
- CMS or backend — content is a TypeScript file by design.
- Walk-through mode implementation (Phase 2).
