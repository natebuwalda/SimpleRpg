import {test,expect} from '@playwright/test';
import {checkpoint,createCharacter,startAdventure,seed,steps,attack} from './helpers';
declare global { interface Window { __creationWrites:number } }
const scholar={name:'  Moss  ',attributes:{prowess:1,cunning:5,resistance:2},skills:{combat:0,subterfuge:5,lore:0}};

test('three steps enforce budgets and show live custom stats through the named sheet',async({page})=>{
  await page.goto('./');await page.getByRole('button',{name:'New Game',exact:true}).click();
  const name=page.getByRole('textbox',{name:'Character name',exact:true});
  await expect(name).toHaveValue('');await expect(page.getByRole('button',{name:'Next: skills'})).toBeDisabled();
  await name.fill('   ');
  await expect(page.getByRole('button',{name:'Next: skills'})).toBeDisabled();
  await name.fill(scholar.name);
  for(let i=0;i<4;i++)await page.getByRole('button',{name:'Increase cunning',exact:true}).click();
  await expect(page.getByRole('button',{name:'Increase cunning',exact:true})).toBeDisabled();
  await page.getByRole('button',{name:'Increase resistance',exact:true}).click();
  await expect(page.getByLabel('Attribute points remaining')).toHaveText('0 points left');
  await expect(page.getByLabel('Maximum Health')).toHaveText('3');
  await page.getByRole('button',{name:'Next: skills'}).click();
  await expect(page.getByRole('button',{name:'Review character'})).toBeDisabled();
  for(let i=0;i<5;i++)await page.getByRole('button',{name:'Increase subterfuge',exact:true}).click();
  await expect(page.getByLabel('Skill points remaining')).toHaveText('0 points left');
  await expect(page.getByLabel('Creation attack pool')).toHaveText('1d10');
  await page.getByRole('button',{name:'Back',exact:true}).click();
  await expect(name).toHaveValue(scholar.name);
  await page.getByRole('button',{name:'Next: skills'}).click();await page.getByRole('button',{name:'Review character'}).click();
  await page.getByRole('button',{name:'Begin adventure'}).click();
  await expect(page.getByLabel('Hero health')).toHaveText('3 / 3 HP');
  await page.getByText('Character',{exact:true}).click();
  await expect(page.getByLabel('Character name')).toHaveText('Moss');
  await expect(page.getByLabel('Melee pools')).toHaveText('Attack 1d10 · Defense 2d10');
  expect(await page.locator('.game-details input').count()).toBe(0);
});

test('cancel and refresh discard only the draft, and cancelled overwrite retains it',async({page})=>{
  await seed(page);await page.reload();
  const saved=await page.evaluate(()=>localStorage.getItem('simple-rpg.save.v5'));
  await page.getByRole('button',{name:'New Game',exact:true}).click();
  await page.getByRole('textbox',{name:'Character name'}).fill('Discard me');
  await page.getByRole('button',{name:'Cancel',exact:true}).click();
  expect(await page.evaluate(()=>localStorage.getItem('simple-rpg.save.v5'))).toBe(saved);
  await page.getByRole('button',{name:'New Game',exact:true}).click();await page.reload();
  await expect(page.getByRole('textbox',{name:'Character name'})).toHaveCount(0);
  await startAdventure(page,scholar);
  await expect(page.getByRole('button',{name:'Start Over',exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Cancel',exact:true}).click();
  await expect(page.getByRole('button',{name:'Begin adventure'})).toBeVisible();
  await expect(page.getByLabel('Creation attack pool')).toHaveText('1d10');
  expect(await page.evaluate(()=>localStorage.getItem('simple-rpg.save.v5'))).toBe(saved);
  await page.getByRole('button',{name:'Back',exact:true}).click();await page.getByRole('button',{name:'Back',exact:true}).click();
  await expect(page.getByRole('textbox',{name:'Character name'})).toHaveValue(scholar.name);
});

test('names render as text, preserve Unicode and do not trigger game shortcuts',async({page})=>{
  await page.goto('./');await page.getByRole('button',{name:'New Game',exact:true}).click();
  const input=page.getByRole('textbox',{name:'Character name'});
  await input.pressSequentially('WASD 葉 ');await input.press('ArrowLeft');await input.press('Enter');
  await expect(input).toHaveValue('WASD 葉 ');await expect(input).toBeFocused();
  expect(await page.evaluate(()=>localStorage.getItem('simple-rpg.save.v5'))).toBeNull();
  await expect(input).toHaveAttribute('maxlength','24');
  await createCharacter(page,{...checkpoint.character,name:'Moss & <b>Fern</b>'});
  await expect(page.getByRole('heading',{name:'Moss & <b>Fern</b>',exact:true})).toBeVisible();
  expect(await page.locator('#screen b').count()).toBe(0);
  await page.getByRole('button',{name:'Begin adventure'}).click();await page.getByText('Character',{exact:true}).click();
  await expect(page.getByLabel('Character name')).toHaveText('Moss & <b>Fern</b>');
});

test('focus/storage refresh retains typed input, selection and the mounted form',async({page})=>{
  await page.goto('./');await page.getByRole('button',{name:'New Game',exact:true}).click();
  const input=page.getByRole('textbox',{name:'Character name'});
  await input.fill('Rowan');await input.press('ArrowLeft');
  const element=await input.elementHandle();
  await page.evaluate(()=>{window.dispatchEvent(new Event('focus'));window.dispatchEvent(new StorageEvent('storage',{key:'simple-rpg.save.v5'}));});
  expect(await element!.evaluate(node=>node.isConnected)).toBe(true);
  await expect(input).toBeFocused();await expect(input).toHaveValue('Rowan');
  expect(await input.evaluate(node=>(node as HTMLInputElement).selectionStart)).toBe(4);
});

test('another tab saving during creation and confirmation requires a fresh confirmation',async({page,context})=>{
  await page.goto('./');await page.getByRole('button',{name:'New Game',exact:true}).click();await createCharacter(page,scholar);
  const other=await context.newPage();await other.goto('./');
  await other.evaluate(value=>localStorage.setItem('simple-rpg.save.v5',JSON.stringify(value)),{...checkpoint,position:{x:4,y:3}});
  await page.bringToFront();await page.getByRole('button',{name:'Begin adventure'}).click();
  await expect(page.getByRole('button',{name:'Start Over',exact:true})).toBeVisible();
  await other.evaluate(value=>localStorage.setItem('simple-rpg.save.v5',JSON.stringify(value)),{...checkpoint,position:{x:5,y:3}});
  await page.getByRole('button',{name:'Start Over',exact:true}).click();
  await expect(page.getByRole('region',{name:'Character creation'}).getByText('Your saved adventure changed. Confirm again to replace it.',{exact:true})).toBeVisible();
  expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('simple-rpg.save.v5')!).position)).toEqual({x:5,y:3});
  await page.getByRole('button',{name:'Start Over',exact:true}).click();
  await expect(page.getByLabel('Hero health')).toHaveText('3 / 3 HP');
  expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('simple-rpg.save.v5')!).character.name)).toBe('Moss');
});

test('repeated Begin creates only one checkpoint',async({page})=>{
  await page.goto('./');await page.getByRole('button',{name:'New Game',exact:true}).click();await createCharacter(page);
  await page.evaluate(()=>{let count=0;const original=Storage.prototype.setItem;Object.defineProperty(window,'__creationWrites',{get:()=>count});Storage.prototype.setItem=function(key,value){if(key==='simple-rpg.save.v5')count++;return original.call(this,key,value);};const button=document.querySelector<HTMLButtonElement>('[data-creation-action="begin"]')!;button.click();button.click();});
  await expect(page.getByLabel('Position')).toHaveText('3, 3');
  expect(await page.evaluate(()=>window.__creationWrites)).toBe(1);
});

test('name editing keeps repeated spaces and IME composition in the same input',async({page})=>{
  await page.goto('./');await page.getByRole('button',{name:'New Game',exact:true}).click();
  const input=page.getByRole('textbox',{name:'Character name'});await input.fill('Moss');
  await page.keyboard.down(' ');await page.keyboard.down(' ');await page.keyboard.up(' ');
  await expect(input).toHaveValue('Moss  ');
  const element=await input.elementHandle();
  await input.dispatchEvent('compositionstart');await input.fill('葉 Rowan');await input.dispatchEvent('compositionend');
  expect(await element!.evaluate(node=>node.isConnected)).toBe(true);await expect(input).toBeFocused();
  await expect(input).toHaveValue('葉 Rowan');
});

for(const viewport of [{width:320,height:568},{width:390,height:844},{width:844,height:390}])test(`creation and sheet stay usable at ${viewport.width}×${viewport.height}`,async({page})=>{
  await page.setViewportSize(viewport);await page.goto('./');await page.getByRole('button',{name:'New Game',exact:true}).click();
  await page.addStyleTag({content:'.description { font-family:monospace; font-size:18px; }'});
  const input=page.getByRole('textbox',{name:'Character name'});await input.pressSequentially('W'.repeat(25));
  await expect(input).toHaveValue('W'.repeat(24));
  const live=await page.getByRole('status',{name:'Creation result'}).elementHandle();
  const increase=page.getByRole('button',{name:'Increase prowess',exact:true});await increase.focus();await page.keyboard.press('Enter');
  await expect(increase).toBeFocused();expect(await live!.evaluate(node=>node.isConnected)).toBe(true);
  await page.getByRole('button',{name:'Decrease prowess',exact:true}).click();
  for(const button of await page.locator('.creation-actions button').all()){
    const box=(await button.boundingBox())!;expect(box.width).toBeGreaterThanOrEqual(48);expect(box.height).toBeGreaterThanOrEqual(48);expect(box.y+box.height).toBeLessThanOrEqual(viewport.height);
  }
  await createCharacter(page,{...checkpoint.character,name:'W'.repeat(24)});
  expect(await live!.evaluate(node=>node.isConnected)).toBe(true);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.screenshot({path:`test-results/iteration-4-review-${viewport.width}.png`,fullPage:true});
  for(const button of await page.locator('.creation-actions button').all()){
    const box=(await button.boundingBox())!;expect(box.y+box.height).toBeLessThanOrEqual(viewport.height);
  }
  await page.getByRole('button',{name:'Begin adventure'}).click();await page.getByText('Character',{exact:true}).click();
  await expect(page.getByLabel('Character name')).toHaveText('W'.repeat(24));
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.screenshot({path:`test-results/iteration-4-sheet-${viewport.width}.png`,fullPage:true});
});

test('a Combat-zero adventure retains damage, heals to its max and Restarts the same build/map',async({page})=>{
  const character={...scholar,name:'Moss'};
  await seed(page,{...checkpoint,character,position:{x:15,y:14},hp:3});await steps(page,'down');
  await expect(page.locator('.combat-result')).toHaveText('Attack 1d10 vs 3d10 defense.');
  await attack(page,[1,1,1,1, 8,1,1, 1,1]);
  await expect(page.getByLabel('Hero health')).toHaveText('2 / 3 HP');
  await page.getByRole('button',{name:'Run',exact:true}).click();
  await expect(page.getByLabel('Position')).toHaveText('15, 14');
  await page.reload();await page.getByRole('button',{name:'Continue',exact:true}).click();
  await expect(page.getByLabel('Hero health')).toHaveText('2 / 3 HP');await steps(page,'down');
  await attack(page,[10,10, 1,1,1, 1,1,1, 1,1]);await attack(page,[8, 1,1,1]);
  await page.getByRole('button',{name:'Back to clearing'}).click();await expect(page.getByLabel('Hero health')).toHaveText('3 / 3 HP');
  await steps(page,'left',7);await steps(page,'up',6);
  await attack(page,[1,1,1,1, 8,8,8, 1,1]);await expect(page.getByRole('heading',{name:'Defeated',exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Restart',exact:true}).click();
  await expect(page.getByLabel('Hero health')).toHaveText('3 / 3 HP');
  expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('simple-rpg.save.v5')!))).toEqual({...checkpoint,character,hp:3});
});

test('repeated overwrite confirmation creates one replacement',async({page})=>{
  await seed(page);await page.reload();await startAdventure(page);
  await expect(page.getByRole('button',{name:'Start Over',exact:true})).toBeEnabled();
  await page.evaluate(()=>{let count=0;const original=Storage.prototype.setItem;Object.defineProperty(window,'__creationWrites',{get:()=>count});Storage.prototype.setItem=function(key,value){if(key==='simple-rpg.save.v5')count++;return original.call(this,key,value);};const button=document.querySelector<HTMLButtonElement>('[data-creation-action="confirm"]')!;button.click();button.click();});
  await expect(page.getByLabel('Position')).toHaveText('3, 3');expect(await page.evaluate(()=>window.__creationWrites)).toBe(1);
});

test('a real double-click cannot click through Begin into destructive confirmation',async({page})=>{
  await seed(page);await page.reload();const saved=await page.evaluate(()=>localStorage.getItem('simple-rpg.save.v5'));
  await page.getByRole('button',{name:'New Game',exact:true}).click();await createCharacter(page,scholar);
  await page.getByRole('button',{name:'Begin adventure',exact:true}).dblclick({delay:35});
  expect(await page.evaluate(()=>localStorage.getItem('simple-rpg.save.v5'))).toBe(saved);
  await expect(page.getByRole('button',{name:'Start Over',exact:true})).toBeVisible();
  await expect(page.getByLabel('Hero health')).toHaveCount(0);
});

test('a double-click on changed-save confirmation requires another fresh gesture',async({page})=>{
  await seed(page);await page.reload();await startAdventure(page,scholar);
  await page.evaluate(value=>localStorage.setItem('simple-rpg.save.v5',JSON.stringify(value)),{...checkpoint,position:{x:4,y:3}});
  await page.getByRole('button',{name:'Start Over',exact:true}).dblclick({delay:35});
  expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('simple-rpg.save.v5')!).position)).toEqual({x:4,y:3});
  await expect(page.getByRole('button',{name:'Start Over',exact:true})).toBeVisible();
});

test('simultaneous starts serialize comparison and write instead of silently replacing a character',async({page,context})=>{
  const other=await context.newPage();
  for(const [index,p] of [page,other].entries()){
    await p.goto('./');await p.getByRole('button',{name:'New Game',exact:true}).click();await createCharacter(p,{...checkpoint.character,name:`Player ${index}`});
  }
  const at=Date.now()+250;
  await Promise.all([page,other].map(p=>p.evaluate(at=>new Promise<void>(resolve=>setTimeout(()=>{
    window.dispatchEvent(new Event('focus'));document.querySelector<HTMLButtonElement>('[data-creation-action="begin"]')!.click();resolve();
  },Math.max(0,at-Date.now()))),at)));
  await expect.poll(async()=>{
    const results=await Promise.all([page,other].map(p=>p.getByLabel('Position').count()));return results.reduce((a,b)=>a+b,0);
  }).toBe(1);
  const loser=await page.getByLabel('Position').count()?other:page;
  await expect(loser.getByRole('button',{name:'Start Over',exact:true})).toBeVisible();
});

for(const saved of [false,true])test(`starting with the keyboard restores movement focus (${saved?'replacement':'new'})`,async({page})=>{
  if(saved){await seed(page);await page.reload();}else await page.goto('./');
  await page.getByRole('button',{name:'New Game',exact:true}).click();await createCharacter(page);
  await page.getByRole('button',{name:'Begin adventure',exact:true}).focus();await page.keyboard.press('Enter');
  if(saved){const confirm=page.getByRole('button',{name:'Start Over',exact:true});await expect(confirm).toBeEnabled();await confirm.focus();await page.keyboard.press('Enter');}
  await expect(page.getByRole('button',{name:'Move up',exact:true})).toBeFocused();
});

test('a press begun while overwrite confirmation is locked cannot activate after unlock',async({page})=>{
  await seed(page);await page.reload();await page.getByRole('button',{name:'New Game',exact:true}).click();await createCharacter(page);
  const saved=await page.evaluate(()=>localStorage.getItem('simple-rpg.save.v5'));
  const now=new Date();await page.clock.install({time:now});await page.clock.pauseAt(new Date(now.getTime()+60_000));
  await page.getByRole('button',{name:'Begin adventure'}).click();const confirm=page.getByRole('button',{name:'Start Over',exact:true});
  await expect(confirm).toBeDisabled();const box=(await confirm.boundingBox())!;
  await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.down();
  await page.clock.runFor(300);await expect(confirm).toBeEnabled();await page.mouse.up();
  expect(await page.evaluate(()=>localStorage.getItem('simple-rpg.save.v5'))).toBe(saved);
  await expect(confirm).toBeVisible();
});

test('an older active adventure cannot overwrite a newly confirmed character from another tab',async({page,context})=>{
  await seed(page);const old=await context.newPage();await old.goto('./');await old.getByRole('button',{name:'Continue',exact:true}).click();
  await page.bringToFront();await page.reload();await startAdventure(page,scholar);await page.getByRole('button',{name:'Start Over',exact:true}).click();
  await expect(page.getByLabel('Hero health')).toHaveText('3 / 3 HP');
  const saved=await page.evaluate(()=>localStorage.getItem('simple-rpg.save.v5'));
  await old.bringToFront();await steps(old,'right');
  await expect(old.getByLabel('Position')).toHaveText('4, 3');
  await expect(old.getByRole('status',{name:'Save status'})).toContainText('Another tab changed this adventure');
  expect(await old.evaluate(()=>localStorage.getItem('simple-rpg.save.v5'))).toBe(saved);
});

test('without browser save locks Continue stays playable but stored progress is never replaced',async({page})=>{
  await page.addInitScript(()=>Object.defineProperty(navigator,'locks',{value:undefined,configurable:true}));
  await seed(page);const saved=await page.evaluate(()=>localStorage.getItem('simple-rpg.save.v5'));
  await steps(page,'right');await expect(page.getByLabel('Position')).toHaveText('4, 3');
  await expect(page.getByRole('status',{name:'Save status'})).toContainText('cannot be saved');
  expect(await page.evaluate(()=>localStorage.getItem('simple-rpg.save.v5'))).toBe(saved);
});
