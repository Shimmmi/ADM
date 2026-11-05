/** Экран загрузки, затемнение, модальные окна общего вида. */
import { el } from './dom';
import { t } from '../content/ui';

export class LoadingScreen {
  private root: HTMLElement;
  private bar: HTMLElement;
  private label: HTMLElement;

  constructor(parent: HTMLElement) {
    this.bar = el('div');
    this.label = el('div', { class: 'muted' }, t('ui.loading'));
    this.root = el('div', { class: 'loading hidden' }, el('div', { style: 'text-align:center' }, el('h2', {}, ''), this.label, el('div', { class: 'bar' }, this.bar)));
    parent.append(this.root);
  }

  show(title: string): void {
    (this.root.querySelector('h2') as HTMLElement).textContent = title;
    this.root.classList.remove('hidden', 'fade-out');
    this.progress(0);
  }

  progress(p: number): void {
    this.bar.style.width = `${Math.round(p * 100)}%`;
  }

  async hide(): Promise<void> {
    this.root.classList.add('fade-out');
    await new Promise((r) => setTimeout(r, 500));
    this.root.classList.add('hidden');
  }
}

export class Fade {
  private root = el('div', { class: 'fade' });
  constructor(parent: HTMLElement) {
    parent.append(this.root);
  }
  async to(on: boolean): Promise<void> {
    this.root.classList.toggle('on', on);
    await new Promise((r) => setTimeout(r, 650));
  }
}

export interface ModalButton {
  text: string;
  primary?: boolean;
  onClick: () => void;
}

/** Простое модальное окно; возвращает функцию закрытия. */
export function modal(parent: HTMLElement, title: string, body: (Node | string)[], buttons: ModalButton[]): () => void {
  const back = el('div', { class: 'modal-back interactive' });
  const close = () => back.remove();
  back.append(el('div', { class: 'modal panel', role: 'dialog' },
    el('h2', {}, title),
    ...body,
    el('div', { class: 'row' }, ...buttons.map((b) => el('button', { class: `btn${b.primary ? ' primary' : ''}`, onclick: () => b.onClick() }, b.text)))));
  parent.append(back);
  (back.querySelector('button.primary, button') as HTMLButtonElement | null)?.focus();
  return close;
}
