import { describe, it, expect } from 'vitest';
import { climbStateAt, APPROACH_SECS, CLIMB_RATE, PAUSE_SECS } from '../../src/journey/climb';

const LEVEL_Y = [6, 13, 20, 27];
const TRUNK_HEIGHT = 32;

describe('climbStateAt', () => {
  it('starts with a ground approach', () => {
    expect(climbStateAt(0, LEVEL_Y, TRUNK_HEIGHT)).toMatchObject({ phase: 'approach', height: 0, done: false });
    const mid = climbStateAt(APPROACH_SECS / 2, LEVEL_Y, TRUNK_HEIGHT);
    expect(mid.phase).toBe('approach');
    expect(mid.approachT).toBeCloseTo(0.5);
  });

  it('pauses exactly once at each level ring, in order', () => {
    const seen: number[] = [];
    for (let s = 0; s <= 60; s += 0.05) {
      const st = climbStateAt(s, LEVEL_Y, TRUNK_HEIGHT);
      if (st.phase === 'pause' && seen[seen.length - 1] !== st.pauseLevel) seen.push(st.pauseLevel);
    }
    expect(seen).toEqual([0, 1, 2, 3]);
  });

  it('pause heights equal the level ring heights', () => {
    for (let s = 0; s <= 60; s += 0.05) {
      const st = climbStateAt(s, LEVEL_Y, TRUNK_HEIGHT);
      if (st.phase === 'pause') expect(LEVEL_Y[st.pauseLevel]).toBe(st.height);
    }
  });

  it('height never decreases', () => {
    let last = -1;
    for (let s = 0; s <= 60; s += 0.05) {
      const h = climbStateAt(s, LEVEL_Y, TRUNK_HEIGHT).height;
      expect(h).toBeGreaterThanOrEqual(last);
      last = h;
    }
  });

  it('terminates at the crown and stays there', () => {
    const total =
      APPROACH_SECS + TRUNK_HEIGHT / CLIMB_RATE + LEVEL_Y.length * PAUSE_SECS;
    const end = climbStateAt(total + 1, LEVEL_Y, TRUNK_HEIGHT);
    expect(end).toMatchObject({ phase: 'crown', height: TRUNK_HEIGHT, done: true });
    expect(climbStateAt(total + 100, LEVEL_Y, TRUNK_HEIGHT).phase).toBe('crown');
  });
});
