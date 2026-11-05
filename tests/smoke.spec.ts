import { test, expect } from '@playwright/test';
import { act, boot, noErrors, state } from './helpers';

test('CH00: мастерская проходится, переход в тайгу', async ({ page }) => {
  const errors: string[] = [];
  await boot(page, errors);
  await page.screenshot({ path: 'test-results/ch00-start.png' });

  await act(page, 'OBJ_CLOSET');
  expect((await state(page)).items.KEY_CAMERA_BODY).toBeUndefined();

  await act(page, 'OBJ_LETTER_DESK');
  await act(page, 'OBJ_CLOSET');
  await act(page, 'OBJ_MITTENS_HOOK');
  let s = await state(page);
  expect(s.items.KEY_CAMERA_BODY).toBe(1);
  expect(s.items.ITM_MITTENS).toBe(1);
  expect(s.objectives['CH00.O04']).toBe('active');

  await act(page, 'OBJ_ICICLE_GATE', 'ITM_STAFF');
  expect((await state(page)).flags.ch00_icicle_melted).toBe(true);

  await act(page, 'OBJ_EXIT_SIGN');
  await page.waitForFunction(() => (window as unknown as { __adm: { state(): { zone: string } } }).__adm.state().zone === 'ZONE_TAIGA', null, { timeout: 90_000 });
  s = await state(page);
  expect(s.chapter).toBe('CH01');
  expect(s.objectives['CH01.O01']).toBe('active');
  await page.waitForTimeout(1500);
  await page.screenshot({ path: 'test-results/ch01-start.png' });
  noErrors(errors);
});
