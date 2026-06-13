import * as THREE from 'three';
import type { Avatar } from './avatar';

const WALK_SPEED = 1.7;
const BASE_SPOT = { x: 3.4, z: 2.4 }; // where the avatar stands in journey mode

/**
 * Drives the avatar when no rig owns it: standing at the tree base in
 * journey mode, wandering the grove floor in explore mode. Runtime
 * randomness is fine here (not part of the deterministic layout).
 *
 * Headings are written as a FULL quaternion (yaw only, perfectly upright) —
 * never via partial rotation.y writes, which previously let a stray pitch
 * from lookAt() survive and tilt the avatar.
 */
export class AmbientWander {
  private target = { x: BASE_SPOT.x, z: BASE_SPOT.z };
  private idleUntil = 0;
  private readonly euler = new THREE.Euler(0, 0, 0, 'YXZ');

  constructor(private readonly avatar: Avatar) {
    avatar.group.position.set(BASE_SPOT.x, 0, BASE_SPOT.z);
    this.setHeading(Math.atan2(-BASE_SPOT.x, -BASE_SPOT.z)); // face the tree
  }

  /** Call every frame in journey/explore modes (NOT in climb — ClimbRig owns the avatar). */
  update(t: number, dt: number, mode: 'journey' | 'explore'): void {
    const g = this.avatar.group;

    if (mode === 'journey') {
      // Walk home if displaced (e.g., after a climb), otherwise idle facing the tree.
      this.target = { x: BASE_SPOT.x, z: BASE_SPOT.z };
    } else if (t >= this.idleUntil && this.atTarget()) {
      const a = Math.random() * Math.PI * 2;
      const r = 6 + Math.random() * 14;
      this.target = { x: Math.cos(a) * r, z: Math.sin(a) * r };
    }

    const dx = this.target.x - g.position.x;
    const dz = this.target.z - g.position.z;
    const dist = Math.hypot(dx, dz);
    if (dist > 0.15) {
      const step = Math.min(dist, WALK_SPEED * dt);
      g.position.x += (dx / dist) * step;
      g.position.z += (dz / dist) * step;
      this.setHeading(Math.atan2(dx, dz));
      this.avatar.setPose('walk');
    } else {
      this.avatar.setPose('idle');
      if (mode === 'journey') this.setHeading(Math.atan2(-g.position.x, -g.position.z));
      else if (this.idleUntil < t) this.idleUntil = t + 2 + Math.random() * 2;
    }
    g.position.y = 0;
    this.avatar.update(t);
  }

  private setHeading(yaw: number): void {
    this.euler.set(0, yaw, 0);
    this.avatar.group.quaternion.setFromEuler(this.euler);
  }

  private atTarget(): boolean {
    const g = this.avatar.group;
    return Math.hypot(this.target.x - g.position.x, this.target.z - g.position.z) <= 0.15;
  }
}
