const { evaluateExpression } = require('../src/calculator');

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
