/**
 * Процедурные low-poly модели (TECH §13: обязательный fallback из примитивов).
 * Палитра и пропорции — из прототипа. Материалы общие (userData.shared), при выгрузке
 * зоны не уничтожаются.
 */
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

const matCache = new Map<string, THREE.MeshStandardMaterial>();

export function mat(color: string | number, extra: { emissive?: string | number; emissiveIntensity?: number; transparent?: boolean; opacity?: number } = {}): THREE.MeshStandardMaterial {
  const key = `${color}|${extra.emissive ?? ''}|${extra.emissiveIntensity ?? ''}|${extra.opacity ?? ''}`;
  let m = matCache.get(key);
  if (!m) {
    m = new THREE.MeshStandardMaterial({ color, flatShading: true, roughness: 0.85, ...extra });
    m.userData.shared = true;
    matCache.set(key, m);
  }
  return m;
}

export const C = {
  snow: '#e9f5fa', white: '#ffffff', red: '#ba3240', darkRed: '#782533', skin: '#f4c5a3', coal: '#263345',
  gold: '#ffd27d', green: '#347862', darkGreen: '#235b55', brown: '#806044', wood: '#9a704e', blue: '#5995b0',
  purple: '#806394', orange: '#dd874c', stone: '#8295a4', stoneDark: '#647b8b', grey: '#9aa3a8', pink: '#e9a0a8',
  ice: '#bfe8f5', black: '#1d1f26', lava: '#ff6a2a', moss: '#5d7d3c', sand: '#d9b77a', paper: '#f3e6c4',
};

const geoCache = new Map<string, THREE.BufferGeometry>();
function cachedGeo(key: string, make: () => THREE.BufferGeometry): THREE.BufferGeometry {
  let g = geoCache.get(key);
  if (!g) {
    g = make();
    g.userData.shared = true;
    geoCache.set(key, g);
  }
  return g;
}

type P = THREE.Object3D;
function add(parent: P, geo: THREE.BufferGeometry, color: string, x: number, y: number, z: number, emissive?: string): THREE.Mesh {
  const m = new THREE.Mesh(geo, emissive ? mat(color, { emissive, emissiveIntensity: 1.1 }) : mat(color));
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  parent.add(m);
  return m;
}
export const box = (p: P, s: [number, number, number], c: string, x = 0, y = 0, z = 0, e?: string) =>
  add(p, cachedGeo(`b${s}`, () => new THREE.BoxGeometry(...s)), c, x, y, z, e);
export const sphere = (p: P, r: number, c: string, x = 0, y = 0, z = 0, e?: string) =>
  add(p, cachedGeo(`s${r}`, () => new THREE.IcosahedronGeometry(r, 1)), c, x, y, z, e);
export const cyl = (p: P, rt: number, rb: number, h: number, c: string, x = 0, y = 0, z = 0, seg = 8, e?: string) =>
  add(p, cachedGeo(`c${rt},${rb},${h},${seg}`, () => new THREE.CylinderGeometry(rt, rb, h, seg)), c, x, y, z, e);
export const cone = (p: P, r: number, h: number, c: string, x = 0, y = 0, z = 0, seg = 8, e?: string) =>
  add(p, cachedGeo(`k${r},${h},${seg}`, () => new THREE.ConeGeometry(r, h, seg)), c, x, y, z, e);

/* ---------------- Персонажи ---------------- */

/** Пятно-тень под персонажами: видно только когда настоящие тени выключены (Low). */
let blobMat: THREE.MeshBasicMaterial | null = null;
function blobMaterial(): THREE.MeshBasicMaterial {
  if (blobMat) return blobMat;
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d')!;
  const grad = g.createRadialGradient(32, 32, 4, 32, 32, 32);
  grad.addColorStop(0, 'rgba(0,0,0,0.45)');
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 64);
  blobMat = new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false, visible: false });
  blobMat.userData.shared = true;
  return blobMat;
}
export function setBlobShadows(on: boolean): void {
  blobMaterial().visible = on;
}
function addBlob(root: THREE.Object3D, r = 0.7): void {
  const m = new THREE.Mesh(cachedGeo('blob', () => new THREE.PlaneGeometry(2, 2).rotateX(-Math.PI / 2)), blobMaterial());
  m.scale.setScalar(r);
  m.position.y = 0.04;
  m.renderOrder = -1;
  root.add(m);
}

export interface Rig {
  root: THREE.Group;
  body: THREE.Group;
  legs: THREE.Object3D[];
  arms: THREE.Object3D[];
}

export function makeSanta(): Rig {
  const root = new THREE.Group();
  const legs: THREE.Object3D[] = [];
  for (const x of [-0.23, 0.23]) {
    const pivot = new THREE.Group();
    pivot.position.set(x, 0.8, 0);
    root.add(pivot);
    box(pivot, [0.27, 0.66, 0.32], C.darkRed, 0, -0.34, 0);
    box(pivot, [0.34, 0.21, 0.43], C.coal, 0, -0.71, 0.08);
    legs.push(pivot);
  }
  const body = new THREE.Group();
  root.add(body);
  cyl(body, 0.55, 0.72, 1.4, C.red, 0, 1.37, 0, 10);
  cyl(body, 0.73, 0.73, 0.15, C.white, 0, 0.69, 0, 10);
  box(body, [0.2, 1.3, 0.12], C.white, 0, 1.37, 0.62);
  box(body, [1.12, 0.21, 0.12], C.coal, 0, 1.28, 0.61);
  box(body, [0.25, 0.24, 0.15], C.gold, 0, 1.28, 0.7);
  // камера «Зенит» у пояса
  box(body, [0.32, 0.22, 0.14], C.black, 0.42, 1.12, 0.55);
  cyl(body, 0.07, 0.07, 0.1, C.grey, 0.42, 1.12, 0.66).rotation.x = Math.PI / 2;
  const arms: THREE.Object3D[] = [];
  for (const side of [-1, 1]) {
    const pivot = new THREE.Group();
    pivot.position.set(side * 0.6, 1.95, 0);
    body.add(pivot);
    box(pivot, [0.27, 0.82, 0.31], C.red, side * 0.12, -0.37, 0);
    sphere(pivot, 0.18, C.white, side * 0.17, -0.76, 0);
    sphere(pivot, 0.19, C.darkRed, side * 0.18, -0.9, 0.02);
    arms.push(pivot);
  }
  // посох в правой руке
  const staff = new THREE.Group();
  staff.position.set(0.2, -0.9, 0.1);
  arms[1].add(staff);
  cyl(staff, 0.04, 0.05, 2.2, C.wood, 0, 0.4, 0);
  sphere(staff, 0.13, C.ice, 0, 1.55, 0, '#7fd6ff');
  sphere(body, 0.43, C.skin, 0, 2.36, 0);
  cone(body, 0.38, 0.75, C.white, 0, 1.95, 0.32).rotation.z = Math.PI;
  sphere(body, 0.13, C.skin, 0, 2.35, 0.45);
  sphere(body, 0.055, C.coal, -0.17, 2.48, 0.36);
  sphere(body, 0.055, C.coal, 0.17, 2.48, 0.36);
  cyl(body, 0.44, 0.44, 0.17, C.white, 0, 2.72, 0, 10);
  cone(body, 0.48, 0.75, C.red, 0, 3.1, 0);
  sphere(body, 0.15, C.white, 0.07, 3.51, 0);
  root.scale.setScalar(0.62);
  addBlob(root, 1.1);
  return { root, legs, arms, body };
}

export interface PersonOpts {
  coat: string;
  hat?: string;
  hatKind?: 'cone' | 'cap' | 'ring' | 'none' | 'bun';
  skin?: string;
  scale?: number;
  beard?: string;
  wide?: number;
  ears?: string;
  snout?: string;
  tail?: string;
  extra?: (body: THREE.Group) => void;
}

export function makePerson(o: PersonOpts): Rig {
  const root = new THREE.Group();
  const legs: THREE.Object3D[] = [];
  const w = o.wide ?? 1;
  for (const side of [-1, 1]) {
    const pivot = new THREE.Group();
    pivot.position.set(side * 0.17 * w, 0.76, 0);
    root.add(pivot);
    box(pivot, [0.2, 0.55, 0.22], C.coal, 0, -0.27, 0);
    legs.push(pivot);
  }
  const body = new THREE.Group();
  root.add(body);
  cyl(body, 0.38 * w, 0.5 * w, 1.05, o.coat, 0, 1.09, 0);
  const skin = o.skin ?? C.skin;
  sphere(body, 0.34, skin, 0, 1.83, 0);
  sphere(body, 0.045, C.coal, -0.12, 1.86, 0.29);
  sphere(body, 0.045, C.coal, 0.12, 1.86, 0.29);
  if (o.beard) cone(body, 0.28, 0.6, o.beard, 0, 1.5, 0.22).rotation.z = Math.PI;
  if (o.snout) {
    cyl(body, 0.13, 0.15, 0.18, o.snout, 0, 1.78, 0.36).rotation.x = Math.PI / 2;
    sphere(body, 0.03, C.coal, -0.05, 1.78, 0.46);
    sphere(body, 0.03, C.coal, 0.05, 1.78, 0.46);
  }
  if (o.ears) for (const s of [-1, 1]) cone(body, 0.1, 0.22, o.ears, s * 0.25, 2.12, 0, 4).rotation.z = -s * 0.5;
  const hk = o.hatKind ?? 'cone';
  if (o.hat && hk === 'cone') {
    cone(body, 0.37, 0.68, o.hat, 0, 2.28, 0);
    sphere(body, 0.1, C.white, 0, 2.65, 0);
  } else if (o.hat && hk === 'cap') {
    cyl(body, 0.36, 0.38, 0.22, o.hat, 0, 2.12, 0, 10);
  } else if (o.hat && hk === 'ring') {
    const ring = new THREE.Mesh(cachedGeo('ring', () => new THREE.TorusGeometry(0.33, 0.05, 6, 14)), mat(o.hat, { emissive: o.hat, emissiveIntensity: 0.3 }));
    ring.position.set(0, 2.0, 0);
    ring.rotation.x = Math.PI / 2;
    body.add(ring);
  } else if (o.hat && hk === 'bun') {
    sphere(body, 0.18, o.hat, 0, 2.2, -0.08);
  }
  if (o.tail) {
    const t = cyl(body, 0.05, 0.08, 0.9, o.tail, 0, 0.75, -0.45);
    t.rotation.x = -0.9;
  }
  const arms: THREE.Object3D[] = [];
  for (const side of [-1, 1]) {
    const pivot = new THREE.Group();
    pivot.position.set(side * 0.43 * w, 1.47, 0);
    body.add(pivot);
    box(pivot, [0.17, 0.65, 0.2], o.coat, side * 0.07, -0.33, 0);
    sphere(pivot, 0.13, skin, side * 0.08, -0.68, 0);
    arms.push(pivot);
  }
  o.extra?.(body);
  root.scale.setScalar((o.scale ?? 1) * 0.78);
  return { root, legs, arms, body };
}

function makeHorse(): Rig {
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);
  box(body, [0.7, 0.7, 1.6], C.white, 0, 1.25, 0);
  const neck = box(body, [0.35, 0.8, 0.4], C.white, 0, 1.75, 0.75);
  neck.rotation.x = 0.5;
  box(body, [0.36, 0.36, 0.7], C.white, 0, 2.15, 1.05);
  for (const s of [-1, 1]) cone(body, 0.06, 0.3, C.gold, s * 0.12, 2.45, 0.95, 5);
  box(body, [0.08, 0.5, 0.5], C.ice, 0, 1.9, 0.55);
  const legs: THREE.Object3D[] = [];
  for (const [x, z] of [[-0.25, 0.6], [0.25, 0.6], [-0.25, -0.6], [0.25, -0.6]]) {
    const pivot = new THREE.Group();
    pivot.position.set(x, 0.95, z);
    root.add(pivot);
    box(pivot, [0.16, 0.9, 0.16], C.white, 0, -0.45, 0);
    legs.push(pivot);
  }
  return { root, body, legs, arms: [] };
}

function makeSpider(): Rig {
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);
  sphere(body, 0.7, '#3a2b45', 0, 1.0, -0.3);
  sphere(body, 0.45, '#4a3858', 0, 1.1, 0.5);
  for (const s of [-0.15, 0.15]) sphere(body, 0.08, '#ffde89', s, 1.25, 0.88, '#ffbd54');
  // шаль
  cone(body, 0.75, 0.5, C.pink, 0, 1.45, 0.1, 10);
  const legs: THREE.Object3D[] = [];
  for (let i = 0; i < 8; i++) {
    const side = i < 4 ? -1 : 1;
    const k = i % 4;
    const pivot = new THREE.Group();
    pivot.position.set(side * 0.45, 1.0, 0.45 - k * 0.3);
    root.add(pivot);
    const leg = box(pivot, [1.1, 0.1, 0.1], '#2b2033', side * 0.5, 0.15, 0);
    leg.rotation.z = side * -0.5;
    legs.push(pivot);
  }
  return { root, body, legs, arms: [] };
}

function makeDragon(): Rig {
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);
  const iceMat = mat(C.ice, { transparent: true, opacity: 0.75, emissive: '#5fc8ff', emissiveIntensity: 0.25 });
  for (let i = 0; i < 7; i++) {
    const seg = new THREE.Mesh(cachedGeo('drseg', () => new THREE.IcosahedronGeometry(0.7, 0)), iceMat);
    seg.position.set(Math.sin(i * 0.9) * 1.2, 1 + i * 0.55, -i * 0.6);
    seg.scale.setScalar(1 - i * 0.08);
    body.add(seg);
  }
  const head = new THREE.Mesh(cachedGeo('drhead', () => new THREE.ConeGeometry(0.7, 1.6, 5)), iceMat);
  head.position.set(0, 4.6, 0.6);
  head.rotation.x = Math.PI / 2;
  body.add(head);
  for (const s of [-1, 1]) cone(body, 0.12, 0.9, C.white, s * 0.35, 5.2, 0.2, 5);
  return { root, body, legs: [], arms: [] };
}

function makeSeal(): Rig {
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);
  sphere(body, 0.6, '#8a9aa6', 0, 0.6, 0);
  sphere(body, 0.4, '#8a9aa6', 0, 1.15, 0.2);
  for (const s of [-0.13, 0.13]) {
    const lens = new THREE.Mesh(cachedGeo('glass', () => new THREE.TorusGeometry(0.09, 0.02, 4, 10)), mat(C.gold));
    lens.position.set(s, 1.22, 0.55);
    body.add(lens);
    sphere(body, 0.04, C.coal, s, 1.22, 0.56);
  }
  for (const s of [-1, 1]) box(body, [0.25, 0.02, 0.01], C.white, s * 0.22, 1.08, 0.55);
  return { root, body, legs: [], arms: [] };
}

function makeCamel(): THREE.Group {
  const g = new THREE.Group();
  box(g, [0.8, 0.8, 2], C.sand, 0, 1.6, 0);
  sphere(g, 0.45, C.sand, 0, 2.2, 0.3);
  sphere(g, 0.45, C.sand, 0, 2.2, -0.4);
  const n = box(g, [0.3, 1, 0.3], C.sand, 0, 2.2, 1.1);
  n.rotation.x = 0.4;
  box(g, [0.35, 0.3, 0.6], C.sand, 0, 2.7, 1.45);
  for (const [x, z] of [[-0.3, 0.7], [0.3, 0.7], [-0.3, -0.7], [0.3, -0.7]]) box(g, [0.18, 1.2, 0.18], C.sand, x, 0.6, z);
  return g;
}

const PEOPLE: Record<string, () => Rig> = {
  santa: makeSanta,
  sun: () => makePerson({ coat: C.orange, skin: '#c98a4e', hat: C.gold, hatKind: 'ring', scale: 0.85, ears: '#c98a4e', tail: '#c98a4e',
    extra: (b) => { const s = cyl(b, 0.035, 0.035, 2, C.gold, 0.55, 1.2, 0); s.rotation.z = 0.3; } }),
  bazje: () => makePerson({ coat: '#5b7f6a', skin: '#f2b6b6', snout: '#e79c9c', ears: '#f2b6b6', wide: 1.35, scale: 0.95 }),
  sha: () => makePerson({ coat: '#6f7b86', skin: '#9fb0b8', scale: 1.15, beard: '#4e5a62',
    extra: (b) => { cyl(b, 0.04, 0.04, 2.4, C.wood, -0.55, 1.2, 0); for (let i = 0; i < 9; i++) sphere(b, 0.05, C.white, Math.cos(i * 0.7) * 0.32, 1.45 - Math.abs(Math.sin(i * 0.35)) * 0.4, 0.3); } }),
  leshy: () => makePerson({ coat: C.moss, skin: '#a3b07a', beard: '#4f6b2a', hat: '#4f6b2a', hatKind: 'cap', scale: 0.9 }),
  caravan: () => makePerson({ coat: '#9c7a52', hat: '#5b3b26', hatKind: 'cap' }),
  princess: () => makePerson({ coat: '#b8282e', skin: C.skin, hat: C.gold, hatKind: 'bun', scale: 1.05,
    extra: (b) => { const f = new THREE.Mesh(cachedGeo('fan', () => new THREE.CircleGeometry(0.9, 8, 0, Math.PI)), mat(C.gold)); f.position.set(0.7, 1.6, 0.1); f.rotation.z = -0.6; b.add(f); } }),
  merchant: () => makePerson({ coat: '#3d5a9c', hat: C.black, hatKind: 'cap', beard: C.coal }),
  master_hu: () => makePerson({ coat: '#5e4b3a', hat: '#2f2a26', hatKind: 'cap', beard: C.grey,
    extra: (b) => { for (const s of [-0.12, 0.12]) { const l = new THREE.Mesh(cachedGeo('glass', () => new THREE.TorusGeometry(0.09, 0.02, 4, 10)), mat(C.gold)); l.position.set(s, 1.88, 0.32); b.add(l); } } }),
  hermit: () => makePerson({ coat: '#e5e1d6', beard: C.white, hat: C.white, hatKind: 'bun', scale: 0.95 }),
  bailun: makeHorse,
  spider: makeSpider,
  dragon: makeDragon,
  nerpa: makeSeal,
};

export function hasRig(key: string): boolean {
  return key in PEOPLE;
}

export function makeRig(key: string): Rig {
  const f = PEOPLE[key];
  if (f) {
    const rig = f();
    addBlob(rig.root, 0.9);
    return rig;
  }
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);
  box(body, [0.8, 1.8, 0.8], C.purple, 0, 0.9, 0);
  return { root, body, legs: [], arms: [] };
}

/** Анимация шага/покоя для любой рига. */
export function animateRig(rig: Rig, t: number, speed: number): void {
  const swing = Math.min(1, speed / 4) * 0.7;
  const ph = t * (4 + speed * 1.2);
  rig.legs.forEach((l, i) => (l.rotation.x = Math.sin(ph + (i % 2 ? Math.PI : 0)) * swing));
  rig.arms.forEach((a, i) => (a.rotation.x = Math.sin(ph + (i % 2 ? 0 : Math.PI)) * swing * 0.8));
  rig.body.position.y = speed > 0.1 ? Math.abs(Math.sin(ph)) * 0.06 : Math.sin(t * 2) * 0.02;
}

/* ---------------- Объекты ---------------- */

type Builder = (color?: string) => THREE.Object3D;

function g(fn: (g: THREE.Group) => void): THREE.Group {
  const grp = new THREE.Group();
  fn(grp);
  return grp;
}

const OBJECTS: Record<string, Builder> = {
  house: () => g((o) => {
    box(o, [10, 5, 8], C.wood, 0, 2.5, 0);
    const roof = cone(o, 7.6, 3.6, C.darkRed, 0, 6.8, 0, 4);
    roof.rotation.y = Math.PI / 4;
    roof.scale.set(1, 1, 0.82);
    box(o, [1.6, 2.6, 0.2], C.brown, 0, 1.3, 4.05);
    for (const x of [-3, 3]) box(o, [1.6, 1.4, 0.2], '#ffd27d', x, 2.8, 4.05, '#ffbd54');
    box(o, [0.9, 3, 0.9], C.stoneDark, 3, 7.5, -1.5);
  }),
  fence: () => g((o) => { for (let i = -2; i <= 2; i++) box(o, [0.18, 1.2, 0.18], C.wood, i * 1.2, 0.6, 0); box(o, [5, 0.14, 0.1], C.wood, 0, 0.9, 0); box(o, [5, 0.14, 0.1], C.wood, 0, 0.45, 0); }),
  gate: () => g((o) => { box(o, [0.4, 3.4, 0.4], C.wood, -2, 1.7, 0); box(o, [0.4, 3.4, 0.4], C.wood, 2, 1.7, 0); box(o, [4.8, 0.4, 0.5], C.darkRed, 0, 3.4, 0); }),
  desk: () => g((o) => { box(o, [1.6, 0.12, 0.9], C.wood, 0, 0.9, 0); for (const [x, z] of [[-0.7, -0.35], [0.7, -0.35], [-0.7, 0.35], [0.7, 0.35]]) box(o, [0.1, 0.9, 0.1], C.brown, x, 0.45, z); box(o, [0.5, 0.02, 0.35], C.paper, 0, 0.97, 0); sphere(o, 0.07, C.red, 0.1, 1.0, 0); }),
  closet: () => g((o) => { box(o, [1.6, 2.4, 0.8], C.brown, 0, 1.2, 0); box(o, [0.06, 2.2, 0.05], C.coal, 0, 1.2, 0.42); sphere(o, 0.05, C.gold, 0.15, 1.2, 0.44); }),
  hook: () => g((o) => { box(o, [0.12, 1.8, 0.12], C.wood, 0, 0.9, 0); box(o, [0.5, 0.08, 0.08], C.wood, 0.2, 1.7, 0); box(o, [0.25, 0.32, 0.12], C.red, 0.35, 1.45, 0); box(o, [0.25, 0.32, 0.12], C.white, 0.05, 1.45, 0.1); }),
  icicle: () => g((o) => { for (let i = -2; i <= 2; i++) cone(o, 0.22, 1.6 + (i % 2) * 0.5, C.ice, i * 0.45, 2.6, 0, 5, '#8fdcff').rotation.x = Math.PI; box(o, [2.6, 0.3, 0.4], C.ice, 0, 3.5, 0); }),
  sign: () => g((o) => { box(o, [0.15, 1.6, 0.15], C.wood, 0, 0.8, 0); box(o, [1.3, 0.6, 0.08], C.paper, 0, 1.45, 0.08); }),
  stump: () => g((o) => { cyl(o, 0.5, 0.6, 0.6, C.brown, 0, 0.3, 0); cyl(o, 0.48, 0.48, 0.04, '#c7a57a', 0, 0.62, 0); box(o, [0.6, 0.35, 0.05], C.paper, 0, 0.95, 0.2); }),
  seal: (c = C.white) => g((o) => { cyl(o, 0.35, 0.35, 0.12, c, 0, 1.0, 0, 10, c).rotation.x = Math.PI / 2; box(o, [0.12, 1.0, 0.12], C.wood, 0, 0.5, -0.1); }),
  big_rock: () => g((o) => { const r = sphere(o, 4.5, C.stoneDark, 0, 2.5, 0); r.scale.set(1.2, 0.9, 1); for (let i = 0; i < 5; i++) { const a = (i / 5) * Math.PI * 2; cyl(o, 0.35, 0.35, 0.1, ['#f4f1e6', '#3d78c4', '#2a2530', '#c8402f', '#3f8b4a'][i], Math.cos(a) * 2.5, 5.4, Math.sin(a) * 2.5 + 2.5, 10); } }),
  fire_pit: () => g((o) => { for (let i = 0; i < 7; i++) { const a = (i / 7) * Math.PI * 2; sphere(o, 0.25, C.stone, Math.cos(a) * 0.8, 0.15, Math.sin(a) * 0.8); } box(o, [1, 0.15, 0.15], C.brown, 0, 0.2, 0).rotation.y = 0.6; box(o, [1, 0.15, 0.15], C.brown, 0, 0.25, 0).rotation.y = -0.6; }),
  hollow: () => g((o) => { cyl(o, 0.9, 1.1, 4, C.brown, 0, 2, 0); sphere(o, 0.35, C.black, 0, 2.2, 0.85); cone(o, 2.4, 4, C.darkGreen, 0, 5.4, 0); }),
  stove: () => g((o) => { box(o, [1.6, 1, 1.2], C.stone, 0, 0.5, 0); cyl(o, 0.55, 0.45, 0.6, C.coal, 0, 1.3, 0, 10); box(o, [0.5, 0.3, 0.05], C.orange, 0, 0.45, 0.62, C.orange); }),
  pot_stove: () => OBJECTS.stove(),
  mill: () => g((o) => { box(o, [3, 4, 3], C.wood, 0, 2, 0); cone(o, 2.4, 1.8, C.brown, 0, 4.9, 0, 4); for (let i = 0; i < 4; i++) { const b = box(o, [0.3, 3.4, 0.08], C.paper, 0, 4, 1.6); b.rotation.z = (i * Math.PI) / 2; } }),
  sack: (c = C.paper) => g((o) => { sphere(o, 0.4, c, 0, 0.35, 0).scale.set(1, 1.1, 1); cyl(o, 0.12, 0.2, 0.2, c, 0, 0.8, 0); }),
  meat: () => g((o) => { box(o, [1.2, 0.8, 0.8], C.wood, 0, 0.4, 0); sphere(o, 0.3, '#b24a4a', 0, 1.0, 0); }),
  onion: () => g((o) => { for (let i = 0; i < 3; i++) { sphere(o, 0.22, '#c98bd0', i * 0.5 - 0.5, 0.2, 0); cone(o, 0.06, 0.5, C.green, i * 0.5 - 0.5, 0.6, 0, 4); } }),
  bush: (c = C.green) => g((o) => { sphere(o, 0.8, c, 0, 0.7, 0); sphere(o, 0.6, c, 0.6, 0.5, 0.2); sphere(o, 0.5, c, -0.5, 0.5, -0.2); }),
  shard: () => g((o) => { const s = cone(o, 0.3, 1.0, C.ice, 0, 0.6, 0, 4, '#7fd6ff'); s.rotation.z = 0.2; }),
  ice_door: () => g((o) => { box(o, [5, 6, 1], C.ice, 0, 3, 0, '#5fc8ff'); box(o, [2, 3.5, 1.2], '#2a5c80', 0, 1.75, 0); }),
  chest: () => g((o) => { box(o, [0.9, 0.6, 0.6], C.wood, 0, 0.3, 0); box(o, [0.95, 0.1, 0.65], C.darkRed, 0, 0.62, 0); box(o, [0.2, 0.2, 0.05], C.gold, 0, 0.45, 0.32); }),
  tent: (c = '#f4efe2') => g((o) => { const t = cone(o, 3, 3.4, c, 0, 1.7, 0, 8); t.castShadow = true; box(o, [0.9, 1.4, 0.1], C.brown, 0, 0.7, 2.6); }),
  camel: () => makeCamel(),
  pillar: () => g((o) => { cyl(o, 0.45, 0.55, 3, C.sand, 0, 1.5, 0, 6); box(o, [1.2, 0.3, 1.2], C.sand, 0, 3.1, 0); }),
  stone_disc: (c = C.stone) => g((o) => { cyl(o, 0.6, 0.7, 0.4, c, 0, 0.2, 0, 7); }),
  vortex: () => g((o) => { for (let i = 0; i < 5; i++) cone(o, 0.9 - i * 0.12, 1.4, C.lava, Math.sin(i) * 0.3, 0.7 + i * 0.9, Math.cos(i) * 0.3, 6, '#ff5a1a'); }),
  palace: () => g((o) => { box(o, [12, 5, 8], '#4a1f1f', 0, 2.5, 0); for (const x of [-5, 5]) cyl(o, 0.6, 0.6, 7, C.darkRed, x, 3.5, 4.3); box(o, [14, 0.8, 10], C.black, 0, 5.4, 0); cone(o, 9, 3, '#2e1414', 0, 7.2, 0, 4).rotation.y = Math.PI / 4; }),
  hot_stones: () => g((o) => { for (let i = 0; i < 6; i++) sphere(o, 0.45, '#5a3a32', Math.cos(i) * 1.1, 0.35, Math.sin(i) * 1.1, i % 2 ? '#ff5a1a' : undefined); }),
  oil_jar: () => g((o) => { cyl(o, 0.3, 0.4, 0.8, '#8a5a2a', 0, 0.4, 0, 8); cyl(o, 0.15, 0.2, 0.2, '#8a5a2a', 0, 0.9, 0, 8); }),
  lantern_altar: () => g((o) => { box(o, [4, 0.5, 1.4], C.stoneDark, 0, 0.25, 0); for (let i = 0; i < 4; i++) { box(o, [0.12, 1.4, 0.12], C.coal, -1.5 + i, 1.2, 0); box(o, [0.5, 0.6, 0.5], '#5c3a5a', -1.5 + i, 2.1, 0); } }),
  lotus: () => g((o) => { cyl(o, 0.3, 0.2, 0.6, C.stone, 0, 0.3, 0); for (let i = 0; i < 6; i++) { const p = cone(o, 0.18, 0.5, '#2a1f33', Math.cos(i) * 0.15, 0.85, Math.sin(i) * 0.15, 4, '#5a2a7a'); p.rotation.z = Math.cos(i) * 0.5; } }),
  cave_exit: () => g((o) => { box(o, [4, 4, 0.6], '#d8d0b0', 0, 2, 0, '#ffefb0'); }),
  stall: (c = C.red) => g((o) => { box(o, [3, 1, 1.6], C.wood, 0, 0.5, 0); for (const x of [-1.4, 1.4]) box(o, [0.12, 2.6, 0.12], C.wood, x, 1.3, 0.7); box(o, [3.4, 0.15, 2], c, 0, 2.6, 0.2); sphere(o, 0.25, '#ffcc66', 1.2, 2.2, 1, '#ffaa33'); }),
  lantern: (c = '#ff7a3a') => g((o) => { box(o, [0.08, 2.4, 0.08], C.coal, 0, 1.2, 0); sphere(o, 0.32, c, 0, 2.6, 0, c); }),
  tower: () => g((o) => { box(o, [3, 9, 3], '#7a4a3a', 0, 4.5, 0); cone(o, 2.8, 2.4, C.darkRed, 0, 10.2, 0, 4).rotation.y = Math.PI / 4; }),
  tower_lantern: () => g((o) => { sphere(o, 0.6, '#4a3a2a', 0, 0.6, 0); }),
  kite_tree: () => g((o) => { cyl(o, 0.3, 0.45, 4, C.brown, 0, 2, 0); sphere(o, 2.2, C.green, 0, 5, 0); const k = box(o, [0.9, 1.1, 0.05], '#e8443a', 0.8, 4.3, 1.6); k.rotation.z = 0.785; }),
  gate_big: () => g((o) => { for (const x of [-4, 4]) box(o, [1, 8, 1], C.darkRed, x, 4, 0); box(o, [11, 1, 1.6], C.darkRed, 0, 8.4, 0); box(o, [12.4, 0.5, 2], C.coal, 0, 9.1, 0); }),
  workbench: () => g((o) => { box(o, [2.2, 0.15, 1], C.wood, 0, 1, 0); for (const [x, z] of [[-1, -0.4], [1, -0.4], [-1, 0.4], [1, 0.4]]) box(o, [0.12, 1, 0.12], C.brown, x, 0.5, z); box(o, [0.4, 0.3, 0.25], C.black, 0, 1.25, 0); }),
  trail: () => g((o) => { box(o, [0.15, 1.5, 0.15], C.wood, 0, 0.75, 0); box(o, [1.2, 0.5, 0.08], C.paper, 0, 1.3, 0.08); for (let i = 0; i < 6; i++) sphere(o, 0.2, C.stone, Math.cos(i) * 1.4, 0.1, 1 + Math.sin(i) * 0.6); }),
  viewpoint: () => g((o) => { cyl(o, 1.6, 1.8, 0.4, C.stone, 0, 0.2, 0, 10); for (const a of [0, 2.1, 4.2]) { const l = cyl(o, 0.04, 0.04, 1.6, C.coal, Math.cos(a) * 0.3, 1.0, Math.sin(a) * 0.3); l.rotation.z = Math.cos(a) * 0.25; l.rotation.x = Math.sin(a) * 0.25; } box(o, [0.4, 0.28, 0.2], C.black, 0, 1.85, 0); }),
  waterfall: () => g((o) => { const w = new THREE.Mesh(cachedGeo('wf', () => new THREE.PlaneGeometry(4, 16)), mat('#cfefff', { transparent: true, opacity: 0.7, emissive: '#9fdfff', emissiveIntensity: 0.3 })); w.position.y = 8; o.add(w); }),
  checkpoint: () => g((o) => { box(o, [0.15, 1.4, 0.15], C.wood, 0, 0.7, 0); box(o, [0.6, 0.4, 0.05], C.red, 0.3, 1.25, 0); }),
  pagoda: () => g((o) => { for (let i = 0; i < 4; i++) { box(o, [5 - i, 2, 5 - i], '#7a3a2a', 0, 1 + i * 2.6, 0); cone(o, (6 - i) * 0.75, 1.2, C.coal, 0, 2.4 + i * 2.6, 0, 4).rotation.y = Math.PI / 4; } }),
  bridge: () => g((o) => { box(o, [2.4, 0.2, 8], C.wood, 0, 0.3, 0); }),
  ice_bridge: () => g((o) => { box(o, [2.6, 0.25, 8], C.ice, 0, 0.3, 0, '#8fdcff'); }),
  cloud: () => g((o) => { for (let i = 0; i < 5; i++) sphere(o, 0.8, C.white, Math.cos(i) * 0.9, 0, Math.sin(i) * 0.6); }),
  marker: (c = C.gold) => g((o) => { cone(o, 0.4, 0.8, c, 0, 0.4, 0, 4, c); }),
  mushroom: (c = '#7fe0c0') => g((o) => { cyl(o, 0.1, 0.12, 0.6, C.paper, 0, 0.3, 0); sphere(o, 0.35, c, 0, 0.65, 0, c).scale.set(1, 0.5, 1); }),
  /** Сегмент тороса ~12 м вдоль X. Для стенок Байкала. */
  ice_wall: () => g((o) => {
    cone(o, 1.15, 5.0, C.ice, -4.4, 2.4, 0.15, 5, '#9fe8ff');
    cone(o, 1.4, 6.1, C.ice, -1.5, 2.9, -0.2, 5, '#d8f6ff');
    cone(o, 1.25, 5.4, C.ice, 1.5, 2.6, 0.25, 5, '#bfe8f5');
    cone(o, 1.0, 4.3, C.ice, 4.4, 2.05, 0, 5, '#8fd4f0');
    box(o, [12, 1.5, 2.6], C.ice, 0, 0.75, 0, '#c8f2ff');
  }),
};

export function hasObject(key: string): boolean {
  return key in OBJECTS;
}

/** Модель по ключу; неизвестный ключ — заметная заглушка (не ломает игру). */
export function makeObject(key: string, color?: string): THREE.Object3D {
  const k = key.replace(/^models\//, '').replace(/\.glb$/, '');
  if (OBJECTS[k]) return OBJECTS[k](color);
  if (hasRig(k)) return makeRig(k).root;
  return g((o) => { box(o, [1, 1, 1], color ?? C.purple, 0, 0.5, 0); });
}

/* ---------------- Геометрии для инстансинга ---------------- */

function colored(geo: THREE.BufferGeometry, color: string, ty = 0, sx = 1, sy = 1, sz = 1, tx = 0, tz = 0): THREE.BufferGeometry {
  const gg = geo.toNonIndexed();
  gg.scale(sx, sy, sz);
  gg.translate(tx, ty, tz);
  const c = new THREE.Color(color);
  const n = gg.getAttribute('position').count;
  const arr = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) arr.set([c.r, c.g, c.b], i * 3);
  gg.setAttribute('color', new THREE.BufferAttribute(arr, 3));
  gg.deleteAttribute('uv');
  return gg;
}

const SCATTER: Record<string, (color?: string) => THREE.BufferGeometry> = {
  tree_spruce: (c) => mergeGeometries([
    colored(new THREE.CylinderGeometry(0.18, 0.26, 1.2, 6), '#6b4a33', 0.6),
    colored(new THREE.ConeGeometry(1.6, 2.6, 7), c ?? '#2f6b55', 2.3),
    colored(new THREE.ConeGeometry(1.2, 2.2, 7), c ?? '#357a60', 3.6),
    colored(new THREE.ConeGeometry(0.8, 1.8, 7), c ?? '#3b8468', 4.8),
    colored(new THREE.ConeGeometry(0.55, 0.5, 7), '#eef6fa', 5.6),
  ])!,
  tree_pine: (c) => mergeGeometries([
    colored(new THREE.CylinderGeometry(0.15, 0.25, 4, 6), '#7a5236', 2),
    colored(new THREE.IcosahedronGeometry(1.6, 0), c ?? '#3f7a4a', 4.6, 1.2, 0.7, 1.2),
  ])!,
  tree_round: (c) => mergeGeometries([
    colored(new THREE.CylinderGeometry(0.2, 0.3, 2.4, 6), '#6b4a33', 1.2),
    colored(new THREE.IcosahedronGeometry(1.7, 0), c ?? '#4f8a3e', 3.4),
  ])!,
  rock: (c) => colored(new THREE.DodecahedronGeometry(1, 0), c ?? '#8295a4', 0.5, 1.2, 0.8, 1),
  boulder: (c) => colored(new THREE.DodecahedronGeometry(2.4, 0), c ?? '#6e7f8c', 1.2, 1.2, 0.9, 1),
  bush: (c) => colored(new THREE.IcosahedronGeometry(0.8, 0), c ?? '#4b7d45', 0.5, 1.2, 0.8, 1.2),
  grass: (c) => colored(new THREE.ConeGeometry(0.25, 0.8, 4), c ?? '#c9b45a', 0.4),
  dune_grass: (c) => colored(new THREE.ConeGeometry(0.3, 0.9, 4), c ?? '#c8a85a', 0.45),
  snow_mound: (c) => colored(new THREE.IcosahedronGeometry(1, 0), c ?? '#e9f5fa', 0.1, 1.5, 0.4, 1.5),
  ice_ridge: (c) => colored(new THREE.TetrahedronGeometry(1.6, 0), c ?? '#bfe8f5', 0.8, 1, 1.4, 1),
  basalt: (c) => colored(new THREE.CylinderGeometry(0.8, 1, 3, 6), c ?? '#2b2326', 1.5),
  stalagmite: (c) => colored(new THREE.ConeGeometry(0.7, 3.2, 6), c ?? '#4a3d55', 1.6),
  mushroom: (c) => mergeGeometries([
    colored(new THREE.CylinderGeometry(0.1, 0.12, 0.6, 5), '#efe6d0', 0.3),
    colored(new THREE.IcosahedronGeometry(0.35, 0), c ?? '#7fe0c0', 0.65, 1, 0.5, 1),
  ])!,
  bamboo: (c) => colored(new THREE.CylinderGeometry(0.08, 0.1, 5, 5), c ?? '#7aa84a', 2.5),
  karst: (c) => colored(new THREE.CylinderGeometry(2.5, 5, 40, 7), c ?? '#9aa49a', 20),
  web: (c) => colored(new THREE.PlaneGeometry(2.4, 2.4), c ?? '#e6e0ff', 2),
};

export function scatterGeometry(asset: string, color?: string): THREE.BufferGeometry {
  const k = asset.replace(/^models\//, '').replace(/\.glb$/, '');
  return cachedGeo(`scatter:${k}:${color ?? ''}`, () => (SCATTER[k] ?? SCATTER.rock)(color));
}

export function hasScatter(asset: string): boolean {
  return asset.replace(/^models\//, '').replace(/\.glb$/, '') in SCATTER;
}

export const scatterMaterial = (() => {
  let m: THREE.MeshStandardMaterial | null = null;
  return () => {
    if (!m) {
      m = new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.9, side: THREE.DoubleSide });
      m.userData.shared = true;
    }
    return m;
  };
})();
