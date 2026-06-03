'use strict';

const CONSTANTS = { pi: Math.PI, e: Math.E };

const FUNCTIONS = {
  sin: (x) => Math.sin((x * Math.PI) / 180),
  cos: (x) => Math.cos((x * Math.PI) / 180),
  tan: (x) => {
    const rad = (x * Math.PI) / 180;
    if (Math.abs(Math.cos(rad)) < 1e-12) throw new Error('Math error');
    return Math.tan(rad);
  },
  asin: (x) => (Math.asin(x) * 180) / Math.PI,
  acos: (x) => (Math.acos(x) * 180) / Math.PI,
  atan: (x) => (Math.atan(x) * 180) / Math.PI,
  sqrt: (x) => Math.sqrt(x),
  ln: (x) => Math.log(x),
  log: (x) => Math.log10(x),
};

const OPERATORS = {
  '+':  { prec: 2, assoc: 'L', args: 2, fn: (a, b) => a + b },
  '-':  { prec: 2, assoc: 'L', args: 2, fn: (a, b) => a - b },
  '*':  { prec: 3, assoc: 'L', args: 2, fn: (a, b) => a * b },
  '/':  { prec: 3, assoc: 'L', args: 2, fn: (a, b) => a / b },
  '**': { prec: 4, assoc: 'R', args: 2, fn: (a, b) => a ** b },
  'u-': { prec: 4, assoc: 'R', args: 1, fn: (a) => -a },
};

function tokenize(expr, consts) {
  const tokens = [];
  const s = String(expr).replace(/\s+/g, '');
  const prev = () => tokens[tokens.length - 1];
  const unaryContext = () => {
    const p = prev();
    return !p || p.type === 'op' || p.type === 'lparen';
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
    if (/[a-zA-Z]/.test(ch)) {
      let id = '';
      while (i < s.length && /[a-zA-Z]/.test(s[i])) id += s[i++];
      if (Object.prototype.hasOwnProperty.call(FUNCTIONS, id)) {
        tokens.push({ type: 'func', value: id });
      } else if (Object.prototype.hasOwnProperty.call(consts, id)) {
        tokens.push({ type: 'num', value: consts[id] });
      } else {
        throw new Error('Unknown identifier: ' + id);
      }
      continue;
    }
    if (ch === '*' && s[i + 1] === '*') { tokens.push({ type: 'op', value: '**' }); i += 2; continue; }
    if (ch === '+' || ch === '-') {
      if (unaryContext()) { if (ch === '-') tokens.push({ type: 'op', value: 'u-' }); }
      else tokens.push({ type: 'op', value: ch });
      i++; continue;
    }
    if (ch === '*' || ch === '/') { tokens.push({ type: 'op', value: ch }); i++; continue; }
    if (ch === '(') { tokens.push({ type: 'lparen' }); i++; continue; }
    if (ch === ')') { tokens.push({ type: 'rparen' }); i++; continue; }
    throw new Error('Unexpected character: ' + ch);
  }
  return tokens;
}

function toRPN(tokens) {
  const out = [];
  const stack = [];
  for (const t of tokens) {
    if (t.type === 'num') {
      out.push(t);
    } else if (t.type === 'func') {
      stack.push(t);
    } else if (t.type === 'op') {
      const o1 = OPERATORS[t.value];
      while (stack.length) {
        const top = stack[stack.length - 1];
        if (top.type !== 'op') break;
        const o2 = OPERATORS[top.value];
        if (o2.prec > o1.prec || (o2.prec === o1.prec && o1.assoc === 'L')) out.push(stack.pop());
        else break;
      }
      stack.push(t);
    } else if (t.type === 'lparen') {
      stack.push(t);
    } else if (t.type === 'rparen') {
      while (stack.length && stack[stack.length - 1].type !== 'lparen') out.push(stack.pop());
      if (!stack.length) throw new Error('Mismatched parentheses');
      stack.pop();
      if (stack.length && stack[stack.length - 1].type === 'func') out.push(stack.pop());
    }
  }
  while (stack.length) {
    const top = stack.pop();
    if (top.type === 'lparen') throw new Error('Mismatched parentheses');
    out.push(top);
  }
  return out;
}

function evalRPN(rpn) {
  const stack = [];
  for (const t of rpn) {
    if (t.type === 'num') {
      stack.push(t.value);
    } else if (t.type === 'op') {
      const op = OPERATORS[t.value];
      if (op.args === 1) {
        if (stack.length < 1) throw new Error('Invalid expression');
        stack.push(op.fn(stack.pop()));
      } else {
        if (stack.length < 2) throw new Error('Invalid expression');
        const b = stack.pop();
        const a = stack.pop();
        stack.push(op.fn(a, b));
      }
    } else if (t.type === 'func') {
      if (stack.length < 1) throw new Error('Invalid expression');
      stack.push(FUNCTIONS[t.value](stack.pop()));
    }
  }
  if (stack.length !== 1) throw new Error('Invalid expression');
  return stack[0];
}

function evaluateExpression(expr, lastResult = 0) {
  if (expr === null || expr === undefined || String(expr).trim() === '') {
    throw new Error('Empty expression');
  }
  const consts = Object.assign({}, CONSTANTS, { ans: Number(lastResult) || 0 });
  const tokens = tokenize(expr, consts);
  if (tokens.length === 0) throw new Error('Empty expression');
  const result = evalRPN(toRPN(tokens));
  if (!Number.isFinite(result)) throw new Error('Math error');
  return result;
}

function computePercent(expr) {
  if (!expr) return expr;
  const m = String(expr).match(/^(.*?)([+\-*/])([0-9.]+)$/);
  if (!m) {
    const n = parseFloat(expr);
    if (Number.isNaN(n)) return expr;
    return String(n / 100);
  }
  const [, leftExpr, op, rightNum] = m;
  const right = parseFloat(rightNum);
  let leftVal;
  try {
    leftVal = evaluateExpression(leftExpr);
  } catch {
    return expr;
  }
  const percentValue = (op === '+' || op === '-') ? (leftVal * right) / 100 : right / 100;
  return `${leftExpr}${op}${percentValue}`;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { tokenize, toRPN, evalRPN, evaluateExpression, computePercent };
}
