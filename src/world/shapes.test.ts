import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { inShape } from './shapes';
import { CollisionService } from './Colliders';

describe('rotY совпадает с three.js', () => {
  const rotY = 0.7;
  // Длинная ось бокса (x, 10 м) после поворота three.js
  const tip = new THREE.Vector3(4.5, 0, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), rotY);

  it('inShape', () => {
    const s = { shape: 'box' as const, pos: [0, 0] as [number, number], size: [10, 1] as [number, number], rotY };
    expect(inShape(s, tip.x, tip.z)).toBe(true);
    expect(inShape(s, -tip.z, tip.x)).toBe(false);
  });

  it('CollisionService.addBox', () => {
    const c = new CollisionService();
    c.addBox('b', 0, 0, 10, 1, rotY);
    const p = { x: tip.x, z: tip.z };
    expect(c.resolve(p, 0.1)).toBe(true);
    const q = { x: -tip.z, z: tip.x };
    expect(c.resolve(q, 0.1)).toBe(false);
  });
});
