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
