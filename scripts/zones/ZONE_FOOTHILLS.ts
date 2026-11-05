/** CH08 — Лесистые предгорья: финал. Долина у ручья, две террасы-видовые точки, известняковые пики в тумане (520×520, перепад до 120 м). */
import type { ZoneDef } from '../../src/content/schema';

const A: [number, number] = [150, 300];
const B: [number, number] = [380, 250];
const MID: [number, number] = [330, 332];

const zone: ZoneDef = {
  id: 'ZONE_FOOTHILLS',
  chapter: 'CH08',
  name: 'Лесистые предгорья',
  size: [520, 520],
  terrain: {
    gen: {
      seed: 8808, base: 0, noiseAmp: 4, noiseScale: 70, octaves: 4, rim: 34,
      features: [
        { kind: 'basin', pos: [80, 300], r: 90, height: 8 },
        { kind: 'hill', pos: [250, 120], r: 150, height: 30 },
        { kind: 'hill', pos: [445, 150], r: 60, height: 55 },
        { kind: 'flat', pos: [260, 470], r: 46, height: 0, falloff: 20 },
        { kind: 'flat', pos: A, r: 22, height: 40, falloff: 9 },
        { kind: 'flat', pos: MID, r: 11, height: 40, falloff: 9 },
        { kind: 'flat', pos: B, r: 22, height: 75, falloff: 9 },
        { kind: 'ramp', pos: [232, 420], to: [166, 316], height: 0, height2: 40, width: 7, falloff: 6 },
        { kind: 'ramp', pos: [292, 416], to: [MID[0], MID[1] + 4], height: 0, height2: 40, width: 7, falloff: 6 },
        { kind: 'ramp', pos: [MID[0] + 4, MID[1] - 6], to: [B[0] - 10, B[1] + 14], height: 40, height2: 75, width: 7, falloff: 6 },
      ],
    },
    chunks: 8, slopeMaxDeg: 38, heightScale: 1,
  },
  atmosphere: {
    skyTop: '#6f8fb3', skyBottom: '#f6d6a8',
    fog: { color: '#eadfce', near: 60, far: 420 },
    sun: { dir: [0.75, 0.18, -0.35], color: '#ffd59a', intensity: 2.2 },
    hemi: { sky: '#dbe8f5', ground: '#5d7a6a', intensity: 1.1 },
    ground: '#7f9e72', groundAlt: '#a9a59a',
    particles: ['mist', 'birds'],
    ambient: 'foothills',
    time: 0.25,
  },
  spawns: { default: [260, 0, 498], fromPrev: [260, 0, 498] },
  checkpoints: [
    { id: 'CP_F1', pos: [260, 0, 490], radius: 4 },
    { id: 'CP_F2', pos: [262, 0, 412], radius: 5 },
    { id: 'CP_F3', pos: [A[0] + 8, 0, A[1] + 10], radius: 5 },
    { id: 'CP_F4', pos: [MID[0], 0, MID[1]], radius: 5 },
    { id: 'CP_F5', pos: [B[0] - 6, 0, B[1] + 10], radius: 5 },
  ],
  areas: [
    { name: 'camp', shape: 'circle', pos: [262, 455], r: 34 },
    { name: 'terrace_a', shape: 'circle', pos: A, r: 24 },
    { name: 'terrace_b', shape: 'circle', pos: B, r: 24 },
    { name: 'terrace_mid', shape: 'circle', pos: MID, r: 12 },
    { name: 'peaks', shape: 'box', pos: [260, 100], size: [460, 170] },
  ],
  paths: [
    { name: 'trail_main', points: [[260, 518], [260, 440], [262, 412]], width: 4 },
    { name: 'trail_a', points: [[262, 412], [232, 420], [166, 316], A], width: 5 },
    { name: 'trail_b', points: [[262, 412], [292, 416], [MID[0], MID[1] + 4], [B[0] - 10, B[1] + 14], B], width: 5 },
  ],
  props: [
    { id: 'P_BRIDGE', asset: 'bridge', pos: [260, 0.1, 440], rotY: 0 },
    { id: 'P_WATERFALL', asset: 'waterfall', pos: [428, 18, 176], rotY: 0 },
    { id: 'P_PAGODA', asset: 'pagoda', pos: [205, 0, 470], scale: 0.8, collider: { type: 'box', size: [5, 5] } },
    { id: 'P_HERMIT_FIRE', asset: 'fire_pit', pos: [246, 0, 474] },
    { id: 'P_SIGN_A', asset: 'sign', pos: [228, 0, 426], rotY: 0.6 },
    { id: 'P_SIGN_B', asset: 'sign', pos: [296, 0, 422], rotY: -0.6 },
  ],
  scatter: [
    { asset: 'karst', count: 46, seed: 8801, minDist: 22, avoid: [], scaleRange: [7, 15], bounds: [40, 30, 480, 190], color: '#9aa39a' },
    { asset: 'karst', count: 18, seed: 8802, minDist: 18, avoid: ['terrace_*', 'trail_*'], scaleRange: [3, 7], bounds: [30, 190, 140, 300], color: '#8f9a90' },
    { asset: 'tree_round', count: 520, seed: 8803, minDist: 4.5, avoid: ['camp', 'terrace_*', 'trail_*', 'peaks'], scaleRange: [0.9, 1.7], collider: 0.6, color: '#4f7a4a' },
    { asset: 'tree_pine', count: 180, seed: 8804, minDist: 5, avoid: ['camp', 'terrace_*', 'trail_*', 'peaks'], scaleRange: [0.9, 1.5], collider: 0.5 },
    { asset: 'bamboo', count: 90, seed: 8805, minDist: 2.5, avoid: ['trail_*', 'terrace_*'], scaleRange: [0.8, 1.3], bounds: [150, 430, 380, 510] },
    { asset: 'grass', count: 400, seed: 8806, minDist: 1.6, avoid: ['trail_*'], scaleRange: [0.7, 1.3], bounds: [140, 380, 400, 515] },
    { asset: 'rock', count: 60, seed: 8807, minDist: 6, avoid: ['trail_*', 'camp'], scaleRange: [0.8, 2], collider: 0.6 },
  ],
  surfaces: [
    { id: 'S_STREAM', type: 'water', shape: 'box', pos: [260, 440], size: [300, 6] },
    { type: 'wood', shape: 'box', pos: [260, 440], size: [3, 9] },
  ],
  interactables: [
    {
      id: 'OBJ_WORKBENCH', kind: 'workbench', model: 'workbench', pos: [288, 0, 452], rotY: -0.4, radius: 2.8, solid: 1.1,
      prompt: 'Собрать камеру', effects: [],
      idleText: 'Верстак у ручья. Нужны корпус, линза, плёнка, ремешок и штатив.',
    },
    {
      id: 'OBJ_FETCH_TRAIL', kind: 'dialog', model: 'trail', pos: [262, 0, 406], radius: 3,
      prompt: 'Осмотреть старую тропу', effects: [], idleText: 'Старая тропа. Сначала бы камеру собрать.',
    },
    {
      id: 'OBJ_VIEWPOINT_FOREST', kind: 'viewpoint', model: 'viewpoint', pos: [A[0] - 8, 0, A[1] - 6], rotY: Math.PI * 0.75, radius: 3.2,
      prompt: 'Видовая точка «Лес»', effects: [], hiddenUntil: 'unlock_OBJ_VIEWPOINT_FOREST',
    },
    {
      id: 'OBJ_VIEWPOINT_MOUNTAIN', kind: 'viewpoint', model: 'viewpoint', pos: [B[0], 0, B[1] - 10], rotY: Math.PI, radius: 3.2,
      prompt: 'Видовая точка «Гора»', effects: [], hiddenUntil: 'unlock_OBJ_VIEWPOINT_MOUNTAIN',
    },
    {
      id: 'OBJ_SIGN_A', kind: 'sign', model: 'sign', pos: [236, 0, 432], radius: 2.2, prompt: 'Прочитать табличку',
      effects: [{ type: 'toast', text: '«К Лесу». Ниже подписано: «Тут был Дед». Почерк подозрительно знакомый.' }],
    },
    {
      id: 'OBJ_SIGN_B', kind: 'sign', model: 'sign', pos: [290, 0, 430], radius: 2.2, prompt: 'Прочитать табличку',
      effects: [{ type: 'toast', text: '«К Горе». Подниматься медленно, вздыхать часто.' }],
    },
  ],
  npcs: [
    { id: 'NPC_HERMIT', model: 'hermit', pos: [252, 0, 470], rotY: 0.6, name: 'Старец Гор', dialogTrigger: 'npc:NPC_HERMIT' },
  ],
  triggers: [],
  abilityPoints: [],
  viewSubjects: [
    { id: 'forest', name: 'Лес', pos: [72, 6, 300], points: 10 },
    { id: 'peak1', name: 'Пик', pos: [190, 55, 110], points: 10 },
    { id: 'peak2', name: 'Пик', pos: [310, 65, 86], points: 10 },
    { id: 'peak3', name: 'Пик', pos: [440, 70, 118], points: 8 },
    { id: 'waterfall', name: 'Водопад', pos: [428, 26, 176], points: 8 },
    { id: 'birds', name: 'Птицы', pos: [300, 52, 150], points: 8 },
  ],
  transition: { next: null, mode: 'final' },
};

export default zone;
