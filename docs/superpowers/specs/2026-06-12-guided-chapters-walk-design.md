# Guided Chapters + Walk Mode (Design Spec)

**Date:** 2026-06-12
**Status:** Approved design, pending implementation plan
**Builds on:** `2026-06-12-veritas-journey-3d-design.md` (shipped, live)

## Summary

Two upgrades to the live Veritas Journey site:

1. **Guided Chapters** — the scroll climb becomes a self-explanatory guided
   tour: 8 semester chapters, an auto-cycling course ticker with one-line
   "what it's about" text for all 79 courses, a pulsing leaf spotlight, a
   color legend, and a one-time "each leaf is a course" hint.
2. **Walk mode** — the disabled Walk button comes alive: first-person free
   walk on the grove floor (WASD/drag on desktop, virtual joystick + drag
   on touch), bounded to the grove, leaves still clickable.

## Part 1 — Guided Chapters

### Scroll mapping
- The climb range (progress 0.18 → 0.93, after intro / before finale) splits
  into **8 equal semester zones** in chronological order.
- Within a zone: the first 15% is the **chapter window**, the remaining 85%
  divides equally among that semester's courses (the **ticker windows**).
- Pure function in a new module `src/journey/chapters.ts`:
  `chapterAt(progress)` → `{ phase: 'intro'|'chapter'|'course'|'finale', levelIdx, semIdx, courseIdx }`.
  Scrubbing backwards rewinds; no timers anywhere.

### Chapter panel
- On zone entry, a panel announces the chapter:
  "**200 LEVEL · First Semester** · 2023/2024 — 10 courses · 21 units".
- It displays prominently during the chapter window, then shrinks to a
  compact corner form during the course windows so the tree stays visible.

### Course ticker
- The existing course card doubles as the ticker: during each course window
  it shows that course's **code (tinted in its family color), title, units,
  and `about` line**.
- A new `about: string` field on `Course` in `src/data/journey.ts`;
  drafted one-liners for all 79 courses (plain English, e.g. SEN207 → "How
  to organize data and design fast algorithms — lists, trees, sorting,
  searching"). The owner edits any line in the data file.
- Clicking a leaf overrides the ticker with that course until the card is
  closed (existing behavior preserved; the card now also shows `about`).

### Leaf spotlight
- The tickered course's leaf **pulses** (gentle scale oscillation via its
  instance matrix; one `setMatrixAt` + `instanceMatrix.needsUpdate` per
  frame). `JourneyTree.setSpotlight(index | null)` restores the previous
  leaf's matrix when the spotlight moves on.

### Legend + hint
- Bottom-left compact legend strip (above the progress bar):
  ● SEN core · ● General studies · ● Maths & sciences · ● Labs/SIWES,
  colors from `theme.families`.
- One-time hint "🍃 each leaf is a course — click one" shown at the first
  chapter, fades permanently after a few seconds (per-page-load, no storage).
- Explore and Walk modes keep the legend; the ticker/chapters only run in
  Journey mode.

## Part 2 — Walk mode

### Controls
- **Desktop:** WASD / arrow keys to move; pointer-drag to look (yaw free,
  pitch clamped ±70°). No pointer lock (keeps ESC/UI behavior simple).
- **Touch:** left half of the screen = virtual joystick for movement
  (appears where the thumb lands); right half = drag to look.
- Movement is dt-based (~6 units/s), camera fixed at eye height y = 1.7,
  position clamped to grove radius 4–45 (can't walk through the trunk or
  off the world).

### Integration
- `WalkRig` (currently an empty stub) implements the existing `CameraRig`
  interface — no changes to the mode-manager pattern. `enter()` places the
  camera at radius ~14 facing the trunk and shows a dismissible controls
  hint ("WASD move · drag to look"); `dispose()` removes all listeners.
- The Walk button becomes enabled; `setMode('walk')` stops blocking it.
  Walk forces growth = 1 (full tree) and `mode-explore`-style scroll lock
  (reuse the same body class).
- Leaf clicking still works (the existing 6px tap-vs-drag threshold already
  separates look-drags from taps).
- Journey/Explore/Walk all switch freely with the existing smooth-lerp feel.

## Architecture / files

| File | Change |
|---|---|
| `src/data/journey.ts` | `Course.about` field + 79 drafted lines |
| `src/journey/chapters.ts` | NEW — pure scroll→chapter/course mapping (unit tested) |
| `src/scene/tree.ts` | `setSpotlight()` pulse |
| `src/rigs/WalkRig.ts` | Full implementation (keyboard + drag + joystick) |
| `src/ui/overlay.ts` | Chapter panel, ticker wiring, legend, hints; walk button enabled |
| `src/ui/journey.css` | Styles for panel/legend/hints/joystick |
| `src/main.ts` | Wire chapters + spotlight + walk rig into the loop |
| `tests/journey/chapters.test.ts` | NEW — zone boundaries, ordering, rewind symmetry |
| `tests/journey/data.test.ts` | Assert every course has a non-empty `about` |

## Testing
- `chapterAt`: covers intro/finale edges, all 8 zones in order, chapter vs
  course windows, exact course counts per zone, monotonicity.
- Data test: 79 non-empty `about` strings.
- Existing 46 tests keep passing; browser-based visual verification of
  chapters, ticker, spotlight, legend, and walk controls before merge.

## Out of scope
- The "forest of 4 clearings" walk world (explicitly deferred).
- Persisted state (hints reset each page load).
- Gamepad support.
