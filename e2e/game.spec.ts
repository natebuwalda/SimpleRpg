import { test, expect } from '@playwright/test';

import { enterBattle, seed, checkpoint, attack, losingFaces, setCombatFaces, startAdventure, steps } from './helpers';

test('attack resolves one turn per activation', async ({ page }) => {
  await enterBattle(page);
  await page.evaluate(() => {
    document.querySelector<HTMLButtonElement>('[data-action="melee"]')!.click();
    document.querySelector<HTMLButtonElement>('[data-action="melee"]')!.click();
  });
  await expect(page.getByLabel('Hero health')).toHaveText('3 / 5 HP');
  await expect(page.getByLabel('Slime health')).toHaveText('1 / 3 HP');
});

test('win and return', async ({ page }) => {
  await enterBattle(page);
  await attack(page);
  await attack(page);
  await expect(page.getByRole('heading', { name: 'Victory!' })).toBeVisible();
  await page.getByRole('button', { name: 'Back to clearing' }).tap();
  await expect(page.getByLabel('Position')).toHaveText('15, 14');
  await page.getByRole('button', { name: 'Move down' }).tap();
  await expect(page.getByLabel('Position')).toHaveText('15, 15');
});

test('run returns to safe tile', async ({ page }) => {
  await enterBattle(page);
  await page.getByRole('button', { name: 'Run', exact: true }).tap();
  await expect(page.getByLabel('Position')).toHaveText('15, 14');
  await steps(page, 'down');
  await expect(page.getByRole('button', { name: 'Melee', exact: true })).toBeVisible();
});

test('title fits phone', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto('./');
  await expect(page.getByRole('heading', { name: 'Your adventures' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'New Character', exact: true })).toBeVisible();
  await expect(page.getByLabel('Roster capacity')).toHaveText('0 / 10 slots');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('touch and keyboard respect collision', async ({ page }) => {
  await seed(page);
  await expect(page.getByLabel('Position')).toHaveText('3, 3');
  await page.getByRole('button', { name: 'Move left' }).tap();
  await page.getByRole('button', { name: 'Move left' }).tap();
  await expect(page.getByLabel('Position')).toHaveText('3, 3');
  await page.keyboard.press('ArrowRight');
  await expect(page.getByLabel('Position')).toHaveText('4, 3');
});

test('blur and repeated keys do not add movement', async ({ page }) => {
  await seed(page);
  await page.keyboard.down('ArrowRight');
  await page.keyboard.down('ArrowRight');
  await expect(page.getByLabel('Position')).toHaveText('4, 3');
  await page.evaluate(() => window.dispatchEvent(new Event('blur')));
  await page.keyboard.down('ArrowRight');
  await expect(page.getByLabel('Position')).toHaveText('4, 3');
  await page.keyboard.up('ArrowRight');
  await page.evaluate(() => window.dispatchEvent(new Event('focus')));
  await page.keyboard.press('ArrowRight');
  await expect(page.getByLabel('Position')).toHaveText('5, 3');
});

test('refresh continues exploration', async ({ page }) => {
  await seed(page);
  await steps(page,'right');
  await page.reload();
  await page.getByRole('button', { name: 'Resume', exact: true }).tap();
  await expect(page.getByLabel('Position')).toHaveText('4, 3');
});

test('refresh during battle restores safe checkpoint', async ({ page }) => {
  await enterBattle(page);
  await attack(page);
  await page.reload();
  await page.getByRole('button', { name: 'Resume', exact: true }).tap();
  await expect(page.getByLabel('Position')).toHaveText('15, 14');
  await expect(page.getByLabel('Hero health')).toHaveText('5 / 5 HP');
});

test('new game cancel preserves save', async ({ page }) => {
  await seed(page);
  await steps(page,'right');
  await page.reload();
  await page.getByRole('button',{name:'New Character',exact:true}).click();
  await page.getByRole('button', { name: 'Cancel', exact: true }).tap();
  await page.getByRole('button', { name: 'Resume', exact: true }).tap();
  await expect(page.getByLabel('Position')).toHaveText('4, 3');
});

test('victory persists across refresh and cleared tile remains walkable', async ({ page }) => {
  await enterBattle(page);
  await attack(page);
  await attack(page);
  await expect(page.getByRole('heading', { name: 'Victory!' })).toBeVisible();
  await page.reload();
  await page.getByRole('button', { name: 'Resume', exact: true }).tap();
  await expect(page.getByLabel('Hero health')).toHaveText('5 / 5 HP');
  await page.getByRole('button', { name: 'Move down' }).tap();
  await expect(page.getByLabel('Position')).toHaveText('15, 15');
  await page.reload();
  await page.getByRole('button', { name: 'Resume', exact: true }).tap();
  await expect(page.getByLabel('Position')).toHaveText('15, 15');
});

test('mobile controls fit through portrait and landscape rotation', async ({ page }) => {
  await page.goto('./');
  await startAdventure(page);
  for (const viewport of [{ width: 320, height: 568 }, { width: 390, height: 844 }, { width: 844, height: 390 }]) {
    await page.setViewportSize(viewport);
    for (const button of await page.getByRole('button').filter({hasNotText:'Return to characters'}).all()) {
      const box = await button.boundingBox();
      expect(box).not.toBeNull();
      expect(box!.width).toBeGreaterThanOrEqual(48);
      expect(box!.height).toBeGreaterThanOrEqual(48);
      expect(box!.y + box!.height).toBeLessThanOrEqual(viewport.height);
      expect(box!.x + box!.width).toBeLessThanOrEqual(viewport.width);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await expect(page.getByLabel('Position')).toHaveText('3, 3');
  }
});

test('battle ignores commands while hidden and resumes cleanly', async ({ page }) => {
  await enterBattle(page);
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, value: true });
    document.dispatchEvent(new Event('visibilitychange'));
    document.querySelector<HTMLButtonElement>('[data-action="melee"]')!.click();
  });
  await expect(page.getByLabel('Slime health')).toHaveText('3 / 3 HP');
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, value: false });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await attack(page);
  await expect(page.getByLabel('Slime health')).toHaveText('1 / 3 HP');
});

test('production base path loads assets and survives refresh', async ({ page }) => {
  const failures: string[] = [];
  page.on('pageerror', error => failures.push(error.message));
  page.on('response', response => { if (response.status() >= 400) failures.push(`${response.status()} ${response.url()}`); });
  page.on('requestfailed', request => failures.push(request.url()));
  await page.goto('./');
  await expect(page.locator('canvas')).toBeAttached();
  await page.screenshot({ path: 'test-results/phone-title.png', fullPage: true });
  await startAdventure(page);
  await expect(page.getByLabel('Position')).toHaveText('3, 3');
  await page.screenshot({ path: 'test-results/phone-exploration.png', fullPage: true });
  await page.reload();
  await page.getByRole('button', { name: 'Resume', exact: true }).tap();
  await expect(page.locator('canvas')).toBeVisible();
  expect(failures).toEqual([]);
});

test('a press begun during resolution cannot queue an attack', async ({ page }) => {
  await enterBattle(page);
  const now = new Date();
  await page.clock.install({ time: now });
  await page.clock.pauseAt(new Date(now.getTime() + 60_000));
  await attack(page);
  const button = page.getByRole('button', { name: 'Melee', exact: true });
  const box = (await button.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  // Deliberately span the resolution window while holding the pointer.
  await expect(button).toBeDisabled();
  await page.clock.runFor(300);
  await expect(button).toBeEnabled();
  await page.mouse.up();
  await expect(page.getByLabel('Slime health')).toHaveText('1 / 3 HP');
});

test('keyboard focus survives battle resolution', async ({ page }) => {
  await enterBattle(page);
  const attack = page.getByRole('button', { name: 'Melee', exact: true });
  await attack.focus();
  await page.keyboard.press('Enter');
  await expect(attack).toBeEnabled();
  await expect(attack).toBeFocused();
  await setCombatFaces(page, [8,8,8,8,8,1,1,1]);
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { name: 'Victory!' })).toBeVisible();
});

test('space held during resolution cannot queue an attack', async ({ page }) => {
  await enterBattle(page);
  const attack = page.getByRole('button', { name: 'Melee', exact: true });
  const now = new Date();
  await page.clock.install({ time: now });
  await page.clock.pauseAt(new Date(now.getTime() + 60_000));
  await attack.focus();
  await page.keyboard.press('Enter');
  await page.keyboard.down(' ');
  await expect(attack).toBeDisabled();
  await page.clock.runFor(300);
  await expect(attack).toBeEnabled();
  await page.keyboard.up(' ');
  await expect(page.getByLabel('Slime health')).toHaveText('1 / 3 HP');
});
