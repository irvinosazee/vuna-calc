# Ambience Round — Day/Night, Photo Mode, Sound (Design Spec)

**Date:** 2026-06-13
**Status:** Approved design, pending implementation plan
**Builds on:** the live Veritas Journey site

## Summary

Three independent ambience features on the existing scene/overlay, built in
one round:

1. **Day/Night** — a sun/moon HUD toggle that smoothly morphs the whole grove
   between day and a deep-indigo night (stars fade in, fireflies bloom into
   the main light, sun→moon). Persists in localStorage; default day.
2. **Photo mode** — a camera HUD button that hides all UI, captures a clean
   PNG of the 3D scene, downloads it, and restores the UI.
3. **Sound** — WebAudio-synthesized ambient pad + a chime when a course card
   opens + a soft rustle during the climb; a mute toggle in the HUD; silent
   until the first user gesture.

Each is independently toggleable and isolated in its own module.

## Decisions made

| Topic | Decision |
|---|---|
| Day/night switch | Manual sun/moon toggle, smooth ~1.5s morph, persisted in localStorage, default day |
| Night look | Deep indigo sky + fading star field + soft moon + bloomed fireflies as primary light |
| Sound source | WebAudio synthesis (no asset files); mute toggle; off until first gesture |
| Photo output | Clean PNG of the scene, no watermark/caption |
| Isolation | New modules: `src/scene/sky.ts` (day/night), `src/audio/sound.ts`, `src/ui/photo.ts`; overlay gains 3 HUD buttons |

## 1. Day/Night — `src/scene/sky.ts` + theme tokens

- **Two palettes** in `journey.ts` `theme` (extend, don't break existing):
  `theme.day` and `theme.night`, each with `{ bgTop, bgMid, bgBottom, fog,
  hemiSky, hemiGround, sunColor, sunIntensity, fireflyColor, fireflyOpacity,
  starOpacity }`. Existing single values become the `day` set so current look
  is unchanged at default.
- **`Sky` controller** owns: the CSS body gradient (set via a CSS custom
  property or direct style), `scene.fog` color, the hemisphere + directional
  lights (passed in from `Environment`/main), the fireflies material
  (color/opacity), and a new **star field** (a `THREE.Points` cloud high in
  the dome, opacity 0 by day). `Sky.set(target: 'day'|'night')` starts a lerp;
  `Sky.update(dt)` advances it (~1.5s ease). Night: indigo bg
  (`#0a0e2a`→`#141a3a`), fog indigo, sun dims to a cool moon, fireflies
  brighten and grow, stars fade to ~0.9.
- **Star field**: ~600 points on a large sphere shell, additive, tiny, only
  visible at night (opacity driven by the lerp). Built once.
- **Toggle**: a `☀/☾` button in `.hud-top`; click flips state, calls
  `sky.set(...)`, saves `localStorage['vj-time'] = 'day'|'night'`. On boot,
  read it (default day) and apply instantly (no animation on first paint).
- Fireflies already exist in `Environment`; `Sky` adjusts their material —
  `Environment` exposes the fireflies' material/points (or a setter).

## 2. Photo mode — `src/ui/photo.ts`

- A `📷` button in `.hud-top`. On click: add a `body.photo` class that hides
  the overlay (CSS `#overlay { opacity:0 }` under `.photo`), wait one render
  frame, read the WebGL canvas to a PNG blob, trigger a download
  (`veritas-journey-<timestamp>.png`), then remove `body.photo`.
- The renderer must capture reliably: create the `WebGLRenderer` with
  `preserveDrawingBuffer: true` (small cost, simplest correct capture), then
  `renderer.domElement.toBlob(...)`. A tiny "Saved 📷" toast confirms.
- Pure function `photoFilename(stamp)` → string is unit-tested; the capture/
  download is browser-verified.
- Timestamp is passed in (no `Date.now()` in tested code); `photo.ts` reads
  `new Date()` only at click time.

## 3. Sound — `src/audio/sound.ts`

- A `Sound` class wrapping one lazily-created `AudioContext` (created on first
  user gesture to satisfy autoplay policy).
- **Ambient pad**: two slightly-detuned oscillators through a low-pass filter
  + slow LFO on gain → a soft evolving drone at low volume; starts on first
  unmute.
- **Chime**: `sound.chime()` — a short 3-note sine arpeggio (e.g. E–G–B) with
  a quick decay envelope; called when a course card opens.
- **Rustle**: `sound.rustle()` — a short filtered white-noise burst (decaying
  band-passed noise); called on entering climb / per level pause.
- **Mute toggle**: `🔊/🔇` button in `.hud-top`. Muted by default; first
  unmute click resumes/creates the context and starts the pad. State persists
  in `localStorage['vj-sound']`. All output runs through a master gain that
  mute sets to 0.
- No audio files. Pure helper `noteToFreq(semitonesFromA4)` unit-tested; the
  rest is browser-verified (and guarded so headless/no-AudioContext never
  throws).

## 4. Overlay / main integration

- `.hud-top` gains a small button cluster (left of, or beside, the brand):
  `☀/☾` (day/night), `🔊/🔇` (sound), `📷` (photo). Styled like compact
  `.mode-btn` icon buttons; ≥44px touch targets; `pointer-events:auto`.
- `overlay.ts` exposes callbacks (`onToggleTime`, `onToggleSound`, `onPhoto`)
  wired by `main.ts` to the `Sky`, `Sound`, and photo capture.
- `main.ts`: construct `Sky` (given fog/lights/fireflies + the star group it
  adds to the scene), `Sound`, and the photo capturer; call `sky.update(dt)`
  in the loop; trigger `sound.chime()` when the course card opens (hook in the
  raycast/ticker path) and `sound.rustle()` on climb pauses.
- `journey.css`: night-aware body background driven by CSS variables the `Sky`
  controller sets; `.photo` hide rule; icon-button styles; "Saved" toast.

## Testing

- New Vitest: `photoFilename()` format + `noteToFreq()` values (small, pure).
- Existing 25 Jest + 59 Vitest stay green; new tests add a handful.
- Browser verification: toggle night (indigo + stars + glowing fireflies, sun→
  moon, smooth morph, persists on reload); photo downloads a clean PNG with no
  UI; sound stays silent until unmute then plays pad + chime on card open +
  rustle on climb, mute persists; mobile HUD buttons usable; zero console
  errors; WebGL-fallback path unaffected.

## Out of scope

- Multiple themes beyond day/night.
- Video/gif capture.
- Real recorded audio assets.
- Per-leaf or positional 3D audio.
