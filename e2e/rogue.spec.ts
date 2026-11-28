import { expect, test } from '@playwright/test';
import { attack, checkpoint, createCharacter, seed, setCombatFaces, steps, wrapCheckpoint } from './helpers';

const character = { ...checkpoint.character, name: 'Fern', classId: 'rogue' as const };
const adjacent = { x: 14, y: 15 };

test('a new Rogue enters combat with one Resource, then builds stacks and Exploits for direct damage', async ({ page }) => {
  await page.goto('./');
  await page.getByRole('button', { name: 'New Character', exact: true }).click();
  await createCharacter(page, character);
  await expect(page.getByLabel('Character class')).toHaveText('Rogue');
  await page.evaluate(() => { Math.random = () => 0; });
  await page.getByRole('button', { name: 'Begin adventure', exact: true }).click();
  await expect(page.getByLabel('Resources', { exact: true })).toHaveText('0 / 5 Resources');
  await steps(page, 'right');
  await expect(page.getByLabel('Resources', { exact: true })).toHaveText('1 / 5 Resources');
  const exploit = page.getByRole('button', { name: 'Exploit', exact: true });
  await expect(exploit).toBeDisabled();
  await expect(exploit).toHaveAccessibleDescription('Exploit requires at least one stack.');
  for (const total of [1, 2]) {
    await attack(page, Array(15).fill(1));
    await expect(page.getByLabel('Exploit stacks')).toHaveText(`Exploit stacks · ${total}`);
  }
  await expect(page.getByLabel('Slime health')).toHaveText('3 / 3 HP');
  await exploit.tap();
  await expect(page.getByRole('heading', { name: 'Victory!' })).toBeVisible();
  await expect(page.getByRole('status', { name: 'Combat result' })).toContainText('Exploit: 3 direct damage.');
  await expect(page.getByLabel('Resources', { exact: true })).toHaveText('3 / 5 Resources');
  await page.getByText('Roll details', { exact: true }).click();
  await expect(page.getByLabel('Slime attack dice')).toHaveCount(0);
});

test('a late Rogue keeps Exploit disabled, then Restart keeps the class and clears Resources', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await seed(page, { ...checkpoint, character, position: adjacent, hp: 1, currentResources: 3 });
  await steps(page, 'right', 1, [1,1,1,1,1,1, 8,1,1]);
  const exploit = page.getByRole('button', { name: 'Exploit', exact: true });
  await expect(exploit).toBeDisabled();
  await expect(exploit).toHaveAccessibleDescription('Exploit requires acting before the target.');
  await setCombatFaces(page, [8,1,1, 1,1,1,1]);
  await page.getByRole('button', { name: 'Melee', exact: true }).tap();
  await expect(page.getByRole('heading', { name: 'Defeated' })).toBeVisible();
  await page.reload();
  const slot = page.getByRole('article', { name: character.name, exact: true });
  await slot.getByRole('button', { name: 'View' }).tap();
  await expect(page.getByLabel('Character class')).toHaveText('Rogue');
  await expect(page.getByLabel('Resources', { exact: true })).toHaveText('3 / 5 Resources');
  await page.getByRole('button', { name: 'Restart adventure' }).tap();
  await expect(page.getByLabel('Hero health')).toHaveText('5 / 5 HP');
  await expect(page.getByLabel('Resources', { exact: true })).toHaveText('0 / 5 Resources');
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
  await expect(page.getByRole('button', { name: 'Exploit', exact: true })).toHaveCount(0);
  expect(await page.evaluate(() => localStorage.getItem('simple-rpg.save.v9'))).toBe(raw);
  await seed(page, { ...checkpoint, position: adjacent });
  await steps(page, 'right');
  await expect(page.getByRole('button', { name: 'Melee', exact: true })).toBeEnabled();
  await expect(page.getByRole('button', { name: 'Exploit', exact: true })).toHaveCount(0);
});
