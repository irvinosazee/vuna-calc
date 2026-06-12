import * as THREE from 'three';
import type { CameraRig } from './types';
import type { Vec3 } from '../journey/layout';

const easeInOut = (x: number): number => x * x * (3 - 2 * x);

export class ScrollRig implements CameraRig {
  progress = 0;
  private readonly curve: THREE.CatmullRomCurve3;

  constructor(cameraPoints: Vec3[]) {
    this.curve = new THREE.CatmullRomCurve3(cameraPoints.map((p) => new THREE.Vector3(p.x, p.y, p.z)));
  }

  enter(): void {}

  update(camera: THREE.PerspectiveCamera, dt: number): void {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    this.progress = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
    const target = this.curve.getPointAt(Math.max(0, Math.min(0.999, easeInOut(this.progress))));
    camera.position.lerp(target, 1 - Math.exp(-4 * dt));
    camera.lookAt(0, target.y + 1.0, 0);
  }

  dispose(): void {}
}
