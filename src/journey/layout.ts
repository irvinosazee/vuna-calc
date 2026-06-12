// Pure layout math for the tree — no Three.js imports, fully unit-testable.
import type { Level } from '../data/journey';

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface LimbSpot {
  start: Vec3;
  end: Vec3;
  levelIdx: number;
  semIdx: number;
}

export interface LeafSpot {
  pos: Vec3;
  levelIdx: number;
  semIdx: number;
  courseIdx: number;
}

export interface TreeLayout {
  trunkHeight: number;
  levelY: number[];
  limbs: LimbSpot[];
  leaves: LeafSpot[];
  cameraPoints: Vec3[];
}

const LEVEL_BASE_Y = 6;
const LEVEL_GAP = 7;
const LIMB_LEN = 4.2;
const CAMERA_STEPS = 64;

/** Deterministic stand-in for Math.random — same key, same value. */
export function pseudoRandom(k: number): number {
  const x = Math.sin(k * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

export function buildLayout(levels: Level[]): TreeLayout {
  if (levels.length === 0) throw new Error('buildLayout: levels must not be empty');
  const levelY = levels.map((_, i) => LEVEL_BASE_Y + i * LEVEL_GAP);
  const trunkHeight = levelY[levelY.length - 1] + 5;
  const limbs: LimbSpot[] = [];
  const leaves: LeafSpot[] = [];

  levels.forEach((level, li) => {
    level.semesters.forEach((sem, si) => {
      const angle = li * 1.1 + si * Math.PI;
      const y = levelY[li] + si * 1.6;
      const start = { x: 0, y, z: 0 };
      const end = {
        x: Math.cos(angle) * LIMB_LEN,
        y: y + 1.2,
        z: Math.sin(angle) * LIMB_LEN,
      };
      limbs.push({ start, end, levelIdx: li, semIdx: si });

      sem.courses.forEach((_, ci) => {
        // ×3 stride: each leaf owns a non-overlapping (k, k+1, k+2) key triple
        const k = (li * 100 + si * 50 + ci) * 3;
        const a = angle + (pseudoRandom(k) - 0.5) * 1.8;
        const r = LIMB_LEN + 0.6 + pseudoRandom(k + 1) * 2.4;
        leaves.push({
          pos: {
            x: Math.cos(a) * r,
            y: end.y + (pseudoRandom(k + 2) - 0.3) * 2.2,
            z: Math.sin(a) * r,
          },
          levelIdx: li,
          semIdx: si,
          courseIdx: ci,
        });
      });
    });
  });

  const cameraPoints: Vec3[] = [];
  for (let i = 0; i < CAMERA_STEPS; i++) {
    const t = i / (CAMERA_STEPS - 1);
    const angle = t * Math.PI * 3;
    const radius = 11 - t * 3.5;
    cameraPoints.push({
      x: Math.cos(angle) * radius,
      y: 1.2 + t * (trunkHeight + 2),
      z: Math.sin(angle) * radius,
    });
  }

  return { trunkHeight, levelY, limbs, leaves, cameraPoints };
}
