import { el } from './dom';
import { iconSvg } from './icons';
import { ITEM_MAP } from '../content/items';
import { t } from '../content/ui';

export interface HudCallbacks {
  onAmbient(): void;
  onRestart(): void;
  onSlot(i: number): void;
  onMenu(): void;
}

export class HUD {
  readonly root: HTMLElement;
  private title = el('h1');
  private chapter = el('div', { class: 'hud-chapter' });
  private objectives = el('ul', { class: 'hud-objectives' });
  private ambientBtn: HTMLButtonElement;
  private slots: HTMLElement[] = [];
  private promptEl = el('div', { class: 'prompt panel hidden' });
  private toastEl = el('div', { class: 'toast panel' });
  private toastTimer = 0;
  private heatEl = el('div', { class: 'heat panel hidden' });
  private heatFill = el('div');
  private abilityEl = el('div', { class: 'ability panel hidden' });
  readonly minimap = el('canvas', { width: 320, height: 320 });

  constructor(parent: HTMLElement, cb: HudCallbacks) {
    this.ambientBtn = el('button', { class: 'btn', onclick: () => cb.onAmbient() }, t('ui.ambient.on'));
    const help = el('div', { class: 'hud-help panel interactive' },
      el('strong', {}, 'Управление'), el('br'),
      'WASD — идти · Shift — бег · E — взаимодействовать', el('br'),
      '1–4 — предмет · F — использовать · Q — спутник', el('br'),
      'J — журнал · M — карта · Esc — пауза',
      el('div', { class: 'hud-buttons' },
        this.ambientBtn,
        el('button', { class: 'btn', onclick: () => cb.onRestart() }, t('ui.restart')),
        el('button', { class: 'btn', onclick: () => cb.onMenu() }, 'Меню'),
      ),
    );
    const map = el('div', { class: 'hud-map panel' }, el('strong', {}, 'Карта · жёлтый — Дед Мороз'), this.minimap);
    const hotbar = el('nav', { class: 'hotbar panel interactive', 'aria-label': 'Инвентарь' });
    for (let i = 0; i < 4; i++) {
      const s = el('button', { class: 'slot', onclick: () => cb.onSlot(i) });
      this.slots.push(s);
      hotbar.append(s);
    }
    this.heatEl.append(this.heatFill, el('span', {}, t('ui.heat')));
    this.root = el('div', { class: 'hud' },
      el('div', { class: 'hud-top' },
        el('section', { class: 'hud-info panel' }, this.title, this.chapter, this.objectives),
        el('div', { class: 'hud-right' }, help, map),
      ),
      hotbar, this.promptEl, this.toastEl, this.heatEl, this.abilityEl,
    );
    parent.append(this.root);
  }

  setVisible(v: boolean): void {
    this.root.classList.toggle('hidden', !v);
  }

  setChapter(title: string, chapter: string): void {
    this.title.textContent = title;
    this.chapter.textContent = chapter;
  }

  setObjectives(list: { text: string; counter: { value: number; target: number } | null }[]): void {
    this.objectives.replaceChildren(...list.slice(0, 3).map((o) => el('li', {}, o.counter ? `${o.text} (${o.counter.value}/${o.counter.target})` : o.text)));
  }

  setAmbient(on: boolean): void {
    this.ambientBtn.textContent = on ? t('ui.ambient.off') : t('ui.ambient.on');
  }

  setHotbar(hotbar: (string | null)[], selected: number): void {
    hotbar.forEach((id, i) => {
      const s = this.slots[i];
      s.classList.toggle('selected', i === selected);
      const item = id ? ITEM_MAP[id] : null;
      s.innerHTML = `<span class="num">${i + 1}</span>${item ? iconSvg(item.icon) : ''}<span>${item ? item.name : 'Пусто'}</span>`;
      s.setAttribute('aria-label', `Ячейка ${i + 1}: ${item ? item.name : 'пусто'}`);
      s.setAttribute('aria-pressed', String(i === selected));
    });
  }

  prompt(text: string | null): void {
    this.promptEl.classList.toggle('hidden', !text);
    if (text) this.promptEl.innerHTML = text;
  }

  toast(text: string, ms = 3200): void {
    this.toastEl.textContent = text;
    this.toastEl.classList.add('visible');
    clearTimeout(this.toastTimer);
    this.toastTimer = window.setTimeout(() => this.toastEl.classList.remove('visible'), ms);
  }

  heat(v: number | null): void {
    this.heatEl.classList.toggle('hidden', v === null);
    if (v !== null) this.heatFill.style.height = `${Math.max(0, Math.min(100, v)) * 1.94}px`;
  }

  ability(text: string | null): void {
    this.abilityEl.classList.toggle('hidden', !text);
    if (text) this.abilityEl.innerHTML = text;
  }
}
