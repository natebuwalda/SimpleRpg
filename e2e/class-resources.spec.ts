import { expect, test, type Page } from '@playwright/test';
import { attack, checkpoint, seed, setCombatFaces, startAdventure, steps } from './helpers';

const adjacent = { x: 14, y: 15 };
const wizard = { ...checkpoint.character, classId: 'wizard' as const };
const rogue = { ...checkpoint.character, classId: 'rogue' as const };
const button = (page: Page, name: string) => page.getByRole('button', { name, exact: true });
const resources = (page: Page) => page.getByLabel('Resources', { exact: true });
const announcement = (page: Page) => page.getByRole('status', { name: 'Combat result' });

async function commandWithDice(page: Page, name: string, faces: number[]) {
  const command = button(page, name);
  await expect(command).toBeEnabled();
  const before = await announcement(page).textContent();
  await setCombatFaces(page, faces);
  await command.tap();
  await expect(announcement(page)).not.toHaveText(before ?? '');
}

test('Warrior gains and spends Resources, and Execute uses a strict Health threshold', async ({ page }) => {
  await page.goto('./');
  await page.evaluate(() => { Math.random = () => 0; });
  await startAdventure(page);
  await steps(page, 'right');
  await expect(resources(page)).toHaveText('0 / 5 Resources');
  await expect(button(page, 'Execute')).toBeDisabled();
  await attack(page, [1,1,1,1,1, 1,1,1, 8,1,1, 1,1,1,1]);
  await expect(resources(page)).toHaveText('2 / 5 Resources');
  await commandWithDice(page, 'Momentum', Array(8).fill(1));
  await expect(resources(page)).toHaveText('2 / 5 Resources');
  await commandWithDice(page, 'Momentum', Array(9).fill(1));
  await expect(resources(page)).toHaveText('1 / 5 Resources');
  await expect(page.getByLabel('Momentum stacks')).toHaveText('Momentum stacks · 2');
  await expect(page.getByLabel('Momentum cost')).toHaveText('Momentum cost · 2');
  await attack(page, [8, ...Array(18).fill(1)]);
  await expect(page.getByLabel('Slime health')).toHaveText('2 / 3 HP');
  await expect(resources(page)).toHaveText('2 / 5 Resources');
  await expect(button(page, 'Execute')).toBeDisabled();
  await attack(page, Array(19).fill(1));
  await expect(page.getByLabel('Execute threshold')).toHaveText('Execute requires target HP below 3');
  await button(page, 'Execute').tap();
  await expect(page.getByRole('heading', { name: 'Victory!' })).toBeVisible();
  await expect(announcement(page)).toContainText('Execute: Target defeated.');
});

test('a Rogue entering at zero can Prepare despite losing initiative and carry Exploit Resources after Run', async ({ page }) => {
  await seed(page, { ...checkpoint, character: rogue, position: adjacent, currentResources: 0 });
  await steps(page, 'right', 1, [1,1,1,1,1,1, 8,1,1]);
  const order = page.getByRole('list', { name: 'Turn Order' }).getByRole('listitem');
  await expect(order.first()).toContainText('Meadow slime');
  await expect(resources(page)).toHaveText('1 / 5 Resources');
  await attack(page, Array(15).fill(1));
  await expect(button(page, 'Exploit')).toBeDisabled();
  await commandWithDice(page, 'Prepare', Array(7).fill(1));
  await expect(announcement(page)).toHaveText(/^Turn 2\. Slime:.*Prepare:/);
  await expect(order.first()).toContainText('You · 1 success');
  await expect(resources(page)).toHaveText('0 / 5 Resources');
  await expect(button(page, 'Prepare')).toBeDisabled();
  await commandWithDice(page, 'Exploit', Array(7).fill(1));
  await expect(page.getByLabel('Slime health')).toHaveText('2 / 3 HP');
  await expect(page.getByLabel('Exploit stacks')).toHaveText('Exploit stacks · 0');
  await expect(button(page, 'Exploit')).toBeDisabled();
  await button(page, 'Run').tap();
  await expect(page.getByLabel('Position')).toHaveText('14, 15');
  await page.reload();
  await button(page, 'Resume').tap();
  await expect(resources(page)).toHaveText('1 / 5 Resources');
});

test('Wizard reserves a chosen amount, shields hits, and can release at zero available', async ({ page }) => {
  await seed(page, { ...checkpoint, character: wizard, position: adjacent, slimeLevel: 9 });
  await steps(page, 'right', 1, [8,1,1,1,1,1, ...Array(11).fill(1)]);
  const amount = page.getByRole('spinbutton', { name: 'Resources to reserve' });
  const incoming = [8,8,8, ...Array(12).fill(1)];
  await expect(resources(page)).toHaveText('5 / 5 Resources');
  await amount.fill('1.5');
  await expect(button(page, 'Study')).toBeDisabled();
  await expect(announcement(page)).toHaveText('');
  await amount.fill('3');
  await commandWithDice(page, 'Study', incoming);
  await expect(resources(page)).toHaveText('2 / 5 Resources');
  await expect(page.getByLabel('Shield reservation')).toHaveText('Shield · 3 reserved · blocks up to 3 damage per hit');
  await expect(page.getByLabel('Hero health')).toHaveText('5 / 5 HP');
  await expect(announcement(page)).toContainText('Shield absorbed 3');
  await commandWithDice(page, 'Nuke', incoming);
  await commandWithDice(page, 'Nuke', incoming);
  await expect(button(page, 'Nuke')).toBeDisabled();
  await expect(resources(page)).toHaveText('0 / 5 Resources');
  await commandWithDice(page, 'Release Shield', incoming);
  await expect(resources(page)).toHaveText('3 / 5 Resources');
  await expect(page.getByLabel('Hero health')).toHaveText('2 / 5 HP');
  await expect(page.getByLabel('Shield reservation')).toHaveCount(0);
});

for (const viewport of [{ width: 320, height: 568 }, { width: 390, height: 844 }, { width: 844, height: 390 }]) {
  test(`Study amount and four Wizard actions remain usable at ${viewport.width}×${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await seed(page, { ...checkpoint, character: wizard, position: adjacent });
    await steps(page, 'right');
    const amount = page.getByRole('spinbutton', { name: 'Resources to reserve' });
    await amount.fill('2');
    await page.locator('.four-combat-actions').evaluate(group => group.scrollIntoView({ block: 'center' }));
    for (const name of ['Magic', 'Nuke', 'Study', 'Run']) {
      const control = button(page, name);
      const box = (await control.boundingBox())!;
      expect(box.width).toBeGreaterThanOrEqual(48);
      expect(box.height).toBeGreaterThanOrEqual(48);
      await expect(control).toBeInViewport({ ratio: 1 });
    }
    const now = new Date();
    await page.clock.install({ time: now });
    await page.clock.pauseAt(new Date(now.getTime() + 60_000));
    await setCombatFaces(page, Array(7).fill(1));
    await button(page, 'Study').focus();
    await page.keyboard.press('Enter');
    await page.keyboard.down(' ');
    await expect(button(page, 'Release Shield')).toBeDisabled();
    await page.clock.runFor(300);
    await expect(button(page, 'Release Shield')).toBeEnabled();
    await page.keyboard.up(' ');
    await page.clock.runFor(300);
    await expect(button(page, 'Release Shield')).toBeFocused();
    await expect(announcement(page)).toHaveText(/^Turn 1\./);
    await expect(resources(page)).toHaveText('3 / 5 Resources');
  });
}
