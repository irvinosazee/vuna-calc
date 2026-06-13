# Calculator Popup + Clickable Irvin (Design Spec)

**Date:** 2026-06-13
**Status:** Approved design, pending implementation plan
**Builds on:** the live site (climb-motion-fix shipped)

## Summary

Three connected changes, kept fast by reusing the existing tested calculator:

1. **In-page calculator popup** — the header/finale "Calculator" button no
   longer navigates away; it opens a frosted-glass calculator card docked to
   the right of the live 3D grove (bottom sheet on mobile). The real
   calculator runs inside via an `<iframe>` to `./calculator/?embed=1` — zero
   logic duplication, the Jest-tested engine and mint theme reused as-is.
2. **Ambient Irvin behind the calc** — opening the popup puts the scene into
   explore + follow, so the avatar auto-wanders the grove and the camera
   gently tracks him; the glass card is translucent so he stays visible even
   when he drifts behind it. This is the "mini Irvin in the background."
3. **Clickable Irvin** — clicking the avatar makes him wave and pops a speech
   bubble ("Hi, I'm Irvin 👋 · VUG/SEN/22/8386") anchored over his head.
4. **Dark-mode toggle removed** from the calculator page entirely (element
   deleted, not just hidden).

## Decisions made

| Topic | Decision |
|---|---|
| Calc reuse | `<iframe src="./calculator/?embed=1">` — no reimplementation, no DRY break, Jest tests untouched |
| Popup layout | Frosted-glass side-card, right ~third desktop; bottom sheet mobile; NO dark backdrop (scene stays live) |
| Ambient behind calc | Open popup → `explore` mode + orbit follow on the wandering avatar |
| Calc button | Header + finale "Calculator" become buttons that open the popup (was `<a>` navigation) |
| Standalone /calculator/ | Still works by direct URL (and is what the iframe loads); non-embed = full page minus toggle |
| Irvin click | Wave pose + DOM speech bubble anchored to projected head position, ~3s |
| Dark toggle | `<button id="theme-toggle">` deleted from calculator HTML |

## 1. Calculator popup

- Overlay gains a `.calc-modal` (hidden by default): a frosted-glass card
  (`backdrop-filter: blur`, translucent emerald border, rounded) containing
  a header strip ("🧮 SEN Calculator" + ✕ close) and an `<iframe>`.
- Desktop: card fixed to the right, ~380px wide, vertically centered, with a
  margin so the left ~two-thirds of the canvas stays clear for Irvin. No
  backdrop dim — the 3D scene renders live behind/around it.
- Mobile (≤640px): card becomes a bottom sheet (full width, lower ~58vh,
  rounded top), the grove + Irvin fill the top.
- Open: `onCalc(true)` → card slides in (`iframe.src` set on first open,
  lazy), scene enters `explore` + `setFollow(avatar)`. Close (✕ or Esc):
  `onCalc(false)` → card slides out, follow cleared, mode returns to journey.
- The iframe points at `./calculator/?embed=1`.

## 2. Calculator page: embed mode + toggle removal

- `public/calculator/index.html`: delete the `<button id="theme-toggle">`
  element. Add a tiny inline script that adds `class="embed"` to `<body>`
  when the URL has `?embed`.
- `journey-skin.css`: `.embed` rules — transparent page background (so the
  journey glass shows through the iframe), hide the title panel, the
  "🌳 Journey" back-link, and the scroll-to-top button; center the
  calculator card in the iframe viewport. Non-embed page is unchanged except
  the toggle is gone (mint theme already forced; `script.js` guards `if(btn)`
  so its removal is safe).
- Dev only: `vite.config.ts` calculator middleware must match on the URL
  **pathname** (not the exact string) so `./calculator/?embed=1` still serves
  `calculator/index.html` instead of falling through to the journey SPA.

## 3. Clickable Irvin

- `Avatar` gains a `'wave'` pose: right arm raised, waving via `sin`, gentle
  idle otherwise.
- `main.ts` pointerup raycast also tests `avatar.group` (recursive). Avatar
  hit takes priority over a leaf hit; it sets the pose to `'wave'` for ~1.8s
  (then back to whatever the active controller sets) and shows the bubble.
- Speech bubble: a `.irvin-bubble` DOM element. While active (a
  `bubbleUntil` timestamp), each frame projects the avatar's head world
  position to screen coords and positions the bubble there; fades out after
  ~3s. Hidden if the avatar projects behind the camera.
- Works in journey, explore, and calc-popup ambient (avatar present in all).

## Architecture / files

| Path | Action | Responsibility |
|---|---|---|
| `public/calculator/index.html` | Modify | Remove toggle; add embed-class script |
| `public/calculator/assets/css/journey-skin.css` | Modify | `.embed` rules |
| `vite.config.ts` | Modify | Calc middleware matches pathname (dev) |
| `src/scene/avatar.ts` | Modify | `'wave'` pose |
| `src/ui/overlay.ts` | Modify | calc-modal + iframe + close; Irvin bubble element; `onCalc` callback; calc buttons open popup |
| `src/ui/journey.css` | Modify | `.calc-modal` glass card (desktop dock + mobile sheet); `.irvin-bubble` |
| `src/main.ts` | Modify | Wire `onCalc` (open→explore+follow, close→journey); avatar raycast→wave+bubble; project bubble each frame; Esc handler |

## Testing

- Calculator engine + its 25 Jest tests untouched (iframe reuses the page).
- Vitest 37 unchanged (no pure-logic changes).
- Browser verification: popup opens as a right glass card with Irvin
  wandering/visible behind it and the calculator usable inside; mobile bottom
  sheet; clicking Irvin waves + bubble; toggle gone from the standalone page;
  `./calculator/?embed=1` renders transparent. Zero console errors.

## Out of scope

- Reimplementing the calculator in TS (iframe reuse instead).
- The other queued ideas (sound, photo mode, day/night) — separate rounds.
