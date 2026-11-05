/** Карта мира (M) и маршрут саней. Узлы — STORY §3, как есть. TECH §10. */
import { CHAPTERS } from '../content/registry';
import { el } from './dom';

/** Нормализованные координаты (x вправо, y вниз) из таблицы узлов. */
const COORDS: { zone: string; x: number; y: number }[] = [
  { zone: 'ZONE_WORKSHOP', x: 0.18, y: 0.12 },
  { zone: 'ZONE_TAIGA', x: 0.24, y: 0.22 },
  { zone: 'ZONE_PASS', x: 0.30, y: 0.34 },
  { zone: 'ZONE_BAIKAL', x: 0.42, y: 0.40 },
  { zone: 'ZONE_TEA_ROAD', x: 0.50, y: 0.55 },
  { zone: 'ZONE_FLAME', x: 0.58, y: 0.66 },
  { zone: 'ZONE_SPIDER_CAVE', x: 0.68, y: 0.74 },
  { zone: 'ZONE_MARKET', x: 0.78, y: 0.78 },
  { zone: 'ZONE_FOOTHILLS', x: 0.88, y: 0.88 },
];

type Anchor = 'left' | 'right' | 'above' | 'above-right';

const ANCHOR: Record<string, Anchor> = {
  ZONE_WORKSHOP: 'left',
  ZONE_TAIGA: 'right',
  ZONE_PASS: 'left',
  ZONE_BAIKAL: 'right',
  ZONE_TEA_ROAD: 'above-right',
  ZONE_FLAME: 'left',
  ZONE_SPIDER_CAVE: 'above-right',
  ZONE_MARKET: 'right',
  ZONE_FOOTHILLS: 'left',
};

interface Node {
  zone: string;
  name: string;
  x: number;
  y: number;
}

const NODES: Node[] = COORDS.map((c) => ({
  zone: c.zone,
  x: c.x,
  y: c.y,
  name: CHAPTERS.find((ch) => ch.zone === c.zone)?.title ?? c.zone,
}));

const INK = '#3b2a1a';
const GOLD = '#e4c56b';
const RED = '#c0303c';

export class WorldMap {
  private back: HTMLElement;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D | null;
  private opened = false;
  private raf = 0;
  private zone = '';
  private done: string[] = [];

  constructor(root: HTMLElement) {
    this.canvas = el('canvas', { class: 'wmap-canvas', width: 720, height: 480, 'aria-label': 'Путь экспедиции' });
    this.ctx = this.canvas.getContext('2d');
    const title = el('h2', { class: 'wmap-title' }, 'Путь экспедиции');
    const foot = el('p', { class: 'wmap-foot muted' },
      el('span', { class: 'kbd' }, 'M'),
      ' или ',
      el('span', { class: 'kbd' }, 'Esc'),
      ' — закрыть',
    );
    const panel = el('div', {
      class: 'panel modal wmap-panel',
      role: 'dialog',
      'aria-modal': 'true',
      'aria-label': 'Путь экспедиции',
    }, title, this.canvas, foot);
    this.back = el('div', { class: 'modal-back interactive wmap-back hidden' }, panel);
    root.append(this.back);
  }

  get isOpen(): boolean {
    return this.opened;
  }

  open(currentZone: string, doneZones: string[]): void {
    this.zone = currentZone;
    this.done = doneZones.slice();
    this.opened = true;
    this.back.classList.remove('hidden');
    this.paint();
    if (!this.raf) this.raf = requestAnimationFrame(this.frame);
  }

  close(): void {
    this.opened = false;
    this.back.classList.add('hidden');
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = 0;
  }

  /** true, если действие съедено: Esc и M закрывают карту. */
  handle(action: string): boolean {
    if (!this.opened) return false;
    if (action === 'escape' || action === 'map') {
      this.close();
      return true;
    }
    return false;
  }

  /**
   * Маршрут на любом холсте (окно карты и кат-сцена саней).
   * `sleigh.t` 0..1 ведёт санки от узла `from` к узлу `to` вдоль ломаной.
   */
  static draw(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    currentZone: string,
    doneZones: string[],
    sleigh?: { from: string; to: string; t: number },
  ): void {
    if (w <= 0 || h <= 0) return;
    ctx.save();
    try {
      paintMap(ctx, w, h, currentZone, doneZones, sleigh);
    } finally {
      ctx.restore();
    }
  }

  private frame = (): void => {
    if (!this.opened) {
      this.raf = 0;
      return;
    }
    this.paint();
    this.raf = requestAnimationFrame(this.frame);
  };

  private paint(): void {
    if (!this.ctx) return;
    WorldMap.draw(this.ctx, this.canvas.width, this.canvas.height, this.zone, this.done);
  }
}

function paintMap(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  currentZone: string,
  doneZones: string[],
  sleigh?: { from: string; to: string; t: number },
): void {
  const scale = Math.min(w / 720, h / 480);
  const done = new Set(doneZones);
  const cur = NODES.findIndex((n) => n.zone === currentZone);
  const at = (n: Node) => ({ x: n.x * w, y: n.y * h });

  const paper = ctx.createRadialGradient(w * 0.45, h * 0.4, w * 0.05, w * 0.5, h * 0.55, w * 0.72);
  paper.addColorStop(0, '#f7edd4');
  paper.addColorStop(1, '#e4d0a4');
  ctx.fillStyle = paper;
  ctx.fillRect(0, 0, w, h);
  specks(ctx, w, h);
  doodles(ctx, w, h, scale);
  frame(ctx, w, h, scale);

  ctx.setLineDash([8 * scale, 6 * scale]);
  ctx.lineWidth = 1.8 * scale;
  ctx.lineCap = 'round';
  ctx.strokeStyle = INK;
  for (let i = 0; i < NODES.length - 1; i++) {
    const a = at(NODES[i]);
    const b = at(NODES[i + 1]);
    const walked = cur >= 0 ? i < cur : done.has(NODES[i + 1].zone);
    ctx.globalAlpha = walked ? 0.9 : 0.28;
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  }
  ctx.setLineDash([]);
  ctx.globalAlpha = 1;

  const pulse = 0.5 + 0.5 * Math.sin(performance.now() / 280);
  const r = Math.max(4, 6.5 * scale);
  for (const n of NODES) {
    const p = at(n);
    const kind = n.zone === currentZone ? 'now' : done.has(n.zone) ? 'past' : 'future';
    drawNode(ctx, p.x, p.y, kind, r, scale, pulse);
  }
  ctx.globalAlpha = 1;
  for (const n of NODES) {
    const p = at(n);
    const kind = n.zone === currentZone ? 'now' : done.has(n.zone) ? 'past' : 'future';
    drawLabel(ctx, n.name, p.x, p.y, ANCHOR[n.zone] ?? 'above', kind === 'future' ? 0.4 : 1, scale, r, w);
  }

  if (!sleigh) return;
  const ride = along(sleigh.from, sleigh.to, sleigh.t, w, h);
  if (ride) drawSleigh(ctx, ride.x, ride.y, ride.angle, scale * 1.35);
}

function drawNode(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  kind: 'past' | 'now' | 'future',
  r: number,
  scale: number,
  pulse: number,
): void {
  if (kind === 'future') {
    ctx.globalAlpha = 0.35;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = INK;
    ctx.fill();
    return;
  }
  if (kind === 'now') {
    ctx.globalAlpha = 0.28 + 0.4 * (1 - pulse);
    ctx.beginPath();
    ctx.arc(x, y, r + (3 + pulse * 8) * scale, 0, Math.PI * 2);
    ctx.strokeStyle = RED;
    ctx.lineWidth = 2 * scale;
    ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.beginPath();
    ctx.arc(x, y, r * (1 + pulse * 0.1), 0, Math.PI * 2);
    ctx.fillStyle = RED;
    ctx.fill();
    return;
  }
  ctx.globalAlpha = 1;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = GOLD;
  ctx.fill();
  ctx.lineWidth = 1.5 * scale;
  ctx.strokeStyle = INK;
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(x, y, r * 0.28, 0, Math.PI * 2);
  ctx.fillStyle = INK;
  ctx.fill();
}

function drawLabel(
  ctx: CanvasRenderingContext2D,
  name: string,
  x: number,
  y: number,
  anchor: Anchor,
  alpha: number,
  scale: number,
  r: number,
  w: number,
): void {
  ctx.globalAlpha = alpha;
  const size = Math.max(10, Math.round(13 * scale));
  ctx.font = `600 ${size}px system-ui, sans-serif`;
  const tw = ctx.measureText(name).width;
  const gap = 18 * scale;
  let lx = x;
  let ly = y;
  if (anchor === 'left') {
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    lx = Math.max(x - r - gap, 8 + tw);
  } else if (anchor === 'right') {
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    lx = Math.min(x + r + gap, w - 8 - tw);
  } else if (anchor === 'above-right') {
    ctx.textAlign = 'left';
    ctx.textBaseline = 'bottom';
    lx = Math.min(x + 2 * scale, w - 8 - tw);
    ly = y - r - 14 * scale;
  } else {
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    lx = Math.min(Math.max(x, 8 + tw / 2), w - 8 - tw / 2);
    ly = y - r - gap;
  }
  ctx.lineWidth = 3 * scale;
  ctx.strokeStyle = '#f3e6c8';
  ctx.strokeText(name, lx, ly);
  ctx.fillStyle = INK;
  ctx.fillText(name, lx, ly);
}

function along(from: string, to: string, t: number, w: number, h: number): { x: number; y: number; angle: number } | null {
  const i0 = NODES.findIndex((n) => n.zone === from);
  const i1 = NODES.findIndex((n) => n.zone === to);
  if (i0 < 0 || i1 < 0) return null;
  const tt = Math.min(1, Math.max(0, Number.isFinite(t) ? t : 0));
  const pos = (i: number) => ({ x: NODES[i].x * w, y: NODES[i].y * h });
  const span = Math.abs(i1 - i0);
  if (span === 0) return { ...pos(i0), angle: 0 };
  const step = i0 <= i1 ? 1 : -1;
  const dist = tt * span;
  let seg = Math.floor(dist);
  let local = dist - seg;
  if (seg >= span) {
    seg = span - 1;
    local = 1;
  }
  const a = pos(i0 + step * seg);
  const b = pos(i0 + step * (seg + 1));
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  return {
    x: a.x + dx * local,
    y: a.y + dy * local,
    angle: Math.hypot(dx, dy) < 0.001 ? 0 : Math.atan2(dy, dx),
  };
}

function drawSleigh(ctx: CanvasRenderingContext2D, x: number, y: number, angle: number, scale: number): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.scale(scale, scale);
  ctx.globalAlpha = 1;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.fillStyle = RED;
  ctx.strokeStyle = RED;
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(-11, -1);
  ctx.lineTo(8, -1);
  ctx.lineTo(11, 4);
  ctx.lineTo(-8, 4);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(-13, 5);
  ctx.quadraticCurveTo(-16, 9, -8, 9);
  ctx.lineTo(12, 9);
  ctx.quadraticCurveTo(16, 9, 13, 5);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(11, 4);
  ctx.quadraticCurveTo(16, 2, 13, -2);
  ctx.stroke();
  ctx.restore();
}

function frame(ctx: CanvasRenderingContext2D, w: number, h: number, scale: number): void {
  ctx.globalAlpha = 0.45;
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.5 * scale;
  ctx.strokeRect(10 * scale, 10 * scale, w - 20 * scale, h - 20 * scale);
  ctx.lineWidth = 0.7 * scale;
  ctx.strokeRect(14 * scale, 14 * scale, w - 28 * scale, h - 28 * scale);
  ctx.globalAlpha = 1;
}

function specks(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  ctx.fillStyle = INK;
  ctx.globalAlpha = 0.07;
  for (let i = 0; i < 28; i++) {
    const x = frac(i * 3 + 1) * w;
    const y = frac(i * 5 + 2) * h;
    ctx.beginPath();
    ctx.arc(x, y, 0.6 + frac(i * 7 + 3) * 1.3, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

/** Чернильные почеркушки: ёлки у тайги, волны у Байкала, горы в правом нижнем углу. */
function doodles(ctx: CanvasRenderingContext2D, w: number, h: number, scale: number): void {
  ctx.fillStyle = INK;
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.2 * scale;
  ctx.lineCap = 'round';
  ctx.globalAlpha = 0.38;
  const trees = [
    { x: 0.09, y: 0.20, s: 0.016 },
    { x: 0.12, y: 0.28, s: 0.014 },
    { x: 0.065, y: 0.30, s: 0.012 },
  ];
  for (const t of trees) {
    const x = t.x * w;
    const y = t.y * h;
    const s = t.s * w;
    ctx.beginPath();
    ctx.moveTo(x, y - s * 1.5);
    ctx.lineTo(x + s, y + s);
    ctx.lineTo(x - s, y + s);
    ctx.closePath();
    ctx.fill();
    ctx.fillRect(x - s * 0.16, y + s, s * 0.32, s * 0.55);
  }
  const wavesX = 0.33 * w;
  const wavesY = 0.48 * h;
  for (let i = 0; i < 3; i++) {
    const y = wavesY + i * (7 * scale);
    ctx.beginPath();
    ctx.moveTo(wavesX, y);
    ctx.quadraticCurveTo(wavesX + 14 * scale, y - 4 * scale, wavesX + 28 * scale, y);
    ctx.quadraticCurveTo(wavesX + 42 * scale, y + 4 * scale, wavesX + 56 * scale, y);
    ctx.stroke();
  }
  const peaks = [
    { x: 0.955, y: 0.93, s: 0.03 },
    { x: 0.975, y: 0.955, s: 0.024 },
    { x: 0.925, y: 0.965, s: 0.022 },
  ];
  for (const p of peaks) {
    const x = p.x * w;
    const y = p.y * h;
    const s = p.s * w;
    ctx.beginPath();
    ctx.moveTo(x, y - s);
    ctx.lineTo(x + s * 0.85, y + s * 0.38);
    ctx.lineTo(x - s * 0.85, y + s * 0.38);
    ctx.closePath();
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function frac(n: number): number {
  const x = Math.sin(n * 127.1) * 43758.5453;
  return x - Math.floor(x);
}
