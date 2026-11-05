import { test, expect, type Page } from '@playwright/test';
import { readGiftsYaml } from '../scripts/lib/gifts-yaml';
import { boot, drain, noErrors, state, type AdmWindow } from './helpers';

test.setTimeout(4 * 60_000);

/** Открытые коды берутся из docs/ только на стороне теста — в клиент они не попадают. */
const gifts = readGiftsYaml(process.cwd());
const codeOf = (id: string) => gifts.gifts.find((g) => g.id === id)!.unlock!.code;
const sloppy = (code: string) => ` ${code.toLowerCase().replace(/е/g, 'ё')} `;

async function openGift(page: Page, id: string) {
  await page.evaluate((g) => (window as unknown as AdmWindow).__adm.game.enqueueGift(g), id);
  const modal = page.getByRole('dialog').last();
  await expect(modal.getByRole('textbox')).toBeVisible();
  return modal;
}

test('K0: стартовый замок — неверная фраза, затем верная', async ({ page }) => {
  await page.goto('/');
  const input = page.getByRole('textbox');
  await input.fill('НЕ ТА ФРАЗА');
  await input.press('Enter');
  await expect(page.getByRole('button', { name: /Начать путь/ })).toHaveCount(0);
  await input.fill(sloppy(gifts.meta.start_gate.phrase));
  await input.press('Enter');
  const begin = page.getByRole('button', { name: /Начать путь/ });
  await page.waitForTimeout(500);
  if (await begin.count()) await begin.click();
  await page.waitForFunction(() => {
    const raw = localStorage.getItem('adm.save.v1');
    return !!raw && raw.includes('"startGatePassed":true');
  }, null, { timeout: 60_000 });
});

test('G01–G08: верный код / ошибки и подсказка / нет конверта', async ({ page }) => {
  const errors: string[] = [];
  await boot(page, errors);
  const ids = gifts.gifts.filter((g) => g.id !== 'K0' && g.unlock).map((g) => g.id);
  expect(ids).toHaveLength(8);

  for (const [i, id] of ids.entries()) {
    const modal = await openGift(page, id);
    const input = modal.getByRole('textbox');
    const scenario = i % 3;
    if (scenario === 0) {
      await input.fill(codeOf(id));
      await input.press('Enter');
    } else if (scenario === 1) {
      for (const w of ['НЕТО', 'СОВСЕМНЕТО']) { await input.fill(w); await input.press('Enter'); }
      await expect(modal.getByText(gifts.gifts.find((g) => g.id === id)!.unlock!.hint)).toBeVisible();
      await input.fill(sloppy(codeOf(id)));
      await input.press('Enter');
    } else {
      await modal.getByRole('button', { name: 'У меня нет конверта' }).click({ timeout: 30_000 });
    }
    await page.waitForTimeout(500);
    const next = modal.getByRole('button', { name: 'Дальше' });
    if (scenario !== 2 && (await next.isVisible())) await next.click();
    await drain(page);
    const s = (await state(page)) as unknown as { giftsShown: string[]; giftsUnlocked: string[] };
    expect(s.giftsShown, id).toContain(id);
    if (scenario === 2) expect(s.giftsUnlocked, id).not.toContain(id);
    else expect(s.giftsUnlocked, id).toContain(id);
  }
  noErrors(errors);
});
