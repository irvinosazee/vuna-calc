import { describe, it, expect } from 'vitest';
import { buildLayout, pseudoRandom } from '../../src/journey/layout';
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
