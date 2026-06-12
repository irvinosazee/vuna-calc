import * as THREE from 'three';
import type { CameraRig } from './types';

const EYE_HEIGHT = 1.7;
const SPEED = 6; // world units / second
const MIN_R = 4; // can't walk into the trunk
const MAX_R = 45; // can't walk off the grove
const LOOK_SENS = 0.004;
const PITCH_LIMIT = Math.PI * 0.39; // ~70°
const JOY_RANGE = 60; // px of thumb travel for full speed

/**
 * First-person stroll on the grove floor.
 * Desktop: WASD/arrows move, pointer-drag looks.
 * Touch: left-half virtual joystick moves, right-half drag looks.
 */
export class WalkRig implements CameraRig {
  private yaw = 0;
  private pitch = 0;
  private readonly keys = new Set<string>();
  private lookId: number | null = null;
  private lookLast = { x: 0, y: 0 };
  private moveId: number | null = null;
  private moveVec = { x: 0, y: 0 }; // joystick offset in px
  private detach: (() => void)[] = [];
  private joyBase?: HTMLElement;
  private joyNub?: HTMLElement;

  constructor(
    private readonly dom: HTMLElement,
    private readonly touch: boolean,
  ) {}

  enter(camera: THREE.PerspectiveCamera): void {
    // Defensive: never double-register if enter() is called twice.
    this.dispose();

    camera.position.set(0, EYE_HEIGHT, 14);
    this.yaw = 0; // facing -z = facing the trunk from +z
    this.pitch = 0.15; // a hint upward, toward the canopy

    const on = <K extends keyof WindowEventMap>(
      target: Window | HTMLElement,
      type: K | string,
      fn: (e: never) => void,
      opts?: AddEventListenerOptions,
    ): void => {
      target.addEventListener(type as string, fn as EventListener, opts);
      this.detach.push(() => target.removeEventListener(type as string, fn as EventListener, opts));
    };

    on(window, 'keydown', (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(k)) e.preventDefault();
      this.keys.add(k);
    });
    on(window, 'keyup', (e: KeyboardEvent) => this.keys.delete(e.key.toLowerCase()));

    on(this.dom, 'pointerdown', (e: PointerEvent) => {
      if (this.touch && e.clientX < window.innerWidth / 2 && this.moveId === null) {
        this.dom.setPointerCapture(e.pointerId);
        this.moveId = e.pointerId;
        this.moveVec = { x: 0, y: 0 };
        this.showJoystick(e.clientX, e.clientY);
      } else if (this.lookId === null) {
        this.dom.setPointerCapture(e.pointerId);
        this.lookId = e.pointerId;
        this.lookLast = { x: e.clientX, y: e.clientY };
      }
    });
    on(this.dom, 'pointermove', (e: PointerEvent) => {
      if (e.pointerId === this.lookId) {
        this.yaw -= (e.clientX - this.lookLast.x) * LOOK_SENS;
        this.pitch = Math.max(
          -PITCH_LIMIT,
          Math.min(PITCH_LIMIT, this.pitch - (e.clientY - this.lookLast.y) * LOOK_SENS),
        );
        this.lookLast = { x: e.clientX, y: e.clientY };
      } else if (e.pointerId === this.moveId) {
        const r = this.joyBase!.getBoundingClientRect();
        this.moveVec = {
          x: e.clientX - (r.left + r.width / 2),
          y: e.clientY - (r.top + r.height / 2),
        };
        const len = Math.hypot(this.moveVec.x, this.moveVec.y);
        if (len > JOY_RANGE) {
          this.moveVec.x *= JOY_RANGE / len;
          this.moveVec.y *= JOY_RANGE / len;
        }
        this.joyNub!.style.transform = `translate(${this.moveVec.x}px, ${this.moveVec.y}px)`;
      }
    });
    const release = (e: PointerEvent): void => {
      if (e.pointerId === this.lookId) this.lookId = null;
      if (e.pointerId === this.moveId) {
        this.moveId = null;
        this.moveVec = { x: 0, y: 0 };
        this.hideJoystick();
      }
    };
    on(this.dom, 'pointerup', release);
    on(this.dom, 'pointercancel', release);
  }

  update(camera: THREE.PerspectiveCamera, dt: number): void {
    let f = 0;
    let s = 0;
    if (this.keys.has('w') || this.keys.has('arrowup')) f += 1;
    if (this.keys.has('s') || this.keys.has('arrowdown')) f -= 1;
    if (this.keys.has('a') || this.keys.has('arrowleft')) s -= 1;
    if (this.keys.has('d') || this.keys.has('arrowright')) s += 1;
    f += -this.moveVec.y / JOY_RANGE;
    s += this.moveVec.x / JOY_RANGE;
    const len = Math.hypot(f, s);
    if (len > 1) {
      f /= len;
      s /= len;
    }

    const sinY = Math.sin(this.yaw);
    const cosY = Math.cos(this.yaw);
    // yaw 0 faces -z: forward = (-sinY, 0, -cosY), right = (cosY, 0, -sinY)
    camera.position.x += (-sinY * f + cosY * s) * SPEED * dt;
    camera.position.z += (-cosY * f - sinY * s) * SPEED * dt;

    const r = Math.hypot(camera.position.x, camera.position.z);
    if (r > 0 && (r < MIN_R || r > MAX_R)) {
      const clamped = Math.max(MIN_R, Math.min(MAX_R, r));
      camera.position.x *= clamped / r;
      camera.position.z *= clamped / r;
    }
    camera.position.y = EYE_HEIGHT;

    camera.rotation.set(0, 0, 0);
    camera.rotateY(this.yaw);
    camera.rotateX(this.pitch);
  }

  dispose(): void {
    this.detach.forEach((d) => d());
    this.detach = [];
    this.keys.clear();
    this.lookId = null;
    this.moveId = null;
    this.moveVec = { x: 0, y: 0 };
    this.hideJoystick();
  }

  private showJoystick(x: number, y: number): void {
    if (!this.joyBase) {
      this.joyBase = document.createElement('div');
      this.joyBase.className = 'joystick';
      this.joyNub = document.createElement('div');
      this.joyNub.className = 'joystick-nub';
      this.joyBase.appendChild(this.joyNub);
      document.body.appendChild(this.joyBase);
    }
    this.joyBase.style.left = `${x}px`;
    this.joyBase.style.top = `${y}px`;
    this.joyBase.classList.add('active');
    this.joyNub!.style.transform = 'translate(0, 0)';
  }

  private hideJoystick(): void {
    this.joyBase?.classList.remove('active');
  }
}
