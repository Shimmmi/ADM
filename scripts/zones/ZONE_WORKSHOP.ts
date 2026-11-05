/** CH00 — Мастерская: дом и двор Деда Мороза в Сибири (140×140 м, одна лёгкая складка). */
import type { ZoneDef } from '../../src/content/schema';
import { fenceRect, forest } from './lib';

const zone: ZoneDef = {
  id: 'ZONE_WORKSHOP',
  chapter: 'CH00',
  name: 'Мастерская Деда Мороза',
  size: [140, 140],
  terrain: {
    gen: {
      seed: 1201,
      base: 0,
      noiseAmp: 1.6,
      noiseScale: 38,
      octaves: 3,
      rim: 16,
      features: [
        { kind: 'flat', pos: [70, 78], r: 34, height: 0, falloff: 14 },
        { kind: 'hill', pos: [28, 34], r: 34, height: 9 },
        { kind: 'hill', pos: [116, 40], r: 22, height: 5 },
      ],
    },
    chunks: 4,
    slopeMaxDeg: 38,
    heightScale: 1,
  },
  atmosphere: {
    skyTop: '#2c4f7c',
    skyBottom: '#f3ad6c',
    fog: { color: '#d7c2b6', near: 45, far: 210 },
    sun: { dir: [-0.65, 0.32, -0.45], color: '#ffc48a', intensity: 2.3 },
    hemi: { sky: '#a8c8ea', ground: '#e9dccb', intensity: 1.0 },
    ground: '#eef3f8',
    groundAlt: '#b6c3cc',
    particles: ['snow_light'],
    ambient: 'workshop',
  },
  spawns: { default: [70, 0, 82] },
  checkpoints: [{ id: 'CP_YARD', pos: [70, 0, 82], radius: 3 }],
  areas: [
    { name: 'yard', shape: 'box', pos: [70, 76], size: [48, 60] },
    { name: 'clearing', shape: 'circle', pos: [70, 122], r: 9 },
  ],
  paths: [{ name: 'road', points: [[70, 104], [70, 116], [74, 128], [72, 138]], width: 3 }],
  props: [
    { id: 'P_HOUSE', asset: 'house', pos: [70, 0, 56], collider: { type: 'box', size: [10.4, 8.4] } },
    { id: 'P_SHED', asset: 'house', pos: [88, 0, 70], rotY: -Math.PI / 2, scale: 0.55, color: '#7b5a3c', collider: { type: 'box', size: [10, 8] } },
    { id: 'P_GATE', asset: 'gate', pos: [70, 0, 106] },
    { id: 'P_SACK1', asset: 'sack', pos: [59, 0, 63] },
    { id: 'P_SACK2', asset: 'sack', pos: [58.2, 0, 64.2], scale: 0.8, color: '#c0303c' },
    { id: 'P_STUMP', asset: 'stump', pos: [54, 0, 82], collider: { type: 'circle', r: 0.6 } },
    { id: 'P_BENCH', asset: 'workbench', pos: [82, 0, 82], rotY: -Math.PI / 2, collider: { type: 'box', size: [2.2, 1] } },
    ...fenceRect('P_FENCE', 46, 46, 94, 106, [[66, 74]]),
  ],
  scatter: [
    ...forest(2401, 230, ['yard', 'road', 'clearing']),
    { asset: 'bush', count: 30, seed: 2405, minDist: 3, avoid: ['road'], scaleRange: [0.6, 1.1], bounds: [48, 48, 92, 104], color: '#5d7f62' },
  ],
  surfaces: [{ id: 'S_PORCH', type: 'wood', shape: 'box', pos: [70, 62.5], size: [10, 3] }],
  interactables: [
    {
      id: 'OBJ_LETTER_DESK', kind: 'dialog', model: 'desk', pos: [64, 0, 68], rotY: 0.3, radius: 2.4,
      prompt: 'Прочитать письмо', effects: [], solid: 0.9,
    },
    {
      id: 'OBJ_CLOSET', kind: 'dialog', model: 'closet', pos: [83.4, 0, 66], rotY: -Math.PI / 2, radius: 2.4,
      prompt: 'Открыть чулан', effects: [], solid: 0.9,
      requires: { flag: 'ch00_read_letter' }, lockedText: 'ДМ: Сначала письмо. Чулан подождёт.',
    },
    {
      id: 'OBJ_MITTENS_HOOK', kind: 'dialog', model: 'hook', pos: [75.5, 0, 61.6], radius: 2.2,
      prompt: 'Снять варежки с крючка', effects: [],
      requires: { flag: 'ch00_read_letter' }, lockedText: 'ДМ: Варежки потом. Сначала письмо.',
    },
    {
      id: 'OBJ_ICICLE_GATE', kind: 'use_target', model: 'icicle', pos: [70, 0, 106], radius: 6.8, solid: 5,
      prompt: 'Осмотреть сосульку', effects: [], hideWhen: 'ch00_icicle_melted',
      requires: { all: [{ item: 'KEY_CAMERA_BODY' }, { item: 'ITM_MITTENS' }] },
      lockedText: 'ДМ: Сначала соберусь как следует: камера, варежки.',
      useItem: { item: 'ITM_STAFF', effects: [{ type: 'setFlag', flag: 'ch00_icicle_melted' }, { type: 'playSfx', id: 'melt' }, { type: 'toast', text: 'Сосулька растаяла. Путь открыт.' }] },
    },
    {
      id: 'OBJ_EXIT_SIGN', kind: 'sign', model: 'sign', pos: [72.5, 0, 114], rotY: 0.2, radius: 2.6,
      prompt: 'Прочитать указатель', effects: [], requires: { flag: 'ch00_icicle_melted' },
    },
  ],
  npcs: [],
  triggers: [],
  abilityPoints: [],
  transition: { next: 'ZONE_TAIGA', mode: 'walk_fade' },
};

export default zone;
