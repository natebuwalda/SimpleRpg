import { expect, type Page } from '@playwright/test';
export const world = {version:1,layout:'woodland',width:20,height:20};
export const checkpoint = {version:2,world,position:{x:3,y:3},hp:12,completedEncounterIds:[]};
export async function seed(page:Page, value = checkpoint) {
  await page.goto('./');
  await page.evaluate(value => localStorage.setItem('simple-rpg.save.v2',JSON.stringify(value)), value);
  await page.reload();
  await page.getByRole('button',{name:'Continue',exact:true}).tap();
}
export async function steps(page:Page, direction:string, count=1) {
  for(let i=0;i<count;i++) await page.getByRole('button',{name:`Move ${direction}`,exact:true}).tap();
}
export async function enterBattle(page:Page) {
  await seed(page);
  await steps(page,'right',12); await steps(page,'down',12);
  await expect(page.getByRole('button',{name:'Attack',exact:true})).toBeVisible();
}
