/**
 * MG_THIN_ICE (CH03): три «зоны трещин» из zone.thinIce. Безопасная тропа — тёмные пятна в толще льда,
 * тонкий лёд — синие швы. Шаг на тонкий лёд — «хрусть» и возврат на чекпоинт. Q Бацзе подсвечивает тропу.
 * Мировая мини-игра: мир не блокируется.
 */
import * as THREE from 'three';
import type { Minigame, MinigameCtx, MinigameResult } from './types';
import { MgPanel } from './types';
import { rng } from '../world/rng';

interface Field {
  x0: number;
  z0: number;
  cols: number;
  rows: number;
  cell: number;
  safe: Set<number>;
  spots: THREE.InstancedMesh;
  seams: THREE.InstancedMesh;
}

/** Тропа от южного края к северному: случайное блуждание без возвратов. */
export function safePath(cols: number, rows: number, seed: number): Set<number> {
  const r = rng(seed);
  const safe = new Set<number>();
  let c = Math.floor(cols / 2);
  for (let row = rows - 1; row >= 0; row--) {
    safe.add(row * cols + c);
    const steps = Math.floor(r() * 3);
    const dir = r() < 0.5 ? -1 : 1;
    for (let s = 0; s < steps; s++) {
      const nc = c + dir;
      if (nc < 0 || nc >= cols) break;
      c = nc;
      safe.add(row * cols + c);
    }
  }
  return safe;
}

export class ThinIce implements Minigame {
  readonly world = true;

  run(ctx: MinigameCtx): Promise<MinigameResult> {
    return new Promise((resolve) => {
      const defs = ctx.zone.def.thinIce ?? [];
      const group = new THREE.Group();
      ctx.zone.group.add(group);
      const spotMat = new THREE.MeshStandardMaterial({ color: '#1d3b52', roughness: 0.3, transparent: true, opacity: 0.85 });
      const seamMat = new THREE.MeshStandardMaterial({ color: '#7fd6ff', emissive: '#4fb8ff', emissiveIntensity: 0.6, transparent: true, opacity: 0.75 });
      const fields: Field[] = defs.map((d) => {
        const cols = Math.max(2, Math.round(d.size[0] / d.cell));
        const rows = Math.max(2, Math.round(d.size[1] / d.cell));
        const safe = safePath(cols, rows, d.seed);
        const x0 = d.pos[0] - d.size[0] / 2, z0 = d.pos[1] - d.size[1] / 2;
        const spotGeo = new THREE.CircleGeometry(d.cell * 0.38, 10).rotateX(-Math.PI / 2);
        const seamGeo = new THREE.PlaneGeometry(d.cell * 0.9, 0.12).rotateX(-Math.PI / 2);
        const spots = new THREE.InstancedMesh(spotGeo, spotMat, safe.size);
        const seams = new THREE.InstancedMesh(seamGeo, seamMat, cols * rows - safe.size);
        const m = new THREE.Matrix4();
        const q = new THREE.Quaternion();
        const up = new THREE.Vector3(0, 1, 0);
        const r = rng(d.seed + 7);
        let si = 0, ti = 0;
        for (let row = 0; row < rows; row++) for (let col = 0; col < cols; col++) {
          const x = x0 + (col + 0.5) * d.cell, z = z0 + (row + 0.5) * d.cell;
          const y = ctx.zone.h(x, z) + 0.06;
          q.setFromAxisAngle(up, r() * Math.PI);
          m.compose(new THREE.Vector3(x, y, z), q, new THREE.Vector3(1, 1, 1));
          if (safe.has(row * cols + col)) spots.setMatrixAt(si++, m);
          else seams.setMatrixAt(ti++, m);
        }
        group.add(spots, seams);
        return { x0, z0, cols, rows, cell: d.cell, safe, spots, seams };
      });

      const panel = new MgPanel(ctx, 'Тонкий лёд', 'Иди по тёмным пятнам. Синие швы — тонкий лёд. Q — нюх Бацзе подсветит тропу.', () => false);
      const fieldAt = (x: number, z: number): { f: Field; idx: number } | null => {
        for (const f of fields) {
          const col = Math.floor((x - f.x0) / f.cell), row = Math.floor((z - f.z0) / f.cell);
          if (col >= 0 && col < f.cols && row >= 0 && row < f.rows) return { f, idx: row * f.cols + col };
        }
        return null;
      };
      const crossed = new Set<number>();
      let crunchT = 0;
      let glowUntil = 0;
      const offSniff = ctx.quest.bus.on('event', (e) => { if (e.name === 'sniff') glowUntil = ctx.now() + 5; });
      const door = ctx.zone.interactables.get('OBJ_PALACE_DOOR');
      const finish = (res: MinigameResult) => {
        offFrame();
        offSniff();
        panel.close();
        if (res === 'skipped') {
          seamMat.color.set('#bfe8f5');
          seamMat.emissiveIntensity = 0.1;
        }
        resolve(res);
      };
      panel.onSkip = () => finish('skipped');
      panel.setStatus(`Пройдено зон: 0/${fields.length}`);

      const offFrame = ctx.onFrame((dt) => {
        const p = ctx.player.pos;
        const hit = fieldAt(p.x, p.z);
        const glow = ctx.now() < glowUntil;
        spotMat.emissive.set(glow ? '#8fe3a5' : '#000000');
        spotMat.emissiveIntensity = glow ? 0.8 : 0;
        if (hit) {
          if (!hit.f.safe.has(hit.idx)) {
            ctx.sfx('crunch');
            const n = panel.fail();
            ctx.respawn(n >= 3 ? 'Хрусть! Ну-ну. Можно и пропустить.' : 'Хрусть! Дед Мороз отпрыгнул назад.');
            return;
          }
          const fi = fields.indexOf(hit.f);
          if (Math.floor(hit.idx / hit.f.cols) === 0 && !crossed.has(fi)) {
            crossed.add(fi);
            ctx.sfx('success');
            panel.setStatus(`Пройдено зон: ${crossed.size}/${fields.length}`);
          }
        }
        crunchT -= dt;
        if (crunchT <= 0) {
          let near = Infinity;
          for (const f of fields) {
            const cx = Math.min(Math.max(p.x, f.x0), f.x0 + f.cols * f.cell), cz = Math.min(Math.max(p.z, f.z0), f.z0 + f.rows * f.cell);
            near = Math.min(near, Math.hypot(p.x - cx, p.z - cz));
          }
          if (near < 12 && hit) {
            crunchT = 0.9;
            ctx.sfx('crunch');
          } else crunchT = 0.5;
        }
        const atDoor = door ? door.pos.distanceTo(p) < 8 : false;
        if ((crossed.size >= fields.length && !hit) || atDoor) finish('done');
      });
    });
  }
}
