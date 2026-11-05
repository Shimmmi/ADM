/** Игрок (TECH §7): ходьба/бег, склоны, поверхности, коллизии. */
import * as THREE from 'three';
import { CONFIG } from '../app/config';
import type { Input } from '../engine/Input';
import type { Zone } from '../world/Zone';
import { animateRig, makeSanta, type Rig } from '../world/Models';
import { clamp } from '../world/rng';

const SPEED_MUL: Record<string, number> = { snow: 0.9, sand: 0.8, ice: 1.0, thin_ice: 1, stone: 1, grass: 1, wood: 1, lava: 1, water: 0.7, sandriver: 0.6 };

export class Player {
  readonly rig: Rig;
  readonly pos = new THREE.Vector3();
  readonly vel = new THREE.Vector3();
  facing = 0;
  speed = 0;
  locked = false;
  surface = 'snow';
  onHazard = false;
  private tmp = { x: 0, z: 0 };
  private grad = { x: 0, z: 0 };
  private dir = new THREE.Vector3();

  constructor() {
    this.rig = makeSanta();
    this.rig.root.traverse((o) => { if ((o as THREE.Mesh).isMesh) o.castShadow = true; });
  }

  place(zone: Zone, x: number, z: number): void {
    this.pos.set(x, zone.h(x, z), z);
    this.vel.set(0, 0, 0);
    this.rig.root.position.copy(this.pos);
  }

  update(dt: number, t: number, input: Input, camYaw: number, zone: Zone): void {
    const ax = this.locked ? { x: 0, z: 0, run: false } : input.axis();
    const surf = zone.surfaceAt(this.pos.x, this.pos.z, t);
    this.surface = surf.type;
    this.onHazard = surf.hazard;
    const max = (ax.run ? CONFIG.player.run : CONFIG.player.walk) * (SPEED_MUL[surf.type] ?? 1);
    // Направление относительно камеры: W — от камеры вперёд.
    const fx = -Math.sin(camYaw), fz = -Math.cos(camYaw);
    const rx = -fz, rz = fx;
    this.dir.set(fx * ax.z + rx * ax.x, 0, fz * ax.z + rz * ax.x);
    if (this.dir.lengthSq() > 1) this.dir.normalize();
    const accel = surf.type === 'ice' ? 3 : 14;
    this.vel.x += (this.dir.x * max - this.vel.x) * Math.min(1, accel * dt);
    this.vel.z += (this.dir.z * max - this.vel.z) * Math.min(1, accel * dt);

    // Склон круче slopeMax: не пускаем вверх, мягко сползаем вниз.
    const g = zone.terrain.gradient(this.pos.x, this.pos.z, this.grad);
    const slope = (Math.atan(Math.hypot(g.x, g.z)) * 180) / Math.PI;
    if (slope > zone.terrain.slopeMax) {
      const gl = Math.hypot(g.x, g.z) || 1;
      const ux = g.x / gl, uz = g.z / gl;
      const up = this.vel.x * ux + this.vel.z * uz;
      if (up > 0) {
        this.vel.x -= ux * up;
        this.vel.z -= uz * up;
      }
      this.vel.x -= ux * 3 * dt * 10;
      this.vel.z -= uz * 3 * dt * 10;
    }

    const p = this.tmp;
    p.x = this.pos.x + this.vel.x * dt;
    p.z = this.pos.z + this.vel.z * dt;
    zone.colliders.resolve(p, CONFIG.player.radius);
    p.x = clamp(p.x, 2, zone.terrain.w - 2);
    p.z = clamp(p.z, 2, zone.terrain.d - 2);
    this.speed = Math.hypot(p.x - this.pos.x, p.z - this.pos.z) / Math.max(dt, 1e-4);
    this.pos.x = p.x;
    this.pos.z = p.z;
    const gy = zone.h(p.x, p.z);
    this.pos.y += (gy - this.pos.y) * Math.min(1, dt * 18);

    if (this.dir.lengthSq() > 0.01) {
      const target = Math.atan2(this.dir.x, this.dir.z);
      let d = target - this.facing;
      d = Math.atan2(Math.sin(d), Math.cos(d));
      this.facing += d * Math.min(1, dt * 10);
    }
    this.rig.root.position.copy(this.pos);
    this.rig.root.rotation.y = this.facing;
    animateRig(this.rig, t, this.speed);
  }
}
