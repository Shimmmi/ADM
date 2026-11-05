export const CONFIG = {
  title: 'Анонимный Дед Мороз: Путь к Тысяче Вершин',
  recipient: { address: 'внучок' },
  /** Соль для хэшей кодов конвертов (TECH §11.1). */
  codeSalt: 'adm-expedition-2026',
  saveKey: 'adm.save.v1',
  debugToken: (import.meta.env?.VITE_DEBUG_TOKEN as string | undefined) ?? '',
  trialsStart: 81,
  player: { walk: 4.5, run: 7, radius: 0.45 },
  camera: { distMin: 6, distMax: 9, pitchMin: 15, pitchMax: 70 },
  fixedStep: 1 / 60,
  maxDelta: 0.05,
};
