import type * as THREE from 'three';

export type Mode = 'journey' | 'explore' | 'climb';

export interface CameraRig {
  enter(camera: THREE.PerspectiveCamera): void;
  update(camera: THREE.PerspectiveCamera, dt: number): void;
  dispose(): void;
}
