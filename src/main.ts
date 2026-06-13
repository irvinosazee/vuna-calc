import './ui/journey.css';
import * as THREE from 'three';
import { theme, levels } from './data/journey';
import { chapterAt, leafIndexOf } from './journey/chapters';
import { JourneyTree } from './scene/tree';
import { Environment } from './scene/environment';
import { Avatar } from './scene/avatar';
import { AmbientWander } from './scene/wander';
import { ScrollRig } from './rigs/ScrollRig';
import { OrbitRig } from './rigs/OrbitRig';
import { ClimbRig } from './rigs/ClimbRig';
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
  const isMobile = window.matchMedia('(pointer: coarse)').matches;

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, isMobile ? 1.75 : 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.domElement.classList.add('webgl');
  app.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(theme.fog.color, theme.fog.density);

  const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 200);

  const tree = new JourneyTree();
  scene.add(tree.group);

  const env = new Environment(
    isMobile ? theme.particles.mobile : theme.particles.desktop,
    tree.layout.trunkHeight,
    !isMobile,
  );
  scene.add(env.group);

  const avatar = new Avatar();
  scene.add(avatar.group);
  const wander = new AmbientWander(avatar);

  const scrollRig = new ScrollRig(tree.layout.cameraPoints);
  const orbitRig = new OrbitRig(renderer.domElement, tree.layout.trunkHeight);
  const climbRig = new ClimbRig(renderer.domElement, avatar, tree.layout);
  let mode: Mode = 'journey';
  let rig: CameraRig = scrollRig;
  const p0 = tree.layout.cameraPoints[0];
  camera.position.set(p0.x, p0.y, p0.z);
  rig.enter(camera);

  const clock = new THREE.Clock();
  let bubbleUntil = 0;
  const proj = new THREE.Vector3();

  function setMode(next: Mode): void {
    if (next === mode) return;
    rig.dispose();
    mode = next;
    rig = next === 'explore' ? orbitRig : next === 'climb' ? climbRig : scrollRig;
    rig.enter(camera);
    // Non-journey modes lock page scroll (class also used by explore).
    document.body.classList.toggle('mode-explore', next !== 'journey');
  }

  function onCalc(open: boolean): void {
    // Opening the calculator drops into the ambient explore view (Irvin roams
    // behind the glass card); closing returns to the guided journey.
    setMode(open ? 'explore' : 'journey');
  }

  const ui = createOverlay(
    overlayRoot,
    setMode,
    isMobile,
    (follow) => orbitRig.setFollow(follow ? () => avatar.group.position : null),
    onCalc,
  );

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
    const avatarHit = raycaster.intersectObject(avatar.group, true)[0];
    const leafHit = raycaster.intersectObject(tree.leafMesh)[0];
    if (avatarHit && (!leafHit || avatarHit.distance < leafHit.distance)) {
      avatar.wave(clock.elapsedTime);
      bubbleUntil = clock.elapsedTime + 3;
    } else if (leafHit?.instanceId !== undefined) {
      ui.showCourse(tree.leafRefs[leafHit.instanceId]);
    } else {
      ui.hideCourse();
    }
  });

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  renderer.setAnimationLoop(() => {
    const dt = Math.min(clock.getDelta(), 0.05);
    const t = clock.elapsedTime;
    rig.update(camera, dt);

    // Always derived from scroll progress (not the active rig) so the guided
    // position is preserved when the user dips into explore/climb and back.
    const pos = chapterAt(scrollRig.progress, levels);
    const growth =
      mode !== 'journey' ? 1 : Math.min(1, Math.max(0, (scrollRig.progress - 0.04) / 0.7));
    tree.setGrowth(growth);
    tree.setSpotlight(
      mode === 'journey' && pos.phase === 'course'
        ? leafIndexOf(levels, pos.levelIdx, pos.semIdx, pos.courseIdx)
        : null,
    );
    if (mode !== 'climb') wander.update(t, dt, mode);
    tree.update(t);
    env.update(t);
    ui.update(scrollRig.progress, mode, pos);

    // Irvin speech bubble follows his projected head while active.
    if (t < bubbleUntil) {
      proj.set(avatar.group.position.x, avatar.group.position.y + 1.6, avatar.group.position.z);
      proj.project(camera);
      ui.setIrvinBubble(
        proj.z < 1
          ? { x: (proj.x * 0.5 + 0.5) * window.innerWidth, y: (-proj.y * 0.5 + 0.5) * window.innerHeight }
          : null,
      );
    } else {
      ui.setIrvinBubble(null);
    }

    renderer.render(scene, camera);
  });
}
