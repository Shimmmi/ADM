import type { Shape, Vec2 } from '../content/schema';

export function inShape(s: Shape, x: number, z: number, pad = 0): boolean {
  if (s.shape === 'circle') {
    const dx = x - s.pos[0], dz = z - s.pos[1];
    return dx * dx + dz * dz <= (s.r + pad) ** 2;
  }
  let lx = x - s.pos[0], lz = z - s.pos[1];
  if (s.rotY) {
    // rotY в соглашении three.js: мир = Ry(rotY)·локальные.
    const c = Math.cos(s.rotY), si = Math.sin(s.rotY);
    [lx, lz] = [lx * c - lz * si, lx * si + lz * c];
  }
  return Math.abs(lx) <= s.size[0] / 2 + pad && Math.abs(lz) <= s.size[1] / 2 + pad;
}

/** Расстояние от точки до отрезка (XZ). */
export function distToSegment(px: number, pz: number, a: Vec2, b: Vec2): { d: number; t: number } {
  const vx = b[0] - a[0], vz = b[1] - a[1];
  const len2 = vx * vx + vz * vz || 1;
  const t = Math.max(0, Math.min(1, ((px - a[0]) * vx + (pz - a[1]) * vz) / len2));
  const cx = a[0] + vx * t, cz = a[1] + vz * t;
  return { d: Math.hypot(px - cx, pz - cz), t };
}

export function distToPolyline(px: number, pz: number, pts: Vec2[]): number {
  let best = Infinity;
  for (let i = 0; i < pts.length - 1; i++) best = Math.min(best, distToSegment(px, pz, pts[i], pts[i + 1]).d);
  return best;
}
