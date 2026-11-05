/**
 * content:sync — собирает docs/02_STORY.md (DLG) и docs/03_GIFTS.md (data:gifts)
 * в src/content/generated/{dialogs,gifts}.json. Открытые коды в клиент не попадают.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseStory } from '../src/content/dlg';
import { hashCode } from '../src/content/codes';
import { CONFIG } from '../src/app/config';
import type { GiftsData, GiftDef, ChapterId } from '../src/content/schema';
import { readGiftsYaml } from './lib/gifts-yaml';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(root, 'src/content/generated');

async function main() {
  mkdirSync(outDir, { recursive: true });

  const story = readFileSync(join(root, 'docs/02_STORY.md'), 'utf8');
  const { dialogs, errors } = parseStory(story);
  if (errors.length) {
    for (const e of errors) console.error(`DLG ${e.dialog} (строка ${e.line}): ${e.message}`);
    process.exit(1);
  }
  writeFileSync(join(outDir, 'dialogs.json'), JSON.stringify(dialogs, null, 1));

  const raw = readGiftsYaml(root);
  const salt = CONFIG.codeSalt;
  const gifts: GiftDef[] = [];
  for (const g of raw.gifts) {
    if (g.id === 'K0') continue;
    const no = /^№(\d+)/.exec(g.envelope_label ?? '');
    gifts.push({
      id: g.id,
      chapter: g.chapter as ChapterId,
      stamp: g.stamp,
      title: g.title,
      envelopeNo: no ? Number(no[1]) : undefined,
      envelopeLabel: g.envelope_label ?? '',
      unlock: g.unlock
        ? {
            mode: g.unlock.mode,
            hash: await hashCode(salt, g.unlock.code),
            hint: g.unlock.hint,
            skipAfterSec: g.unlock.skip_after_sec ?? 15,
          }
        : undefined,
      reveal: g.reveal,
    });
  }
  const sg = raw.meta.start_gate;
  const data: GiftsData = {
    salt,
    startGate: {
      enabled: sg.enabled,
      mode: sg.mode,
      hash: await hashCode(salt, sg.phrase),
      hint: sg.hint,
      skipAfterSec: sg.skip_after_sec ?? 15,
    },
    gifts,
  };
  writeFileSync(join(outDir, 'gifts.json'), JSON.stringify(data, null, 1));
  console.log(`content:sync — диалогов: ${dialogs.length}, подарков: ${gifts.length}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
