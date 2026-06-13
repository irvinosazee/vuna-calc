# Native Calculator Window (Design Spec)

**Date:** 2026-06-13
**Status:** Approved design, pending implementation plan
**Builds on:** the live calculator popup (iframe version shipped)

## Summary

Replace the iframe calculator popup with a **native, compact, draggable,
resizable, minimizable** calculator window rendered directly in the journey
app — a proper desktop-style window with a neumorphic keypad, no scrolling,
crisp button alignment. The math reuses a new ESM engine module that is
Vitest-tested; the standalone `/calculator/` page and its Jest tests are
untouched.

## Decisions made

| Topic | Decision |
|---|---|
| Rendering | Native DOM keypad in the journey app — drop the iframe for the popup |
| Engine | New `src/calc/engine.ts` (ESM, ported from `calculator.js`, Vitest-tested); standalone page keeps `src/calculator.js` (Jest, untouched) |
| Drag | Native pointer-events on the title bar (no dnd-kit — that's React; app is vanilla TS) |
| Resize | Custom bottom-right corner handle, clamped min 260×360, max viewport |
| Minimize | Collapse to the title bar in place; toggle to restore; position/size persist while open |
| Behavior | Exact match of the existing calculator (AC/CE/nCr/nPr/=/Error) + keyboard input |
| Standalone page | Unchanged; `?embed` + iframe code left in place but unused by the popup |

## 1. Engine — `src/calc/engine.ts`

- Faithful TypeScript port of the math in `src/calculator.js`: `tokenize`,
  `toRPN` (shunting-yard, with `C`=nCr and `P`=nPr as high-precedence binary
  operators), `evalRPN`, `combination`, `permutation`, and
  `evaluateExpression(expr): number` (throws on empty / malformed / non-finite).
- Pure, no DOM. Exported as ESM for the journey bundle.
- **Tested** with a new Vitest suite mirroring the Jest cases so the port is
  proven equivalent: arithmetic, operator precedence, decimals, whitespace,
  unary minus, `nCr`/`nPr` (incl. precedence and edge values), and error
  throwing on empty/garbage/divide-by-zero→Infinity.

## 2. Window — `src/calc/CalcWindow.ts`

A self-contained class that owns one DOM element and its interactions.

- **Structure:** `.calc-win` (fixed-position card) →
  `.calc-win-bar` (title "🧮 SEN Calculator", minimize `–`, close `×`) +
  `.calc-win-body` (display input + `.calc-keys` grid) +
  `.calc-win-resize` (corner handle).
- **Keypad (4-col grid, row order):**
  `AC CE nCr nPr` / `7 8 9 ÷` / `4 5 6 ×` / `1 2 3 −` / `0 . = +`.
  `=` may span for emphasis; all keys are flex/grid cells so they stay aligned
  and scale with the window. No scrollbar at any size ≥ min.
- **State & behavior** (mirrors `script.js`): an internal `expr` string;
  digit/`.`/operator append; `nCr`→`C`, `nPr`→`P`; AC clears; CE strips a
  trailing `[0-9.]+` else the last char; `=` runs `evaluateExpression`, shows
  the result and sets `expr = String(result)`, or shows `Error`; display shows
  `expr || '0'`.
- **Keyboard:** when the window is open and focused, digits/operators/Enter(=)/
  Backspace/Escape(AC)/Delete(CE) work; never hijacks Ctrl/Cmd/Alt combos.
  (The window's own Escape-to-AC must not also close the popup — close is via
  the ✕ button only when native; the overlay's global Escape-closes-popup is
  removed/avoided to prevent the conflict.)
- **Drag:** pointerdown on the bar (ignoring the min/close buttons) → move via
  pointermove with pointer capture; clamped so the bar stays on screen.
- **Resize:** pointerdown on the corner handle → adjust width/height, clamped.
- **Minimize:** toggles a `.minimized` class that hides the body + resize
  handle (only the bar shows); the `–` glyph swaps to `+`/restore affordance.
- **API:** `open()`, `close()`, `isOpen()`, `element` (appended into the
  overlay root once), plus an `onClose` callback so the overlay can sync
  mode/follow.

## 3. Overlay + main integration

- `overlay.ts`: remove the `.calc-modal` iframe markup and its open/close/Esc/
  message handlers; instead instantiate a `CalcWindow`, mount it, and have the
  calc buttons (`[data-calc]`) call `calcWindow.open()`. `onCalc(true/false)`
  still fires (open→explore+follow via the existing path; close→journey).
  `setIrvinBubble` and all other overlay behavior unchanged.
- `main.ts`: unchanged (it already wires `onCalc`); no new params expected —
  the window lives entirely inside the overlay.
- CSS: new `.calc-win*` rules in `journey.css` (green glass bar, neumorphic
  keys consistent with the site, monospace display); the old `.calc-modal`
  rules are removed. Mobile (≤640px): the window opens near-full-width,
  centered, drag/resize still available but it defaults to a sensible compact
  size.

## Testing

- New Vitest suite for `engine.ts` (≈12 cases) — must pass; brings the suite
  to ~49 Vitest tests. Existing 37 stay green; 25 Jest stay green.
- `CalcWindow` interactions are visual → browser verification: window opens,
  computes 7×8=56 and 5C2=10 via clicks AND keyboard, drags to a new spot,
  resizes from the corner, minimizes/restores, ✕ closes and returns to
  journey, buttons stay aligned at min and large sizes, mobile layout, zero
  console errors.

## Out of scope

- Changing the standalone `/calculator/` page (stays as the iframe-era page).
- Multiple windows / window stacking.
- Persisting window position across reloads.
