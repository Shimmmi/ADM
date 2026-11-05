/** Камера от третьего лица (TECH §7): орбита мышью, зум, демпфирование, не уходит под рельеф. */
import * as THREE from 'three';
import { CONFIG } from '../app/config';
import type { Zone } from '../world/Zone';
import { clamp } from '../world/rng';

const DEG = Math.PI / 180;

export class CameraRig {
  yaw = 0;
  pitch = 24 * DEG;
  dist = 8.5;
  private desiredDist = 8.5;
  readonly target = new THREE.Vector3();
  private want = new THREE.Vector3();
  private look = new THREE.Vector3();
  /** Точка, к которой камера приближается в диалоге (или null). */
  focus: THREE.Vector3 | null = null;
  /** Камерой управляет мини-игра (фото-режим): рига не трогает камеру и мышь. */
  manual = false;

  constructor(readonly camera: THREE.PerspectiveCamera) {}

  input(dx: number, dy: number, wheel: number): void {
    this.yaw -= dx * 0.005;
    this.pitch = clamp(this.pitch + dy * 0.004, CONFIG.camera.pitchMin * DEG, CONFIG.camera.pitchMax * DEG);
    if (wheel) this.desiredDist = clamp(this.desiredDist + wheel * 0.6, CONFIG.camera.distMin, CONFIG.camera.distMax);
  }

  snap(target: THREE.Vector3, zone: Zone): void {
    this.target.copy(target);
    this.update(1, target, zone, true);
  }

  update(dt: number, player: THREE.Vector3, zone: Zone, instant = false): void {
    const goal = this.want.copy(player);
    goal.y += 1.5;
    let dist = this.desiredDist;
    if (this.focus) {
      goal.lerp(this.focus, 0.4);
      dist *= 0.7;
    }
    const k = instant ? 1 : 1 - Math.exp(-dt * 8);
    this.target.lerp(goal, k);
    this.dist += (dist - this.dist) * (instant ? 1 : 1 - Math.exp(-dt * 4));

    // Укорачиваем рычаг, если между целью и камерой рельеф.
    let d = this.dist;
    const cp = Math.cos(this.pitch), sp = Math.sin(this.pitch);
    const sy = Math.sin(this.yaw), cy = Math.cos(this.yaw);
    for (let s = 1; s <= 8; s++) {
      const f = (s / 8) * this.dist;
      const x = this.target.x + sy * cp * f, z = this.target.z + cy * cp * f, y = this.target.y + sp * f;
      if (y < zone.h(x, z) + 0.6) {
        d = Math.max(2.2, f - 0.8);
        break;
      }
    }
    const cam = this.camera.position;
    cam.set(this.target.x + sy * cp * d, this.target.y + sp * d, this.target.z + cy * cp * d);
    const ground = zone.h(cam.x, cam.z) + 0.8;
    if (cam.y < ground) cam.y = ground;
    // Взгляд чуть выше головы: виден горизонт, а не только снег под ногами.
    this.look.copy(this.target);
    this.look.y += 0.9 + (1 - this.pitch / (CONFIG.camera.pitchMax * DEG)) * 0.6;
    this.camera.lookAt(this.look);
  }
}
