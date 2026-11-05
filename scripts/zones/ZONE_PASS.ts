/** CH02 — Перевал: серпантин до 60 м, харчевня «Пельмень», три разрыва под облако Суня (360×300). */
import type { InteractableDef, PropDef, ZoneDef } from '../../src/content/schema';
import { fenceRect, pickup } from './lib';

const sign = (id: string, x: number, z: number, text: string, rot = 0.2): InteractableDef => ({
  id, kind: 'sign', model: 'sign', pos: [x, 0, z], rotY: rot, radius: 2.2,
  prompt: 'Прочитать табличку', effects: [{ type: 'toast', text }],
});

const ing = (id: string, model: string, x: number, z: number, prompt: string, item: string, flag: string, color?: string): InteractableDef =>
  pickup(id, model, [x, 0, z], prompt, [
    { type: 'giveItem', item },
    { type: 'setFlag', flag },
  ], { hiddenUntil: 'ch02_met_bazje', ...(color ? { color } : {}) });

const rocks: PropDef[] = [
  [214, 176], [278, 176], [78, 112], [140, 112], [46, 208], [72, 196],
].map(([x, z], i) => ({
  id: `P_GAP_ROCK_${i}`, asset: 'big_rock', pos: [x, 0, z] as [number, number, number],
  scale: 0.5, collider: { type: 'circle' as const, r: 8 },
}));

const zone: ZoneDef = {
  id: 'ZONE_PASS',
  chapter: 'CH02',
  name: 'Перевал',
  size: [360, 300],
  terrain: {
    gen: {
      seed: 4402, base: 6, noiseAmp: 2.2, noiseScale: 46, octaves: 3, rim: 22,
      features: [
        { kind: 'hill', pos: [46, 48], r: 42, height: 26 },
        { kind: 'hill', pos: [328, 96], r: 40, height: 22 },
        { kind: 'hill', pos: [28, 248], r: 32, height: 14 },
        { kind: 'basin', pos: [180, 140], r: 36, height: 4 },

        { kind: 'ramp', pos: [168, 250], to: [84, 222], width: 16, height: 12, height2: 22, falloff: 5 },
        { kind: 'ramp', pos: [92, 214], to: [246, 194], width: 16, height: 22, height2: 32, falloff: 5 },
        { kind: 'ramp', pos: [246, 158], to: [108, 130], width: 16, height: 34, height2: 44, falloff: 5 },
        { kind: 'ramp', pos: [108, 98], to: [190, 66], width: 16, height: 46, height2: 54, falloff: 5 },
        { kind: 'ramp', pos: [170, 205], to: [318, 222], width: 12, height: 27, height2: 16, falloff: 5 },
        { kind: 'ramp', pos: [84, 222], to: [78, 218], width: 12, height: 22, height2: 22, falloff: 4 },

        { kind: 'flat', pos: [180, 268], r: 16, height: 8, falloff: 10 },
        { kind: 'flat', pos: [208, 56], r: 24, height: 54, falloff: 8 },
        { kind: 'flat', pos: [322, 224], r: 12, height: 16, falloff: 7 },
        { kind: 'flat', pos: [42, 176], r: 12, height: 22, falloff: 5 },

        { kind: 'ramp', pos: [220, 58], to: [318, 44], width: 12, height: 54, height2: 60, falloff: 4 },
        { kind: 'flat', pos: [326, 42], r: 8, height: 60, falloff: 5 },

        { kind: 'basin', pos: [246, 176], r: 14, height: 26, falloff: 3 },
        { kind: 'basin', pos: [108, 112], r: 14, height: 30, falloff: 3 },
        { kind: 'basin', pos: [58, 204], r: 11, height: 18, falloff: 3 },
        { kind: 'flat', pos: [246, 176], r: 9, height: 6, falloff: 3 },
        { kind: 'flat', pos: [108, 112], r: 9, height: 6, falloff: 3 },
        { kind: 'flat', pos: [58, 204], r: 8, height: 6, falloff: 3 },

        { kind: 'flat', pos: [246, 194], r: 8, height: 32, falloff: 3 },
        { kind: 'flat', pos: [246, 160], r: 7, height: 34, falloff: 4 },
        { kind: 'flat', pos: [108, 130], r: 7, height: 44, falloff: 4 },
        { kind: 'flat', pos: [108, 96], r: 7, height: 46, falloff: 4 },
        { kind: 'flat', pos: [78, 220], r: 6, height: 22, falloff: 3 },
        { kind: 'flat', pos: [44, 188], r: 6, height: 22, falloff: 3 },
      ],
    },
    chunks: 6, slopeMaxDeg: 40, heightScale: 1,
  },
  atmosphere: {
    skyTop: '#5e6e80', skyBottom: '#c5ced4',
    fog: { color: '#b4bec6', near: 26, far: 170 },
    sun: { dir: [-0.35, 0.42, -0.55], color: '#e4eaf0', intensity: 1.55 },
    hemi: { sky: '#c5d2dc', ground: '#6d534c', intensity: 0.85 },
    ground: '#c4b2a8', groundAlt: '#8d4e48',
    particles: ['snow_heavy'],
    ambient: 'pass',
  },
  spawns: { default: [180, 0, 272], fromPrev: [180, 0, 272] },
  checkpoints: [
    { id: 'CP_P1', pos: [180, 0, 266], radius: 6 },
    { id: 'CP_P2', pos: [160, 0, 206], radius: 6 },
    { id: 'CP_P3', pos: [200, 0, 62], radius: 7 },
    { id: 'CP_P4', pos: [300, 0, 218], radius: 6 },
  ],
  areas: [
    { name: 'clear_spawn', shape: 'circle', pos: [180, 268], r: 14 },
    { name: 'clear_tavern', shape: 'circle', pos: [208, 56], r: 20 },
    { name: 'clear_mill', shape: 'circle', pos: [322, 224], r: 12 },
    { name: 'clear_hut', shape: 'circle', pos: [42, 176], r: 12 },
    { name: 'clear_spice', shape: 'circle', pos: [326, 42], r: 8 },
    { name: 'clear_gap1', shape: 'circle', pos: [246, 176], r: 10 },
    { name: 'clear_gap2', shape: 'circle', pos: [108, 112], r: 10 },
  ],
  paths: [
    { name: 'path_a', points: [[180, 286], [168, 250], [84, 222], [160, 206], [246, 194]], width: 7 },
    { name: 'path_b', points: [[246, 160], [200, 148], [140, 136], [108, 130]], width: 7 },
    { name: 'path_c', points: [[108, 96], [150, 80], [208, 56]], width: 7 },
    { name: 'path_mill', points: [[170, 205], [240, 214], [318, 222]], width: 5 },
    { name: 'path_spice', points: [[214, 58], [270, 50], [322, 44]], width: 5 },
    { name: 'path_hut', points: [[84, 222], [78, 220]], width: 5 },
    { name: 'path_hut_far', points: [[44, 188], [42, 174]], width: 5 },
  ],
  props: [
    { id: 'P_TAVERN', asset: 'house', pos: [214, 0, 44], rotY: Math.PI, collider: { type: 'box', size: [10, 8] } },
    { id: 'P_TAVERN_SIGN', asset: 'sign', pos: [196, 0, 68], rotY: 0.4 },
    { id: 'P_STOVE', asset: 'stove', pos: [230, 0, 50], rotY: -0.6 },
    { id: 'P_SACK_A', asset: 'sack', pos: [224, 0, 40] },
    { id: 'P_SACK_B', asset: 'sack', pos: [226, 0, 41.4], scale: 0.8, color: '#c9a36a' },
    ...fenceRect('P_GARDEN', 228, 46, 256, 68, [[236, 248]]),
    { id: 'P_GARDEN_BUSH', asset: 'bush', pos: [234, 0, 52], scale: 0.7, color: '#6a8f4a' },
    { id: 'P_MILL', asset: 'mill', pos: [326, 0, 226], rotY: 0.4, collider: { type: 'circle', r: 2.4 } },
    { id: 'P_HUT', asset: 'house', pos: [36, 0, 170], scale: 0.62, rotY: 0.8, color: '#6b4e3a', collider: { type: 'box', size: [10, 8] } },
    { id: 'P_HUT_STUMP', asset: 'stump', pos: [50, 0, 174], collider: { type: 'circle', r: 0.6 } },
    { id: 'P_SPICE_ROCK', asset: 'big_rock', pos: [334, 0, 36], scale: 0.28, collider: { type: 'circle', r: 5 } },
    { id: 'P_CLOUD_A', asset: 'cloud', pos: [246, 0, 194], scale: 0.8 },
    { id: 'P_CLOUD_B', asset: 'cloud', pos: [108, 0, 130], scale: 0.8 },
    { id: 'P_CLOUD_C', asset: 'cloud', pos: [78, 0, 220], scale: 0.8 },
    ...rocks,
  ],
  scatter: [
    { asset: 'rock', count: 200, seed: 2201, minDist: 5.5, avoid: ['clear_*', 'path_*'], scaleRange: [0.7, 1.7], collider: 0.65 },
    { asset: 'boulder', count: 28, seed: 2202, minDist: 12, avoid: ['clear_*', 'path_*'], scaleRange: [0.45, 0.9], collider: 1.3 },
    { asset: 'snow_mound', count: 140, seed: 2203, minDist: 4, avoid: ['clear_*', 'path_*'], scaleRange: [0.6, 1.3] },
    { asset: 'tree_pine', count: 60, seed: 2204, minDist: 7, avoid: ['clear_*', 'path_*'], scaleRange: [0.55, 1.1], collider: 0.4, bounds: [24, 190, 340, 286] },
  ],
  surfaces: [
    { id: 'S_GAP_1', type: 'water', shape: 'box', pos: [246, 176], size: [40, 16] },
    { id: 'S_GAP_2', type: 'water', shape: 'box', pos: [108, 112], size: [40, 16] },
    { id: 'S_HUT_CHASM', type: 'water', shape: 'box', pos: [58, 204], size: [20, 16] },
  ],
  interactables: [
    {
      id: 'OBJ_POT_STOVE', kind: 'cooking', model: 'pot_stove', pos: [222, 0, 52], rotY: -0.4, radius: 2.4,
      prompt: 'Поставить котёл', effects: [],
      idleText: 'ДМ: Котёл ждёт. Мука, мясо, лук и пряность — и можно лепить.',
    },
    ing('OBJ_FLOUR_SACK', 'sack', 310, 220, 'Взять муку', 'ITM_FLOUR', 'ch02_ing_flour', '#f3e6c4'),
    ing('OBJ_MEAT_RACK', 'meat', 48, 178, 'Взять мясо', 'ITM_MEAT', 'ch02_ing_meat'),
    ing('OBJ_ONION_BED', 'onion', 244, 58, 'Собрать лук', 'ITM_ONION', 'ch02_ing_onion'),
    ing('OBJ_SPICE_BUSH', 'bush', 322, 44, 'Сорвать пряность', 'ITM_SPICE', 'ch02_ing_spice', '#3f7a45'),
    sign('OBJ_SIGN_MENU', 198, 74, 'Меню харчевни «Пельмень»: пельмени. Второе — тоже пельмени.'),
    sign('OBJ_SIGN_WIND', 150, 236, 'Ветер здесь без выходных. Шапку держи двумя руками.'),
    sign('OBJ_SIGN_GAP', 232, 198, 'Дальше тропа кончается. Облако Суня — не шутка.'),
    sign('OBJ_SIGN_MILL', 308, 232, 'Мельница ушла на покой. Мука осталась дежурить.'),
    sign('OBJ_SIGN_CLIFF', 300, 50, 'Утёс выше, чем кажется. Пряность любит высоту.'),
    {
      id: 'OBJ_STUMP_NOTE', kind: 'sign', model: 'stump', pos: [168, 0, 258], radius: 2,
      prompt: 'Прочитать записку на пне',
      effects: [{ type: 'toast', text: 'Высота — это низ, который очень старался. Ну-ну.' }],
    },
  ],
  npcs: [
    { id: 'NPC_BAZJE', model: 'bazje', pos: [198, 0, 54], rotY: 0.5, name: 'Бацзе', dialogTrigger: 'npc:NPC_BAZJE' },
  ],
  triggers: [],
  abilityPoints: [
    { type: 'cloud_spot', id: 'CS_GAP_1', pos: [246, 0, 194], to: [246, 0, 160] },
    { type: 'cloud_spot', id: 'CS_GAP_2', pos: [108, 0, 130], to: [108, 0, 96] },
    { type: 'cloud_spot', id: 'CS_HUT', pos: [78, 0, 220], to: [44, 0, 188] },
  ],
  transition: { next: 'ZONE_BAIKAL', mode: 'walk_fade' },
};

export default zone;
