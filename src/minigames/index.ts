/** Реестр мини-игр: id → фабрика. Каждая эмитит `<id>_DONE` через режиссёра. */
import type { MinigameFactory } from './types';
import { ThinIce } from './ThinIce';
import { FireFan } from './FireFan';
import { Photo } from './Photo';

export const MINIGAMES: Record<string, MinigameFactory> = {
  MG_THIN_ICE: () => new ThinIce(),
  MG_FIRE_FAN: () => new FireFan(),
  MG_PHOTO: () => new Photo(),
};
