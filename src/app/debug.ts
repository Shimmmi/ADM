/** Отладочный API (только при VITE_DEBUG_TOKEN и ?debug=<token>): нужен e2e-прогону. */
import type { Game } from './Game';
import type { ChapterId } from '../content/schema';

export interface DebugApi {
  game: Game;
  state(): unknown;
  give(item: string, n?: number): void;
  flag(name: string): void;
  event(name: string): void;
  dialog(id: string): void;
  interact(id: string, tool?: string): void;
  goto(x: number, z: number): void;
  busy(): boolean;
  completeChapter(): void;
  chapter(): ChapterId;
}

export function installDebug(game: Game): void {
  game.debug = true;
  const api: DebugApi = {
    game,
    state: () => JSON.parse(JSON.stringify(game.state)),
    give: (item, n = 1) => game.quest.give(item, n),
    flag: (name) => game.quest.apply({ type: 'setFlag', flag: name }),
    event: (name) => game.quest.emitEvent(name),
    dialog: (id) => game.enqueueDialog(id),
    interact: (id, tool) => game.debugInteract(id, tool),
    goto: (x, z) => game.teleport([x, 0, z]),
    busy: () => game.busy,
    completeChapter: () => game.chapterComplete(),
    chapter: () => game.state.chapter,
  };
  (window as unknown as { __adm: DebugApi }).__adm = api;
}
