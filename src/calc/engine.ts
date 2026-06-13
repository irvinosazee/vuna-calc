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
