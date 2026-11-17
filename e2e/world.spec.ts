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

