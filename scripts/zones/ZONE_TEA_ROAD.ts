/** CH04 — Чайный путь: барханы, три ящика, река Текучих Песков, Ша на ближнем берегу (400×400). */
import type { InteractableDef, ZoneDef } from '../../src/content/schema';
import { pickup } from './lib';

const chest = (n: number, x: number, z: number): InteractableDef =>
  pickup(`OBJ_TEA_CHEST_0${n}`, 'chest', [x, 0, z], 'Поднять чайный ящик', [], {
    trigger: 'OBJ_TEA_CHEST', hintable: true, hiddenUntil: 'ch04_met_caravan',
  });

const sign = (id: string, x: number, z: number, text: string, rot = 0): InteractableDef => ({
  id, kind: 'sign', model: 'sign', pos: [x, 0, z], rotY: rot, radius: 2.2,
  prompt: 'Прочитать табличку', effects: [{ type: 'toast', text }],
});

/** Столбы с символами. Порядок в мире не совпадает с порядком «ветер, песок, вода, небо». */
const pillars: InteractableDef[] = [
  { id: 'OBJ_PILLAR_HINT_2', x: 78, z: 312, text: 'Знак ветра: три линии, будто кто-то дунул в камень.' },
  { id: 'OBJ_PILLAR_HINT_4', x: 318, z: 276, text: 'Знак воды: капля и тихая рябь. Река это любит.' },
  { id: 'OBJ_PILLAR_HINT_1', x: 146, z: 214, text: 'Знак неба: круг солнца и маленькое облако.' },
  { id: 'OBJ_PILLAR_HINT_3', x: 262, z: 186, text: 'Знак песка: волна бархана. Сыплется даже на картинке.' },
].map((p, i) => ({
  id: p.id, kind: 'sign' as const, model: 'pillar', pos: [p.x, 0, p.z] as [number, number, number],
  rotY: i * 0.4, radius: 2.6, solid: 0.7,
  prompt: 'Прочитать резьбу',
  effects: [{ type: 'toast' as const, text: p.text }],
}));

const zone: ZoneDef = {
  id: 'ZONE_TEA_ROAD',
  chapter: 'CH04',
  name: 'Чайный путь',
  size: [400, 400],
  terrain: {
    gen: {
      seed: 6604, base: 2, noiseAmp: 1.2, noiseScale: 52, octaves: 3, rim: 20,
      features: [
        { kind: 'hill', pos: [90, 300], r: 28, height: 10 },
        { kind: 'hill', pos: [300, 248], r: 32, height: 14 },
        { kind: 'hill', pos: [150, 230], r: 24, height: 9 },
        { kind: 'hill', pos: [250, 320], r: 26, height: 11 },
        { kind: 'hill', pos: [70, 200], r: 22, height: 8 },
        { kind: 'hill', pos: [330, 190], r: 20, height: 12 },
        { kind: 'flat', pos: [200, 348], r: 22, height: 3, falloff: 12 },
        { kind: 'flat', pos: [200, 176], r: 16, height: 3, falloff: 8 },
        { kind: 'flat', pos: [120, 286], r: 8, height: 3.2, falloff: 6 },
        { kind: 'flat', pos: [286, 304], r: 8, height: 3.4, falloff: 6 },
        { kind: 'flat', pos: [338, 208], r: 8, height: 4, falloff: 6 },
      ],
    },
    chunks: 6, slopeMaxDeg: 34, heightScale: 1,
  },
  atmosphere: {
    skyTop: '#7eb4e0', skyBottom: '#f6e7c2',
    fog: { color: '#f0ddb0', near: 50, far: 260 },
    sun: { dir: [0.45, 0.72, 0.2], color: '#fff1cc', intensity: 1.9 },
    hemi: { sky: '#d7ecff', ground: '#c4a15a', intensity: 0.85 },
    ground: '#e4c98a', groundAlt: '#c6a15e',
    particles: ['dust_wind'],
    ambient: 'tea_road',
  },
  spawns: { default: [200, 0, 378], fromPrev: [200, 0, 378] },
  checkpoints: [
    { id: 'CP_R1', pos: [200, 0, 372], radius: 6 },
    { id: 'CP_R2', pos: [200, 0, 280], radius: 6 },
    { id: 'CP_R3', pos: [200, 0, 188], radius: 6 },
  ],
  areas: [
    { name: 'clear_spawn', shape: 'circle', pos: [200, 376], r: 14 },
    { name: 'clear_caravan', shape: 'circle', pos: [200, 346], r: 18 },
    { name: 'clear_chest_a', shape: 'circle', pos: [118, 286], r: 6 },
    { name: 'clear_chest_b', shape: 'circle', pos: [286, 304], r: 6 },
    { name: 'clear_chest_c', shape: 'circle', pos: [338, 208], r: 7 },
    { name: 'clear_sha', shape: 'circle', pos: [200, 172], r: 10 },
    { name: 'clear_pillar', shape: 'circle', pos: [200, 240], r: 4 },
  ],
  paths: [
    { name: 'path_road', points: [[200, 396], [200, 360], [190, 300], [200, 240], [200, 180]], width: 6 },
    { name: 'path_west', points: [[190, 320], [140, 300], [118, 286]], width: 4 },
    { name: 'path_east', points: [[210, 330], [250, 316], [286, 304]], width: 4 },
    { name: 'path_hidden', points: [[250, 260], [300, 236], [338, 208]], width: 4 },
  ],
  props: [
    { id: 'P_TENT_1', asset: 'tent', pos: [184, 0, 338], rotY: 0.4 },
    { id: 'P_TENT_2', asset: 'tent', pos: [216, 0, 334], rotY: -0.5, color: '#f7f1e4' },
    { id: 'P_TENT_3', asset: 'tent', pos: [198, 0, 326], rotY: 0.1, scale: 0.85, color: '#efe2c8' },
    { id: 'P_CAMEL_1', asset: 'camel', pos: [172, 0, 352], rotY: 1.2 },
    { id: 'P_CAMEL_2', asset: 'camel', pos: [230, 0, 350], rotY: -0.8 },
    { id: 'P_CAMEL_3', asset: 'camel', pos: [214, 0, 360], rotY: 2.4, scale: 0.9 },
    { id: 'P_SACKS', asset: 'sack', pos: [208, 0, 342], color: '#c45a3a' },
    { id: 'P_FIRE', asset: 'fire_pit', pos: [192, 0, 348] },
  ],
  scatter: [
    { asset: 'dune_grass', count: 420, seed: 6401, minDist: 2.4, avoid: ['clear_*', 'path_*'], scaleRange: [0.7, 1.3] },
    { asset: 'bush', count: 70, seed: 6402, minDist: 6, avoid: ['clear_*', 'path_*'], scaleRange: [0.5, 1], color: '#b7a15a' },
    { asset: 'rock', count: 40, seed: 6403, minDist: 9, avoid: ['clear_*', 'path_*'], scaleRange: [0.4, 0.9], collider: 0.55, color: '#d2b27a' },
  ],
  surfaces: [
    { id: 'S_SAND_RIVER', type: 'sandriver', shape: 'box', pos: [200, 140], size: [400, 16] },
  ],
  interactables: [
    chest(1, 118, 286),
    chest(2, 286, 304),
    chest(3, 338, 208),
    ...pillars,
    sign('OBJ_SIGN_CAMEL', 186, 364, 'Чай улетел. Верблюды остались. Они не летают.'),
    sign('OBJ_SIGN_DUNE', 230, 300, 'Бархан слева выше, чем кажется. И справа тоже.'),
    sign('OBJ_SIGN_TEA', 160, 250, 'Ящик с чаем пахнет дорогой. Бацзе это подтвердит.'),
    sign('OBJ_SIGN_LISTEN', 214, 196, 'В песке нельзя спорить. Можно только слушать.'),
    sign('OBJ_SIGN_FAR', 96, 188, 'Дальше — горы Поднебесной. Пока что — песок и ветер.'),
  ],
  npcs: [
    { id: 'NPC_CARAVAN', model: 'caravan', pos: [200, 0, 346], rotY: 0.2, name: 'Алтан', dialogTrigger: 'npc:NPC_CARAVAN' },
    { id: 'NPC_SHA', model: 'sha', pos: [200, 0, 168], rotY: Math.PI, name: 'Ша Сэн', hiddenUntil: 'CH04.O04', dialogTrigger: 'npc:NPC_SHA' },
  ],
  triggers: [],
  abilityPoints: [],
  transition: { next: 'ZONE_FLAME', mode: 'sleigh' },
};

export default zone;
