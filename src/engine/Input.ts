/** Ввод (TECH §5). Держит состояние клавиш и рассылает «нажатия» действиям. */
export type Action =
  | 'interact' | 'use' | 'ability' | 'journal' | 'map' | 'escape' | 'debug'
  | 'slot1' | 'slot2' | 'slot3' | 'slot4' | 'up' | 'down';

const ACTION_KEYS: Record<string, Action> = {
  KeyE: 'interact', KeyF: 'use', KeyQ: 'ability', KeyJ: 'journal', KeyM: 'map', Escape: 'escape', F9: 'debug',
  Digit1: 'slot1', Digit2: 'slot2', Digit3: 'slot3', Digit4: 'slot4',
  Numpad1: 'slot1', Numpad2: 'slot2', Numpad3: 'slot3', Numpad4: 'slot4',
  KeyW: 'up', ArrowUp: 'up', KeyS: 'down', ArrowDown: 'down',
};

export class Input {
  private down = new Set<string>();
  private listeners = new Set<(a: Action, e: KeyboardEvent) => boolean | void>();
  private releaseListeners = new Set<(code: string) => void>();
  mouseDX = 0;
  mouseDY = 0;
  wheel = 0;
  dragging = false;
  enabled = true;

  constructor(el: HTMLElement) {
    addEventListener('keydown', (e) => {
      if (isTyping(e)) return;
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(e.code)) e.preventDefault();
      if (e.code === 'F9') e.preventDefault();
      const first = !this.down.has(e.code);
      this.down.add(e.code);
      const a = ACTION_KEYS[e.code];
      if (a && first) for (const l of [...this.listeners].reverse()) if (l(a, e) === true) break;
    });
    addEventListener('keyup', (e) => {
      this.down.delete(e.code);
      for (const l of this.releaseListeners) l(e.code);
    });
    addEventListener('blur', () => this.down.clear());
    el.addEventListener('contextmenu', (e) => e.preventDefault());
    el.addEventListener('pointerdown', (e) => {
      if (e.button === 0 || e.button === 2) {
        this.dragging = true;
        el.setPointerCapture(e.pointerId);
      }
    });
    el.addEventListener('pointerup', (e) => {
      this.dragging = false;
      if (el.hasPointerCapture(e.pointerId)) el.releasePointerCapture(e.pointerId);
    });
    el.addEventListener('pointermove', (e) => {
      if (this.dragging || document.pointerLockElement === el) {
        this.mouseDX += e.movementX;
        this.mouseDY += e.movementY;
      }
    });
    el.addEventListener('wheel', (e) => {
      this.wheel += Math.sign(e.deltaY);
      e.preventDefault();
    }, { passive: false });
  }

  /** Последний подписавшийся получает событие первым; return true — поглотить. */
  onAction(fn: (a: Action, e: KeyboardEvent) => boolean | void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  onRelease(fn: (code: string) => void): () => void {
    this.releaseListeners.add(fn);
    return () => this.releaseListeners.delete(fn);
  }

  isDown(code: string): boolean {
    return this.enabled && this.down.has(code);
  }

  axis(): { x: number; z: number; run: boolean } {
    if (!this.enabled) return { x: 0, z: 0, run: false };
    const d = this.down;
    const x = (d.has('KeyD') || d.has('ArrowRight') ? 1 : 0) - (d.has('KeyA') || d.has('ArrowLeft') ? 1 : 0);
    const z = (d.has('KeyW') || d.has('ArrowUp') ? 1 : 0) - (d.has('KeyS') || d.has('ArrowDown') ? 1 : 0);
    return { x, z, run: d.has('ShiftLeft') || d.has('ShiftRight') };
  }

  consumeMouse(): { dx: number; dy: number; wheel: number } {
    const r = { dx: this.mouseDX, dy: this.mouseDY, wheel: this.wheel };
    this.mouseDX = this.mouseDY = this.wheel = 0;
    return r;
  }
}

function isTyping(e: KeyboardEvent): boolean {
  const t = e.target as HTMLElement | null;
  return !!t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA') && e.code !== 'Escape';
}
