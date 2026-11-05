/** CH06 — Пещера Паутины: три террасы (0 / 8 / 16 м), соединённые пандусами. Радиус фонаря — atmosphere.darkness = 8. */
import type { InteractableDef, PropDef, ZoneDef } from '../../src/content/schema';
import { pickup, r, ring } from './lib';

const sign = (id: string, x: number, z: number, text: string): InteractableDef => ({
  id, kind: 'sign', model: 'sign', pos: [x, 0, z], radius: 2.2,
  prompt: 'Прочитать табличку', effects: [{ type: 'toast', text }],
});

const mushrooms: PropDef[] = ring(150, 124, 11, 7, 0.5).map(([x, z], i) => ({
  id: `P_SHROOM_${i}`, asset: 'mushroom', pos: [r(x), 0, r(z)], scale: r(1.2 + (i % 3) * 0.25),
  color: i % 2 ? '#c080ff' : '#7fe0c0',
}));

const boulders: PropDef[] = [
  [112, 246], [196, 238], [108, 150], [196, 112], [116, 52], [188, 64],
].map(([x, z], i) => ({
  id: `P_ROCK_${i}`, asset: 'big_rock', pos: [x, 0, z], scale: r(0.22 + (i % 3) * 0.04),
  collider: { type: 'circle', r: r(2.2 + (i % 2)) },
}));

const columns: PropDef[] = ring(150, 40, 16, 5, 0.2).map(([x, z], i) => ({
  id: `P_COLUMN_${i}`, asset: 'pillar', pos: [r(x), 0, r(z)], scale: 0.85,
}));

const zone: ZoneDef = {
  id: 'ZONE_SPIDER_CAVE',
  chapter: 'CH06',
  name: 'Пещера Паутины',
  size: [300, 300],
  terrain: {
    gen: {
      seed: 6606, base: 0, noiseAmp: 0.35, noiseScale: 46, octaves: 2, rim: 14,
      features: [
        { kind: 'ridge', pos: [28, 20], to: [28, 280], width: 26, height: 10, falloff: 8 },
        { kind: 'ridge', pos: [272, 20], to: [272, 280], width: 26, height: 10, falloff: 8 },
        { kind: 'flat', pos: [150, 230], r: 42, height: 0, falloff: 12 },
        { kind: 'flat', pos: [150, 124], r: 32, height: 8, falloff: 10 },
        { kind: 'flat', pos: [150, 40], r: 28, height: 16, falloff: 10 },
        { kind: 'ramp', pos: [150, 190], to: [150, 154], height: 0, height2: 8, width: 9, falloff: 5 },
        { kind: 'ramp', pos: [150, 94], to: [150, 58], height: 8, height2: 16, width: 9, falloff: 5 },
      ],
    },
    chunks: 6, slopeMaxDeg: 36, heightScale: 1,
  },
  atmosphere: {
    skyTop: '#100818', skyBottom: '#241430',
    fog: { color: '#140c1c', near: 6, far: 36 },
    sun: { dir: [0.15, 0.35, 0.05], color: '#7a68a0', intensity: 0.18 },
    hemi: { sky: '#3a2860', ground: '#161018', intensity: 0.28 },
    ground: '#2a2436', groundAlt: '#4a3c58',
    particles: ['spores'],
    ambient: 'cave',
    darkness: 8,
  },
  spawns: { default: [150, 0, 268], fromPrev: [150, 0, 268] },
  checkpoints: [
    { id: 'CP_C1', pos: [150, 0, 260], radius: 6 },
    { id: 'CP_C2', pos: [150, 0, 124], radius: 6 },
    { id: 'CP_C3', pos: [150, 0, 46], radius: 6 },
  ],
  areas: [
    { name: 'clear_spawn', shape: 'circle', pos: [150, 266], r: 12 },
    { name: 'clear_f1', shape: 'circle', pos: [150, 220], r: 16 },
    { name: 'clear_f2', shape: 'circle', pos: [150, 124], r: 14 },
    { name: 'clear_f3', shape: 'circle', pos: [150, 40], r: 14 },
  ],
  paths: [
    { name: 'path_main', points: [[150, 290], [150, 210], [150, 160], [150, 100], [150, 24]], width: 5 },
  ],
  props: [
    ...mushrooms,
    ...boulders,
    ...columns,
    { id: 'P_LANTERN_1', asset: 'lantern', pos: [138, 0, 48], color: '#6a5080' },
    { id: 'P_LANTERN_2', asset: 'lantern', pos: [162, 0, 48], color: '#6a5080' },
    { id: 'P_GLOW_1', asset: 'mushroom', pos: [132, 0, 214], scale: 1.6, color: '#d0c8ff' },
  ],
  scatter: [
    { asset: 'stalagmite', count: 34, seed: 6611, minDist: 6, avoid: ['clear_*', 'path_*'], scaleRange: [0.7, 1.6], collider: 0.45, color: '#4a3d55' },
    { asset: 'web', count: 18, seed: 6612, minDist: 8, avoid: ['path_*'], scaleRange: [1.2, 2.4], color: '#e4dcff' },
    { asset: 'mushroom', count: 26, seed: 6613, minDist: 3.5, avoid: ['path_*', 'clear_spawn'], scaleRange: [0.8, 1.5], color: '#7fe0c0' },
    { asset: 'rock', count: 14, seed: 6614, minDist: 7, avoid: ['clear_*', 'path_*'], scaleRange: [0.5, 1.1], collider: 0.4, color: '#3a3348' },
  ],
  interactables: [
    sign('OBJ_SIGN_SPIDER', 150, 248, 'Дальше — паучихи. Они вяжут и мёрзнут.'),
    sign('OBJ_SIGN_UP', 150, 198, 'Масло — этажом выше. Свет — ещё выше.'),
    sign('OBJ_SIGN_SONG', 150, 72, 'Песня: короткий, длинный, длинный, короткий.'),
    {
      id: 'OBJ_BLACK_LOTUS', kind: 'shrine', model: 'lotus', pos: [112, 0, 236], radius: 2.2,
      prompt: 'Осмотреть чёрный лотос', effects: [],
      idleText: 'Лотос в вазе. Лучше не трогать: он красивее, пока цел.',
    },
    pickup('OBJ_OIL_JAR', 'oil_jar', [128, 0, 124], 'Взять масло для фонарей', [
      { type: 'giveItem', item: 'ITM_LANTERN_OIL' },
      { type: 'completeObjective', id: 'CH06.O02' },
      { type: 'activateObjective', id: 'CH06.O03' },
      { type: 'toast', text: 'ДМ: Не пить. Только в фонари.' },
    ]),
    {
      id: 'OBJ_LANTERN_ALTAR', kind: 'shrine', model: 'lantern_altar', pos: [164, 0, 40], rotY: r(Math.PI), radius: 3.4, solid: 1.6,
      prompt: 'Зажечь фонари',
      requires: { all: [{ item: 'ITM_LANTERN_OIL' }, { objective: 'CH06.O03', state: 'active' }] },
      lockedText: 'ДМ: Фонари сухие. Сначала масло — потом песня паучих.',
      effects: [{ type: 'startMinigame', id: 'MG_LANTERNS' }],
    },
    {
      id: 'OBJ_CAVE_EXIT', kind: 'gate', model: 'cave_exit', pos: [150, 0, 24], radius: 3,
      prompt: 'Выйти к свету',
      requires: { flag: 'ch06_spider_deal_done' },
      lockedText: 'ДМ: Рано к свету. Сначала шёлк, варежки и фонари.',
      effects: [],
    },
  ],
  npcs: [
    { id: 'NPC_SPIDER', model: 'spider', pos: [158, 0, 214], rotY: 0.2, name: 'Паучья старшая', dialogTrigger: 'npc:NPC_SPIDER' },
    { id: 'NPC_SPIDER_2', model: 'spider', pos: [136, 0, 206], rotY: 0.6, name: 'Паучиха', dialogTrigger: 'npc:NPC_SPIDER' },
    { id: 'NPC_SPIDER_3', model: 'spider', pos: [176, 0, 208], rotY: -0.5, name: 'Паучиха', dialogTrigger: 'npc:NPC_SPIDER' },
  ],
  triggers: [],
  abilityPoints: [],
  transition: { next: 'ZONE_MARKET', mode: 'sleigh' },
};

export default zone;
