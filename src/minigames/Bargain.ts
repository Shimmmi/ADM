/**
 * MG_BARGAIN (CH07): три раунда торга. Любой итог — успех;
 * флаг bargain_good / bargain_bad влияет на шутки, не на прогресс.
 */
import type { Minigame, MinigameCtx, MinigameResult } from './types';
import { MgPanel } from './types';
import { el } from '../ui/dom';

interface Offer { text: string; good: boolean; }
interface Round { mood: string; offers: Offer[]; }

const ROUNDS: Round[] = [
  {
    mood: 'Лян улыбается. Любит, когда платят сразу.',
    offers: [
      { text: 'Заплачу как скажете', good: true },
      { text: 'Один отдам — два заберу', good: false },
      { text: 'Подождём до снега', good: false },
    ],
  },
  {
    mood: 'Лян мёрзнет и поглядывает на мешок.',
    offers: [
      { text: 'Расскажу анекдот про весы', good: false },
      { text: 'Налью чаю из запаса', good: true },
      { text: 'Поторгуемся ещё час', good: false },
    ],
  },
  {
    mood: 'Лян скучает и хочет закрыть лавку.',
    offers: [
      { text: 'Беру пропуск и не спорю', good: true },
      { text: 'Ещё три раунда, пожалуйста', good: false },
      { text: 'А пельмень в придачу?', good: false },
    ],
  },
];

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

export class Bargain implements Minigame {
  run(ctx: MinigameCtx): Promise<MinigameResult> {
    return new Promise((resolve) => {
      let round = 0;
      let good = 0;
      let choices: Offer[] = [];
      let settled = false;
      const mood = el('div', { class: 'muted', style: 'margin-bottom:6px' });
      const buttons = [0, 1, 2].map((i) => el('button', { class: 'btn', type: 'button', onclick: () => pick(i) }, ''));

      const panel = new MgPanel(ctx, 'Торг за пропуск', 'Три раунда. Клавиши 1–3 или кнопки. Любой итог считается.', (a) => {
        const idx = a === 'slot1' ? 0 : a === 'slot2' ? 1 : a === 'slot3' ? 2 : -1;
        if (idx >= 0) pick(idx);
        return true;
      });
      panel.body.append(mood, el('div', { class: 'choices' }, ...buttons));

      const show = () => {
        const spec = ROUNDS[round];
        if (!spec) return;
        choices = shuffle(spec.offers);
        mood.textContent = spec.mood;
        buttons.forEach((b, i) => {
          const offer = choices[i];
          b.disabled = false;
          b.textContent = offer ? `${i + 1}. ${offer.text}` : '';
        });
      };
      const finish = (res: MinigameResult) => {
        if (settled) return;
        settled = true;
        panel.close();
        resolve(res);
      };
      const mark = (flag: 'bargain_good' | 'bargain_bad') => {
        ctx.quest.apply({ type: 'setFlag', flag });
      };
      panel.onSkip = () => {
        if (!ctx.quest.state.flags.bargain_good && !ctx.quest.state.flags.bargain_bad) mark('bargain_bad');
        finish('skipped');
      };

      const pick = (i: number) => {
        if (settled) return;
        const offer = choices[i];
        if (!offer) return;
        if (offer.good) {
          good++;
          ctx.sfx('success');
          panel.setStatus('Лян кивает. Весы даже не скрипнули.');
        } else {
          ctx.sfx('error');
          panel.setStatus('Лян вздыхает в бороду. Цена стоит на месте.');
        }
        round++;
        if (round >= ROUNDS.length) {
          mark(good >= 2 ? 'bargain_good' : 'bargain_bad');
          finish('done');
          return;
        }
        show();
      };

      show();
      panel.setStatus('Господин Лян ждёт первую цену.');
    });
  }
}
