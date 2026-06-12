import { describe, it, expect } from 'vitest';
import { chapterAt, leafIndexOf, CLIMB_START, CLIMB_END } from '../../src/journey/chapters';
import { levels, allCourses } from '../../src/data/journey';

describe('chapterAt', () => {
  it('is intro before the climb and finale after it', () => {
    expect(chapterAt(0, levels).phase).toBe('intro');
    expect(chapterAt(CLIMB_START - 0.001, levels).phase).toBe('intro');
    expect(chapterAt(CLIMB_END, levels).phase).toBe('finale');
    expect(chapterAt(1, levels).phase).toBe('finale');
  });

  it('opens each of the 8 zones with a chapter window, in chronological order', () => {
    const zoneSize = (CLIMB_END - CLIMB_START) / 8;
    for (let z = 0; z < 8; z++) {
      const p = CLIMB_START + z * zoneSize + zoneSize * 0.05; // inside chapter window
      const pos = chapterAt(p, levels);
      expect(pos.phase).toBe('chapter');
      expect(pos.levelIdx).toBe(Math.floor(z / 2));
      expect(pos.semIdx).toBe(z % 2);
      expect(pos.courseIdx).toBe(-1);
    }
  });

  it('visits every course exactly once, in catalog order, as progress sweeps', () => {
    const seen: number[] = [];
    for (let i = 0; i <= 20000; i++) {
      const pos = chapterAt(i / 20000, levels);
      if (pos.phase !== 'course') continue;
      const flat = leafIndexOf(levels, pos.levelIdx, pos.semIdx, pos.courseIdx);
      if (seen[seen.length - 1] !== flat) seen.push(flat);
    }
    expect(seen).toEqual([...Array(allCourses.length).keys()]);
  });

  it('reaches the first and last course of a zone', () => {
    const zoneSize = (CLIMB_END - CLIMB_START) / 8;
    const startOfCourses = CLIMB_START + zoneSize * 0.15 + 0.0005;
    expect(chapterAt(startOfCourses, levels)).toMatchObject({ phase: 'course', levelIdx: 0, semIdx: 0, courseIdx: 0 });
    const endOfZone = CLIMB_START + zoneSize - 0.0005;
    expect(chapterAt(endOfZone, levels)).toMatchObject({ phase: 'course', levelIdx: 0, semIdx: 0, courseIdx: 11 });
  });
});

describe('leafIndexOf', () => {
  it('matches the bottom-up leaf ordering', () => {
    expect(leafIndexOf(levels, 0, 0, 0)).toBe(0);
    expect(leafIndexOf(levels, 0, 1, 0)).toBe(12);
    expect(leafIndexOf(levels, 3, 1, 6)).toBe(78);
  });
});
