/**
 * Рельеф (TECH §6.3). Карта высот генерируется процедурно из zone.terrain.gen
 * (см. docs/AUDIT.md §7) и является единым источником для меша и физики.
 * Координаты зоны: x ∈ [0, W], z ∈ [0, D].
 */
import * as THREE from 'three';
import type { TerrainFeature, ZoneDef } from '../content/schema';
import { clamp, fbm, lerp, makeNoise, smoothstep } from './rng';
import { distToPolyline, distToSegment } from './shapes';

export class TerrainService {
  readonly w: number;
  readonly d: number;
  readonly step: number;
  readonly nx: number;
  readonly nz: number;
  readonly heights: Float32Array;
  readonly slopeMax: number;

  constructor(zone: ZoneDef) {
    [this.w, this.d] = zone.size;
    this.step = clamp(Math.max(this.w, this.d) / 256, 1, 2);
    this.nx = Math.ceil(this.w / this.step) + 1;
    this.nz = Math.ceil(this.d / this.step) + 1;
    this.heights = new Float32Array(this.nx * this.nz);
    this.slopeMax = zone.terrain.slopeMaxDeg;
    const g = zone.terrain.gen;
    const noise = makeNoise(g.seed);
    const oct = g.octaves ?? 4;
    const paths = zone.paths ?? [];
    for (let j = 0; j < this.nz; j++) {
      for (let i = 0; i < this.nx; i++) {
        const x = Math.min(this.w, i * this.step), z = Math.min(this.d, j * this.step);
        let h = g.base + g.noiseAmp * fbm(noise, x / g.noiseScale, z / g.noiseScale, oct);
        if (g.rim) {
          const edge = Math.min(x, z, this.w - x, this.d - z);
          h += g.rim * (1 - smoothstep(0, 18, edge));
        }
        for (const f of g.features ?? []) h = applyFeature(h, f, x, z);
        for (const p of paths) {
          const dist = distToPolyline(x, z, p.points);
          if (dist < p.width) h -= 0.15 * (1 - dist / p.width);
        }
        this.heights[j * this.nx + i] = h;
      }
    }
  }

  private at(i: number, j: number): number {
    i = clamp(i, 0, this.nx - 1);
    j = clamp(j, 0, this.nz - 1);
    return this.heights[j * this.nx + i];
  }

  getHeightAt(x: number, z: number): number {
    const fx = clamp(x, 0, this.w) / this.step, fz = clamp(z, 0, this.d) / this.step;
    const i = Math.floor(fx), j = Math.floor(fz);
    const tx = fx - i, tz = fz - j;
    const a = this.at(i, j), b = this.at(i + 1, j), c = this.at(i, j + 1), e = this.at(i + 1, j + 1);
    return lerp(lerp(a, b, tx), lerp(c, e, tx), tz);
  }

  /** Градиент (dh/dx, dh/dz). */
  gradient(x: number, z: number, out = { x: 0, z: 0 }): { x: number; z: number } {
    const e = this.step;
    out.x = (this.getHeightAt(x + e, z) - this.getHeightAt(x - e, z)) / (2 * e);
    out.z = (this.getHeightAt(x, z + e) - this.getHeightAt(x, z - e)) / (2 * e);
    return out;
  }

  slopeDeg(x: number, z: number): number {
    const g = this.gradient(x, z);
    return (Math.atan(Math.hypot(g.x, g.z)) * 180) / Math.PI;
  }

  minMax(): [number, number] {
    let lo = Infinity, hi = -Infinity;
    for (const h of this.heights) {
      if (h < lo) lo = h;
      if (h > hi) hi = h;
    }
    return [lo, hi];
  }
}

function applyFeature(h: number, f: TerrainFeature, x: number, z: number): number {
  const fo = f.falloff ?? 8;
  const d = Math.hypot(x - f.pos[0], z - f.pos[1]);
  const r = f.r ?? 10;
  switch (f.kind) {
    case 'hill':
      return h + f.height * smoothstep(r, 0, d);
    case 'basin':
      return h - f.height * smoothstep(r, 0, d);
    case 'flat':
      return lerp(h, f.height, 1 - smoothstep(r, r + fo, d));
    case 'ramp': {
      if (!f.to) return h;
      const s = distToSegment(x, z, f.pos, f.to);
      const target = lerp(f.height, f.height2 ?? f.height, s.t);
      const half = (f.width ?? 6) / 2;
      return lerp(h, target, 1 - smoothstep(half, half + fo, s.d));
    }
    case 'ridge': {
      if (!f.to) return h;
      const s = distToSegment(x, z, f.pos, f.to);
      const half = (f.width ?? 10) / 2;
      return h + f.height * (1 - smoothstep(half, half + fo, s.d));
    }
  }
  return h;
}

export interface TerrainColors {
  ground: THREE.Color;
  alt: THREE.Color;
  path: THREE.Color;
}

/** Меш рельефа: сетка чанков N×N, 3 уровня LOD, «юбки» против щелей между LOD. */
export function buildTerrainMesh(t: TerrainService, zone: ZoneDef, colors: TerrainColors, material: THREE.Material): THREE.Group {
  const group = new THREE.Group();
  group.name = 'terrain';
  const n = zone.terrain.chunks;
  const cellsX = t.nx - 1, cellsZ = t.nz - 1;
  const paths = zone.paths ?? [];
  const tmp = new THREE.Color();

  const colorAt = (x: number, z: number, h: number, lo: number, hi: number) => {
    const slope = t.slopeDeg(x, z);
    tmp.copy(colors.ground);
    const rock = smoothstep(24, 38, slope);
    tmp.lerp(colors.alt, rock);
    const hf = hi > lo ? (h - lo) / (hi - lo) : 0;
    tmp.offsetHSL(0, 0, (hf - 0.5) * 0.06);
    for (const p of paths) {
      const dd = distToPolyline(x, z, p.points);
      if (dd < p.width) tmp.lerp(colors.path, 0.55 * (1 - dd / p.width));
    }
    return tmp;
  };

  const [lo, hi] = t.minMax();
  for (let cj = 0; cj < n; cj++) {
    for (let ci = 0; ci < n; ci++) {
      const i0 = Math.floor((ci * cellsX) / n), i1 = Math.floor(((ci + 1) * cellsX) / n);
      const j0 = Math.floor((cj * cellsZ) / n), j1 = Math.floor(((cj + 1) * cellsZ) / n);
      const lod = new THREE.LOD();
      const chunkSize = ((i1 - i0) * t.step);
      [1, 2, 4].forEach((stride, level) => {
        const geo = chunkGeometry(t, i0, i1, j0, j1, stride, colorAt, lo, hi);
        const mesh = new THREE.Mesh(geo, material);
        mesh.receiveShadow = true;
        mesh.matrixAutoUpdate = false;
        lod.addLevel(mesh, level === 0 ? 0 : chunkSize * (level === 1 ? 1.4 : 2.8));
      });
      lod.matrixAutoUpdate = false;
      group.add(lod);
    }
  }
  return group;
}

function chunkGeometry(
  t: TerrainService,
  i0: number, i1: number, j0: number, j1: number, stride: number,
  colorAt: (x: number, z: number, h: number, lo: number, hi: number) => THREE.Color,
  lo: number, hi: number,
): THREE.BufferGeometry {
  const xs: number[] = [], zs: number[] = [];
  for (let i = i0; i < i1; i += stride) xs.push(i);
  xs.push(i1);
  for (let j = j0; j < j1; j += stride) zs.push(j);
  zs.push(j1);
  const cols = xs.length, rows = zs.length;
  const pos: number[] = [], col: number[] = [], idx: number[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = Math.min(t.w, xs[c] * t.step), z = Math.min(t.d, zs[r] * t.step);
      const h = t.heights[zs[r] * t.nx + xs[c]];
      pos.push(x, h, z);
      const cc = colorAt(x, z, h, lo, hi);
      col.push(cc.r, cc.g, cc.b);
    }
  }
  for (let r = 0; r < rows - 1; r++) {
    for (let c = 0; c < cols - 1; c++) {
      const a = r * cols + c, b = a + 1, d = a + cols, e = d + 1;
      idx.push(a, d, b, b, d, e);
    }
  }
  // Юбки по периметру чанка — закрывают щели между уровнями LOD.
  const skirt = (ids: number[]) => {
    for (let k = 0; k < ids.length - 1; k++) {
      const a = ids[k], b = ids[k + 1];
      const base = pos.length / 3;
      for (const v of [a, b]) {
        pos.push(pos[v * 3], pos[v * 3 + 1] - 3, pos[v * 3 + 2]);
        col.push(col[v * 3], col[v * 3 + 1], col[v * 3 + 2]);
      }
      idx.push(a, base, b, b, base, base + 1);
      idx.push(a, b, base, b, base + 1, base);
    }
  };
  skirt(Array.from({ length: cols }, (_, c) => c));
  skirt(Array.from({ length: cols }, (_, c) => (rows - 1) * cols + c));
  skirt(Array.from({ length: rows }, (_, r) => r * cols));
  skirt(Array.from({ length: rows }, (_, r) => r * cols + cols - 1));

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  geo.computeBoundingSphere();
  return geo;
}
