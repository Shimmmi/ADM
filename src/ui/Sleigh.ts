/** Кат-сцена «сани» (TECH §6, T5.2): Бай-Лун тянет сани по глобальной карте; Esc — пропустить. */
import { el } from './dom';
import { t } from '../content/ui';
import { WorldMap } from './WorldMap';
import type { Input } from '../engine/Input';

const DURATION = 22;

export function playSleigh(parent: HTMLElement, input: Input, from: string, to: string, done: string[], ready: Promise<unknown>): Promise<void> {
  return new Promise((resolve) => {
    const canvas = el('canvas', { width: 1440, height: 960, style: 'width:min(92vw,135vh);aspect-ratio:3/2;border-radius:16px' });
    const skip = el('button', { class: 'btn' }, t('ui.sleigh.skip'));
    const back = el('div', { class: 'modal-back interactive', style: 'background:#0b1828' },
      el('div', { style: 'display:grid;justify-items:center;gap:10px' }, canvas, skip));
    parent.append(back);
    const ctx = canvas.getContext('2d')!;
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    let loaded = false;
    let wantSkip = false;
    let raf = 0;
    const start = performance.now();
    void ready.then(() => { loaded = true; });

    const finish = () => {
      cancelAnimationFrame(raf);
      off();
      back.remove();
      resolve();
    };
    const off = input.onAction((a) => {
      if (a === 'escape' || a === 'interact') wantSkip = true;
      return true;
    });
    skip.addEventListener('click', () => (wantSkip = true));

    const frame = () => {
      const el = (performance.now() - start) / 1000;
      const k = reduce ? 1 : Math.min(1, el / DURATION);
      const ease = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
      ctx.setTransform(2, 0, 0, 2, 0, 0);
      WorldMap.draw(ctx, 720, 480, to, done, { from, to, t: ease });
      if (loaded && (wantSkip || k >= 1)) return finish();
      raf = requestAnimationFrame(frame);
    };
    frame();
  });
}
