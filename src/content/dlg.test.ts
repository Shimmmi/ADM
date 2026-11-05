import { describe, expect, it } from 'vitest';
import { parseStory, validateDialogs, type DlgRefs } from './dlg';

const refs: DlgRefs = {
  speakers: ['ДМ', 'ГОЛОС'],
  items: ['ITM_A'],
  stamps: ['S01'],
  gifts: ['G01'],
  minigames: ['MG_X'],
  objectives: ['CH00.O01'],
  companions: ['СУНЬ'],
  eventProducers: ['MG_X_DONE'],
};

const md = (body: string) => '```dlg\n' + body + '\n```\n';

describe('DLG parser', () => {
  it('parses lines, choices, labels and effects', () => {
    const { dialogs, errors } = parseStory(md(`@dialog CH00.D01
@trigger interact:OBJ_A
@requires item:ITM_A>=2
@repeat once
ДМ: Привет, {{kid}}.
? Что?
- Да -> A
- Нет -> B
:A
!give ITM_A 2
!goto END
:B
!stamp S01
:END
!obj CH00.O01 done
@end`));
    expect(errors).toEqual([]);
    const d = dialogs[0];
    expect(d.repeat).toBe('once');
    expect(d.requires).toEqual([{ item: 'ITM_A', count: 2 }]);
    expect(d.nodes[1]).toMatchObject({ t: 'choice', options: [{ label: 'A' }, { label: 'B' }] });
    expect(validateDialogs(dialogs, refs)).toEqual([]);
  });

  it('reports unknown speaker, missing label and unknown item', () => {
    const { dialogs } = parseStory(md(`@dialog CH00.D02
@trigger event:NOPE
КТО: ой
!give ITM_Z
!goto MISSING
@end`));
    const problems = validateDialogs(dialogs, refs).join('\n');
    expect(problems).toMatch(/неизвестный спикер КТО/);
    expect(problems).toMatch(/ITM_Z/);
    expect(problems).toMatch(/MISSING/);
    expect(problems).toMatch(/event:NOPE/);
  });

  it('requires a caller for chain dialogs', () => {
    const { dialogs } = parseStory(md(`@dialog CH00.D03
@trigger chain
ДМ: один
@end`));
    expect(validateDialogs(dialogs, refs).join()).toMatch(/chain/);
  });
});
