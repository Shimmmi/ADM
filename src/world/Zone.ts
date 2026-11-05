import * as THREE from 'three';
import type { InteractableDef, NpcDef, ScatterDef, Shape, SurfaceDef, SurfaceType, ZoneDef } from '../content/schema';
import { TerrainService, buildTerrainMesh } from './Terrain';
import { CollisionService } from './Colliders';
import { makeObject, makeRig, mat, scatterGeometry, scatterMaterial, type Rig } from './Models';
import { rng } from './rng';
import { distToPolyline, inShape } from './shapes';

export interface InteractableRt {
  def: InteractableDef;
  obj: THREE.Object3D;
  pos: THREE.Vector3;
  visible: boolean;
  glow: THREE.Mesh;
}

export interface NpcRt {
  def: NpcDef;
  rig: Rig;
  pos: THREE.Vector3;
  baseRot: number;
  visible: boolean;
}

const SURFACE_COLORS: Partial<Record<SurfaceType, [string, string?]>> = {
  lava: ['#ff5a1a', '#ff3a00'],
  water: ['#3c7fa8'],
  sandriver: ['#c99a55', '#5a3a10'],
  ice: ['#bfe8f5'],
  thin_ice: ['#9fd6ee'],
  wood: ['#9a704e'],
};

export const HAZARDS: SurfaceType[] = ['lava', 'water', 'sandriver'];

export class Zone {
  readonly group = new THREE.Group();
  readonly terrain: TerrainService;
  readonly colliders = new CollisionService();
  readonly interactables = new Map<string, InteractableRt>();
  readonly npcs = new Map<string, NpcRt>();
  readonly surfaces: SurfaceDef[];
  /** id опасной поверхности → время (сек), до которого она заморожена. */
  readonly frozen = new Map<string, number>();
  /** Поверхности, перекрытые мостом Ша Сэна. */
  readonly bridged = new Set<string>();
  readonly surfaceMeshes = new Map<string, THREE.Mesh>();
  readonly abilityMarkers = new Map<string, THREE.Object3D>();
  private animated: { obj: THREE.Object3D; base: number; phase: number }[] = [];

  constructor(readonly def: ZoneDef) {
    this.terrain = new TerrainService(def);
    this.surfaces = def.surfaces ?? [];
    this.group.name = def.id;
  }

  h(x: number, z: number): number {
    return this.terrain.getHeightAt(x, z);
  }

  /** Поэтапная сборка — между этапами экран загрузки обновляет прогресс. */
  async build(progress: (p: number) => void, isVisible: (d: InteractableDef | NpcDef) => boolean): Promise<void> {
    const z = this.def;
    const tick = async (p: number) => {
      progress(p);
      await new Promise((r) => setTimeout(r, 0));
    };
    const terrainMat = new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.95 });
    this.group.add(buildTerrainMesh(this.terrain, z, {
      ground: new THREE.Color(z.atmosphere.ground),
      alt: new THREE.Color(z.atmosphere.groundAlt ?? '#7f8c96'),
      path: new THREE.Color('#b9a58a'),
    }, terrainMat));
    await tick(0.3);

    for (const s of this.surfaces) this.addSurface(s);
    for (const p of z.props) {
      const o = makeObject(p.asset, p.color);
      o.position.set(p.pos[0], this.h(p.pos[0], p.pos[2]) + p.pos[1], p.pos[2]);
      o.rotation.y = p.rotY ?? 0;
      o.scale.setScalar(p.scale ?? 1);
      this.group.add(o);
      if (p.collider?.type === 'circle') this.colliders.addCircle(p.id, p.pos[0], p.pos[2], p.collider.r * (p.scale ?? 1));
      if (p.collider?.type === 'box') this.colliders.addBox(p.id, p.pos[0], p.pos[2], p.collider.size[0] * (p.scale ?? 1), p.collider.size[1] * (p.scale ?? 1), p.rotY ?? 0);
    }
    await tick(0.45);

    for (const i of z.interactables) this.addInteractable(i, isVisible(i));
    for (const n of z.npcs) this.addNpc(n, isVisible(n));
    for (const a of z.abilityPoints) {
      const m = makeObject(a.type === 'cloud_spot' ? 'cloud' : 'marker', a.type === 'cloud_spot' ? undefined : '#8fd0ff');
      m.position.set(a.pos[0], this.h(a.pos[0], a.pos[2]) + (a.type === 'cloud_spot' ? 0.6 : 0.2), a.pos[2]);
      m.scale.setScalar(a.type === 'cloud_spot' ? 0.6 : 0.8);
      this.group.add(m);
      this.abilityMarkers.set(a.id, m);
      this.animated.push({ obj: m, base: m.position.y, phase: a.pos[0] });
    }
    await tick(0.6);

    z.scatter.forEach((s, k) => this.addScatter(s, k));
    await tick(0.95);
  }

  private shapeMesh(s: Shape, color: string, emissive: string | undefined, lift: number): THREE.Mesh {
    const step = 2;
    let w: number, d: number;
    if (s.shape === 'circle') w = d = s.r * 2;
    else [w, d] = s.size;
    const nx = Math.max(2, Math.ceil(w / step)), nz = Math.max(2, Math.ceil(d / step));
    const geo = new THREE.PlaneGeometry(w, d, nx, nz);
    geo.rotateX(-Math.PI / 2);
    if (s.shape === 'box' && s.rotY) geo.rotateY(s.rotY);
    const pos = geo.getAttribute('position') as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i) + s.pos[0], zz = pos.getZ(i) + s.pos[1];
      pos.setY(i, this.h(x, zz) + lift);
    }
    pos.needsUpdate = true;
    geo.computeVertexNormals();
    if (s.shape === 'circle') {
      // обрезаем углы: вершины вне круга опускаем под рельеф
      for (let i = 0; i < pos.count; i++) if (Math.hypot(pos.getX(i), pos.getZ(i)) > s.r) pos.setY(i, pos.getY(i) - 1.5);
    }
    const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color, emissive: emissive ?? '#000000', emissiveIntensity: emissive ? 0.9 : 0, flatShading: true, roughness: 0.4, transparent: true, opacity: 0.92 }));
    m.position.set(s.pos[0], 0, s.pos[1]);
    m.receiveShadow = true;
    return m;
  }

  private addSurface(s: SurfaceDef): void {
    const c = SURFACE_COLORS[s.type];
    if (!c) return;
    const lift = s.type === 'lava' || s.type === 'water' || s.type === 'sandriver' ? 0.12 : 0.05;
    const m = this.shapeMesh(s, c[0], c[1], lift);
    this.group.add(m);
    if (s.id) this.surfaceMeshes.set(s.id, m);
  }

  private addInteractable(def: InteractableDef, visible: boolean): void {
    const obj = makeObject(def.model ?? 'marker', def.color);
    const y = this.h(def.pos[0], def.pos[2]) + def.pos[1];
    obj.position.set(def.pos[0], y, def.pos[2]);
    obj.rotation.y = def.rotY ?? 0;
    obj.scale.setScalar(def.scale ?? 1);
    obj.userData.interactable = def.id;
    const glow = new THREE.Mesh(new THREE.RingGeometry(def.radius * 0.55, def.radius * 0.62, 24), mat('#ffd987', { emissive: '#ffd987', emissiveIntensity: 1, transparent: true, opacity: 0.6 }));
    glow.rotation.x = -Math.PI / 2;
    glow.position.set(def.pos[0], y + 0.08, def.pos[2]);
    glow.visible = false;
    this.group.add(obj, glow);
    const rt: InteractableRt = { def, obj, pos: new THREE.Vector3(def.pos[0], y, def.pos[2]), visible, glow };
    this.interactables.set(def.id, rt);
    if (def.solid) this.colliders.addCircle(def.id, def.pos[0], def.pos[2], def.solid);
    this.setInteractableVisible(def.id, visible);
    if (def.kind === 'pickup') this.animated.push({ obj, base: y, phase: def.pos[0] + def.pos[2] });
  }

  setInteractableVisible(id: string, v: boolean): void {
    const rt = this.interactables.get(id);
    if (!rt) return;
    rt.visible = v;
    rt.obj.visible = v;
    if (!v) rt.glow.visible = false;
    if (rt.def.solid) this.colliders.setEnabled(id, v);
  }

  private addNpc(def: NpcDef, visible: boolean): void {
    const rig = makeRig(def.model.replace(/^models\//, '').replace(/\.glb$/, ''));
    const y = this.h(def.pos[0], def.pos[2]) + def.pos[1];
    rig.root.position.set(def.pos[0], y, def.pos[2]);
    rig.root.rotation.y = def.rotY ?? 0;
    rig.root.traverse((o) => { if ((o as THREE.Mesh).isMesh) o.castShadow = true; });
    this.group.add(rig.root);
    this.npcs.set(def.id, { def, rig, pos: rig.root.position.clone(), baseRot: def.rotY ?? 0, visible });
    rig.root.visible = visible;
    this.colliders.addCircle(def.id, def.pos[0], def.pos[2], def.model.includes('dragon') ? 2.5 : 0.7);
    this.colliders.setEnabled(def.id, visible);
  }

  setNpcVisible(id: string, v: boolean): void {
    const n = this.npcs.get(id);
    if (!n) return;
    n.visible = v;
    n.rig.root.visible = v;
    this.colliders.setEnabled(id, v);
  }

  private avoidHit(x: number, z: number, names: string[] | undefined): boolean {
    if (!names) return false;
    for (const pattern of names) {
      const re = new RegExp(`^${pattern.replace(/\*/g, '.*')}$`);
      for (const a of this.def.areas ?? []) if (re.test(a.name) && inShape(a, x, z, 1)) return true;
      for (const p of this.def.paths ?? []) if (re.test(p.name) && distToPolyline(x, z, p.points) < p.width + 1.5) return true;
    }
    return false;
  }

  private addScatter(s: ScatterDef, k: number): void {
    const r = rng(s.seed);
    const [x0, z0, x1, z1] = s.bounds ?? [4, 4, this.def.size[0] - 4, this.def.size[1] - 4];
    const keep: [number, number, number, number][] = [];
    const cell = Math.max(1, s.minDist);
    const grid = new Map<string, [number, number][]>();
    const keyOf = (x: number, z: number) => `${Math.floor(x / cell)},${Math.floor(z / cell)}`;
    const blockers: [number, number, number][] = [
      ...this.def.interactables.map((i) => [i.pos[0], i.pos[2], 3.5] as [number, number, number]),
      ...this.def.npcs.map((n) => [n.pos[0], n.pos[2], 4] as [number, number, number]),
      ...this.def.checkpoints.map((c) => [c.pos[0], c.pos[2], c.radius + 1] as [number, number, number]),
      ...this.def.abilityPoints.flatMap((a) => [[a.pos[0], a.pos[2], 4], [a.to[0], a.to[2], 4]] as [number, number, number][]),
      [this.def.spawns.default[0], this.def.spawns.default[2], 6],
    ];
    for (let tries = 0; tries < s.count * 4 && keep.length < s.count; tries++) {
      const x = x0 + r() * (x1 - x0), z = z0 + r() * (z1 - z0);
      if (this.avoidHit(x, z, s.avoid)) continue;
      if (this.surfaces.some((sf) => inShape(sf, x, z, 1.5))) continue;
      if (blockers.some(([bx, bz, br]) => Math.hypot(x - bx, z - bz) < br)) continue;
      const gi = Math.floor(x / cell), gj = Math.floor(z / cell);
      let close = false;
      for (let a = -1; a <= 1 && !close; a++) for (let b = -1; b <= 1 && !close; b++) {
        for (const [px, pz] of grid.get(`${gi + a},${gj + b}`) ?? []) if (Math.hypot(px - x, pz - z) < s.minDist) { close = true; break; }
      }
      if (close) continue;
      const key = keyOf(x, z);
      (grid.get(key) ?? grid.set(key, []).get(key)!).push([x, z]);
      keep.push([x, z, s.scaleRange[0] + r() * (s.scaleRange[1] - s.scaleRange[0]), r() * Math.PI * 2]);
    }
    // Тайлы 4×4 — чтобы frustum culling отбрасывал невидимые части леса.
    const tiles = 4;
    const tw = this.def.size[0] / tiles, td = this.def.size[1] / tiles;
    const buckets: [number, number, number, number][][] = Array.from({ length: tiles * tiles }, () => []);
    for (const p of keep) buckets[Math.min(tiles - 1, Math.floor(p[1] / td)) * tiles + Math.min(tiles - 1, Math.floor(p[0] / tw))].push(p);
    const geo = scatterGeometry(s.asset, s.color);
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3(), v = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
    buckets.forEach((list, ti) => {
      if (!list.length) return;
      const im = new THREE.InstancedMesh(geo, scatterMaterial(), list.length);
      im.castShadow = s.asset.includes('tree') || s.asset.includes('karst') || s.asset.includes('basalt') || s.asset.includes('stalag');
      im.receiveShadow = true;
      list.forEach(([x, z, scale, rot], i) => {
        q.setFromAxisAngle(up, rot);
        sc.setScalar(scale);
        v.set(x, this.h(x, z) - 0.1, z);
        m4.compose(v, q, sc);
        im.setMatrixAt(i, m4);
        if (s.collider) this.colliders.addCircle(`scatter${k}_${ti}_${i}`, x, z, s.collider * scale);
      });
      im.computeBoundingSphere();
      im.name = `scatter:${s.asset}`;
      this.group.add(im);
    });
  }

  surfaceAt(x: number, z: number, now: number): { type: SurfaceType; id?: string; hazard: boolean } {
    let found: SurfaceDef | null = null;
    for (const s of this.surfaces) if (inShape(s, x, z)) found = s;
    if (!found) return { type: 'snow', hazard: false };
    const frozen = found.id ? (this.frozen.get(found.id) ?? 0) > now : false;
    const bridged = found.id ? this.bridged.has(found.id) : false;
    const hazard = HAZARDS.includes(found.type) && !frozen && !bridged;
    return { type: frozen ? 'ice' : bridged ? 'wood' : found.type, id: found.id, hazard };
  }

  freeze(id: string, until: number): void {
    this.frozen.set(id, until);
    const m = this.surfaceMeshes.get(id);
    if (m) {
      const mm = m.material as THREE.MeshStandardMaterial;
      mm.color.set('#bfe8f5');
      mm.emissive.set('#5fc8ff');
      mm.emissiveIntensity = 0.3;
    }
  }

  update(dt: number, t: number): void {
    for (const a of this.animated) {
      a.obj.position.y = a.base + 0.15 + Math.sin(t * 2 + a.phase) * 0.12;
      a.obj.rotation.y += dt * 0.6;
    }
    for (const [id, until] of this.frozen) {
      if (until > t) continue;
      this.frozen.delete(id);
      const m = this.surfaceMeshes.get(id);
      const s = this.surfaces.find((x) => x.id === id);
      const c = s ? SURFACE_COLORS[s.type] : null;
      if (m && c) {
        const mm = m.material as THREE.MeshStandardMaterial;
        mm.color.set(c[0]);
        mm.emissive.set(c[1] ?? '#000000');
        mm.emissiveIntensity = c[1] ? 0.9 : 0;
      }
    }
    for (const n of this.npcs.values()) {
      if (!n.visible) continue;
      n.rig.body.position.y = Math.sin(t * 1.6 + n.pos.x) * 0.03;
    }
  }

  dispose(): void {
    this.group.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.geometry && !m.geometry.userData.shared) m.geometry.dispose();
      const mats = Array.isArray(m.material) ? m.material : m.material ? [m.material] : [];
      for (const mm of mats) if (!mm.userData.shared) mm.dispose();
    });
    this.group.removeFromParent();
    this.colliders.clear();
    this.interactables.clear();
    this.npcs.clear();
  }
}
