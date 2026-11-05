import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import YAML from 'yaml';

export interface RawGift {
  id: string;
  chapter: string;
  stamp?: string;
  title: string;
  priority: string;
  kind: string;
  made_by: string;
  status: string;
  est_rub: [number, number, number];
  envelope_label?: string;
  unlock?: { mode: 'soft' | 'hard' | 'off'; code: string; hint: string; skip_after_sec?: number };
  reveal?: { title: string; text: string; image: string };
  note_on_paper?: string;
  alt_if_over_budget?: string;
}

export interface RawGifts {
  meta: {
    schema: number;
    currency: string;
    budget_cap: number;
    start_gate: { enabled: boolean; mode: 'soft' | 'hard' | 'off'; phrase: string; hint: string; skip_after_sec?: number };
  };
  gifts: RawGift[];
}

export function readGiftsYaml(root: string): RawGifts {
  const md = readFileSync(join(root, 'docs/03_GIFTS.md'), 'utf8');
  const m = /```yaml data:gifts\r?\n([\s\S]*?)```/.exec(md);
  if (!m) throw new Error('03_GIFTS.md: блок ```yaml data:gifts не найден');
  return YAML.parse(m[1]) as RawGifts;
}

/** Статьи бюджета вне блока (03_GIFTS §3: внешняя упаковка + доставка, «вероятно»). */
export function extraBudgetLikely(root: string): number {
  const md = readFileSync(join(root, 'docs/03_GIFTS.md'), 'utf8');
  let sum = 0;
  for (const re of [/^\|\s*11\s*\|[^|]*\|\s*[\d\s]+\|\s*([\d\s]+)\|/m, /^\|\s*12\s*\|[^|]*\|\s*[\d\s]+\|\s*([\d\s]+)\|/m]) {
    const m = re.exec(md);
    if (m) sum += Number(m[1].replace(/\s/g, ''));
  }
  return sum;
}
