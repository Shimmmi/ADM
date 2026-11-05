/**
 * check:content — валидатор согласованности (TECH §18).
 * Без флагов: документы, диалоги, зоны, подарки, хотбар, запрещённые слова в исходниках.
 * --dist: дополнительно проверяет собранный dist/ (коды, sourcemap, внешние URL, запрещённые слова).
 */
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseStory, validateDialogs } from '../src/content/dlg';
import { normalizeCode } from '../src/content/codes';
import { CHAPTERS, CODE_EVENTS, COMPANIONS, GIFT_IDS, MINIGAMES, SPEAKERS, STAMP_IDS, ZONE_IDS } from '../src/content/registry';
import { ITEMS, ITEM_MAP, START_ITEMS } from '../src/content/items';
import { CHAPTER_DEFS } from '../src/content/chapters';
import type { Condition, DialogDef, Effect, ZoneDef } from '../src/content/schema';
import { extraBudgetLikely, readGiftsYaml } from './lib/gifts-yaml';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const distMode = process.argv.includes('--dist');
const errors: string[] = [];
const warnings: string[] = [];
const err = (m: string) => errors.push(m);
const warn = (m: string) => warnings.push(m);
const read = (p: string) => readFileSync(join(root, p), 'utf8');

function walk(dir: string, out: string[] = []): string[] {
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

function forEachEffect(effects: Effect[] | undefined, fn: (e: Effect) => void) {
  for (const e of effects ?? []) {
    fn(e);
    if (e.type === 'if') {
      forEachEffect(e.then, fn);
      forEachEffect(e.else, fn);
    }
  }
}

function forEachCond(c: Condition | null | undefined, fn: (c: Condition) => void) {
  if (!c) return;
  fn(c);
  if ('all' in c) c.all.forEach((x) => forEachCond(x, fn));
  if ('any' in c) c.any.forEach((x) => forEachCond(x, fn));
}

/* ---------- 1. Реестр ID во всех документах ---------- */
const docs = {
  readme: read('docs/00_README.md'),
  tech: read('docs/01_TECH_SPEC.md'),
  story: read('docs/02_STORY.md'),
  gifts: read('docs/03_GIFTS.md'),
};
for (const c of CHAPTERS) {
  for (const [name, text] of Object.entries({ readme: docs.readme, story: docs.story })) {
    if (!text.includes(c.id)) err(`реестр: ${c.id} не найден в ${name}`);
    if (!text.includes(c.zone)) err(`реестр: ${c.zone} не найден в ${name}`);
  }
  if (c.gift && !docs.gifts.includes(`id: ${c.gift}`)) err(`реестр: подарок ${c.gift} не найден в 03_GIFTS`);
  if (c.stamp && !docs.gifts.includes(`stamp: ${c.stamp}`)) err(`реестр: печать ${c.stamp} не найдена в 03_GIFTS`);
}
for (const it of ITEMS) if (!docs.readme.includes(it.id) && !it.id.startsWith('KEY_SEAL_')) err(`предмет ${it.id} отсутствует в README §4`);

/* ---------- 2. Главы ---------- */
const objectiveIds: string[] = [];
if (CHAPTER_DEFS.length !== 9) err(`chapters.ts: глав ${CHAPTER_DEFS.length}, ожидается 9`);
for (const ch of CHAPTER_DEFS) {
  const reg = CHAPTERS.find((c) => c.id === ch.id);
  if (!reg) { err(`chapters.ts: неизвестная глава ${ch.id}`); continue; }
  if (reg.zone !== ch.zone) err(`chapters.ts: ${ch.id} зона ${ch.zone} ≠ ${reg.zone}`);
  if ((reg.gift ?? undefined) !== ch.gift) err(`chapters.ts: ${ch.id} подарок ${ch.gift} ≠ ${reg.gift}`);
  if ((reg.stamp ?? undefined) !== ch.stamp) err(`chapters.ts: ${ch.id} печать ${ch.stamp} ≠ ${reg.stamp}`);
  for (const o of ch.objectives) {
    objectiveIds.push(o.id);
    if (!o.id.startsWith(`${ch.id}.O`)) err(`цель ${o.id} не принадлежит ${ch.id}`);
    if (!docs.story.includes(o.id)) err(`цель ${o.id} отсутствует в 02_STORY`);
  }
}

/* ---------- 3. Зоны ---------- */
const zones: ZoneDef[] = [];
for (const zid of ZONE_IDS) {
  const p = join(root, 'src/content/zones', `${zid}.json`);
  if (!existsSync(p)) { warn(`зона ${zid} ещё не создана`); continue; }
  try {
    const z = JSON.parse(readFileSync(p, 'utf8')) as ZoneDef;
    if (z.id !== zid) err(`${zid}.json: id ${z.id}`);
    zones.push(z);
  } catch (e) {
    err(`${zid}.json: ${(e as Error).message}`);
  }
}
const allZonesReady = zones.length === ZONE_IDS.length;
const interactableIds = zones.flatMap((z) => z.interactables.flatMap((i) => (i.trigger ? [i.id, i.trigger] : [i.id])));
const npcIds = zones.flatMap((z) => z.npcs.map((n) => n.id));
const zoneEffects: Effect[] = [];
const zoneConds: Condition[] = [];
for (const z of zones) {
  const seen = new Set<string>();
  for (const i of z.interactables) {
    if (seen.has(i.id)) err(`${z.id}: повтор интерактива ${i.id}`);
    seen.add(i.id);
    if (!/^OBJ_[A-Z0-9_]+$/.test(i.id)) err(`${z.id}: ID ${i.id} не по схеме OBJ_*`);
    zoneEffects.push(...i.effects, ...(i.useItem?.effects ?? []));
    if (i.useItem && !ITEM_MAP[i.useItem.item]) err(`${z.id}/${i.id}: useItem ${i.useItem.item} не найден`);
    forEachCond(i.requires, (c) => zoneConds.push(c));
  }
  for (const t of z.triggers) zoneEffects.push(...t.onEnter);
  for (const list of Object.values(z.events ?? {})) zoneEffects.push(...list);
  for (const i of z.interactables) {
    if (i.hideWhen) zoneConds.push({ flag: i.hideWhen });
    if (i.hiddenUntil && !/^CH\d\d\.O\d\d$/.test(i.hiddenUntil)) zoneConds.push({ flag: i.hiddenUntil });
  }
  for (const n of z.npcs) {
    if (!/^NPC_[A-Z0-9_]+$/.test(n.id)) err(`${z.id}: ID ${n.id} не по схеме NPC_*`);
    if (!n.dialogTrigger.startsWith('npc:')) err(`${z.id}/${n.id}: dialogTrigger ${n.dialogTrigger}`);
  }
}
const flatZoneEffects: Effect[] = [];
forEachEffect(zoneEffects, (e) => flatZoneEffects.push(e));
for (const e of flatZoneEffects) {
  if ((e.type === 'giveItem' || e.type === 'takeItem') && !ITEM_MAP[e.item]) err(`зоны: неизвестный предмет ${e.item}`);
  if ((e.type === 'activateObjective' || e.type === 'completeObjective') && !objectiveIds.includes(e.id)) err(`зоны: неизвестная цель ${e.id}`);
  if (e.type === 'startMinigame' && !MINIGAMES.includes(e.id)) err(`зоны: неизвестная мини-игра ${e.id}`);
  if (e.type === 'unlock' && !interactableIds.includes(e.id) && !npcIds.includes(e.id)) err(`зоны: !unlock ${e.id} не найден`);
  if (e.type === 'stamp' && !STAMP_IDS.includes(e.id)) err(`зоны: печать ${e.id}`);
  if (e.type === 'showGift' && !GIFT_IDS.includes(e.id)) err(`зоны: подарок ${e.id}`);
  if (e.type === 'if') forEachCond(e.cond, (c) => zoneConds.push(c));
}

/* ---------- 4. Диалоги ---------- */
const { dialogs, errors: dlgErrors } = parseStory(docs.story);
for (const e of dlgErrors) err(`DLG ${e.dialog} (строка ${e.line}): ${e.message}`);
const eventProducers = [...CODE_EVENTS, ...flatZoneEffects.filter((e) => e.type === 'emit').map((e) => (e as { event: string }).event)];
const dlgProblems = validateDialogs(dialogs, {
  speakers: Object.keys(SPEAKERS),
  items: ITEMS.map((i) => i.id),
  stamps: STAMP_IDS,
  gifts: GIFT_IDS,
  minigames: MINIGAMES,
  objectives: objectiveIds,
  companions: COMPANIONS,
  eventProducers: allZonesReady ? eventProducers : [...eventProducers, ...dialogs.filter((d) => d.trigger.startsWith('event:')).map((d) => d.trigger.slice(6))],
  interactables: allZonesReady ? interactableIds : undefined,
  npcs: allZonesReady ? npcIds : undefined,
});
dlgProblems.forEach(err);
if (!allZonesReady) warn('не все зоны готовы — проверки interact:/npc:/event: в диалогах ослаблены');
// В частичном режиме проверяем хотя бы триггеры диалогов готовых зон.
if (!allZonesReady) {
  for (const d of dialogs) {
    const [kind, target] = d.trigger.split(':');
    const ch = d.id.slice(0, 4);
    const zone = CHAPTERS.find((c) => c.id === ch)?.zone;
    if (!zones.some((z) => z.id === zone)) continue;
    if (kind === 'interact' && !interactableIds.includes(target)) err(`${d.id}: интерактив ${target} не найден в ${zone}`);
    if (kind === 'npc' && !npcIds.includes(target)) err(`${d.id}: NPC ${target} не найден в ${zone}`);
    if (kind === 'event' && !eventProducers.includes(target)) err(`${d.id}: у event:${target} нет производителя`);
  }
}

/* ---------- 5. Флаги: у каждого @requires flag есть производитель ---------- */
const dlgEffects: Effect[] = dialogs.flatMap((d) => d.nodes.filter((n) => n.t === 'effect').map((n) => (n as { effect: Effect }).effect));
const flagProducers = new Set<string>([
  ...dlgEffects.filter((e) => e.type === 'setFlag').map((e) => (e as { flag: string }).flag),
  ...flatZoneEffects.filter((e) => e.type === 'setFlag').map((e) => (e as { flag: string }).flag),
  ...[...dlgEffects, ...flatZoneEffects].filter((e) => e.type === 'unlock').map((e) => `unlock_${(e as { id: string }).id}`),
  ...MINIGAMES.map((m) => `mg_${m}_done`),
]);
const flagUses: { flag: string; where: string }[] = [];
for (const d of dialogs) for (const r of d.requires) forEachCond(r, (c) => { if ('flag' in c) flagUses.push({ flag: c.flag, where: d.id }); });
for (const c of zoneConds) if ('flag' in c) flagUses.push({ flag: c.flag, where: 'зоны' });
for (const u of flagUses) {
  const ch = u.where.slice(0, 4);
  const zoneReady = zones.some((z) => z.chapter === ch);
  if (!flagProducers.has(u.flag) && (allZonesReady || zoneReady)) err(`${u.where}: у флага ${u.flag} нет производителя`);
}

/* ---------- 6. Хотбар ≤ 4 tool ---------- */
{
  const tools = new Set(Object.keys(START_ITEMS).filter((i) => ITEM_MAP[i]?.category === 'tool'));
  let max = tools.size;
  for (const ch of CHAPTERS) {
    const effs: Effect[] = [];
    for (const d of dialogs.filter((x) => x.id.startsWith(ch.id))) for (const n of d.nodes) if (n.t === 'effect') effs.push(n.effect);
    const z = zones.find((x) => x.chapter === ch.id);
    if (z) forEachEffect([...z.interactables.flatMap((i) => [...i.effects, ...(i.useItem?.effects ?? [])]), ...z.triggers.flatMap((t) => t.onEnter)], (e) => effs.push(e));
    for (const e of effs) {
      if (e.type === 'giveItem' && ITEM_MAP[e.item]?.category === 'tool') tools.add(e.item);
      max = Math.max(max, tools.size);
    }
    for (const e of effs) if (e.type === 'takeItem' && ITEM_MAP[e.item]?.category === 'tool') tools.delete(e.item);
  }
  if (max > 4) err(`хотбар: одновременно ${max} инструментов (> 4)`);
}

/* ---------- 7. Подарки ---------- */
const gifts = readGiftsYaml(root);
{
  const okStatus = ['idea', 'ordered', 'received', 'ready', 'packed'];
  const stamps = new Set<string>();
  const codes = new Map<string, string>();
  let likely = 0;
  for (const g of gifts.gifts) {
    if (!GIFT_IDS.includes(g.id)) err(`03_GIFTS: неизвестный подарок ${g.id}`);
    if (!CHAPTERS.some((c) => c.id === g.chapter)) err(`03_GIFTS: ${g.id} глава ${g.chapter}`);
    const reg = CHAPTERS.find((c) => c.id === g.chapter);
    if (g.id !== 'K0' && reg?.gift !== g.id) err(`03_GIFTS: ${g.id} не совпадает с реестром главы ${g.chapter}`);
    if (g.stamp) {
      if (stamps.has(g.stamp)) err(`03_GIFTS: печать ${g.stamp} повторяется`);
      stamps.add(g.stamp);
      if (reg?.stamp !== g.stamp) err(`03_GIFTS: ${g.id} печать ${g.stamp} ≠ реестр ${reg?.stamp}`);
    }
    if (!okStatus.includes(g.status)) err(`03_GIFTS: ${g.id} status ${g.status}`);
    likely += g.est_rub[1];
    if (g.unlock) {
      const n = normalizeCode(g.unlock.code);
      if (codes.has(n)) err(`03_GIFTS: код ${g.id} совпадает с ${codes.get(n)}`);
      codes.set(n, g.id);
      if (n.length < 3 || n.length > 12) warn(`03_GIFTS: длина кода ${g.id} = ${n.length}`);
    }
  }
  const startN = normalizeCode(gifts.meta.start_gate.phrase);
  if (codes.has(startN)) err(`03_GIFTS: стартовая фраза совпадает с кодом ${codes.get(startN)}`);
  const total = likely + extraBudgetLikely(root);
  if (total > gifts.meta.budget_cap) err(`бюджет: ${total} ₽ > ${gifts.meta.budget_cap} ₽`);

  for (const g of GIFT_IDS.filter((x) => x !== 'K0')) {
    const shown = dlgEffects.filter((e) => e.type === 'showGift' && e.id === g).length + flatZoneEffects.filter((e) => e.type === 'showGift' && e.id === g).length;
    if (shown !== 1) err(`подарок ${g} вызывается ${shown} раз (нужно ровно 1)`);
  }
  for (const s of STAMP_IDS) {
    const n = dlgEffects.filter((e) => e.type === 'stamp' && e.id === s).length + flatZoneEffects.filter((e) => e.type === 'stamp' && e.id === s).length;
    if (n !== 1) err(`печать ${s} ставится ${n} раз (нужно ровно 1)`);
  }
}

/* ---------- 8. Запрещённые слова и приватность ---------- */
const forbidden = existsSync(join(root, 'scripts/forbidden.txt'))
  ? read('scripts/forbidden.txt').split(/\r?\n/).map((s) => s.trim()).filter((s) => s && !s.startsWith('#'))
  : [];
function scanForbidden(files: string[]) {
  for (const f of files) {
    if (!/\.(ts|js|json|html|css|md|txt|svg)$/.test(f)) continue;
    const text = readFileSync(f, 'utf8').toLowerCase();
    for (const w of forbidden) if (text.includes(w.toLowerCase())) err(`запрещённое слово «${w}» в ${relative(root, f)}`);
  }
}
scanForbidden([...walk(join(root, 'src')), ...walk(join(root, 'public')), join(root, 'index.html')]);

/* ---------- 9. dist ---------- */
if (distMode) {
  const dist = join(root, 'dist');
  const files = walk(dist);
  if (!files.length) err('dist/ пуст');
  scanForbidden(files);
  const plain = [...gifts.gifts.filter((g) => g.unlock).map((g) => g.unlock!.code), gifts.meta.start_gate.phrase];
  for (const f of files) {
    const rel = relative(root, f);
    if (f.endsWith('.map')) err(`sourcemap в сборке: ${rel}`);
    if (/\.(md|ts)$/.test(f) && !rel.endsWith('CREDITS.md')) err(`исходник в сборке: ${rel}`);
    if (!/\.(js|css|html|json|txt|svg|md)$/.test(f)) continue;
    // Коды по сценарию совпадают с именами говорящих — имя в "speaker" утечкой не считается.
    const text = readFileSync(f, 'utf8').replace(/\\?"?speaker\\?"?:\s*\\?"[^"\\]*\\?"/g, '');
    for (const code of plain) {
      // Код — обычное слово сюжета; утечка — это отдельный строковый литерал или текст узла, равный коду.
      const re = new RegExp(`(["'\`>])\\s*${code}\\s*\\\\?(["'\`<])`);
      if (re.test(text)) err(`открытый код «${code}» в ${rel}`);
    }
    const urls = text.match(/https?:\/\/[^\s"'`)<]+/g) ?? [];
    for (const u of urls) {
      if (/^https?:\/\/(www\.w3\.org|threejs\.org|github\.com\/mrdoob)/.test(u)) continue;
      if (rel.endsWith('CREDITS.md')) continue;
      err(`внешний URL в ${rel}: ${u}`);
    }
    if (/sourceMappingURL/.test(text)) err(`sourceMappingURL в ${rel}`);
  }
}

for (const w of warnings) console.warn(`WARN  ${w}`);
if (errors.length) {
  for (const e of errors) console.error(`ERROR ${e}`);
  console.error(`check:content — ошибок: ${errors.length}`);
  process.exit(1);
}
console.log(`check:content OK${distMode ? ' (+dist)' : ''} — диалогов ${dialogs.length}, зон ${zones.length}/9, предупреждений ${warnings.length}`);
export type { DialogDef };
