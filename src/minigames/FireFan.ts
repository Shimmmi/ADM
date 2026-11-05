/**
 * MG_FIRE_FAN (CH05): удерживать F — сила веера растёт, отпустить — падает.
 * Держать силу в «окне вихря» суммарно 4 с. Перебор (100) — неудача, вихрь вспыхивает.
 */
import type { Minigame, MinigameCtx, MinigameResult } from './types';
import { MgPanel } from './types';
import { el } from '../ui/dom';

const HOLD = 4;

export class FireFan implements Minigame {
  run(ctx: MinigameCtx): Promise<MinigameResult> {
    return new Promise((resolve) => {
      const panel = new MgPanel(ctx, 'Укротить вихрь пламени', 'Удерживай F — веер дует сильнее. Держи силу в зелёном окне вихря.', (a) => a !== 'escape');
      const track = el('div', { class: 'track' });
      const zone = el('div', { class: 'zone' });
      const cursor = el('div', { class: 'cursor' });
      const progress = el('div', { class: 'track', style: 'height:10px' });
      const fill = el('div', { style: 'height:100%;width:0;background:var(--gold)' });
      progress.append(fill);
      track.append(zone, cursor);
      panel.body.append(track, progress);
      let power = 0;
      let held = 0;
      let t = 0;
      let cooldown = 0;
      ctx.cam.focus = ctx.zone.interactables.get('OBJ_FLAME_VORTEX')?.pos ?? null;

      const finish = (res: MinigameResult) => {
        off();
        panel.close();
        ctx.cam.focus = null;
        if (ctx.quest.count('ITM_BANANA_FAN')) ctx.quest.take('ITM_BANANA_FAN');
        resolve(res);
      };
      panel.onSkip = () => finish('skipped');

      const off = ctx.onFrame((dt) => {
        t += dt;
        const center = 50 + Math.sin(t * 0.9) * 22 + Math.sin(t * 2.3) * 6;
        const width = 18;
        if (cooldown > 0) {
          cooldown -= dt;
          power = Math.max(0, power - dt * 80);
        } else if (ctx.input.isDown('KeyF')) power = Math.min(100, power + dt * 45);
        else power = Math.max(0, power - dt * 35);
        if (power >= 100 && cooldown <= 0) {
          ctx.sfx('error');
          const n = panel.fail();
          panel.setStatus(n >= 3 ? 'Перебор! Вихрь хохочет. Можно пропустить.' : 'Перебор! Вихрь вспыхнул. Полегче.');
          cooldown = 1.2;
        }
        const inside = Math.abs(power - center) < width / 2;
        if (inside) held += dt;
        zone.style.left = `${center - width / 2}%`;
        zone.style.width = `${width}%`;
        cursor.style.left = `calc(${power}% - 3px)`;
        cursor.style.background = inside ? 'var(--ok)' : 'var(--gold)';
        fill.style.width = `${Math.min(100, (held / HOLD) * 100)}%`;
        if (held >= HOLD) {
          ctx.sfx('success');
          finish('done');
        }
      });
    });
  }
}
