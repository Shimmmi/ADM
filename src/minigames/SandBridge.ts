/**
 * MG_SAND_BRIDGE (CH04): четыре камня в порядке «ветер, песок, вода, небо».
 * Кнопки перемешаны; клавиши 1–4 — это слоты кнопок. Ошибка сбрасывает ряд.
 */
import type { Minigame, MinigameCtx, MinigameResult } from './types';
import { MgPanel } from './types';
import { el } from '../ui/dom';

const ORDER = ['ветер', 'песок', 'вода', 'небо'] as const;

function shuffle<T>(src: readonly T[]): T[] {
  const a = [...src];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const t = a[i];
    a[i] = a[j]!;
    a[j] = t!;
  }
  return a;
}

export class SandBridge implements Minigame {
  run(ctx: MinigameCtx): Promise<MinigameResult> {
    return new Promise((resolve) => {
      const symbols = shuffle(ORDER);
      const placed: string[] = [];
      let settled = false;

      const slots = ORDER.map(() => el('div', { class: 'btn', style: 'flex:1;text-align:center' }, '·'));
      const buttons = symbols.map((name, i) => el('button', {
        class: 'btn', type: 'button', onclick: () => pick(i),
      }, `${i + 1}. ${name[0]!.toUpperCase()}${name.slice(1)}`));

      const panel = new MgPanel(
        ctx,
        'Мост через Текучие Пески',
        'Порядок: ветер, песок, вода, небо. Клавиши 1–4 или кнопки.',
        (a) => {
          const idx = a === 'slot1' ? 0 : a === 'slot2' ? 1 : a === 'slot3' ? 2 : a === 'slot4' ? 3 : -1;
          if (idx >= 0) pick(idx);
          return true;
        },
      );
      panel.body.append(el('div', { class: 'row' }, ...slots), el('div', { class: 'choices' }, ...buttons));

      const paint = () => {
        slots.forEach((s, i) => { s.textContent = placed[i] ?? '·'; });
      };
      const finish = (res: MinigameResult) => {
        if (settled) return;
        settled = true;
        panel.close();
        resolve(res);
      };
      panel.onSkip = () => finish('skipped');

      const pick = (i: number) => {
        if (settled) return;
        const name = symbols[i];
        const btn = buttons[i];
        if (!name || !btn || btn.disabled) return;
        if (name === ORDER[placed.length]) {
          placed.push(name);
          btn.disabled = true;
          paint();
          ctx.sfx('success');
          if (placed.length === ORDER.length) {
            panel.setStatus('Камни встали. Река затихла.');
            finish('done');
          }
          return;
        }
        ctx.sfx('error');
        placed.length = 0;
        buttons.forEach((b) => { b.disabled = false; });
        paint();
        panel.fail();
        panel.setStatus('Ша молчит. Значит, не так.');
      };
    });
  }
}
