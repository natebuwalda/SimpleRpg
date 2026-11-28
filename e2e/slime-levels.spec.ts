import { expect, test, type Page } from '@playwright/test';
import { attack, checkpoint, seed, steps } from './helpers';

const cleared = { ...checkpoint, completedEncounterIds: checkpoint.world.slimes.map(slime => slime.id) };
const currentSlimeLevel = (page: Page) => page.getByLabel('Slime level', { exact: true });
const waveLabel = (page: Page) => page.getByLabel('Current wave', { exact: true });
const find = (page: Page) => page.getByRole('button', { name: 'Find more slimes', exact: true });
const resume = (page: Page) => page.getByRole('button', { name: 'Resume', exact: true }).click();

test('Find creates a level two wave with four Health, four dice, and two XP', async ({ page }) => {
  await seed(page, cleared);
  await expect(waveLabel(page)).toHaveText('Wave 1');
  await page.evaluate(() => { Math.random = () => 0; });
  await find(page).click();
  await expect(waveLabel(page)).toHaveText('Wave 2');
  await page.reload();
  await resume(page);
  await expect(waveLabel(page)).toHaveText('Wave 2');
  await steps(page, 'right');
  await expect(currentSlimeLevel(page)).toHaveText('Slime level 2');
  await expect(page.getByLabel('Slime health')).toHaveText('4 / 4 HP');
  await expect(page.locator('.combat-result')).toContainText('vs 4d10 defense');
  await attack(page, [8,8,8,8,8,1,1,1,1]);
  await expect(page.locator('#screen')).toContainText('+2 XP.');
  await page.reload();
  await resume(page);
  await expect(waveLabel(page)).toHaveText('Wave 2');
  await page.getByText('Character', { exact:true }).click();
  await expect(page.getByLabel('Character progression')).toContainText('2 / 5 total XP');
});

test('Restart after a boosted defeat preserves advancement and restores level one', async ({ page }) => {
  await seed(page, { ...checkpoint, slimeLevel:2, hp:2, position:{x:14,y:15}, progression:{...checkpoint.progression,level:3,xp:2} });
  await steps(page,'right');
  await attack(page, [...Array(9).fill(1), ...Array(4).fill(8), ...Array(4).fill(1)]);
  await expect(page.getByRole('heading',{name:'Defeated',exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Restart',exact:true}).click();
  await expect(waveLabel(page)).toHaveText('Wave 1');
  await expect(page.getByLabel('Hero health')).toHaveText('5 / 5 HP');
  await page.getByText('Character',{exact:true}).click();
  await expect(page.getByLabel('Character progression')).toContainText('Level 3 · 17 / 30 total XP · 2 points available');
});

test('only one tab advances a cleared wave', async ({ page, context }) => {
  await seed(page, cleared);
  const other = await context.newPage();
  await other.goto('./');
  await resume(other);
  await page.bringToFront();
  await find(page).click();
  await expect(waveLabel(page)).toHaveText('Wave 2');
  await other.bringToFront();
  await find(other).click();
  await expect(other.getByRole('status', { name:'Save status' })).toContainText('changed in another tab');
  const wave = await other.evaluate(() => JSON.parse(localStorage.getItem('simple-rpg.save.v13')!).slots[0]);
  expect(wave.revision).toBe(2);
  expect(wave.checkpoint.slimeLevel).toBe(2);
});

for (const size of [{width:320,height:568},{width:390,height:844},{width:844,height:390}]) {
  test(`cleared final wave has no Find action at ${size.width}x${size.height}`, async ({ page }) => {
    await page.setViewportSize(size);
    await seed(page,{...cleared,slimeLevel:1022});
    await expect(waveLabel(page)).toHaveText('Wave 1022');
    await expect(waveLabel(page)).toBeInViewport();
    const label = (await waveLabel(page).boundingBox())!;
    const map = (await page.locator('#canvas').boundingBox())!;
    expect(label.y + label.height).toBeLessThanOrEqual(map.y);
    await expect(page.locator('#screen')).toContainText('There are no higher waves.');
    await expect(find(page)).toHaveCount(0);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(size.width);
  });
}
