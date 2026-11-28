import {test,expect} from '@playwright/test';
import {checkpoint,createCharacter,startAdventure,seed,steps,attack,losingFaces} from './helpers';
test('creates and resumes independent playthroughs',async({page})=>{
 await page.goto('./');await startAdventure(page);await steps(page,'right');
 await page.getByRole('button',{name:'Return to characters',exact:true}).click();
 await expect(page.getByLabel('Roster capacity')).toHaveText('1 / 10 slots');
 await startAdventure(page,{...checkpoint.character,name:'Mira'});
 await page.getByRole('button',{name:'Return to characters',exact:true}).click();
 await expect(page.getByLabel('Roster capacity')).toHaveText('2 / 10 slots');
 await page.getByRole('article',{name:'Adventurer',exact:true}).getByRole('button',{name:'Resume',exact:true}).click();
 await expect(page.getByLabel('Position')).toHaveText('4, 3');
 await page.reload();await expect(page.getByRole('heading',{name:'Your adventures'})).toBeVisible();
 await page.getByRole('article',{name:'Mira',exact:true}).getByRole('button',{name:'Resume',exact:true}).click();
 await expect(page.getByLabel('Position')).toHaveText('3, 3');
});
test('cancel and refresh do not consume slots',async({page})=>{await page.goto('./');await page.getByRole('button',{name:'New Character',exact:true}).click();await page.getByRole('textbox',{name:'Character name'}).fill('draft');await page.getByRole('button',{name:'Cancel',exact:true}).click();await expect(page.getByLabel('Roster capacity')).toHaveText('0 / 10 slots');await page.getByRole('button',{name:'New Character',exact:true}).click();await createCharacter(page);await page.reload();await expect(page.getByLabel('Roster capacity')).toHaveText('0 / 10 slots');});
test('defeat survives reload and Restart preserves the playthrough at capacity',async({page})=>{
 await seed(page,{...checkpoint,position:{x:15,y:14},hp:2});await steps(page,'down');await attack(page,losingFaces);
 await expect(page.getByRole('heading',{name:'Defeated',exact:true})).toBeVisible();await page.reload();
 await expect(page.getByText('Defeated',{exact:true})).toBeVisible();
 await page.evaluate(()=>{const r=JSON.parse(localStorage.getItem('simple-rpg.save.v13')!);for(let i=2;i<=10;i++)r.slots.push({...r.slots[0],id:`00000000-0000-4000-8000-${String(i).padStart(12,'0')}`,status:'active'});localStorage.setItem('simple-rpg.save.v13',JSON.stringify(r));});await page.reload();
 await page.getByRole('button',{name:'Restart',exact:true}).click();await expect(page.getByLabel('Position')).toHaveText('3, 3');await expect(page.getByLabel('Hero health')).toHaveText('5 / 5 HP');
 const r=await page.evaluate(()=>JSON.parse(localStorage.getItem('simple-rpg.save.v13')!));expect(r.slots).toHaveLength(10);expect(r.slots[0].checkpoint).toEqual(checkpoint);expect(r.slots[0].status).toBe('active');
});
test('full roster resumes and deletion resolves duplicate names by ID',async({page})=>{
 await page.goto('./');await page.evaluate(cp=>localStorage.setItem('simple-rpg.save.v13',JSON.stringify({version:13,slots:Array.from({length:10},(_,i)=>({id:`00000000-0000-4000-8000-${String(i).padStart(12,'0')}`,revision:1,status:'active',checkpoint:cp}))})),checkpoint);await page.reload();
 await expect(page.getByRole('button',{name:'New Character',exact:true})).toBeDisabled();
 await page.getByRole('button',{name:'View',exact:true}).nth(1).click();await page.getByRole('button',{name:'Delete character',exact:true}).click();await page.getByRole('button',{name:'Keep character',exact:true}).click();
 await page.getByRole('button',{name:'Delete character',exact:true}).click();await page.getByRole('button',{name:'Delete permanently',exact:true}).click();await expect(page.getByLabel('Roster capacity')).toHaveText('9 / 10 slots');
 const ids=await page.evaluate(()=>JSON.parse(localStorage.getItem('simple-rpg.save.v13')!).slots.map((s:any)=>s.id));expect(ids).not.toContain('00000000-0000-4000-8000-000000000001');expect(ids).toContain('00000000-0000-4000-8000-000000000000');
 await page.getByRole('button',{name:'Resume',exact:true}).first().click();await expect(page.getByLabel('Hero health')).toHaveText('5 / 5 HP');
});
