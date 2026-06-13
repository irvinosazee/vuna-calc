import * as THREE from 'three';

export type AvatarPose = 'idle' | 'walk' | 'climb';

const SKIN = '#e8c39e';
const TORSO = '#2bbd88';
const LIMB = '#1d5c38';

function flat(color: string): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color, flatShading: true, roughness: 0.8 });
}

/**
 * Procedural low-poly student figure, ~1.7 units tall, pivot at the feet.
 * Movement/heading are driven externally (rigs/wander); the avatar only
 * animates its own limbs according to the current pose.
 */
export class Avatar {
  readonly group = new THREE.Group();
  private pose: AvatarPose = 'idle';
  private readonly body = new THREE.Group();
  private readonly lArm = new THREE.Group();
  private readonly rArm = new THREE.Group();
  private readonly lLeg = new THREE.Group();
  private readonly rLeg = new THREE.Group();
  private readonly torso: THREE.Mesh;

  constructor() {
    this.torso = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.2, 0.55, 6), flat(TORSO));
    this.torso.position.y = 0.88;
    this.body.add(this.torso);

    const head = new THREE.Mesh(new THREE.IcosahedronGeometry(0.15, 0), flat(SKIN));
    head.position.y = 1.32;
    this.body.add(head);

    const limb = (parent: THREE.Group, x: number, y: number, len: number, r: number): void => {
      parent.position.set(x, y, 0);
      const mesh = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 0.8, len, 5), flat(LIMB));
      mesh.position.y = -len / 2;
      parent.add(mesh);
      this.body.add(parent);
    };
    limb(this.lArm, -0.26, 1.1, 0.5, 0.05);
    limb(this.rArm, 0.26, 1.1, 0.5, 0.05);
    limb(this.lLeg, -0.1, 0.62, 0.62, 0.07);
    limb(this.rLeg, 0.1, 0.62, 0.62, 0.07);

    this.group.add(this.body);
  }

  setPose(pose: AvatarPose): void {
    this.pose = pose;
  }

  update(t: number): void {
    if (this.pose === 'walk') {
      const swing = Math.sin(t * 7);
      this.lLeg.rotation.x = swing * 0.65;
      this.rLeg.rotation.x = -swing * 0.65;
      this.lArm.rotation.x = -swing * 0.5;
      this.rArm.rotation.x = swing * 0.5;
      this.body.position.y = Math.abs(Math.cos(t * 7)) * 0.05;
      this.torso.scale.setScalar(1);
    } else if (this.pose === 'climb') {
      const reach = Math.sin(t * 5);
      this.lArm.rotation.x = -2.5 + reach * 0.45;
      this.rArm.rotation.x = -2.5 - reach * 0.45;
      this.lLeg.rotation.x = 0.5 + reach * 0.4;
      this.rLeg.rotation.x = 0.5 - reach * 0.4;
      this.body.position.y = 0;
      this.torso.scale.setScalar(1);
    } else {
      this.lLeg.rotation.x = 0;
      this.rLeg.rotation.x = 0;
      this.lArm.rotation.x = Math.sin(t * 1.5) * 0.06;
      this.rArm.rotation.x = -Math.sin(t * 1.5) * 0.06;
      this.body.position.y = 0;
      this.torso.scale.setScalar(1 + Math.sin(t * 2) * 0.015);
    }
  }
}
