import { test, expect } from '@playwright/test';
import { attack, checkpoint, seed, steps, wrapCheckpoint } from './helpers';

declare global { interface Window { restoreProgressionTestWrites?: () => void } }

test('four wins across two waves unlock a spend and save the effective build', async ({ page }) => {
  const world = { ...checkpoint.world, slimes: checkpoint.world.slimes.map((s, index) => ({ ...s, position: { x: index + 4, y: 3 } })) };
  const character = { ...checkpoint.character, skills: { combat: 5, lore: 0, subterfuge: 0 } };
  await seed(page, { ...checkpoint, character, world });
  const win = async (direction: string, back = true, defense = 3) => {
    await steps(page, direction);
    await attack(page, [...Array(8).fill(8), ...Array(defense).fill(1)]);
    if (back) await page.getByRole('button', { name: 'Back to clearing' }).click();
  };
  await win('right');
  await page.getByText('Character', { exact: true }).click();
  await expect(page.getByLabel('Character progression')).toContainText('1 / 5 XP');
  await page.getByText('Character', { exact: true }).click();
  await steps(page, 'right');
  await win('right');
  await steps(page, 'right');
  await win('right');
  await page.reload();
  await page.getByRole('button', { name: 'Resume', exact: true }).click();
  const find = page.getByRole('button', { name: 'Find more slimes' });
  await expect(find).toBeVisible();
  await page.evaluate(() => { Math.random = () => 0; });
  await find.click();
  await expect(find).toHaveCount(0);
  await win('right', false, 4);
  await expect(page.locator('#screen')).toContainText('Level 2 reached.');
  await page.reload();
  await page.getByRole('button', { name: 'Resume', exact: true }).click();
  await page.getByText('Character', { exact: true }).click();
  await expect(page.getByLabel('Character progression')).toContainText('Level 2');
  await page.getByRole('button', { name: 'Raise Combat', exact: true }).click();
  await expect(page.getByLabel('Character skills')).toContainText('Combat 6');
  await expect(page.getByLabel('Character progression')).toContainText('0 points available');
  await page.reload();
  await page.getByRole('button', { name: 'Resume', exact: true }).click();
  await page.getByText('Character', { exact: true }).click();
  await expect(page.getByLabel('Character skills')).toContainText('Combat 6');
});

test('failed wave generation and spending preserve the durable checkpoint', async ({ page }) => {
  await seed(page, { ...checkpoint, completedEncounterIds: checkpoint.world.slimes.map(s => s.id), progression: { ...checkpoint.progression, level: 2 } });
  const read = () => page.evaluate(() => localStorage.getItem('simple-rpg.save.v9'));
  const before = await read();
  await page.evaluate(() => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) {
      if (key === 'simple-rpg.save.v9') throw Error('quota');
      original.call(this, key, value);
    };
  });
  const find = page.getByRole('button', { name: 'Find more slimes' });
  await find.click();
  await expect(page.getByRole('status', { name: 'Save status' })).toContainText('cannot be saved');
  await expect(find).toBeEnabled();
  await page.getByText('Character', { exact: true }).click();
  await page.getByRole('button', { name: 'Raise Prowess' }).click();
  await expect(page.getByLabel('Character progression')).toContainText('1 point available');
  expect(await read()).toBe(before);
  await page.reload();
  await page.getByRole('button', { name: 'Resume', exact: true }).click();
  await find.click();
  await expect(find).toHaveCount(0);
  await page.getByText('Character', { exact: true }).click();
  await page.getByRole('button', { name: 'Raise Prowess' }).click();
  await expect(page.getByLabel('Hero health')).toHaveText('5 / 6 HP');
});

test('two open tabs cannot spend the same point twice', async ({page,context}) => {
  await seed(page, { ...checkpoint, progression: { ...checkpoint.progression, level: 2 } });
  const second = await context.newPage();
  await second.goto('./');
  await second.getByRole('button', {name:'Resume', exact:true}).click();
  for (const candidate of [page,second]) {
    await candidate.bringToFront();
    await candidate.getByText('Character', {exact:true}).click();
  }
  await page.bringToFront();
  await page.getByRole('button', {name:'Raise Combat', exact:true}).click();
  await expect(page.getByLabel('Character skills')).toContainText('Combat 3');
  await second.bringToFront();
  await second.getByRole('button', {name:'Raise Prowess', exact:true}).click();
  await expect(second.getByRole('status', {name:'Save status'})).toContainText('changed in another tab');
  const progress=await page.evaluate(()=>JSON.parse(localStorage.getItem('simple-rpg.save.v9')!).slots[0].checkpoint.progression);
  expect(progress.investments).toMatchObject({attributes:{prowess:0},skills:{combat:1}});
});

test('Retry save commits two pending victories exactly once', async ({page}) => {
  const world = { ...checkpoint.world, slimes: checkpoint.world.slimes.map((s, index) => ({ ...s, position: { x: index + 4, y: 3 } })) };
  await seed(page,{...checkpoint,world,slimeLevel:3,completedEncounterIds:['slime-3'],progression:{...checkpoint.progression,xp:4}});
  await page.evaluate(() => {
    const original = Storage.prototype.setItem;
    window.restoreProgressionTestWrites = () => { Storage.prototype.setItem = original; };
    Storage.prototype.setItem = function (key, value) {
      if (key.endsWith('.v9')) throw Error('quota');
      original.call(this, key, value);
    };
  });
  await steps(page,'right');
  await attack(page,[8,8,8,8,8,1,1,1,1,1]);
  await page.getByRole('button',{name:'Back to clearing'}).click();
  await steps(page,'right',2);
  await attack(page,[8,8,8,8,8,1,1,1,1,1]);
  await page.getByRole('button',{name:'Back to clearing'}).click();
  await expect(page.getByRole('button',{name:'Find more slimes'})).toBeDisabled();
  await page.getByText('Character',{exact:true}).click();
  await expect(page.getByLabel('Character progression')).toContainText('Level 3 · 0 / 5 XP');
  await expect(page.getByRole('button',{name:'Raise Combat'})).toHaveCount(0);
  await page.evaluate(() => window.restoreProgressionTestWrites!());
  await page.getByRole('button',{name:'Retry save'}).click();
  await expect(page.getByRole('button',{name:'Find more slimes'})).toBeEnabled();
  await page.reload();
  await page.getByRole('button',{name:'Resume',exact:true}).click();
  await page.getByText('Character',{exact:true}).click();
  await expect(page.getByLabel('Character progression')).toContainText('Level 3 · 0 / 5 XP · 2 points available');
});

test('an Iteration 5 peaceful adventure upgrades and can spawn a new wave', async ({page}) => {
  const {progression,initialSlimes,slimeLevel,...previous}=checkpoint;
  const oldCheckpoint={...previous,version:5,completedEncounterIds:checkpoint.world.slimes.map(slime=>slime.id)};
  const roster={version:6,slots:[{...wrapCheckpoint().slots[0],checkpoint:oldCheckpoint}]};
  await page.goto('./');
  await page.evaluate(value=>localStorage.setItem('simple-rpg.save.v6',JSON.stringify(value)),roster);
  await page.reload();
  await page.getByRole('button',{name:'Resume',exact:true}).click();
  await expect(page.getByRole('button',{name:'Find more slimes'})).toBeEnabled();
  await page.getByText('Character',{exact:true}).click();
  await expect(page.getByLabel('Character progression')).toContainText('Level 1 · 0 / 5 XP');
  const upgraded=await page.evaluate(()=>JSON.parse(localStorage.getItem('simple-rpg.save.v9')!));
  expect(upgraded.slots[0].checkpoint.initialSlimes).toEqual(initialSlimes);
  expect(upgraded.slots[0].checkpoint.completedEncounterIds).toEqual(oldCheckpoint.completedEncounterIds);
});

for (const viewport of [{width:320,height:568},{width:390,height:844},{width:844,height:390}]) {
  test(`advancement controls retain keyboard focus at ${viewport.width}×${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await seed(page,{...checkpoint,completedEncounterIds:checkpoint.world.slimes.map(slime=>slime.id),progression:{...checkpoint.progression,level:3}});
    await page.addStyleTag({content:'.detail-content { font-size: 20px; } .advancement-controls button { font-size: 18px; }'});
    const sheet=page.getByText('Character',{exact:true});
    await sheet.focus();
    await page.keyboard.press('Enter');
    const raise=page.getByRole('button',{name:'Raise Combat',exact:true});
    await raise.focus();
    await page.keyboard.press('Enter');
    await expect(raise).toBeFocused();
    await expect(page.getByLabel('Character skills')).toContainText('Combat 3');
    await page.keyboard.press('Enter');
    await expect(sheet).toBeFocused();
    await expect(page.getByLabel('Character skills')).toContainText('Combat 4');
    const find=page.getByRole('button',{name:'Find more slimes'});
    await find.focus();
    await page.keyboard.press('Enter');
    await expect(find).toHaveCount(0);
    await expect(page.getByRole('button',{name:'Move up'})).toBeFocused();
    expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(viewport.width);
  });
}
