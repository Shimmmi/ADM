export interface GameEvents {
  'flag:changed': { flag: string; value: boolean };
  'item:changed': { item: string; count: number; delta: number };
  'objective:changed': { id: string; state: 'active' | 'done' };
  'chapter:complete': { id: string };
  'chapter:enter': { id: string };
  'companion:added': { id: string };
  'stamp': { id: string };
  'unlock': { id: string };
  'event': { name: string };
  'toast': { text: string };
  'sfx': { id: string };
  'save': { force?: boolean };
  'hotbar:changed': { slot: number };
  'state:loaded': Record<string, never>;
}

type Handler<T> = (payload: T) => void;

export class EventBus {
  private handlers = new Map<keyof GameEvents, Set<Handler<never>>>();

  on<K extends keyof GameEvents>(type: K, fn: Handler<GameEvents[K]>): () => void {
    let set = this.handlers.get(type);
    if (!set) this.handlers.set(type, (set = new Set()));
    set.add(fn as Handler<never>);
    return () => set!.delete(fn as Handler<never>);
  }

  emit<K extends keyof GameEvents>(type: K, payload: GameEvents[K]): void {
    const set = this.handlers.get(type);
    if (!set) return;
    for (const fn of [...set]) (fn as Handler<GameEvents[K]>)(payload);
  }

  clear(): void {
    this.handlers.clear();
  }
}

/** Набор отписок, чтобы зона/мини-игра могла снять все свои подписки разом. */
export class Subscriptions {
  private list: (() => void)[] = [];
  add(off: () => void): void {
    this.list.push(off);
  }
  dispose(): void {
    for (const off of this.list.splice(0)) off();
  }
}
