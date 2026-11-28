import assert from 'node:assert/strict';
import {chromium,expect} from '@playwright/test';
import {attack,createCharacter,checkpoint,setCombatFaces,steps} from '../e2e/helpers.ts';

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
 async function begin(name='Adventurer',warrior=false,worldRoll=.5,classId='warrior'){
  const roster=await page.getByRole('button',{name:'New Character',exact:true}).count()>0;
  await page.getByRole('button',{name:roster?'New Character':'New Game',exact:true}).click();
  await createCharacter(page,warrior?{name,classId,attributes:{prowess:5,cunning:1,resistance:2},skills:{combat:5,subterfuge:0,lore:0}}:{...checkpoint.character,name,classId});
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
  await steps(page,'right');
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
  const hasCumulativeXp=edition==='ITERATION 14';
  const hasClassResources=edition==='ITERATION 13'||hasCumulativeXp;
  const hasCleric=edition==='ITERATION 12'||hasClassResources;
  const hasNewClassActions=edition==='ITERATION 11'||hasCleric;
  const hasRogue=edition==='ITERATION 10'||hasNewClassActions;
  const hasInitiative=edition==='ITERATION 09'||hasRogue;
  if(['ITERATION 06','ITERATION 07','ITERATION 08','ITERATION 09','ITERATION 10','ITERATION 11','ITERATION 12','ITERATION 13','ITERATION 14'].includes(edition)){
   await page.getByRole('button',{name:'Return to characters',exact:true}).click();
   await begin('Smoke progression',true,0);
   await steps(page,'right');
   if(hasNewClassActions){
    await expect(page.getByLabel('Momentum stacks')).toHaveText('Momentum stacks · 0');
    await setCombatFaces(page,Array(11).fill(1));
    await page.getByRole('button',{name:'Momentum',exact:true}).tap();
    await expect(page.getByLabel('Momentum stacks')).toHaveText('Momentum stacks · 1');
    await expect(page.getByLabel('Battle Melee and Defense')).toHaveText('Melee 11d10 · Defense 8d10');
   }
   await attack(page,[...Array(hasNewClassActions?11:10).fill(8),1,1,1]);
   await expect(page.locator('#screen')).toContainText('+1 XP.');
   if(edition!=='ITERATION 06'){
    const back=page.getByRole('button',{name:'Back to clearing',exact:true});
    for(let remaining=2;remaining>0;remaining--){
     await back.click();
     await steps(page,'right');
     await expect(page.locator('#screen')).toHaveAttribute('aria-busy','false');
     await steps(page,'right');
     await attack(page,[...Array(10).fill(8),1,1,1]);
    }
    await back.click();
    await page.evaluate(()=>{Math.random=()=>0;});
    await page.getByRole('button',{name:'Find more slimes',exact:true}).click();
    await expect(page.locator('header').getByLabel('Current wave',{exact:true})).toHaveText('Wave 2');
    await steps(page,'right');
    await expect(page.getByLabel('Slime health')).toHaveText('4 / 4 HP');
    if(edition==='ITERATION 08'||hasInitiative)await expect(page.getByRole('button',{name:'Melee',exact:true})).toBeVisible();
    await attack(page,[...Array(10).fill(8),1,1,1,1]);
    await expect(page.locator('#screen')).toContainText('+2 XP.');
    await page.reload();await resume('Smoke progression');
    await expect(page.locator('header').getByLabel('Current wave',{exact:true})).toHaveText('Wave 2');
    await page.getByText('Character',{exact:true}).click();
    const progression = hasCumulativeXp ? 'Level 2 · 5 / 15 total XP · 1 point available' : 'Level 2 · 0 / 5 XP · 1 point available';
    await expect(page.getByLabel('Character progression')).toContainText(progression);
    const checks={roster:true,independentPlaythroughs:2,persistedVictoryXp:true,persistedSlimeLevel:2,...(hasCumulativeXp?{verifiedCumulativeXp:true}:{})};
    if(edition!=='ITERATION 08'&&!hasInitiative)return checks;
    await page.getByRole('button',{name:'Return to characters',exact:true}).click();
    if(hasClassResources){
     await begin('Smoke Execute',false,0);
     await steps(page,'right');
     for(let i=0;i<4;i++)await attack(page,Array(15).fill(1));
     await expect(page.getByLabel('Resources',{exact:true})).toHaveText('4 / 5 Resources');
     await page.getByRole('button',{name:'Execute',exact:true}).tap();
     await expect(page.getByRole('heading',{name:'Victory!'})).toBeVisible();
     await expect(page.getByRole('status',{name:'Combat result'})).toContainText('Execute: Target defeated.');
     await page.getByRole('button',{name:'Return to characters',exact:true}).click();
    }
    await begin('Smoke Wizard',false,0,'wizard');
    if(hasInitiative){
     await steps(page,'right',1,[1,1,1,1,1,1,8,1,1]);
     const order=page.getByRole('list',{name:'Turn Order',exact:true}).getByRole('listitem');
     await expect(order).toHaveText(['Meadow slime · 1 success','You · 0 successes']);
     await expect(page.getByLabel('Hero health')).toHaveText('5 / 5 HP');
     await setCombatFaces(page,[8,1,1,1,1,1,1]);
     await page.getByRole('button',{name:'Run',exact:true}).tap();
     await expect(page.getByLabel('Hero health')).toHaveText('4 / 5 HP');
     await steps(page,'right',1,[8,1,1,1,1,1,1,1,1]);
     await expect(order.first()).toHaveText('You · 1 success');
    }else await steps(page,'right');
    await expect(page.getByRole('button',{name:'Magic',exact:true})).toBeVisible();
    await expect(page.locator('.combat-result')).toHaveText('Magic 4d10 vs 3d10 defense.');
    await attack(page,[8,8,8,1,1,1,1]);
    await expect(page.getByRole('heading',{name:'Victory!'})).toBeVisible();
    if(hasNewClassActions){
     await back.click();
     await steps(page,'right',2);
     await expect(page.getByLabel('Nuke damage',{exact:true})).toHaveText(hasClassResources?'Nuke · 4 base damage':'Nuke · 4 damage');
     if(hasClassResources){
      await page.getByRole('spinbutton',{name:'Resources to reserve'}).fill('2');
      await setCombatFaces(page,[8,8,1,1,1,1,1]);
      await page.getByRole('button',{name:'Study',exact:true}).tap();
      await expect(page.getByLabel('Shield reservation')).toHaveText('Shield · 2 reserved · blocks up to 2 damage per hit');
      await expect(page.getByLabel('Resources',{exact:true})).toHaveText('3 / 5 Resources');
      await expect(page.getByLabel('Hero health')).toHaveText('5 / 5 HP');
      const release=page.getByRole('button',{name:'Release Shield',exact:true});
      await expect(release).toBeEnabled();
      await setCombatFaces(page,Array(7).fill(1));
      await release.tap();
      await expect(page.getByLabel('Resources',{exact:true})).toHaveText('5 / 5 Resources');
     }
     const nuke=page.getByRole('button',{name:'Nuke',exact:true});
     const combatResult=page.getByRole('status',{name:'Combat result'});
     if(hasClassResources){
      await setCombatFaces(page,[8,8,1,...Array(7).fill(1)]);
      await nuke.tap();
      await expect(combatResult).toContainText('Nuke: 2 damage. Slime blocked 2 of 4.');
      await expect(page.getByLabel('Slime health')).toHaveText('1 / 3 HP');
      await setCombatFaces(page,[1,1,1]);
     }
     await nuke.tap();
     await expect(page.getByRole('heading',{name:'Victory!'})).toBeVisible();
     await expect(combatResult).toContainText(hasClassResources?'Nuke: 4 damage. Slime blocked 0 of 4.':'Nuke: 4 direct damage.');
    }
    const verifiedClasses=['Warrior','Wizard'];
    if(hasRogue){
     await page.getByRole('button',{name:'Return to characters',exact:true}).click();
     await begin('Smoke Rogue',false,0,'rogue');
     await steps(page,'right');
     const exploit=page.getByRole('button',{name:'Exploit',exact:true});
     if(hasClassResources){
      await expect(page.getByLabel('Resources',{exact:true})).toHaveText('1 / 5 Resources');
      await expect(page.getByRole('button',{name:'Prepare',exact:true})).toBeEnabled();
      await expect(exploit).toBeDisabled();
      for(let i=0;i<2;i++)await attack(page,Array(15).fill(1));
      await expect(page.getByLabel('Exploit stacks')).toHaveText('Exploit stacks · 2');
      await exploit.tap();
      await expect(page.getByRole('heading',{name:'Victory!'})).toBeVisible();
      await expect(page.getByRole('status',{name:'Combat result'})).toContainText('Exploit: 3 direct damage.');
      await page.reload();await resume('Smoke Rogue');
      await expect(page.getByLabel('Resources',{exact:true})).toHaveText('3 / 5 Resources');
     }else{
      await expect(exploit).toBeEnabled();
      await setCombatFaces(page,[8,8,1,1,1,1,1,1,1,1,1,1]);
      await exploit.tap();
      await expect(page.getByLabel('Exploit stacks')).toHaveText('Exploit stacks · 2');
      await attack(page,[8,1,1,1,1,1,1,1]);
      await expect(page.getByRole('heading',{name:'Victory!'})).toBeVisible();
      await expect(page.getByRole('status',{name:'Combat result'})).toContainText('3 damage (1 base + 2 Exploit)');
     }
     verifiedClasses.push('Rogue');
    }
    if(hasCleric){
     await page.getByRole('button',{name:'Return to characters',exact:true}).click();
     await begin('Smoke Cleric',false,0,'cleric');
     const resources=page.getByLabel('Resources',{exact:true});
     await expect(resources).toHaveText('3 / 5 Resources');
     await steps(page,'right');
     for(const current of [2,1]){
      await setCombatFaces(page,Array(10).fill(1));
      await page.getByRole('button',{name:'Heal',exact:true}).tap();
      await expect(resources).toHaveText(`${current} / 5 Resources`);
     }
     await setCombatFaces(page,[8,8,8]);
     await page.getByRole('button',{name:'Smite',exact:true}).tap();
     await expect(page.getByRole('heading',{name:'Victory!'})).toBeVisible();
     await expect(resources).toHaveText('2 / 5 Resources');
     await page.reload();await resume('Smoke Cleric');
     await expect(resources).toHaveText('2 / 5 Resources');
     verifiedClasses.push('Cleric');
    }
    return {...checks,verifiedClasses,...(hasInitiative?{verifiedTurnOrder:true}:{}),...(hasRogue?{verifiedExploit:true}:{}),...(hasNewClassActions?{verifiedMomentum:true,verifiedNuke:true}:{}),...(hasCleric?{verifiedClericResources:true}:{}),...(hasClassResources?{verifiedClassResources:true}:{})};
   }
   await page.reload();await resume('Smoke progression');
   await page.getByText('Character',{exact:true}).click();
   await expect(page.getByLabel('Character progression')).toContainText('1 / 5 XP');
   return {roster:true,independentPlaythroughs:2,persistedVictoryXp:true};
  }
  return {roster:true,independentPlaythroughs:2};
 }
 const mainEdition=await open(root,expectedMainScript);
 assert.ok(['ITERATION 04','ITERATION 05','ITERATION 06','ITERATION 07','ITERATION 08','ITERATION 09','ITERATION 10','ITERATION 11','ITERATION 12','ITERATION 13','ITERATION 14'].includes(mainEdition),`Unexpected main edition: ${mainEdition}`);
 const mainChecks=await exercise();
 const mainSaves=await snapshot('simple-rpg.save.');
 const acceptance=new URL('acceptance/',root);
 const acceptanceEdition=await open(acceptance);
 assert.equal(acceptanceEdition,'ITERATION 14','Acceptance must serve Iteration 14');
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
