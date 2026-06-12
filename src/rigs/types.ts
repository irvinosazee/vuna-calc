import type * as THREE from 'three';

export type Mode = 'journey' | 'explore' | 'walk';

export interface CameraRig {
  enter(camera: THREE.PerspectiveCamera): void;
  update(camera: THREE.PerspectiveCamera, dt: number): void;
  dispose(): void;
}
