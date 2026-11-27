import { test, expect } from '@playwright/test';
import { seed, checkpoint, steps, attack, losingFaces } from './helpers';

test('fixed character and exact bonus dice are understandable through victory', async ({ page }) => {
  await seed(page, { ...checkpoint, position: { x: 15, y: 14 } });
  await page.getByText('Character', { exact: true }).click();
  await expect(page.getByLabel('Character attributes')).toContainText('Prowess 3');
  await expect(page.getByLabel('Character attributes')).toContainText('Cunning 3');
  await expect(page.getByLabel('Character attributes')).toContainText('Resistance 2');
  await expect(page.getByLabel('Character skills')).toHaveText('Combat 2 · Subterfuge 2 · Lore 1');
  await expect(page.getByLabel('Derived stats')).toHaveText('Health 5 · Initiative 6 · Resource capacity 5');
  await expect(page.getByLabel('Combat pools')).toHaveText('Melee 5d10 · Defense 4d10');
  await steps(page, 'down');
  // One original ten and a bonus ten: two successes; defense gets one.
  await attack(page, [10,1,1,1,1, 10, 8,1,1, 1,1,1, 1,1,1,1]);
  await expect(page.getByLabel('Slime health')).toHaveText('2 / 3 HP');
  await expect(page.getByLabel('Hero health')).toHaveText('5 / 5 HP');
  await expect(page.getByRole('status', { name: 'Combat result' })).toContainText('You: 2 vs 1 → 1 damage.');
  await page.getByText('Roll details', { exact: true }).click();
  await expect(page.getByLabel('Your attack dice')).toContainText('Original: 10, 1, 1, 1, 1. Bonus: 10. Successes: 2.');
  await attack(page, [8,8,8,8,8, 1,1,1]);
  await expect(page.getByRole('heading', { name: 'Victory!' })).toBeVisible();
  await page.getByText('Roll details', { exact: true }).click();
  await expect(page.getByLabel('Your attack dice')).toContainText('Successes: 5');
  await expect(page.getByText('No counterattack.', { exact: true })).toBeVisible();
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('simple-rpg.save.v10')!).slots[0].checkpoint);
  expect(saved.hp).toBe(5); expect(saved.character).toEqual(checkpoint.character);
  expect(saved).not.toHaveProperty('lastTurn');
});

test('zero-success ties cause no damage and Run preserves prior damage', async ({ page }) => {
  await seed(page, { ...checkpoint, position: { x: 15, y: 14 } }); await steps(page, 'down');
  await attack(page, Array(15).fill(1));
  await expect(page.getByLabel('Slime health')).toHaveText('3 / 3 HP');
  await expect(page.getByLabel('Hero health')).toHaveText('5 / 5 HP');
  await expect(page.getByRole('status', { name: 'Combat result' })).toContainText('You: 0 vs 0 → 0 damage.');
  await attack(page);
  await expect(page.getByLabel('Hero health')).toHaveText('3 / 5 HP');
  await page.getByRole('button', { name: 'Run', exact: true }).tap();
  await expect(page.getByLabel('Position')).toHaveText('15, 14');
  await expect(page.getByLabel('Hero health')).toHaveText('3 / 5 HP');
  await page.reload(); await page.getByRole('button', { name: 'Resume', exact: true }).tap();
  await expect(page.getByLabel('Hero health')).toHaveText('3 / 5 HP');
});

test('defeat explains the finishing counterattack', async ({ page }) => {
  await seed(page, { ...checkpoint, position: { x:15,y:14 }, hp:2 }); await steps(page,'down');
  await attack(page, losingFaces);
  await expect(page.getByRole('heading',{name:'Defeated',exact:true})).toBeVisible();
  await expect(page.getByRole('status',{name:'Combat result'})).toContainText('Slime: 3 vs 0 → 3 damage.');
  await page.getByText('Roll details',{exact:true}).click();
  await expect(page.getByLabel('Slime attack dice')).toContainText('Successes: 3');
});

test('arrow keys read open battle details without replacing the disclosure or focus', async ({ page }) => {
  await page.setViewportSize({width:320,height:568});
  await seed(page,{...checkpoint,position:{x:15,y:14}}); await steps(page,'down');
  await attack(page,Array(15).fill(1));
  const summary=page.locator('summary').filter({hasText:'Roll details'});
  await summary.focus();await page.keyboard.press('Enter');
  await expect(summary.locator('..')).toHaveAttribute('open','');
  await page.keyboard.press('ArrowDown');
  await expect(summary.locator('..')).toHaveAttribute('open','');
  await expect(summary).toBeFocused();
});

test('arrow keys read character details without moving the exploring hero', async ({ page }) => {
  await seed(page);
  const summary=page.locator('summary').filter({hasText:'Character'});
  await summary.focus();await page.keyboard.press('Enter');
  await page.keyboard.press('ArrowRight');
  await expect(page.getByLabel('Position')).toHaveText('3, 3');
  await expect(summary.locator('..')).toHaveAttribute('open','');
  await expect(summary).toBeFocused();
});

test('combat announcements retain their live region and distinguish identical turns without repeating save status', async ({ page }) => {
  await seed(page,{...checkpoint,position:{x:15,y:14}});await steps(page,'down');
  const live=await page.getByRole('status',{name:'Combat result'}).elementHandle();
  const save=page.locator('.save-status');
  await save.evaluate(node=>{
    let mutations=0;
    new MutationObserver(()=>mutations++).observe(node,{childList:true,characterData:true,subtree:true});
    Object.defineProperty(node,'__mutations',{get:()=>mutations});
  });
  await attack(page,Array(15).fill(1));
  expect(await live!.evaluate(node=>node.isConnected)).toBe(true);
  await expect(page.getByRole('status',{name:'Combat result'})).toContainText('Turn 1.');
  await attack(page,Array(15).fill(1));
  expect(await live!.evaluate(node=>node.isConnected)).toBe(true);
  await expect(page.getByRole('status',{name:'Combat result'})).toContainText('Turn 2.');
  expect(await save.evaluate(node=>(node as HTMLElement & {__mutations:number}).__mutations)).toBe(0);
});

for (const viewport of [{ width:320,height:568 }, { width:390,height:844 }, { width:844,height:390 }]) {
  test(`long rolls keep phone commands usable at ${viewport.width}×${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await seed(page, { ...checkpoint, position: { x:15,y:14 } }); await steps(page, 'down');
    await page.addStyleTag({content:'.description { font-family: monospace; font-size: 18px; }'});
    await attack(page, Array(15).fill(1));
    for (const button of await page.getByRole('button').filter({hasNotText:'Return to characters'}).all()) {
      const box = (await button.boundingBox())!;
      expect(box.width).toBeGreaterThanOrEqual(48); expect(box.height).toBeGreaterThanOrEqual(48);
      expect(box.y + box.height).toBeLessThanOrEqual(viewport.height);
    }
    await page.screenshot({path:`test-results/iteration-3-battle-${viewport.width}.png`,fullPage:true});
    // Both hero and slime defense roll their maximum bonus dice: a lethal margin of four.
    await attack(page, Array(16).fill(10));
    await page.addStyleTag({content:'.description { font-family: monospace; font-size: 18px; }'});
    for (const button of await page.getByRole('button').filter({hasNotText:'Return to characters'}).all()) {
      const box = (await button.boundingBox())!;
      expect(box.width).toBeGreaterThanOrEqual(48); expect(box.height).toBeGreaterThanOrEqual(48);
      expect(box.y + box.height).toBeLessThanOrEqual(viewport.height);
    }
    await page.getByText('Roll details', { exact:true }).click();
    await expect(page.getByLabel('Your attack dice')).toContainText('Bonus: 10, 10, 10, 10, 10');
    await page.screenshot({path:`test-results/iteration-3-rolls-${viewport.width}.png`,fullPage:true});
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.getByRole('button', { name:'Back to clearing' }).tap();
    await expect(page.getByLabel('Position')).toHaveText('15, 14');
    await page.screenshot({path:`test-results/iteration-3-${viewport.width}.png`,fullPage:true});
  });
}
