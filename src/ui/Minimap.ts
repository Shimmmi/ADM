/** Миникарта (TECH §10): top-down рендер зоны в текстуру при загрузке + метки. */
import * as THREE from 'three';
import type { Zone } from '../world/Zone';

const SIZE = 320;

export class Minimap {
  private base: HTMLCanvasElement = document.createElement('canvas');
  private ctx: CanvasRenderingContext2D;
  private zone: Zone | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.ctx = canvas.getContext('2d')!;
    this.base.width = this.base.height = SIZE;
  }

  /** Снимок сверху; скрывает небо и частицы на время рендера. */
  capture(renderer: THREE.WebGLRenderer, scene: THREE.Scene, zone: Zone, hide: THREE.Object3D[]): void {
    this.zone = zone;
    const [w, d] = zone.def.size;
    const cam = new THREE.OrthographicCamera(-w / 2, w / 2, d / 2, -d / 2, 1, 2000);
    cam.position.set(w / 2, 900, d / 2);
    cam.up.set(0, 0, -1);
    cam.lookAt(w / 2, 0, d / 2);
    // Рендер прямо в канву (как снимок фото-режима) и копия в 2D: надёжнее readPixels из render target.
    const fog = scene.fog;
    const vis = hide.map((o) => o.visible);
    const size = new THREE.Vector2();
    renderer.getSize(size);
    const dpr = renderer.getPixelRatio();
    scene.fog = null;
    hide.forEach((o) => (o.visible = false));
    const light = new THREE.HemisphereLight('#ffffff', '#8a8a8a', 2.4);
    scene.add(light);
    renderer.setPixelRatio(1);
    renderer.setSize(SIZE, SIZE, false);
    renderer.render(scene, cam);
    this.base.getContext('2d')!.drawImage(renderer.domElement, 0, 0, SIZE, SIZE);
    light.removeFromParent();
    light.dispose();
    renderer.setPixelRatio(dpr);
    renderer.setSize(size.x, size.y, false);
    scene.fog = fog;
    hide.forEach((o, i) => (o.visible = vis[i]));
  }

  draw(player: THREE.Vector3, facing: number, mates: THREE.Vector3[], markers: THREE.Vector3[], t: number): void {
    const z = this.zone;
    if (!z) return;
    const c = this.ctx;
    const sx = SIZE / z.def.size[0], sz = SIZE / z.def.size[1];
    c.drawImage(this.base, 0, 0);
    for (const m of markers) {
      c.fillStyle = `rgba(255, 217, 135, ${0.55 + 0.45 * Math.sin(t * 4)})`;
      c.beginPath();
      c.arc(m.x * sx, m.z * sz, 7, 0, Math.PI * 2);
      c.fill();
    }
    c.fillStyle = '#8fe3a5';
    for (const m of mates) {
      c.beginPath();
      c.arc(m.x * sx, m.z * sz, 4, 0, Math.PI * 2);
      c.fill();
    }
    c.save();
    c.translate(player.x * sx, player.z * sz);
    c.rotate(-facing + Math.PI);
    c.fillStyle = '#ffd25a';
    c.strokeStyle = '#3b2a1a';
    c.lineWidth = 2;
    c.beginPath();
    c.moveTo(0, -10);
    c.lineTo(7, 8);
    c.lineTo(-7, 8);
    c.closePath();
    c.fill();
    c.stroke();
    c.restore();
  }
}
