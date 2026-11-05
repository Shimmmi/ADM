/** Финальный экран (TECH §12, STORY §6): полароид, «Сохранить снимок», «Титры». */
import { el } from './dom';
import { t, CREDITS_TEXT } from '../content/ui';
import type { SaveV1 } from '../gameplay/GameState';
import type { Input } from '../engine/Input';

export const PHOTO_KEY = 'adm.photo.v1';

export function loadPhoto(): string | null {
  try {
    return localStorage.getItem(PHOTO_KEY);
  } catch {
    return null;
  }
}

/** Запасной «снимок», если фото-режим не дал кадра (или `?epilogue`). */
export function fallbackPhoto(): string {
  const c = document.createElement('canvas');
  c.width = 900;
  c.height = 600;
  const g = c.getContext('2d')!;
  const sky = g.createLinearGradient(0, 0, 0, 600);
  sky.addColorStop(0, '#f6c98a');
  sky.addColorStop(0.55, '#f3e2c4');
  sky.addColorStop(1, '#9fb7a5');
  g.fillStyle = sky;
  g.fillRect(0, 0, 900, 600);
  const ridge = (y: number, amp: number, color: string, seed: number) => {
    g.fillStyle = color;
    g.beginPath();
    g.moveTo(0, 600);
    for (let x = 0; x <= 900; x += 30) g.lineTo(x, y - Math.abs(Math.sin(x * 0.011 + seed) * amp) - Math.sin(x * 0.037 + seed * 2) * amp * 0.25);
    g.lineTo(900, 600);
    g.fill();
  };
  ridge(330, 150, '#8c95a6', 1);
  ridge(400, 90, '#5d7a6a', 3);
  ridge(470, 50, '#3f5f4c', 5);
  g.fillStyle = 'rgba(255,255,255,.35)';
  g.fillRect(0, 380, 900, 40);
  return c.toDataURL('image/png');
}

export function polaroid(src: string): HTMLElement {
  return el('figure', { style: 'margin:0 auto;background:#fdfbf4;padding:14px 14px 46px;border-radius:4px;box-shadow:0 18px 40px rgba(0,0,0,.4);width:min(460px,80vw);transform:rotate(-1.5deg);color:#3b2a1a' },
    el('img', { src, alt: t('ui.photo.caption'), style: 'width:100%;display:block;aspect-ratio:3/2;object-fit:cover' }),
    el('figcaption', { style: 'text-align:center;margin-top:12px;font-size:15px' }, t('ui.photo.caption')));
}

/** Проявка (TECH §12): 4 с blur+sepia → резкость, затем событие PHOTO_DEVELOPED (его шлёт вызывающий). */
export function developPhoto(parent: HTMLElement, sfx: (id: string) => void): Promise<void> {
  return new Promise((resolve) => {
    const src = loadPhoto() ?? fallbackPhoto();
    const card = polaroid(src);
    const img = card.querySelector('img') as HTMLImageElement;
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    img.style.filter = 'blur(14px) sepia(1) brightness(1.6)';
    img.style.transition = reduce ? 'none' : 'filter 4s ease-out';
    const btn = el('button', { class: 'btn primary hidden' }, 'Дальше');
    const back = el('div', { class: 'modal-back interactive' },
      el('div', { style: 'display:grid;gap:16px;justify-items:center' }, card, btn));
    parent.append(back);
    sfx('shutter');
    requestAnimationFrame(() => requestAnimationFrame(() => { img.style.filter = 'none'; }));
    setTimeout(() => {
      sfx('success');
      btn.classList.remove('hidden');
      btn.focus();
    }, reduce ? 300 : 4100);
    btn.addEventListener('click', () => {
      back.remove();
      resolve();
    });
  });
}

export function runFinale(parent: HTMLElement, _state: SaveV1 | null, input: Input | null): Promise<void> {
  return new Promise(() => {
    const src = loadPhoto() ?? fallbackPhoto();
    const credits = el('pre', { class: 'hidden', style: 'white-space:pre-wrap;font:inherit;text-align:center;line-height:1.8;margin:16px 0 0' }, CREDITS_TEXT);
    const back = el('div', { class: 'modal-back interactive', style: 'background:radial-gradient(circle at 50% 30%, #3a5a7a, #0b1828)' },
      el('div', { class: 'modal panel', style: 'text-align:center;width:min(620px,calc(100vw - 28px))' },
        el('h2', {}, t('ui.epilogue.title')),
        polaroid(src),
        el('div', { class: 'row', style: 'justify-content:center' },
          el('button', { class: 'btn primary', onclick: () => {
            const a = el('a', { href: src, download: 'expedition.png' });
            a.click();
          } }, t('ui.photo.save')),
          el('button', { class: 'btn', onclick: () => credits.classList.toggle('hidden') }, t('ui.photo.credits'))),
        credits));
    parent.append(back);
    input?.onAction(() => true);
  });
}
