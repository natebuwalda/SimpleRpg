import {test,expect} from '@playwright/test';
import {checkpoint,seed} from './helpers';
test('focus refresh does not replace a focused character detail action',async({page})=>{
 await seed(page);await page.reload();await page.getByRole('button',{name:'View',exact:true}).click();const resume=page.getByRole('button',{name:'Resume adventure',exact:true});await resume.focus();const element=await resume.elementHandle();
 await page.evaluate(()=>{window.dispatchEvent(new Event('focus'));window.dispatchEvent(new StorageEvent('storage',{key:'simple-rpg.save.v13'}));});
 expect(await element!.evaluate(node=>node.isConnected)).toBe(true);await expect(resume).toBeFocused();
});
test('physical double click and held pointer cannot click through deletion confirmation',async({page})=>{
 await seed(page);await page.reload();await page.getByRole('button',{name:'View',exact:true}).click();
 await page.getByRole('button',{name:'Delete character',exact:true}).dblclick();
 await expect(page.getByRole('heading',{name:'End this story?'})).toBeVisible();
 const confirm=page.getByRole('button',{name:'Delete permanently',exact:true});
 // Reopen and start a pointer press while the new confirmation is disabled.
 await page.getByRole('button',{name:'Keep character',exact:true}).click();await page.getByRole('button',{name:'Delete character',exact:true}).click();
 const box=(await confirm.boundingBox())!;await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.down();await expect(confirm).toBeEnabled();await page.mouse.up();
 await expect(page.getByRole('heading',{name:'End this story?'})).toBeVisible();
 await page.getByRole('button',{name:'Keep character',exact:true}).focus();await page.keyboard.press('Tab');await page.keyboard.press('Enter');await expect(page.getByLabel('Roster capacity')).toHaveText('0 / 10 slots');
});
test('keyboard held before confirmation cannot delete and focus remains usable',async({page})=>{
 await seed(page);await page.reload();await page.getByRole('button',{name:'View',exact:true}).click();
 await page.getByRole('button',{name:'Delete character',exact:true}).focus();await page.keyboard.down('Enter');await expect(page.getByRole('button',{name:'Keep character',exact:true})).toBeFocused();
 await page.getByRole('button',{name:'Delete permanently',exact:true}).focus();await page.keyboard.down('Enter');await page.keyboard.up('Enter');
 await expect(page.getByRole('heading',{name:'End this story?'})).toBeVisible();await page.getByRole('button',{name:'Keep character',exact:true}).click();await page.getByRole('button',{name:'Back',exact:true}).click();
 await page.getByRole('button',{name:'Resume',exact:true}).focus();await page.keyboard.press('Enter');await expect(page.getByRole('button',{name:'Move up',exact:true})).toBeFocused();
});
for(const viewport of [{width:320,height:568},{width:390,height:844},{width:844,height:390}])test(`full roster and details scroll without overflow at ${viewport.width}x${viewport.height}`,async({page})=>{
 await page.setViewportSize(viewport);await seed(page);await page.evaluate(cp=>{localStorage.setItem('simple-rpg.save.v13',JSON.stringify({version:13,slots:Array.from({length:10},(_,i)=>({id:`00000000-0000-4000-8000-${String(i).padStart(12,'0')}`,revision:1,status:'active',checkpoint:{...cp,character:{...cp.character,name:'W'.repeat(24)}}}))}));},checkpoint);await page.reload();
 await page.addStyleTag({content:'.description,.roster-slot p {font-size:20px;font-family:monospace}'});
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 const view=page.getByRole('button',{name:'View',exact:true}).last();await view.scrollIntoViewIfNeeded();await expect(view).toBeInViewport();const box=(await view.boundingBox())!;expect(box.width).toBeGreaterThanOrEqual(48);expect(box.height).toBeGreaterThanOrEqual(48);
 await page.screenshot({path:`test-results/iteration-5-roster-${viewport.width}.png`,fullPage:true});await view.click();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.getByRole('button',{name:'Resume adventure',exact:true}).scrollIntoViewIfNeeded();await page.getByRole('button',{name:'Resume adventure',exact:true}).click();
 const back=page.getByRole('button',{name:'Return to characters',exact:true});await back.scrollIntoViewIfNeeded();await expect(back).toBeInViewport();await back.click();await expect(page.getByLabel('Roster capacity')).toHaveText('10 / 10 slots');
});
