/** CH05 — Пылающие горы: жар, дворец Княгини, три лавовые реки, вихрь (360×360, перепад до 45 м). */
import type { InteractableDef, ZoneDef } from '../../src/content/schema';

const sign = (id: string, x: number, z: number, text: string): InteractableDef => ({
  id, kind: 'sign', model: 'sign', pos: [x, 0, z], radius: 2.2,
  prompt: 'Прочитать табличку', effects: [{ type: 'toast', text }],
});

const bridge = (n: 1 | 2 | 3, zNear: number, zFar: number, lavaZ: number): InteractableDef[] => {
  const id = `S_LAVA_${n}`;
  const flag = `ch05_bridge_${n}`;
  const all = { all: [{ flag: 'ch05_bridge_1' }, { flag: 'ch05_bridge_2' }, { flag: 'ch05_bridge_3' }] };
  return [
    {
      id: `OBJ_LAVA_BRIDGE_0${n}`, kind: 'freezable', model: 'ice_bridge', pos: [180, 0, zNear], radius: 2.8,
      prompt: 'Заморозить лаву посохом',
      requires: { flag: 'ch05_met_princess' },
      lockedText: 'ДМ: Княгиня ещё не просила мостов. Рано морозить.',
      idleText: 'ДМ: Посох (F) — и лава на двенадцать секунд станет льдом.',
      freezes: id,
      effects: [],
      useItem: {
        item: 'ITM_STAFF',
        effects: [
          { type: 'setFlag', flag },
          { type: 'if', cond: all, then: [{ type: 'emit', event: 'CH05_LAVA_BRIDGES_DONE' }] },
        ],
      },
    },
    {
      id: `OBJ_LAVA_BACK_0${n}`, kind: 'freezable', model: 'marker', color: '#bfe8f5', pos: [180, 0, zFar], radius: 2.6,
      prompt: 'Заморозить лаву с того берега',
      idleText: 'ДМ: Обратный мост. Посох помнит и эту сторону.',
      freezes: id,
      effects: [],
    },
    // lavaZ используется вызывающим в surfaces; держим ссылку, чтобы не разъехались берега.
    { id: `OBJ_LAVA_MARK_0${n}`, kind: 'sign', model: 'marker', pos: [168, 0, lavaZ], radius: 0.4, prompt: '', effects: [], hideWhen: 'ch05_met_princess' },
  ];
};

// Маркеры-заглушки над самой лавой не нужны: берега заданы явно.
const lavaBridges: InteractableDef[] = [
  ...bridge(1, 132, 112, 122).filter((x) => !x.id.startsWith('OBJ_LAVA_MARK')),
  ...bridge(2, 96, 76, 86).filter((x) => !x.id.startsWith('OBJ_LAVA_MARK')),
  ...bridge(3, 62, 40, 51).filter((x) => !x.id.startsWith('OBJ_LAVA_MARK')),
];

const cool = (x: number, z: number, rad = 9) => ({ shape: 'circle' as const, pos: [x, z] as [number, number], r: rad });

const zone: ZoneDef = {
  id: 'ZONE_FLAME',
  chapter: 'CH05',
  name: 'Пылающие горы',
  size: [360, 360],
  terrain: {
    gen: {
      seed: 7705, base: 4, noiseAmp: 1.6, noiseScale: 42, octaves: 3, rim: 20,
      features: [
        { kind: 'hill', pos: [70, 250], r: 34, height: 32 },
        { kind: 'hill', pos: [300, 280], r: 36, height: 38 },
        { kind: 'hill', pos: [64, 120], r: 30, height: 28 },
        { kind: 'hill', pos: [306, 90], r: 32, height: 34 },
        { kind: 'ridge', pos: [40, 200], to: [40, 60], width: 16, height: 18, falloff: 8 },
        { kind: 'ramp', pos: [180, 332], to: [155, 292], width: 16, height: 8, height2: 12, falloff: 6 },
        { kind: 'ramp', pos: [155, 292], to: [200, 252], width: 16, height: 12, height2: 16, falloff: 6 },
        { kind: 'ramp', pos: [200, 252], to: [145, 212], width: 16, height: 16, height2: 20, falloff: 6 },
        { kind: 'ramp', pos: [145, 212], to: [180, 168], width: 16, height: 20, height2: 22, falloff: 6 },
        { kind: 'flat', pos: [180, 332], r: 12, height: 8, falloff: 8 },
        { kind: 'flat', pos: [155, 292], r: 10, height: 12, falloff: 6 },
        { kind: 'flat', pos: [200, 252], r: 10, height: 16, falloff: 6 },
        { kind: 'flat', pos: [145, 212], r: 10, height: 20, falloff: 6 },
        { kind: 'flat', pos: [176, 156], r: 16, height: 22, falloff: 8 },
        { kind: 'ramp', pos: [180, 150], to: [180, 28], width: 18, height: 22, height2: 18, falloff: 6 },
        { kind: 'flat', pos: [180, 30], r: 12, height: 18, falloff: 6 },
      ],
    },
    chunks: 6, slopeMaxDeg: 38, heightScale: 1,
  },
  atmosphere: {
    skyTop: '#4a120c', skyBottom: '#e86a2a',
    fog: { color: '#c45a32', near: 30, far: 180 },
    sun: { dir: [-0.5, 0.55, -0.2], color: '#ffb070', intensity: 1.8 },
    hemi: { sky: '#ff8a55', ground: '#2a1412', intensity: 0.7 },
    ground: '#3a2422', groundAlt: '#6a3024',
    particles: ['embers'],
    ambient: 'flame',
  },
  spawns: { default: [180, 0, 336], fromPrev: [180, 0, 336] },
  checkpoints: [
    { id: 'CP_F1', pos: [180, 0, 332], radius: 6 },
    { id: 'CP_F2', pos: [200, 0, 252], radius: 6 },
    { id: 'CP_F3', pos: [145, 0, 212], radius: 6 },
    { id: 'CP_F4', pos: [176, 0, 158], radius: 7 },
    { id: 'CP_F5', pos: [180, 0, 104], radius: 5 },
    { id: 'CP_F6', pos: [180, 0, 70], radius: 5 },
    { id: 'CP_F7', pos: [180, 0, 32], radius: 6 },
  ],
  areas: [
    { name: 'clear_spawn', shape: 'circle', pos: [180, 334], r: 12 },
    { name: 'clear_c2', shape: 'circle', pos: [155, 292], r: 8 },
    { name: 'clear_c3', shape: 'circle', pos: [200, 252], r: 8 },
    { name: 'clear_c4', shape: 'circle', pos: [145, 212], r: 8 },
    { name: 'clear_palace', shape: 'circle', pos: [176, 154], r: 16 },
    { name: 'clear_g1', shape: 'circle', pos: [180, 104], r: 7 },
    { name: 'clear_g2', shape: 'circle', pos: [180, 70], r: 7 },
    { name: 'clear_vortex', shape: 'circle', pos: [180, 30], r: 12 },
  ],
  paths: [
    { name: 'path_heat', points: [[180, 348], [180, 332], [155, 292], [200, 252], [145, 212], [176, 160], [180, 30]], width: 7 },
  ],
  props: [
    { id: 'P_PALACE', asset: 'palace', pos: [164, 0, 146], collider: { type: 'box', size: [12, 8] } },
    { id: 'P_SHADE_1', asset: 'big_rock', pos: [186, 0, 334], scale: 0.32, collider: { type: 'circle', r: 5.5 } },
    { id: 'P_SHADE_2', asset: 'big_rock', pos: [148, 0, 294], scale: 0.3, collider: { type: 'circle', r: 5.2 } },
    { id: 'P_SHADE_3', asset: 'big_rock', pos: [208, 0, 250], scale: 0.3, collider: { type: 'circle', r: 5.2 } },
    { id: 'P_SHADE_4', asset: 'big_rock', pos: [138, 0, 214], scale: 0.28, collider: { type: 'circle', r: 5 } },
    { id: 'P_SHADE_5', asset: 'big_rock', pos: [164, 0, 164], scale: 0.26, collider: { type: 'circle', r: 4.6 } },
    { id: 'P_ICE_1', asset: 'shard', pos: [174, 0, 288], scale: 2.2, color: '#d7f6ff' },
    { id: 'P_ICE_2', asset: 'shard', pos: [192, 0, 208], scale: 2.4, color: '#c8f0ff' },
    { id: 'P_ICE_3', asset: 'shard', pos: [188, 0, 100], scale: 2, color: '#d7f6ff' },
    { id: 'P_LANTERN', asset: 'lantern', pos: [188, 0, 152], color: '#ffb15a' },
  ],
  scatter: [
    { asset: 'basalt', count: 70, seed: 7501, minDist: 7, avoid: ['clear_*', 'path_*'], scaleRange: [0.6, 1.3], collider: 0.7 },
    { asset: 'rock', count: 90, seed: 7502, minDist: 6, avoid: ['clear_*', 'path_*'], scaleRange: [0.5, 1.2], collider: 0.55, color: '#4a3330' },
    { asset: 'boulder', count: 22, seed: 7503, minDist: 14, avoid: ['clear_*', 'path_*'], scaleRange: [0.4, 0.8], collider: 1.2, color: '#3a2826' },
  ],
  surfaces: [
    { id: 'S_LAVA_1', type: 'lava', shape: 'box', pos: [180, 122], size: [344, 6] },
    { id: 'S_LAVA_2', type: 'lava', shape: 'box', pos: [180, 86], size: [344, 6.5] },
    { id: 'S_LAVA_3', type: 'lava', shape: 'box', pos: [180, 51], size: [344, 7] },
  ],
  interactables: [
    ...lavaBridges,
    {
      id: 'OBJ_FLAME_VORTEX', kind: 'use_target', model: 'vortex', pos: [180, 0, 28], radius: 3.6, solid: 1.6,
      prompt: 'Укротить вихрь веером',
      requires: { objective: 'CH05.O03', state: 'active' },
      lockedText: 'ДМ: Сначала три ледяных мостика. Веер без них — просто веер.',
      effects: [],
      useItem: { item: 'ITM_BANANA_FAN', effects: [{ type: 'startMinigame', id: 'MG_FIRE_FAN' }] },
    },
    {
      id: 'OBJ_HOT_STONES', kind: 'shrine', model: 'hot_stones', pos: [196, 0, 34], radius: 2.4,
      prompt: 'Осмотреть горячие камни',
      effects: [],
      idleText: 'Камни дышат жаром. Плёнка где-то внутри, руками лучше не лезть.',
    },
    sign('OBJ_SIGN_SHADE', 174, 318, 'Тень — тоже дорога. Стоять в ней полезно.'),
    sign('OBJ_SIGN_MELT', 168, 236, 'Если таешь — это комплимент жаре. Отойди к камню.'),
    sign('OBJ_SIGN_LAVA', 192, 138, 'Лава не чай. Ногами не мешать. Посох — можно.'),
    sign('OBJ_SIGN_FAN', 168, 44, 'Веер сильнее крика. Проверено Княгиней.'),
    {
      id: 'OBJ_BASALT_NOTE', kind: 'sign', model: 'stump', pos: [210, 0, 176], radius: 2,
      prompt: 'Прочитать обугленную табличку',
      effects: [{ type: 'toast', text: 'Здесь отдыхал Дед. Борода почти не подпалилась.' }],
    },
  ],
  npcs: [
    { id: 'NPC_PRINCESS', model: 'princess', pos: [184, 0, 158], rotY: 0.15, name: 'Княгиня', dialogTrigger: 'npc:NPC_PRINCESS' },
  ],
  triggers: [],
  abilityPoints: [],
  heat: {
    rate: 4,
    coolRate: 12,
    cool: [
      cool(180, 334, 11),
      cool(155, 292),
      cool(200, 252),
      cool(145, 212),
      cool(176, 158, 12),
      cool(180, 136, 8),
      cool(180, 104, 8),
      cool(180, 70, 8),
      cool(180, 30, 11),
    ],
  },
  transition: { next: 'ZONE_SPIDER_CAVE', mode: 'sleigh' },
};

export default zone;
