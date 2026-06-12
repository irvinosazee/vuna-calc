// Pure climb choreography: elapsed seconds -> where the avatar is on the
// tree. No Three.js, no DOM. Each Climb-mode entry restarts at elapsed 0.

export interface ClimbState {
  phase: 'approach' | 'climb' | 'pause' | 'crown';
  /** Height up the trunk (0 = ground). */
  height: number;
  /** 0..1 progress of the ground approach walk (1 once climbing). */
  approachT: number;
  /** Level index currently paused at (-1 otherwise). */
  pauseLevel: number;
  done: boolean;
}

export const APPROACH_SECS = 4;
export const CLIMB_RATE = 1.6; // trunk units per second
export const PAUSE_SECS = 1.8; // beat at each level ring

export function climbStateAt(elapsed: number, levelY: number[], trunkHeight: number): ClimbState {
  if (elapsed < APPROACH_SECS) {
    return {
      phase: 'approach',
      height: 0,
      approachT: Math.max(0, elapsed / APPROACH_SECS),
      pauseLevel: -1,
      done: false,
    };
  }

  let t = elapsed - APPROACH_SECS;
  let h = 0;
  for (let i = 0; i < levelY.length; i++) {
    const seg = (levelY[i] - h) / CLIMB_RATE;
    if (t < seg) return { phase: 'climb', height: h + t * CLIMB_RATE, approachT: 1, pauseLevel: -1, done: false };
    t -= seg;
    h = levelY[i];
    if (t < PAUSE_SECS) return { phase: 'pause', height: h, approachT: 1, pauseLevel: i, done: false };
    t -= PAUSE_SECS;
  }

  const finalSeg = (trunkHeight - h) / CLIMB_RATE;
  if (t < finalSeg) return { phase: 'climb', height: h + t * CLIMB_RATE, approachT: 1, pauseLevel: -1, done: false };
  return { phase: 'crown', height: trunkHeight, approachT: 1, pauseLevel: -1, done: true };
}
