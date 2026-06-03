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
