import {test,expect} from '@playwright/test';
declare global { interface Window { __saveAttempts: string[] } }

test('failed migration writes keep placements stable until the source changes', async ({page}) => {
  const old={version:2,world:{version:1,layout:'woodland',width:20,height:20},position:{x:14,y:15},hp:10,completedEncounterIds:[]};
  await page.goto('./');
  await page.evaluate(value=>localStorage.setItem('simple-rpg.save.v2',JSON.stringify(value)),old);
  await page.addInitScript(()=>{
    let n=.01; Math.random=()=>{n=(n+.13)%1;return n;};
    const original=Storage.prototype.setItem;
    (window as Window & {__saveAttempts:string[]}).__saveAttempts=[];
    Storage.prototype.setItem=function(key,value){
      if(key==='simple-rpg.save.v3'){(window as Window & {__saveAttempts:string[]}).__saveAttempts.push(value);throw Error('quota');}
      return original.call(this,key,value);
    };
  });
  await page.reload();
  await expect(page.getByRole('status')).toContainText('cannot be saved');
  await page.getByRole('button',{name:'New Game',exact:true}).tap();
  await page.getByRole('button',{name:'Cancel',exact:true}).tap();
  const attempts=await page.evaluate(()=>(window as Window & {__saveAttempts:string[]}).__saveAttempts);
  expect(attempts.length).toBeGreaterThanOrEqual(2);
  expect(new Set(attempts).size).toBe(1);
  await page.evaluate(value=>{
    localStorage.setItem('simple-rpg.save.v2',JSON.stringify(value));
    window.dispatchEvent(new StorageEvent('storage',{key:'simple-rpg.save.v2'}));
  },{...old,position:{x:7,y:7},hp:8});
  const changed=JSON.parse(await page.evaluate(()=>(window as Window & {__saveAttempts:string[]}).__saveAttempts.at(-1)!));
  expect(changed.position).toEqual({x:7,y:7});expect(changed.hp).toBe(8);
  await page.getByRole('button',{name:'Continue',exact:true}).tap();
  await expect(page.getByLabel('Position')).toHaveText('7, 7');
  await expect(page.getByLabel('Hero health')).toHaveText('8 / 12 HP');
  expect(await page.evaluate(()=>localStorage.getItem('simple-rpg.save.v3'))).toBeNull();
});
