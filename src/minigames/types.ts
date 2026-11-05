/** Каркас мини-игр (TECH §10.x, общее правило: пропуск после 3 неудач или 60 с). */
import type * as THREE from 'three';
import type { Input } from '../engine/Input';
import type { Quest } from '../gameplay/Quest';
import type { Player } from '../gameplay/Player';
import type { CameraRig } from '../gameplay/CameraRig';
import type { Companions } from '../gameplay/Companions';
import type { Zone } from '../world/Zone';
import type { Renderer } from '../engine/Renderer';
import { el } from '../ui/dom';
import { t } from '../content/ui';

/** `cancelled` — игрок вышел (Esc) без результата: событие DONE не эмитится, можно вернуться. */
export type MinigameResult = 'done' | 'skipped' | 'cancelled';

export interface MinigameCtx {
  root: HTMLElement;
  input: Input;
  quest: Quest;
  zone: Zone;
  player: Player;
  cam: CameraRig;
  companions: Companions;
  renderer: Renderer;
  scene: THREE.Scene;
  sfx(id: string): void;
  /** Короткий тон (маяки, мотив фонарей): частота, громкость, длительность. */
  ping(freq: number, gain: number, dur?: number): void;
  toast(text: string): void;
  say(speaker: string, text: string): Promise<void>;
  /** Время игры, с. */
  now(): number;
  /** Подписка на кадр; возвращает отписку. */
  onFrame(fn: (dt: number, t: number) => void): () => void;
  respawn(text?: string): void;
}

export interface Minigame {
  /** true — не блокирует мир: игрок ходит, режиссёр не ждёт. */
  readonly world?: boolean;
  run(ctx: MinigameCtx): Promise<MinigameResult>;
}

export type MinigameFactory = () => Minigame;

/** Базовая панель: заголовок, тело, кнопка «Пропустить» после 3 неудач или 60 с. */
export class MgPanel {
  readonly root: HTMLElement;
  readonly body: HTMLElement;
  readonly status: HTMLElement;
  private skipBtn: HTMLButtonElement;
  private fails = 0;
  private timer: number;
  private offInput: () => void;
  onSkip: (() => void) | null = null;

  constructor(ctx: MinigameCtx, title: string, hint: string, handle?: (action: string) => boolean | void) {
    this.body = el('div');
    this.status = el('div', { class: 'muted', style: 'margin-top:8px;min-height:1.3em' });
    this.skipBtn = el('button', { class: 'btn hidden', onclick: () => this.onSkip?.() }, t('ui.minigame.skip'));
    this.root = el('section', { class: 'mg panel interactive', role: 'dialog' },
      el('h3', {}, title), el('div', { class: 'muted', style: 'font-size:13px' }, hint), this.body,
      el('div', { class: 'row' }, this.status, this.skipBtn));
    ctx.root.append(this.root);
    this.timer = window.setTimeout(() => this.allowSkip(), 60_000);
    this.offInput = ctx.input.onAction((a) => {
      if (a === 'escape' && !this.skipBtn.classList.contains('hidden')) { this.onSkip?.(); return true; }
      return handle ? handle(a) !== false : true;
    });
  }

  fail(): number {
    this.fails++;
    if (this.fails >= 3) this.allowSkip();
    return this.fails;
  }

  get failures(): number {
    return this.fails;
  }

  allowSkip(): void {
    this.skipBtn.classList.remove('hidden');
  }

  setStatus(text: string): void {
    this.status.textContent = text;
  }

  close(): void {
    clearTimeout(this.timer);
    this.offInput();
    this.root.remove();
  }
}
