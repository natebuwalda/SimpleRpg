import { expect, test, type Page } from '@playwright/test';
import { attack, checkpoint, seed, setCombatFaces, steps } from './helpers';

const position = { x: 15, y: 14 };
const slimeFirst = [1,1,1,1,1,1, 8,1,1];
const heroFirst = [8,1,1,1,1,1, 1,1,1];
const oneDamage = [8,1,1, 1,1,1,1];

async function beginEncounter(page: Page, faces: number[]) {
  await steps(page, 'down', 1, faces);
  return page.getByRole('list', { name: 'Turn Order', exact: true }).getByRole('listitem');
}

test('shows initiative before combat and keeps the same order across rounds', async ({ page }) => {
  await seed(page, { ...checkpoint, position });
  const order = await beginEncounter(page, slimeFirst);
  await expect(order).toHaveText(['Meadow slime · 1 success', 'You · 0 successes']);
  await expect(page.getByLabel('Hero health')).toHaveText('5 / 5 HP');
  const summary = page.locator('.combat-result');
  await attack(page, [...oneDamage, 8,1,1,1,1, 1,1,1]);
  await expect(summary).toHaveText(/^Slime:.*You:/);
  await expect(order).toHaveText(['Meadow slime · 1 success', 'You · 0 successes']);
  await page.getByText('Roll details', { exact: true }).click();
  const rollLabels = await page.locator('.detail-content > [aria-label]').filter({ visible: true }).evaluateAll(
    nodes => nodes.map(node => node.getAttribute('aria-label')),
  );
  expect(rollLabels).toEqual(['Slime attack dice', 'Your defense dice', 'Your attack dice', 'Slime defense dice']);
});

test('Run uses initiative and saves surviving damage without persisting the order', async ({ page }) => {
  await seed(page, { ...checkpoint, position });
  const order = await beginEncounter(page, slimeFirst);
  await expect(order.first()).toContainText('Meadow slime');
  await setCombatFaces(page, oneDamage);
  await page.getByRole('button', { name: 'Run', exact: true }).tap();
  await expect(page.getByLabel('Position')).toHaveText('15, 14');
  await expect(page.getByLabel('Hero health')).toHaveText('4 / 5 HP');
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('simple-rpg.save.v9')!).slots[0].checkpoint);
  expect(stored).toEqual({ ...checkpoint, position, hp: 4 });
  await page.reload();
  await page.getByRole('button', { name: 'Resume', exact: true }).tap();
  await expect(page.getByLabel('Hero health')).toHaveText('4 / 5 HP');
  await beginEncounter(page, heroFirst);
  await expect(order.first()).toContainText('You');
  await page.getByRole('button', { name: 'Run', exact: true }).tap();
  await expect(page.getByLabel('Hero health')).toHaveText('4 / 5 HP');
});

for (const viewport of [{ width: 320, height: 568 }, { width: 390, height: 844 }, { width: 844, height: 390 }]) {
  test(`slime-first defeat and Restart remain usable at ${viewport.width}×${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await seed(page, { ...checkpoint, position, hp: 1 });
    const order = await beginEncounter(page, slimeFirst);
    await expect(order.first()).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(viewport.width);
    const run = page.getByRole('button', { name: 'Run', exact: true });
    expect((await run.boundingBox())?.height).toBeGreaterThanOrEqual(48);
    await setCombatFaces(page, oneDamage);
    await run.focus();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('heading', { name: 'Defeated' })).toBeVisible();
    await expect(page.locator('.combat-result')).toHaveText(/^Slime:/);
    await page.getByText('Roll details', { exact: true }).click();
    await expect(page.getByLabel('Slime attack dice')).toBeVisible();
    await expect(page.getByLabel('Your attack dice')).toHaveCount(0);
    await page.getByRole('button', { name: 'Restart', exact: true }).tap();
    await expect(page.getByLabel('Hero health')).toHaveText('5 / 5 HP');
  });
}
