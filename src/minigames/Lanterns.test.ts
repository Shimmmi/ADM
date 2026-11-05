import { describe, expect, it } from 'vitest';
import { acceptLantern, MOTIF, SONG_ORDER } from './Lanterns';

function play(order: readonly number[]): boolean {
  const used = new Set<number>();
  if (order.length !== MOTIF.length) return false;
  return order.every((index, step) => {
    if (!acceptLantern(index, step, used)) return false;
    used.add(index);
    return true;
  });
}

describe('MG_LANTERNS motif', () => {
  it('принимает порядок песни 2-1-3-4', () => {
    expect(play(SONG_ORDER)).toBe(true);
  });

  it('принимает другую перестановку с тем же мотивом', () => {
    expect(play([1, 2, 0, 3])).toBe(true);
    expect(play([3, 0, 2, 1])).toBe(true);
  });

  it('отклоняет прямой ряд и повтор фонаря', () => {
    expect(play([0, 1, 2, 3])).toBe(false);
    expect(play([1, 0, 0, 3])).toBe(false);
  });
});
