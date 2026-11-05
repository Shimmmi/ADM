import type { ChapterId, Vec3 } from '../content/schema';
import { START_ITEMS } from '../content/items';

export type DirectorJob =
  | { k: 'dialog'; id: string }
  | { k: 'gift'; id: string }
  | { k: 'mg'; id: string }
  | { k: 'chapter'; id: ChapterId }
  | { k: 'teleport'; pos: Vec3 }
  | { k: 'develop' };

export interface Settings {
  quality: 'auto' | 'low' | 'med' | 'high';
  musicVol: number;
  sfxVol: number;
  reduceFx: boolean;
  ambient?: boolean;
}

/** TECH §14 + необязательные поля той же версии (даты печатей, снимки). */
export interface SaveV1 {
  v: 1;
  savedAt: string;
  chapter: ChapterId;
  zone: string;
  pos: Vec3;
  flags: Record<string, true>;
  items: Record<string, number>;
  hotbar: (string | null)[];
  objectives: Record<string, 'active' | 'done'>;
  companions: string[];
  stamps: string[];
  giftsShown: string[];
  giftsUnlocked: string[];
  dialogsPlayed: string[];
  minigames: Record<string, { done: boolean; attempts: number }>;
  settings: Settings;
  stampDates?: Record<string, string>;
  selectedSlot?: number;
  started?: boolean;
  startGatePassed?: boolean;
  trials?: number;
  bestPhoto?: number;
  /** Очередь режиссёра на момент сохранения — чтобы после перезагрузки не потерять подарок/мини-игру. */
  pending?: DirectorJob[];
  checkpoint?: Vec3;
}

export const DEFAULT_SETTINGS: Settings = { quality: 'auto', musicVol: 0.6, sfxVol: 0.8, reduceFx: false, ambient: true };

export function freshState(settings: Settings = DEFAULT_SETTINGS): SaveV1 {
  return {
    v: 1,
    savedAt: new Date().toISOString(),
    chapter: 'CH00',
    zone: 'ZONE_WORKSHOP',
    pos: [0, 0, 0],
    flags: {},
    items: { ...START_ITEMS },
    hotbar: ['ITM_STAFF', null, null, null],
    objectives: {},
    companions: [],
    stamps: [],
    giftsShown: [],
    giftsUnlocked: [],
    dialogsPlayed: [],
    minigames: {},
    settings: { ...settings },
    stampDates: {},
    selectedSlot: 0,
    started: false,
    startGatePassed: false,
    trials: 81,
  };
}
