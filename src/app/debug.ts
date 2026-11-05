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
  autoMinigames(on: boolean): void;
  ability(): void;
  /** Видимые цели текущей зоны для e2e-исследователя. */
  targets(): { objs: { id: string; useItem?: string; freezes?: string }[]; npcs: string[]; triggers: { id: string; x: number; z: number }[]; abilities: { id: string; x: number; z: number }[] };
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
    autoMinigames: (on) => (game.debugAutoMinigames = on),
    ability: () => game.debugAbility(),
    targets: () => {
      const z = game.zone;
      return {
        objs: [...z.interactables.values()].filter((r) => r.visible).map((r) => ({ id: r.def.id, useItem: r.def.useItem?.item, freezes: r.def.freezes })),
        npcs: [...z.npcs.values()].filter((n) => n.visible).map((n) => n.def.id),
        triggers: z.def.triggers.map((t) => ({ id: t.id, x: t.pos[0], z: t.pos[2] })),
        abilities: z.def.abilityPoints.map((a) => ({ id: a.id, x: a.pos[0], z: a.pos[2] })),
      };
    },
  };
  (window as unknown as { __adm: DebugApi }).__adm = api;
  budgetOverlay(game);
}

/** Оверлей бюджета (TECH §15): FPS, draw calls, треугольники, память GPU, частицы. */
function budgetOverlay(game: Game): void {
  const box = document.createElement('div');
  box.style.cssText = 'position:fixed;left:8px;bottom:8px;z-index:99;font:11px/1.35 monospace;color:#cfe;background:rgba(0,0,0,.55);padding:4px 6px;border-radius:4px;pointer-events:none;white-space:pre';
  document.body.append(box);
  const info = game.r.renderer.info;
  info.autoReset = false;
  let frames = 0;
  let last = performance.now();
  let fps = 0;
  let calls = 0;
  let tris = 0;
  const tick = (now: number): void => {
    frames++;
    calls = Math.max(calls, info.render.calls);
    tris = Math.max(tris, info.render.triangles);
    info.reset();
    if (now - last >= 500) {
      fps = (frames * 1000) / (now - last);
      const m = info.memory;
      box.textContent = `${fps.toFixed(0)} fps · ${game.r.level} dpr ${game.r.dpr}\ncalls ${calls}/250 · tris ${(tris / 1000).toFixed(0)}k/400k\ngeo ${m.geometries} · tex ${m.textures} · particles ${game.particles.active}/3000`;
      frames = 0;
      calls = 0;
      tris = 0;
      last = now;
    }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}
