import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';

async function enterBattle(page: Page) {
  await page.goto('./');
  await page.getByRole('button', { name: 'New Game', exact: true }).tap();
  for (let i = 0; i < 4; i++) await page.getByRole('button', { name: 'Move right' }).tap();
  await page.getByRole('button', { name: 'Move down' }).tap();
  await page.getByRole('button', { name: 'Move down' }).tap();
  await expect(page.getByRole('button', { name: 'Attack', exact: true })).toBeVisible();
}

test('attack resolves one turn per activation', async ({ page }) => {
  await enterBattle(page);
  await page.evaluate(() => {
    document.querySelector<HTMLButtonElement>('[data-action="attack"]')!.click();
    document.querySelector<HTMLButtonElement>('[data-action="attack"]')!.click();
  });
  await expect(page.getByLabel('Hero health')).toHaveText('10 / 12 HP');
  await expect(page.getByLabel('Slime health')).toHaveText('2 / 6 HP');
});

test('win and return', async ({ page }) => {
  await enterBattle(page);
  await page.getByRole('button', { name: 'Attack', exact: true }).tap();
  await page.getByRole('button', { name: 'Attack', exact: true }).tap();
  await expect(page.getByRole('heading', { name: 'Victory!' })).toBeVisible();
  await page.getByRole('button', { name: 'Back to clearing' }).tap();
  await expect(page.getByLabel('Position')).toHaveText('6, 3');
  await page.getByRole('button', { name: 'Move down' }).tap();
  await expect(page.getByLabel('Position')).toHaveText('6, 4');
});

test('run returns to safe tile', async ({ page }) => {
  await enterBattle(page);
  await page.getByRole('button', { name: 'Run', exact: true }).tap();
  await expect(page.getByLabel('Position')).toHaveText('6, 3');
  await page.getByRole('button', { name: 'Move down' }).tap();
  await expect(page.getByRole('button', { name: 'Attack', exact: true })).toBeVisible();
});

test('title fits phone', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto('./');
  await expect(page.getByRole('heading', { name: 'Simple RPG' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'New Game', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Continue', exact: true })).toBeDisabled();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('touch and keyboard respect collision', async ({ page }) => {
  await page.goto('./');
  await page.getByRole('button', { name: 'New Game', exact: true }).tap();
  await expect(page.getByLabel('Position')).toHaveText('2, 2');
  await page.getByRole('button', { name: 'Move left' }).tap();
  await page.getByRole('button', { name: 'Move left' }).tap();
  await expect(page.getByLabel('Position')).toHaveText('1, 2');
  await page.keyboard.press('ArrowRight');
  await expect(page.getByLabel('Position')).toHaveText('2, 2');
});

test('blur and repeated keys do not add movement', async ({ page }) => {
  await page.goto('./');
  await page.getByRole('button', { name: 'New Game', exact: true }).tap();
  await page.keyboard.down('ArrowRight');
  await page.keyboard.down('ArrowRight');
  await expect(page.getByLabel('Position')).toHaveText('3, 2');
  await page.evaluate(() => window.dispatchEvent(new Event('blur')));
  await page.keyboard.down('ArrowRight');
  await expect(page.getByLabel('Position')).toHaveText('3, 2');
  await page.keyboard.up('ArrowRight');
  await page.evaluate(() => window.dispatchEvent(new Event('focus')));
  await page.keyboard.press('ArrowRight');
  await expect(page.getByLabel('Position')).toHaveText('4, 2');
});

test('refresh continues exploration', async ({ page }) => {
  await page.goto('./');
  await page.getByRole('button', { name: 'New Game', exact: true }).tap();
  await page.getByRole('button', { name: 'Move right' }).tap();
  await page.reload();
  await page.getByRole('button', { name: 'Continue', exact: true }).tap();
  await expect(page.getByLabel('Position')).toHaveText('3, 2');
});

test('refresh during battle restores safe checkpoint', async ({ page }) => {
  await enterBattle(page);
  await page.getByRole('button', { name: 'Attack', exact: true }).tap();
  await page.reload();
  await page.getByRole('button', { name: 'Continue', exact: true }).tap();
  await expect(page.getByLabel('Position')).toHaveText('6, 3');
  await expect(page.getByLabel('Hero health')).toHaveText('12 / 12 HP');
});

test('new game cancel preserves save', async ({ page }) => {
  await page.goto('./');
  await page.getByRole('button', { name: 'New Game', exact: true }).tap();
  await page.getByRole('button', { name: 'Move right' }).tap();
  await page.reload();
  await page.getByRole('button', { name: 'New Game', exact: true }).tap();
  await page.getByRole('button', { name: 'Cancel', exact: true }).tap();
  await page.getByRole('button', { name: 'Continue', exact: true }).tap();
  await expect(page.getByLabel('Position')).toHaveText('3, 2');
});

test('invalid save disables continue', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('simple-rpg.save.v1', '{broken'));
  await page.goto('./');
  await expect(page.getByRole('button', { name: 'Continue', exact: true })).toBeDisabled();
  await expect(page.getByRole('status')).toContainText('could not be read');
});

test('storage unavailable still permits play', async ({ page }) => {
  await page.addInitScript(() => Object.defineProperty(window, 'localStorage', { get() { throw new Error('blocked'); } }));
  await page.goto('./');
  await page.getByRole('button', { name: 'New Game', exact: true }).tap();
  await page.getByRole('button', { name: 'Move right' }).tap();
  await expect(page.getByLabel('Position')).toHaveText('3, 2');
  await expect(page.getByRole('status')).toContainText('cannot be saved');
});

test('victory persists across refresh and cleared tile remains walkable', async ({ page }) => {
  await enterBattle(page);
  await page.getByRole('button', { name: 'Attack', exact: true }).tap();
  await page.getByRole('button', { name: 'Attack', exact: true }).tap();
  await expect(page.getByRole('heading', { name: 'Victory!' })).toBeVisible();
  await page.reload();
  await page.getByRole('button', { name: 'Continue', exact: true }).tap();
  await expect(page.getByLabel('Hero health')).toHaveText('12 / 12 HP');
  await page.getByRole('button', { name: 'Move down' }).tap();
  await expect(page.getByLabel('Position')).toHaveText('6, 4');
  await page.reload();
  await page.getByRole('button', { name: 'Continue', exact: true }).tap();
  await expect(page.getByLabel('Position')).toHaveText('6, 4');
});

test('defeat refresh preserves checkpoint and restart replaces it', async ({ page }) => {
  await page.goto('./');
  await page.evaluate(() => localStorage.setItem('simple-rpg.save.v1', JSON.stringify({ version: 1, position: { x: 6, y: 3 }, hp: 2, completedEncounterIds: [] })));
  await page.reload();
  await page.getByRole('button', { name: 'Continue', exact: true }).tap();
  await page.getByRole('button', { name: 'Move down' }).tap();
  await page.getByRole('button', { name: 'Attack', exact: true }).tap();
  await expect(page.getByRole('heading', { name: 'Defeated', exact: true })).toBeVisible();
  await page.reload();
  await page.getByRole('button', { name: 'Continue', exact: true }).tap();
  await expect(page.getByLabel('Hero health')).toHaveText('2 / 12 HP');
  await page.getByRole('button', { name: 'Move down' }).tap();
  await page.getByRole('button', { name: 'Attack', exact: true }).tap();
  await page.getByRole('button', { name: 'Restart', exact: true }).tap();
  await expect(page.getByLabel('Position')).toHaveText('2, 2');
  await expect(page.getByLabel('Hero health')).toHaveText('12 / 12 HP');
  await page.reload();
  await page.getByRole('button', { name: 'Continue', exact: true }).tap();
  await expect(page.getByLabel('Position')).toHaveText('2, 2');
});

test('confirm new game replaces the old save', async ({ page }) => {
  await page.goto('./');
  await page.getByRole('button', { name: 'New Game', exact: true }).tap();
  await page.getByRole('button', { name: 'Move right' }).tap();
  await page.reload();
  await page.getByRole('button', { name: 'New Game', exact: true }).tap();
  await page.getByRole('button', { name: 'Start Over', exact: true }).tap();
  await expect(page.getByLabel('Position')).toHaveText('2, 2');
  await page.reload();
  await page.getByRole('button', { name: 'Continue', exact: true }).tap();
  await expect(page.getByLabel('Position')).toHaveText('2, 2');
});

test('storage quota failure keeps play available', async ({ page }) => {
  await page.addInitScript(() => { Storage.prototype.setItem = () => { throw new Error('quota'); }; });
  await page.goto('./');
  await page.getByRole('button', { name: 'New Game', exact: true }).tap();
  await page.getByRole('button', { name: 'Move right' }).tap();
  await expect(page.getByLabel('Position')).toHaveText('3, 2');
  await expect(page.getByRole('status')).toContainText('cannot be saved');
});

test('mobile controls fit through portrait and landscape rotation', async ({ page }) => {
  await page.goto('./');
  await page.getByRole('button', { name: 'New Game', exact: true }).tap();
  for (const viewport of [{ width: 320, height: 568 }, { width: 390, height: 844 }, { width: 844, height: 390 }]) {
    await page.setViewportSize(viewport);
    for (const button of await page.getByRole('button').all()) {
      const box = await button.boundingBox();
      expect(box).not.toBeNull();
      expect(box!.width).toBeGreaterThanOrEqual(48);
      expect(box!.height).toBeGreaterThanOrEqual(48);
      expect(box!.y + box!.height).toBeLessThanOrEqual(viewport.height);
      expect(box!.x + box!.width).toBeLessThanOrEqual(viewport.width);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await expect(page.getByLabel('Position')).toHaveText('2, 2');
  }
});

test('battle ignores commands while hidden and resumes cleanly', async ({ page }) => {
  await enterBattle(page);
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, value: true });
    document.dispatchEvent(new Event('visibilitychange'));
    document.querySelector<HTMLButtonElement>('[data-action="attack"]')!.click();
  });
  await expect(page.getByLabel('Slime health')).toHaveText('6 / 6 HP');
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, value: false });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await page.getByRole('button', { name: 'Attack', exact: true }).tap();
  await expect(page.getByLabel('Slime health')).toHaveText('2 / 6 HP');
});

test('production base path loads assets and survives refresh', async ({ page }) => {
  const failures: string[] = [];
  page.on('pageerror', error => failures.push(error.message));
  page.on('response', response => { if (response.status() >= 400) failures.push(`${response.status()} ${response.url()}`); });
  page.on('requestfailed', request => failures.push(request.url()));
  await page.goto('./');
  await expect(page.locator('canvas')).toBeVisible();
  await page.screenshot({ path: 'test-results/phone-title.png', fullPage: true });
  await page.getByRole('button', { name: 'New Game', exact: true }).tap();
  await expect(page.getByLabel('Position')).toHaveText('2, 2');
  await page.screenshot({ path: 'test-results/phone-exploration.png', fullPage: true });
  await page.reload();
  await page.getByRole('button', { name: 'Continue', exact: true }).tap();
  await expect(page.locator('canvas')).toBeVisible();
  expect(failures).toEqual([]);
});
