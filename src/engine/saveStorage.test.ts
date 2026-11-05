import { describe, expect, it } from 'vitest';
import { exportCode, importCode, migrate } from './saveStorage';
import { freshState } from '../gameplay/GameState';

describe('save', () => {
  it('export/import roundtrip', async () => {
    const s = freshState();
    s.chapter = 'CH03';
    s.zone = 'ZONE_BAIKAL';
    s.flags.ch03_met_nerpa = true;
    s.items.ITM_ICE_SHARD = 2;
    const code = await exportCode(s);
    expect(code.startsWith('ADM1.')).toBe(true);
    const back = await importCode(code);
    expect(back?.chapter).toBe('CH03');
    expect(back?.items.ITM_ICE_SHARD).toBe(2);
    expect(back?.flags.ch03_met_nerpa).toBe(true);
  });

  it('rejects garbage and unknown ids', async () => {
    expect(await importCode('hello')).toBeNull();
    expect(migrate({ v: 2 })).toBeNull();
    expect(migrate({ ...freshState(), chapter: 'CH99' })).toBeNull();
    const m = migrate({ ...freshState(), items: { NOPE: 1, ITM_STAFF: 1 } });
    expect(m?.items).toEqual({ ITM_STAFF: 1 });
  });
});
