# Native Calculator Window Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the iframe calculator popup with a native, compact, draggable + resizable + minimizable green-neumorphic calculator window driven by a Vitest-tested ESM math engine.

**Architecture:** A pure ESM engine (`src/calc/engine.ts`, ported from the Jest-tested `calculator.js`) feeds a self-contained `CalcWindow` class (`src/calc/window.ts`) that renders its own keypad and owns drag/resize/minimize. The overlay mounts one `CalcWindow` and opens it from the Calculator buttons; the iframe markup/handlers are removed. Standalone `/calculator/` and its Jest tests are untouched.

**Tech Stack:** Existing Vite 8 + TypeScript + Three.js + Vitest + Jest. No new deps (drag/resize are native pointer events).

**Spec:** `docs/superpowers/specs/2026-06-13-native-calc-window-design.md`

**Branch:** create `feat/native-calc-window` from `main` before Task 1. NOTE: the working tree has an uncommitted deletion of `docs/presentation.html` plus untracked `.agents/`, `.claude/`, `skills-lock.json` (owner's) — never stage them, never `git add -A`; stage only each task's named files.

---

## File map

| Path | Action | Responsibility |
|---|---|---|
| `src/calc/engine.ts` | Create | Pure ESM math engine (tokenize→RPN, nCr/nPr) |
| `tests/journey/calc-engine.test.ts` | Create | Vitest proof of engine equivalence |
| `src/calc/window.ts` | Create | `CalcWindow` — DOM keypad + drag/resize/minimize + behavior |
| `src/ui/overlay.ts` | Modify | Drop iframe modal; mount + open `CalcWindow` |
| `src/ui/journey.css` | Modify | Remove `.calc-modal*`; add `.calc-win*` styles |

`src/main.ts`, `src/calculator.js`, the standalone page, and Jest tests are NOT changed.

---

### Task 0: Branch

- [ ] **Step 1:**
```bash
git checkout -b feat/native-calc-window
npm test && npm run test:unit   # baseline 25 + 37 pass
```

---

### Task 1: Engine (`src/calc/engine.ts`) — TDD

**Files:**
- Test: `tests/journey/calc-engine.test.ts`
- Create: `src/calc/engine.ts`

- [ ] **Step 1: Write the failing test:**

```ts
import { describe, it, expect } from 'vitest';
import { evaluateExpression, combination, permutation } from '../../src/calc/engine';

describe('engine — arithmetic', () => {
  it('adds', () => expect(evaluateExpression('2+3')).toBe(5));
  it('subtracts', () => expect(evaluateExpression('10-4')).toBe(6));
  it('multiplies', () => expect(evaluateExpression('6*7')).toBe(42));
  it('divides', () => expect(evaluateExpression('10/2')).toBe(5));
  it('respects precedence', () => expect(evaluateExpression('2+3*4')).toBe(14));
  it('handles decimals', () => expect(evaluateExpression('1.5+2.5')).toBe(4));
  it('ignores whitespace', () => expect(evaluateExpression(' 2 + 2 ')).toBe(4));
  it('unary minus negates', () => expect(evaluateExpression('-5+2')).toBe(-3));
  it('unary minus after operator', () => expect(evaluateExpression('3*-2')).toBe(-6));
});

describe('engine — nCr / nPr', () => {
  it('5C2 = 10', () => expect(evaluateExpression('5C2')).toBe(10));
  it('5P2 = 20', () => expect(evaluateExpression('5P2')).toBe(20));
  it('nCr binds tighter than *', () => expect(evaluateExpression('2*5C2')).toBe(20));
  it('6C0 = 1', () => expect(evaluateExpression('6C0')).toBe(1));
  it('6C6 = 1', () => expect(evaluateExpression('6C6')).toBe(1));
  it('10P3 = 720', () => expect(evaluateExpression('10P3')).toBe(720));
  it('combination(5,2) = 10', () => expect(combination(5, 2)).toBe(10));
  it('permutation(5,2) = 20', () => expect(permutation(5, 2)).toBe(20));
});

describe('engine — errors', () => {
  it('throws on empty', () => expect(() => evaluateExpression('')).toThrow());
  it('throws on whitespace only', () => expect(() => evaluateExpression('   ')).toThrow());
  it('throws on garbage', () => expect(() => evaluateExpression('2+@')).toThrow());
  it('throws on divide-by-zero (non-finite)', () => expect(() => evaluateExpression('5/0')).toThrow());
  it('throws on invalid nCr operands', () => expect(() => evaluateExpression('2C5')).toThrow());
});
```

- [ ] **Step 2: `npm run test:unit`** — FAIL (module not found).

- [ ] **Step 3: Create `src/calc/engine.ts`** (faithful ESM port of `src/calculator.js`):

```ts
// Pure expression engine — tokenize → shunting-yard → RPN, with the retained
// nCr ('C') and nPr ('P') operators. ESM port of src/calculator.js (which
// stays the CommonJS source for the standalone /calculator/ page + its Jest
// tests); this copy serves the bundled journey app and is Vitest-verified.

export function permutation(n: number, r: number): number {
  if (!Number.isInteger(n) || !Number.isInteger(r) || n < 0 || r < 0 || r > n) {
    throw new Error('Invalid nPr operands');
  }
  let result = 1;
  for (let i = n; i > n - r; i--) result *= i;
  return result;
}

export function combination(n: number, r: number): number {
  if (!Number.isInteger(n) || !Number.isInteger(r) || n < 0 || r < 0 || r > n) {
    throw new Error('Invalid nCr operands');
  }
  const k = Math.min(r, n - r);
  let num = 1;
  let den = 1;
  for (let i = 0; i < k; i++) {
    num *= n - i;
    den *= i + 1;
  }
  return num / den;
}

interface OpDef {
  prec: number;
  assoc: 'L' | 'R';
  unary?: boolean;
  fn: (a: number, b?: number) => number;
}

const OPERATORS: Record<string, OpDef> = {
  '+': { prec: 2, assoc: 'L', fn: (a, b) => a + (b as number) },
  '-': { prec: 2, assoc: 'L', fn: (a, b) => a - (b as number) },
  '*': { prec: 3, assoc: 'L', fn: (a, b) => a * (b as number) },
  '/': { prec: 3, assoc: 'L', fn: (a, b) => a / (b as number) },
  C: { prec: 4, assoc: 'L', fn: (n, r) => combination(n, r as number) },
  P: { prec: 4, assoc: 'L', fn: (n, r) => permutation(n, r as number) },
  'u-': { prec: 5, assoc: 'R', unary: true, fn: (a) => -a },
};

type Token = { type: 'num'; value: number } | { type: 'op'; value: string };

export function tokenize(expr: string): Token[] {
  const tokens: Token[] = [];
  const s = String(expr).replace(/\s+/g, '');
  const prev = (): Token | undefined => tokens[tokens.length - 1];
  const unaryContext = (): boolean => {
    const p = prev();
    return !p || p.type === 'op';
  };
  let i = 0;
  while (i < s.length) {
    const ch = s[i];
    if (/[0-9.]/.test(ch)) {
      let num = '';
      while (i < s.length && /[0-9.]/.test(s[i])) num += s[i++];
      if ((num.match(/\./g) || []).length > 1) throw new Error('Invalid number: ' + num);
      tokens.push({ type: 'num', value: parseFloat(num) });
      continue;
    }
    if (ch === '+' || ch === '-') {
      if (unaryContext()) {
        if (ch === '-') tokens.push({ type: 'op', value: 'u-' });
      } else {
        tokens.push({ type: 'op', value: ch });
      }
      i++;
      continue;
    }
    if (ch === '*' || ch === '/' || ch === 'C' || ch === 'P') {
      tokens.push({ type: 'op', value: ch });
      i++;
      continue;
    }
    throw new Error('Unexpected character: ' + ch);
  }
  return tokens;
}

export function toRPN(tokens: Token[]): Token[] {
  const out: Token[] = [];
  const stack: Token[] = [];
  for (const t of tokens) {
    if (t.type === 'num') {
      out.push(t);
    } else {
      const o1 = OPERATORS[t.value];
      while (stack.length) {
        const o2 = OPERATORS[stack[stack.length - 1].value];
        if (o2.prec > o1.prec || (o2.prec === o1.prec && o1.assoc === 'L')) {
          out.push(stack.pop() as Token);
        } else {
          break;
        }
      }
      stack.push(t);
    }
  }
  while (stack.length) out.push(stack.pop() as Token);
  return out;
}

export function evalRPN(rpn: Token[]): number {
  const stack: number[] = [];
  for (const t of rpn) {
    if (t.type === 'num') {
      stack.push(t.value);
      continue;
    }
    const op = OPERATORS[t.value];
    if (op.unary) {
      if (stack.length < 1) throw new Error('Invalid expression');
      stack.push(op.fn(stack.pop() as number));
    } else {
      if (stack.length < 2) throw new Error('Invalid expression');
      const b = stack.pop() as number;
      const a = stack.pop() as number;
      stack.push(op.fn(a, b));
    }
  }
  if (stack.length !== 1) throw new Error('Invalid expression');
  return stack[0];
}

export function evaluateExpression(expr: string): number {
  if (expr === null || expr === undefined || String(expr).trim() === '') {
    throw new Error('Empty expression');
  }
  const tokens = tokenize(expr);
  if (tokens.length === 0) throw new Error('Empty expression');
  const result = evalRPN(toRPN(tokens));
  if (!Number.isFinite(result)) throw new Error('Math error');
  return result;
}
```

- [ ] **Step 4: `npm run test:unit`** — PASS (~57 tests, 6 files). `npm run typecheck` → 0.

- [ ] **Step 5: Commit**
```bash
git add src/calc/engine.ts tests/journey/calc-engine.test.ts
git commit -m "feat: add Vitest-tested ESM calc engine for the native window"
```

---

### Task 2: CalcWindow (`src/calc/window.ts`)

**Files:**
- Create: `src/calc/window.ts`

No unit tests (DOM/interaction); gate is typecheck + build + browser pass in Task 4.

- [ ] **Step 1: Create `src/calc/window.ts`:**

```ts
import { evaluateExpression } from './engine';

const MIN_W = 260;
const MIN_H = 360;

interface Key {
  label: string;
  /** Action: digit/dot (append), op (append operator token), or a command. */
  kind: 'val' | 'op' | 'ac' | 'ce' | 'eq';
  token?: string; // for val/op
  cls?: string; // extra button class
}

const KEYS: Key[] = [
  { label: 'AC', kind: 'ac', cls: 'k-act' },
  { label: 'CE', kind: 'ce', cls: 'k-act' },
  { label: 'nCr', kind: 'op', token: 'C', cls: 'k-fn' },
  { label: 'nPr', kind: 'op', token: 'P', cls: 'k-fn' },
  { label: '7', kind: 'val', token: '7' },
  { label: '8', kind: 'val', token: '8' },
  { label: '9', kind: 'val', token: '9' },
  { label: '÷', kind: 'op', token: '/', cls: 'k-op' },
  { label: '4', kind: 'val', token: '4' },
  { label: '5', kind: 'val', token: '5' },
  { label: '6', kind: 'val', token: '6' },
  { label: '×', kind: 'op', token: '*', cls: 'k-op' },
  { label: '1', kind: 'val', token: '1' },
  { label: '2', kind: 'val', token: '2' },
  { label: '3', kind: 'val', token: '3' },
  { label: '−', kind: 'op', token: '-', cls: 'k-op' },
  { label: '0', kind: 'val', token: '0' },
  { label: '.', kind: 'val', token: '.' },
  { label: '=', kind: 'eq', cls: 'k-eq' },
  { label: '+', kind: 'op', token: '+', cls: 'k-op' },
];

/**
 * Self-contained draggable / resizable / minimizable calculator window.
 * Renders its own neumorphic keypad and runs the shared ESM engine.
 */
export class CalcWindow {
  readonly element: HTMLElement;
  private readonly display: HTMLInputElement;
  private expr = '';
  private opened = false;

  constructor(private readonly onClose: () => void) {
    const el = document.createElement('aside');
    el.className = 'calc-win hidden';
    el.innerHTML = `
      <div class="calc-win-bar">
        <span class="calc-win-title">🧮 SEN Calculator</span>
        <div class="calc-win-btns">
          <button class="calc-win-min" aria-label="Minimize">–</button>
          <button class="calc-win-close" aria-label="Close">×</button>
        </div>
      </div>
      <div class="calc-win-body">
        <input class="calc-win-display" type="text" value="0" readonly aria-label="Display" />
        <div class="calc-keys">
          ${KEYS.map(
            (k, i) =>
              `<button class="calc-key ${k.cls ?? ''}" data-i="${i}">${k.label}</button>`,
          ).join('')}
        </div>
      </div>
      <div class="calc-win-resize" aria-hidden="true"></div>`;
    this.element = el;
    this.display = el.querySelector<HTMLInputElement>('.calc-win-display')!;

    el.querySelector('.calc-win-close')!.addEventListener('click', () => this.close());
    el.querySelector('.calc-win-min')!.addEventListener('click', () =>
      el.classList.toggle('minimized'),
    );

    const keys = el.querySelector<HTMLElement>('.calc-keys')!;
    keys.addEventListener('click', (e) => {
      const btn = (e.target as HTMLElement).closest<HTMLElement>('.calc-key');
      if (!btn) return;
      this.press(KEYS[Number(btn.dataset.i)]);
    });

    this.initDrag(el.querySelector<HTMLElement>('.calc-win-bar')!);
    this.initResize(el.querySelector<HTMLElement>('.calc-win-resize')!);
    window.addEventListener('keydown', (e) => this.onKey(e));
  }

  open(): void {
    this.opened = true;
    this.element.classList.remove('hidden', 'minimized');
  }

  close(): void {
    if (!this.opened) return;
    this.opened = false;
    this.element.classList.add('hidden');
    this.onClose();
  }

  isOpen(): boolean {
    return this.opened;
  }

  // ── Calculator behavior (mirrors the standalone page's script.js) ──
  private press(k: Key): void {
    if (k.kind === 'val' || k.kind === 'op') this.expr += k.token ?? '';
    else if (k.kind === 'ac') this.expr = '';
    else if (k.kind === 'ce') this.clearEntry();
    else if (k.kind === 'eq') this.evaluate();
    this.render();
  }

  private clearEntry(): void {
    if (!this.expr) return;
    const stripped = this.expr.replace(/[0-9.]+$/, '');
    this.expr = stripped !== this.expr ? stripped : this.expr.slice(0, -1);
  }

  private evaluate(): void {
    if (!this.expr) return;
    try {
      this.expr = String(evaluateExpression(this.expr));
    } catch {
      this.expr = 'Error';
    }
  }

  private render(): void {
    this.display.value = this.expr || '0';
  }

  private onKey(e: KeyboardEvent): void {
    if (!this.opened || this.element.classList.contains('minimized')) return;
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const k = e.key;
    if (k >= '0' && k <= '9') this.expr += k;
    else if (k === '.') this.expr += '.';
    else if (k === '+' || k === '-' || k === '*' || k === '/') this.expr += k;
    else if (k === 'Enter' || k === '=') {
      e.preventDefault();
      this.evaluate();
    } else if (k === 'Backspace') this.expr = this.expr.slice(0, -1);
    else if (k === 'Escape') this.expr = ''; // AC (does NOT close the window)
    else if (k === 'Delete') this.clearEntry();
    else return;
    e.stopPropagation();
    this.render();
  }

  // ── Window interactions ──
  private initDrag(bar: HTMLElement): void {
    let id: number | null = null;
    let ox = 0;
    let oy = 0;
    bar.addEventListener('pointerdown', (e) => {
      if ((e.target as HTMLElement).closest('button')) return; // not the min/close
      const r = this.element.getBoundingClientRect();
      // Switch from right/transform anchoring to explicit left/top on first drag.
      this.element.style.left = `${r.left}px`;
      this.element.style.top = `${r.top}px`;
      this.element.style.right = 'auto';
      this.element.style.transform = 'none';
      ox = e.clientX - r.left;
      oy = e.clientY - r.top;
      id = e.pointerId;
      bar.setPointerCapture(id);
    });
    bar.addEventListener('pointermove', (e) => {
      if (e.pointerId !== id) return;
      const w = this.element.offsetWidth;
      const h = this.element.offsetHeight;
      const x = Math.max(0, Math.min(window.innerWidth - w, e.clientX - ox));
      const y = Math.max(0, Math.min(window.innerHeight - 40, e.clientY - oy));
      this.element.style.left = `${x}px`;
      this.element.style.top = `${y}px`;
    });
    const end = (e: PointerEvent): void => {
      if (e.pointerId === id) id = null;
    };
    bar.addEventListener('pointerup', end);
    bar.addEventListener('pointercancel', end);
  }

  private initResize(handle: HTMLElement): void {
    let id: number | null = null;
    let sx = 0;
    let sy = 0;
    let sw = 0;
    let sh = 0;
    handle.addEventListener('pointerdown', (e) => {
      const r = this.element.getBoundingClientRect();
      sx = e.clientX;
      sy = e.clientY;
      sw = r.width;
      sh = r.height;
      id = e.pointerId;
      handle.setPointerCapture(id);
      e.stopPropagation();
    });
    handle.addEventListener('pointermove', (e) => {
      if (e.pointerId !== id) return;
      this.element.style.width = `${Math.max(MIN_W, Math.min(window.innerWidth, sw + e.clientX - sx))}px`;
      this.element.style.height = `${Math.max(MIN_H, Math.min(window.innerHeight, sh + e.clientY - sy))}px`;
    });
    const end = (e: PointerEvent): void => {
      if (e.pointerId === id) id = null;
    };
    handle.addEventListener('pointerup', end);
    handle.addEventListener('pointercancel', end);
  }
}
```

- [ ] **Step 2: Verify** — `npm run typecheck` 0; `npm run test:unit` (~57) pass; `npm run build` success (module unused by app yet — fine).

- [ ] **Step 3: Commit**
```bash
git add src/calc/window.ts
git commit -m "feat: native draggable/resizable/minimizable CalcWindow with neumorphic keypad"
```

---

### Task 3: Overlay integration + window CSS

**Files:**
- Modify: `src/ui/overlay.ts`
- Modify: `src/ui/journey.css`

- [ ] **Step 1: `src/ui/overlay.ts` — import CalcWindow.** Add after the existing imports (after the `import type { Mode }...` line):
```ts
import { CalcWindow } from '../calc/window';
```

- [ ] **Step 2: `src/ui/overlay.ts` — remove the iframe modal markup.** In the `root.innerHTML` template, delete the entire `<aside class="calc-modal hidden">…</aside>` block (the header strip + `<iframe class="calc-frame">`), but KEEP the `<div class="irvin-bubble hidden">…</div>` line that follows it.

- [ ] **Step 3: `src/ui/overlay.ts` — replace the calc element refs + open/close logic.** Delete these now-stale lines from the element-lookup region:
```ts
  const calcModal = root.querySelector<HTMLElement>('.calc-modal')!;
  const calcFrame = root.querySelector<HTMLIFrameElement>('.calc-frame')!;
```
and delete the entire `openCalc` / `closeCalc` functions plus the `[data-calc]` loop, the `.calc-modal-close` listener, the `window.addEventListener('keydown', … Escape … closeCalc)` handler, and the `window.addEventListener('message', … 'vj-close-calc' …)` handler. Replace ALL of that removed block with:
```ts
  const calcWindow = new CalcWindow(() => {
    setFollow(false);
    onCalc(false);
  });
  root.appendChild(calcWindow.element);

  function openCalc(): void {
    if (calcWindow.isOpen()) return;
    calcWindow.open();
    onCalc(true); // main → explore mode
    setFollow(true); // camera tracks the roaming Irvin behind the window
  }
  for (const b of root.querySelectorAll<HTMLElement>('[data-calc]')) {
    b.addEventListener('click', openCalc);
  }
```

- [ ] **Step 4: `src/ui/overlay.ts` — keep the mode-button dismissal working with the new window.** In the `modeButtons` click loop, replace the calc-dismissal block:
```ts
      if (calcOpen) {
        calcOpen = false;
        calcModal.classList.add('hidden');
        setFollow(false);
      }
```
with:
```ts
      if (calcWindow.isOpen()) {
        calcWindow.close(); // close() already calls setFollow(false) + onCalc(false)
      }
```
(Also delete the now-unused `let calcOpen = false;` declaration.)

- [ ] **Step 5: `src/ui/journey.css` — remove the old modal styles.** Delete the entire `/* ── Calculator popup (glass side-card) ── */` block: the `.calc-modal`, `.calc-modal.hidden`, `.calc-modal-head`, `.calc-modal-close`, `.calc-frame` rules AND the `.calc-modal` entry inside the mobile `@media (max-width: 640px)` block. Also remove `.calc-modal,` from the pointer-events re-enable selector group and replace it with `.calc-win,`.

- [ ] **Step 6: `src/ui/journey.css` — append the window styles at the end of the file:**
```css
/* ── Native calculator window ──────────────────────────────────── */

.calc-win {
  position: fixed;
  top: 50%;
  right: 1.6rem;
  transform: translateY(-50%);
  width: 300px;
  height: 440px;
  display: flex;
  flex-direction: column;
  background: rgba(8, 42, 26, 0.72);
  border: 1px solid rgba(150, 255, 190, 0.3);
  border-radius: 18px;
  box-shadow: 0 24px 60px rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(16px);
  overflow: hidden;
  z-index: 8;
  transition: opacity 0.25s;
}

.calc-win.hidden {
  opacity: 0;
  pointer-events: none;
}

.calc-win.minimized {
  height: auto !important;
}

.calc-win.minimized .calc-win-body,
.calc-win.minimized .calc-win-resize {
  display: none;
}

.calc-win-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.55rem 0.5rem 0.55rem 0.9rem;
  cursor: grab;
  touch-action: none;
  user-select: none;
  font: 700 0.82rem 'Sora', sans-serif;
  color: #d8ffe9;
  border-bottom: 1px solid rgba(150, 255, 190, 0.18);
}

.calc-win-bar:active {
  cursor: grabbing;
}

.calc-win-btns {
  display: flex;
  gap: 0.25rem;
}

.calc-win-min,
.calc-win-close {
  width: 28px;
  height: 28px;
  border-radius: 8px;
  border: none;
  background: rgba(150, 255, 190, 0.12);
  color: #d8ffe9;
  font-size: 1rem;
  line-height: 1;
  cursor: pointer;
}

.calc-win-close:hover {
  background: rgba(255, 120, 120, 0.4);
}

.calc-win-min:hover {
  background: rgba(150, 255, 190, 0.3);
}

.calc-win-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  padding: 0.7rem;
  min-height: 0;
}

.calc-win-display {
  width: 100%;
  height: 56px;
  flex: none;
  border: none;
  border-radius: 12px;
  background: rgba(4, 26, 16, 0.55);
  box-shadow: inset 3px 3px 8px rgba(0, 0, 0, 0.45), inset -2px -2px 6px rgba(120, 220, 170, 0.06);
  color: #eafff3;
  font: 600 1.7rem 'JetBrains Mono', monospace;
  text-align: right;
  padding: 0 0.8rem;
}

.calc-keys {
  flex: 1;
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 0.45rem;
  min-height: 0;
}

.calc-key {
  border: none;
  border-radius: 12px;
  background: rgba(20, 70, 46, 0.9);
  color: #eafff3;
  font: 600 1rem 'Sora', sans-serif;
  cursor: pointer;
  box-shadow: 3px 3px 7px rgba(0, 0, 0, 0.4), -2px -2px 6px rgba(120, 220, 170, 0.08);
  transition: transform 0.08s, box-shadow 0.08s;
}

.calc-key:active {
  transform: scale(0.96);
  box-shadow: inset 3px 3px 7px rgba(0, 0, 0, 0.45), inset -2px -2px 6px rgba(120, 220, 170, 0.06);
}

.calc-key.k-op {
  color: #a3e635;
}

.calc-key.k-fn {
  color: #5eead4;
  font-size: 0.85rem;
}

.calc-key.k-act {
  color: #ff9f87;
  font-size: 0.85rem;
}

.calc-key.k-eq {
  background: linear-gradient(135deg, #1f9861, #157a4c);
  color: #06281a;
}

.calc-win-resize {
  position: absolute;
  right: 2px;
  bottom: 2px;
  width: 16px;
  height: 16px;
  cursor: nwse-resize;
  touch-action: none;
  background: linear-gradient(135deg, transparent 50%, rgba(150, 255, 190, 0.5) 50%);
  border-radius: 0 0 14px 0;
}

@media (max-width: 640px) {
  .calc-win {
    right: 50%;
    transform: translate(50%, -50%);
    width: min(340px, 92vw);
    height: min(460px, 80vh);
  }
}
```

- [ ] **Step 7: Verify**
```bash
npm run typecheck && npm run test:unit && npm test && npm run lint && npm run build
```
All pass (~57 vitest + 25 jest). Then dev smoke:
```bash
(npm run dev > /tmp/cw.log 2>&1 &) ; sleep 4
curl -s -o /dev/null -w "journey %{http_code}\n" http://localhost:5173/
pkill -f vite
```

- [ ] **Step 8: Commit**
```bash
git add src/ui/overlay.ts src/ui/journey.css
git commit -m "feat: mount native CalcWindow in overlay; drop the iframe popup"
```

---

### Task 4: Final verification

- [ ] **Step 1: Full gates**
```bash
npm run lint && npm test && npm run test:unit && npm run typecheck && npm run build
```
Expected: 25 jest + ~57 vitest, all exit 0.

- [ ] **Step 2: Browser verification (controller runs the Playwright harness):**
  - Click **Calculator** → a compact green window appears (right/centered) over the live grove with Irvin wandering behind it.
  - Compute via clicks: `7 × 8 =` shows `56`; `5 nCr 2 =` shows `10`. Then via keyboard: type `9*9` Enter → `81`. `AC` and `CE` behave (CE strips the trailing number).
  - **Drag** the title bar → the window moves and stays on screen.
  - **Resize** from the bottom-right corner → window grows/shrinks, keys stay aligned in a 4-col grid, no scrollbar, clamped at the minimum.
  - **Minimize** (–) → collapses to the title bar; click again → restores.
  - **✕** closes and returns to journey (follow released).
  - 390×844 mobile: window opens centered and compact; keys aligned.
  - Standalone `/calculator/` still works unchanged. Zero console errors.

- [ ] **Step 3: Repo hygiene** — `git status --short` shows only the owner's pre-existing untracked/deleted items.

Merge/deploy decision via superpowers:finishing-a-development-branch (NOT part of this plan).
