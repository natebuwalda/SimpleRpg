import assert from 'node:assert/strict';
import { chromium, expect } from '@playwright/test';
import { createCharacter } from '../e2e/helpers.ts';

const root = new URL(process.argv[2] ?? 'http://127.0.0.1:4181/SimpleRpg/');
const acceptance = new URL('acceptance/', root);
const expectedMainScript = process.argv[3];
const browser = await chromium.launch({ headless: true });
try {
  const context = await browser.newContext({ viewport: { width:390, height:844 }, hasTouch:true });
  const page = await context.newPage();
  const failures = [];
  page.on('pageerror', error => failures.push(error.message));
  page.on('response', response => { if(response.status() >= 400) failures.push(`${response.status()} ${response.url()}`); });
  page.on('requestfailed', request => failures.push(request.url()));
  async function beginAdventure(){
    await page.getByRole('button',{name:'New Game',exact:true}).tap();
    const input=page.getByRole('textbox',{name:'Character name',exact:true});
    await expect(input.or(page.getByLabel('Hero health'))).toBeVisible();
    if(await input.isVisible()){
      await createCharacter(page);
      await page.getByRole('button',{name:'Begin adventure',exact:true}).click();
    }
  }
  const mainResponse = await page.goto(root.href);
  assert.equal(mainResponse.status(), 200);
  const mainHtml = await mainResponse.text();
  if(expectedMainScript) assert.ok(mainHtml.includes(expectedMainScript), 'Main entry script changed');
  await beginAdventure();
  const mainEdition = await page.locator('.edition').innerText();
  const mainHealth = await page.getByLabel('Hero health').innerText();
  const readMainSaves = () => page.evaluate(() => Object.fromEntries(Object.entries(localStorage).filter(([key])=>key.startsWith('simple-rpg.save.'))));
  const mainSaves = await readMainSaves();
  assert.ok(Object.keys(mainSaves).length > 0, 'Main did not save');
  const acceptanceResponse = await page.goto(acceptance.href);
  assert.equal(acceptanceResponse.status(), 200);
  assert.match(await acceptanceResponse.text(), /\/SimpleRpg\/acceptance\/assets\//);
  await expect(page.getByRole('button',{name:'Continue',exact:true})).toBeDisabled();
  await beginAdventure();
  await expect(page.getByLabel('Hero health')).toHaveText('5 / 5 HP');
  const acceptanceEdition = await page.locator('.edition').innerText();
  const acceptanceSave = await page.evaluate(()=>localStorage.getItem('simple-rpg.acceptance.save.v5'));
  assert.ok(acceptanceSave, 'Acceptance did not use its isolated save key');
  assert.deepEqual(await readMainSaves(), mainSaves, 'Acceptance modified main saves');
  await page.reload();
  await page.getByRole('button',{name:'Continue',exact:true}).tap();
  await expect(page.getByLabel('Hero health')).toHaveText('5 / 5 HP');
  await page.goto(root.href);
  await page.getByRole('button',{name:'Continue',exact:true}).tap();
  await expect(page.getByLabel('Hero health')).toHaveText(mainHealth);
  assert.equal(await page.evaluate(()=>localStorage.getItem('simple-rpg.acceptance.save.v5')), acceptanceSave);
  assert.deepEqual(failures, [], 'Runtime or asset errors');
  console.log(JSON.stringify({ main:root.href, mainEdition, mainHealth, acceptance:acceptance.href, acceptanceEdition, isolatedSaves:true, failures },null,2));
} finally {
  await browser.close();
}
