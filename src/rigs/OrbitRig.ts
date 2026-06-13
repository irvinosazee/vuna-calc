import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import type { CameraRig } from './types';

const FOLLOW_OFFSET = new THREE.Vector3(0, 0.9, 0);

export class OrbitRig implements CameraRig {
  private controls?: OrbitControls;
  private follow: (() => THREE.Vector3) | null = null;
  private readonly defaultTarget = new THREE.Vector3();
  private readonly chase = new THREE.Vector3();

  constructor(
    private readonly dom: HTMLElement,
    private readonly trunkHeight: number,
  ) {
    this.defaultTarget.set(0, this.trunkHeight * 0.55, 0);
  }

  /** Follow a moving point (e.g., the avatar); null returns focus to the tree. */
  setFollow(target: (() => THREE.Vector3) | null): void {
    this.follow = target;
  }

  enter(camera: THREE.PerspectiveCamera): void {
    this.controls = new OrbitControls(camera, this.dom);
    this.controls.target.copy(this.defaultTarget);
    this.controls.enableDamping = true;
    this.controls.minDistance = 4;
    this.controls.maxDistance = 35;
    this.controls.maxPolarAngle = Math.PI * 0.55;
  }

  update(_camera: THREE.PerspectiveCamera, dt: number): void {
    if (!this.controls) return;
    const goal = this.follow ? this.chase.copy(this.follow()).add(FOLLOW_OFFSET) : this.defaultTarget;
    this.controls.target.lerp(goal, 1 - Math.exp(-3 * dt));
    this.controls.update();
  }

  dispose(): void {
    this.controls?.dispose();
    this.controls = undefined;
  }
}
