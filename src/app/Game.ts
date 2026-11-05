/** Оркестратор: цикл, режиссёр, взаимодействия, триггеры, способности, сохранения, переходы. */
import * as THREE from 'three';
import { CONFIG } from './config';
import { Renderer, type QualityLevel } from '../engine/Renderer';
import { Input, type Action } from '../engine/Input';
import { EventBus } from '../engine/EventBus';
import { AudioEngine } from '../engine/Audio';
import { exportCode, importCode, storageAvailable, writeSave } from '../engine/saveStorage';
import { Quest, type DirectorPort } from '../gameplay/Quest';
import { freshState, type DirectorJob, type SaveV1, type Settings } from '../gameplay/GameState';
import { Player } from '../gameplay/Player';
import { CameraRig } from '../gameplay/CameraRig';
import { Companions } from '../gameplay/Companions';
import { ZoneManager } from '../world/ZoneManager';
import type { Zone, InteractableRt, NpcRt } from '../world/Zone';
import { Atmosphere } from '../world/Atmosphere';
import { Particles } from '../world/Particles';
import { makeObject, setBlobShadows } from '../world/Models';
import { inShape } from '../world/shapes';
import { CHAPTER_DEFS } from '../content/chapters';
import { ITEM_MAP } from '../content/items';
import { t } from '../content/ui';
import type { ChapterDef, DialogDef, GiftsData, InteractableDef, NpcDef, Vec3, AbilityPointDef } from '../content/schema';
import { HUD } from '../ui/HUD';
import { DialogBox } from '../ui/DialogBox';
import { Journal } from '../ui/Journal';
import { WorldMap } from '../ui/WorldMap';
import { Fade, LoadingScreen } from '../ui/Screens';
import { PauseMenu } from '../ui/PauseMenu';
import { Minimap } from '../ui/Minimap';
import { showGift } from '../ui/GiftReveal';
import { playSleigh } from '../ui/Sleigh';
import { kid } from '../ui/dom';
import { MINIGAMES } from '../minigames';
import type { MinigameCtx, MinigameResult } from '../minigames/types';
import { runFinale, developPhoto } from '../ui/Finale';

const NPC_COMPANION: Record<string, string> = { NPC_BAZJE: 'БАЦЗЕ', NPC_SHA: 'ША' };
const SNIFF_RADIUS = 25;
const SNIFF_TIME = 5;
const SNIFF_COOLDOWN = 20;
const FREEZE_TIME = 12;

export class Game implements DirectorPort {
  readonly r: Renderer;
  readonly scene: THREE.Scene;
  readonly input: Input;
  readonly bus = new EventBus();
  readonly audio = new AudioEngine();
  readonly quest: Quest;
  readonly zones: ZoneManager;
  zone!: Zone;
  readonly player = new Player();
  readonly cam: CameraRig;
  readonly companions = new Companions();
  readonly atmosphere: Atmosphere;
  readonly particles: Particles;
  readonly hud: HUD;
  readonly dialog: DialogBox;
  readonly journal: Journal;
  readonly worldMap: WorldMap;
  readonly loading: LoadingScreen;
  readonly fade: Fade;
  readonly pause: PauseMenu;
  readonly minimap: Minimap;
  private ui: HTMLElement;

  time = 0;
  private acc = 0;
  private last = 0;
  private queue: DirectorJob[] = [];
  private current: DirectorJob | null = null;
  private running = false;
  private transitioning = false;
  /** Только debug API: мини-игры засчитываются без запуска (сквозной e2e). */
  debugAutoMinigames = false;
  private worldMinigames = 0;
  private runningWorld = new Set<string>();
  private overlayMinigame = false;
  private dirty = false;
  private lastSave = 0;
  private inside = new Set<string>();
  private lastCheckpointId = '';
  private focused: { kind: 'obj'; rt: InteractableRt } | { kind: 'npc'; rt: NpcRt } | null = null;
  private sniffUntil = 0;
  private sniffReady = 0;
  private respawnAt = 0;
  heat = 0;
  private frameHooks = new Set<(dt: number, t: number) => void>();
  private bridges = new Map<string, THREE.Object3D>();
  private hop: { from: THREE.Vector3; to: THREE.Vector3; t: number; cloud: THREE.Object3D } | null = null;
  private autoQuality: { acc: number; frames: number } | null = null;
  debug = false;
  private resetting = false;

  constructor(public state: SaveV1, private gifts: GiftsData, dialogs: DialogDef[]) {
    const sceneEl = document.getElementById('scene')!;
    this.ui = document.getElementById('ui')!;
    this.r = new Renderer(sceneEl);
    this.scene = this.r.scene;
    this.input = new Input(this.r.canvas);
    this.quest = new Quest(state, this.bus, CHAPTER_DEFS, dialogs);
    this.quest.director = this;
    this.zones = new ZoneManager(this.scene);
    this.cam = new CameraRig(this.r.camera);
    this.atmosphere = new Atmosphere(this.scene);
    this.particles = new Particles(this.player.pos);
    this.scene.add(this.player.rig.root, this.companions.group, this.particles.group);

    this.hud = new HUD(this.ui, {
      onAmbient: () => this.toggleAmbient(),
      onRestart: () => { if (confirm(t('ui.restart.confirm'))) this.restart(); },
      onSlot: (i) => this.selectSlot(i),
      onMenu: () => this.pause.open(),
    });
    this.minimap = new Minimap(this.hud.minimap);
    this.dialog = new DialogBox(this.ui);
    this.dialog.onType = () => this.audio.sfx('type');
    this.journal = new Journal(this.ui);
    this.worldMap = new WorldMap(this.ui);
    this.pause = new PauseMenu(this.ui, {
      settings: () => this.state.settings,
      apply: (s) => this.applySettings(s),
      exportCode: () => { this.syncPos(); return exportCode(this.state); },
      importCode: async (code) => {
        const s = await importCode(code);
        if (!s) return false;
        this.replaceSave(s);
        return true;
      },
      restart: () => this.restart(),
      storageOk: storageAvailable(),
    });
    this.loading = new LoadingScreen(this.ui);
    this.fade = new Fade(this.ui);

    this.bindBus();
    this.bindInput();
    addEventListener('pagehide', () => this.save(true));
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) this.save(true);
      this.audio.mute(document.hidden);
      this.last = performance.now();
    });
  }

  /* ================= запуск ================= */

  async start(): Promise<void> {
    this.applySettings(this.state.settings, true);
    const pending = this.state.pending ?? [];
    this.state.pending = [];
    const resume = this.state.started && this.state.zone;
    this.state.started = true;
    await this.enterZone(this.state.zone || this.quest.chapter.zone, resume ? this.state.pos : null, 'load');
    this.enterChapter(this.quest.chapter);
    for (const j of pending) this.enqueue(j);
    this.refreshHud();
    this.last = performance.now();
    requestAnimationFrame((ts) => this.loop(ts));
    if (this.state.settings.quality === 'auto') this.autoQuality = { acc: 0, frames: 0 };
  }

  private enterChapter(ch: ChapterDef): void {
    const flag = `entered_${ch.id}`;
    if (this.state.flags[flag]) return;
    this.quest.apply({ type: 'setFlag', flag });
    this.quest.run(ch.onEnter);
    this.bus.emit('chapter:enter', { id: ch.id });
  }

  /* ================= зона ================= */

  private isVisible = (d: InteractableDef | NpcDef): boolean => {
    const s = this.state;
    if (d.hiddenUntil && !s.flags[d.hiddenUntil] && !s.objectives[d.hiddenUntil]) return false;
    if ('kind' in d) {
      if (d.kind === 'pickup' && s.flags[`used_${d.id}`]) return false;
      return !(d.hideWhen && s.flags[d.hideWhen]);
    }
    const mate = NPC_COMPANION[d.id];
    if (mate && s.companions.includes(mate)) return false;
    return this.quest.check(d.requires);
  };

  private refreshVisibility(): void {
    if (!this.zone) return;
    for (const rt of this.zone.interactables.values()) {
      const v = this.isVisible(rt.def);
      if (v !== rt.visible) this.zone.setInteractableVisible(rt.def.id, v);
    }
    for (const n of this.zone.npcs.values()) {
      const v = this.isVisible(n.def);
      if (v !== n.visible) this.zone.setNpcVisible(n.def.id, v);
    }
  }

  private async loadZone(id: string): Promise<Zone> {
    for (const b of this.bridges.values()) b.removeFromParent();
    this.bridges.clear();
    return this.zones.load(id, (p) => this.loading.progress(p), this.isVisible);
  }

  private placeInZone(zone: Zone, pos: Vec3 | null, fromPrev: boolean): void {
    this.zone = zone;
    const d = zone.def;
    const spawn = pos && (pos[0] || pos[2]) ? pos : fromPrev && d.spawns.fromPrev ? d.spawns.fromPrev : d.spawns.default;
    this.state.zone = d.id;
    this.player.place(zone, spawn[0], spawn[2]);
    if (!pos || !this.state.checkpoint) this.state.checkpoint = [spawn[0], 0, spawn[2]];
    this.inside.clear();
    for (const tr of d.triggers) if (this.inTrigger(tr, this.player.pos)) this.inside.add(tr.id);
    this.atmosphere.apply(d.atmosphere);
    this.atmosphere.setShadows(this.r.level !== 'low', this.r.level === 'high' ? 2048 : 1024);
    setBlobShadows(this.r.level === 'low');
    this.particles.set(d.atmosphere.particles, this.state.settings.reduceFx);
    this.audio.setZone(d.atmosphere.ambient);
    this.companions.clear();
    this.companions.sync(this.state.companions, zone, this.player.pos);
    for (const ap of d.abilityPoints) if (ap.type === 'bridge_spot' && this.state.flags[`bridge_${ap.id}`]) this.buildBridge(ap, false);
    this.cam.yaw = Math.atan2(this.player.pos.x - d.size[0] / 2, this.player.pos.z - d.size[1] / 2);
    this.cam.snap(this.player.pos, zone);
    this.minimap.capture(this.r.renderer, this.scene, zone, [this.particles.group, this.player.rig.root, this.companions.group, this.atmosphere.group]);
    this.heat = 0;
    this.zones.preload(d.transition.next);
  }

  private async enterZone(id: string, pos: Vec3 | null, mode: 'load' | 'walk_fade' | 'sleigh'): Promise<void> {
    this.transitioning = true;
    const from = this.zone?.def.id ?? id;
    if (mode === 'load') {
      this.loading.show(t('ui.start.title'));
      const z = await this.loadZone(id);
      this.placeInZone(z, pos, false);
      this.r.render(0.016);
      await this.loading.hide();
    } else if (mode === 'walk_fade') {
      await this.fade.to(true);
      this.loading.show(this.quest.chapter.title);
      const z = await this.loadZone(id);
      this.placeInZone(z, null, true);
      this.r.render(0.016);
      await this.loading.hide();
      await this.fade.to(false);
    } else {
      const done = this.doneZones();
      let zone: Zone | null = null;
      const ready = this.loadZone(id).then((z) => (zone = z));
      await playSleigh(this.ui, this.input, from, id, done, ready);
      await ready;
      this.placeInZone(zone!, null, true);
    }
    this.transitioning = false;
    this.refreshHud();
    this.save(true);
  }

  private doneZones(): string[] {
    return CHAPTER_DEFS.filter((c) => this.state.flags[`chapter_done_${c.id}`]).map((c) => c.zone);
  }

  /* ================= режиссёр ================= */

  enqueueDialog(id: string): void {
    this.enqueue({ k: 'dialog', id });
  }
  enqueueGift(id: string): void {
    this.enqueue({ k: 'gift', id });
  }
  enqueueMinigame(id: string): void {
    this.enqueue({ k: 'mg', id });
  }
  chapterComplete(): void {
    this.enqueue({ k: 'chapter', id: this.state.chapter });
  }
  teleport(pos: Vec3): void {
    this.enqueue({ k: 'teleport', pos });
  }

  enqueue(job: DirectorJob): void {
    this.queue.push(job);
    if (!this.running) void this.pump();
  }

  get busy(): boolean {
    return this.running || this.transitioning || this.overlayMinigame;
  }

  private async pump(): Promise<void> {
    this.running = true;
    while (this.queue.length) {
      const job = (this.current = this.queue.shift()!);
      try {
        await this.exec(job);
      } catch (e) {
        console.error(e);
      }
      this.current = null;
    }
    this.running = false;
    this.cam.focus = null;
    this.refreshHud();
  }

  private async exec(job: DirectorJob): Promise<void> {
    switch (job.k) {
      case 'dialog': return this.runDialog(job.id);
      case 'gift': return this.runGift(job.id);
      case 'mg': return this.runMinigame(job.id);
      case 'chapter': return this.runChapterComplete(job.id);
      case 'develop':
        await developPhoto(this.ui, (s) => this.audio.sfx(s));
        this.quest.emitEvent('PHOTO_DEVELOPED');
        return;
      case 'teleport':
        this.player.place(this.zone, job.pos[0], job.pos[2]);
        this.companions.teleportAll(this.zone, this.player.pos);
        this.cam.snap(this.player.pos, this.zone);
        return;
    }
  }

  private async runDialog(id: string): Promise<void> {
    const d = this.quest.dialogs.get(id);
    if (!d) return;
    this.audio.duck(true);
    const labels = new Map<string, number>();
    d.nodes.forEach((n, i) => { if (n.t === 'label') labels.set(n.name, i); });
    let skip = false;
    let i = 0;
    let steps = 0;
    while (i < d.nodes.length && steps++ < 2000) {
      const n = d.nodes[i++];
      switch (n.t) {
        case 'line': {
          if (skip) break;
          this.focusSpeaker(n.speaker, d.trigger);
          const res = await this.dialog.line(n.speaker, kid(n.text, CONFIG.recipient.address));
          if (res === 'skip') skip = true;
          break;
        }
        case 'choice': {
          skip = false;
          const idx = await this.dialog.choice(kid(n.prompt, CONFIG.recipient.address), n.options.map((o) => kid(o.text, CONFIG.recipient.address)));
          this.audio.sfx('click');
          i = labels.get(n.options[idx].label) ?? d.nodes.length;
          break;
        }
        case 'goto':
          i = labels.get(n.label) ?? d.nodes.length;
          break;
        case 'effect':
          this.quest.apply(n.effect);
          break;
        case 'next':
          this.enqueueDialog(n.id);
          break;
        case 'label':
          break;
      }
    }
    this.quest.markPlayed(id);
    this.dialog.close();
    this.audio.duck(false);
    this.cam.focus = null;
    this.refreshHud();
    this.dirty = true;
  }

  private focusSpeaker(speaker: string, trigger: string): void {
    const [kind, id] = trigger.split(':');
    let p: THREE.Vector3 | null = null;
    if (kind === 'npc') p = this.zone.npcs.get(id)?.pos ?? null;
    else if (kind === 'interact') p = this.focused?.kind === 'obj' ? this.focused.rt.pos : null;
    const mate = { 'СУНЬ': 'СУНЬ', 'БАЦЗЕ': 'БАЦЗЕ', 'ША': 'ША' }[speaker];
    if (mate) p = this.companions.positionOf(mate) ?? p;
    if (speaker === 'ДМ') p = null;
    if (p) this.cam.focus = p;
  }

  private async runGift(id: string): Promise<void> {
    const gift = this.gifts.gifts.find((g) => g.id === id);
    if (!gift) return;
    this.audio.duck(true);
    const res = await showGift(this.ui, gift, this.gifts.salt, this.state.giftsUnlocked.includes(id), (s) => this.audio.sfx(s));
    this.audio.duck(false);
    if (!this.state.giftsShown.includes(id)) this.state.giftsShown.push(id);
    if (res.unlocked && !this.state.giftsUnlocked.includes(id)) this.state.giftsUnlocked.push(id);
    this.save(true);
  }

  private mgCtx(): MinigameCtx {
    return {
      root: this.ui,
      input: this.input,
      quest: this.quest,
      zone: this.zone,
      player: this.player,
      cam: this.cam,
      companions: this.companions,
      renderer: this.r,
      scene: this.scene,
      sfx: (id) => this.audio.sfx(id),
      ping: (freq, gain, dur) => this.audio.ping(freq, gain, dur),
      toast: (text) => this.hud.toast(text),
      say: async (speaker, text) => {
        await this.dialog.line(speaker, kid(text, CONFIG.recipient.address));
        this.dialog.close();
      },
      now: () => this.time,
      onFrame: (fn) => { this.frameHooks.add(fn); return () => this.frameHooks.delete(fn); },
      respawn: (text) => this.respawn(text),
    };
  }

  private async runMinigame(id: string): Promise<void> {
    const factory = MINIGAMES[id];
    const rec = (this.state.minigames[id] ??= { done: false, attempts: 0 });
    rec.attempts++;
    const finish = (result: MinigameResult) => {
      if (result === 'cancelled') return;
      rec.done = true;
      if (result === 'skipped') this.hud.toast(t('ui.minigame.skipped'));
      this.quest.apply({ type: 'setFlag', flag: `mg_${id}_done` });
      this.quest.emitEvent(`${id}_DONE`);
      if (id === 'MG_PHOTO') this.enqueue({ k: 'develop' });
      this.save(true);
    };
    if (!factory) return finish('skipped');
    if (this.debugAutoMinigames) return finish('done');
    const mg = factory();
    if (mg.world) {
      if (this.runningWorld.has(id)) return;
      this.runningWorld.add(id);
      this.worldMinigames++;
      void mg.run(this.mgCtx()).then((r) => { this.worldMinigames--; this.runningWorld.delete(id); finish(r); });
      return;
    }
    this.overlayMinigame = true;
    try {
      finish(await mg.run(this.mgCtx()));
    } finally {
      this.overlayMinigame = false;
    }
  }

  private async runChapterComplete(id: string): Promise<void> {
    const ch = CHAPTER_DEFS.find((c) => c.id === id);
    if (!ch || this.state.flags[`chapter_done_${id}`]) return;
    this.quest.apply({ type: 'setFlag', flag: `chapter_done_${id}` });
    this.quest.run(ch.onComplete);
    this.bus.emit('chapter:complete', { id });
    this.state.trials = Math.max(0, (this.state.trials ?? CONFIG.trialsStart) - 10);
    const mode = this.zone.def.transition.mode;
    const next = CHAPTER_DEFS.find((c) => c.id === ch.next);
    if (!next || mode === 'final') {
      this.save(true);
      await runFinale(this.ui, this.state, this.input);
      return;
    }
    this.state.chapter = next.id;
    this.state.pos = [0, 0, 0];
    await this.enterZone(next.zone, null, mode === 'sleigh' ? 'sleigh' : 'walk_fade');
    this.enterChapter(next);
    this.hud.toast(next.title, 3500);
    this.save(true);
  }

  /* ================= ввод ================= */

  private bindInput(): void {
    this.input.onAction((a) => this.onAction(a));
  }

  private onAction(a: Action): boolean {
    if (this.pause.isOpen) return this.pause.handle(a);
    if (this.journal.isOpen) return this.journal.handle(a);
    if (this.worldMap.isOpen) return this.worldMap.handle(a);
    if (this.dialog.open) return this.dialog.handle(a);
    if (a === 'debug' && this.debug) {
      console.info(this.state);
      return true;
    }
    if (this.busy) return true;
    switch (a) {
      case 'escape': this.pause.open(); return true;
      case 'journal': this.openJournal(); return true;
      case 'map': this.worldMap.open(this.state.zone, this.doneZones()); return true;
      case 'slot1': case 'slot2': case 'slot3': case 'slot4':
        this.selectSlot(Number(a.slice(4)) - 1);
        return true;
      case 'interact': this.interact(); return true;
      case 'use': this.useItem(); return true;
      case 'ability': this.ability(); return true;
    }
    return false;
  }

  openJournal(tab?: 'goals' | 'bag' | 'camera' | 'charter'): void {
    const objectives = this.quest.chapter.objectives
      .filter((o) => !o.hidden && this.state.objectives[o.id])
      .map((o) => ({ id: o.id, text: o.text, state: this.state.objectives[o.id]!, counter: this.quest.counterValue(o.id) }));
    this.journal.open({ state: this.state, objectives, chapterTitle: this.quest.chapter.title }, tab);
  }

  private selectSlot(i: number): void {
    this.state.selectedSlot = i;
    this.audio.sfx('click');
    this.refreshHud();
  }

  get selectedTool(): string | null {
    return this.state.hotbar[this.state.selectedSlot ?? 0] ?? null;
  }

  private interact(): void {
    const f = this.focused;
    if (!f) return;
    if (f.kind === 'npc') {
      const d = this.quest.findDialog(f.rt.def.dialogTrigger || `npc:${f.rt.def.id}`);
      if (d) this.enqueueDialog(d.id);
      else this.hud.toast(`${f.rt.def.name}: ${BARKS[Math.floor(this.time) % BARKS.length]}`);
      return;
    }
    const def = f.rt.def;
    const trig = `interact:${def.trigger ?? def.id}`;
    if (def.requires && !this.quest.check(def.requires)) {
      const d = this.quest.findDialog(trig);
      if (d) this.enqueueDialog(d.id);
      else this.hud.toast(def.lockedText ?? t('ui.nopass'));
      this.audio.sfx('error');
      return;
    }
    const used = def.once && this.state.flags[`used_${def.id}`];
    if (!used) {
      this.quest.run(def.effects);
      if (def.once) this.quest.apply({ type: 'setFlag', flag: `used_${def.id}` });
      if (def.kind === 'pickup') {
        this.audio.sfx('pickup');
        this.zone.setInteractableVisible(def.id, false);
        this.focused = null;
      }
    }
    const d = this.quest.findDialog(trig);
    if (d) this.enqueueDialog(d.id);
    else if ((used || !def.effects.length) && def.idleText) this.hud.toast(def.idleText);
    this.dirty = true;
  }

  debugInteract(id: string, tool?: string): void {
    const rt = this.zone.interactables.get(id);
    const npc = this.zone.npcs.get(id);
    if (rt) this.focused = { kind: 'obj', rt };
    else if (npc) this.focused = { kind: 'npc', rt: npc };
    else return;
    if (tool) {
      const slot = this.state.hotbar.indexOf(tool);
      if (slot >= 0) this.state.selectedSlot = slot;
      this.useItem();
    } else this.interact();
  }

  private useItem(): void {
    const tool = this.selectedTool;
    if (!tool) return;
    const f = this.focused;
    if (f?.kind === 'obj') {
      const def = f.rt.def;
      const relevant = (def.useItem && def.useItem.item === tool) || (def.freezes && tool === 'ITM_STAFF');
      if (relevant && def.requires && !this.quest.check(def.requires)) {
        this.hud.toast(def.lockedText ?? t('ui.nopass'));
        this.audio.sfx('error');
        return;
      }
      if (def.freezes && tool === 'ITM_STAFF') {
        this.zone.freeze(def.freezes, this.time + FREEZE_TIME);
        this.audio.sfx('freeze');
        this.hud.toast('Посох: лёд на 12 секунд.');
      }
      if (def.useItem && def.useItem.item === tool) {
        this.quest.run(def.useItem.effects);
        this.audio.sfx('success');
        this.dirty = true;
        return;
      }
      if (def.freezes && tool === 'ITM_STAFF') return;
    }
    this.bus.emit('event', { name: `use:${tool}` });
    this.audio.sfx('whoosh');
  }

  /* ================= способности (T5.1) ================= */

  private nearAbility(): AbilityPointDef | null {
    const p = this.player.pos;
    for (const ap of this.zone.def.abilityPoints) {
      const owner = ap.type === 'cloud_spot' ? 'СУНЬ' : 'ША';
      if (!this.state.companions.includes(owner)) continue;
      if (ap.type === 'bridge_spot' && this.state.flags[`bridge_${ap.id}`]) continue;
      if (Math.hypot(p.x - ap.pos[0], p.z - ap.pos[2]) < 4) return ap;
      if (ap.type === 'cloud_spot' && Math.hypot(p.x - ap.to[0], p.z - ap.to[2]) < 4) return { ...ap, pos: ap.to, to: ap.pos };
    }
    return null;
  }

  debugAbility(): void {
    this.ability();
  }

  private ability(): void {
    const ap = this.nearAbility();
    if (ap?.type === 'cloud_spot') {
      const cloud = makeObject('cloud');
      cloud.position.copy(this.player.pos);
      this.scene.add(cloud);
      this.hop = { from: this.player.pos.clone(), to: new THREE.Vector3(ap.to[0], this.zone.h(ap.to[0], ap.to[2]), ap.to[2]), t: 0, cloud };
      this.player.locked = true;
      this.audio.sfx('whoosh');
      this.quest.emitEvent(`cloud:${ap.id}`);
      return;
    }
    if (ap?.type === 'bridge_spot') {
      this.buildBridge(ap, true);
      return;
    }
    if (this.state.companions.includes('БАЦЗЕ')) {
      if (this.time < this.sniffReady) {
        this.hud.toast(`Нюх Бацзе отдыхает: ещё ${Math.ceil(this.sniffReady - this.time)} с.`);
        return;
      }
      this.sniffUntil = this.time + SNIFF_TIME;
      this.sniffReady = this.time + SNIFF_COOLDOWN;
      this.audio.sfx('sniff');
      let found = 0;
      for (const rt of this.zone.interactables.values()) if (rt.visible && rt.pos.distanceTo(this.player.pos) < SNIFF_RADIUS && rt.def.hintable !== false) found++;
      this.hud.toast(found ? 'БАЦЗЕ: Чую! Вон там что-то вкусное… или полезное.' : 'БАЦЗЕ: Тут ничем не пахнет. Только снегом.');
      this.quest.emitEvent('sniff');
      return;
    }
    this.hud.toast(this.state.companions.length ? 'Здесь способности спутников не пригодятся.' : 'Спутников пока нет. Дед Мороз идёт один.');
  }

  private buildBridge(ap: AbilityPointDef, animate: boolean): void {
    const a = new THREE.Vector3(ap.pos[0], this.zone.h(ap.pos[0], ap.pos[2]), ap.pos[2]);
    const b = new THREE.Vector3(ap.to[0], this.zone.h(ap.to[0], ap.to[2]), ap.to[2]);
    const obj = makeObject('bridge');
    const len = a.distanceTo(b);
    obj.position.copy(a).lerp(b, 0.5);
    obj.position.y = Math.max(a.y, b.y) + 0.05;
    obj.rotation.y = Math.atan2(b.x - a.x, b.z - a.z);
    obj.scale.set(1, 1, animate ? 0.01 : len / 8);
    this.zone.group.add(obj);
    this.bridges.set(ap.id, obj);
    if (ap.covers) this.zone.bridged.add(ap.covers);
    if (animate) {
      const grow = (dt: number) => {
        obj.scale.z = Math.min(len / 8, obj.scale.z + dt * 1.5);
        if (obj.scale.z >= len / 8) this.frameHooks.delete(grow);
      };
      this.frameHooks.add(grow);
      this.audio.sfx('success');
      this.quest.apply({ type: 'setFlag', flag: `bridge_${ap.id}` });
      this.quest.emitEvent(`bridge:${ap.id}`);
      this.hud.toast('ША: Шест — и мост. Проходи, Дед.');
    }
  }

  /* ================= шина ================= */

  private bindBus(): void {
    const changed = () => {
      this.refreshVisibility();
      this.refreshHud();
      this.dirty = true;
    };
    this.bus.on('flag:changed', changed);
    this.bus.on('item:changed', (e) => {
      changed();
      if (e.delta > 0) {
        const it = ITEM_MAP[e.item];
        if (it) this.hud.toast(`Получено: ${it.name}${it.category === 'bag' && e.count > 1 ? ` ×${e.count}` : ''}`);
      }
    });
    this.bus.on('objective:changed', (e) => {
      changed();
      if (e.state === 'done') {
        this.audio.sfx('success');
        this.quest.run(this.zone?.def.events?.[`done:${e.id}`]);
      }
    });
    this.bus.on('event', (e) => this.quest.run(this.zone?.def.events?.[e.name]));
    this.bus.on('companion:added', () => {
      this.companions.sync(this.state.companions, this.zone, this.player.pos);
      changed();
    });
    this.bus.on('stamp', () => this.audio.sfx('stamp'));
    this.bus.on('toast', (e) => this.hud.toast(e.text));
    this.bus.on('sfx', (e) => this.audio.sfx(e.id));
    this.bus.on('save', (e) => (e.force ? this.save(true) : (this.dirty = true)));
  }

  /* ================= HUD ================= */

  refreshHud(): void {
    const ch = this.quest.chapter;
    this.hud.setChapter(this.zone?.def.name ?? ch.title, ch.title);
    this.hud.setObjectives(this.quest.activeObjectives());
    this.hud.setHotbar(this.state.hotbar, this.state.selectedSlot ?? 0);
    this.hud.setAmbient(this.state.settings.ambient !== false && this.audio.ctx?.state === 'running');
  }

  private updatePrompt(): void {
    if (this.busy || this.dialog.open || this.pause.isOpen || this.journal.isOpen || this.worldMap.isOpen) {
      this.hud.prompt(null);
      this.hud.ability(null);
      return;
    }
    const p = this.player.pos;
    let best: Game['focused'] = null;
    let bestD = Infinity;
    for (const rt of this.zone.interactables.values()) {
      if (!rt.visible) continue;
      const d = Math.hypot(rt.pos.x - p.x, rt.pos.z - p.z);
      if (d < rt.def.radius && d < bestD) { best = { kind: 'obj', rt }; bestD = d; }
    }
    for (const rt of this.zone.npcs.values()) {
      if (!rt.visible) continue;
      const d = Math.hypot(rt.pos.x - p.x, rt.pos.z - p.z);
      if (d < (rt.def.radius ?? 2.8) && d < bestD) { best = { kind: 'npc', rt }; bestD = d; }
    }
    if (this.focused?.kind === 'obj' && this.focused.rt !== best?.rt) this.focused.rt.glow.visible = false;
    this.focused = best;
    const parts: string[] = [];
    if (best?.kind === 'obj') {
      best.rt.glow.visible = true;
      parts.push(`<span class="kbd">E</span> ${best.rt.def.prompt}`);
      const tool = this.selectedTool;
      const ui = best.rt.def.useItem;
      if (tool && ((ui && ui.item === tool) || (best.rt.def.freezes && tool === 'ITM_STAFF'))) parts.push(`<span class="kbd">F</span> ${ITEM_MAP[tool]?.name ?? ''}`);
    } else if (best?.kind === 'npc') parts.push(`<span class="kbd">E</span> Поговорить: ${best.rt.def.name}`);
    this.hud.prompt(parts.length ? parts.join(' · ') : null);
    const ap = this.nearAbility();
    if (ap) this.hud.ability(`<span class="kbd">Q</span> ${ap.type === 'cloud_spot' ? 'Облако Суня' : 'Мост Ша'}`);
    else if (this.state.companions.includes('БАЦЗЕ')) {
      const cd = Math.ceil(this.sniffReady - this.time);
      this.hud.ability(`<span class="kbd">Q</span> Нюх Бацзе${cd > 0 ? ` · ${cd} с` : ''}`);
    } else this.hud.ability(null);
  }

  /* ================= цикл ================= */

  private loop(ts: number): void {
    requestAnimationFrame((n) => this.loop(n));
    if (document.hidden) return;
    const dt = Math.min(CONFIG.maxDelta, (ts - this.last) / 1000);
    this.last = ts;
    if (!this.zone || this.transitioning) {
      this.r.render(dt);
      return;
    }
    const frozen = this.pause.isOpen;
    if (!frozen) {
      this.acc += dt;
      while (this.acc >= CONFIG.fixedStep) {
        this.step(CONFIG.fixedStep);
        this.acc -= CONFIG.fixedStep;
      }
    }
    if (!this.cam.manual) {
      const m = this.input.consumeMouse();
      this.cam.input(m.dx, m.dy, m.wheel);
      this.cam.update(dt, this.player.pos, this.zone);
    }
    this.atmosphere.follow(this.player.pos, this.cam.camera.position);
    this.particles.update(dt, this.time);
    this.zone.update(dt, this.time);
    this.audio.update(dt);
    for (const fn of [...this.frameHooks]) fn(dt, this.time);
    this.updateSniffGlow();
    this.updateBeacons(dt);
    this.updatePrompt();
    this.minimap.draw(this.player.pos, this.player.facing, this.state.companions.map((c) => this.companions.positionOf(c)).filter((v): v is THREE.Vector3 => !!v), this.markers(), this.time);
    this.r.render(dt);
    if (this.autoQuality) this.measureQuality(dt);
    if (this.dirty && performance.now() - this.lastSave > 5000) this.save(false);
  }

  private step(dt: number): void {
    this.time += dt;
    const blocked = this.busy || this.dialog.open || this.journal.isOpen || this.worldMap.isOpen;
    if (this.hop) {
      this.stepHop(dt);
      return;
    }
    this.player.locked = blocked;
    this.player.update(dt, this.time, this.input, this.cam.yaw, this.zone);
    this.companions.update(dt, this.time, this.zone, this.player.pos, this.player.facing, this.dialog.open ? this.player.pos : null);
    if (blocked) return;
    this.checkTriggers();
    this.checkHazards(dt);
  }

  private stepHop(dt: number): void {
    const h = this.hop!;
    h.t = Math.min(1, h.t + dt / 1.6);
    const p = this.player.pos.copy(h.from).lerp(h.to, h.t);
    p.y += Math.sin(h.t * Math.PI) * 6;
    this.player.rig.root.position.copy(p);
    h.cloud.position.set(p.x, p.y - 0.4, p.z);
    if (h.t >= 1) {
      h.cloud.removeFromParent();
      this.player.place(this.zone, h.to.x, h.to.z);
      this.companions.teleportAll(this.zone, this.player.pos);
      this.player.locked = false;
      this.hop = null;
    }
  }

  private inTrigger(tr: Zone['def']['triggers'][number], p: THREE.Vector3): boolean {
    if (tr.shape === 'circle') return Math.hypot(p.x - tr.pos[0], p.z - tr.pos[2]) < (tr.r ?? 3);
    const s = tr.size ?? [4, 4, 4];
    return Math.abs(p.x - tr.pos[0]) < s[0] / 2 && Math.abs(p.z - tr.pos[2]) < s[2] / 2;
  }

  private checkTriggers(): void {
    const p = this.player.pos;
    for (const tr of this.zone.def.triggers) {
      const inside = this.inTrigger(tr, p);
      const was = this.inside.has(tr.id);
      if (inside && !was) {
        this.inside.add(tr.id);
        if (tr.once && this.state.flags[`trg_${tr.id}`]) continue;
        if (tr.once) this.quest.apply({ type: 'setFlag', flag: `trg_${tr.id}` });
        this.quest.run(tr.onEnter);
        const d = this.quest.findDialog(`enter:${tr.id}`);
        if (d) this.enqueueDialog(d.id);
      } else if (!inside && was) this.inside.delete(tr.id);
    }
    for (const cp of this.zone.def.checkpoints) {
      if (cp.id === this.lastCheckpointId) continue;
      if (Math.hypot(p.x - cp.pos[0], p.z - cp.pos[2]) < cp.radius) {
        this.lastCheckpointId = cp.id;
        this.state.checkpoint = [cp.pos[0], 0, cp.pos[2]];
        this.save(true);
      }
    }
  }

  private checkHazards(dt: number): void {
    if (this.player.onHazard && this.time > this.respawnAt) {
      this.respawn();
      return;
    }
    const heat = this.zone.def.heat;
    if (!heat) {
      this.hud.heat(null);
      return;
    }
    const p = this.player.pos;
    const cool = heat.cool.some((s) => inShape(s, p.x, p.z));
    this.heat = Math.max(0, Math.min(100, this.heat + (cool ? -heat.coolRate : heat.rate) * dt));
    this.hud.heat(this.heat);
    if (this.heat >= 100) {
      this.heat = 0;
      this.respawn(t('ui.heat.full'));
    }
  }

  respawn(text = t('ui.respawn')): void {
    this.respawnAt = this.time + 1.5;
    const c = this.state.checkpoint ?? this.zone.def.spawns.default;
    this.player.place(this.zone, c[0], c[2]);
    this.companions.teleportAll(this.zone, this.player.pos);
    this.cam.snap(this.player.pos, this.zone);
    this.audio.sfx('error');
    this.hud.toast(text);
  }

  private updateSniffGlow(): void {
    const on = this.time < this.sniffUntil;
    for (const rt of this.zone.interactables.values()) {
      if (!rt.visible) continue;
      const near = on && rt.pos.distanceTo(this.player.pos) < SNIFF_RADIUS;
      if (near) {
        rt.glow.visible = true;
        rt.glow.scale.setScalar(1 + 0.25 * Math.sin(this.time * 6));
      } else if (this.focused?.kind !== 'obj' || this.focused.rt !== rt) {
        rt.glow.visible = false;
        rt.glow.scale.setScalar(1);
      }
    }
  }

  private beaconTimer = 0;

  private updateBeacons(dt: number): void {
    this.beaconTimer -= dt;
    if (this.beaconTimer > 0) return;
    this.beaconTimer = 1.4;
    for (const rt of this.zone.interactables.values()) {
      const r = rt.def.beacon;
      if (!r || !rt.visible) continue;
      const d = rt.pos.distanceTo(this.player.pos);
      if (d > r) continue;
      const k = 1 - d / r;
      this.audio.ping(520 + k * 360, 0.02 + k * 0.12);
      this.beaconTimer = 1.6 - k * 1.1;
    }
  }

  private markers(): THREE.Vector3[] {
    const out: THREE.Vector3[] = [];
    for (const o of this.quest.activeObjectives()) {
      const def = this.quest.chapter.objectives.find((x) => x.id === o.id);
      const pos = def?.marker?.pos;
      if (pos) out.push(new THREE.Vector3(pos[0], 0, pos[2]));
    }
    return out;
  }

  private measureQuality(dt: number): void {
    const a = this.autoQuality!;
    a.acc += dt;
    a.frames++;
    if (a.acc < 2) return;
    const level: QualityLevel = Renderer.pickAuto(a.frames / a.acc);
    this.autoQuality = null;
    if (level !== this.r.level) {
      this.r.setQuality(level, this.state.settings.reduceFx);
      this.atmosphere.setShadows(level !== 'low', level === 'high' ? 2048 : 1024);
      setBlobShadows(level === 'low');
    }
  }

  /* ================= настройки и сохранения ================= */

  applySettings(s: Settings, initial = false): void {
    const prevQ = this.state.settings.quality;
    this.state.settings = { ...s };
    const q: QualityLevel = s.quality === 'auto' ? (initial ? 'med' : this.r.level) : s.quality;
    if (initial || prevQ !== s.quality || this.r.reduceFx !== s.reduceFx) {
      this.r.setQuality(q, s.reduceFx);
      this.atmosphere.setShadows(q !== 'low', q === 'high' ? 2048 : 1024);
      setBlobShadows(q === 'low');
      if (this.zone) this.particles.set(this.zone.def.atmosphere.particles, s.reduceFx);
    }
    this.audio.musicVol = s.musicVol;
    this.audio.sfxVol = s.sfxVol;
    this.audio.applyVolumes();
    this.dirty = true;
  }

  async toggleAmbient(): Promise<void> {
    const on = !(this.audio.ctx?.state === 'running' && this.state.settings.ambient !== false);
    this.state.settings.ambient = on;
    if (on) {
      await this.audio.start();
      if (this.zone) this.audio.setZone(this.zone.def.atmosphere.ambient);
    } else await this.audio.stop();
    this.refreshHud();
    this.dirty = true;
  }

  private syncPos(): void {
    const p = this.player.pos;
    this.state.pos = [Math.round(p.x * 10) / 10, 0, Math.round(p.z * 10) / 10];
    this.state.pending = [...(this.current ? [this.current] : []), ...this.queue];
  }

  save(force: boolean): void {
    if (this.resetting || !this.zone || (this.transitioning && !force)) return;
    if (!force && !this.dirty) return;
    this.syncPos();
    writeSave(this.state);
    this.dirty = false;
    this.lastSave = performance.now();
  }

  restart(): void {
    this.replaceSave(freshState(this.state.settings));
  }

  replaceSave(s: SaveV1): void {
    this.resetting = true;
    writeSave(s);
    location.reload();
  }
}

const BARKS = ['Ну-ну.', 'Дорога длинная, Дед.', 'Мешок не потеряй.', 'С наступающим!'];
