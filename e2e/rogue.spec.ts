import { expect, test, type Page } from '@playwright/test';
import { attack, checkpoint, createCharacter, seed, setCombatFaces, steps, wrapCheckpoint } from './helpers';

const character = { ...checkpoint.character, name: 'Fern', classId: 'rogue' as const };
const adjacent = { x: 14, y: 15 };
const oneStack = [8,1,1,1,1, 1,1,1, 1,1,1,1];
const exploitButton = (page: Page) => page.getByRole('button', { name: 'Exploit', exact: true });
const stacksLabel = (page: Page) => page.getByLabel('Exploit stacks', { exact: true });

async function buildStack(page: Page, total: number) {
  const exploit = exploitButton(page);
  await expect(exploit).toBeEnabled();
  await setCombatFaces(page, oneStack);
  await exploit.tap();
  await expect(stacksLabel(page)).toHaveText(`Exploit stacks · ${total}`);
}

test('a new Rogue previews Exploit, builds stacks, and spends them on a damaging Melee hit', async ({ page }) => {
  await page.goto('./');
  await page.getByRole('button', { name: 'New Character', exact: true }).click();
  await createCharacter(page, character);
  await expect(page.getByLabel('Character class')).toHaveText('Rogue');
  await expect(page.getByLabel('Creation Exploit pool')).toHaveText('5d10');
  await page.evaluate(() => { Math.random = () => 0; });
  await page.getByRole('button', { name: 'Begin adventure', exact: true }).click();
  await page.getByText('Character', { exact: true }).click();
  await expect(page.getByLabel('Exploit pool')).toHaveText('Exploit 5d10');
  await steps(page, 'right');
  await expect(stacksLabel(page)).toHaveText('Exploit stacks · 0');
  await buildStack(page, 1);
  await buildStack(page, 2);
  await page.getByText('Roll details', { exact: true }).click();
  await expect(page.getByLabel('Exploit dice')).toContainText('Successes: 1');
  await attack(page, [8,1,1,1,1, 8,1,1, 1,1,1, 1,1,1,1]);
  await expect(stacksLabel(page)).toHaveText('Exploit stacks · 2');
  await expect(page.getByLabel('Slime health')).toHaveText('3 / 3 HP');
  await attack(page, [8,1,1,1,1, 1,1,1]);
  await expect(page.getByRole('heading', { name: 'Victory!' })).toBeVisible();
  await expect(page.getByRole('status', { name: 'Combat result' })).toContainText('3 damage (1 base + 2 Exploit)');
  await page.getByText('Roll details', { exact: true }).click();
  await expect(page.getByLabel('Exploit bonus')).toHaveText('Exploit bonus damage +2.');
  await expect(page.getByLabel('Slime attack dice')).toHaveCount(0);
});

test('a late Rogue keeps Exploit disabled, then Reload and Restart retain the class', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await seed(page, { ...checkpoint, character, position: adjacent, hp: 1 });
  await steps(page, 'right', 1, [1,1,1,1,1,1, 8,1,1]);
  const exploit = exploitButton(page);
  await expect(exploit).toBeDisabled();
  const reason = page.getByText('Exploit requires acting before the target.', { exact: true });
  await expect(reason).toBeInViewport({ ratio: 1 });
  await setCombatFaces(page, [8,1,1, 1,1,1,1]);
  await page.getByRole('button', { name: 'Melee', exact: true }).tap();
  await expect(page.getByRole('heading', { name: 'Defeated' })).toBeVisible();
  await page.reload();
  const slot = page.getByRole('article', { name: character.name, exact: true });
  await slot.getByRole('button', { name: 'View' }).tap();
  await expect(page.getByLabel('Character class')).toHaveText('Rogue');
  await expect(page.getByLabel('Exploit pool')).toHaveText('Exploit 5d10');
  await page.getByRole('button', { name: 'Restart adventure' }).tap();
  await expect(page.getByLabel('Hero health')).toHaveText('5 / 5 HP');
  await page.getByText('Character', { exact: true }).click();
  await expect(page.getByLabel('Character class')).toHaveText('Rogue');
});

test('a legacy Wizard keeps Magic and a current Warrior keeps Melee without Exploit', async ({ page }) => {
  const { slots } = wrapCheckpoint({ ...checkpoint, character: { ...character, classId: 'wizard' }, position: adjacent });
  const raw = JSON.stringify({ version: 9, slots: slots.map(slot => ({ ...slot, checkpoint: { ...slot.checkpoint, version: 8 } })) });
  await page.goto('./');
  await page.evaluate(data => localStorage.setItem('simple-rpg.save.v9', data), raw);
  await page.reload();
  await page.getByRole('button', { name: 'Resume', exact: true }).tap();
  await steps(page, 'right');
  await expect(page.getByRole('button', { name: 'Magic', exact: true })).toBeEnabled();
  await expect(exploitButton(page)).toHaveCount(0);
  expect(await page.evaluate(() => localStorage.getItem('simple-rpg.save.v9'))).toBe(raw);
  await seed(page, { ...checkpoint, position: adjacent });
  await steps(page, 'right');
  await expect(page.getByRole('button', { name: 'Melee', exact: true })).toBeEnabled();
  await expect(exploitButton(page)).toHaveCount(0);
});

for (const viewport of [{ width: 320, height: 568 }, { width: 390, height: 844 }, { width: 844, height: 390 }]) {
  test(`Exploit has usable controls and ignores held input at ${viewport.width}×${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await seed(page, { ...checkpoint, character, position: adjacent });
    await steps(page, 'right');
    const exploit = exploitButton(page);
    for (const button of await page.locator('.actions button').all()) {
      const box = (await button.boundingBox())!;
      expect(box.width).toBeGreaterThanOrEqual(48);
      expect(box.height).toBeGreaterThanOrEqual(48);
      expect(box.x + box.width).toBeLessThanOrEqual(viewport.width);
      expect(box.y + box.height).toBeLessThanOrEqual(viewport.height);
    }
    const now = new Date();
    await page.clock.install({ time: now });
    await page.clock.pauseAt(new Date(now.getTime() + 60_000));
    await setCombatFaces(page, oneStack);
    await exploit.focus();
    await page.keyboard.press('Enter');
    await page.keyboard.down(' ');
    await expect(exploit).toBeDisabled();
    await page.clock.runFor(300);
    await expect(exploit).toBeEnabled();
    await page.keyboard.up(' ');
    await page.clock.runFor(300);
    await expect(page.getByRole('status', { name: 'Combat result' })).toHaveText(/^Turn 1\./);
    await expect(exploit).toBeFocused();
    await expect(stacksLabel(page)).toHaveText('Exploit stacks · 1');
  });
}
