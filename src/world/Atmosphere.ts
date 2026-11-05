import * as THREE from 'three';
import type { AtmosphereDef } from '../content/schema';

const skyVert = `varying vec3 vPos; void main(){ vPos = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`;
const skyFrag = `uniform vec3 top; uniform vec3 bottom; varying vec3 vPos;
void main(){ float h = clamp(vPos.y * 1.4 + 0.15, 0.0, 1.0); gl_FragColor = vec4(mix(bottom, top, h), 1.0); }`;

export class Atmosphere {
  readonly group = new THREE.Group();
  readonly sun: THREE.DirectionalLight;
  readonly hemi: THREE.HemisphereLight;
  private sky: THREE.Mesh;
  private skyMat: THREE.ShaderMaterial;
  private sunDir = new THREE.Vector3();
  def: AtmosphereDef | null = null;

  constructor(private scene: THREE.Scene) {
    this.skyMat = new THREE.ShaderMaterial({
      uniforms: { top: { value: new THREE.Color() }, bottom: { value: new THREE.Color() } },
      vertexShader: skyVert,
      fragmentShader: skyFrag,
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
    });
    this.sky = new THREE.Mesh(new THREE.SphereGeometry(900, 24, 12), this.skyMat);
    this.sky.renderOrder = -1;
    this.sky.frustumCulled = false;
    this.hemi = new THREE.HemisphereLight(0xffffff, 0x444444, 1);
    this.sun = new THREE.DirectionalLight(0xffffff, 2);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    const sc = this.sun.shadow.camera;
    sc.left = -40; sc.right = 40; sc.top = 40; sc.bottom = -40; sc.near = 1; sc.far = 220;
    this.sun.shadow.normalBias = 0.05;
    this.group.add(this.sky, this.hemi, this.sun, this.sun.target);
    scene.add(this.group);
    scene.fog = new THREE.Fog(0xffffff, 40, 260);
  }

  apply(def: AtmosphereDef): void {
    this.def = def;
    (this.skyMat.uniforms.top.value as THREE.Color).set(def.skyTop);
    (this.skyMat.uniforms.bottom.value as THREE.Color).set(def.skyBottom);
    const fog = this.scene.fog as THREE.Fog;
    fog.color.set(def.fog.color);
    fog.near = def.fog.near;
    fog.far = def.fog.far;
    this.scene.background = new THREE.Color(def.fog.color);
    this.sun.color.set(def.sun.color);
    this.sun.intensity = def.sun.intensity * 1.5;
    this.sunDir.set(...def.sun.dir).normalize();
    this.hemi.color.set(def.hemi.sky);
    this.hemi.groundColor.set(def.hemi.ground);
    this.hemi.intensity = def.hemi.intensity * 1.7;
    // Темнота (пещера): туман смыкается на радиусе фонаря, за игроком — тёплый свет.
    const dark = def.darkness ?? 0;
    const night = (def.time ?? 0.5) >= 0.75;
    this.lantern.visible = dark > 0 || night;
    if (dark > 0) {
      fog.near = dark * 0.35;
      fog.far = dark * 2.2;
      this.lantern.distance = dark * 2.4;
      this.lantern.intensity = 24;
    } else if (night) {
      this.lantern.distance = 16;
      this.lantern.intensity = 12;
    }
  }

  private lantern = (() => {
    const l = new THREE.PointLight('#ffcf8a', 0, 20, 1.6);
    l.visible = false;
    this.group.add(l);
    return l;
  })();

  setShadows(on: boolean, size = 2048): void {
    this.sun.castShadow = on;
    if (this.sun.shadow.mapSize.x !== size) {
      this.sun.shadow.mapSize.set(size, size);
      this.sun.shadow.map?.dispose();
      this.sun.shadow.map = null as unknown as THREE.WebGLRenderTarget;
    }
  }

  private toCam = new THREE.Vector3();

  /** Тени и небо следуют за игроком; фонарь — между игроком и камерой, чтобы свет падал на лица. */
  follow(target: THREE.Vector3, camera?: THREE.Vector3): void {
    this.sky.position.copy(target);
    this.sun.target.position.copy(target);
    this.sun.position.copy(target).addScaledVector(this.sunDir, 90);
    this.lantern.position.set(target.x, target.y + 3.2, target.z);
    if (camera) {
      this.toCam.subVectors(camera, target).setY(0);
      if (this.toCam.lengthSq() > 1e-4) this.lantern.position.addScaledVector(this.toCam.normalize(), 2.6);
    }
  }
}
