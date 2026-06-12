import * as THREE from 'three';
import { levels, theme, courseFamily, type Course } from '../data/journey';
import { buildLayout, pseudoRandom, type TreeLayout } from '../journey/layout';

export interface LeafRef {
  course: Course;
  levelIdx: number;
  semIdx: number;
}

const UP = new THREE.Vector3(0, 1, 0);

function makeLabel(text: string): THREE.Sprite {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 128;
  const texture = new THREE.CanvasTexture(canvas);

  const draw = (): void => {
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.font = 'bold 44px Sora, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#d8ffe9';
    ctx.shadowColor = 'rgba(60, 255, 160, 0.8)';
    ctx.shadowBlur = 16;
    ctx.fillText(text, 128, 64);
    texture.needsUpdate = true;
  };

  draw();
  // Redraw once webfonts finish loading so labels use Sora, not the fallback.
  document.fonts.ready.then(draw).catch(() => {});

  const sprite = new THREE.Sprite(
    new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false }),
  );
  sprite.scale.set(3.4, 1.7, 1);
  return sprite;
}

export class JourneyTree {
  readonly group = new THREE.Group();
  readonly layout: TreeLayout;
  readonly leafMesh: THREE.InstancedMesh;
  readonly leafRefs: LeafRef[] = [];
  private readonly trunk: THREE.Mesh;
  private readonly limbs: { mesh: THREE.Mesh; reveal: number }[] = [];

  constructor() {
    this.layout = buildLayout(levels);
    const { trunkHeight, levelY, limbs, leaves } = this.layout;

    const trunkGeo = new THREE.CylinderGeometry(0.5, 1.2, trunkHeight, 9, 6);
    trunkGeo.translate(0, trunkHeight / 2, 0);
    const barkMat = new THREE.MeshStandardMaterial({ color: theme.trunk, flatShading: true, roughness: 0.9 });
    this.trunk = new THREE.Mesh(trunkGeo, barkMat);
    this.group.add(this.trunk);

    for (const limb of limbs) {
      const start = new THREE.Vector3(limb.start.x, limb.start.y, limb.start.z);
      const end = new THREE.Vector3(limb.end.x, limb.end.y, limb.end.z);
      const dir = end.clone().sub(start);
      const len = dir.length();
      const mesh = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.22, len, 6, 1), barkMat);
      mesh.position.copy(start).addScaledVector(dir, 0.5);
      mesh.quaternion.setFromUnitVectors(UP, dir.normalize());
      this.group.add(mesh);
      this.limbs.push({ mesh, reveal: limb.start.y / trunkHeight });
    }

    const leafMat = new THREE.MeshStandardMaterial({ color: '#ffffff', flatShading: true, roughness: 0.55 });
    this.leafMesh = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.42, 0), leafMat, leaves.length);
    const m = new THREE.Matrix4();
    const color = new THREE.Color();
    const pos = new THREE.Vector3();
    const quat = new THREE.Quaternion();
    const scl = new THREE.Vector3();
    leaves.forEach((leaf, i) => {
      const s = 0.8 + pseudoRandom(i * 7) * 0.5;
      pos.set(leaf.pos.x, leaf.pos.y, leaf.pos.z);
      quat.setFromAxisAngle(UP, pseudoRandom(i * 7 + 3) * Math.PI * 2);
      scl.set(s, s, s);
      m.compose(pos, quat, scl);
      this.leafMesh.setMatrixAt(i, m);
      const course = levels[leaf.levelIdx].semesters[leaf.semIdx].courses[leaf.courseIdx];
      this.leafMesh.setColorAt(i, color.set(theme.families[courseFamily(course.code)]));
      this.leafRefs.push({ course, levelIdx: leaf.levelIdx, semIdx: leaf.semIdx });
    });
    if (this.leafMesh.instanceColor) this.leafMesh.instanceColor.needsUpdate = true;
    this.group.add(this.leafMesh);
    // Compute the bounding sphere now, while count covers all instances —
    // computed lazily later it can be cached empty (count starts at 0), killing raycasts.
    this.leafMesh.computeBoundingSphere();

    levelY.forEach((y, i) => {
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(1.8, 0.05, 8, 32),
        new THREE.MeshBasicMaterial({ color: theme.families.GST, transparent: true, opacity: 0.5 }),
      );
      ring.rotation.x = Math.PI / 2;
      ring.position.y = y;
      this.group.add(ring);

      const label = makeLabel(`${(i + 1) * 100} LEVEL`);
      // Place each label perpendicular to its level's first-semester limb so they never overlap.
      const labelAngle = i * 1.1 + Math.PI / 2;
      label.position.set(Math.cos(labelAngle) * 3, y + 0.6, Math.sin(labelAngle) * 3);
      this.group.add(label);
    });
  }

  /** p in [0,1]: trunk scales up, limbs appear, leaves reveal bottom-up. */
  setGrowth(p: number): void {
    const clamped = Math.min(1, Math.max(0, p));
    this.trunk.scale.y = Math.max(0.02, clamped);
    for (const limb of this.limbs) limb.mesh.visible = clamped >= limb.reveal;
    // The constructor-computed full bounding sphere stays valid (conservative)
    // as count shrinks/grows, so raycasting keeps working at any growth.
    this.leafMesh.count = Math.round(clamped * this.leafRefs.length);
  }

  update(t: number): void {
    this.group.rotation.z = Math.sin(t * 0.4) * 0.008;
    this.group.rotation.x = Math.cos(t * 0.3) * 0.006;
  }
}
