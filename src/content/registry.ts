/** Реестр идентификаторов — README §4 (единственный источник истины в коде). */
import type { ChapterId } from './schema';

export const CHAPTERS: { id: ChapterId; zone: string; title: string; gift: string | null; stamp: string | null }[] = [
  { id: 'CH00', zone: 'ZONE_WORKSHOP', title: 'Мастерская', gift: null, stamp: null },
  { id: 'CH01', zone: 'ZONE_TAIGA', title: 'Тайга', gift: 'G01', stamp: 'S01' },
  { id: 'CH02', zone: 'ZONE_PASS', title: 'Перевал', gift: 'G02', stamp: 'S02' },
  { id: 'CH03', zone: 'ZONE_BAIKAL', title: 'Байкал', gift: 'G03', stamp: 'S03' },
  { id: 'CH04', zone: 'ZONE_TEA_ROAD', title: 'Чайный путь', gift: 'G04', stamp: 'S04' },
  { id: 'CH05', zone: 'ZONE_FLAME', title: 'Пылающие горы', gift: 'G05', stamp: 'S05' },
  { id: 'CH06', zone: 'ZONE_SPIDER_CAVE', title: 'Пещера Паутины', gift: 'G06', stamp: 'S06' },
  { id: 'CH07', zone: 'ZONE_MARKET', title: 'Рынок у Врат', gift: 'G07', stamp: 'S07' },
  { id: 'CH08', zone: 'ZONE_FOOTHILLS', title: 'Лесистые предгорья', gift: 'G00', stamp: 'S08' },
];

export const ZONE_IDS = CHAPTERS.map((c) => c.zone);
export const GIFT_IDS = ['K0', 'G00', 'G01', 'G02', 'G03', 'G04', 'G05', 'G06', 'G07'];
export const STAMP_IDS = ['S01', 'S02', 'S03', 'S04', 'S05', 'S06', 'S07', 'S08'];

/** README §4.4 + CONFLICTS C01 (БАЙЛУН — только ремарки). */
export const SPEAKERS: Record<string, string> = {
  'ДМ': 'Дед Мороз',
  'СУНЬ': 'Сунь Укун',
  'БАЦЗЕ': 'Чжу Бацзе',
  'ША': 'Ша Сэн',
  'ДРАКОН': 'Дух Байкала',
  'НЕРПА': 'Нерпа',
  'ЛЕШИЙ': 'Леший',
  'КАРАВАНЩИК': 'Алтан',
  'КНЯГИНЯ': 'Княгиня Железный Веер',
  'ПАУЧИХА': 'Паучья старшая',
  'ТОРГОВЕЦ': 'Господин Лян',
  'МАСТЕР': 'Мастер Ху',
  'ОТШЕЛЬНИК': 'Старец Гор',
  'ПИСЬМО': 'Канцелярия Тайных Дедов Морозов',
  'ГОЛОС': '',
  'БАЙЛУН': 'Бай-Лун',
};

export const COMPANIONS = ['СУНЬ', 'БАЦЗЕ', 'ША', 'БАЙЛУН'];

export const MINIGAMES = ['MG_PELMENI', 'MG_THIN_ICE', 'MG_SAND_BRIDGE', 'MG_FIRE_FAN', 'MG_LANTERNS', 'MG_BARGAIN', 'MG_PHOTO'];

export const EGGS = Array.from({ length: 12 }, (_, i) => `EGG${String(i + 1).padStart(2, '0')}`);

/** События, которые производит не DLG, а код (UI, мини-игры). Остальные event: должны иметь производителя в JSON зон. */
export const CODE_EVENTS = [...MINIGAMES.map((m) => `${m}_DONE`), 'PHOTO_DEVELOPED'];
