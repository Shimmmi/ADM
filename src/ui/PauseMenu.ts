/** Пауза: настройки, код прогресса, рестарт. */
import { el } from './dom';
import { t } from '../content/ui';
import type { Settings } from '../gameplay/GameState';

export interface PauseCallbacks {
  settings(): Settings;
  apply(s: Settings): void;
  exportCode(): Promise<string>;
  importCode(code: string): Promise<boolean>;
  restart(): void;
  storageOk: boolean;
}

export class PauseMenu {
  private back: HTMLElement | null = null;

  constructor(private parent: HTMLElement, private cb: PauseCallbacks) {}

  get isOpen(): boolean {
    return !!this.back;
  }

  open(): void {
    if (this.back) return;
    const s = { ...this.cb.settings() };
    const quality = el('select', { 'aria-label': t('ui.settings.quality') });
    for (const [v, label] of [['auto', 'Авто'], ['low', 'Низкое'], ['med', 'Среднее'], ['high', 'Высокое']]) {
      const o = el('option', { value: v }, label);
      if (s.quality === v) o.selected = true;
      quality.append(o);
    }
    const slider = (value: number, on: (v: number) => void) => {
      const i = el('input', { type: 'range', min: 0, max: 100, value: Math.round(value * 100) });
      i.addEventListener('input', () => { on(Number(i.value) / 100); this.cb.apply(s); });
      return i;
    };
    const reduce = el('input', { type: 'checkbox' });
    reduce.checked = s.reduceFx;
    reduce.addEventListener('change', () => { s.reduceFx = reduce.checked; this.cb.apply(s); });
    quality.addEventListener('change', () => { s.quality = quality.value as Settings['quality']; this.cb.apply(s); });
    const reply = el('div', { class: 'reply', 'aria-live': 'polite' });
    const codeIn = el('input', { type: 'text', placeholder: 'ADM1.…', autocomplete: 'off', spellcheck: 'false', style: 'text-transform:none' });

    const row = (label: string, control: HTMLElement) => el('label', { style: 'display:flex;justify-content:space-between;gap:12px;align-items:center;margin:8px 0' }, label, control);
    this.back = el('div', { class: 'modal-back interactive' },
      el('div', { class: 'modal panel', role: 'dialog', 'aria-label': t('ui.pause.title') },
        el('h2', {}, t('ui.pause.title')),
        row(t('ui.settings.quality'), quality),
        row(t('ui.settings.music'), slider(s.musicVol, (v) => (s.musicVol = v))),
        row(t('ui.settings.sfx'), slider(s.sfxVol, (v) => (s.sfxVol = v))),
        row(t('ui.settings.reducefx'), reduce),
        this.cb.storageOk ? null : el('p', { class: 'muted' }, t('ui.save.nostorage')),
        el('div', { class: 'row' },
          el('button', { class: 'btn', onclick: async () => {
            const code = await this.cb.exportCode();
            codeIn.value = code;
            try { await navigator.clipboard.writeText(code); reply.textContent = t('ui.save.exported'); } catch { codeIn.select(); }
          } }, t('ui.save.copy')),
        ),
        el('div', { class: 'row' }, codeIn,
          el('button', { class: 'btn', onclick: async () => {
            reply.textContent = (await this.cb.importCode(codeIn.value.trim())) ? t('ui.save.import.ok') : t('ui.save.import.bad');
          } }, t('ui.save.import'))),
        reply,
        el('div', { class: 'row' },
          el('button', { class: 'btn primary', onclick: () => this.close() }, t('ui.pause.resume')),
          el('button', { class: 'btn', onclick: () => { if (confirm(t('ui.restart.confirm'))) this.cb.restart(); } }, t('ui.restart'))),
        el('p', { class: 'muted', style: 'font-size:12px' }, 'Ассеты и звуки сделаны процедурно. Без аналитики и внешних запросов.')));
    this.parent.append(this.back);
    (this.back.querySelector('button.primary') as HTMLButtonElement).focus();
  }

  close(): void {
    this.back?.remove();
    this.back = null;
  }

  handle(action: string): boolean {
    if (!this.back) return false;
    if (action === 'escape') this.close();
    return true;
  }
}
