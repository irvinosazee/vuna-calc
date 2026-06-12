import { describe, it, expect } from 'vitest';
import { buildLayout, pseudoRandom, trunkPointAt } from '../../src/journey/layout';
import { levels, allCourses } from '../../src/data/journey';

describe('buildLayout', () => {
  const layout = buildLayout(levels);

  it('creates one leaf per course', () => {
    expect(layout.leaves).toHaveLength(allCourses.length);
  });

  it('creates one limb per semester', () => {
    expect(layout.limbs).toHaveLength(levels.reduce((s, l) => s + l.semesters.length, 0));
  });

  it('stacks level heights ascending, below the trunk top', () => {
    const ys = layout.levelY;
    expect(ys).toHaveLength(4);
    for (let i = 1; i < ys.length; i++) expect(ys[i]).toBeGreaterThan(ys[i - 1]);
    expect(layout.trunkHeight).toBeGreaterThan(ys[ys.length - 1]);
  });

  it('produces finite coordinates everywhere', () => {
    const all = [
      ...layout.leaves.map((l) => l.pos),
      ...layout.cameraPoints,
      ...layout.limbs.flatMap((l) => [l.start, l.end]),
    ];
    for (const p of all) {
      expect(Number.isFinite(p.x) && Number.isFinite(p.y) && Number.isFinite(p.z)).toBe(true);
    }
  });

  it('orders leaves bottom-up so instanced reveal follows the climb', () => {
    const levelIdxs = layout.leaves.map((l) => l.levelIdx);
    expect(levelIdxs).toEqual([...levelIdxs].sort((a, b) => a - b));
  });

  it('camera path climbs from ground to above the canopy', () => {
    const pts = layout.cameraPoints;
    expect(pts[0].y).toBeLessThan(3);
    expect(pts[pts.length - 1].y).toBeGreaterThan(layout.trunkHeight);
  });

  it('camera path clears the leaf canopy', () => {
    const maxLeafR = Math.max(...layout.leaves.map((l) => Math.hypot(l.pos.x, l.pos.z)));
    const minCamR = Math.min(...layout.cameraPoints.map((p) => Math.hypot(p.x, p.z)));
    expect(minCamR).toBeGreaterThan(maxLeafR);
  });
});

describe('pseudoRandom', () => {
  it('is deterministic and in [0,1)', () => {
    expect(pseudoRandom(42)).toBe(pseudoRandom(42));
    for (let k = 0; k < 50; k++) {
      const v = pseudoRandom(k);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
});

describe('tree dressing layout', () => {
  const layout = buildLayout(levels);

  it('builds a 7-point trunk spine anchored at the ground and reaching the top', () => {
    expect(layout.trunkSpine).toHaveLength(7);
    expect(Math.abs(layout.trunkSpine[0].x)).toBeLessThan(0.001);
    expect(Math.abs(layout.trunkSpine[0].z)).toBeLessThan(0.001);
    expect(layout.trunkSpine[0].y).toBe(0);
    expect(layout.trunkSpine[6].y).toBeCloseTo(layout.trunkHeight);
    for (let i = 1; i < 7; i++) expect(layout.trunkSpine[i].y).toBeGreaterThan(layout.trunkSpine[i - 1].y);
  });

  it('places 4 foliage clusters per semester plus a 10-cluster crown, reveals ascending', () => {
    expect(layout.foliage).toHaveLength(8 * 4 + 10);
    for (let i = 1; i < layout.foliage.length; i++) {
      expect(layout.foliage[i].reveal).toBeGreaterThanOrEqual(layout.foliage[i - 1].reveal);
    }
    const crown = layout.foliage.slice(-10);
    for (const c of crown) expect(c.pos.y).toBeGreaterThan(layout.trunkHeight);
  });

  it('gives every limb two finite twigs', () => {
    expect(layout.twigs).toHaveLength(16);
    for (const tw of layout.twigs) {
      for (const p of [tw.start, tw.end]) {
        expect(Number.isFinite(p.x) && Number.isFinite(p.y) && Number.isFinite(p.z)).toBe(true);
      }
    }
  });

  it('trunkPointAt tapers from base to top along the spine', () => {
    expect(trunkPointAt(layout, 0).radius).toBeCloseTo(1.3);
    expect(trunkPointAt(layout, layout.trunkHeight).radius).toBeCloseTo(0.4);
    const mid = trunkPointAt(layout, layout.trunkHeight / 2);
    expect(mid.radius).toBeGreaterThan(0.4);
    expect(mid.radius).toBeLessThan(1.3);
  });
});
