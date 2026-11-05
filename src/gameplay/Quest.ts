/**
 * Квест-движок (TECH §8): условия, эффекты, счётчики целей.
 * Эффекты применяются синхронно; блокирующие (диалог, подарок, мини-игра, конец главы)
 * передаются режиссёру и исполняются по очереди.
 */
import type { ChapterDef, Condition, DialogDef, Effect, Vec3 } from '../content/schema';
import { ITEM_MAP } from '../content/items';
import type { EventBus } from '../engine/EventBus';
import type { SaveV1 } from './GameState';

export interface DirectorPort {
  enqueueDialog(id: string): void;
  enqueueGift(id: string): void;
  enqueueMinigame(id: string): void;
  chapterComplete(): void;
  teleport(pos: Vec3): void;
}

export class Quest {
  director: DirectorPort | null = null;
  private dialogsByTrigger = new Map<string, DialogDef[]>();
  readonly dialogs = new Map<string, DialogDef>();

  constructor(
    public state: SaveV1,
    readonly bus: EventBus,
    readonly chapters: ChapterDef[],
    dialogs: DialogDef[],
  ) {
    for (const d of dialogs) {
      this.dialogs.set(d.id, d);
      const list = this.dialogsByTrigger.get(d.trigger) ?? [];
      list.push(d);
      this.dialogsByTrigger.set(d.trigger, list);
    }
  }

  get chapter(): ChapterDef {
    return this.chapters.find((c) => c.id === this.state.chapter)!;
  }

  /* ---------- условия ---------- */

  check(c: Condition | null | undefined): boolean {
    if (!c) return true;
    if ('flag' in c) return !!this.state.flags[c.flag];
    if ('notFlag' in c) return !this.state.flags[c.notFlag];
    if ('item' in c) return this.count(c.item) >= (c.count ?? 1);
    if ('objective' in c) return this.state.objectives[c.objective] === c.state;
    if ('all' in c) return c.all.every((x) => this.check(x));
    if ('any' in c) return c.any.some((x) => this.check(x));
    return false;
  }

  checkAll(list: Condition[]): boolean {
    return list.every((c) => this.check(c));
  }

  count(item: string): number {
    return this.state.items[item] ?? 0;
  }

  /* ---------- диалоги ---------- */

  /** TECH §9.2 п.6: наибольший priority, затем порядок в файле; once после проигрыша не участвует. */
  findDialog(trigger: string): DialogDef | null {
    const list = this.dialogsByTrigger.get(trigger);
    if (!list) return null;
    let best: DialogDef | null = null;
    for (const d of list) {
      if (d.repeat === 'once' && this.state.dialogsPlayed.includes(d.id)) continue;
      if (!this.checkAll(d.requires)) continue;
      if (!best || d.priority > best.priority || (d.priority === best.priority && d.order < best.order)) best = d;
    }
    return best;
  }

  markPlayed(id: string): void {
    if (!this.state.dialogsPlayed.includes(id)) this.state.dialogsPlayed.push(id);
  }

  /* ---------- эффекты ---------- */

  run(effects: Effect[] | undefined): void {
    for (const e of effects ?? []) this.apply(e);
  }

  apply(e: Effect): void {
    const s = this.state;
    switch (e.type) {
      case 'setFlag':
        if (!s.flags[e.flag]) {
          s.flags[e.flag] = true;
          this.bus.emit('flag:changed', { flag: e.flag, value: true });
          this.updateCounters();
        }
        break;
      case 'unsetFlag':
        if (s.flags[e.flag]) {
          delete s.flags[e.flag];
          this.bus.emit('flag:changed', { flag: e.flag, value: false });
        }
        break;
      case 'giveItem':
        this.give(e.item, e.count ?? 1);
        break;
      case 'takeItem':
        this.take(e.item, e.count ?? 1);
        break;
      case 'activateObjective':
        if (!s.objectives[e.id]) {
          s.objectives[e.id] = 'active';
          this.bus.emit('objective:changed', { id: e.id, state: 'active' });
          this.updateCounters();
        }
        break;
      case 'completeObjective':
        if (s.objectives[e.id] !== 'done') {
          s.objectives[e.id] = 'done';
          this.bus.emit('objective:changed', { id: e.id, state: 'done' });
          this.bus.emit('save', {});
        }
        break;
      case 'addCompanion':
        if (!s.companions.includes(e.id)) {
          s.companions.push(e.id);
          this.bus.emit('companion:added', { id: e.id });
        }
        break;
      case 'stamp':
        if (!s.stamps.includes(e.id)) {
          s.stamps.push(e.id);
          (s.stampDates ??= {})[e.id] = new Date().toLocaleDateString('ru-RU');
          this.bus.emit('stamp', { id: e.id });
        }
        break;
      case 'unlock':
        if (!s.flags[`unlock_${e.id}`]) {
          s.flags[`unlock_${e.id}`] = true;
          this.bus.emit('unlock', { id: e.id });
        }
        break;
      case 'startDialog':
        this.director?.enqueueDialog(e.id);
        break;
      case 'showGift':
        this.director?.enqueueGift(e.id);
        break;
      case 'startMinigame':
        this.director?.enqueueMinigame(e.id);
        break;
      case 'completeChapter':
        this.director?.chapterComplete();
        break;
      case 'playSfx':
        this.bus.emit('sfx', { id: e.id });
        break;
      case 'save':
        this.bus.emit('save', { force: true });
        break;
      case 'emit':
        this.emitEvent(e.event);
        break;
      case 'teleport':
        this.director?.teleport(e.pos);
        break;
      case 'toast':
        this.bus.emit('toast', { text: e.text });
        break;
      case 'if':
        this.run(this.check(e.cond) ? e.then : e.else);
        break;
    }
  }

  emitEvent(name: string): void {
    this.bus.emit('event', { name });
    const d = this.findDialog(`event:${name}`);
    if (d) this.director?.enqueueDialog(d.id);
  }

  /** Идемпотентно: ключевые предметы не дублируются, стаки ограничены maxStack. */
  give(item: string, n = 1): void {
    const def = ITEM_MAP[item];
    if (!def) return;
    const s = this.state;
    const cur = s.items[item] ?? 0;
    const cap = def.category === 'bag' ? (def.maxStack ?? 99) : 1;
    const next = Math.min(cap, cur + n);
    if (next === cur) return;
    s.items[item] = next;
    if (def.category === 'tool' && !s.hotbar.includes(item)) {
      const free = s.hotbar.indexOf(null);
      if (free >= 0) s.hotbar[free] = item;
    }
    this.bus.emit('item:changed', { item, count: next, delta: next - cur });
    this.updateCounters();
  }

  take(item: string, n = 1): void {
    const s = this.state;
    const cur = s.items[item] ?? 0;
    if (!cur) return;
    const next = Math.max(0, cur - n);
    if (next) s.items[item] = next;
    else {
      delete s.items[item];
      const slot = s.hotbar.indexOf(item);
      if (slot >= 0) s.hotbar[slot] = null;
    }
    this.bus.emit('item:changed', { item, count: next, delta: next - cur });
  }

  /* ---------- цели и счётчики ---------- */

  counterValue(id: string): { value: number; target: number } | null {
    const o = this.chapter.objectives.find((x) => x.id === id) ?? this.chapters.flatMap((c) => c.objectives).find((x) => x.id === id);
    if (!o?.counter) return null;
    const c = o.counter;
    let value = 0;
    if (c.item) value = this.count(c.item);
    if (c.flagPrefix) value = Object.keys(this.state.flags).filter((f) => f.startsWith(c.flagPrefix!)).length;
    return { value: Math.min(value, c.target), target: c.target };
  }

  /** Цель со счётчиком закрывается сама, когда счётчик достиг цели. */
  updateCounters(): void {
    for (const o of this.chapter.objectives) {
      if (!o.counter || this.state.objectives[o.id] !== 'active') continue;
      const v = this.counterValue(o.id);
      if (v && v.value >= v.target) this.apply({ type: 'completeObjective', id: o.id });
    }
  }

  activeObjectives(): { id: string; text: string; counter: { value: number; target: number } | null }[] {
    return this.chapter.objectives
      .filter((o) => !o.hidden && this.state.objectives[o.id] === 'active')
      .map((o) => ({ id: o.id, text: o.text, counter: this.counterValue(o.id) }));
  }
}
