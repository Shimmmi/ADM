/**
 * MG_PELMENI (CH02): три раунда лепки. Ползунок ходит по шкале, E — в зелёной зоне.
 * Зона уже с каждым раундом (18% → 9%). Скорость 1.2 → 1.8 (TECH §10).
 * Промах = «пельмень слепился в оладушек». Нужны 3 попадания.
 */
import type { Minigame, MinigameCtx, MinigameResult } from './types';
import { MgPanel } from './types';
import { el } from '../ui/dom';

const WIDTHS = [18, 13, 9];
const SPEEDS = [1.2, 1.5, 1.8];
/** Доля шкалы в секунду = скорость из спеки × этот множитель: окно живое, но ловкое. */
const SWEEP = 32;

export class Pelmeni implements Minigame {
  run(ctx: MinigameCtx): Promise<MinigameResult> {
    return new Promise((resolve) => {
      let round = 0;
      let attempts = 0;
      let pos = 0;
      let dir = 1;
      let zoneCenter = 50;
      let settled = false;
      let off = () => {};

      const panel = new MgPanel(ctx, 'Лепка пельменей', 'Жми E, когда ползунок в зелёной зоне. Нужны три удачных пельменя.', (a) => {
        if (a === 'interact') tryHit();
        return true;
      });
      const track = el('div', { class: 'track' });
      const zone = el('div', { class: 'zone' });
      const cursor = el('div', { class: 'cursor' });
      track.append(zone, cursor);
      panel.body.append(track);

      const placeZone = () => {
        const w = WIDTHS[round] ?? 9;
        const half = w / 2;
        zoneCenter = half + 10 + Math.random() * (80 - w);
        zone.style.left = `${zoneCenter - half}%`;
        zone.style.width = `${w}%`;
      };

      const finish = (res: MinigameResult) => {
        if (settled) return;
        settled = true;
        off();
        panel.close();
        resolve(res);
      };
      panel.onSkip = () => finish('skipped');

      const tryHit = () => {
        if (settled) return;
        const w = WIDTHS[round] ?? 9;
        if (Math.abs(pos - zoneCenter) <= w / 2) {
          ctx.sfx('success');
          round++;
          attempts = 0;
          if (round >= 3) {
            panel.setStatus('Пельмень как пельмень. Можно подавать.');
            finish('done');
            return;
          }
          panel.setStatus(`Готово ${round} из 3. Тесто слушается хуже.`);
          placeZone();
          return;
        }
        ctx.sfx('error');
        attempts++;
        const n = panel.fail();
        panel.setStatus(n >= 3 ? 'пельмень слепился в оладушек. Можно пропустить.' : 'пельмень слепился в оладушек');
        if (attempts >= 5) {
          attempts = 0;
          placeZone();
        }
      };

      placeZone();
      panel.setStatus('Раунд 1 из 3. Лови зелёную зону.');
      off = ctx.onFrame((dt) => {
        const speed = SPEEDS[Math.min(round, SPEEDS.length - 1)] * SWEEP;
        pos += dir * speed * dt;
        if (pos >= 100) { pos = 100; dir = -1; }
        if (pos <= 0) { pos = 0; dir = 1; }
        cursor.style.left = `calc(${pos}% - 3px)`;
      });
    });
  }
}
