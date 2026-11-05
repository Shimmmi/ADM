/** Сохранения (TECH §14): localStorage `adm.save.v1`, миграции, экспорт/импорт. */
import { CONFIG } from '../app/config';
import { CHAPTERS } from '../content/registry';
import { ITEM_MAP } from '../content/items';
import { DEFAULT_SETTINGS, freshState, type SaveV1 } from '../gameplay/GameState';

let memory: string | null = null;
let storageOk = true;

function probe(): boolean {
  try {
    const k = '__adm_probe__';
    localStorage.setItem(k, '1');
    localStorage.removeItem(k);
    return true;
  } catch {
    return false;
  }
}

export function storageAvailable(): boolean {
  return storageOk;
}

export function initStorage(): void {
  storageOk = typeof localStorage !== 'undefined' && probe();
}

/** Приводит любую известную версию к актуальной; null — если данные непригодны. */
export function migrate(raw: unknown): SaveV1 | null {
  if (!raw || typeof raw !== 'object') return null;
  const s = raw as Partial<SaveV1>;
  if (s.v !== 1) return null;
  if (!CHAPTERS.some((c) => c.id === s.chapter)) return null;
  if (!CHAPTERS.some((c) => c.zone === s.zone)) return null;
  if (!Array.isArray(s.pos) || s.pos.length !== 3 || !s.pos.every(Number.isFinite)) return null;
  const base = freshState(s.settings ?? DEFAULT_SETTINGS);
  const items: Record<string, number> = {};
  for (const [k, v] of Object.entries(s.items ?? {})) if (ITEM_MAP[k] && Number.isFinite(v) && v > 0) items[k] = v;
  const hotbar = Array.isArray(s.hotbar) && s.hotbar.length === 4 ? s.hotbar.map((h) => (h && ITEM_MAP[h] ? h : null)) : base.hotbar;
  return {
    ...base,
    ...s,
    items,
    hotbar,
    settings: { ...DEFAULT_SETTINGS, ...(s.settings ?? {}) },
    flags: { ...(s.flags ?? {}) },
    objectives: { ...(s.objectives ?? {}) },
    stampDates: { ...(s.stampDates ?? {}) },
  } as SaveV1;
}

export function loadSave(): SaveV1 | null {
  const text = storageOk ? safeGet() : memory;
  if (!text) return null;
  try {
    return migrate(JSON.parse(text));
  } catch {
    return null;
  }
}

function safeGet(): string | null {
  try {
    return localStorage.getItem(CONFIG.saveKey);
  } catch {
    storageOk = false;
    return memory;
  }
}

export function writeSave(state: SaveV1): void {
  state.savedAt = new Date().toISOString();
  const text = JSON.stringify(state);
  memory = text;
  if (!storageOk) return;
  try {
    localStorage.setItem(CONFIG.saveKey, text);
  } catch {
    storageOk = false;
  }
}

export function clearSave(): void {
  memory = null;
  try {
    localStorage.removeItem(CONFIG.saveKey);
  } catch {
    /* хранилище недоступно — прогресс и так в памяти */
  }
}

async function pipe(data: Uint8Array, stream: CompressionStream | DecompressionStream): Promise<Uint8Array> {
  const out = new Blob([data]).stream().pipeThrough(stream);
  return new Uint8Array(await new Response(out).arrayBuffer());
}

function toB64(bytes: Uint8Array): string {
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromB64(text: string): Uint8Array {
  const s = atob(text.replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(s, (c) => c.charCodeAt(0));
}

/** Код прогресса: base64url от deflate-raw(JSON), префикс ADM1. */
export async function exportCode(state: SaveV1): Promise<string> {
  const json = new TextEncoder().encode(JSON.stringify(state));
  return `ADM1.${toB64(await pipe(json, new CompressionStream('deflate-raw')))}`;
}

export async function importCode(code: string): Promise<SaveV1 | null> {
  const m = /^ADM1\.([A-Za-z0-9_-]+)$/.exec(code.trim());
  if (!m) return null;
  try {
    const bytes = await pipe(fromB64(m[1]), new DecompressionStream('deflate-raw'));
    return migrate(JSON.parse(new TextDecoder().decode(bytes)));
  } catch {
    return null;
  }
}
