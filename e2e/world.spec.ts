import {test,expect} from '@playwright/test';
import {seed,steps,checkpoint} from './helpers';
const range=(x:number,y:number)=>`World columns ${x}–${x+9}, rows ${y}–${y+9}.`;
async function expectRange(page:import('@playwright/test').Page,x:number,y:number){
 await expect(page.locator('#canvas')).toHaveAttribute('aria-description',range(x,y));
 await expect(page.locator('canvas')).toBeVisible();
}
test('buffered scrolling keeps reversals stable on both axes',async({page})=>{
 await seed(page,{...checkpoint,position:{x:6,y:7}});
 await expectRange(page,0,1);await expect(page.getByLabel('World size')).toHaveText('20 × 20 tiles');
 await steps(page,'right');await expectRange(page,1,1);
 await steps(page,'left',3);await expectRange(page,1,1);await expect(page.getByLabel('Position')).toHaveText('4, 7');
 await steps(page,'left');await expectRange(page,0,1);
 await steps(page,'down');await expectRange(page,0,2);
 await steps(page,'up',3);await expectRange(page,0,2);
 await steps(page,'up');await expectRange(page,0,1);
});
test('all edges stay visible and blocked movement and rotation preserve range',async({page})=>{
 test.setTimeout(120_000);
 await seed(page);await expectRange(page,0,0);
 await page.screenshot({path:'test-results/phone-world-spawn.png',fullPage:true});
 await steps(page,'up');await steps(page,'left');await expectRange(page,0,0);
 await steps(page,'right',13);await expectRange(page,10,0);
 await steps(page,'right');await expectRange(page,10,0);
 await steps(page,'down',13);await expectRange(page,10,10);
 await steps(page,'down');await expectRange(page,10,10);
 await expect(page.getByLabel('Position')).toHaveText('16, 16');
 await page.screenshot({path:'test-results/phone-world-far-corner.png',fullPage:true});
 for(const size of [{width:320,height:568},{width:844,height:390},{width:390,height:844}]){
  await page.setViewportSize(size);await expectRange(page,10,10);
  for(const button of await page.getByRole('button').all()) {const box=(await button.boundingBox())!;expect(box.y+box.height).toBeLessThanOrEqual(size.height);expect(box.x+box.width).toBeLessThanOrEqual(size.width);}
 }
 await steps(page,'left',13);await expectRange(page,0,10);
 await steps(page,'up',13);await expectRange(page,0,0);
});

test('real New Game saves generated dimensions and placements through reload',async({page})=>{
 await page.goto('./');await page.getByRole('button',{name:'New Game',exact:true}).tap();
 const initial=await page.evaluate(()=>JSON.parse(localStorage.getItem('simple-rpg.save.v3')!));
 expect(initial.world).toMatchObject({version:2,layout:'woodland'});
 for(const size of [initial.world.width,initial.world.height]) {expect(Number.isInteger(size)).toBe(true);expect(size).toBeGreaterThanOrEqual(20);expect(size).toBeLessThanOrEqual(40);}
 const saved=await page.evaluate(()=>localStorage.getItem('simple-rpg.save.v3'));
 await page.reload();await page.getByRole('button',{name:'New Game',exact:true}).tap();
 await page.getByRole('button',{name:'Cancel',exact:true}).tap();
 expect(await page.evaluate(()=>localStorage.getItem('simple-rpg.save.v3'))).toBe(saved);
 await page.getByRole('button',{name:'Continue',exact:true}).tap();
 await expect(page.getByLabel('Position')).toHaveText('3, 3');await expectRange(page,0,0);
 expect(await page.evaluate(()=>localStorage.getItem('simple-rpg.save.v3'))).toBe(saved);
 await page.reload();await page.getByRole('button',{name:'New Game',exact:true}).tap();await page.getByRole('button',{name:'Start Over',exact:true}).tap();
 const fresh=await page.evaluate(()=>JSON.parse(localStorage.getItem('simple-rpg.save.v3')!));
 expect(fresh.position).toEqual({x:3,y:3});expect(fresh.hp).toBe(12);expect(fresh.completedEncounterIds).toEqual([]);expect(fresh.world.layout).toBe('woodland');
});

test('far battle return, refresh, victory and clearing keep the world and view',async({page})=>{
 await seed(page,{...checkpoint,position:{x:15,y:14}});await expectRange(page,9,8);
 await steps(page,'down');await page.getByRole('button',{name:'Run',exact:true}).tap();
 await expect(page.getByLabel('Position')).toHaveText('15, 14');await expectRange(page,9,8);
 await steps(page,'down');await page.getByRole('button',{name:'Attack',exact:true}).tap();
 await page.reload();await page.getByRole('button',{name:'Continue',exact:true}).tap();
 await expect(page.getByLabel('Hero health')).toHaveText('12 / 12 HP');await expectRange(page,9,8);
 await steps(page,'down');await page.getByRole('button',{name:'Attack',exact:true}).tap();await page.getByRole('button',{name:'Attack',exact:true}).tap();
 await page.getByRole('button',{name:'Back to clearing'}).tap();await expectRange(page,9,8);
 await steps(page,'down');await expect(page.getByLabel('Position')).toHaveText('15, 15');await expectRange(page,9,9);
 await page.reload();await page.getByRole('button',{name:'Continue',exact:true}).tap();await expectRange(page,9,9);
 expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('simple-rpg.save.v3')!))).toEqual({...checkpoint,position:{x:15,y:15},completedEncounterIds:['slime-1']});
});

test('Restart preserves a rectangular world after defeat',async({page})=>{
 const rectangular={...checkpoint.world,width:40,height:30,slimes:[{id:'slime-1',position:{x:35,y:25}},...checkpoint.world.slimes.slice(1)]};
 await seed(page,{...checkpoint,world:rectangular,position:{x:35,y:24},hp:2});
 await steps(page,'down');await page.getByRole('button',{name:'Attack',exact:true}).tap();await page.getByRole('button',{name:'Restart',exact:true}).tap();
 await expectRange(page,0,0);await expect(page.getByLabel('Position')).toHaveText('3, 3');
 expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('simple-rpg.save.v3')!))).toEqual({...checkpoint,world:rectangular});
});

const oldSave={version:1,position:{x:5,y:4},hp:10,completedEncounterIds:[]};
test('v1 upgrade writes v3, retains recovery copy and translates only once',async({page})=>{
 await page.goto('./');await page.evaluate(v=>localStorage.setItem('simple-rpg.save.v1',JSON.stringify(v)),oldSave);await page.reload();
 await page.getByRole('button',{name:'Continue',exact:true}).tap();
 await expect(page.getByLabel('Position')).toHaveText('7, 6');await expect(page.getByLabel('Hero health')).toHaveText('10 / 12 HP');
 await expect(page.getByLabel('World size')).toHaveText('20 × 20 tiles');
 expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('simple-rpg.save.v1')!))).toEqual(oldSave);
 const upgraded=await page.evaluate(()=>JSON.parse(localStorage.getItem('simple-rpg.save.v3')!));
 expect(upgraded).toMatchObject({version:3,world:{version:2,layout:'legacy-expanded',width:20,height:20},position:{x:7,y:6},hp:10,completedEncounterIds:[]});
 expect(upgraded.world.slimes).toHaveLength(3);
 await page.reload();await page.getByRole('button',{name:'Continue',exact:true}).tap();await expect(page.getByLabel('Position')).toHaveText('7, 6');
});
test('migration write failure keeps in-memory Continue and warns',async({page})=>{
 await page.addInitScript(v=>{localStorage.setItem('simple-rpg.save.v1',JSON.stringify(v));Storage.prototype.setItem=()=>{throw Error('quota');};},oldSave);
 await page.goto('./');await expect(page.getByRole('status')).toContainText('cannot be saved');
 await page.getByRole('button',{name:'Continue',exact:true}).tap();await expect(page.getByLabel('Position')).toHaveText('7, 6');await expect(page.getByRole('status')).toContainText('cannot be saved');
 expect(await page.evaluate(()=>localStorage.getItem('simple-rpg.save.v3'))).toBeNull();
 expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('simple-rpg.save.v1')!))).toEqual(oldSave);
});
test('corrupt v2 never resurrects stale v1',async({page})=>{
 await page.addInitScript(v=>{localStorage.setItem('simple-rpg.save.v1',JSON.stringify(v));localStorage.setItem('simple-rpg.save.v2','{broken');},oldSave);
 await page.goto('./');await expect(page.getByRole('button',{name:'Continue',exact:true})).toBeDisabled();await expect(page.getByRole('status')).toContainText('could not be read');
});
