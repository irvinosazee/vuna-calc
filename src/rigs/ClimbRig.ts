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
const HUG_GAP = 0.18; // measured from the avatar's center axis — body depth ~0.2 keeps the chest grazing the bark
const LEAN = 0.21; // ~12° forward lean into the trunk while climbing
const BOB_AMP = 0.12; // inchworm pull per arm reach (render-only)
const BOB_FREQ = 5; // matches the climb pose's arm cycle (sin(t * 5))
const CHEER_SECS = 2.5;

/**
 * Cinematic auto-climb: drives the avatar (approach walk → trunk ascent with
 * level pauses → crown cheer) while the camera follows; pointer-drag swings
 * the viewpoint around the avatar. No movement controls.
 *
 * The avatar's orientation is written as a FULL quaternion every frame
 * (yaw eased shortest-path + lean), so no tilt can ever be inherited.
 */
export class ClimbRig implements CameraRig {
  private elapsed = 0;
  private yaw = 0.7;
  private pitch = 0.18;
  private lookId: number | null = null;
  private last = { x: 0, y: 0 };
  private detach: (() => void)[] = [];
  private avatarAngle = CLIMB_FACE_ANGLE;
  private avYaw = 0;
  private avLean = 0;
  private camDist = CAM_DIST;
  private bobVal = 0;
  private crownStoodAt: number | null = null;
  private readonly avatarEuler = new THREE.Euler(0, 0, 0, 'YXZ');
  private readonly target = new THREE.Vector3();
  private readonly desired = new THREE.Vector3();
  private readonly headOffset = new THREE.Vector3(0, 1.3, 0); // aim at head height

  constructor(
    private readonly dom: HTMLElement,
    private readonly avatar: Avatar,
    private readonly layout: TreeLayout,
  ) {}

  enter(): void {
    this.disposeListeners();
    this.elapsed = 0;
    this.crownStoodAt = null;
    this.avatarAngle = CLIMB_FACE_ANGLE;
    this.avLean = 0;
    this.camDist = CAM_DIST;
    this.avYaw = 0;
    this.bobVal = 0;

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
      const contactX = base.x + Math.cos(CLIMB_FACE_ANGLE) * (base.radius + HUG_GAP);
      const contactZ = base.z + Math.sin(CLIMB_FACE_ANGLE) * (base.radius + HUG_GAP);
      const ease = s.approachT * s.approachT * (3 - 2 * s.approachT);
      g.position.set(
        SPAWN.x + (contactX - SPAWN.x) * ease,
        0,
        SPAWN.z + (contactZ - SPAWN.z) * ease,
      );
      this.setAvatarOrientation(Math.atan2(contactX - SPAWN.x, contactZ - SPAWN.z), 0, dt);
      this.avatarAngle = CLIMB_FACE_ANGLE;
      this.avatar.setPose('walk');
    } else if (s.phase === 'climb' || s.phase === 'pause') {
      const p = trunkPointAt(this.layout, s.height);
      const a = CLIMB_FACE_ANGLE + s.height * 0.12; // slight spiral
      this.avatarAngle = a;
      // Render-only reach rhythm: each arm cycle visibly pulls the body up.
      // Eased so the climb→pause transition never snaps.
      const bobTarget =
        s.phase === 'climb' ? Math.max(0, Math.sin(this.elapsed * BOB_FREQ)) * BOB_AMP : 0;
      this.bobVal += (bobTarget - this.bobVal) * (1 - Math.exp(-8 * dt));
      const bob = this.bobVal;
      g.position.set(
        p.x + Math.cos(a) * (p.radius + HUG_GAP),
        s.height + bob,
        p.z + Math.sin(a) * (p.radius + HUG_GAP),
      );
      const towardTrunk = Math.atan2(p.x - g.position.x, p.z - g.position.z);
      if (s.phase === 'pause') {
        // Turn outward and stand upright — take in the view at this level.
        this.setAvatarOrientation(towardTrunk + Math.PI, 0, dt);
        this.avatar.setPose('idle');
      } else {
        this.setAvatarOrientation(towardTrunk, LEAN, dt);
        this.avatar.setPose('climb');
      }
    } else {
      const top = trunkPointAt(this.layout, this.layout.trunkHeight);
      // Final scramble: ease up through the canopy and stand ON the dome.
      const standY = this.layout.trunkHeight + 3.1;
      g.position.x = top.x;
      g.position.z = top.z;
      g.position.y += (standY - g.position.y) * (1 - Math.exp(-1.5 * dt));
      const rising = standY - g.position.y > 0.25;
      if (!rising && this.crownStoodAt === null) this.crownStoodAt = this.elapsed;
      this.avLean = 0;
      if (rising) {
        this.avatar.setPose('climb');
        this.avatarEuler.set(0, this.avYaw, 0);
        g.quaternion.setFromEuler(this.avatarEuler);
      } else {
        const stood = this.elapsed - (this.crownStoodAt ?? this.elapsed);
        // Victory: cheer first, then the slow turn surveying the grove.
        this.avYaw += dt * (stood < CHEER_SECS ? 0 : 0.4);
        this.avatarEuler.set(0, this.avYaw, 0);
        g.quaternion.setFromEuler(this.avatarEuler);
        this.avatar.setPose(stood < CHEER_SECS ? 'cheer' : 'idle');
      }
    }
    this.avatar.update(this.elapsed);

    // Keep the camera on the avatar's side of the trunk while it spirals,
    // unless the user is actively dragging the view.
    if (this.lookId === null) {
      // Crown: pull back and rise above the foliage dome for the finale framing.
      if (s.phase === 'crown') {
        this.pitch += (0.35 - this.pitch) * (1 - Math.exp(-1.2 * dt));
      }
      // Camera offset is (sin yaw, cos yaw) but the avatar sits at (cos a, sin a):
      // the radially-outside camera yaw is π/2 − a (+0.4 for a pleasing 3/4 view).
      const targetYaw = Math.PI / 2 - this.avatarAngle + 0.4;
      let d = targetYaw - this.yaw;
      d = Math.atan2(Math.sin(d), Math.cos(d)); // shortest path
      this.yaw += d * (1 - Math.exp(-1.2 * dt));
    }

    const distTarget = s.phase === 'crown' ? 8 : CAM_DIST;
    this.camDist += (distTarget - this.camDist) * (1 - Math.exp(-2 * dt));

    // Follow camera: orbit offset around a point just above the avatar.
    this.target.copy(g.position).add(this.headOffset);
    const cp = Math.cos(this.pitch);
    this.desired.set(
      this.target.x + Math.sin(this.yaw) * cp * this.camDist,
      this.target.y + Math.sin(this.pitch) * this.camDist + 0.6,
      this.target.z + Math.cos(this.yaw) * cp * this.camDist,
    );
    camera.position.lerp(this.desired, 1 - Math.exp(-4 * dt));
    camera.lookAt(this.target);
  }

  dispose(): void {
    this.disposeListeners();
    this.lookId = null;
    // Ground the avatar so the ambient wander never sees a mid-trunk position.
    this.avatar.group.position.y = 0;
  }

  /** Full-orientation write: yaw eased shortest-path, lean eased, roll locked to 0. */
  private setAvatarOrientation(targetYaw: number, lean: number, dt: number): void {
    let d = targetYaw - this.avYaw;
    d = Math.atan2(Math.sin(d), Math.cos(d));
    const k = 1 - Math.exp(-6 * dt);
    this.avYaw += d * k;
    this.avLean += (lean - this.avLean) * k;
    this.avatarEuler.set(this.avLean, this.avYaw, 0);
    this.avatar.group.quaternion.setFromEuler(this.avatarEuler);
  }

  private disposeListeners(): void {
    this.detach.forEach((d) => d());
    this.detach = [];
  }
}
