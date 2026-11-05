/** Спутники (TECH §7): пружинное следование, смещение по бокам, телепорт при отставании > 25 м. */
import * as THREE from 'three';
import type { Zone } from '../world/Zone';
import { animateRig, makeRig, type Rig } from '../world/Models';

const RIG_OF: Record<string, string> = { 'СУНЬ': 'sun', 'БАЦЗЕ': 'bazje', 'ША': 'sha', 'БАЙЛУН': 'bailun' };
const SLOTS: [number, number][] = [[-1.8, -2.2], [1.8, -2.4], [0, -3.6], [-2.6, -4.2]];

interface Mate {
  id: string;
  rig: Rig;
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  facing: number;
}

export class Companions {
  readonly group = new THREE.Group();
  private mates: Mate[] = [];

  sync(ids: string[], zone: Zone, player: THREE.Vector3): void {
    const want = ids.filter((id) => RIG_OF[id] && id !== 'БАЙЛУН');
    if (want.join() === this.mates.map((m) => m.id).join()) return;
    this.clear();
    want.forEach((id, i) => {
      const rig = makeRig(RIG_OF[id]);
      rig.root.traverse((o) => { if ((o as THREE.Mesh).isMesh) o.castShadow = true; });
      const pos = new THREE.Vector3(player.x + SLOTS[i][0], 0, player.z + SLOTS[i][1]);
      pos.y = zone.h(pos.x, pos.z);
      rig.root.position.copy(pos);
      this.group.add(rig.root);
      this.mates.push({ id, rig, pos, vel: new THREE.Vector3(), facing: 0 });
    });
  }

  has(id: string): boolean {
    return this.mates.some((m) => m.id === id);
  }

  positionOf(id: string): THREE.Vector3 | null {
    return this.mates.find((m) => m.id === id)?.pos ?? null;
  }

  teleportAll(zone: Zone, player: THREE.Vector3): void {
    this.mates.forEach((m, i) => {
      m.pos.set(player.x + SLOTS[i][0], 0, player.z + SLOTS[i][1]);
      m.pos.y = zone.h(m.pos.x, m.pos.z);
      m.vel.set(0, 0, 0);
    });
  }

  update(dt: number, t: number, zone: Zone, player: THREE.Vector3, facing: number, lookAt: THREE.Vector3 | null): void {
    const s = Math.sin(facing), c = Math.cos(facing);
    this.mates.forEach((m, i) => {
      const [ox, oz] = SLOTS[i];
      const tx = player.x + ox * c + oz * s, tz = player.z - ox * s + oz * c;
      const dx = tx - m.pos.x, dz = tz - m.pos.z;
      const dist = Math.hypot(dx, dz);
      if (Math.hypot(player.x - m.pos.x, player.z - m.pos.z) > 25) {
        m.pos.set(tx, zone.h(tx, tz), tz);
        m.vel.set(0, 0, 0);
      } else if (dist > 0.6) {
        const sp = Math.min(8, dist * 2.2);
        m.vel.x += ((dx / dist) * sp - m.vel.x) * Math.min(1, dt * 6);
        m.vel.z += ((dz / dist) * sp - m.vel.z) * Math.min(1, dt * 6);
      } else {
        m.vel.multiplyScalar(Math.max(0, 1 - dt * 8));
      }
      const p = { x: m.pos.x + m.vel.x * dt, z: m.pos.z + m.vel.z * dt };
      zone.colliders.resolve(p, 0.4);
      const speed = Math.hypot(p.x - m.pos.x, p.z - m.pos.z) / Math.max(dt, 1e-4);
      m.pos.x = p.x;
      m.pos.z = p.z;
      m.pos.y = zone.h(m.pos.x, m.pos.z);
      let want = speed > 0.3 ? Math.atan2(m.vel.x, m.vel.z) : m.facing;
      if (lookAt) want = Math.atan2(lookAt.x - m.pos.x, lookAt.z - m.pos.z);
      let d = want - m.facing;
      d = Math.atan2(Math.sin(d), Math.cos(d));
      m.facing += d * Math.min(1, dt * 6);
      m.rig.root.position.copy(m.pos);
      m.rig.root.rotation.y = m.facing;
      animateRig(m.rig, t + i, speed);
    });
  }

  clear(): void {
    for (const m of this.mates) this.group.remove(m.rig.root);
    this.mates = [];
  }
}
