import './ui/journey.css';
import * as THREE from 'three';
import { theme } from './data/journey';
import { JourneyTree } from './scene/tree';
import { Environment } from './scene/environment';
import { ScrollRig } from './rigs/ScrollRig';
import { OrbitRig } from './rigs/OrbitRig';
import type { CameraRig, Mode } from './rigs/types';
import { renderFallback } from './ui/fallback';
import { webglAvailable } from './ui/webgl';

const app = document.getElementById('app')!;

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

  // Exposed for the overlay (Task 8 wires real buttons to this).
  function setMode(next: Mode): void {
    if (next === mode || next === 'walk') return;
    rig.dispose();
    mode = next;
    rig = next === 'explore' ? orbitRig : scrollRig;
    rig.enter(camera);
    document.body.classList.toggle('mode-explore', next === 'explore');
  }
  // Referenced via `void` so TS keeps it; Task 8's overlay wires real buttons to setMode.
  void setMode;

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
    const growth = mode === 'explore' ? 1 : Math.min(1, Math.max(0, (scrollRig.progress - 0.04) / 0.86));
    tree.setGrowth(growth);
    tree.update(t);
    env.update(t);
    renderer.render(scene, camera);
  });
}
