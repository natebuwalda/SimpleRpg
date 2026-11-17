import { test, expect } from '@playwright/test';

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
