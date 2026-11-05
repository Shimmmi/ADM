/** Окно раскрытия подарка (TECH §11.3). Мягкий режим никогда не блокирует прогресс. */
import { el, richText } from './dom';
import { stampSvg } from './icons';
import { t } from '../content/ui';
import { hashCode } from '../content/codes';
import type { GiftDef } from '../content/schema';

export interface GiftOutcome {
  unlocked: boolean;
}

export function showGift(parent: HTMLElement, gift: GiftDef, salt: string, alreadyUnlocked: boolean, sfx: (id: string) => void): Promise<GiftOutcome> {
  return new Promise((resolve) => {
    const unlock = gift.unlock;
    const needCode = !!unlock && unlock.mode !== 'off' && !alreadyUnlocked;
    const back = el('div', { class: 'modal-back interactive' });
    const img = el('img', { src: gift.reveal?.image ?? '', alt: '' });
    img.addEventListener('error', () => img.remove());
    const reply = el('div', { class: 'reply', 'aria-live': 'polite' });
    const input = el('input', { type: 'text', placeholder: t('ui.gift.placeholder'), autocomplete: 'off', spellcheck: 'false', 'aria-label': t('ui.gift.placeholder') });
    const checkBtn = el('button', { class: 'btn primary' }, t('ui.gift.check'));
    const nextBtn = el('button', { class: `btn${needCode ? ' hidden' : ' primary'}` }, t('ui.gift.next'));
    const skipBtn = el('button', { class: 'btn hidden' }, t('ui.gift.noenvelope'));
    const hint = el('div', { class: 'muted hidden', style: 'font-size:13px;margin-top:4px' }, unlock?.hint ?? '');
    const stampBox = el('div', { style: 'position:relative;height:0' });
    let unlocked = alreadyUnlocked;
    let wrong = 0;
    let timer = 0;

    const finish = () => {
      clearTimeout(timer);
      back.remove();
      resolve({ unlocked });
    };

    const success = () => {
      unlocked = true;
      reply.textContent = t('ui.gift.ok');
      sfx('stamp');
      if (gift.stamp) stampBox.innerHTML = `<div class="stamp-anim" aria-hidden="true">${stampSvg(gift.stamp, 150)}</div>`;
      codeRow.classList.add('hidden');
      skipBtn.classList.add('hidden');
      nextBtn.classList.remove('hidden');
      nextBtn.classList.add('primary');
      nextBtn.focus();
    };

    const check = async () => {
      if (!unlock || !input.value.trim()) return;
      const h = await hashCode(salt, input.value);
      if (h === unlock.hash) success();
      else {
        wrong++;
        reply.textContent = t('ui.gift.wrong');
        sfx('error');
        if (wrong >= 2) hint.classList.remove('hidden');
      }
    };

    checkBtn.addEventListener('click', () => void check());
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') void check(); });
    nextBtn.addEventListener('click', finish);
    skipBtn.addEventListener('click', finish);

    const codeRow = el('div', { class: `row${needCode ? '' : ' hidden'}` }, input, checkBtn);
    const label = gift.envelopeNo ? t('ui.gift.open', { n: gift.envelopeNo }) : gift.envelopeLabel;
    back.append(el('div', { class: 'modal panel', role: 'dialog', 'aria-label': gift.title },
      stampBox,
      el('div', { class: 'gift-img' }, img),
      el('h2', {}, gift.reveal?.title ?? gift.title),
      el('p', { html: richText(gift.reveal?.text ?? '') }),
      el('p', { style: 'color:var(--gold);font-weight:700' }, label),
      codeRow, hint, reply,
      el('div', { class: 'row' }, nextBtn, skipBtn)));
    parent.append(back);
    if (needCode) {
      input.focus();
      if (unlock!.mode === 'soft') timer = window.setTimeout(() => skipBtn.classList.remove('hidden'), unlock!.skipAfterSec * 1000);
    } else nextBtn.focus();
  });
}
