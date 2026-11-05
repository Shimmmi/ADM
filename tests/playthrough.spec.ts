import { test, expect, type Page } from '@playwright/test';
import { act, boot, drain, noErrors, state, type AdmWindow } from './helpers';

test.setTimeout(30 * 60_000);

const adm = (page: Page) => ({
  eval: <T>(fn: (a: AdmWindow['__adm']) => T) => page.evaluate(`(${fn.toString()})(window.__adm)`) as Promise<T>,
});

async function waitZone(page: Page, zone: string): Promise<void> {
  await page.waitForFunction((z) => (window as unknown as AdmWindow).__adm.state().zone === z, zone, { timeout: 120_000 });
  await drain(page);
}

async function walkTo(page: Page, x: number, z: number): Promise<void> {
  await page.evaluate(([px, pz]) => (window as unknown as AdmWindow).__adm.goto(px!, pz!), [x, z] as const);
  await page.waitForTimeout(350);
  await drain(page);
}

const finaleShown = (page: Page) => page.getByRole('button', { name: 'Титры' }).count().then((n) => n > 0);

/**
 * Проходит главу, пользуясь только видимым контентом зоны: NPC, интерактивы (E, предмет, посох),
 * точки способностей, триггеры. Падает, если полный круг ничего не изменил.
 */
async function explore(page: Page, screenshot: string): Promise<void> {
  const a = adm(page);
  const start = await state(page);
  const snap = async () => {
    const s = await state(page);
    return JSON.stringify([s.zone, s.chapter, Object.keys(s.flags).sort(), s.items, s.objectives, s.companions]);
  };
  let first = true;
  for (let round = 0; round < 12; round++) {
    const before = await snap();
    const t = await a.eval((x) => x.targets());
    const s = await state(page);
    const spawn = await a.eval((x) => x.game.zone.def.spawns.default as [number, number, number]);
    const done = async () => (await state(page)).chapter !== start.chapter || (await finaleShown(page));

    for (const id of t.npcs) { await act(page, id); if (await done()) break; }
    for (const o of t.objs) {
      if (await done()) break;
      await act(page, o.id);
      const hb = (await state(page) as unknown as { hotbar: (string | null)[] }).hotbar;
      if (o.useItem && hb.includes(o.useItem)) await act(page, o.id, o.useItem);
      if (o.freezes && hb.includes('ITM_STAFF')) await act(page, o.id, 'ITM_STAFF');
    }
    for (const ap of t.abilities) {
      if (await done()) break;
      await walkTo(page, ap.x, ap.z);
      await a.eval((x) => x.ability());
      await page.waitForTimeout(2200);
      await drain(page);
    }
    for (const tr of t.triggers) {
      if (await done()) break;
      await walkTo(page, tr.x, tr.z);
      await walkTo(page, spawn[0], spawn[2]);
    }
    if (first) { await page.screenshot({ path: `test-results/${screenshot}.png` }); first = false; }
    if (await done()) return;
    if ((await snap()) === before) {
      const now = await state(page);
      const active = Object.entries(now.objectives).filter(([, v]) => v === 'active').map(([k]) => k);
      throw new Error(`${s.zone}: круг без прогресса. Активные цели: ${active.join(', ')}; видимые: ${JSON.stringify(t)}`);
    }
  }
  throw new Error(`${start.zone}: глава не завершилась за 12 кругов`);
}

const ROUTE: [string, string][] = [
  ['ZONE_PASS', 'CH02'], ['ZONE_BAIKAL', 'CH03'], ['ZONE_TEA_ROAD', 'CH04'], ['ZONE_FLAME', 'CH05'],
  ['ZONE_SPIDER_CAVE', 'CH06'], ['ZONE_MARKET', 'CH07'], ['ZONE_FOOTHILLS', 'CH08'],
];

test('сквозное прохождение', async ({ page }) => {
  const errors: string[] = [];
  await boot(page, errors);
  await adm(page).eval((x) => x.autoMinigames(true));

  await act(page, 'OBJ_LETTER_DESK');
  await act(page, 'OBJ_CLOSET');
  await act(page, 'OBJ_MITTENS_HOOK');
  await act(page, 'OBJ_ICICLE_GATE', 'ITM_STAFF');
  await act(page, 'OBJ_EXIT_SIGN');
  await waitZone(page, 'ZONE_TAIGA');
  expect((await state(page)).objectives['CH01.O01']).toBe('active');

  await act(page, 'OBJ_FIVE_SEALS_ROCK');
  expect((await state(page)).flags.ch01_met_leshy).toBeUndefined();
  await explore(page, 'ch01');
  expect((await state(page)).companions).toContain('СУНЬ');

  for (const [zone, ch] of ROUTE) {
    await waitZone(page, zone);
    expect((await state(page)).chapter).toBe(ch);
    await page.waitForTimeout(1500);
    await explore(page, ch.toLowerCase());
  }

  await expect(page.getByRole('button', { name: 'Титры' })).toBeVisible({ timeout: 60_000 });
  const s = await state(page);
  expect(s.stamps).toHaveLength(8);
  await page.screenshot({ path: 'test-results/finale.png' });
  noErrors(errors);
});
