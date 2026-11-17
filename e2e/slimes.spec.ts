import {test,expect} from '@playwright/test';
import {seed,steps,checkpoint} from './helpers';
declare global { interface Window { __saveAttempts: string[] } }

const threeWorld={...checkpoint.world,slimes:[
  {id:'slime-1',position:{x:5,y:3}}, {id:'slime-2',position:{x:8,y:6}}, {id:'slime-3',position:{x:15,y:15}},
]};
async function win(page:import('@playwright/test').Page){
 await page.getByRole('button',{name:'Attack',exact:true}).tap();
 await page.getByRole('button',{name:'Attack',exact:true}).tap();
 await page.getByRole('button',{name:'Back to clearing'}).tap();
}

test('three encounters clear independently, persist and become peaceful only at zero',async({page})=>{
 await seed(page,{...checkpoint,world:threeWorld});
 await expect(page.getByLabel('Slimes remaining')).toHaveText('3 slimes remain.');
 await steps(page,'down',3);await steps(page,'right',4);
 await page.screenshot({path:'test-results/slimes-before.png',fullPage:true});
 await steps(page,'right');await win(page);
 await expect(page.getByLabel('Slimes remaining')).toHaveText('2 slimes remain.');
 await expect(page.locator('.description')).not.toContainText('peaceful');
 await page.screenshot({path:'test-results/slimes-after.png',fullPage:true});
 await page.reload();await page.getByRole('button',{name:'Continue',exact:true}).tap();
 await expect(page.getByLabel('Slimes remaining')).toHaveText('2 slimes remain.');
 expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('simple-rpg.save.v3')!).world)).toEqual(threeWorld);
 await steps(page,'up',3);await steps(page,'left',2);await win(page);
 await expect(page.getByLabel('Slimes remaining')).toHaveText('1 slime remains.');
 await steps(page,'right',9);await steps(page,'down',12);await win(page);
 await expect(page.getByLabel('Slimes remaining')).toHaveText('0 slimes remain.');
 await expect(page.locator('.description')).toContainText('peaceful');
 await steps(page,'down');await expect(page.getByLabel('Position')).toHaveText('15, 15');
 await page.reload();await page.getByRole('button',{name:'Continue',exact:true}).tap();
 await expect(page.getByLabel('Slimes remaining')).toHaveText('0 slimes remain.');
 expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('simple-rpg.save.v3')!).completedEncounterIds)).toEqual(['slime-2','slime-1','slime-3']);
});

test('Run and scrolling do not change living placements or defeated states',async({page})=>{
 await seed(page,{...checkpoint,world:threeWorld,position:{x:7,y:6}});
 await steps(page,'right');await page.getByRole('button',{name:'Run',exact:true}).tap();
 await expect(page.getByLabel('Position')).toHaveText('7, 6');
 await expect(page.getByLabel('Slimes remaining')).toHaveText('3 slimes remain.');
 expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('simple-rpg.save.v3')!).world)).toEqual(threeWorld);
 await seed(page,{...checkpoint,world:threeWorld,position:{x:15,y:14},completedEncounterIds:['slime-3']});
 await steps(page,'down');await steps(page,'up',10);await steps(page,'down',10);
 await expect(page.getByLabel('Position')).toHaveText('15, 15');
 await expect(page.getByLabel('Slimes remaining')).toHaveText('2 slimes remain.');
});

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
