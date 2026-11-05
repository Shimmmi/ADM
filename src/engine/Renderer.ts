/** Рендерер, пресеты качества и адаптивный DPR (TECH §13, §15). */
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';

export type QualityLevel = 'low' | 'med' | 'high';

const VignetteShader = {
  uniforms: { tDiffuse: { value: null }, strength: { value: 0.35 } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
  fragmentShader: `uniform sampler2D tDiffuse; uniform float strength; varying vec2 vUv;
    void main(){ vec4 c = texture2D(tDiffuse, vUv); float d = distance(vUv, vec2(0.5)); c.rgb *= 1.0 - strength * smoothstep(0.35, 0.85, d); gl_FragColor = c; }`,
};

export class Renderer {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene = new THREE.Scene();
  readonly camera: THREE.PerspectiveCamera;
  private composer: EffectComposer;
  private bloom: UnrealBloomPass;
  private vignette: ShaderPass;
  level: QualityLevel = 'med';
  reduceFx = false;
  dpr = 1;
  private dprMax = 1.5;
  private lowTimer = 0;
  private highTimer = 0;
  fps = 60;
  private fpsAcc = 0;
  private fpsFrames = 0;
  onQualityChange: ((l: QualityLevel) => void) | null = null;

  constructor(container: HTMLElement) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance', preserveDrawingBuffer: false });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.25;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.append(this.renderer.domElement);
    this.camera = new THREE.PerspectiveCamera(52, innerWidth / innerHeight, 0.2, 1200);
    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    this.bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.45, 0.6, 0.85);
    this.composer.addPass(this.bloom);
    this.vignette = new ShaderPass(VignetteShader);
    this.composer.addPass(this.vignette);
    this.composer.addPass(new OutputPass());
    addEventListener('resize', () => this.resize());
    this.resize();
  }

  get canvas(): HTMLCanvasElement {
    return this.renderer.domElement;
  }

  resize(): void {
    this.camera.aspect = innerWidth / innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setPixelRatio(this.dpr);
    this.renderer.setSize(innerWidth, innerHeight);
    this.composer.setPixelRatio(this.dpr);
    this.composer.setSize(innerWidth, innerHeight);
  }

  setQuality(level: QualityLevel, reduceFx: boolean): void {
    this.level = level;
    this.reduceFx = reduceFx;
    this.dprMax = level === 'low' ? 1 : level === 'med' ? 1.5 : 2;
    this.dpr = Math.min(devicePixelRatio || 1, this.dprMax);
    this.renderer.shadowMap.enabled = level !== 'low';
    this.bloom.enabled = level !== 'low' && !reduceFx;
    this.vignette.enabled = level !== 'low';
    this.resize();
    this.onQualityChange?.(level);
  }

  /** Адаптивный DPR: вниз при FPS < 40 дольше 2 с, вверх при FPS > 58 дольше 2 с. */
  private adapt(dt: number): void {
    this.fpsAcc += dt;
    this.fpsFrames++;
    if (this.fpsAcc >= 0.5) {
      this.fps = this.fpsFrames / this.fpsAcc;
      this.fpsAcc = 0;
      this.fpsFrames = 0;
    }
    if (this.fps < 40) {
      this.lowTimer += dt;
      this.highTimer = 0;
    } else if (this.fps > 58) {
      this.highTimer += dt;
      this.lowTimer = 0;
    } else {
      this.lowTimer = this.highTimer = 0;
    }
    if (this.lowTimer > 2 && this.dpr > 1) {
      this.dpr = Math.max(1, this.dpr - 0.25);
      this.lowTimer = 0;
      this.resize();
    } else if (this.highTimer > 2 && this.dpr < Math.min(devicePixelRatio || 1, this.dprMax)) {
      this.dpr = Math.min(this.dprMax, this.dpr + 0.25);
      this.highTimer = 0;
      this.resize();
    }
  }

  render(dt: number): void {
    this.adapt(dt);
    if (this.bloom.enabled || this.vignette.enabled) this.composer.render(dt);
    else this.renderer.render(this.scene, this.camera);
  }

  /** Короткий тест 2 с: средний FPS на текущей сцене → пресет. */
  static pickAuto(fps: number): QualityLevel {
    if (fps >= 55) return 'high';
    if (fps >= 40) return 'med';
    return 'low';
  }
}
