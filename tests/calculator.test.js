const { evaluateExpression, computePercent } = require('../src/calculator');

describe('evaluateExpression — basic arithmetic', () => {
  it('adds', () => expect(evaluateExpression('2+3')).toBe(5));
  it('subtracts', () => expect(evaluateExpression('10-4')).toBe(6));
  it('multiplies', () => expect(evaluateExpression('6*7')).toBe(42));
  it('divides', () => expect(evaluateExpression('10/2')).toBe(5));
  it('respects precedence', () => expect(evaluateExpression('2+3*4')).toBe(14));
  it('respects parentheses', () => expect(evaluateExpression('(1+2)*3')).toBe(9));
  it('handles decimals', () => expect(evaluateExpression('1.5+2.5')).toBe(4));
  it('ignores whitespace', () => expect(evaluateExpression(' 2 + 2 ')).toBe(4));
});

describe('evaluateExpression — power, unary, constants, functions', () => {
  it('exponentiates', () => expect(evaluateExpression('2**3')).toBe(8));
  it('exponent is right-associative', () => expect(evaluateExpression('2**2**3')).toBe(256));
  it('unary minus negates', () => expect(evaluateExpression('-5+2')).toBe(-3));
  it('unary minus after operator', () => expect(evaluateExpression('3*-2')).toBe(-6));
  it('exponent binds tighter than unary minus', () => expect(evaluateExpression('-2**2')).toBe(-4));
  it('parenthesised negative power', () => expect(evaluateExpression('(-2)**2')).toBe(4));
  it('knows pi', () => expect(evaluateExpression('pi')).toBeCloseTo(Math.PI, 10));
  it('knows e', () => expect(evaluateExpression('e')).toBeCloseTo(Math.E, 10));
  it('computes degree sine', () => expect(evaluateExpression('sin(30)')).toBeCloseTo(0.5, 10));
  it('computes degree cosine', () => expect(evaluateExpression('cos(60)')).toBeCloseTo(0.5, 10));
  it('computes sqrt', () => expect(evaluateExpression('sqrt(9)')).toBe(3));
  it('substitutes ans', () => expect(evaluateExpression('ans+1', 41)).toBe(42));
});

describe('evaluateExpression — errors', () => {
  it('throws on division by zero (non-finite)', () => expect(() => evaluateExpression('1/0')).toThrow());
  it('throws on trailing operator', () => expect(() => evaluateExpression('3+')).toThrow());
  it('throws on unbalanced open paren', () => expect(() => evaluateExpression('(1+2')).toThrow());
  it('throws on unbalanced close paren', () => expect(() => evaluateExpression('1+2)')).toThrow());
  it('throws on empty input', () => expect(() => evaluateExpression('')).toThrow());
  it('throws on unknown identifier', () => expect(() => evaluateExpression('foo(2)')).toThrow());
});

describe('computePercent', () => {
  it('bare number becomes a fraction', () => expect(computePercent('50')).toBe('0.5'));
  it('addition: percent is relative to the left value', () => {
    expect(evaluateExpression(computePercent('100+10'))).toBeCloseTo(110, 10);
  });
  it('subtraction: percent is relative to the left value', () => {
    expect(evaluateExpression(computePercent('100-10'))).toBeCloseTo(90, 10);
  });
  it('multiplication: percent is the literal fraction', () => {
    expect(evaluateExpression(computePercent('200*50'))).toBeCloseTo(100, 10);
  });
  it('returns input unchanged when it cannot parse', () => expect(computePercent('')).toBe(''));
});

describe('evaluateExpression — additional math functions', () => {
  it('computes natural log', () => expect(evaluateExpression('ln(e)')).toBeCloseTo(1, 10));
  it('computes log base 10', () => expect(evaluateExpression('log(100)')).toBeCloseTo(2, 10));
  it('computes asin in degrees', () => expect(evaluateExpression('asin(1)')).toBeCloseTo(90, 10));
  it('computes acos in degrees', () => expect(evaluateExpression('acos(1)')).toBeCloseTo(0, 10));
  it('computes atan in degrees', () => expect(evaluateExpression('atan(1)')).toBeCloseTo(45, 10));
  it('computes tan', () => expect(evaluateExpression('tan(45)')).toBeCloseTo(1, 5));
  it('throws on invalid number with multiple dots', () => expect(() => evaluateExpression('1.2.3')).toThrow());
});
