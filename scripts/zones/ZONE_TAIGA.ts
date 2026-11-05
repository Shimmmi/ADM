/** CH01 — Тайга: Гора Пяти Печатей в центре, пять полян по кругу 90–130 м (320×320, холмы до 25 м). */
import type { InteractableDef, PropDef, SurfaceDef, ZoneDef } from '../../src/content/schema';
import { forest, pickup, ring } from './lib';

const C: [number, number] = [160, 160];
const W: [number, number] = [56, 124];
const U: [number, number] = [78, 232];
const B: [number, number] = [246, 92];
const R: [number, number] = [258, 214];
const G: [number, number] = [118, 46];

const seal = (k: 'w' | 'u' | 'b' | 'r' | 'g', color: string, pos: [number, number], extra: Partial<InteractableDef> = {}): InteractableDef =>
  pickup(`OBJ_SEAL_${k.toUpperCase()}`, 'seal', [pos[0], 0, pos[1]], 'Сорвать печать', [
    { type: 'giveItem', item: `KEY_SEAL_${k.toUpperCase()}` },
    { type: 'setFlag', flag: `ch01_seal_${k}` },
    { type: 'playSfx', id: 'stamp' },
  ], { color, ...extra });

/* Пруд U: вода с узкой тропкой из камней к островку. */
const stones: [number, number][] = [[91.5, 232.6], [89.2, 231.4], [86.9, 232.5], [84.6, 231.3], [82.3, 232.4]];
const pondSurfaces: SurfaceDef[] = [
  { id: 'S_POND', type: 'water', shape: 'circle', pos: U, r: 13 },
  { type: 'snow', shape: 'circle', pos: U, r: 3.2 },
  ...stones.map(([x, z]): SurfaceDef => ({ type: 'stone', shape: 'circle', pos: [x, z], r: 1.6 })),
];
const pondProps: PropDef[] = stones.map(([x, z], i) => ({ id: `P_STONE_${i}`, asset: 'stone_disc', pos: [x, -0.1, z], scale: 1.6 }));

/* Костровище R: три камня по кругу — E по очереди. */
const fireStones: InteractableDef[] = ring(R[0], R[1], 4.2, 3, 0.4).map(([x, z], i) => ({
  id: `OBJ_FIRE_STONE_${i + 1}`, kind: 'shrine', model: 'stone_disc', color: '#8f8a84', pos: [x, 0, z], radius: 2, once: true,
  prompt: 'Раздуть угли', idleText: 'Угли тут уже тлеют.',
  effects: [
    { type: 'setFlag', flag: `ch01_fire_${i + 1}` },
    { type: 'playSfx', id: 'crunch' },
    { type: 'if', cond: { all: [{ flag: 'ch01_fire_1' }, { flag: 'ch01_fire_2' }, { flag: 'ch01_fire_3' }] },
      then: [{ type: 'setFlag', flag: 'ch01_fire_lit' }, { type: 'playSfx', id: 'success' }, { type: 'toast', text: 'Очаг вспыхнул. В золе блеснула красная печать.' }],
      else: [{ type: 'toast', text: 'Угли зарделись. Ещё бы с другой стороны.' }] },
  ],
}));

const trailSigns: InteractableDef[] = [
  [150, 128, 'К дуплу: прямо, потом у сосны налево. Или направо. Леший.'],
  [142, 104, 'Здесь был Дед.'],
  [134, 82, 'Осторожно, лёд.'],
  [127, 64, 'Дупло близко. Не стучать: занято.'],
  [176, 128, 'Тракт — на север.'],
  [160, 196, 'Гора — прямо. Не заблудишься. Наверное.'],
].map(([x, z, text], i) => ({
  id: `OBJ_TRAIL_SIGN_${i + 1}`, kind: 'sign', model: 'sign', pos: [x as number, 0, z as number], rotY: 0.4 * i, radius: 2.2,
  prompt: 'Прочитать табличку', effects: [{ type: 'toast', text: text as string }],
}) as InteractableDef);

const zone: ZoneDef = {
  id: 'ZONE_TAIGA',
  chapter: 'CH01',
  name: 'Тайга',
  size: [320, 320],
  terrain: {
    gen: {
      seed: 3307, base: 0, noiseAmp: 5, noiseScale: 55, octaves: 4, rim: 22,
      features: [
        { kind: 'hill', pos: [96, 96], r: 46, height: 18 },
        { kind: 'hill', pos: [236, 262], r: 48, height: 24 },
        { kind: 'hill', pos: [262, 146], r: 34, height: 14 },
        { kind: 'hill', pos: [60, 290], r: 30, height: 12 },
        { kind: 'flat', pos: C, r: 20, height: 4, falloff: 16 },
        { kind: 'flat', pos: W, r: 12, height: 6, falloff: 12 },
        { kind: 'flat', pos: U, r: 16, height: 1, falloff: 12 },
        { kind: 'flat', pos: B, r: 24, height: 3, falloff: 10 },
        { kind: 'flat', pos: R, r: 10, height: 6, falloff: 12 },
        { kind: 'flat', pos: G, r: 10, height: 8, falloff: 12 },
        { kind: 'flat', pos: [160, 300], r: 12, height: 0, falloff: 10 },
      ],
    },
    chunks: 6, slopeMaxDeg: 36, heightScale: 1,
  },
  atmosphere: {
    skyTop: '#3d6f8f', skyBottom: '#c7e0e0',
    fog: { color: '#a9c9c6', near: 30, far: 190 },
    sun: { dir: [0.4, 0.55, -0.35], color: '#fff0d4', intensity: 2.0 },
    hemi: { sky: '#bfe0f0', ground: '#3f5f4c', intensity: 1.0 },
    ground: '#e6eef0', groundAlt: '#7d9488',
    particles: ['snow_light', 'fireflies_day'],
    ambient: 'taiga',
  },
  spawns: { default: [160, 0, 298], fromPrev: [160, 0, 298] },
  checkpoints: [
    { id: 'CP_T1', pos: [160, 0, 290], radius: 4 },
    { id: 'CP_T2', pos: [96, 0, 236], radius: 4 },
    { id: 'CP_T3', pos: [160, 0, 180], radius: 4 },
  ],
  areas: [
    { name: 'clear_c', shape: 'circle', pos: C, r: 16 },
    { name: 'clear_w', shape: 'circle', pos: W, r: 11 },
    { name: 'clear_u', shape: 'circle', pos: U, r: 17 },
    { name: 'clear_b', shape: 'circle', pos: B, r: 3.5 },
    { name: 'windfall', shape: 'circle', pos: B, r: 22 },
    { name: 'clear_r', shape: 'circle', pos: R, r: 10 },
    { name: 'clear_g', shape: 'circle', pos: G, r: 9 },
    { name: 'clear_spawn', shape: 'circle', pos: [160, 296], r: 12 },
    { name: 'clear_exit', shape: 'box', pos: [160, 16], size: [26, 30] },
  ],
  paths: [
    { name: 'path_road', points: [[160, 318], [160, 280], [156, 230], [160, 176]], width: 4 },
    { name: 'path_north', points: [[160, 144], [166, 100], [160, 40], [160, 2]], width: 4 },
    { name: 'path_w', points: [[144, 164], [100, 150], [W[0] + 10, W[1] + 4]], width: 3 },
    { name: 'path_u', points: [[156, 230], [120, 236], [U[0] + 18, U[1]]], width: 3 },
    { name: 'path_b', points: [[176, 150], [214, 120], [B[0] - 20, B[1] + 10]], width: 3 },
    { name: 'path_r', points: [[174, 172], [220, 200], [R[0] - 10, R[1] - 2]], width: 3 },
    { name: 'path_g', points: [[154, 146], [142, 104], [128, 66], [G[0] + 6, G[1] + 8]], width: 2.5 },
  ],
  props: [
    ...pondProps,
    { id: 'P_FIRE_PIT', asset: 'fire_pit', pos: [R[0], 0, R[1]], scale: 1.6 },
    { id: 'P_ROCK_W', asset: 'big_rock', pos: [W[0] - 6, 0, W[1] - 4], scale: 0.35, collider: { type: 'circle', r: 4.5 } },
    { id: 'P_GATE_EXIT', asset: 'gate', pos: [160, 0, 10] },
  ],
  scatter: [
    ...forest(5101, 900, ['clear_*', 'path_*', 'windfall'], { scaleRange: [0.9, 1.8] }),
    { asset: 'tree_pine', count: 140, seed: 5111, minDist: 3.2, avoid: ['clear_b', 'path_*'], scaleRange: [0.7, 1.2], collider: 0.45, color: '#3b3a33', bounds: [B[0] - 22, B[1] - 22, B[0] + 22, B[1] + 22] },
    { asset: 'boulder', count: 40, seed: 5112, minDist: 3, avoid: ['clear_b', 'path_*'], scaleRange: [0.5, 1], collider: 0.6, bounds: [B[0] - 22, B[1] - 22, B[0] + 22, B[1] + 22] },
    { asset: 'grass', count: 300, seed: 5113, minDist: 1.5, avoid: ['path_*', 'clear_u'], scaleRange: [0.6, 1.2] },
  ],
  surfaces: pondSurfaces,
  interactables: [
    {
      id: 'OBJ_FIVE_SEALS_ROCK', kind: 'dialog', model: 'big_rock', pos: [C[0], 0, C[1]], radius: 8.5, solid: 6,
      prompt: 'Осмотреть Гору Пяти Печатей', effects: [],
      requires: { flag: 'ch01_met_leshy' }, lockedText: 'ДМ: Камень как камень. Спрошу-ка дорогу у местных.',
      idleText: 'Пять гнёзд. Пока не все печати на месте.',
    },
    {
      id: 'OBJ_ICE_W', kind: 'use_target', model: 'shard', pos: [W[0], 0, W[1]], scale: 3, color: '#cfefff', radius: 3.2, solid: 1.4,
      prompt: 'Лёд на камне', effects: [], hideWhen: 'ch01_w_melted', idleText: 'Печать вмёрзла в лёд. Посох (F) бы сюда.',
      useItem: { item: 'ITM_STAFF', effects: [{ type: 'setFlag', flag: 'ch01_w_melted' }, { type: 'playSfx', id: 'melt' }, { type: 'toast', text: 'Лёд стаял. Под ним — белая печать.' }] },
    },
    seal('w', '#f4f1e6', W, { hiddenUntil: 'ch01_w_melted' }),
    seal('u', '#3d78c4', U),
    seal('b', '#2a2530', B, { beacon: 60 }),
    seal('r', '#c8402f', [R[0], R[1] + 0.2], { hiddenUntil: 'ch01_fire_lit' }),
    ...fireStones,
    {
      id: 'OBJ_HOLLOW', kind: 'dialog', model: 'hollow', pos: [G[0], 0, G[1]], radius: 2.8, solid: 1.1, once: true,
      prompt: 'Заглянуть в дупло', idleText: 'Пустое дупло. Пахнет шишками.',
      effects: [{ type: 'giveItem', item: 'KEY_SEAL_G' }, { type: 'setFlag', flag: 'ch01_seal_g' }, { type: 'playSfx', id: 'stamp' }, { type: 'toast', text: 'В дупле — зелёная печать. И белка, очень недовольная.' }],
    },
    ...trailSigns,
    {
      id: 'OBJ_EGG_STUMP', kind: 'sign', model: 'stump', pos: [172, 0, 270], radius: 2,
      prompt: 'Прочитать табличку на пне', effects: [{ type: 'toast', text: '«Лес и Гора: тут можно найти оба».' }, { type: 'setFlag', flag: 'egg02_seen' }],
    },
  ],
  npcs: [
    { id: 'NPC_LESHY', model: 'leshy', pos: [168, 0, 276], rotY: -2.4, name: 'Леший', dialogTrigger: 'npc:NPC_LESHY' },
  ],
  triggers: [
    {
      id: 'TRG_TAIGA_EXIT', shape: 'box', pos: [160, 0, 14], size: [24, 6, 10],
      onEnter: [{ type: 'if', cond: { flag: 'ch01_passport_given' },
        then: [{ type: 'completeObjective', id: 'CH01.O04' }, { type: 'completeChapter' }],
        else: [{ type: 'toast', text: 'ДМ: Рано на тракт. Сначала дела в тайге.' }] }],
    },
  ],
  abilityPoints: [],
  transition: { next: 'ZONE_PASS', mode: 'walk_fade' },
};

export default zone;
