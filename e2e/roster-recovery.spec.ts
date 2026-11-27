import {test,expect,type Page} from '@playwright/test';
import {checkpoint,seed,createCharacter,startAdventure,steps,attack,losingFaces} from './helpers';
declare global{interface Window{__failWrites:boolean;}}
async function failWrites(page:Page){await page.evaluate(()=>{const original=Storage.prototype.setItem;window.__failWrites=true;Storage.prototype.setItem=function(key,value){if(window.__failWrites&&key.endsWith('.save.v9'))throw Error('quota');return original.call(this,key,value);};});}
async function read(page:Page){return page.evaluate(()=>localStorage.getItem('simple-rpg.save.v9'));}
test('failed creation preserves draft and retries without a ghost slot',async({page})=>{
 await page.goto('./');await failWrites(page);await page.getByRole('button',{name:'New Character',exact:true}).click();await createCharacter(page);
 await page.getByRole('button',{name:'Begin adventure',exact:true}).click();await expect(page.getByRole('status',{name:'Creation result'})).toContainText('cannot be saved');expect(await read(page)).toBeNull();
 await expect(page.getByRole('heading',{name:'Adventurer',exact:true})).toBeVisible();await page.evaluate(()=>window.__failWrites=false);await page.getByRole('button',{name:'Begin adventure',exact:true}).click();await expect(page.getByLabel('Position')).toHaveText('3, 3');expect(JSON.parse((await read(page))!).slots).toHaveLength(1);
});
test('failed deletion keeps bytes and confirmation, then retry succeeds',async({page})=>{
 await seed(page);await page.reload();await failWrites(page);const before=await read(page);
 await page.getByRole('button',{name:'View',exact:true}).click();await page.getByRole('button',{name:'Delete character',exact:true}).click();await page.getByRole('button',{name:'Delete permanently',exact:true}).click();await expect(page.getByRole('status',{name:'Confirmation status'})).toContainText('cannot be saved');expect(await read(page)).toBe(before);
 await page.evaluate(()=>window.__failWrites=false);await page.getByRole('button',{name:'Delete permanently',exact:true}).click();await expect(page.getByLabel('Roster capacity')).toHaveText('0 / 10 slots');
});
test('failed autosave warns before returning and can retry without losing progress',async({page})=>{
 await seed(page);await failWrites(page);await steps(page,'right');await page.getByRole('button',{name:'Return to characters',exact:true}).click();
 await expect(page.getByRole('heading',{name:'Leave unsaved progress?'})).toBeVisible();await page.getByRole('button',{name:'Keep playing',exact:true}).click();await expect(page.getByLabel('Position')).toHaveText('4, 3');
 await page.evaluate(()=>window.__failWrites=false);await page.getByRole('button',{name:'Retry save',exact:true}).click();await expect(page.getByRole('status',{name:'Save status'})).toContainText('Adventure saved');
 await page.getByRole('button',{name:'Return to characters',exact:true}).click();await page.getByRole('button',{name:'Resume',exact:true}).click();await expect(page.getByLabel('Position')).toHaveText('4, 3');
});
test('discarding unsaved progress resumes the durable checkpoint',async({page})=>{
 await seed(page);await failWrites(page);await steps(page,'right');await page.getByRole('button',{name:'Return to characters',exact:true}).click();await page.getByRole('button',{name:'Discard unsaved progress',exact:true}).click();await page.getByRole('button',{name:'Resume',exact:true}).click();await expect(page.getByLabel('Position')).toHaveText('3, 3');
});
test('failed defeat and Restart stay visible; retry persists defeat across reload',async({page})=>{
 await seed(page,{...checkpoint,position:{x:15,y:14},hp:2});await steps(page,'down');await failWrites(page);await attack(page,losingFaces);
 await expect(page.getByRole('heading',{name:'Defeated',exact:true})).toBeVisible();await expect(page.getByRole('button',{name:'Restart',exact:true})).toBeDisabled();expect(JSON.parse((await read(page))!).slots[0].status).toBe('active');
 await page.evaluate(()=>window.__failWrites=false);await page.getByRole('button',{name:'Retry save',exact:true}).click();await expect(page.getByRole('status',{name:'Save status'})).toContainText('Adventure saved');await page.reload();await expect(page.getByRole('button',{name:'Restart',exact:true})).toBeVisible();
});
test('corrupt v6 ignores valid old save and reset needs durable confirmation',async({page})=>{
 await page.goto('./');await page.evaluate(cp=>{localStorage.setItem('simple-rpg.save.v5',JSON.stringify(cp));localStorage.setItem('simple-rpg.save.v9','bad');},checkpoint);await page.reload();await failWrites(page);
 await expect(page.getByRole('button',{name:'New Character',exact:true})).toBeDisabled();
 await page.getByRole('button',{name:'Reset roster',exact:true}).click();await page.getByRole('button',{name:'Reset roster',exact:true}).click();await expect(page.getByRole('status',{name:'Confirmation status'})).toContainText('cannot be saved');expect(await read(page)).toBe('bad');
 await page.evaluate(()=>window.__failWrites=false);await page.getByRole('button',{name:'Reset roster',exact:true}).click();await expect(page.getByLabel('Roster capacity')).toHaveText('0 / 10 slots');
 expect(await page.evaluate(()=>localStorage.getItem('simple-rpg.save.v5'))).toBe(JSON.stringify(checkpoint));
});
for(const failure of ['reads','locks'] as const)test(`blocked ${failure} cannot create or reset data`,async({page})=>{
 await page.addInitScript(failure=>{if(failure==='reads'){Storage.prototype.getItem=function(){throw Error('blocked')}}else Object.defineProperty(navigator,'locks',{value:undefined});},failure);
 await page.goto('./');await expect(page.getByRole('button',{name:'New Character',exact:true})).toBeDisabled();await expect(page.getByRole('button',{name:'Reset roster',exact:true})).toHaveCount(0);
});
test('without locks an existing active slot can play read-only',async({page})=>{
 await seed(page);const before=await read(page);await page.addInitScript(()=>Object.defineProperty(navigator,'locks',{value:undefined}));await page.reload();await page.getByRole('button',{name:'Resume',exact:true}).click();await steps(page,'right');await expect(page.getByRole('status',{name:'Save status'})).toContainText('cannot be saved');expect(await read(page)).toBe(before);
});
test('changed unreadable raw renews reset confirmation before anything is removed',async({page,context})=>{
 await page.goto('./');await page.evaluate(()=>localStorage.setItem('simple-rpg.save.v9','first bad'));await page.reload();await page.getByRole('button',{name:'Reset roster',exact:true}).click();
 const second=await context.newPage();await second.goto('./');await second.evaluate(()=>localStorage.setItem('simple-rpg.save.v9','second bad'));
 await page.bringToFront();await page.evaluate(()=>window.dispatchEvent(new Event('focus')));await expect(page.getByRole('status',{name:'Confirmation status'})).toContainText('Saved data changed');expect(await read(page)).toBe('second bad');
 await page.getByRole('button',{name:'Keep data',exact:true}).click();expect(await read(page)).toBe('second bad');
});
