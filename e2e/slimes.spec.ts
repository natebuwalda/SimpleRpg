import {test,expect} from '@playwright/test';
import {seed,steps,checkpoint,attack,losingFaces,startAdventure} from './helpers';
declare global { interface Window { __saveAttempts: string[] } }

const threeWorld={...checkpoint.world,slimes:[
  {id:'slime-1',position:{x:5,y:3}}, {id:'slime-2',position:{x:8,y:6}}, {id:'slime-3',position:{x:15,y:15}},
]};
test('short portrait controls fit with wider fallback text metrics',async({page})=>{
 await page.setViewportSize({width:320,height:568});
 await seed(page,{...checkpoint,world:threeWorld});
 await page.addStyleTag({content:'.description { font-family: monospace; font-size: 18px; }'});
 const down=(await page.getByRole('button',{name:'Move down',exact:true}).boundingBox())!;
 expect(down.y+down.height).toBeLessThanOrEqual(568);
});
async function win(page:import('@playwright/test').Page){
 await attack(page);
 await attack(page);
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
 await page.reload();await page.getByRole('button',{name:'Resume',exact:true}).tap();
 await expect(page.getByLabel('Slimes remaining')).toHaveText('2 slimes remain.');
 expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('simple-rpg.save.v7')!).slots[0].checkpoint.world)).toEqual(threeWorld);
 await steps(page,'up',3);await steps(page,'left',2);await win(page);
 await expect(page.getByLabel('Slimes remaining')).toHaveText('1 slime remains.');
 await steps(page,'right',9);await steps(page,'down',12);await win(page);
 await expect(page.getByLabel('Slimes remaining')).toHaveText('0 slimes remain.');
 await expect(page.locator('.description')).toContainText('peaceful');
 await steps(page,'down');await expect(page.getByLabel('Position')).toHaveText('15, 15');
 await page.reload();await page.getByRole('button',{name:'Resume',exact:true}).tap();
 await expect(page.getByLabel('Slimes remaining')).toHaveText('0 slimes remain.');
 expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('simple-rpg.save.v7')!).slots[0].checkpoint.completedEncounterIds)).toEqual(['slime-2','slime-1','slime-3']);
});

test('Run and scrolling do not change living placements or defeated states',async({page})=>{
 await seed(page,{...checkpoint,world:threeWorld,position:{x:7,y:6}});
 await steps(page,'right');await page.getByRole('button',{name:'Run',exact:true}).tap();
 await expect(page.getByLabel('Position')).toHaveText('7, 6');
 await expect(page.getByLabel('Slimes remaining')).toHaveText('3 slimes remain.');
 expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('simple-rpg.save.v7')!).slots[0].checkpoint.world)).toEqual(threeWorld);
 await seed(page,{...checkpoint,world:threeWorld,position:{x:15,y:14},completedEncounterIds:['slime-3']});
 await steps(page,'down');await steps(page,'up',10);await steps(page,'down',10);
 await expect(page.getByLabel('Position')).toHaveText('15, 15');
 await expect(page.getByLabel('Slimes remaining')).toHaveText('2 slimes remain.');
});

test('real New Game produces three unique traversable placements and preserves them on reload',async({page})=>{
 await page.goto('./');await startAdventure(page);
 const original=await page.evaluate(()=>JSON.parse(localStorage.getItem('simple-rpg.save.v7')!).slots[0].checkpoint);
 expect(original.world.slimes.map((s:{id:string})=>s.id)).toEqual(['slime-1','slime-2','slime-3']);
 expect(new Set(original.world.slimes.map((s:{position:{x:number;y:number}})=>`${s.position.x},${s.position.y}`)).size).toBe(3);
 for(const s of original.world.slimes){
  expect(Number.isInteger(s.position.x)&&Number.isInteger(s.position.y)).toBe(true);
  expect(s.position.x).toBeGreaterThanOrEqual(3);expect(s.position.x).toBeLessThanOrEqual(original.world.width-4);
  expect(s.position.y).toBeGreaterThanOrEqual(3);expect(s.position.y).toBeLessThanOrEqual(original.world.height-4);
  expect(s.position).not.toEqual({x:3,y:3});expect(s.position).not.toEqual({x:6,y:5});
 }
 await expect(page.getByLabel('Slimes remaining')).toHaveText('3 slimes remain.');
 await page.reload();await page.getByRole('button',{name:'Resume',exact:true}).tap();
 expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('simple-rpg.save.v7')!).slots[0].checkpoint)).toEqual(original);
});

test('Restart restores the same three after partial progress and defeat',async({page})=>{
 await seed(page,{...checkpoint,world:threeWorld,position:{x:7,y:6},hp:2,completedEncounterIds:['slime-1']});
 await expect(page.getByLabel('Slimes remaining')).toHaveText('2 slimes remain.');
 await steps(page,'right');await attack(page,losingFaces);
 await page.getByRole('button',{name:'Restart',exact:true}).tap();
 await expect(page.getByLabel('Slimes remaining')).toHaveText('3 slimes remain.');
 expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('simple-rpg.save.v7')!).slots[0].checkpoint)).toEqual({...checkpoint,world:threeWorld,initialSlimes:threeWorld.slimes});
 await steps(page,'right',2);await expect(page.getByRole('button',{name:'Attack',exact:true})).toBeVisible();
});

test('invalid v7 never resurrects valid older saves in the browser',async({page})=>{
 await page.addInitScript(()=>{
  localStorage.setItem('simple-rpg.save.v7','{broken');
  localStorage.setItem('simple-rpg.save.v2',JSON.stringify({version:2,world:{version:1,layout:'woodland',width:20,height:20},position:{x:3,y:3},hp:12,completedEncounterIds:[]}));
  localStorage.setItem('simple-rpg.save.v1',JSON.stringify({version:1,position:{x:2,y:2},hp:12,completedEncounterIds:[]}));
 });
 await page.goto('./');await expect(page.getByRole('button',{name:'Reset roster',exact:true})).toBeVisible();await expect(page.getByRole('status',{name:'Save status'})).toContainText('could not be read');
});
