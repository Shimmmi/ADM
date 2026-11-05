/** DLG-парсер (TECH §9.1). Чистый модуль: используется скриптами и тестами. */
import type { Condition, DialogDef, DialogNode, Effect } from './schema';

export interface DlgError {
  dialog: string;
  line: number;
  message: string;
}

export function extractDlgBlocks(markdown: string): { text: string; line: number }[] {
  const blocks: { text: string; line: number }[] = [];
  const lines = markdown.split(/\r?\n/);
  let inside = false;
  let start = 0;
  let buf: string[] = [];
  lines.forEach((raw, i) => {
    const line = raw.trim();
    if (!inside && line === '```dlg') {
      inside = true;
      start = i + 2;
      buf = [];
    } else if (inside && line === '```') {
      inside = false;
      blocks.push({ text: buf.join('\n'), line: start });
    } else if (inside) {
      buf.push(raw);
    }
  });
  return blocks;
}

export function parseRequires(expr: string): Condition | null {
  const s = expr.trim();
  let m = /^!flag:([a-z0-9_]+)$/i.exec(s);
  if (m) return { notFlag: m[1] };
  m = /^flag:([a-z0-9_]+)$/i.exec(s);
  if (m) return { flag: m[1] };
  m = /^item:([A-Z0-9_]+)(?:>=(\d+))?$/.exec(s);
  if (m) return { item: m[1], count: m[2] ? Number(m[2]) : 1 };
  return null;
}

function parseEffect(cmd: string, args: string[]): Effect | { next: string } | { goto: string } | null {
  const n = (v: string | undefined) => (v === undefined ? undefined : Number(v));
  switch (cmd) {
    case 'set': return args[0] ? { type: 'setFlag', flag: args[0] } : null;
    case 'unset': return args[0] ? { type: 'unsetFlag', flag: args[0] } : null;
    case 'give': return args[0] ? { type: 'giveItem', item: args[0], count: n(args[1]) ?? 1 } : null;
    case 'take': return args[0] ? { type: 'takeItem', item: args[0], count: n(args[1]) ?? 1 } : null;
    case 'obj':
      if (args[1] === 'activate') return { type: 'activateObjective', id: args[0] };
      if (args[1] === 'done') return { type: 'completeObjective', id: args[0] };
      return null;
    case 'companion': return args[0] === 'add' && args[1] ? { type: 'addCompanion', id: args[1] } : null;
    case 'stamp': return args[0] ? { type: 'stamp', id: args[0] } : null;
    case 'gift': return args[0] ? { type: 'showGift', id: args[0] } : null;
    case 'minigame': return args[0] ? { type: 'startMinigame', id: args[0] } : null;
    case 'unlock': return args[0] ? { type: 'unlock', id: args[0] } : null;
    case 'next': return args[0] ? { next: args[0] } : null;
    case 'goto': return args[0] ? { goto: args[0] } : null;
    case 'chapter': return args[0] === 'complete' ? { type: 'completeChapter' } : null;
    default: return null;
  }
}

export function parseDlg(block: string, baseLine: number, order: number, errors: DlgError[]): DialogDef | null {
  const lines = block.split('\n');
  let def: DialogDef | null = null;
  let pendingChoice: Extract<DialogNode, { t: 'choice' }> | null = null;
  let ended = false;
  const err = (i: number, message: string) => errors.push({ dialog: def?.id ?? '?', line: baseLine + i, message });

  lines.forEach((raw, i) => {
    const line = raw.trim();
    if (!line || line.startsWith('#') || ended) return;

    if (line.startsWith('@')) {
      pendingChoice = null;
      const [kw, ...rest] = line.split(/\s+/);
      const val = rest.join(' ');
      if (kw === '@dialog') {
        def = { id: val, trigger: '', priority: 0, requires: [], repeat: 'always', nodes: [], order };
      } else if (!def) {
        err(i, `директива ${kw} до @dialog`);
      } else if (kw === '@trigger') {
        def.trigger = val.replace(/\s+/g, '');
      } else if (kw === '@priority') {
        def.priority = Number(val) || 0;
      } else if (kw === '@requires') {
        const c = parseRequires(val);
        if (c) def.requires.push(c);
        else err(i, `не понимаю @requires ${val}`);
      } else if (kw === '@repeat') {
        if (val === 'once' || val === 'always') def.repeat = val;
        else err(i, `@repeat ${val}`);
      } else if (kw === '@end') {
        ended = true;
      } else {
        err(i, `неизвестная директива ${kw}`);
      }
      return;
    }
    if (!def) return err(i, 'строка вне @dialog');
    const d: DialogDef = def;

    if (line.startsWith('?')) {
      pendingChoice = { t: 'choice', prompt: line.slice(1).trim(), options: [] };
      d.nodes.push(pendingChoice);
      return;
    }
    if (line.startsWith('- ')) {
      const m = /^-\s+(.+?)\s*->\s*([A-Za-z0-9_]+)$/.exec(line);
      const choice = pendingChoice as Extract<DialogNode, { t: 'choice' }> | null;
      if (!m || !choice) return err(i, `пункт выбора вне блока ?: ${line}`);
      choice.options.push({ text: m[1], label: m[2] });
      return;
    }
    pendingChoice = null;
    if (line.startsWith(':')) {
      d.nodes.push({ t: 'label', name: line.slice(1).trim() });
      return;
    }
    if (line.startsWith('!')) {
      const [cmd, ...args] = line.slice(1).trim().split(/\s+/);
      const e = parseEffect(cmd, args);
      if (!e) return err(i, `не понимаю эффект ${line}`);
      if ('next' in e) d.nodes.push({ t: 'next', id: e.next });
      else if ('goto' in e) d.nodes.push({ t: 'goto', label: e.goto });
      else d.nodes.push({ t: 'effect', effect: e });
      return;
    }
    const m = /^([А-ЯЁA-Z]+):\s*(.+)$/.exec(line);
    if (m) {
      d.nodes.push({ t: 'line', speaker: m[1], text: m[2] });
      return;
    }
    err(i, `не понимаю строку: ${line}`);
  });

  const result = def as DialogDef | null;
  if (result && !ended) errors.push({ dialog: result.id, line: baseLine, message: 'нет @end' });
  if (result && !result.trigger) errors.push({ dialog: result.id, line: baseLine, message: 'нет @trigger' });
  return result;
}

export function parseStory(markdown: string): { dialogs: DialogDef[]; errors: DlgError[] } {
  const errors: DlgError[] = [];
  const dialogs: DialogDef[] = [];
  extractDlgBlocks(markdown).forEach((b, idx) => {
    const d = parseDlg(b.text, b.line, idx, errors);
    if (d) dialogs.push(d);
  });
  return { dialogs, errors };
}

export interface DlgRefs {
  speakers: string[];
  items: string[];
  stamps: string[];
  gifts: string[];
  minigames: string[];
  objectives: string[];
  companions: string[];
  eventProducers: string[];
  interactables?: string[];
  npcs?: string[];
}

/** Проверки TECH §9.2. */
export function validateDialogs(dialogs: DialogDef[], refs: DlgRefs): string[] {
  const out: string[] = [];
  const ids = new Set<string>();
  const nextTargets = new Set<string>();
  for (const d of dialogs) for (const n of d.nodes) if (n.t === 'next') nextTargets.add(n.id);

  for (const d of dialogs) {
    const p = (m: string) => out.push(`${d.id}: ${m}`);
    if (ids.has(d.id)) p('повторный ID');
    ids.add(d.id);
    if (!/^CH0[0-8]\.D\d{2}$/.test(d.id)) p('ID не по схеме CHxx.Dyy');

    const [kind, target] = d.trigger.split(':');
    if (kind === 'chain') {
      if (!nextTargets.has(d.id)) p('@trigger chain, но никто не вызывает !next');
    } else if (kind === 'event') {
      if (!refs.eventProducers.includes(target)) p(`у event:${target} нет производителя`);
    } else if (kind === 'interact') {
      if (refs.interactables && !refs.interactables.includes(target)) p(`интерактив ${target} не найден в зонах`);
    } else if (kind === 'npc') {
      if (refs.npcs && !refs.npcs.includes(target)) p(`NPC ${target} не найден в зонах`);
    } else {
      p(`неизвестный @trigger ${d.trigger}`);
    }

    for (const r of d.requires) if ('item' in r && !refs.items.includes(r.item)) p(`@requires неизвестный предмет ${r.item}`);

    const labels = new Set(d.nodes.filter((n) => n.t === 'label').map((n) => (n as { name: string }).name));
    const reached = new Set<string>();
    d.nodes.forEach((n, i) => {
      if (n.t === 'line') {
        if (!(n.speaker in Object.fromEntries(refs.speakers.map((s) => [s, 1])))) p(`неизвестный спикер ${n.speaker}`);
        if (n.text.length > 220) p(`реплика длиннее 220 символов (${n.text.length})`);
      } else if (n.t === 'choice') {
        if (n.options.length < 1 || n.options.length > 4) p(`в выборе ${n.options.length} пунктов`);
        for (const o of n.options) {
          if (!labels.has(o.label)) p(`метка ${o.label} не найдена`);
          reached.add(o.label);
        }
      } else if (n.t === 'goto') {
        if (!labels.has(n.label)) p(`!goto ${n.label}: метка не найдена`);
        reached.add(n.label);
      } else if (n.t === 'label') {
        const prev = d.nodes[i - 1];
        if (prev && prev.t !== 'goto' && prev.t !== 'choice') reached.add(n.name);
      } else if (n.t === 'next') {
        if (!ids.has(n.id) && !dialogs.some((x) => x.id === n.id)) p(`!next ${n.id}: диалог не найден`);
      } else if (n.t === 'effect') {
        const e = n.effect;
        if ((e.type === 'giveItem' || e.type === 'takeItem') && !refs.items.includes(e.item)) p(`неизвестный предмет ${e.item}`);
        if (e.type === 'stamp' && !refs.stamps.includes(e.id)) p(`неизвестная печать ${e.id}`);
        if (e.type === 'showGift' && !refs.gifts.includes(e.id)) p(`неизвестный подарок ${e.id}`);
        if (e.type === 'startMinigame' && !refs.minigames.includes(e.id)) p(`неизвестная мини-игра ${e.id}`);
        if ((e.type === 'activateObjective' || e.type === 'completeObjective') && !refs.objectives.includes(e.id)) p(`неизвестная цель ${e.id}`);
        if (e.type === 'addCompanion' && !refs.companions.includes(e.id)) p(`неизвестный спутник ${e.id}`);
        if (e.type === 'unlock' && refs.interactables && !refs.interactables.includes(e.id)) p(`!unlock ${e.id}: интерактив не найден`);
      }
    });
    for (const l of labels) if (!reached.has(l)) p(`метка ${l} недостижима`);
  }
  return out;
}
