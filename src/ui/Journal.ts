/** Журнал (J): цели, мешок, камера, грамота. TECH §10, §11.4. */
import type { SaveV1 } from '../gameplay/GameState';
import type { ItemDef } from '../content/schema';
import { ITEMS, ITEM_MAP } from '../content/items';
import { STAMP_IDS } from '../content/registry';
import { t } from '../content/ui';
import { el } from './dom';
import { iconSvg, stampSvg } from './icons';

export interface JournalData {
  state: SaveV1;
  objectives: { id: string; text: string; state: 'active' | 'done'; counter: { value: number; target: number } | null }[];
  chapterTitle: string;
}

type JournalTab = 'goals' | 'bag' | 'camera' | 'charter';

const TABS: JournalTab[] = ['goals', 'bag', 'camera', 'charter'];
const TAB_KEY: Record<JournalTab, string> = {
  goals: 'ui.journal.tab.goals',
  bag: 'ui.journal.tab.bag',
  camera: 'ui.journal.tab.camera',
  charter: 'ui.journal.tab.charter',
};
const TAB_BY_SLOT: Record<string, JournalTab> = {
  slot1: 'goals',
  slot2: 'bag',
  slot3: 'camera',
  slot4: 'charter',
};
const CAMERA_PARTS = ['KEY_CAMERA_BODY', 'KEY_LENS', 'KEY_FILM', 'KEY_STRAP', 'KEY_TRIPOD'] as const;

function owned(items: Record<string, number>, id: string): boolean {
  return (items[id] ?? 0) > 0;
}

function stampNo(id: string): string {
  const m = /(\d+)/.exec(id);
  return m ? String(parseInt(m[1], 10)) : '';
}

function itemRow(item: ItemDef, count: number, showCount: boolean): HTMLElement {
  return el('li', { class: 'journal-row' },
    el('span', { class: 'journal-ico', html: iconSvg(item.icon) }),
    el('span', { class: 'journal-name' }, item.name, showCount ? el('span', { class: 'journal-count' }, ` ×${count}`) : ''),
    el('span', { class: 'journal-desc muted' }, item.desc),
  );
}

export class Journal {
  private back: HTMLElement;
  private buttons: HTMLButtonElement[];
  private body: HTMLElement;
  private data: JournalData | null = null;
  private tab: JournalTab = 'goals';
  private opened = false;

  constructor(root: HTMLElement) {
    this.buttons = TABS.map((id) => el('button', {
      class: 'btn journal-tab',
      type: 'button',
      role: 'tab',
      onclick: () => this.setTab(id),
    }, t(TAB_KEY[id])));
    this.body = el('div', { class: 'journal-body', role: 'tabpanel' });
    const tabs = el('div', { class: 'journal-tabs', role: 'tablist' }, ...this.buttons);
    const foot = el('p', { class: 'journal-foot muted' },
      el('span', { class: 'kbd' }, 'J'),
      ' или ',
      el('span', { class: 'kbd' }, 'Esc'),
      ' — закрыть · ',
      el('span', { class: 'kbd' }, '1'),
      '–',
      el('span', { class: 'kbd' }, '4'),
      ' — вкладки',
    );
    const panel = el('div', {
      class: 'panel modal journal-panel',
      role: 'dialog',
      'aria-modal': 'true',
      'aria-label': 'Журнал',
    }, tabs, this.body, foot);
    this.back = el('div', { class: 'modal-back interactive journal-back hidden' }, panel);
    root.append(this.back);
  }

  get isOpen(): boolean {
    return this.opened;
  }

  open(data: JournalData, tab?: JournalTab): void {
    this.data = data;
    this.tab = tab ?? 'goals';
    this.opened = true;
    this.back.classList.remove('hidden');
    this.render();
  }

  close(): void {
    this.opened = false;
    this.back.classList.add('hidden');
  }

  /** true, если действие съедено: Esc и J закрывают, 1–4 переключают вкладки. */
  handle(action: string): boolean {
    if (!this.opened) return false;
    if (action === 'escape' || action === 'journal') {
      this.close();
      return true;
    }
    const tab = TAB_BY_SLOT[action];
    if (tab) {
      this.setTab(tab);
      return true;
    }
    return false;
  }

  private setTab(tab: JournalTab): void {
    this.tab = tab;
    this.render();
  }

  private render(): void {
    if (!this.data) return;
    this.buttons.forEach((b, i) => {
      const on = TABS[i] === this.tab;
      b.classList.toggle('journal-tab-on', on);
      b.setAttribute('aria-selected', on ? 'true' : 'false');
    });
    const view = this.tab === 'goals' ? this.viewGoals(this.data)
      : this.tab === 'bag' ? this.viewBag(this.data)
      : this.tab === 'camera' ? this.viewCamera(this.data)
      : this.viewCharter(this.data);
    this.body.replaceChildren(view);
  }

  private viewGoals(data: JournalData): HTMLElement {
    const list = [...data.objectives].sort((a, b) => Number(a.state === 'done') - Number(b.state === 'done'));
    return el('div', {},
      el('h2', { class: 'journal-chapter' }, data.chapterTitle),
      el('ul', { class: 'journal-goals' }, ...list.map((o) => {
        const counter = o.counter ? ` (${o.counter.value}/${o.counter.target})` : '';
        const done = o.state === 'done';
        return el('li', { class: done ? 'journal-goal journal-goal-done' : 'journal-goal' }, `${o.text}${counter}`);
      })),
    );
  }

  private viewBag(data: JournalData): HTMLElement {
    const rows = ITEMS.filter((it) => it.category === 'bag' && owned(data.state.items, it.id));
    if (!rows.length) return el('p', { class: 'journal-note' }, 'Мешок пуст. Пока.');
    return el('ul', { class: 'journal-list' }, ...rows.map((it) => itemRow(it, data.state.items[it.id] ?? 0, true)));
  }

  private viewCamera(data: JournalData): HTMLElement {
    const items = data.state.items;
    const top = owned(items, 'KEY_CAMERA') ? this.assembled() : this.slots(items);
    const skip = new Set<string>([...CAMERA_PARTS, 'KEY_CAMERA']);
    const keys = ITEMS.filter((it) => it.category === 'key' && !skip.has(it.id) && owned(items, it.id));
    const list = keys.length
      ? el('ul', { class: 'journal-list journal-keys' }, ...keys.map((it) => itemRow(it, items[it.id] ?? 0, (items[it.id] ?? 0) > 1)))
      : null;
    return el('div', {},
      top,
      list,
      el('p', { class: 'journal-trials' }, t('ui.journal.trials', { n: data.state.trials ?? 81 })),
    );
  }

  private assembled(): HTMLElement {
    const cam = ITEM_MAP.KEY_CAMERA;
    return el('div', { class: 'journal-assembled' },
      el('span', { class: 'journal-ico journal-ico-lg', html: iconSvg(cam.icon) }),
      el('div', {},
        el('div', { class: 'journal-name' }, cam.name),
        el('div', { class: 'journal-desc muted' }, cam.desc),
      ),
    );
  }

  private slots(items: Record<string, number>): HTMLElement {
    return el('div', { class: 'journal-slots' }, ...CAMERA_PARTS.map((id) => {
      const item = ITEM_MAP[id];
      const has = owned(items, id);
      return el('div', { class: has ? 'journal-slot' : 'journal-slot journal-slot-empty' },
        has
          ? el('span', { class: 'journal-ico', html: iconSvg(item.icon) })
          : el('span', { class: 'journal-slot-ghost', 'aria-hidden': 'true' }),
        el('span', { class: 'journal-slot-name' }, item.name),
      );
    }));
  }

  private viewCharter(data: JournalData): HTMLElement {
    const head = el('h2', { class: 'journal-chapter' }, 'Дорожная грамота экспедиции');
    if (!owned(data.state.items, 'KEY_PASSPORT')) {
      return el('div', {}, head, el('p', { class: 'journal-note' }, 'Грамоту выдадут в тайге.'));
    }
    const img = el('img', { class: 'journal-charter-art', src: 'art/gifts/G01.webp', alt: '' });
    img.addEventListener('error', () => img.classList.add('hidden'));
    const grid = el('div', { class: 'journal-stamps' }, ...STAMP_IDS.map((id) => this.stampSlot(data.state, id)));
    return el('div', {}, head, img, grid);
  }

  private stampSlot(state: SaveV1, id: string): HTMLElement {
    const n = stampNo(id);
    if (!state.stamps.includes(id)) {
      return el('div', { class: 'journal-stamp' }, el('div', { class: 'journal-stamp-ring' }, n));
    }
    const date = state.stampDates?.[id] ?? '';
    return el('div', { class: 'journal-stamp' },
      el('span', { class: 'journal-stamp-mark', html: stampSvg(id) }),
      el('span', { class: 'journal-stamp-date' }, date),
    );
  }
}
