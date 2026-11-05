/**
 * MG_LANTERNS (CH06): четыре фонаря, мотив короткий-длинный-длинный-короткий каждые 8 с.
 *
 * Длительности фонарей (клавиши 1–4): длинный, короткий, длинный, короткий.
 * Верна любая последовательность, где длительности дают этот мотив и каждый фонарь
 * зажжён один раз. Песня показывает один такой порядок: 2 → 1 → 3 → 4.
 */
import type { Minigame, MinigameCtx, MinigameResult } from './types';
import { MgPanel } from './types';
import { el } from '../ui/dom';

export const LANTERNS = [
  { len: 'long', freq: 349.2 },
  { len: 'short', freq: 523.3 },
  { len: 'long', freq: 440 },
  { len: 'short', freq: 659.3 },
] as const;

export const MOTIF = ['short', 'long', 'long', 'short'] as const;

/** Индексы фонарей (0 = клавиша 1), которые поёт мотив. */
export const SONG_ORDER = [1, 0, 2, 3] as const;

const SHORT = 0.2;
const LONG = 0.7;
const GAP = 0.28;
const LEAD = 0.4;
const PERIOD = 8;

export function acceptLantern(index: number, step: number, used: ReadonlySet<number>): boolean {
  const len = LANTERNS[index]?.len;
  const want = MOTIF[step];
  if (!len || !want || used.has(index)) return false;
  return len === want;
}

function buildBeats(): { at: number; idx: number; dur: number }[] {
  let t = LEAD;
  return SONG_ORDER.map((idx) => {
    const dur = LANTERNS[idx].len === 'short' ? SHORT : LONG;
    const beat = { at: t, idx, dur };
    t += dur + GAP;
    return beat;
  });
}

const word = (len: 'short' | 'long'): string => (len === 'short' ? 'короткий' : 'длинный');

export class Lanterns implements Minigame {
  run(ctx: MinigameCtx): Promise<MinigameResult> {
    return new Promise((resolve) => {
      const lit = new Set<number>();
      let selected = 0;
      let settled = false;
      let acc = 0;
      let cyc = -1;
      let mask = 0;
      const beats = buildBeats();
      const buttons = LANTERNS.map((L, i) => el('button', {
        class: 'btn', type: 'button', onclick: () => push(i),
      }, `${i + 1}. ${word(L.len)}`));

      const paint = (singing: number) => {
        buttons.forEach((b, i) => {
          const on = lit.has(i);
          const sel = i === selected;
          const sing = i === singing;
          b.style.outline = sel || sing ? '2px solid var(--gold)' : '2px solid transparent';
          b.style.background = on ? 'rgba(143,227,165,.4)' : sing ? 'rgba(255,217,135,.28)' : '';
        });
      };

      const panel = new MgPanel(ctx, 'Фонари паучих', 'Слушай мотив каждые 8 секунд: короткий — длинный — длинный — короткий. Зажги фонари с такими же голосами. 1–4 или W/S и E.', (a) => {
        if (a === 'escape') return false;
        if (a === 'slot1') push(0);
        else if (a === 'slot2') push(1);
        else if (a === 'slot3') push(2);
        else if (a === 'slot4') push(3);
        else if (a === 'up') { selected = (selected + 3) % 4; ctx.sfx('click'); paint(-1); }
        else if (a === 'down') { selected = (selected + 1) % 4; ctx.sfx('click'); paint(-1); }
        else if (a === 'interact') push(selected);
        return true;
      });
      panel.body.append(el('div', { class: 'choices', style: 'grid-template-columns:repeat(4,1fr)' }, ...buttons));
      ctx.cam.focus = ctx.zone.interactables.get('OBJ_LANTERN_ALTAR')?.pos ?? null;
      paint(-1);
      panel.setStatus('Слушай паучих. Потом зажигай.');

      const finish = (res: MinigameResult) => {
        if (settled) return;
        settled = true;
        offFrame();
        offEsc();
        panel.close();
        ctx.cam.focus = null;
        resolve(res);
      };
      panel.onSkip = () => finish('skipped');
      const offEsc = ctx.input.onAction((a) => {
        if (a !== 'escape') return;
        finish('cancelled');
        return true;
      });

      const replay = () => {
        acc = (Math.max(cyc, 0) + 1) * PERIOD;
      };

      const push = (index: number) => {
        if (settled || index < 0 || index >= LANTERNS.length) return;
        const step = lit.size;
        if (!acceptLantern(index, step, lit)) {
          const n = panel.fail();
          lit.clear();
          ctx.sfx('error');
          panel.setStatus(n >= 3
            ? 'Мимо. Паучихи поют сначала. Штрафа нет — можно пропустить.'
            : 'Мимо. Паучихи поют сначала. Штрафа нет.');
          replay();
          paint(-1);
          return;
        }
        lit.add(index);
        const L = LANTERNS[index];
        ctx.ping(L.freq, 0.1, L.len === 'short' ? SHORT : LONG);
        if (lit.size === MOTIF.length) {
          ctx.sfx('success');
          panel.setStatus('Фонари запели в лад.');
          finish('done');
          return;
        }
        const heard = [...lit].map((i) => word(LANTERNS[i].len)).join(' — ');
        panel.setStatus(`Горит: ${heard}`);
        paint(-1);
      };

      const offFrame = ctx.onFrame((dt) => {
        if (settled) return;
        acc += dt;
        const next = Math.floor(acc / PERIOD);
        const local = acc - next * PERIOD;
        if (next !== cyc) {
          cyc = next;
          mask = 0;
        }
        let singing = -1;
        beats.forEach((b, i) => {
          if ((mask & (1 << i)) === 0 && local >= b.at) {
            mask |= 1 << i;
            const L = LANTERNS[b.idx];
            ctx.ping(L.freq, 0.07, b.dur);
          }
          if (local >= b.at && local < b.at + b.dur) singing = b.idx;
        });
        paint(singing);
      });
    });
  }
}
