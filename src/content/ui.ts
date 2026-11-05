/** Тексты интерфейса: 02_STORY.md §8 и бытовые строки экранов. */
export const UI: Record<string, string> = {
  'ui.start.title': 'Анонимный Дед Мороз: Путь к Тысяче Вершин',
  'ui.start.gate': 'Введи слово с открытки',
  'ui.start.skip': 'У меня нет открытки',
  'ui.gift.noenvelope': 'У меня нет конверта',
  'ui.gift.open': 'Достань конверт №{n}',
  'ui.respawn': 'Дед Мороз поскользнулся. Вернёмся на шаг назад.',
  'ui.heat.full': 'Слишком жарко! Дед Мороз потерял сознание от тепла.',
  'ui.mobile.warn': 'Игра рассчитана на компьютер. Открой её на ноутбуке.',
  'ui.save.exported': 'Код прогресса скопирован',

  'ui.start.begin': 'Начать путь',
  'ui.start.continue': 'Продолжить',
  'ui.start.wrong': 'ДМ: Хм. Не то слово. Посмотри на открытку ещё разок.',
  'ui.start.ok': 'ДМ: Ага! Свои. Проходи.',
  'ui.gift.wrong': 'Не то слово. Дед Мороз чешет бороду.',
  'ui.gift.ok': 'ДМ: Ага, значит, посылочка дошла!',
  'ui.gift.next': 'Дальше',
  'ui.gift.check': 'Проверить',
  'ui.gift.placeholder': 'Слово с печати конверта',
  'ui.restart.confirm': 'Начать заново? Прогресс будет сброшен, настройки останутся.',
  'ui.restart': 'Начать заново',
  'ui.ambient.on': '♫ Включить эмбиент',
  'ui.ambient.off': '♫ Выключить эмбиент',
  'ui.save.copy': 'Скопировать код прогресса',
  'ui.save.import': 'Загрузить код прогресса',
  'ui.save.import.ok': 'Прогресс загружен',
  'ui.save.import.bad': 'Код не подошёл',
  'ui.save.nostorage': 'Браузер не даёт сохранять прогресс. Скопируй код прогресса перед уходом.',
  'ui.minigame.skip': 'Пропустить',
  'ui.minigame.skipped': 'ДМ: Ну-ну. Будем считать, что получилось.',
  'ui.loading': 'Дед Мороз собирает мешок…',
  'ui.sleigh.skip': 'Esc — пропустить',
  'ui.journal.tab.goals': 'Цели',
  'ui.journal.tab.bag': 'Мешок',
  'ui.journal.tab.camera': 'Камера и печати',
  'ui.journal.tab.charter': 'Грамота',
  'ui.journal.trials': 'Испытаний осталось: {n}',
  'ui.pause.title': 'Пауза',
  'ui.pause.resume': 'Продолжить',
  'ui.settings.quality': 'Качество',
  'ui.settings.music': 'Музыка',
  'ui.settings.sfx': 'Звуки',
  'ui.settings.reducefx': 'Меньше эффектов',
  'ui.nowebgl': 'Твой браузер не умеет WebGL2, поэтому путь Деда Мороза здесь не покажется. Ничего страшного: открой главную коробку — всё самое важное уже там.',
  'ui.epilogue.title': 'Операция «Экспедиция» выполнена',
  'ui.photo.save': 'Сохранить снимок',
  'ui.photo.credits': 'Титры',
  'ui.photo.caption': 'Лесистые предгорья · Анонимный Дед Мороз',
  'ui.photo.hint': 'F — поднять камеру · мышь — навести · колесо — зум · E — кадр · Esc — выйти',
  'ui.photo.score': 'Кадр: {n} из 100',
  'ui.heat': 'Жар',
  'ui.nopass': 'ДМ: Ну-ну. Рановато. Сначала добудь, чего не хватает.',
};

/** Подставляет `{name}` из vars. Нет ключа — возвращает сам ключ. */
export function t(key: string, vars?: Record<string, string | number>): string {
  let text = UI[key] ?? key;
  if (vars) {
    text = text.replace(/\{([A-Za-z0-9_]+)\}/g, (full, name: string) =>
      name in vars ? String(vars[name]) : full,
    );
  }
  return text;
}

/** 02_STORY.md §6, пять строк титров. */
export const CREDITS_TEXT: string = [
  'Анонимный Дед Мороз: Путь к Тысяче Вершин',
  'Идея и подарок — Анонимный Дед Мороз',
  'Герои вдохновлены классическим романом «Путешествие на Запад»',
  'Звуки и модели — по списку CREDITS',
  'С Новым годом!',
  '',
  'Zendikar Expeditions: экспедиция завершена.',
].join('\n');
