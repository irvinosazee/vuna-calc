import * as THREE from 'three';
import { climbStateAt } from '../journey/climb';
import { trunkPointAt, type TreeLayout } from '../journey/layout';
import type { Avatar } from '../scene/avatar';
import type { CameraRig } from './types';

const LOOK_SENS = 0.005;
const PITCH_LIMIT = Math.PI * 0.35;
const CAM_DIST = 5.2;
const CLIMB_FACE_ANGLE = 0.9; // which side of the trunk the avatar climbs
const SPAWN = { x: 9, z: 5 };

/**
 * Cinematic auto-climb: drives the avatar (approach walk → trunk ascent with
 * level pauses → crown) while the camera follows; pointer-drag swings the
 * viewpoint around the avatar. No movement controls.
 */
export class ClimbRig implements CameraRig {
  private elapsed = 0;
  private yaw = 0.7;
  private pitch = 0.18;
  private lookId: number | null = null;
  private last = { x: 0, y: 0 };
  private detach: (() => void)[] = [];
  private readonly target = new THREE.Vector3();
  private readonly desired = new THREE.Vector3();
  // Preallocated head-height offset — avoids a Vector3 allocation per frame
  private readonly headOffset = new THREE.Vector3(0, 1.3, 0);

  constructor(
    private readonly dom: HTMLElement,
    private readonly avatar: Avatar,
    private readonly layout: TreeLayout,
  ) {}

  enter(): void {
    this.disposeListeners();
    this.elapsed = 0;

    const down = (e: PointerEvent): void => {
      if (this.lookId !== null) return;
      this.dom.setPointerCapture(e.pointerId);
      this.lookId = e.pointerId;
      this.last = { x: e.clientX, y: e.clientY };
    };
    const move = (e: PointerEvent): void => {
      if (e.pointerId !== this.lookId) return;
      this.yaw -= (e.clientX - this.last.x) * LOOK_SENS;
      this.pitch = Math.max(
        -PITCH_LIMIT,
        Math.min(PITCH_LIMIT, this.pitch + (e.clientY - this.last.y) * LOOK_SENS),
      );
      this.last = { x: e.clientX, y: e.clientY };
    };
    const up = (e: PointerEvent): void => {
      if (e.pointerId === this.lookId) this.lookId = null;
    };
    this.dom.addEventListener('pointerdown', down);
    this.dom.addEventListener('pointermove', move);
    this.dom.addEventListener('pointerup', up);
    this.dom.addEventListener('pointercancel', up);
    this.detach = [
      () => this.dom.removeEventListener('pointerdown', down),
      () => this.dom.removeEventListener('pointermove', move),
      () => this.dom.removeEventListener('pointerup', up),
      () => this.dom.removeEventListener('pointercancel', up),
    ];
  }

  update(camera: THREE.PerspectiveCamera, dt: number): void {
    this.elapsed += dt;
    const s = climbStateAt(this.elapsed, this.layout.levelY, this.layout.trunkHeight);
    const g = this.avatar.group;

    if (s.phase === 'approach') {
      const base = trunkPointAt(this.layout, 0);
      const contactX = base.x + Math.cos(CLIMB_FACE_ANGLE) * (base.radius + 0.25);
      const contactZ = base.z + Math.sin(CLIMB_FACE_ANGLE) * (base.radius + 0.25);
      const ease = s.approachT * s.approachT * (3 - 2 * s.approachT);
      g.position.set(
        SPAWN.x + (contactX - SPAWN.x) * ease,
        0,
        SPAWN.z + (contactZ - SPAWN.z) * ease,
      );
      g.rotation.y = Math.atan2(contactX - SPAWN.x, contactZ - SPAWN.z);
      this.avatar.setPose('walk');
    } else if (s.phase === 'climb' || s.phase === 'pause') {
      const p = trunkPointAt(this.layout, s.height);
      const a = CLIMB_FACE_ANGLE + s.height * 0.12; // slight spiral
      g.position.set(p.x + Math.cos(a) * (p.radius + 0.22), s.height, p.z + Math.sin(a) * (p.radius + 0.22));
      g.rotation.y = Math.atan2(p.x - g.position.x, p.z - g.position.z); // face the trunk
      this.avatar.setPose(s.phase === 'pause' ? 'idle' : 'climb');
    } else {
      const top = trunkPointAt(this.layout, this.layout.trunkHeight);
      g.position.set(top.x, this.layout.trunkHeight + 0.1, top.z);
      g.rotation.y += dt * 0.4; // slow victorious turn in the crown
      this.avatar.setPose('idle');
    }
    this.avatar.update(this.elapsed);

    // Follow camera: orbit offset around a point at head height above the avatar.
    this.target.copy(g.position).add(this.headOffset); // aim at head height
    const cp = Math.cos(this.pitch);
    this.desired.set(
      this.target.x + Math.sin(this.yaw) * cp * CAM_DIST,
      this.target.y + Math.sin(this.pitch) * CAM_DIST + 0.6,
      this.target.z + Math.cos(this.yaw) * cp * CAM_DIST,
    );
    camera.position.lerp(this.desired, 1 - Math.exp(-4 * dt));
    camera.lookAt(this.target);
  }

  dispose(): void {
    this.disposeListeners();
    this.lookId = null;
  }

  private disposeListeners(): void {
    this.detach.forEach((d) => d());
    this.detach = [];
  }
}
