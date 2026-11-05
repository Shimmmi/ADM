import { test, expect, type Page } from '@playwright/test';
import { act, boot, drain, noErrors, state, type AdmWindow } from './helpers';

test.setTimeout(15 * 60_000);

async function waitZone(page: Page, zone: string): Promise<void> {
  await page.waitForFunction((z) => (window as unknown as AdmWindow).__adm.state().zone === z, zone, { timeout: 120_000 });
  await drain(page);
}

async function walkTo(page: Page, x: number, z: number): Promise<void> {
  await page.evaluate(([px, pz]) => (window as unknown as AdmWindow).__adm.goto(px!, pz!), [x, z] as const);
  await page.waitForTimeout(400);
  await drain(page);
}

async function ch00(page: Page): Promise<void> {
  await act(page, 'OBJ_LETTER_DESK');
  await act(page, 'OBJ_CLOSET');
  await act(page, 'OBJ_MITTENS_HOOK');
  await act(page, 'OBJ_ICICLE_GATE', 'ITM_STAFF');
  await act(page, 'OBJ_EXIT_SIGN');
  await waitZone(page, 'ZONE_TAIGA');
}

async function ch01(page: Page): Promise<void> {
  await act(page, 'OBJ_FIVE_SEALS_ROCK');
  expect((await state(page)).flags.ch01_met_leshy).toBeUndefined();
  await act(page, 'NPC_LESHY');
  await act(page, 'OBJ_FIVE_SEALS_ROCK');
  expect((await state(page)).objectives['CH01.O02']).toBe('active');

  await act(page, 'OBJ_ICE_W', 'ITM_STAFF');
  await act(page, 'OBJ_SEAL_W');
  await act(page, 'OBJ_SEAL_U');
  await act(page, 'OBJ_SEAL_B');
  for (const i of [1, 2, 3]) await act(page, `OBJ_FIRE_STONE_${i}`);
  await act(page, 'OBJ_SEAL_R');
  await act(page, 'OBJ_HOLLOW');
  const s = await state(page);
  for (const k of ['W', 'U', 'B', 'R', 'G']) expect(s.items[`KEY_SEAL_${k}`], k).toBe(1);

  await act(page, 'OBJ_FIVE_SEALS_ROCK');
  const s2 = await state(page);
  expect(s2.companions).toContain('СУНЬ');
  expect(s2.flags.ch01_passport_given).toBe(true);
  await walkTo(page, 160, 14);
  await waitZone(page, 'ZONE_PASS');
  expect((await state(page)).chapter).toBe('CH02');
}

test('сквозное прохождение', async ({ page }) => {
  const errors: string[] = [];
  await boot(page, errors);
  await ch00(page);
  await ch01(page);
  await page.waitForTimeout(2000);
  await page.screenshot({ path: 'test-results/ch02-start.png' });
  await page.keyboard.press('KeyJ');
  await page.waitForTimeout(400);
  await page.screenshot({ path: 'test-results/journal.png' });
  await page.keyboard.press('Escape');
  await page.keyboard.press('KeyM');
  await page.waitForTimeout(400);
  await page.screenshot({ path: 'test-results/worldmap.png' });
  await page.keyboard.press('Escape');
  noErrors(errors);
});
