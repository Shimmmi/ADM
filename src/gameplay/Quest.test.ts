import { describe, expect, it } from 'vitest';
import { EventBus } from '../engine/EventBus';
import { Quest, type DirectorPort } from './Quest';
import { freshState } from './GameState';
import { CHAPTER_DEFS } from '../content/chapters';
import type { DialogDef } from '../content/schema';

function setup(dialogs: DialogDef[] = []) {
  const bus = new EventBus();
  const q = new Quest(freshState(), bus, CHAPTER_DEFS, dialogs);
  const calls: string[] = [];
  const dir: DirectorPort = {
    enqueueDialog: (id) => calls.push(`dialog:${id}`),
    enqueueGift: (id) => calls.push(`gift:${id}`),
    enqueueMinigame: (id) => calls.push(`mg:${id}`),
    chapterComplete: () => calls.push('chapter'),
    teleport: () => calls.push('tp'),
  };
  q.director = dir;
  return { q, bus, calls };
}

const dlg = (id: string, trigger: string, extra: Partial<DialogDef> = {}): DialogDef => ({
  id, trigger, priority: 0, requires: [], repeat: 'always', nodes: [], order: 0, ...extra,
});

describe('conditions', () => {
  it('evaluates flags, items, objectives, all/any', () => {
    const { q } = setup();
    q.apply({ type: 'setFlag', flag: 'a' });
    q.give('ITM_ICE_SHARD', 2);
    q.apply({ type: 'activateObjective', id: 'CH00.O01' });
    expect(q.check({ flag: 'a' })).toBe(true);
    expect(q.check({ notFlag: 'a' })).toBe(false);
    expect(q.check({ item: 'ITM_ICE_SHARD', count: 2 })).toBe(true);
    expect(q.check({ item: 'ITM_ICE_SHARD', count: 3 })).toBe(false);
    expect(q.check({ objective: 'CH00.O01', state: 'active' })).toBe(true);
    expect(q.check({ all: [{ flag: 'a' }, { notFlag: 'b' }] })).toBe(true);
    expect(q.check({ any: [{ flag: 'b' }, { flag: 'zzz' }] })).toBe(false);
  });
});

describe('effects', () => {
  it('give is idempotent for keys and capped by maxStack', () => {
    const { q } = setup();
    q.give('KEY_LENS');
    q.give('KEY_LENS');
    expect(q.count('KEY_LENS')).toBe(1);
    q.give('ITM_ICE_SHARD', 5);
    expect(q.count('ITM_ICE_SHARD')).toBe(3);
  });

  it('tools go to the hotbar and leave it when taken', () => {
    const { q } = setup();
    q.give('ITM_MITTENS');
    expect(q.state.hotbar).toEqual(['ITM_STAFF', 'ITM_MITTENS', null, null]);
    q.take('ITM_MITTENS');
    expect(q.state.hotbar).toEqual(['ITM_STAFF', null, null, null]);
  });

  it('if-effect and blocking effects reach the director', () => {
    const { q, calls } = setup();
    q.run([
      { type: 'if', cond: { flag: 'x' }, then: [{ type: 'showGift', id: 'G01' }], else: [{ type: 'startMinigame', id: 'MG_PELMENI' }] },
      { type: 'completeChapter' },
    ]);
    expect(calls).toEqual(['mg:MG_PELMENI', 'chapter']);
  });

  it('counters auto-complete objectives', () => {
    const { q } = setup();
    q.state.chapter = 'CH03';
    q.apply({ type: 'activateObjective', id: 'CH03.O02' });
    q.give('ITM_ICE_SHARD', 2);
    expect(q.state.objectives['CH03.O02']).toBe('active');
    q.give('ITM_ICE_SHARD');
    expect(q.state.objectives['CH03.O02']).toBe('done');
  });

  it('emit triggers event dialogs', () => {
    const { q, calls } = setup([dlg('CH02.D03', 'event:MG_PELMENI_DONE')]);
    q.apply({ type: 'emit', event: 'MG_PELMENI_DONE' });
    expect(calls).toEqual(['dialog:CH02.D03']);
  });
});

describe('dialog selection', () => {
  it('picks highest priority, then file order, skips played once', () => {
    const { q } = setup([
      dlg('CH07.D09', 'npc:NPC_MASTER_HU', { priority: 0, order: 3 }),
      dlg('CH07.D02', 'npc:NPC_MASTER_HU', { priority: 10, order: 1, repeat: 'once' }),
      dlg('CH07.D06', 'npc:NPC_MASTER_HU', { priority: 20, order: 2, requires: [{ item: 'ITM_KITE', count: 1 }] }),
    ]);
    expect(q.findDialog('npc:NPC_MASTER_HU')?.id).toBe('CH07.D02');
    q.markPlayed('CH07.D02');
    expect(q.findDialog('npc:NPC_MASTER_HU')?.id).toBe('CH07.D09');
    q.give('ITM_KITE');
    expect(q.findDialog('npc:NPC_MASTER_HU')?.id).toBe('CH07.D06');
  });
});
