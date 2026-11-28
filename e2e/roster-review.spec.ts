import {test,expect,type Page} from '@playwright/test';
import {checkpoint,seed,steps,attack,losingFaces} from './helpers';
declare global{interface Window{__reviewFailWrites:boolean;__reviewFailReads:boolean;}}
async function failures(page:Page){await page.evaluate(()=>{
 const get=Storage.prototype.getItem,set=Storage.prototype.setItem;
 Storage.prototype.getItem=function(key){if(window.__reviewFailReads&&key.endsWith('.save.v11'))throw Error('temporary read');return get.call(this,key)};
 Storage.prototype.setItem=function(key,value){if(window.__reviewFailWrites&&key.endsWith('.save.v11'))throw Error('temporary write');return set.call(this,key,value)};
});}
test('discard confirmation blocks movement and saves until it closes',async({page})=>{
 await seed(page);await failures(page);const before=await page.evaluate(()=>localStorage.getItem('simple-rpg.save.v11'));
 await page.evaluate(()=>window.__reviewFailWrites=true);await steps(page,'right');await page.getByRole('button',{name:'Return to characters',exact:true}).click();
 await expect(page.getByRole('heading',{name:'Leave unsaved progress?'})).toBeVisible();await page.evaluate(()=>window.__reviewFailWrites=false);
 await page.keyboard.press('ArrowDown');await page.keyboard.press('d');await expect(page.locator('#screen')).toHaveAttribute('aria-busy','false');
 expect(await page.evaluate(()=>localStorage.getItem('simple-rpg.save.v11'))).toBe(before);
 await page.getByRole('button',{name:'Discard unsaved progress',exact:true}).click();await page.getByRole('button',{name:'Resume',exact:true}).click();await expect(page.getByLabel('Position')).toHaveText('3, 3');
});
test('temporary storage read failure recovers mutation availability without reload',async({page})=>{
 await seed(page);await failures(page);await page.evaluate(()=>window.__reviewFailReads=true);await steps(page,'right');
 await expect(page.getByRole('status',{name:'Save status'})).toContainText('cannot be saved');await page.evaluate(()=>window.__reviewFailReads=false);
 await page.getByRole('button',{name:'Retry save',exact:true}).click();await expect(page.getByRole('status',{name:'Save status'})).toContainText('Adventure saved');
 await page.getByRole('button',{name:'Return to characters',exact:true}).click();await expect(page.getByRole('button',{name:'New Character',exact:true})).toBeEnabled();
 await expect(page.getByRole('status',{name:'Save status'})).not.toContainText('cannot be saved');
});
test('failed durable Restart retries Restart rather than pretending the checkpoint is dirty',async({page})=>{
 await seed(page,{...checkpoint,position:{x:15,y:14},hp:2});await steps(page,'down');await attack(page,losingFaces);await expect(page.locator('#screen')).toHaveAttribute('aria-busy','false');
 expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('simple-rpg.save.v11')!).slots[0].status)).toBe('defeated');await failures(page);await page.evaluate(()=>window.__reviewFailWrites=true);
 await page.getByRole('button',{name:'Restart',exact:true}).click();await expect(page.locator('#screen')).toHaveAttribute('aria-busy','false');await expect(page.getByRole('button',{name:'Retry save',exact:true})).toHaveCount(0);
 await page.getByRole('button',{name:'Return to characters',exact:true}).click();await expect(page.getByRole('heading',{name:'Your adventures'})).toBeVisible();
 await page.evaluate(()=>window.__reviewFailWrites=false);await page.getByRole('button',{name:'Restart',exact:true}).click();await expect(page.getByLabel('Position')).toHaveText('3, 3');await expect(page.getByLabel('Hero health')).toHaveText('5 / 5 HP');
});
test('own deletion announces success and capacity in the persistent live region and retains focus',async({page})=>{
 await seed(page);await page.reload();const live=await page.getByRole('status',{name:'Save status'}).elementHandle();await page.getByRole('button',{name:'View',exact:true}).click();await page.getByRole('button',{name:'Delete character',exact:true}).click();await page.getByRole('button',{name:'Delete permanently',exact:true}).click();
 await expect(page.getByLabel('Roster capacity')).toHaveText('0 / 10 slots');await expect(page.getByRole('status',{name:'Save status'})).toContainText('deleted');await expect(page.getByRole('status',{name:'Save status'})).toContainText('0 / 10 slots');
 await expect(page.getByText('This character is no longer available.',{exact:true})).toHaveCount(0);expect(await live!.evaluate(node=>node.isConnected)).toBe(true);await expect(page.getByRole('heading',{name:'Your adventures'})).toBeFocused();
});
test('Return and Keep playing restore a useful keyboard focus target',async({page})=>{
 await seed(page);await page.getByRole('button',{name:'Return to characters',exact:true}).click();await expect(page.getByRole('heading',{name:'Your adventures'})).toBeFocused();
 await page.getByRole('button',{name:'Resume',exact:true}).click();await failures(page);await page.evaluate(()=>window.__reviewFailWrites=true);await steps(page,'right');await page.getByRole('button',{name:'Return to characters',exact:true}).click();await page.getByRole('button',{name:'Keep playing',exact:true}).click();await expect(page.getByRole('button',{name:'Move up',exact:true})).toBeFocused();
});
