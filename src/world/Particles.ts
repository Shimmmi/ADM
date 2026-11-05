/** Частицы (TECH §13): пресеты на THREE.Points, общий бюджет ≤ 3000. */
import * as THREE from 'three';

interface Preset {
  count: number;
  color: string;
  size: number;
  area: number;
  height: [number, number];
  vel: [number, number, number];
  jitter: number;
  additive?: boolean;
  opacity?: number;
}

const PRESETS: Record<string, Preset> = {
  snow_light: { count: 500, color: '#ffffff', size: 0.25, area: 60, height: [0, 25], vel: [0.3, -1.2, 0.1], jitter: 0.4 },
  snow_heavy: { count: 900, color: '#ffffff', size: 0.3, area: 50, height: [0, 22], vel: [2.4, -2.2, 0.6], jitter: 0.8 },
  ice_sparkles: { count: 300, color: '#bff4ff', size: 0.22, area: 50, height: [0.2, 4], vel: [0, 0.05, 0], jitter: 0.2, additive: true },
  dust_wind: { count: 500, color: '#e6cf9a', size: 0.22, area: 55, height: [0.2, 8], vel: [4, 0.1, 0.8], jitter: 0.6, opacity: 0.6 },
  embers: { count: 600, color: '#ff8a3a', size: 0.25, area: 50, height: [0, 18], vel: [0.3, 1.6, 0.2], jitter: 0.6, additive: true },
  spores: { count: 400, color: '#9fffd8', size: 0.2, area: 40, height: [0, 10], vel: [0.05, 0.25, 0.05], jitter: 0.3, additive: true },
  fireflies_day: { count: 200, color: '#fff3a0', size: 0.22, area: 45, height: [0.5, 6], vel: [0, 0.1, 0], jitter: 0.6, additive: true },
  lanterns_float: { count: 160, color: '#ffb35a', size: 0.7, area: 80, height: [8, 40], vel: [0.1, 0.5, 0.05], jitter: 0.1, additive: true },
  mist: { count: 220, color: '#f2f0ea', size: 6, area: 90, height: [0, 25], vel: [0.4, 0.02, 0.1], jitter: 0.05, opacity: 0.12 },
  birds: { count: 40, color: '#2b2b33', size: 0.6, area: 120, height: [25, 60], vel: [2.2, 0, 1.1], jitter: 0.5 },
};

export class Particles {
  readonly group = new THREE.Group();
  private systems: { pts: THREE.Points; p: Preset; vel: Float32Array }[] = [];
  private density = 1;

  constructor(private origin: THREE.Vector3) {}

  setDensity(d: number): void {
    this.density = d;
  }

  set(presets: string[], reduce: boolean): void {
    this.dispose();
    let budget = 3000;
    for (const name of presets) {
      const base = PRESETS[name];
      if (!base) continue;
      let count = Math.floor(base.count * this.density * (reduce ? 0.35 : 1));
      count = Math.min(count, budget);
      budget -= count;
      if (count <= 0) continue;
      const pos = new Float32Array(count * 3);
      const vel = new Float32Array(count * 3);
      for (let i = 0; i < count; i++) {
        pos[i * 3] = this.origin.x + (Math.random() - 0.5) * base.area * 2;
        pos[i * 3 + 1] = this.origin.y + base.height[0] + Math.random() * (base.height[1] - base.height[0]);
        pos[i * 3 + 2] = this.origin.z + (Math.random() - 0.5) * base.area * 2;
        vel[i * 3] = base.vel[0] + (Math.random() - 0.5) * base.jitter;
        vel[i * 3 + 1] = base.vel[1] + (Math.random() - 0.5) * base.jitter;
        vel[i * 3 + 2] = base.vel[2] + (Math.random() - 0.5) * base.jitter;
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      const m = new THREE.PointsMaterial({
        color: base.color,
        size: base.size,
        transparent: true,
        opacity: base.opacity ?? 0.9,
        depthWrite: false,
        blending: base.additive ? THREE.AdditiveBlending : THREE.NormalBlending,
        sizeAttenuation: true,
      });
      const pts = new THREE.Points(geo, m);
      pts.frustumCulled = false;
      this.group.add(pts);
      this.systems.push({ pts, p: base, vel });
    }
  }

  get active(): number {
    return this.systems.reduce((s, x) => s + x.vel.length / 3, 0);
  }

  update(dt: number, t: number): void {
    const o = this.origin;
    for (const s of this.systems) {
      const attr = s.pts.geometry.getAttribute('position') as THREE.BufferAttribute;
      const a = attr.array as Float32Array;
      const area = s.p.area;
      for (let i = 0; i < a.length; i += 3) {
        a[i] += s.vel[i] * dt + Math.sin(t + i) * 0.003;
        a[i + 1] += s.vel[i + 1] * dt;
        a[i + 2] += s.vel[i + 2] * dt;
        if (a[i] - o.x > area) a[i] -= area * 2;
        else if (a[i] - o.x < -area) a[i] += area * 2;
        if (a[i + 2] - o.z > area) a[i + 2] -= area * 2;
        else if (a[i + 2] - o.z < -area) a[i + 2] += area * 2;
        const top = o.y + s.p.height[1], bot = o.y + s.p.height[0] - 2;
        if (a[i + 1] < bot) a[i + 1] = top;
        else if (a[i + 1] > top) a[i + 1] = bot + 2;
      }
      attr.needsUpdate = true;
    }
  }

  dispose(): void {
    for (const s of this.systems) {
      s.pts.geometry.dispose();
      (s.pts.material as THREE.Material).dispose();
      this.group.remove(s.pts);
    }
    this.systems = [];
  }
}
