import { expect, type Page } from '@playwright/test';
export const world = {version:2,layout:'woodland',width:20,height:20,slimes:[
  {id:'slime-1',position:{x:15,y:15}}, {id:'slime-2',position:{x:8,y:8}}, {id:'slime-3',position:{x:10,y:10}},
]};
export const checkpoint = {version:3,world,position:{x:3,y:3},hp:12,completedEncounterIds:[] as string[]};
export async function seed(page:Page, value = checkpoint) {
  await page.goto('./');
  await page.evaluate(value => localStorage.setItem('simple-rpg.save.v3',JSON.stringify(value)), value);
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
