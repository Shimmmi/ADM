/** Окно диалога (TECH §9.3): «печать» 35 символов/с, E — дальше, 1–4/W/S — выбор, Esc — пропуск реплик. */
import { el, richText } from './dom';
import { SPEAKERS } from '../content/registry';

const COLORS: Record<string, string> = {
  'ДМ': '#e8505c', 'СУНЬ': '#f0a040', 'БАЦЗЕ': '#f2b6b6', 'ША': '#9fb0b8', 'ДРАКОН': '#9fe0ff', 'НЕРПА': '#aab8c4',
  'ЛЕШИЙ': '#8fb06a', 'КАРАВАНЩИК': '#d9b77a', 'КНЯГИНЯ': '#e04a3a', 'ПАУЧИХА': '#b08ad0', 'ТОРГОВЕЦ': '#6f8fd0',
  'МАСТЕР': '#c9a77a', 'ОТШЕЛЬНИК': '#f0f0e6', 'ПИСЬМО': '#f1e3bf', 'ГОЛОС': '#bdd1e5', 'БАЙЛУН': '#ffffff',
};

const CPS = 35;

export type LineResult = 'next' | 'skip';

export class DialogBox {
  private box: HTMLElement;
  private portrait = el('div', { class: 'portrait' });
  private nameEl = el('div', { class: 'name' });
  private textEl = el('div', { class: 'text' });
  private optionsEl = el('div', { class: 'options' });
  private hintEl = el('div', { class: 'hint' });
  private full = '';
  private shown = 0;
  private timer = 0;
  private resolveLine: ((r: LineResult) => void) | null = null;
  private resolveChoice: ((i: number) => void) | null = null;
  private focus = 0;
  private optionCount = 0;
  onType: (() => void) | null = null;

  constructor(parent: HTMLElement) {
    this.box = el('section', { class: 'dialog panel interactive hidden', role: 'dialog', 'aria-live': 'polite' },
      this.portrait, el('div', {}, this.nameEl, this.textEl, this.optionsEl, this.hintEl));
    this.box.addEventListener('click', () => this.handle('interact'));
    parent.append(this.box);
  }

  get open(): boolean {
    return !this.box.classList.contains('hidden');
  }

  private setSpeaker(code: string) {
    const name = SPEAKERS[code] ?? code;
    this.nameEl.textContent = name || 'Рассказчик';
    this.portrait.textContent = code === 'ГОЛОС' ? '…' : (name || code).slice(0, 1);
    this.portrait.style.background = COLORS[code] ?? '#ffd987';
  }

  line(speaker: string, text: string): Promise<LineResult> {
    this.box.classList.remove('hidden');
    this.setSpeaker(speaker);
    this.optionsEl.replaceChildren();
    this.full = text;
    this.shown = 0;
    this.textEl.innerHTML = '';
    this.hintEl.innerHTML = '<span class="kbd">E</span> — дальше · <span class="kbd">Esc</span> — пропустить';
    clearInterval(this.timer);
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) this.shown = text.length;
    this.render();
    this.timer = window.setInterval(() => {
      this.shown = Math.min(this.full.length, this.shown + 1);
      if (this.shown % 3 === 0) this.onType?.();
      this.render();
      if (this.shown >= this.full.length) clearInterval(this.timer);
    }, 1000 / CPS);
    return new Promise((r) => (this.resolveLine = r));
  }

  private render() {
    this.textEl.innerHTML = richText(this.full.slice(0, this.shown));
  }

  choice(prompt: string, options: string[]): Promise<number> {
    this.box.classList.remove('hidden');
    this.setSpeaker('ГОЛОС');
    clearInterval(this.timer);
    this.full = prompt;
    this.shown = prompt.length;
    this.render();
    this.focus = 0;
    this.optionCount = options.length;
    this.optionsEl.replaceChildren(...options.map((o, i) =>
      el('button', { class: `btn option${i === 0 ? ' focus' : ''}`, onclick: (e: Event) => { e.stopPropagation(); this.pick(i); } }, `${i + 1}. ${o}`)));
    this.hintEl.innerHTML = '<span class="kbd">1</span>–<span class="kbd">4</span> или <span class="kbd">W</span>/<span class="kbd">S</span> + <span class="kbd">E</span> — выбрать';
    return new Promise((r) => (this.resolveChoice = r));
  }

  private pick(i: number) {
    const r = this.resolveChoice;
    this.resolveChoice = null;
    r?.(i);
  }

  private updateFocus() {
    [...this.optionsEl.children].forEach((c, i) => c.classList.toggle('focus', i === this.focus));
  }

  /** Возвращает true, если клавиша поглощена. */
  handle(action: string): boolean {
    if (!this.open) return false;
    if (this.resolveChoice) {
      const m = /^slot([1-4])$/.exec(action);
      if (m && Number(m[1]) <= this.optionCount) this.pick(Number(m[1]) - 1);
      else if (action === 'up') { this.focus = (this.focus + this.optionCount - 1) % this.optionCount; this.updateFocus(); }
      else if (action === 'down') { this.focus = (this.focus + 1) % this.optionCount; this.updateFocus(); }
      else if (action === 'interact') this.pick(this.focus);
      return true;
    }
    if (action === 'interact') {
      if (this.shown < this.full.length) {
        this.shown = this.full.length;
        clearInterval(this.timer);
        this.render();
      } else {
        const r = this.resolveLine;
        this.resolveLine = null;
        r?.('next');
      }
      return true;
    }
    if (action === 'escape') {
      clearInterval(this.timer);
      const r = this.resolveLine;
      this.resolveLine = null;
      r?.('skip');
      return true;
    }
    return ['slot1', 'slot2', 'slot3', 'slot4', 'use', 'ability', 'journal', 'map', 'up', 'down'].includes(action);
  }

  close(): void {
    clearInterval(this.timer);
    this.box.classList.add('hidden');
    this.resolveLine = null;
    this.resolveChoice = null;
  }
}
