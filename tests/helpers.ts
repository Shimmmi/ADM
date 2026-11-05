import { expect, type Page } from '@playwright/test';

export interface AdmWindow {
  __adm: {
    state(): { chapter: string; zone: string; flags: Record<string, true>; items: Record<string, number>; objectives: Record<string, string>; companions: string[]; stamps: string[] };
    give(item: string, n?: number): void;
    flag(name: string): void;
    event(name: string): void;
    interact(id: string, tool?: string): void;
    goto(x: number, z: number): void;
    busy(): boolean;
    chapter(): string;
  };
}

export async function boot(page: Page, errors: string[]): Promise<void> {
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error' && !m.text().startsWith('Failed to load resource')) errors.push(m.text()); });
  page.on('response', (r) => { if (r.status() >= 400) errors.push(`${r.status()} ${r.url()}`); });
  await page.goto('/?debug=e2e');
  await page.getByRole('button', { name: 'У меня нет открытки' }).click();
  await page.getByRole('button', { name: /Начать путь|Продолжить/ }).click();
  await page.waitForFunction(() => !!(window as unknown as AdmWindow).__adm, null, { timeout: 60_000 });
  await page.waitForFunction(() => !(window as unknown as AdmWindow).__adm.busy(), null, { timeout: 60_000 });
}

/** Листает диалоги/окна, пока режиссёр не освободится. Развилки — первый вариант. */
export async function drain(page: Page, maxSteps = 200): Promise<void> {
  for (let i = 0; i < maxSteps; i++) {
    const busy = await page.evaluate(() => (window as unknown as AdmWindow).__adm.busy());
    if (!busy) return;
    const next = page.getByRole('button', { name: /^(Дальше|У меня нет конверта)$/ });
    if (await next.count()) {
      await next.first().click({ timeout: 2000 }).catch(() => {});
    } else if (await page.locator('.dialog .option').count()) {
      await page.keyboard.press('Digit1');
    } else {
      await page.keyboard.press('KeyE');
    }
    await page.waitForTimeout(120);
  }
  throw new Error('drain: режиссёр так и не освободился');
}

export async function act(page: Page, id: string, tool?: string): Promise<void> {
  await page.evaluate(([i, t]) => (window as unknown as AdmWindow).__adm.interact(i!, t), [id, tool] as const);
  await page.waitForTimeout(80);
  await drain(page);
}

export async function state(page: Page) {
  return page.evaluate(() => (window as unknown as AdmWindow).__adm.state());
}

export function noErrors(errors: string[]): void {
  expect(errors.filter((e) => !/WebGL|GPU stall|swiftshader/i.test(e))).toEqual([]);
}
