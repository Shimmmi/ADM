/** Стартовый экран со StartGate (TECH §11.2). */
import { el } from './dom';
import { t } from '../content/ui';
import { hashCode } from '../content/codes';
import type { GiftsData } from '../content/schema';

export interface StartChoice {
  action: 'begin' | 'continue' | 'restart';
  gatePassed: boolean;
}

export function showStart(parent: HTMLElement, gifts: GiftsData, opts: { hasSave: boolean; gatePassed: boolean; skipAfterSec?: number }, sfx: (id: string) => void): Promise<StartChoice> {
  return new Promise((resolve) => {
    const gate = gifts.startGate;
    const needGate = gate.enabled && gate.mode !== 'off' && !opts.gatePassed;
    let passed = opts.gatePassed || !needGate;
    const back = el('div', { class: 'modal-back interactive', style: 'background:radial-gradient(circle at 50% 30%, #23466b, #0b1828)' });
    const reply = el('div', { class: 'reply', 'aria-live': 'polite' });
    const input = el('input', { type: 'text', placeholder: t('ui.start.gate'), autocomplete: 'off', spellcheck: 'false', 'aria-label': t('ui.start.gate') });
    const checkBtn = el('button', { class: 'btn primary' }, 'Проверить');
    const skipBtn = el('button', { class: 'btn hidden' }, t('ui.start.skip'));
    const gateRow = el('div', { class: `row${needGate ? '' : ' hidden'}` }, input, checkBtn);
    const actions = el('div', { class: `row${passed ? '' : ' hidden'}` });
    let timer = 0;

    const done = (action: StartChoice['action']) => {
      clearTimeout(timer);
      back.remove();
      resolve({ action, gatePassed: passed });
    };
    const openActions = () => {
      gateRow.classList.add('hidden');
      skipBtn.classList.add('hidden');
      actions.classList.remove('hidden');
      (actions.querySelector('button') as HTMLButtonElement | null)?.focus();
    };
    const check = async () => {
      if (!input.value.trim()) return;
      if ((await hashCode(gifts.salt, input.value)) === gate.hash) {
        passed = true;
        reply.textContent = t('ui.start.ok');
        sfx('success');
        openActions();
      } else {
        reply.textContent = t('ui.start.wrong');
        sfx('error');
      }
    };
    checkBtn.addEventListener('click', () => void check());
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') void check(); });
    skipBtn.addEventListener('click', openActions);

    if (opts.hasSave) {
      actions.append(
        el('button', { class: 'btn primary', onclick: () => done('continue') }, t('ui.start.continue')),
        el('button', { class: 'btn', onclick: () => { if (confirm(t('ui.restart.confirm'))) done('restart'); } }, t('ui.restart')),
      );
    } else actions.append(el('button', { class: 'btn primary', onclick: () => done('begin') }, t('ui.start.begin')));

    back.append(el('div', { class: 'modal panel', style: 'text-align:center' },
      el('h2', { style: 'font-size:26px' }, t('ui.start.title')),
      el('p', { class: 'muted' }, 'Новогодняя экспедиция в восемь испытаний. Лучше играть на компьютере, со звуком.'),
      needGate ? el('p', {}, t('ui.start.gate')) : null,
      gateRow, reply, el('div', { class: 'row', style: 'justify-content:center' }, skipBtn), actions));
    parent.append(back);
    if (needGate) {
      input.focus();
      if (gate.mode === 'soft') timer = window.setTimeout(() => skipBtn.classList.remove('hidden'), (opts.skipAfterSec ?? gate.skipAfterSec) * 1000);
    } else (actions.querySelector('button') as HTMLButtonElement | null)?.focus();
  });
}
