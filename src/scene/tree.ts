import * as THREE from 'three';
import { levels, theme, courseFamily, type Course } from '../data/journey';
import { buildLayout, pseudoRandom, TRUNK_BASE_R, TRUNK_TOP_R, type TreeLayout } from '../journey/layout';

export interface LeafRef {
  course: Course;
  levelIdx: number;
  semIdx: number;
}

const UP = new THREE.Vector3(0, 1, 0);
const FOLIAGE_GREENS = ['#1f7a4a', '#2a9d62'];

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

/** Cylinder mesh oriented from start to end (shared by limbs/twigs/trunk segments). */
function boneMesh(
  start: THREE.Vector3,
  end: THREE.Vector3,
  rBottom: number,
  rTop: number,
  mat: THREE.Material,
  radialSegments = 6,
): THREE.Mesh {
  const dir = end.clone().sub(start);
  const len = dir.length();
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(rTop, rBottom, len, radialSegments, 1), mat);
  mesh.position.copy(start).addScaledVector(dir, 0.5);
  mesh.quaternion.setFromUnitVectors(UP, dir.normalize());
  return mesh;
}

export class JourneyTree {
  readonly group = new THREE.Group();
  readonly layout: TreeLayout;
  readonly leafMesh: THREE.InstancedMesh;
  readonly leafRefs: LeafRef[] = [];
  private readonly trunkGroup = new THREE.Group();
  private readonly foliageMesh: THREE.InstancedMesh;
  private readonly foliageReveals: number[] = [];
  private readonly limbs: { mesh: THREE.Mesh; reveal: number }[] = [];
  private readonly leafTransforms: { pos: THREE.Vector3; quat: THREE.Quaternion; scale: number }[] = [];
  private spotlight: number | null = null;
  private readonly spotM = new THREE.Matrix4();
  private readonly spotS = new THREE.Vector3();

  constructor() {
    this.layout = buildLayout(levels);
    const { trunkHeight, levelY, limbs, leaves, trunkSpine, foliage, twigs } = this.layout;

    const barkMat = new THREE.MeshStandardMaterial({ color: theme.trunk, flatShading: true, roughness: 0.9 });

    // Organic trunk: stacked tapered segments along the S-curved spine.
    for (let i = 0; i < trunkSpine.length - 1; i++) {
      const a = new THREE.Vector3(trunkSpine[i].x, trunkSpine[i].y, trunkSpine[i].z);
      const b = new THREE.Vector3(trunkSpine[i + 1].x, trunkSpine[i + 1].y, trunkSpine[i + 1].z);
      const f0 = i / (trunkSpine.length - 1);
      const f1 = (i + 1) / (trunkSpine.length - 1);
      const r0 = TRUNK_BASE_R + (TRUNK_TOP_R - TRUNK_BASE_R) * f0;
      const r1 = TRUNK_BASE_R + (TRUNK_TOP_R - TRUNK_BASE_R) * f1;
      this.trunkGroup.add(boneMesh(a, b, r0 * 1.04, r1, barkMat, 8));
    }

    // Root flare around the base.
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + pseudoRandom(400 + i) * 0.5;
      const start = new THREE.Vector3(Math.cos(a) * 0.5, 0.9, Math.sin(a) * 0.5);
      const end = new THREE.Vector3(Math.cos(a) * (1.9 + pseudoRandom(410 + i) * 0.8), 0.02, Math.sin(a) * (1.9 + pseudoRandom(410 + i) * 0.8));
      this.trunkGroup.add(boneMesh(start, end, 0.42, 0.05, barkMat, 5));
    }
    this.group.add(this.trunkGroup);

    for (const limb of limbs) {
      const mesh = boneMesh(
        new THREE.Vector3(limb.start.x, limb.start.y, limb.start.z),
        new THREE.Vector3(limb.end.x, limb.end.y, limb.end.z),
        0.22,
        0.1,
        barkMat,
      );
      this.group.add(mesh);
      this.limbs.push({ mesh, reveal: limb.start.y / trunkHeight });
    }

    // Twigs share limb visibility behavior.
    for (const tw of twigs) {
      const mesh = boneMesh(
        new THREE.Vector3(tw.start.x, tw.start.y, tw.start.z),
        new THREE.Vector3(tw.end.x, tw.end.y, tw.end.z),
        0.07,
        0.02,
        barkMat,
        4,
      );
      this.group.add(mesh);
      this.limbs.push({ mesh, reveal: tw.reveal });
    }

    // Decorative foliage canopy (NOT raycast — picking targets leafMesh only).
    const foliageMat = new THREE.MeshStandardMaterial({ color: '#ffffff', flatShading: true, roughness: 0.85 });
    this.foliageMesh = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 0), foliageMat, foliage.length);
    {
      const m = new THREE.Matrix4();
      const color = new THREE.Color();
      foliage.forEach((spot, i) => {
        m.makeScale(spot.scale, spot.scale * 0.85, spot.scale).setPosition(spot.pos.x, spot.pos.y, spot.pos.z);
        this.foliageMesh.setMatrixAt(i, m);
        color.set(FOLIAGE_GREENS[Math.floor(pseudoRandom(i + 0.5) * FOLIAGE_GREENS.length)]);
        this.foliageMesh.setColorAt(i, color);
        this.foliageReveals.push(spot.reveal);
      });
    }
    if (this.foliageMesh.instanceColor) this.foliageMesh.instanceColor.needsUpdate = true;
    this.foliageMesh.computeBoundingSphere();
    this.group.add(this.foliageMesh);

    // Course leaves — clickable, slightly larger than before.
    const leafMat = new THREE.MeshStandardMaterial({ color: '#ffffff', flatShading: true, roughness: 0.55 });
    this.leafMesh = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.5, 0), leafMat, leaves.length);
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
      this.leafTransforms.push({ pos: pos.clone(), quat: quat.clone(), scale: s });
      const course = levels[leaf.levelIdx].semesters[leaf.semIdx].courses[leaf.courseIdx];
      this.leafMesh.setColorAt(i, color.set(theme.families[courseFamily(course.code)]));
      this.leafRefs.push({ course, levelIdx: leaf.levelIdx, semIdx: leaf.semIdx });
    });
    if (this.leafMesh.instanceColor) this.leafMesh.instanceColor.needsUpdate = true;
    // Compute the bounding sphere now, while count covers all instances —
    // computed lazily later it can be cached empty (count starts at 0), killing raycasts.
    this.leafMesh.computeBoundingSphere();
    this.group.add(this.leafMesh);

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

  /** p in [0,1]: trunk scales up, limbs/twigs appear, foliage and leaves reveal bottom-up. */
  setGrowth(p: number): void {
    const clamped = Math.min(1, Math.max(0, p));
    this.trunkGroup.scale.y = Math.max(0.02, clamped);
    for (const limb of this.limbs) limb.mesh.visible = clamped >= limb.reveal;

    let foliageCount = 0;
    while (foliageCount < this.foliageReveals.length && this.foliageReveals[foliageCount] <= clamped) foliageCount++;
    this.foliageMesh.count = foliageCount;

    const nextCount = Math.round(clamped * this.leafRefs.length);
    // If the spotlighted leaf is scrolling out of the visible window, reset its
    // matrix so it reappears in canonical state rather than mid-pulse.
    if (this.spotlight !== null && nextCount <= this.spotlight && this.leafMesh.count > this.spotlight) {
      this.restoreLeaf(this.spotlight);
    }
    this.leafMesh.count = nextCount;
  }

  /** Pulse one leaf (the guided ticker's current course); null clears it. */
  setSpotlight(index: number | null): void {
    if (index === this.spotlight) return;
    if (this.spotlight !== null) this.restoreLeaf(this.spotlight);
    this.spotlight = index;
  }

  private restoreLeaf(i: number): void {
    const t = this.leafTransforms[i];
    this.spotS.setScalar(t.scale);
    this.spotM.compose(t.pos, t.quat, this.spotS);
    this.leafMesh.setMatrixAt(i, this.spotM);
    this.leafMesh.instanceMatrix.needsUpdate = true;
  }

  update(t: number): void {
    this.group.rotation.z = Math.sin(t * 0.4) * 0.008;
    this.group.rotation.x = Math.cos(t * 0.3) * 0.006;

    if (this.spotlight !== null && this.spotlight < this.leafMesh.count) {
      const lt = this.leafTransforms[this.spotlight];
      this.spotS.setScalar(lt.scale * (1 + 0.22 * Math.sin(t * 5)));
      this.spotM.compose(lt.pos, lt.quat, this.spotS);
      this.leafMesh.setMatrixAt(this.spotlight, this.spotM);
      this.leafMesh.instanceMatrix.needsUpdate = true;
    }
  }
}
