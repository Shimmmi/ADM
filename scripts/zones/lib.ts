/** Хелперы авторинга зон: описание на TS → JSON в src/content/zones/. */
import type { InteractableDef, PropDef, ScatterDef, Vec2, Vec3 } from '../../src/content/schema';

/** Ограда по периметру прямоугольника из сегментов `fence` (5 м), с проёмами [x0,x1] на южной стороне. */
export function fenceRect(prefix: string, x0: number, z0: number, x1: number, z1: number, southGaps: Vec2[] = []): PropDef[] {
  const out: PropDef[] = [];
  const seg = 5;
  const side = (ax: number, az: number, bx: number, bz: number, name: string, gaps: Vec2[]) => {
    const len = Math.hypot(bx - ax, bz - az);
    const n = Math.round(len / seg);
    const rot = Math.atan2(bz - az, bx - ax);
    for (let i = 0; i < n; i++) {
      const t = (i + 0.5) / n;
      const x = ax + (bx - ax) * t, z = az + (bz - az) * t;
      if (gaps.some(([g0, g1]) => x > g0 - 2 && x < g1 + 2)) continue;
      out.push({ id: `${prefix}_${name}${i}`, asset: 'fence', pos: [r(x), 0, r(z)], rotY: r(-rot), collider: { type: 'box', size: [5, 0.5] } });
    }
  };
  side(x0, z0, x1, z0, 'n', []);
  side(x0, z1, x1, z1, 's', southGaps);
  side(x0, z0, x0, z1, 'w', []);
  side(x1, z0, x1, z1, 'e', []);
  return out;
}

export function r(v: number): number {
  return Math.round(v * 100) / 100;
}

/** Точки на окружности: для полян, камней, табличек. */
export function ring(cx: number, cz: number, radius: number, n: number, phase = 0): Vec2[] {
  return Array.from({ length: n }, (_, i) => {
    const a = phase + (i / n) * Math.PI * 2;
    return [r(cx + Math.cos(a) * radius), r(cz + Math.sin(a) * radius)];
  });
}

export function pickup(id: string, model: string, pos: Vec3, prompt: string, effects: InteractableDef['effects'], extra: Partial<InteractableDef> = {}): InteractableDef {
  return { id, kind: 'pickup', model, pos, radius: 2.2, prompt, once: true, effects, ...extra };
}

export function forest(seed: number, count: number, avoid: string[], extra: Partial<ScatterDef> = {}): ScatterDef[] {
  return [
    { asset: 'tree_spruce', count, seed, minDist: 4, avoid, scaleRange: [0.8, 1.5], collider: 0.6, ...extra },
    { asset: 'snow_mound', count: Math.round(count / 4), seed: seed + 1, minDist: 3, avoid, scaleRange: [0.6, 1.4] },
    { asset: 'rock', count: Math.round(count / 8), seed: seed + 2, minDist: 5, avoid, scaleRange: [0.6, 1.6], collider: 0.5 },
  ];
}
