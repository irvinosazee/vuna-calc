import * as THREE from 'three';
import { pseudoRandom } from '../journey/layout';

export class Environment {
  readonly group = new THREE.Group();
  private readonly fireflies: THREE.Points;

  constructor(particleCount: number, height: number, lush: boolean) {
    const ground = new THREE.Mesh(
      new THREE.CircleGeometry(60, 32),
      new THREE.MeshStandardMaterial({ color: '#0c3622', roughness: 1 }),
    );
    ground.rotation.x = -Math.PI / 2;
    this.group.add(ground);

    this.group.add(new THREE.HemisphereLight('#bdf5d3', '#06281a', 2.2));
    const sun = new THREE.DirectionalLight('#eafff2', 2.2);
    sun.position.set(8, height + 10, 5);
    this.group.add(sun);

    const positions = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i++) {
      const a = pseudoRandom(i) * Math.PI * 2;
      const r = 3 + pseudoRandom(i + 0.1) * 16;
      positions[i * 3] = Math.cos(a) * r;
      positions[i * 3 + 1] = pseudoRandom(i + 0.2) * (height + 6);
      positions[i * 3 + 2] = Math.sin(a) * r;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.fireflies = new THREE.Points(
      geo,
      new THREE.PointsMaterial({
        color: '#c8f96e',
        size: 0.18,
        transparent: true,
        opacity: 0.85,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    );
    this.group.add(this.fireflies);

    const shrubMat = new THREE.MeshStandardMaterial({ color: '#1d5c38', flatShading: true, roughness: 1 });
    for (let i = 0; i < 14; i++) {
      const a = pseudoRandom(i + 50) * Math.PI * 2;
      const r = 5 + pseudoRandom(i + 51) * 20;
      const s = 0.4 + pseudoRandom(i + 52) * 1.4;
      const shrub = new THREE.Mesh(new THREE.IcosahedronGeometry(s, 0), shrubMat);
      shrub.position.set(Math.cos(a) * r, s * 0.9, Math.sin(a) * r);
      this.group.add(shrub);
    }

    // Ground life — grass tufts and tiny flowers (halved on mobile).
    const grassCount = lush ? 60 : 30;
    const grassMat = new THREE.MeshStandardMaterial({ color: '#2e8b57', flatShading: true, roughness: 1 });
    const grass = new THREE.InstancedMesh(new THREE.ConeGeometry(0.07, 0.26, 4), grassMat, grassCount);
    const gm = new THREE.Matrix4();
    for (let i = 0; i < grassCount; i++) {
      const a = pseudoRandom(i + 700) * Math.PI * 2;
      const r = 3 + pseudoRandom(i + 701) * 27;
      const s = 0.7 + pseudoRandom(i + 702) * 0.9;
      gm.makeScale(s, s, s).setPosition(Math.cos(a) * r, 0.13 * s, Math.sin(a) * r);
      grass.setMatrixAt(i, gm);
    }
    grass.instanceMatrix.needsUpdate = true;
    grass.computeBoundingSphere();
    this.group.add(grass);

    const flowerCount = lush ? 20 : 10;
    const flowerMat = new THREE.MeshStandardMaterial({ color: '#f0e68c', flatShading: true, roughness: 0.7 });
    const flowers = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.08, 0), flowerMat, flowerCount);
    for (let i = 0; i < flowerCount; i++) {
      const a = pseudoRandom(i + 800) * Math.PI * 2;
      const r = 4 + pseudoRandom(i + 801) * 24;
      gm.makeScale(1, 1, 1).setPosition(Math.cos(a) * r, 0.1, Math.sin(a) * r);
      flowers.setMatrixAt(i, gm);
    }
    flowers.instanceMatrix.needsUpdate = true;
    flowers.computeBoundingSphere();
    this.group.add(flowers);
  }

  update(t: number): void {
    this.fireflies.rotation.y = t * 0.02;
    this.fireflies.position.y = Math.sin(t * 0.6) * 0.4;
  }
}
