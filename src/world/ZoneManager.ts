/** ZoneManager (TECH §6.4): ленивые чанки JSON зон, сборка, выгрузка с dispose, предзагрузка. */
import type * as THREE from 'three';
import type { InteractableDef, NpcDef, ZoneDef } from '../content/schema';
import { Zone } from './Zone';

const loaders = import.meta.glob<{ default: ZoneDef }>('../content/zones/*.json');
const cache = new Map<string, ZoneDef>();

export async function loadZoneDef(id: string): Promise<ZoneDef> {
  const hit = cache.get(id);
  if (hit) return hit;
  const key = `../content/zones/${id}.json`;
  const loader = loaders[key];
  if (!loader) throw new Error(`Зона ${id} не найдена`);
  const def = (await loader()).default;
  cache.set(id, def);
  return def;
}

export function zoneExists(id: string): boolean {
  return `../content/zones/${id}.json` in loaders;
}

export class ZoneManager {
  current: Zone | null = null;

  constructor(private scene: THREE.Scene) {}

  async load(id: string, progress: (p: number) => void, isVisible: (d: InteractableDef | NpcDef) => boolean): Promise<Zone> {
    this.unload();
    progress(0.05);
    const def = await loadZoneDef(id);
    const zone = new Zone(def);
    await zone.build(progress, isVisible);
    this.scene.add(zone.group);
    this.current = zone;
    progress(1);
    return zone;
  }

  unload(): void {
    this.current?.dispose();
    this.current = null;
  }

  /** Фоновая предзагрузка данных следующей зоны (низкий приоритет). */
  preload(id: string | null | undefined): void {
    if (!id || cache.has(id) || !zoneExists(id)) return;
    const run = () => void loadZoneDef(id).catch(() => undefined);
    const ric = (globalThis as { requestIdleCallback?: (cb: () => void) => void }).requestIdleCallback;
    if (ric) ric(run);
    else setTimeout(run, 200);
  }
}
