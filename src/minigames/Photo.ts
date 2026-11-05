/**
 * MG_PHOTO (TECH §12): видоискатель 3:2, мышь/WASD — наведение, колесо — зум (FOV 20–60°), Shift — плавно,
 * E — кадр, Esc — выйти. Оценка 0–100: композиция ≤40, цели в кадре ≤40, свет ≤20. Порог «хорошо» — 60.
 */
import * as THREE from 'three';
import type { Minigame, MinigameCtx, MinigameResult } from './types';
import { el } from '../ui/dom';
import { t } from '../content/ui';
import { PHOTO_KEY } from '../ui/Finale';

const W = 1800;
const H = 1200;
const GOOD = 60;

export interface Shot {
  url: string;
  score: number;
}

/** Галерея сессии (≤ 6). Живёт между заходами на точки. */
export const GALLERY: Shot[] = [];

export function scoreShot(cam: THREE.PerspectiveCamera, ctx: MinigameCtx): { score: number; seen: string[] } {
  const subjects = ctx.zone.def.viewSubjects ?? [];
  const v = new THREE.Vector3();
  const seen: { id: string; name: string; x: number; y: number; points: number }[] = [];
  for (const s of subjects) {
    v.set(s.pos[0], ctx.zone.h(s.pos[0], s.pos[2]) + s.pos[1], s.pos[2]);
    const world = v.clone();
    v.project(cam);
    if (v.z > 1 || Math.abs(v.x) > 0.95 || Math.abs(v.y) > 0.95) continue;
    // Закрыто рельефом?
    let blocked = false;
    const from = cam.position;
    for (let i = 1; i < 24; i++) {
      const k = i / 24;
      const x = from.x + (world.x - from.x) * k, y = from.y + (world.y - from.y) * k, z = from.z + (world.z - from.z) * k;
      if (ctx.zone.h(x, z) > y + 0.5) { blocked = true; break; }
    }
    if (!blocked) seen.push({ id: s.id, name: s.name, x: (v.x + 1) / 2, y: (1 - v.y) / 2, points: s.points });
  }
  const subjectsPts = Math.min(40, seen.reduce((a, s) => a + s.points, 0));
  let comp = 0;
  if (seen.length) {
    const main = seen.reduce((a, b) => (b.points > a.points ? b : a));
    const thirds = [[1 / 3, 1 / 3], [2 / 3, 1 / 3], [1 / 3, 2 / 3], [2 / 3, 2 / 3]];
    const d = Math.min(...thirds.map(([x, y]) => Math.hypot(main.x - x, main.y - y)));
    comp = Math.round(40 * Math.max(0, 1 - d / 0.3));
  }
  const tod = ctx.zone.def.atmosphere.time ?? 0.25;
  const light = tod > 0.15 && tod < 0.4 ? 20 : 10;
  return { score: Math.min(100, comp + subjectsPts + light), seen: seen.map((s) => s.id) };
}

export function captureShot(ctx: MinigameCtx, cam: THREE.PerspectiveCamera): string {
  const r = ctx.renderer.renderer;
  const size = new THREE.Vector2();
  r.getSize(size);
  const dpr = r.getPixelRatio();
  const aspect = cam.aspect;
  r.setPixelRatio(1);
  r.setSize(W, H, false);
  cam.aspect = W / H;
  cam.updateProjectionMatrix();
  r.render(ctx.scene, cam);
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  c.getContext('2d')!.drawImage(r.domElement, 0, 0, W, H);
  r.setPixelRatio(dpr);
  r.setSize(size.x, size.y, false);
  cam.aspect = aspect;
  cam.updateProjectionMatrix();
  ctx.renderer.resize();
  return c.toDataURL('image/jpeg', 0.88);
}

export function storeBest(): Shot | null {
  if (!GALLERY.length) return null;
  const best = GALLERY.reduce((a, b) => (b.score > a.score ? b : a));
  try {
    localStorage.setItem(PHOTO_KEY, best.url);
  } catch {
    /* хранилище недоступно — финал покажет запасной снимок */
  }
  return best;
}

export class Photo implements Minigame {
  run(ctx: MinigameCtx): Promise<MinigameResult> {
    return new Promise((resolve) => {
      const cam = ctx.renderer.camera;
      const fov0 = cam.fov;
      const vp = [...ctx.zone.interactables.values()]
        .filter((i) => i.def.kind === 'viewpoint' && i.visible)
        .reduce<{ d: number; pos: THREE.Vector3 } | null>((best, i) => {
          const d = i.pos.distanceTo(ctx.player.pos);
          return !best || d < best.d ? { d, pos: i.pos } : best;
        }, null);
      const eye = (vp?.pos ?? ctx.player.pos).clone();
      eye.y += 1.9;
      let yaw = ctx.cam.yaw + Math.PI;
      let pitch = 0.05;
      let fov = 45;
      let fails = 0;
      let raised = false;
      const started = ctx.now();
      const best = () => GALLERY.reduce((a, b) => Math.max(a, b.score), 0);

      const frame = el('div', { style: 'position:absolute;inset:0;display:grid;place-items:center;pointer-events:none' });
      const finder = el('div', { style: 'position:relative;width:min(90vw,135vh);aspect-ratio:3/2;border:2px solid rgba(255,255,255,.85);box-shadow:0 0 0 100vmax rgba(0,0,0,.45);border-radius:4px' });
      for (const p of ['33.33%', '66.66%']) {
        finder.append(el('div', { style: `position:absolute;top:0;bottom:0;left:${p};border-left:1px solid rgba(255,255,255,.35)` }));
        finder.append(el('div', { style: `position:absolute;left:0;right:0;top:${p};border-top:1px solid rgba(255,255,255,.35)` }));
      }
      const info = el('div', { class: 'panel', style: 'position:absolute;left:12px;bottom:12px;padding:6px 10px;font-size:13px' });
      const hint = el('div', { class: 'panel', style: 'position:absolute;left:50%;top:12px;transform:translateX(-50%);padding:6px 12px;font-size:13px;white-space:nowrap' }, t('ui.photo.hint'));
      const gallery = el('div', { style: 'position:absolute;right:12px;bottom:12px;display:flex;gap:6px' });
      const skip = el('button', { class: 'btn hidden interactive', style: 'position:absolute;right:12px;top:12px;pointer-events:auto' }, t('ui.minigame.skip'));
      finder.append(info, gallery);
      frame.append(finder, hint, skip);
      const intro = el('div', { class: 'panel', style: 'position:absolute;left:50%;bottom:120px;transform:translateX(-50%);padding:10px 16px' }, 'F — поднять камеру · Esc — выйти');
      ctx.root.append(intro);

      const renderGallery = () => {
        gallery.replaceChildren(...GALLERY.map((s) => el('div', { style: 'position:relative' },
          el('img', { src: s.url, style: 'width:72px;aspect-ratio:3/2;object-fit:cover;border:2px solid #fff;border-radius:2px' }),
          el('span', { style: `position:absolute;left:3px;bottom:2px;font-size:11px;color:${s.score >= GOOD ? '#8fe3a5' : '#fff'};text-shadow:0 1px 2px #000` }, String(s.score)))));
      };
      const updateInfo = () => {
        info.textContent = `FOV ${Math.round(fov)}° · лучший кадр: ${best()} из 100`;
        if (fails >= 3 || ctx.now() - started > 60) skip.classList.remove('hidden');
      };

      const raise = () => {
        raised = true;
        intro.remove();
        ctx.root.append(frame);
        ctx.cam.manual = true;
        ctx.player.rig.root.visible = false;
        updateInfo();
      };
      const finish = (res: MinigameResult) => {
        offInput();
        offFrame();
        frame.remove();
        intro.remove();
        ctx.player.rig.root.visible = true;
        ctx.cam.manual = false;
        cam.fov = fov0;
        cam.updateProjectionMatrix();
        if (res !== 'cancelled') storeBest();
        resolve(res);
      };
      skip.addEventListener('click', () => {
        if (!GALLERY.length) GALLERY.push({ url: captureShot(ctx, cam), score: 0 });
        finish('skipped');
      });

      const shoot = () => {
        ctx.sfx('shutter');
        const { score, seen } = scoreShot(cam, ctx);
        const url = captureShot(ctx, cam);
        GALLERY.push({ url, score });
        if (GALLERY.length > 6) GALLERY.splice(GALLERY.indexOf(GALLERY.reduce((a, b) => (b.score < a.score ? b : a))), 1);
        renderGallery();
        if (seen.includes('birds')) ctx.toast('Эти птицы дорого стоят.');
        ctx.toast(t('ui.photo.score', { n: score }));
        if (score >= GOOD) {
          ctx.sfx('success');
          setTimeout(() => finish('done'), 900);
        } else {
          fails++;
          ctx.sfx('error');
        }
        updateInfo();
      };

      const offInput = ctx.input.onAction((a) => {
        if (a === 'escape') { finish(GALLERY.some((s) => s.score >= GOOD) ? 'done' : 'cancelled'); return true; }
        if (!raised) { if (a === 'use') raise(); return true; }
        if (a === 'interact') shoot();
        return true;
      });

      const offFrame = ctx.onFrame((dt) => {
        if (!raised) return;
        const m = ctx.input.consumeMouse();
        const smooth = ctx.input.isDown('ShiftLeft') || ctx.input.isDown('ShiftRight') ? 0.35 : 1;
        const ax = ctx.input.axis();
        yaw -= (m.dx * 0.003 + ax.x * dt * 0.9) * smooth * (fov / 45);
        pitch = Math.max(-0.6, Math.min(0.9, pitch - (m.dy * 0.003 - ax.z * dt * 0.6) * smooth * (fov / 45)));
        if (m.wheel) {
          fov = Math.max(20, Math.min(60, fov + m.wheel * 3));
          updateInfo();
        }
        cam.fov = fov;
        cam.updateProjectionMatrix();
        cam.position.copy(eye);
        cam.lookAt(eye.x - Math.sin(yaw) * Math.cos(pitch), eye.y + Math.sin(pitch), eye.z - Math.cos(yaw) * Math.cos(pitch));
      });
    });
  }
}
