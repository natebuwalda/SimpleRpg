import { expect, test } from '@playwright/test';
import { attack, checkpoint, createCharacter, seed, setCombatFaces, steps, wrapCheckpoint } from './helpers';

test('a Wizard keeps the draft through Back and a failed Begin, then casts Magic', async ({ page }) => {
  await page.goto('./');
  await page.getByRole('button', { name: 'New Character' }).click();
  await expect(page.getByRole('combobox', { name: 'Class' })).toHaveValue('');
  await createCharacter(page, { ...checkpoint.character, classId: 'wizard' });
  const back = page.getByRole('button', { name: 'Back', exact: true });
  await back.click();
  await back.click();
  await expect(page.getByRole('combobox', { name: 'Class' })).toHaveValue('wizard');
  await page.getByRole('button', { name: 'Next: skills' }).click();
  await page.getByRole('button', { name: 'Review character' }).click();
  await expect(page.getByLabel('Creation attack pool')).toHaveText('4d10');
  await page.evaluate(() => {
    const setItem = Storage.prototype.setItem;
    let failOnce = true;
    Storage.prototype.setItem = function (key, value) {
      if (key.endsWith('.save.v12') && failOnce) {
        failOnce = false;
        throw Error('quota');
      }
      setItem.call(this, key, value);
    };
    Math.random = () => 0;
  });
  const begin = page.getByRole('button', { name: 'Begin adventure' });
  await begin.click();
  await expect(page.getByRole('status', { name: 'Creation result' })).toBeVisible();
  await expect(page.getByLabel('Character class')).toHaveText('Wizard');
  await begin.click();
  await expect(page.getByLabel('Position')).toHaveText('3, 3');
  await steps(page, 'right');
  await expect(page.getByRole('button', { name: 'Melee', exact: true })).toHaveCount(0);
  await attack(page, [8,8,8,1, 1,1,1]);
  await expect(page.getByRole('heading', { name: 'Victory!' })).toBeVisible();
});

test('Lore improves Magic and Reload and Restart keep the Wizard action', async ({ page }) => {
  await seed(page, {
    ...checkpoint, position: { x: 3, y: 3 }, hp: 1,
    character: { ...checkpoint.character, classId: 'wizard' },
    world: { ...checkpoint.world, slimes: [
      { id: 'slime-1', position: { x: 4, y: 3 } }, ...checkpoint.world.slimes.slice(1),
    ] },
    progression: { ...checkpoint.progression, level: 2 },
  });
  await page.getByText('Character', { exact: true }).click();
  await expect(page.getByLabel('Combat pools')).toHaveText('Magic 4d10 · Defense 4d10');
  await page.getByRole('button', { name: 'Raise Lore', exact: true }).click();
  await expect(page.getByLabel('Combat pools')).toHaveText('Magic 5d10 · Defense 4d10');
  await page.reload();
  await page.getByRole('button', { name: 'Resume', exact: true }).click();
  await steps(page, 'right');
  const magic = page.getByRole('button', { name: 'Magic', exact: true });
  await expect(page.locator('.combat-result')).toHaveText('Magic 5d10 vs 3d10 defense.');
  await setCombatFaces(page, [1,1,1,1,1, 1,1,1, 8,1,1, 1,1,1,1]);
  await magic.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { name: 'Defeated' })).toBeVisible();
  await page.getByRole('button', { name: 'Restart', exact: true }).click();
  await steps(page, 'right');
  await expect(magic).toBeEnabled();
  await expect(page.locator('.combat-result')).toHaveText('Magic 5d10 vs 3d10 defense.');
});

test('an Iteration 7 save opens as Warrior with the current wave and Melee pool', async ({ page }) => {
  const { classId, ...character } = checkpoint.character;
  const roster = wrapCheckpoint({ ...checkpoint, position: { x: 14, y: 15 }, slimeLevel: 3 });
  const old = { version: 8, slots: roster.slots.map(slot => ({
    ...slot, checkpoint: { ...slot.checkpoint, version: 7, character },
  })) };
  await page.goto('./');
  await page.evaluate(data => localStorage.setItem('simple-rpg.save.v8', data), JSON.stringify(old));
  await page.reload();
  await page.getByRole('button', { name: 'Resume', exact: true }).click();
  await expect(page.getByLabel('Current wave')).toHaveText('Wave 3');
  await steps(page, 'right');
  await expect(page.getByRole('button', { name: 'Melee', exact: true })).toBeVisible();
  await expect(page.locator('.combat-result')).toHaveText('Melee 5d10 vs 5d10 defense.');
  const saved = await page.evaluate(() => ({
    old: localStorage.getItem('simple-rpg.save.v8'),
    current: JSON.parse(localStorage.getItem('simple-rpg.save.v12')!),
  }));
  expect(saved.old).toBe(JSON.stringify(old));
  expect(saved.current.slots[0].checkpoint.character.classId).toBe('warrior');
});

for (const viewport of [{ width: 320, height: 568 }, { width: 390, height: 844 }, { width: 844, height: 390 }]) {
  test(`held Magic input cannot queue a turn at ${viewport.width}×${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await seed(page, { ...checkpoint, position: { x: 14, y: 15 }, character: { ...checkpoint.character, classId: 'wizard' } });
    await steps(page, 'right');
    const magic = page.getByRole('button', { name: 'Magic', exact: true });
    const box = (await magic.boundingBox())!;
    expect(box.height).toBeGreaterThanOrEqual(48);
    expect(box.x + box.width).toBeLessThanOrEqual(viewport.width);
    const now = new Date();
    await page.clock.install({ time: now });
    await page.clock.pauseAt(new Date(now.getTime() + 60_000));
    await setCombatFaces(page, [8,8,1,1, 1,1,1, 1,1,1, 1,1,1,1]);
    await magic.focus();
    await page.keyboard.press('Enter');
    await page.keyboard.down(' ');
    await expect(magic).toBeDisabled();
    await page.clock.runFor(300);
    await expect(magic).toBeEnabled();
    await page.keyboard.up(' ');
    await expect(magic).toBeFocused();
    await expect(page.getByLabel('Slime health')).toHaveText('1 / 3 HP');
  });
}
