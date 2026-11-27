import { expect, test, type Page } from '@playwright/test';
import { checkpoint, createCharacter, seed, setCombatFaces, steps, wrapCheckpoint } from './helpers';

const character = { ...checkpoint.character, name: 'Ash', classId: 'cleric' as const };
const adjacent = { x: 14, y: 15 };
const balance = (page: Page) => page.getByLabel('Resources', { exact: true });
const command = (page: Page, name: string) => page.getByRole('button', { name, exact: true });
const oneSuccess = [8,1,1, 1,1,1, 1,1,1,1];

test('a Cleric starts with half Resources and can spend or restore one on a turn', async ({ page }) => {
  await page.goto('./');
  await command(page, 'New Character').click();
  await createCharacter(page, character);
  await expect(page.getByLabel('Character class')).toHaveText('Cleric');
  await expect(page.getByLabel('Creation Heal and Smite pool')).toHaveText('3d10');
  await page.evaluate(() => { Math.random = () => 0; });
  await command(page, 'Begin adventure').click();
  await expect(balance(page)).toHaveText('3 / 5 Resources');
  await steps(page, 'right');
  for (const action of ['Melee', 'Heal', 'Smite', 'Run']) await expect(command(page, action)).toBeEnabled();
  await setCombatFaces(page, Array(10).fill(1));
  await command(page, 'Heal').tap();
  await expect(balance(page)).toHaveText('2 / 5 Resources');
  await expect(page.getByRole('status', { name: 'Combat result' })).toContainText('Heal: 0 HP restored. Spent 1 Resource.');
  await expect(command(page, 'Smite')).toBeEnabled();
  await setCombatFaces(page, [8,8,8]);
  await command(page, 'Smite').focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { name: 'Victory!' })).toBeVisible();
  await expect(command(page, 'Back to clearing')).toBeFocused();
  await expect(balance(page)).toHaveText('3 / 5 Resources');
  await page.getByText('Roll details', { exact: true }).click();
  await expect(page.getByLabel('Smite dice')).toContainText('Successes: 3');
  await expect(page.getByLabel('Slime defense dice')).toHaveCount(0);
});

test('Heal stops at zero and a failed Smite victory save retries Health, XP and Resources together', async ({ page }) => {
  await seed(page, { ...checkpoint, position: adjacent, hp: 2, character, currentResources: 1 });
  await steps(page, 'right');
  await setCombatFaces(page, [8,8,8, 1,1,1, 1,1,1,1]);
  await command(page, 'Heal').focus();
  await page.keyboard.press('Enter');
  await expect(page.getByLabel('Hero health')).toHaveText('3 / 5 HP');
  await expect(balance(page)).toHaveText('0 / 5 Resources');
  await expect(command(page, 'Heal')).toBeDisabled();
  await expect(command(page, 'Heal')).toHaveAccessibleDescription('Heal requires at least one Resource.');
  await expect(command(page, 'Melee')).toBeFocused();
  const before = await page.evaluate(() => localStorage.getItem('simple-rpg.save.v11'));
  await page.evaluate(() => {
    const setItem = Storage.prototype.setItem;
    let failOnce = true;
    Storage.prototype.setItem = function (key, value) {
      if (key.endsWith('.save.v11') && failOnce) { failOnce = false; throw Error('quota'); }
      setItem.call(this, key, value);
    };
  });
  await setCombatFaces(page, [8,8,8]);
  await command(page, 'Smite').tap();
  await expect(command(page, 'Retry save')).toBeVisible();
  await expect(balance(page)).toHaveText('1 / 5 Resources');
  expect(await page.evaluate(() => localStorage.getItem('simple-rpg.save.v11'))).toBe(before);
  await command(page, 'Retry save').tap();
  await expect(command(page, 'Retry save')).toHaveCount(0);
  await page.reload();
  await command(page, 'Resume').tap();
  await expect(page.getByLabel('Hero health')).toHaveText('5 / 5 HP');
  await expect(balance(page)).toHaveText('1 / 5 Resources');
  await page.getByText('Character', { exact: true }).click();
  await expect(page.getByLabel('Character progression')).toContainText('1 / 5 XP');
});

test('full Resources disables Smite and Run carries the live balance into Resume and roster details', async ({ page }) => {
  await seed(page, { ...checkpoint, position: adjacent, hp: 2, character, currentResources: 4 });
  await steps(page, 'right');
  await setCombatFaces(page, Array(10).fill(1));
  await command(page, 'Smite').tap();
  await expect(balance(page)).toHaveText('5 / 5 Resources');
  await expect(command(page, 'Smite')).toBeDisabled();
  await expect(command(page, 'Smite')).toHaveAccessibleDescription('Resources are full.');
  await command(page, 'Run').tap();
  await expect(page.getByLabel('Position')).toHaveText('14, 15');
  await expect(page.getByRole('status', { name: 'Save status' })).toHaveText('Adventure saved on this device.');
  await page.reload();
  await command(page, 'View').tap();
  await expect(balance(page)).toHaveText('5 / 5 Resources');
  await command(page, 'Resume adventure').tap();
  await expect(page.getByLabel('Hero health')).toHaveText('2 / 5 HP');
  await expect(balance(page)).toHaveText('5 / 5 Resources');
});

test('a v10 adventure migrates without gaining Cleric resources or actions', async ({ page }) => {
  const { slots } = wrapCheckpoint({ ...checkpoint, position: adjacent });
  const raw = JSON.stringify({ version: 10, slots: slots.map(slot => ({ ...slot, checkpoint: { ...slot.checkpoint, version: 9 } })) });
  await page.goto('./');
  await page.evaluate(value => localStorage.setItem('simple-rpg.save.v10', value), raw);
  await page.reload();
  await command(page, 'Resume').tap();
  await expect(balance(page)).toHaveCount(0);
  await steps(page, 'right');
  await expect(command(page, 'Momentum')).toBeEnabled();
  await expect(command(page, 'Heal')).toHaveCount(0);
  await expect(command(page, 'Smite')).toHaveCount(0);
  expect(await page.evaluate(() => localStorage.getItem('simple-rpg.save.v10'))).toBe(raw);
});

for (const viewport of [{ width: 320, height: 568 }, { width: 390, height: 844 }, { width: 844, height: 390 }]) {
  test(`four Cleric actions fit and held input resolves once at ${viewport.width}×${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await seed(page, { ...checkpoint, position: adjacent, character, currentResources: 3 });
    await steps(page, 'right');
    await page.locator('.cleric-actions').evaluate(controls => controls.scrollIntoView({ block: 'center' }));
    for (const name of ['Melee', 'Heal', 'Smite', 'Run']) {
      const action = command(page, name);
      const box = (await action.boundingBox())!;
      expect(box.width).toBeGreaterThanOrEqual(48);
      expect(box.height).toBeGreaterThanOrEqual(48);
      expect(box.x + box.width).toBeLessThanOrEqual(viewport.width);
      await expect(action).toBeInViewport({ ratio: 1 });
    }
    const action = command(page, viewport.width === 390 ? 'Heal' : 'Smite');
    const now = new Date();
    await page.clock.install({ time: now });
    await page.clock.pauseAt(new Date(now.getTime() + 60_000));
    await setCombatFaces(page, oneSuccess);
    await action.focus();
    await page.keyboard.press('Enter');
    await page.keyboard.down(' ');
    await expect(action).toBeDisabled();
    await page.clock.runFor(300);
    await expect(action).toBeEnabled();
    await page.keyboard.up(' ');
    await page.clock.runFor(300);
    await expect(action).toBeFocused();
    await expect(page.getByRole('status', { name: 'Combat result' })).toHaveText(/^Turn 1\./);
    await expect(balance(page)).toHaveText(viewport.width === 390 ? '2 / 5 Resources' : '4 / 5 Resources');
  });
}
