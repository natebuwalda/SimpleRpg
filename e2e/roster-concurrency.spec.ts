import {test,expect,type Page} from '@playwright/test';
import {checkpoint,wrapCheckpoint,createCharacter,steps} from './helpers';
const key='simple-rpg.save.v11';
const id=(i:number)=>`00000000-0000-4000-8000-${String(i).padStart(12,'0')}`;
const makeRoster=(n:number)=>({version:11,slots:Array.from({length:n},(_,i)=>({id:id(i),revision:1,status:'active',checkpoint:{...checkpoint,character:{...checkpoint.character,name:`Hero ${i}`}}}))});
async function init(page:Page,n:number){await page.goto('./');await page.evaluate(({key,data})=>localStorage.setItem(key,JSON.stringify(data)),{key,data:makeRoster(n)});await page.reload();}
async function focus(page:Page){await page.bringToFront();await page.evaluate(()=>window.dispatchEvent(new Event('focus')));}
async function read(page:Page){return page.evaluate(key=>JSON.parse(localStorage.getItem(key)!),key);}
test('simultaneous Begin clicks compete safely for slot ten and retain the losing draft',async({page,context})=>{
 await init(page,9);const second=await context.newPage();await second.goto('./');
 for(const p of [page,second]){await focus(p);await p.getByRole('button',{name:'New Character',exact:true}).click();await createCharacter(p,{...checkpoint.character,name:p===page?'First':'Second'});}
 // Hold the actual application lock until both pages have queued their transaction.
 await page.evaluate(()=>{void navigator.locks.request('simple-rpg.save',()=>new Promise<void>(resolve=>{(window as any).__releaseRoster=resolve;(window as any).__lockHeld=true;}));});
 await expect.poll(()=>page.evaluate(()=>(window as any).__lockHeld)).toBe(true);
 for(const p of [page,second])await p.evaluate(()=>{window.dispatchEvent(new Event('focus'));document.querySelector<HTMLButtonElement>('[data-creation-action="begin"]')!.click();});
 await expect(page.locator('#screen')).toHaveAttribute('aria-busy','true');await expect(second.locator('#screen')).toHaveAttribute('aria-busy','true');
 await page.evaluate(()=>(window as any).__releaseRoster());
 await expect.poll(async()=>[await page.getByLabel('Position').count(),await second.getByLabel('Position').count()].reduce((a,b)=>a+b,0)).toBe(1);
 const loser=await page.getByLabel('Position').count()?second:page;
 await expect(loser.getByRole('status',{name:'Creation result'})).toContainText('All 10 slots');
 await loser.getByRole('button',{name:'Back',exact:true}).click();await loser.getByRole('button',{name:'Back',exact:true}).click();
 await expect(loser.getByRole('textbox',{name:'Character name'})).toHaveValue(loser===page?'First':'Second');expect((await read(page)).slots).toHaveLength(10);
});
test('different slots merge while same-slot stale progress is rejected',async({page,context})=>{
 await init(page,2);const second=await context.newPage();await second.goto('./');
 await focus(page);await page.getByRole('button',{name:'Resume',exact:true}).nth(0).click();
 await focus(second);await second.getByRole('button',{name:'Resume',exact:true}).nth(1).click();
 await focus(page);await steps(page,'right');await focus(second);await steps(second,'down');
 let r=await read(page);expect(r.slots.map((s:any)=>s.checkpoint.position)).toEqual([{x:4,y:3},{x:3,y:4}]);
 await second.reload();await second.getByRole('button',{name:'Resume',exact:true}).nth(0).click();await steps(second,'right');
 await focus(page);await steps(page,'down');await expect(page.getByRole('status',{name:'Save status'})).toContainText('changed in another tab');
 r=await read(page);expect(r.slots[0].checkpoint.position).toEqual({x:5,y:3});expect(r.slots[1].checkpoint.position).toEqual({x:3,y:4});
});
test('deleting an active slot cannot be undone by stale autosave',async({page,context})=>{
 await init(page,2);await page.getByRole('button',{name:'Resume',exact:true}).first().click();const second=await context.newPage();await second.goto('./');
 await second.getByRole('button',{name:'View',exact:true}).first().click();await second.getByRole('button',{name:'Delete character',exact:true}).click();await second.getByRole('button',{name:'Delete permanently',exact:true}).click();
 await focus(page);await steps(page,'right');await expect(page.getByRole('status',{name:'Save status'})).toContainText('deleted');expect((await read(page)).slots.map((s:any)=>s.id)).toEqual([id(1)]);
});
test('delete confirmation renews for target progress but ignores unrelated changes',async({page,context})=>{
 await init(page,2);await page.getByRole('button',{name:'View',exact:true}).first().click();await page.getByRole('button',{name:'Delete character',exact:true}).click();
 const second=await context.newPage();await second.goto('./');await second.getByRole('button',{name:'Resume',exact:true}).nth(1).click();await steps(second,'right');
 await focus(page);await expect(page.getByText('Saved data changed. Review and confirm again.',{exact:true})).toHaveCount(0);
 await second.reload();await second.getByRole('button',{name:'Resume',exact:true}).nth(0).click();await steps(second,'right');
 await focus(page);await expect(page.getByText('Saved data changed. Review and confirm again.',{exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Delete permanently',exact:true}).click();await expect(page.getByLabel('Roster capacity')).toHaveText('1 / 10 slots');
 expect((await read(page)).slots[0].checkpoint.position).toEqual({x:4,y:3});
});
test('Restart revision invalidates an old tab even when the safe checkpoint is identical',async({page,context})=>{
 await init(page,1);await page.getByRole('button',{name:'Resume',exact:true}).click();const second=await context.newPage();await second.goto('./');
 await second.evaluate(key=>{const r=JSON.parse(localStorage.getItem(key)!);r.slots[0].status='defeated';r.slots[0].revision++;localStorage.setItem(key,JSON.stringify(r));},key);await second.reload();await second.getByRole('button',{name:'Restart',exact:true}).click();
 await focus(page);await steps(page,'right');await expect(page.getByRole('status',{name:'Save status'})).toContainText('changed in another tab');expect((await read(page)).slots[0].checkpoint).toEqual(makeRoster(1).slots[0].checkpoint);
});
