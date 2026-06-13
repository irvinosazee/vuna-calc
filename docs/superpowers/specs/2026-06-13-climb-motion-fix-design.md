# Climb Motion Fix Round (Design Spec)

**Date:** 2026-06-13
**Status:** Approved design, pending implementation plan
**Builds on:** `2026-06-12-polish-avatar-climb-mobile-design.md` (shipped, live)

## Summary

Three fixes from live feedback, all in existing files:

1. **Climb motion overhaul** — kill the "planking" orientation bug and make
   the climb read as actual climbing.
2. **Mode-button centering** — the Calculator `<a>` pill's label sits higher
   than its `<button>` siblings.
3. **Explore follow-cam** — a "👁 Follow" chip that makes the orbit camera
   track the wandering avatar.

## 1. Climb motion overhaul

### The orientation bug
Rigs and the wander controller only ever assign `group.rotation.y`. A pitch
inherited from an earlier `Object3D.lookAt()` call (AmbientWander's
constructor) survives forever, so the avatar can render tilted up to fully
sideways against the trunk.

**Fix:** every owner of the avatar sets its COMPLETE orientation every
frame — `group.quaternion.setFromEuler(euler)` with a `'YXZ'` euler built
from explicit yaw + lean values. No partial-euler writes anywhere
(`rotation.y =` assignments on the avatar group are eliminated, including
in `wander.ts`; the wander controller keeps the avatar perfectly upright
with yaw-only headings via the same quaternion path).

### The feel
- **Hug the trunk:** radial gap from trunk surface drops from 0.22 to 0.06,
  and the body leans INTO the trunk by ~12° (`lean = -0.21 rad` pitch
  toward the bark) while climbing.
- **Inchworm rhythm:** rendered climb height = timeline height +
  `0.12 * sin(elapsed * 5)` (the same 5 rad/s frequency as the climb-pose
  arm cycle, so each reach visibly pulls the body up). RENDER-ONLY — the
  pure `climbStateAt` timeline and its tests are untouched.
- **Pauses face outward:** during a level pause the avatar's yaw eases
  180° around to face away from the trunk (toward the camera side), pose
  `idle`; resuming the climb eases back.
- **Crown celebration:** a new Avatar pose `'cheer'` — both arms raised
  high with a small bounce — plays for the first ~2.5s of the crown phase,
  then the existing slow victory turn continues in `idle`.

## 2. Mode-button centering

`.mode-btn` gains `display: inline-flex; align-items: center;
justify-content: center;` so `<a>` pills (header Calculator, finale links)
render their labels identically to `<button>` pills. No markup changes.

## 3. Explore follow-cam

- `OrbitRig` gains `setFollow(target: (() => THREE.Vector3) | null)`. When
  set, each `update()` lerps `controls.target` toward
  `target() + (0, 0.9, 0)` (smooth chase); when null, it eases back to the
  default tree focus `(0, trunkHeight*0.55, 0)`. Orbit/zoom keep working
  around the moving point.
- Overlay: a "👁 Follow" chip rendered next to the HUD level label, visible
  ONLY in explore mode, toggling on click (active state styled like the
  mode buttons). Switching out of explore clears follow.
- HUD label while following: "Following — drag to orbit".
- Wiring: `createOverlay` gains an `onFollow(follow: boolean)` callback;
  `main.ts` connects it to `orbitRig.setFollow(...)` with the avatar's
  position.

## Testing

- Pure timeline untouched → existing 37 Vitest + 25 Jest stay green.
- No new pure logic worth unit-testing (orientation/lerp are visual);
  verification is the browser harness: climb upright + hugging + rhythm +
  pause turn + cheer, follow chip behavior in explore (on, off, mode-exit),
  button label alignment screenshot.

## Queued for the NEXT round (own spec later — user-approved backlog)

1. **Sound design** — ambient grove loop, leaf-card chime, climb rustle;
   muted until first interaction, visible mute toggle.
2. **Avatar personality** — click the avatar → wave + "Irvin" name tag;
   occasional idle stretches/look-arounds.
3. **Photo mode** — hide UI, download a clean screenshot.
4. **Day/night toggle** — user wants this "very, very intuitive and good":
   a sun/moon switch morphing the whole grove to a night palette where
   fireflies carry the lighting. To be designed properly in its own round.

## Out of scope (this round)

- The four queued ideas above.
- Any timeline (`climb.ts`) or layout changes.
