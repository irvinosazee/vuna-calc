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
        <span class="calc-win-title">🧮 SEN 482 Calculator</span>
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
