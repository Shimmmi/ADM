/** npm run zone:gen — собирает scripts/zones/ZONE_*.ts в src/content/zones/*.json. */
import { readdirSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import type { ZoneDef } from '../src/content/schema';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = join(root, 'scripts', 'zones');
const out = join(root, 'src', 'content', 'zones');
mkdirSync(out, { recursive: true });

const only = process.argv[2];
for (const f of readdirSync(src).filter((x) => /^ZONE_.*\.ts$/.test(x)).sort()) {
  if (only && !f.startsWith(only)) continue;
  const mod = (await import(pathToFileURL(join(src, f)).href)) as { default: ZoneDef };
  const z = mod.default;
  writeFileSync(join(out, `${z.id}.json`), JSON.stringify(z, null, 1) + '\n');
  console.log(`zone:gen ${z.id}: ${z.props.length} props, ${z.interactables.length} interactables, ${z.npcs.length} npcs`);
}
