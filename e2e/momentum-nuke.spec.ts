import { expect, test } from '@playwright/test';
import { attack, checkpoint, createCharacter, seed, setCombatFaces, steps } from './helpers';

const adjacent = { x: 14, y: 15 };
const wizard = { ...checkpoint.character, classId: 'wizard' as const };

test('creation explains the class choices and previews Nuke damage', async ({ page }) => {
  await page.goto('./');
  await page.getByRole('button', { name: 'New Character', exact: true }).click();
  const classPicker = page.getByRole('combobox', { name: 'Class', exact: true });
  await expect(classPicker).toHaveAccessibleDescription(/Combat for Melee.*Lore for Magic.*Melee builds Exploit stacks/);
  await createCharacter(page, wizard);
  await expect(page.getByLabel('Creation Nuke damage')).toHaveText('4 base damage');
  await expect(page.getByText(/Cunning \+ Lore damage, reduced by the target’s defense successes/)).toBeVisible();
});

test('a saved Warrior builds Momentum, keeps it through Melee, and starts fresh after Run', async ({ page }) => {
  await seed(page, { ...checkpoint, position: adjacent });
  await steps(page, 'right');
  const momentum = page.getByRole('button', { name: 'Momentum', exact: true });
  const stacks = page.getByLabel('Momentum stacks');
  const pools = page.getByLabel('Battle Melee and Defense');
  await expect(momentum).toBeEnabled();
  await expect(stacks).toHaveText('Momentum stacks · 0');
  await expect(pools).toHaveText('Melee 5d10 · Defense 4d10');
  await setCombatFaces(page, [8,1,1, 1,1,1,1,8]);
  await momentum.tap();
  await expect(page.getByLabel('Hero health')).toHaveText('5 / 5 HP');
  await expect(stacks).toHaveText('Momentum stacks · 1');
  await expect(pools).toHaveText('Melee 6d10 · Defense 5d10');
  await page.getByText('Roll details', { exact: true }).click();
  await expect(page.getByText('Momentum gained. No roll.', { exact: true })).toBeVisible();
  await expect(page.getByLabel('Your defense dice')).toContainText('1, 1, 1, 1, 8');
  await attack(page, Array(17).fill(1));
  await expect(stacks).toHaveText('Momentum stacks · 1');
  await page.getByRole('button', { name: 'Run', exact: true }).tap();
  await page.reload();
  await page.getByRole('button', { name: 'Resume', exact: true }).tap();
  await steps(page, 'right');
  await expect(momentum).toBeEnabled();
  await expect(stacks).toHaveText('Momentum stacks · 0');
  await expect(page.getByRole('button', { name: /^(Exploit|Nuke)$/ })).toHaveCount(0);
});

test('a slime can defend against Nuke and the Wizard’s later victory persists', async ({ page }) => {
  await seed(page, { ...checkpoint, position: adjacent, hp: 2, character: wizard });
  await page.getByText('Character', { exact: true }).click();
  await expect(page.getByLabel('Character Nuke damage', { exact: true })).toHaveText('Nuke · 4 base damage');
  await steps(page, 'right');
  await expect(page.getByLabel('Nuke damage', { exact: true })).toHaveText('Nuke · 4 base damage');
  const nuke = page.getByRole('button', { name: 'Nuke', exact: true });
  const result = page.getByRole('status', { name: 'Combat result' });
  await setCombatFaces(page, [10,1,1, 8, ...Array(7).fill(1)]);
  await nuke.tap();
  await expect(result).toContainText('Nuke: 2 damage. Slime blocked 2 of 4.');
  await expect(page.getByLabel('Slime health')).toHaveText('1 / 3 HP');
  await page.getByText('Roll details', { exact: true }).click();
  await expect(page.getByLabel('Slime defense dice')).toContainText('Original: 10, 1, 1. Bonus: 8. Successes: 2.');
  await expect(page.getByLabel('Your attack dice')).toHaveCount(0);
  await setCombatFaces(page, [1,1,1]);
  await nuke.tap();
  await expect(page.getByRole('heading', { name: 'Victory!' })).toBeVisible();
  await expect(result).toContainText('Nuke: 4 damage. Slime blocked 0 of 4.');
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('simple-rpg.save.v13')!));
  expect(stored.version).toBe(13);
  expect(stored.slots[0].checkpoint).toEqual({
    ...checkpoint, position: adjacent, character: wizard, hp: 5, completedEncounterIds: ['slime-1'],
    progression: { ...checkpoint.progression, xp: 1 },
  });
  await page.reload();
  await page.getByRole('button', { name: 'Resume', exact: true }).tap();
  await expect(page.getByLabel('Hero health')).toHaveText('5 / 5 HP');
  await page.getByText('Character', { exact: true }).click();
  await expect(page.getByLabel('Character Nuke damage', { exact: true })).toHaveText('Nuke · 4 base damage');
});

test('a slower Wizard can choose Nuke but cannot cast after defeat', async ({ page }) => {
  await seed(page, { ...checkpoint, position: adjacent, character: wizard, hp: 1 });
  await steps(page, 'right', 1, [1,1,1,1,1,1, 8,1,1]);
  const nuke = page.getByRole('button', { name: 'Nuke', exact: true });
  await expect(nuke).toBeEnabled();
  await setCombatFaces(page, [8,1,1, 1,1,1,1]);
  await nuke.tap();
  await expect(page.getByRole('heading', { name: 'Defeated' })).toBeVisible();
  await expect(page.getByRole('status', { name: 'Combat result' })).not.toContainText('Nuke');
});

for (const viewport of [{ width: 320, height: 568 }, { width: 390, height: 844 }, { width: 844, height: 390 }]) {
  for (const name of ['Momentum', 'Nuke'] as const) {
    test(`${name} stays reachable and ignores held input at ${viewport.width}×${viewport.height}`, async ({ page }) => {
      await page.setViewportSize(viewport);
      const character = name === 'Momentum' ? checkpoint.character : wizard;
      await seed(page, { ...checkpoint, character, position: adjacent, slimeLevel: 3 });
      await steps(page, 'right');
      const action = page.getByRole('button', { name, exact: true });
      await expect(action).toBeEnabled();
      await page.locator('.four-combat-actions').evaluate(controls => controls.scrollIntoView({ block: 'center' }));
      const box = (await action.boundingBox())!;
      expect(box.width).toBeGreaterThanOrEqual(48);
      expect(box.height).toBeGreaterThanOrEqual(48);
      expect(box.y + box.height).toBeLessThanOrEqual(viewport.height);
      expect(box.x + box.width).toBeLessThanOrEqual(viewport.width);
      const now = new Date();
      await page.clock.install({ time: now });
      await page.clock.pauseAt(new Date(now.getTime() + 60_000));
      await setCombatFaces(page, Array(name === 'Momentum' ? 10 : 14).fill(1));
      await action.focus();
      await page.keyboard.press('Enter');
      await page.keyboard.down(' ');
      await expect(action).toBeDisabled();
      await page.clock.runFor(300);
      if (name === 'Momentum') await expect(action).toBeDisabled();
      else await expect(action).toBeEnabled();
      await page.keyboard.up(' ');
      await page.clock.runFor(300);
      await expect(name === 'Momentum' ? page.getByRole('button', { name: 'Melee', exact: true }) : action).toBeFocused();
      await expect(page.getByRole('status', { name: 'Combat result' })).toHaveText(/^Turn 1\./);
      if (name === 'Momentum') await expect(page.getByLabel('Momentum stacks')).toHaveText('Momentum stacks · 1');
      else await expect(page.getByLabel('Slime health')).toHaveText('1 / 5 HP');
    });
  }
}
