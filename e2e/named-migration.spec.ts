import {test,expect} from '@playwright/test';
import {checkpoint} from './helpers';
const old={...checkpoint,version:4,character:{attributes:checkpoint.character.attributes,skills:checkpoint.character.skills},hp:2,position:{x:8,y:8},completedEncounterIds:['slime-2']};

test('v4 migration names the old hero without changing Health, world or completion',async({page})=>{
  await page.goto('./');await page.evaluate(value=>localStorage.setItem('simple-rpg.save.v4',JSON.stringify(value)),old);await page.reload();
  await page.getByRole('button',{name:'Continue',exact:true}).click();
  await expect(page.getByLabel('Hero health')).toHaveText('2 / 5 HP');await expect(page.getByLabel('Position')).toHaveText('8, 8');
  await page.getByText('Character',{exact:true}).click();await expect(page.getByLabel('Character name')).toHaveText('Adventurer');
  expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('simple-rpg.save.v5')!))).toEqual({...old,version:5,character:checkpoint.character});
  expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('simple-rpg.save.v4')!))).toEqual(old);
  await page.reload();await page.getByRole('button',{name:'Continue',exact:true}).click();await expect(page.getByLabel('Slimes remaining')).toHaveText('2 slimes remain.');
});

test('blocked v5 writes retain the v4 named migration across refreshes and source changes',async({page})=>{
  await page.goto('./');await page.evaluate(value=>localStorage.setItem('simple-rpg.save.v4',JSON.stringify(value)),old);
  await page.addInitScript(()=>{const original=Storage.prototype.setItem;window.__saveAttempts=[];Storage.prototype.setItem=function(key,value){if(key==='simple-rpg.save.v5'){window.__saveAttempts.push(value);throw Error('quota');}return original.call(this,key,value);};});
  await page.reload();await page.getByRole('button',{name:'New Game',exact:true}).click();await page.getByRole('button',{name:'Cancel',exact:true}).click();
  const attempts=await page.evaluate(()=>window.__saveAttempts);expect(attempts.length).toBeGreaterThanOrEqual(2);expect(new Set(attempts).size).toBe(1);
  await page.evaluate(value=>{localStorage.setItem('simple-rpg.save.v4',JSON.stringify(value));window.dispatchEvent(new StorageEvent('storage',{key:'simple-rpg.save.v4'}));},{...old,hp:1,position:{x:7,y:7}});
  await page.getByRole('button',{name:'Continue',exact:true}).click();await expect(page.getByLabel('Hero health')).toHaveText('1 / 5 HP');await expect(page.getByLabel('Position')).toHaveText('7, 7');
  await expect(page.getByRole('status',{name:'Save status'})).toContainText('cannot be saved');
  expect(await page.evaluate(()=>localStorage.getItem('simple-rpg.save.v5'))).toBeNull();
});

test('a legal custom allocation at the old v4 key remains invalid instead of falling back',async({page})=>{
  await page.goto('./');await page.evaluate(value=>{localStorage.setItem('simple-rpg.save.v4',JSON.stringify({...value,character:{attributes:{prowess:1,cunning:5,resistance:2},skills:{combat:0,subterfuge:5,lore:0}}}));localStorage.setItem('simple-rpg.save.v3',JSON.stringify({...value,version:3}));},old);
  await page.reload();await expect(page.getByRole('button',{name:'Continue',exact:true})).toBeDisabled();await expect(page.getByRole('status',{name:'Save status'})).toContainText('could not be read');
});
