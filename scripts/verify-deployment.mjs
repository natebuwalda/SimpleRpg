import assert from 'node:assert/strict';
import {chromium,expect} from '@playwright/test';
import {attack,createCharacter,checkpoint} from '../e2e/helpers.ts';

const root=new URL(process.argv[2]??'http://127.0.0.1:4181/SimpleRpg/');
const expectedMainScript=process.argv[3],browser=await chromium.launch({headless:true});
try{
 const context=await browser.newContext({viewport:{width:390,height:844},hasTouch:true});
 const page=await context.newPage(),failures=[];
 page.on('pageerror',e=>failures.push(e.message));
 page.on('response',r=>{if(r.status()>=400)failures.push(r.status()+' '+r.url())});
 page.on('requestfailed',r=>failures.push(r.url()));
 const snapshot=prefix=>page.evaluate(prefix=>Object.fromEntries(Object.entries(localStorage).filter(([key])=>key.startsWith(prefix))),prefix);
 async function open(url,expected){
  const response=await page.goto(url.href);assert.equal(response.status(),200);
  const html=await response.text();if(expected)assert.ok(html.includes(expected),'Main entry changed');
  if(url.pathname.includes('acceptance'))assert.ok(html.includes('/SimpleRpg/acceptance/assets/'));
  return await page.locator('.edition').innerText();
 }
 async function begin(name='Adventurer',warrior=false,worldRoll=.5){
  const roster=await page.getByRole('button',{name:'New Character',exact:true}).count()>0;
  await page.getByRole('button',{name:roster?'New Character':'New Game',exact:true}).click();
  await createCharacter(page,warrior?{name,attributes:{prowess:5,cunning:1,resistance:2},skills:{combat:5,subterfuge:0,lore:0}}:{...checkpoint.character,name});
  // Keep generated fixtures reproducible and clear of the first movement tile.
  await page.evaluate(roll=>{window.__smokeRandom=Math.random;Math.random=()=>roll;},worldRoll);
  await page.getByRole('button',{name:'Begin adventure',exact:true}).click();
  await expect(page.getByLabel('Position')).toHaveText('3, 3');
  await expect(page.locator('#screen')).toHaveAttribute('aria-busy','false');
  await page.evaluate(()=>{Math.random=window.__smokeRandom;});
  return roster;
 }
 async function resume(name){
  const row=page.getByRole('article',{name,exact:true});
  if(await row.count())await row.getByRole('button',{name:'Resume',exact:true}).click();
  else await page.getByRole('button',{name:'Continue',exact:true}).click();
  await expect(page.locator('#screen')).toHaveAttribute('aria-busy','false');
 }
 async function exercise(){
  const roster=await page.getByRole('button',{name:'New Character',exact:true}).count()>0;
  if(roster)await expect(page.getByLabel('Roster capacity')).toHaveText('0 / 10 slots');
  else await expect(page.getByRole('button',{name:'Continue',exact:true})).toBeDisabled();
  await begin('Smoke one');
  if(!roster){
   await page.reload();await resume('Smoke one');await expect(page.getByLabel('Hero health')).toHaveText('5 / 5 HP');return {roster:false};
  }
  await page.getByRole('button',{name:'Move right',exact:true}).click();
  await expect(page.locator('#screen')).toHaveAttribute('aria-busy','false');
  await page.getByRole('button',{name:'Return to characters',exact:true}).click();
  await begin('Smoke two',true);
  await page.getByRole('button',{name:'Move down',exact:true}).click();
  await expect(page.locator('#screen')).toHaveAttribute('aria-busy','false');
  await page.getByRole('button',{name:'Return to characters',exact:true}).click();
  await expect(page.getByLabel('Roster capacity')).toHaveText('2 / 10 slots');
  await resume('Smoke one');await expect(page.getByLabel('Position')).toHaveText('4, 3');await expect(page.getByLabel('Hero health')).toHaveText('5 / 5 HP');
  await page.reload();await resume('Smoke two');await expect(page.getByLabel('Position')).toHaveText('3, 4');await expect(page.getByLabel('Hero health')).toHaveText('7 / 7 HP');
  const edition=await page.locator('.edition').textContent();
  if(edition==='ITERATION 06'||edition==='ITERATION 07'){
   await page.getByRole('button',{name:'Return to characters',exact:true}).click();
   await begin('Smoke progression',true,0);
   await page.getByRole('button',{name:'Move right',exact:true}).click();
   await attack(page,[...Array(10).fill(8),1,1,1]);
   await expect(page.locator('#screen')).toContainText('+1 XP.');
   if(edition==='ITERATION 07'){
    const back=page.getByRole('button',{name:'Back to clearing',exact:true});
    for(let remaining=2;remaining>0;remaining--){
     await back.click();
     await page.getByRole('button',{name:'Move right',exact:true}).click();
     await expect(page.locator('#screen')).toHaveAttribute('aria-busy','false');
     await page.getByRole('button',{name:'Move right',exact:true}).click();
     await attack(page,[...Array(10).fill(8),1,1,1]);
    }
    await back.click();
    await page.evaluate(()=>{Math.random=()=>0;});
    await page.getByRole('button',{name:'Find more slimes',exact:true}).click();
    await expect(page.locator('header').getByLabel('Current wave',{exact:true})).toHaveText('Wave 2');
    await page.getByRole('button',{name:'Move right',exact:true}).click();
    await expect(page.getByLabel('Slime health')).toHaveText('4 / 4 HP');
    await attack(page,[...Array(10).fill(8),1,1,1,1]);
    await expect(page.locator('#screen')).toContainText('+2 XP.');
    await page.reload();await resume('Smoke progression');
    await expect(page.locator('header').getByLabel('Current wave',{exact:true})).toHaveText('Wave 2');
    await page.getByText('Character',{exact:true}).click();
    await expect(page.getByLabel('Character progression')).toContainText('Level 2 · 0 / 5 XP · 1 point available');
    return {roster:true,independentPlaythroughs:2,persistedVictoryXp:true,persistedSlimeLevel:2};
   }
   await page.reload();await resume('Smoke progression');
   await page.getByText('Character',{exact:true}).click();
   await expect(page.getByLabel('Character progression')).toContainText('1 / 5 XP');
   return {roster:true,independentPlaythroughs:2,persistedVictoryXp:true};
  }
  return {roster:true,independentPlaythroughs:2};
 }
 const mainEdition=await open(root,expectedMainScript);
 assert.ok(['ITERATION 04','ITERATION 05','ITERATION 06','ITERATION 07'].includes(mainEdition),`Unexpected main edition: ${mainEdition}`);
 const mainChecks=await exercise();
 const mainSaves=await snapshot('simple-rpg.save.');
 const acceptance=new URL('acceptance/',root);
 const acceptanceEdition=await open(acceptance);
 assert.equal(acceptanceEdition,'ITERATION 07','Acceptance must serve Iteration 7');
 const acceptanceChecks=await exercise();
 assert.deepEqual(await snapshot('simple-rpg.save.'),mainSaves,'Acceptance changed main saves');
 const acceptanceSaves=await snapshot('simple-rpg.acceptance.save.');
 assert.ok(Object.keys(acceptanceSaves).length>0,'No acceptance save');
 await open(root);await resume(mainChecks.roster?'Smoke two':'Smoke one');
 await expect(page.getByLabel('Hero health')).toHaveText(mainChecks.roster?'7 / 7 HP':'5 / 5 HP');
 assert.deepEqual(await snapshot('simple-rpg.acceptance.save.'),acceptanceSaves,'Main changed acceptance saves');
 assert.deepEqual(failures,[],'Runtime or asset errors');
 console.log(JSON.stringify({main:root.href,mainEdition,mainChecks,acceptance:acceptance.href,acceptanceEdition,acceptanceChecks,isolatedSaves:true,failures},null,2));
}finally{await browser.close();}
