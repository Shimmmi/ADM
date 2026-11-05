/** CH03 — Байкал: плоский лёд, три поля трещин, дворец Духа (420×420, торосы ≤ 6 м). */
import type { InteractableDef, PropDef, ZoneDef } from '../../src/content/schema';
import { pickup, r } from './lib';

const fields = [
  { id: 'TI_1', pos: [210, 300] as [number, number], size: [28, 22] as [number, number], cell: 3, seed: 301 },
  { id: 'TI_2', pos: [210, 248] as [number, number], size: [26, 20] as [number, number], cell: 3, seed: 317 },
  { id: 'TI_3', pos: [210, 196] as [number, number], size: [30, 24] as [number, number], cell: 3, seed: 333 },
];

/** Центры сегментов, покрывающие [from, to] с шагом ~span. */
function spans(from: number, to: number, span: number): number[] {
  const lo = Math.min(from, to), hi = Math.max(from, to);
  if (hi - lo < 3) return [];
  const cover = 11.6;
  const step = Math.min(span, 9);
  const out: number[] = [];
  for (let x = lo + cover / 2; x <= hi - cover / 2 + 0.01; x += step) out.push(r(x));
  const tail = r(hi - cover / 2);
  if (!out.length || Math.abs(out[out.length - 1] - tail) > 1.2) out.push(tail);
  return out;
}

function barX(id: string, z: number, gap0: number, gap1: number): PropDef[] {
  const seg = (x: number, i: number, side: string): PropDef => ({
    id: `${id}_${side}${i}`, asset: 'ice_wall', pos: [x, 0, r(z)],
    collider: { type: 'box', size: [11.6, 2.8] },
  });
  return [
    ...spans(6, gap0, 11).map((x, i) => seg(x, i, 'w')),
    ...spans(gap1, 414, 11).map((x, i) => seg(x, i, 'e')),
  ];
}

function barZ(id: string, x: number, z0: number, z1: number): PropDef[] {
  return spans(z0, z1, 11).map((z, i) => ({
    id: `${id}_${i}`, asset: 'ice_wall', pos: [r(x), 0, z], rotY: r(-Math.PI / 2),
    collider: { type: 'box', size: [11.6, 2.8] },
  }));
}

const iceWalls: PropDef[] = fields.flatMap((f) => {
  const [cx, cz] = f.pos;
  const [w, d] = f.size;
  const west = cx - w / 2, east = cx + w / 2;
  const south = cz + d / 2, north = cz - d / 2;
  return [
    ...barX(`P_BAR_${f.id}`, south + 2.2, west, east),
    ...barZ(`P_FLANKW_${f.id}`, west - 1.8, south + 2, north - 1),
    ...barZ(`P_FLANKE_${f.id}`, east + 1.8, south + 2, north - 1),
  ];
});

const sign = (id: string, x: number, z: number, text: string): InteractableDef => ({
  id, kind: 'sign', model: 'sign', pos: [x, 0, z], radius: 2.2,
  prompt: 'Прочитать табличку', effects: [{ type: 'toast', text }],
});

const shard = (n: number, x: number, z: number): InteractableDef =>
  pickup(`OBJ_ICE_SHARD_0${n}`, 'shard', [x, 0, z], 'Поднять осколок льда', [
    { type: 'giveItem', item: 'ITM_ICE_SHARD' },
  ], { hiddenUntil: 'ch03_met_nerpa', color: '#d7f4ff' });

const zone: ZoneDef = {
  id: 'ZONE_BAIKAL',
  chapter: 'CH03',
  name: 'Байкал',
  size: [420, 420],
  terrain: {
    gen: {
      seed: 5503, base: 1.2, noiseAmp: 0.35, noiseScale: 70, octaves: 2, rim: 20,
      features: [
        { kind: 'ridge', pos: [70, 340], to: [70, 160], width: 18, height: 5, falloff: 12 },
        { kind: 'ridge', pos: [350, 320], to: [350, 140], width: 16, height: 6, falloff: 12 },
        { kind: 'hill', pos: [90, 90], r: 28, height: 4 },
        { kind: 'hill', pos: [340, 80], r: 26, height: 5 },
        { kind: 'ramp', pos: [210, 410], to: [210, 50], width: 90, height: 1.4, height2: 1.6, falloff: 16 },
      ],
    },
    chunks: 6, slopeMaxDeg: 32, heightScale: 1,
  },
  atmosphere: {
    skyTop: '#16324a', skyBottom: '#8ec9d6',
    fog: { color: '#b7e4ee', near: 40, far: 240 },
    sun: { dir: [0.25, 0.7, -0.35], color: '#eaf7ff', intensity: 1.7 },
    hemi: { sky: '#c6ecf5', ground: '#1d4a5c', intensity: 0.9 },
    ground: '#b7e3ee', groundAlt: '#e8f7fb',
    particles: ['ice_sparkles'],
    ambient: 'baikal',
  },
  spawns: { default: [210, 0, 400], fromPrev: [210, 0, 400] },
  checkpoints: [
    { id: 'CP_B0', pos: [210, 0, 396], radius: 6 },
    { id: 'CP_B1', pos: [210, 0, 332], radius: 6 },
    { id: 'CP_B2', pos: [210, 0, 274], radius: 6 },
    { id: 'CP_B3', pos: [210, 0, 222], radius: 6 },
    { id: 'CP_B4', pos: [210, 0, 156], radius: 6 },
  ],
  areas: [
    { name: 'clear_spawn', shape: 'circle', pos: [210, 398], r: 16 },
    { name: 'clear_shore', shape: 'box', pos: [210, 370], size: [120, 50] },
    { name: 'clear_gap1', shape: 'box', pos: [210, 274], size: [40, 24] },
    { name: 'clear_gap2', shape: 'box', pos: [210, 222], size: [40, 22] },
    { name: 'clear_palace', shape: 'circle', pos: [210, 86], r: 18 },
    { name: 'clear_after', shape: 'box', pos: [210, 150], size: [36, 30] },
  ],
  paths: [
    { name: 'path_lake', points: [[210, 416], [210, 340], [210, 300], [210, 248], [210, 196], [210, 90]], width: 8 },
  ],
  props: [
    ...iceWalls,
    { id: 'P_PALACE', asset: 'palace', pos: [210, 0, 74], color: '#d7f4ff', collider: { type: 'box', size: [12, 8] } },
    { id: 'P_CP1', asset: 'checkpoint', pos: [204, 0, 332] },
    { id: 'P_CP2', asset: 'checkpoint', pos: [204, 0, 274] },
    { id: 'P_CP3', asset: 'checkpoint', pos: [204, 0, 222] },
    { id: 'P_SHORE_ROCK', asset: 'big_rock', pos: [160, 0, 390], scale: 0.22, color: '#d5eef6', collider: { type: 'circle', r: 6 } },
  ],
  scatter: [
    { asset: 'ice_ridge', count: 160, seed: 5301, minDist: 4.2, avoid: ['clear_*', 'path_*'], scaleRange: [0.7, 1.3], collider: 1.15, bounds: [12, 80, 175, 360] },
    { asset: 'ice_ridge', count: 160, seed: 5302, minDist: 4.2, avoid: ['clear_*', 'path_*'], scaleRange: [0.7, 1.3], collider: 1.15, bounds: [245, 80, 408, 360] },
    { asset: 'snow_mound', count: 70, seed: 5303, minDist: 4, avoid: ['clear_spawn', 'path_lake'], scaleRange: [0.6, 1.2], bounds: [40, 350, 380, 412] },
    { asset: 'rock', count: 24, seed: 5304, minDist: 8, avoid: ['clear_*', 'path_*'], scaleRange: [0.4, 0.8], collider: 0.5, bounds: [40, 360, 380, 412], color: '#d5e4ea' },
  ],
  interactables: [
    shard(1, 176, 364),
    shard(2, 244, 368),
    shard(3, 208, 342),
    {
      id: 'OBJ_PALACE_DOOR', kind: 'gate', model: 'ice_door', pos: [210, 0, 92], radius: 4.2,
      prompt: 'Осмотреть ледяную дверь', once: true,
      effects: [{ type: 'toast', text: 'Дверь из прозрачного льда. За ней дышит дворец.' }],
      idleText: 'Дух уже знает, что вы здесь.',
    },
    sign('OBJ_SIGN_SHORE', 198, 384, 'Нерпа проверяет печати быстрее ветра. Взятка не требуется.'),
    sign('OBJ_SIGN_CRACK', 196, 328, 'Лёд честный: тонкий хрустит заранее. Иди по тёмным пятнам.'),
    sign('OBJ_SIGN_STARS', 230, 270, 'Звёзды во льду — не для еды. Бацзе, это не тебе.'),
    sign('OBJ_SIGN_PALACE', 198, 150, 'Дворец под льдом. Стучать вежливо, загадки — вслух.'),
    {
      id: 'OBJ_ICE_NOTE', kind: 'sign', model: 'stump', pos: [236, 0, 348], radius: 2,
      prompt: 'Прочитать записку',
      effects: [{ type: 'toast', text: 'Осколок в кармане не тает. Проверено бородой.' }],
    },
  ],
  npcs: [
    { id: 'NPC_NERPA', model: 'nerpa', pos: [224, 0, 388], rotY: 0.4, name: 'Нерпа', dialogTrigger: 'npc:NPC_NERPA' },
    { id: 'NPC_DRAGON', model: 'dragon', pos: [196, 0, 88], rotY: 0.9, name: 'Дух Байкала', dialogTrigger: 'npc:NPC_DRAGON' },
  ],
  triggers: [
    {
      id: 'TRG_THIN_ICE_START', shape: 'box', pos: [210, 0, 320], size: [36, 8, 10],
      onEnter: [{
        type: 'if',
        cond: { all: [{ flag: 'ch03_met_nerpa' }, { notFlag: 'mg_MG_THIN_ICE_done' }] },
        then: [{ type: 'startMinigame', id: 'MG_THIN_ICE' }],
      }],
    },
  ],
  abilityPoints: [],
  thinIce: fields,
  events: {
    'MG_THIN_ICE_DONE': [
      { type: 'completeObjective', id: 'CH03.O03' },
      { type: 'activateObjective', id: 'CH03.O04' },
    ],
    'done:CH03.O02': [
      { type: 'activateObjective', id: 'CH03.O03' },
    ],
  },
  transition: { next: 'ZONE_TEA_ROAD', mode: 'walk_fade' },
};

export default zone;
