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

export interface FoliageSpot {
  pos: Vec3;
  scale: number;
  reveal: number;
}

export interface TwigSpot {
  start: Vec3;
  end: Vec3;
  reveal: number;
}

export interface TreeLayout {
  trunkHeight: number;
  levelY: number[];
  limbs: LimbSpot[];
  leaves: LeafSpot[];
  cameraPoints: Vec3[];
  trunkSpine: Vec3[];
  foliage: FoliageSpot[];
  twigs: TwigSpot[];
}

const LEVEL_BASE_Y = 6;
const LEVEL_GAP = 7;
const LIMB_LEN = 4.2;
const CAMERA_STEPS = 64;
const TRUNK_SEGMENTS = 6;
export const TRUNK_BASE_R = 1.3;
export const TRUNK_TOP_R = 0.4;

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
      // +6 lifts the path's end above the crown dome so the finale floats over the canopy.
      y: 1.2 + t * (trunkHeight + 6),
      z: Math.sin(angle) * radius,
    });
  }

  // Organic trunk: gently S-curved centerline, anchored at ground and top.
  const trunkSpine: Vec3[] = [];
  for (let i = 0; i <= TRUNK_SEGMENTS; i++) {
    const f = i / TRUNK_SEGMENTS;
    const bend = Math.sin(f * Math.PI) * 0.7; // 0 at both ends
    trunkSpine.push({
      x: Math.sin(f * Math.PI * 1.6) * bend * 0.6,
      y: f * trunkHeight,
      z: Math.cos(f * Math.PI * 1.1) * bend * 0.4,
    });
  }

  // Decorative foliage (not clickable) around each limb's leaf cloud,
  // then a crown dome capping the trunk. Built in limb order so reveals
  // ascend and count-based reveal works.
  const foliage: FoliageSpot[] = [];
  const twigs: TwigSpot[] = [];
  limbs.forEach((limb, li2) => {
    const reveal = limb.start.y / trunkHeight;
    const limbAngle = Math.atan2(limb.end.z, limb.end.x);
    for (let f = 0; f < 4; f++) {
      const k = 5000 + li2 * 40 + f * 3;
      const a = limbAngle + (pseudoRandom(k) - 0.5) * 1.6;
      const r = 3.6 + pseudoRandom(k + 1) * 2.6;
      foliage.push({
        pos: {
          x: Math.cos(a) * r,
          y: limb.end.y + (pseudoRandom(k + 2) - 0.25) * 2.0,
          z: Math.sin(a) * r,
        },
        scale: 0.8 + pseudoRandom(k + 0.5) * 0.6,
        reveal,
      });
    }
    for (let w = 0; w < 2; w++) {
      const k = 7000 + li2 * 20 + w * 5;
      const a = limbAngle + (pseudoRandom(k) - 0.5) * 1.2;
      const len = 1.1 + pseudoRandom(k + 1) * 0.7;
      twigs.push({
        start: { ...limb.end },
        end: {
          x: limb.end.x + Math.cos(a) * len,
          y: limb.end.y + 0.5 + pseudoRandom(k + 2) * 0.6,
          z: limb.end.z + Math.sin(a) * len,
        },
        reveal,
      });
    }
  });

  const top = trunkSpine[trunkSpine.length - 1];
  for (let c = 0; c < 10; c++) {
    const k = 9000 + c * 7;
    const a = pseudoRandom(k) * Math.PI * 2;
    const r = 0.6 + pseudoRandom(k + 1) * 1.9;
    foliage.push({
      pos: {
        x: top.x + Math.cos(a) * r,
        // +0.9 keeps the dome clear of the topmost 400-level course leaves.
        y: trunkHeight + 0.9 + pseudoRandom(k + 2) * 1.8,
        z: top.z + Math.sin(a) * r,
      },
      scale: 1.6 + pseudoRandom(k + 1) * 1.0,
      reveal: 0.98,
    });
  }

  return { trunkHeight, levelY, limbs, leaves, cameraPoints, trunkSpine, foliage, twigs };
}

/** Interpolated trunk centerline point and tapered radius at a height. */
export function trunkPointAt(layout: TreeLayout, h: number): { x: number; z: number; radius: number } {
  const f = Math.min(1, Math.max(0, h / layout.trunkHeight));
  const seg = f * TRUNK_SEGMENTS;
  const i = Math.min(TRUNK_SEGMENTS - 1, Math.floor(seg));
  const u = seg - i;
  const a = layout.trunkSpine[i];
  const b = layout.trunkSpine[i + 1];
  return {
    x: a.x + (b.x - a.x) * u,
    z: a.z + (b.z - a.z) * u,
    radius: TRUNK_BASE_R + (TRUNK_TOP_R - TRUNK_BASE_R) * f,
  };
}
