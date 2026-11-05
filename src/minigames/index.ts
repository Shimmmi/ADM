/** Реестр мини-игр: id → фабрика. Каждая эмитит `<id>_DONE` через режиссёра. */
import type { MinigameFactory } from './types';
import { ThinIce } from './ThinIce';
import { FireFan } from './FireFan';
import { Photo } from './Photo';
import { Pelmeni } from './Pelmeni';
import { SandBridge } from './SandBridge';
import { Bargain } from './Bargain';
import { Lanterns } from './Lanterns';

export const MINIGAMES: Record<string, MinigameFactory> = {
  MG_PELMENI: () => new Pelmeni(),
  MG_THIN_ICE: () => new ThinIce(),
  MG_SAND_BRIDGE: () => new SandBridge(),
  MG_FIRE_FAN: () => new FireFan(),
  MG_LANTERNS: () => new Lanterns(),
  MG_BARGAIN: () => new Bargain(),
  MG_PHOTO: () => new Photo(),
};
