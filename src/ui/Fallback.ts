/** Запасные режимы (TECH §11.5): нет WebGL2, телефон. */
import { el } from './dom';
import { t } from '../content/ui';
import { fallbackPhoto, polaroid } from './Finale';

export function showFallback(parent: HTMLElement): void {
  parent.append(el('div', { class: 'modal-back interactive', style: 'background:#0b1828' },
    el('div', { class: 'modal panel', style: 'text-align:center' },
      el('h2', {}, t('ui.start.title')),
      polaroid(fallbackPhoto()),
      el('p', {}, t('ui.nowebgl')))));
}

function isMobile(): boolean {
  return matchMedia('(pointer: coarse)').matches && Math.min(screen.width, screen.height) < 820;
}

/** Предупреждение на телефоне: можно продолжить или открыть эпилог. */
export function showMobileWarning(parent: HTMLElement): Promise<void> {
  if (!isMobile()) return Promise.resolve();
  return new Promise((resolve) => {
    const back = el('div', { class: 'modal-back interactive' },
      el('div', { class: 'modal panel', style: 'text-align:center' },
        el('h2', {}, t('ui.start.title')),
        el('p', {}, t('ui.mobile.warn')),
        el('div', { class: 'row', style: 'justify-content:center' },
          el('button', { class: 'btn primary', onclick: () => { back.remove(); resolve(); } }, 'Всё равно попробовать'),
          el('button', { class: 'btn', onclick: () => { location.search = '?epilogue'; } }, 'Показать финал'))));
    parent.append(back);
  });
}
