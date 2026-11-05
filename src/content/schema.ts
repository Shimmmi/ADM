export type Id = string;
export type Vec3 = [number, number, number];
export type Vec2 = [number, number];

export type Condition =
  | { flag: string }
  | { notFlag: string }
  | { item: string; count?: number }
  | { objective: Id; state: 'active' | 'done' }
  | { all: Condition[] }
  | { any: Condition[] };

export type Effect =
  | { type: 'setFlag'; flag: string }
  | { type: 'unsetFlag'; flag: string }
  | { type: 'giveItem'; item: string; count?: number }
  | { type: 'takeItem'; item: string; count?: number }
  | { type: 'activateObjective'; id: Id }
  | { type: 'completeObjective'; id: Id }
  | { type: 'startDialog'; id: Id }
  | { type: 'addCompanion'; id: string }
  | { type: 'stamp'; id: string }
  | { type: 'showGift'; id: string }
  | { type: 'startMinigame'; id: string }
  | { type: 'unlock'; id: Id }
  | { type: 'completeChapter' }
  | { type: 'playSfx'; id: string }
  | { type: 'save' }
  | { type: 'emit'; event: string }
  | { type: 'teleport'; pos: Vec3 }
  | { type: 'toast'; text: string }
  | { type: 'if'; cond: Condition; then: Effect[]; else?: Effect[] };

export type ChapterId = 'CH00' | 'CH01' | 'CH02' | 'CH03' | 'CH04' | 'CH05' | 'CH06' | 'CH07' | 'CH08';

export interface ObjectiveDef {
  id: Id;
  text: string;
  hidden?: boolean;
  counter?: { item?: string; flagPrefix?: string; target: number };
  marker?: { pos: Vec3 | null };
}

export interface ChapterDef {
  id: ChapterId;
  zone: string;
  title: string;
  subtitle?: string;
  objectives: ObjectiveDef[];
  onEnter: Effect[];
  onComplete: Effect[];
  gift?: string;
  stamp?: string;
  next?: ChapterId;
}

export type InteractableKind =
  | 'dialog' | 'pickup' | 'use_target' | 'gate' | 'cooking' | 'trade' | 'shrine'
  | 'viewpoint' | 'workbench' | 'sign' | 'checkpoint' | 'freezable';

export interface InteractableDef {
  id: Id;
  kind: InteractableKind;
  model?: string;
  color?: string;
  pos: Vec3;
  rotY?: number;
  scale?: number;
  radius: number;
  prompt: string;
  requires?: Condition | null;
  once?: boolean;
  hiddenUntil?: Id;
  hintable?: boolean;
  useItem?: { item: string; effects: Effect[] };
  effects: Effect[];
  /** Для freezable: id опасной поверхности, которую посох замораживает на 12 с. */
  freezes?: string;
  /** Сплошное препятствие (радиус коллайдера). */
  solid?: number;
  /** Алиас триггера диалога: несколько объектов → один `interact:<trigger>`. */
  trigger?: string;
  /** Скрыть, когда выставлен флаг (растаявшая сосулька, убранный завал). */
  hideWhen?: string;
  /** Реплика, если `requires` не выполнено и нет подходящего диалога. */
  lockedText?: string;
  /** Реплика, если E ничего не дало (нет эффектов и диалога). */
  idleText?: string;
  /** Звуковой маяк: радиус слышимости, м («идти на звук»). */
  beacon?: number;
}

export interface ItemDef {
  id: string;
  name: string;
  desc: string;
  category: 'tool' | 'bag' | 'key';
  icon: string;
  maxStack?: number;
}

export type SurfaceType = 'snow' | 'stone' | 'ice' | 'sand' | 'grass' | 'lava' | 'water' | 'sandriver' | 'thin_ice' | 'wood';

export type Shape =
  | { shape: 'circle'; pos: Vec2; r: number }
  | { shape: 'box'; pos: Vec2; size: Vec2; rotY?: number };

export type SurfaceDef = Shape & { id?: string; type: SurfaceType };

export interface TerrainFeature {
  kind: 'flat' | 'hill' | 'ramp' | 'ridge' | 'basin';
  pos: Vec2;
  /** flat/hill/basin: радиус; ridge: длина/ширина. */
  r?: number;
  to?: Vec2;
  width?: number;
  height: number;
  /** ramp: высота в точке `to`. */
  height2?: number;
  falloff?: number;
}

export interface TerrainGen {
  seed: number;
  base: number;
  noiseAmp: number;
  noiseScale: number;
  octaves?: number;
  /** Подъём к краю зоны (стенки), м. */
  rim?: number;
  features?: TerrainFeature[];
}

export interface AtmosphereDef {
  skyTop: string;
  skyBottom: string;
  fog: { color: string; near: number; far: number };
  sun: { dir: Vec3; color: string; intensity: number };
  hemi: { sky: string; ground: string; intensity: number };
  ground: string;
  groundAlt?: string;
  particles: string[];
  ambient: string;
  music?: string;
  /** Радиус видимости в темноте (пещера), м. */
  darkness?: number;
  /** Время суток 0..1 для фото-режима. */
  time?: number;
}

export interface ScatterDef {
  asset: string;
  count: number;
  seed: number;
  minDist: number;
  avoid?: string[];
  scaleRange: Vec2;
  /** Ограничить прямоугольником [x0,z0,x1,z1]. */
  bounds?: [number, number, number, number];
  collider?: number;
  color?: string;
}

export interface PropDef {
  id: string;
  asset: string;
  pos: Vec3;
  rotY?: number;
  scale?: number;
  color?: string;
  collider?: { type: 'circle'; r: number } | { type: 'box'; size: Vec2 };
}

export interface NpcDef {
  id: string;
  model: string;
  pos: Vec3;
  rotY?: number;
  name: string;
  dialogTrigger: string;
  radius?: number;
  requires?: Condition | null;
  hiddenUntil?: Id;
}

export interface TriggerDef {
  id: string;
  shape: 'box' | 'circle';
  pos: Vec3;
  size?: Vec3;
  r?: number;
  once?: boolean;
  onEnter: Effect[];
}

export interface AbilityPointDef {
  type: 'cloud_spot' | 'bridge_spot';
  id: string;
  pos: Vec3;
  to: Vec3;
  /** bridge_spot: id поверхности, которую мост делает проходимой. */
  covers?: string;
}

export interface ZoneDef {
  id: string;
  chapter: ChapterId;
  name: string;
  size: Vec2;
  terrain: { gen: TerrainGen; chunks: number; slopeMaxDeg: number; heightScale: number };
  atmosphere: AtmosphereDef;
  spawns: { default: Vec3; fromPrev?: Vec3 };
  checkpoints: { id: string; pos: Vec3; radius: number }[];
  /** Полигональные зоны для scatter.avoid: прямоугольники/окружности с именами. */
  areas?: (Shape & { name: string })[];
  paths?: { name: string; points: Vec2[]; width: number }[];
  props: PropDef[];
  scatter: ScatterDef[];
  surfaces?: SurfaceDef[];
  interactables: InteractableDef[];
  npcs: NpcDef[];
  triggers: TriggerDef[];
  abilityPoints: AbilityPointDef[];
  heat?: { rate: number; coolRate: number; cool: Shape[] };
  thinIce?: { id: string; pos: Vec2; size: Vec2; cell: number; seed: number }[];
  viewSubjects?: { id: string; name: string; pos: Vec3; points: number }[];
  /** Реакции зоны: ключ — имя события (`MG_THIN_ICE_DONE`) или `done:<objectiveId>`. */
  events?: Record<string, Effect[]>;
  transition: { next: string | null; mode: 'walk_fade' | 'sleigh' | 'final' };
}

/* --- Диалоги (результат content-sync) --- */

export type DialogNode =
  | { t: 'line'; speaker: string; text: string }
  | { t: 'choice'; prompt: string; options: { text: string; label: string }[] }
  | { t: 'label'; name: string }
  | { t: 'goto'; label: string }
  | { t: 'effect'; effect: Effect }
  | { t: 'next'; id: string };

export interface DialogDef {
  id: string;
  trigger: string;
  priority: number;
  requires: Condition[];
  repeat: 'once' | 'always';
  nodes: DialogNode[];
  order: number;
}

/* --- Подарки (результат content-sync, без открытых кодов) --- */

export interface GiftDef {
  id: string;
  chapter: ChapterId;
  stamp?: string;
  title: string;
  envelopeNo?: number;
  envelopeLabel: string;
  unlock?: { mode: 'soft' | 'hard' | 'off'; hash: string; hint: string; skipAfterSec: number };
  reveal?: { title: string; text: string; image: string };
}

export interface GiftsData {
  salt: string;
  startGate: { enabled: boolean; mode: 'soft' | 'hard' | 'off'; hash: string; hint: string; skipAfterSec: number };
  gifts: GiftDef[];
}
