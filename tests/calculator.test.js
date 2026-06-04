const {
  evaluateExpression,
  combination,
  permutation,
} = require('../src/calculator');

describe('evaluateExpression — basic arithmetic', () => {
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

describe('evaluateExpression — nCr / nPr', () => {
  it('combination 5C2 = 10', () => expect(evaluateExpression('5C2')).toBe(10));
  it('permutation 5P2 = 20', () => expect(evaluateExpression('5P2')).toBe(20));
  it('nCr binds tighter than *', () => expect(evaluateExpression('2*5C2')).toBe(20));
  it('6C0 = 1', () => expect(evaluateExpression('6C0')).toBe(1));
  it('6C6 = 1', () => expect(evaluateExpression('6C6')).toBe(1));
  it('10P3 = 720', () => expect(evaluateExpression('10P3')).toBe(720));
});

describe('combination / permutation helpers', () => {
  it('combination(5,2) = 10', () => expect(combination(5, 2)).toBe(10));
  it('permutation(5,2) = 20', () => expect(permutation(5, 2)).toBe(20));
  it('combination is symmetric: C(8,3) = C(8,5)', () =>
    expect(combination(8, 3)).toBe(combination(8, 5)));
});

describe('evaluateExpression — errors', () => {
  it('throws on division by zero', () => expect(() => evaluateExpression('1/0')).toThrow());
  it('throws on trailing operator', () => expect(() => evaluateExpression('3+')).toThrow());
  it('throws on empty input', () => expect(() => evaluateExpression('')).toThrow());
  it('throws on unexpected character', () => expect(() => evaluateExpression('2&3')).toThrow());
  it('nCr rejects r > n', () => expect(() => evaluateExpression('5C7')).toThrow());
  it('nCr rejects non-integer', () => expect(() => evaluateExpression('2.5C1')).toThrow());
  it('nPr rejects negatives', () => expect(() => evaluateExpression('-5P2')).toThrow());
});
