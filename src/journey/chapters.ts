// Pure mapping from scroll progress to "where in the story are we" —
// no Three.js, no DOM, fully unit-testable. The journey is 8 semester
// zones; each zone opens with a chapter window then scrubs through its
// courses one by one.
import type { Level } from '../data/journey';

export type ChapterPhase = 'intro' | 'chapter' | 'course' | 'finale';

export interface ChapterPosition {
  phase: ChapterPhase;
  levelIdx: number; // -1 outside the climb
  semIdx: number; // -1 outside the climb
  courseIdx: number; // -1 unless phase === 'course'
}

export const CLIMB_START = 0.18;
export const CLIMB_END = 0.93;
const CHAPTER_WINDOW = 0.15; // first 15% of each zone announces the semester

const OUTSIDE = { levelIdx: -1, semIdx: -1, courseIdx: -1 } as const;

export function chapterAt(progress: number, levels: Level[]): ChapterPosition {
  if (progress < CLIMB_START) return { phase: 'intro', ...OUTSIDE };
  if (progress >= CLIMB_END) return { phase: 'finale', ...OUTSIDE };

  const zones = levels.length * 2;
  const zoneSize = (CLIMB_END - CLIMB_START) / zones;
  const offset = progress - CLIMB_START;
  const zone = Math.min(zones - 1, Math.floor(offset / zoneSize));
  const levelIdx = Math.floor(zone / 2);
  const semIdx = zone % 2;
  const within = (offset - zone * zoneSize) / zoneSize;

  if (within < CHAPTER_WINDOW) return { phase: 'chapter', levelIdx, semIdx, courseIdx: -1 };

  const courses = levels[levelIdx].semesters[semIdx].courses.length;
  const courseIdx = Math.min(
    courses - 1,
    Math.floor(((within - CHAPTER_WINDOW) / (1 - CHAPTER_WINDOW)) * courses),
  );
  return { phase: 'course', levelIdx, semIdx, courseIdx };
}

/** Flat leaf-instance index of a course (leaves are built level→semester→course). */
export function leafIndexOf(
  levels: Level[],
  levelIdx: number,
  semIdx: number,
  courseIdx: number,
): number {
  let i = 0;
  for (let li = 0; li < levels.length; li++) {
    for (let si = 0; si < levels[li].semesters.length; si++) {
      if (li === levelIdx && si === semIdx) return i + courseIdx;
      i += levels[li].semesters[si].courses.length;
    }
  }
  return -1;
}
