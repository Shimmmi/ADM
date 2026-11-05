import type { ItemDef } from './schema';

/** README §4.2–4.3. Категория определяет хотбар (tool), мешок (bag) или ключевые (key). */
export const ITEMS: ItemDef[] = [
  { id: 'ITM_STAFF', name: 'Посох', desc: 'Волшебный посох Деда Мороза. Морозит, растапливает, светит.', category: 'tool', icon: 'staff' },
  { id: 'ITM_MITTENS', name: 'Варежки', desc: 'Связала Снегурочка. Из шерсти особо упрямой овцы.', category: 'tool', icon: 'mittens' },
  { id: 'ITM_BANANA_FAN', name: 'Банановый веер', desc: 'Веер Княгини. Укрощает пламя.', category: 'tool', icon: 'fan' },
  { id: 'ITM_LANTERN_OIL', name: 'Масло для фонарей', desc: 'Пахнет орехами и терпением.', category: 'tool', icon: 'oil' },
  { id: 'ITM_KITE', name: 'Воздушный змей', desc: 'Целый. Только обиженный.', category: 'tool', icon: 'kite' },

  { id: 'ITM_FLOUR', name: 'Мука', desc: 'С заброшенной мельницы.', category: 'bag', icon: 'flour', maxStack: 1 },
  { id: 'ITM_MEAT', name: 'Мясо', desc: 'С охотничьей заимки.', category: 'bag', icon: 'meat', maxStack: 1 },
  { id: 'ITM_ONION', name: 'Лук', desc: 'С огорода у харчевни.', category: 'bag', icon: 'onion', maxStack: 1 },
  { id: 'ITM_SPICE', name: 'Пряность', desc: 'Лавровый лист с утёса.', category: 'bag', icon: 'spice', maxStack: 1 },
  { id: 'ITM_ICE_SHARD', name: 'Осколок льда', desc: 'Байкальский. Не тает в кармане.', category: 'bag', icon: 'shard', maxStack: 3 },
  { id: 'ITM_TEA_CHEST', name: 'Чайный ящик', desc: 'Из каравана Алтана.', category: 'bag', icon: 'tea', maxStack: 3 },

  { id: 'KEY_CAMERA_BODY', name: 'Корпус «Зенита»', desc: 'Тяжёлый, как валенок.', category: 'key', icon: 'camera_body' },
  { id: 'KEY_SEAL_W', name: 'Белая печать', desc: 'Печать светлой поляны.', category: 'key', icon: 'seal_w' },
  { id: 'KEY_SEAL_U', name: 'Синяя печать', desc: 'Печать пруда.', category: 'key', icon: 'seal_u' },
  { id: 'KEY_SEAL_B', name: 'Чёрная печать', desc: 'Печать бурелома.', category: 'key', icon: 'seal_b' },
  { id: 'KEY_SEAL_R', name: 'Красная печать', desc: 'Печать костровища.', category: 'key', icon: 'seal_r' },
  { id: 'KEY_SEAL_G', name: 'Зелёная печать', desc: 'Печать лесной тропы.', category: 'key', icon: 'seal_g' },
  { id: 'KEY_PASSPORT', name: 'Дорожная грамота', desc: 'Восемь мест под печати экспедиции.', category: 'key', icon: 'passport' },
  { id: 'KEY_LENS', name: 'Линза', desc: 'Держит всё, что хочешь запомнить.', category: 'key', icon: 'lens' },
  { id: 'KEY_FILM', name: 'Плёнка', desc: 'Хранит свет и не боится жара.', category: 'key', icon: 'film' },
  { id: 'KEY_STRAP', name: 'Шёлковый ремешок', desc: 'Самый прочный на свете.', category: 'key', icon: 'strap' },
  { id: 'KEY_TRIPOD', name: 'Штатив', desc: 'Трёхногий, как три мудреца.', category: 'key', icon: 'tripod' },
  { id: 'KEY_GATE_PASS', name: 'Пропуск на Врата', desc: 'Господин Лян отдал себе в убыток.', category: 'key', icon: 'pass' },
  { id: 'KEY_CAMERA', name: 'Камера «Зенит»', desc: 'Собрана. Готова снимать.', category: 'key', icon: 'camera' },
];

export const ITEM_MAP: Record<string, ItemDef> = Object.fromEntries(ITEMS.map((i) => [i.id, i]));

/** Посох в слоте 1 с самого начала (README §4.3). */
export const START_ITEMS: Record<string, number> = { ITM_STAFF: 1 };
