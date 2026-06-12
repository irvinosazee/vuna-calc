import './ui/journey.css';
import * as THREE from 'three';
import { theme } from './data/journey';
import { JourneyTree } from './scene/tree';
import { Environment } from './scene/environment';
import { ScrollRig } from './rigs/ScrollRig';
import { OrbitRig } from './rigs/OrbitRig';
import type { CameraRig, Mode } from './rigs/types';
import { createOverlay } from './ui/overlay';
import { renderFallback } from './ui/fallback';
import { webglAvailable } from './ui/webgl';

const app = document.getElementById('app')!;
const overlayRoot = document.getElementById('overlay')!;

if (!webglAvailable()) {
  renderFallback(app);
} else {
  boot();
}

function boot(): void {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.domElement.classList.add('webgl');
  app.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(theme.fog.color, theme.fog.density);

  const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 200);

  const tree = new JourneyTree();
  scene.add(tree.group);

  const isMobile = window.matchMedia('(pointer: coarse)').matches;
  const env = new Environment(
    isMobile ? theme.particles.mobile : theme.particles.desktop,
    tree.layout.trunkHeight,
  );
  scene.add(env.group);

  const scrollRig = new ScrollRig(tree.layout.cameraPoints);
  const orbitRig = new OrbitRig(renderer.domElement, tree.layout.trunkHeight);
  let mode: Mode = 'journey';
  let rig: CameraRig = scrollRig;
  const p0 = tree.layout.cameraPoints[0];
  camera.position.set(p0.x, p0.y, p0.z);
  rig.enter(camera);

  function setMode(next: Mode): void {
    if (next === mode || next === 'walk') return;
    rig.dispose();
    mode = next;
    rig = next === 'explore' ? orbitRig : scrollRig;
    rig.enter(camera);
    document.body.classList.toggle('mode-explore', next === 'explore');
  }

  const ui = createOverlay(overlayRoot, setMode);

  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  let downAt = { x: 0, y: 0 };
  renderer.domElement.addEventListener('pointerdown', (e) => {
    downAt = { x: e.clientX, y: e.clientY };
  });
  renderer.domElement.addEventListener('pointerup', (e) => {
    if (Math.hypot(e.clientX - downAt.x, e.clientY - downAt.y) > 6) return;
    pointer.set((e.clientX / window.innerWidth) * 2 - 1, -(e.clientY / window.innerHeight) * 2 + 1);
    raycaster.setFromCamera(pointer, camera);
    const hit = raycaster.intersectObject(tree.leafMesh)[0];
    if (hit?.instanceId !== undefined) {
      ui.showCourse(tree.leafRefs[hit.instanceId]);
    } else {
      ui.hideCourse();
    }
  });

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  const clock = new THREE.Clock();
  renderer.setAnimationLoop(() => {
    const dt = Math.min(clock.getDelta(), 0.05);
    const t = clock.elapsedTime;
    rig.update(camera, dt);
    // Growth leads the camera (denominator < 1 progress span) so the climb is always through foliage.
    const growth = mode === 'explore' ? 1 : Math.min(1, Math.max(0, (scrollRig.progress - 0.04) / 0.7));
    tree.setGrowth(growth);
    tree.update(t);
    env.update(t);
    ui.update(scrollRig.progress, mode);
    renderer.render(scene, camera);
  });
}
