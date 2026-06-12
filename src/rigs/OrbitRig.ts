import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import type { CameraRig } from './types';

export class OrbitRig implements CameraRig {
  private controls?: OrbitControls;

  constructor(
    private readonly dom: HTMLElement,
    private readonly trunkHeight: number,
  ) {}

  enter(camera: THREE.PerspectiveCamera): void {
    this.controls = new OrbitControls(camera, this.dom);
    this.controls.target.set(0, this.trunkHeight * 0.55, 0);
    this.controls.enableDamping = true;
    this.controls.minDistance = 4;
    this.controls.maxDistance = 35;
    this.controls.maxPolarAngle = Math.PI * 0.55;
  }

  update(): void {
    this.controls?.update();
  }

  dispose(): void {
    this.controls?.dispose();
    this.controls = undefined;
  }
}
