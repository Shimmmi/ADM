/** CollisionService (TECH §6.3): статические окружности/боксы по XZ в пространственной сетке. */
export interface Collider {
  id: string;
  kind: 'circle' | 'box';
  x: number;
  z: number;
  r: number;
  hx: number;
  hz: number;
  rot: number;
  enabled: boolean;
}

const CELL = 8;

export class CollisionService {
  private grid = new Map<number, Collider[]>();
  private all: Collider[] = [];

  private key(i: number, j: number) {
    return (i + 512) * 4096 + (j + 512);
  }

  private insert(c: Collider) {
    this.all.push(c);
    const ext = c.kind === 'circle' ? c.r : Math.hypot(c.hx, c.hz);
    const i0 = Math.floor((c.x - ext) / CELL), i1 = Math.floor((c.x + ext) / CELL);
    const j0 = Math.floor((c.z - ext) / CELL), j1 = Math.floor((c.z + ext) / CELL);
    for (let i = i0; i <= i1; i++) for (let j = j0; j <= j1; j++) {
      const k = this.key(i, j);
      let list = this.grid.get(k);
      if (!list) this.grid.set(k, (list = []));
      list.push(c);
    }
  }

  addCircle(id: string, x: number, z: number, r: number): Collider {
    const c: Collider = { id, kind: 'circle', x, z, r, hx: 0, hz: 0, rot: 0, enabled: true };
    this.insert(c);
    return c;
  }

  /** `rotY` — в соглашении three.js (`object.rotation.y`). */
  addBox(id: string, x: number, z: number, sx: number, sz: number, rotY = 0): Collider {
    const c: Collider = { id, kind: 'box', x, z, r: 0, hx: sx / 2, hz: sz / 2, rot: -rotY, enabled: true };
    this.insert(c);
    return c;
  }

  setEnabled(id: string, on: boolean): void {
    for (const c of this.all) if (c.id === id) c.enabled = on;
  }

  clear(): void {
    this.grid.clear();
    this.all = [];
  }

  get count(): number {
    return this.all.length;
  }

  /** Выталкивает окружность (x,z,r) из препятствий. Возвращает true, если было столкновение. */
  resolve(p: { x: number; z: number }, r: number): boolean {
    let hit = false;
    const i = Math.floor(p.x / CELL), j = Math.floor(p.z / CELL);
    for (let di = -1; di <= 1; di++) for (let dj = -1; dj <= 1; dj++) {
      const list = this.grid.get(this.key(i + di, j + dj));
      if (!list) continue;
      for (const c of list) {
        if (!c.enabled) continue;
        if (c.kind === 'circle') {
          const dx = p.x - c.x, dz = p.z - c.z;
          const min = c.r + r;
          const d2 = dx * dx + dz * dz;
          if (d2 < min * min) {
            const d = Math.sqrt(d2) || 0.0001;
            p.x = c.x + (dx / d) * min;
            p.z = c.z + (dz / d) * min;
            hit = true;
          }
        } else {
          const cs = Math.cos(-c.rot), sn = Math.sin(-c.rot);
          const lx0 = p.x - c.x, lz0 = p.z - c.z;
          const lx = lx0 * cs - lz0 * sn, lz = lx0 * sn + lz0 * cs;
          const qx = Math.max(-c.hx, Math.min(c.hx, lx)), qz = Math.max(-c.hz, Math.min(c.hz, lz));
          const dx = lx - qx, dz = lz - qz;
          const d2 = dx * dx + dz * dz;
          if (d2 < r * r) {
            let nx: number, nz: number;
            if (d2 > 1e-8) {
              const d = Math.sqrt(d2);
              nx = qx + (dx / d) * r;
              nz = qz + (dz / d) * r;
            } else {
              const px = c.hx - Math.abs(lx), pz = c.hz - Math.abs(lz);
              if (px < pz) { nx = Math.sign(lx || 1) * (c.hx + r); nz = lz; }
              else { nx = lx; nz = Math.sign(lz || 1) * (c.hz + r); }
            }
            const cs2 = Math.cos(c.rot), sn2 = Math.sin(c.rot);
            p.x = c.x + nx * cs2 - nz * sn2;
            p.z = c.z + nx * sn2 + nz * cs2;
            hit = true;
          }
        }
      }
    }
    return hit;
  }
}
