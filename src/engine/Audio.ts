/**
 * Процедурный звук на WebAudio (docs/AUDIT.md §7): эмбиент зоны, тихая музыка, SFX.
 * Включается после первого жеста; кроссфейд 2 с между зонами.
 */
type Recipe = { noise?: { type: BiquadFilterType; freq: number; q: number; gain: number; lfo?: number }[]; drone?: { freq: number; gain: number; type?: OscillatorType }[]; crackle?: number; drip?: number };

const AMBIENTS: Record<string, Recipe> = {
  workshop: { noise: [{ type: 'lowpass', freq: 500, q: 0.5, gain: 0.05, lfo: 0.08 }], crackle: 0.5 },
  taiga: { noise: [{ type: 'bandpass', freq: 700, q: 0.6, gain: 0.07, lfo: 0.1 }], drone: [{ freq: 110, gain: 0.015 }] },
  pass: { noise: [{ type: 'bandpass', freq: 1100, q: 0.4, gain: 0.12, lfo: 0.2 }, { type: 'lowpass', freq: 200, q: 0.5, gain: 0.05 }] },
  baikal: { noise: [{ type: 'lowpass', freq: 300, q: 0.7, gain: 0.05, lfo: 0.05 }], drone: [{ freq: 73.4, gain: 0.03 }, { freq: 110, gain: 0.015 }] },
  tea_road: { noise: [{ type: 'bandpass', freq: 1500, q: 0.5, gain: 0.08, lfo: 0.15 }] },
  flame: { noise: [{ type: 'lowpass', freq: 160, q: 0.9, gain: 0.12, lfo: 0.3 }], crackle: 1.2, drone: [{ freq: 55, gain: 0.03, type: 'sawtooth' }] },
  cave: { noise: [{ type: 'lowpass', freq: 240, q: 0.5, gain: 0.03 }], drone: [{ freq: 65.4, gain: 0.035 }], drip: 0.6 },
  market: { noise: [{ type: 'bandpass', freq: 900, q: 0.3, gain: 0.05, lfo: 0.4 }], drone: [{ freq: 196, gain: 0.008 }] },
  foothills: { noise: [{ type: 'bandpass', freq: 2400, q: 0.6, gain: 0.03, lfo: 0.1 }, { type: 'lowpass', freq: 400, q: 0.4, gain: 0.04 }], drone: [{ freq: 146.8, gain: 0.012 }] },
};

const SCALES: Record<string, number[]> = {
  workshop: [261.6, 293.7, 329.6, 392, 440],
  taiga: [220, 246.9, 293.7, 329.6, 392],
  pass: [196, 220, 261.6, 293.7, 329.6],
  baikal: [174.6, 220, 261.6, 293.7, 349.2],
  tea_road: [220, 261.6, 293.7, 329.6, 392],
  flame: [146.8, 174.6, 196, 220, 261.6],
  cave: [130.8, 155.6, 174.6, 196, 233.1],
  market: [261.6, 293.7, 349.2, 392, 466.2],
  foothills: [220, 261.6, 293.7, 329.6, 392, 440],
};

export class AudioEngine {
  ctx: AudioContext | null = null;
  private master!: GainNode;
  private sfxBus!: GainNode;
  private musicBus!: GainNode;
  private ambBus!: GainNode;
  private noiseBuf!: AudioBuffer;
  private current: { gain: GainNode; stop: () => void } | null = null;
  private musicTimer = 0;
  private musicScale: number[] = SCALES.taiga;
  private zoneKey = 'taiga';
  enabled = false;
  musicVol = 0.6;
  sfxVol = 0.8;

  async start(): Promise<void> {
    if (!this.ctx) {
      const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!Ctx) return;
      this.ctx = new Ctx();
      this.master = this.ctx.createGain();
      this.master.connect(this.ctx.destination);
      this.sfxBus = this.ctx.createGain();
      this.musicBus = this.ctx.createGain();
      this.ambBus = this.ctx.createGain();
      for (const b of [this.sfxBus, this.musicBus, this.ambBus]) b.connect(this.master);
      const len = this.ctx.sampleRate * 2;
      this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const d = this.noiseBuf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    }
    await this.ctx.resume();
    this.enabled = true;
    this.applyVolumes();
    this.setZone(this.zoneKey);
  }

  async stop(): Promise<void> {
    this.enabled = false;
    if (this.ctx) await this.ctx.suspend();
  }

  applyVolumes(): void {
    if (!this.ctx) return;
    this.sfxBus.gain.value = this.sfxVol;
    this.musicBus.gain.value = this.musicVol * 0.5;
    this.ambBus.gain.value = this.musicVol;
  }

  /** Приглушение музыки и эмбиента под диалог/окно подарка. */
  duck(on: boolean): void {
    if (!this.ctx) return;
    const k = on ? 0.35 : 1;
    this.musicBus.gain.setTargetAtTime(this.musicVol * 0.5 * k, this.ctx.currentTime, 0.3);
    this.ambBus.gain.setTargetAtTime(this.musicVol * k, this.ctx.currentTime, 0.3);
  }

  /** Короткий тон в шину SFX (маяки, мини-игры). */
  ping(freq: number, gain: number, dur = 0.35, type: OscillatorType = 'triangle'): void {
    if (!this.ctx || !this.enabled) return;
    this.tone(this.sfxBus, freq, dur, gain, type);
  }

  /** Полная тишина при скрытой вкладке. */
  mute(on: boolean): void {
    if (!this.ctx) return;
    this.master.gain.setTargetAtTime(on ? 0 : 1, this.ctx.currentTime, 0.1);
  }

  setZone(key: string): void {
    this.zoneKey = key;
    this.musicScale = SCALES[key] ?? SCALES.taiga;
    if (!this.ctx || !this.enabled) return;
    const ctx = this.ctx;
    const old = this.current;
    if (old) {
      old.gain.gain.setTargetAtTime(0, ctx.currentTime, 0.6);
      setTimeout(() => old.stop(), 2200);
    }
    const r = AMBIENTS[key] ?? AMBIENTS.taiga;
    const gain = ctx.createGain();
    gain.gain.value = 0;
    gain.gain.setTargetAtTime(1, ctx.currentTime, 0.6);
    gain.connect(this.ambBus);
    const nodes: AudioScheduledSourceNode[] = [];
    const timers: number[] = [];
    for (const n of r.noise ?? []) {
      const src = ctx.createBufferSource();
      src.buffer = this.noiseBuf;
      src.loop = true;
      const f = ctx.createBiquadFilter();
      f.type = n.type;
      f.frequency.value = n.freq;
      f.Q.value = n.q;
      const g = ctx.createGain();
      g.gain.value = n.gain;
      src.connect(f).connect(g).connect(gain);
      if (n.lfo) {
        const lfo = ctx.createOscillator();
        const lg = ctx.createGain();
        lfo.frequency.value = n.lfo;
        lg.gain.value = n.gain * 0.7;
        lfo.connect(lg).connect(g.gain);
        lfo.start();
        nodes.push(lfo);
      }
      src.start();
      nodes.push(src);
    }
    for (const d of r.drone ?? []) {
      const o = ctx.createOscillator();
      o.type = d.type ?? 'sine';
      o.frequency.value = d.freq;
      const g = ctx.createGain();
      g.gain.value = d.gain;
      const f = ctx.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = 600;
      o.connect(f).connect(g).connect(gain);
      o.start();
      nodes.push(o);
    }
    if (r.crackle) timers.push(window.setInterval(() => Math.random() < r.crackle! * 0.3 && this.click(gain, 2000 + Math.random() * 3000, 0.04), 120));
    if (r.drip) timers.push(window.setInterval(() => Math.random() < r.drip! * 0.25 && this.blip(gain, 900 + Math.random() * 600, 0.05, 0.15), 400));
    this.current = {
      gain,
      stop: () => {
        for (const n of nodes) try { n.stop(); } catch { /* уже остановлен */ }
        for (const t of timers) clearInterval(t);
        gain.disconnect();
      },
    };
  }

  /** Тихая генеративная мелодия; вызывается из цикла. */
  update(dt: number): void {
    if (!this.ctx || !this.enabled) return;
    this.musicTimer -= dt;
    if (this.musicTimer > 0) return;
    this.musicTimer = 0.9 + Math.random() * 1.6;
    if (Math.random() < 0.35) return;
    const f = this.musicScale[Math.floor(Math.random() * this.musicScale.length)];
    this.tone(this.musicBus, f * (Math.random() < 0.3 ? 2 : 1), 1.6, 0.04, 'triangle');
  }

  private click(dest: AudioNode, freq: number, gain: number): void {
    this.tone(dest, freq, 0.03, gain, 'square');
  }

  private blip(dest: AudioNode, freq: number, gain: number, dur: number): void {
    this.tone(dest, freq, dur, gain, 'sine', freq * 0.6);
  }

  tone(dest: AudioNode, freq: number, dur: number, gain: number, type: OscillatorType = 'sine', slideTo?: number, delay = 0): void {
    if (!this.ctx) return;
    const t = this.ctx.currentTime + delay;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(gain, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(dest);
    o.start(t);
    o.stop(t + dur + 0.05);
  }

  private noiseBurst(dur: number, freq: number, gain: number, delay = 0): void {
    if (!this.ctx) return;
    const t = this.ctx.currentTime + delay;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    const f = this.ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.value = freq;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f).connect(g).connect(this.sfxBus);
    src.start(t);
    src.stop(t + dur + 0.05);
  }

  sfx(id: string): void {
    if (!this.ctx || !this.enabled) return;
    const b = this.sfxBus;
    switch (id) {
      case 'pickup': this.tone(b, 660, 0.15, 0.15, 'triangle'); this.tone(b, 990, 0.2, 0.12, 'triangle', undefined, 0.08); break;
      case 'stamp': this.noiseBurst(0.18, 180, 0.6); this.tone(b, 90, 0.25, 0.3, 'sine', 50); break;
      case 'success': [523, 659, 784, 1046].forEach((f, i) => this.tone(b, f, 0.35, 0.12, 'triangle', undefined, i * 0.09)); break;
      case 'error': this.tone(b, 220, 0.25, 0.12, 'square', 160); break;
      case 'click': this.tone(b, 1200, 0.04, 0.06, 'square'); break;
      case 'crunch': this.noiseBurst(0.12, 2500, 0.35); this.noiseBurst(0.1, 1600, 0.25, 0.06); break;
      case 'whoosh': this.noiseBurst(0.5, 800, 0.25); break;
      case 'freeze': this.tone(b, 1800, 0.5, 0.08, 'sine', 600); this.noiseBurst(0.4, 4000, 0.15); break;
      case 'melt': this.tone(b, 400, 0.6, 0.1, 'sine', 900); break;
      case 'shutter': this.noiseBurst(0.06, 3000, 0.5); this.noiseBurst(0.05, 2000, 0.4, 0.09); break;
      case 'sniff': this.noiseBurst(0.15, 1200, 0.2); this.noiseBurst(0.15, 1200, 0.2, 0.2); break;
      case 'neigh': this.tone(b, 700, 0.6, 0.08, 'sawtooth', 300); break;
      case 'note_short': this.tone(b, 660, 0.18, 0.15, 'sine'); break;
      case 'note_long': this.tone(b, 440, 0.6, 0.15, 'sine'); break;
      case 'type': this.tone(b, 1600 + Math.random() * 400, 0.02, 0.02, 'square'); break;
      default: this.tone(b, 880, 0.1, 0.08, 'sine');
    }
  }
}
