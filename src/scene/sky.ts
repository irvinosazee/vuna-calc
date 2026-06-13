import * as THREE from 'three';
import { theme } from '../data/journey';

const D = theme.sky.day;
const N = theme.sky.night;
const MORPH_SECS = 1.5;
const STAR_COUNT = 600;

/**
 * Day/night controller: lerps fog, hemisphere + sun lights, the firefly
 * material, a star field, and the CSS body gradient between the day and night
 * palettes. `set()` chooses a target; `update(dt)` advances the ~1.5s morph.
 */
export class Sky {
  private readonly stars: THREE.Points;
  private readonly starMat: THREE.PointsMaterial;
  private cur: number; // 0 = day, 1 = night
  private target: number;
  private readonly gDay = D.grad.map((h) => new THREE.Color(h));
  private readonly gNight = N.grad.map((h) => new THREE.Color(h));
  private readonly tmp = new THREE.Color();
  private readonly tmp2 = new THREE.Color();

  constructor(
    private readonly scene: THREE.Scene,
    private readonly hemi: THREE.HemisphereLight,
    private readonly sun: THREE.DirectionalLight,
    private readonly flyMat: THREE.PointsMaterial,
    startNight: boolean,
  ) {
    const pos = new Float32Array(STAR_COUNT * 3);
    for (let i = 0; i < STAR_COUNT; i++) {
      const ru = frac(Math.sin(i * 12.9898) * 43758.5453);
      const rv = frac(Math.sin(i * 78.233) * 43758.5453);
      const theta = ru * Math.PI * 2;
      const phi = Math.acos(2 * rv - 1);
      const R = 90;
      pos[i * 3] = R * Math.sin(phi) * Math.cos(theta);
      pos[i * 3 + 1] = Math.abs(R * Math.cos(phi)) * 0.8 + 12; // upper dome only
      pos[i * 3 + 2] = R * Math.sin(phi) * Math.sin(theta);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    this.starMat = new THREE.PointsMaterial({
      color: '#eaf2ff',
      size: 0.55,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    this.stars = new THREE.Points(geo, this.starMat);
    this.scene.add(this.stars);

    this.cur = startNight ? 1 : 0;
    this.target = this.cur;
    this.apply();
  }

  set(night: boolean): void {
    this.target = night ? 1 : 0;
  }

  isNight(): boolean {
    return this.target > 0.5;
  }

  update(dt: number): void {
    if (this.cur === this.target) return;
    const step = dt / MORPH_SECS;
    this.cur =
      this.cur < this.target
        ? Math.min(this.target, this.cur + step)
        : Math.max(this.target, this.cur - step);
    this.apply();
  }

  private apply(): void {
    const t = this.cur;
    if (this.scene.fog) {
      (this.scene.fog as THREE.FogExp2).color.copy(this.lerpHex(D.fog, N.fog, t));
    }
    this.hemi.color.copy(this.lerpHex(D.hemiSky, N.hemiSky, t));
    this.hemi.groundColor.copy(this.lerpHex(D.hemiGround, N.hemiGround, t));
    this.hemi.intensity = lerp(D.hemiInt, N.hemiInt, t);
    this.sun.color.copy(this.lerpHex(D.sun, N.sun, t));
    this.sun.intensity = lerp(D.sunInt, N.sunInt, t);
    this.flyMat.color.copy(this.lerpHex(D.fly, N.fly, t));
    this.flyMat.opacity = lerp(D.flyOpacity, N.flyOpacity, t);
    this.flyMat.size = lerp(D.flySize, N.flySize, t);
    this.starMat.opacity = lerp(D.star, N.star, t);

    const stops = this.gDay.map((c, i) =>
      '#' + this.tmp2.copy(c).lerp(this.gNight[i], t).getHexString(),
    );
    document.body.style.backgroundImage =
      `linear-gradient(to top, ${stops[0]} 0%, ${stops[1]} 40%, ${stops[2]} 78%, ${stops[3]} 100%)`;
  }

  private lerpHex(a: string, b: string, t: number): THREE.Color {
    return this.tmp.set(a).lerp(this.tmp2.set(b), t);
  }
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function frac(x: number): number {
  return x - Math.floor(x);
}
