import { expect, type Page } from '@playwright/test';
export const world = {version:2,layout:'woodland',width:20,height:20,slimes:[
  {id:'slime-1',position:{x:15,y:15}}, {id:'slime-2',position:{x:8,y:8}}, {id:'slime-3',position:{x:10,y:10}},
]};
export const checkpoint = {version:5,character:{name:'Adventurer',attributes:{prowess:3,cunning:3,resistance:2},skills:{combat:2,subterfuge:2,lore:1}},world,position:{x:3,y:3},hp:5,completedEncounterIds:[] as string[]};
export async function createCharacter(page:Page, build=checkpoint.character) {
  await page.getByRole('textbox',{name:'Character name',exact:true}).fill(build.name);
  for(const [key,value] of Object.entries(build.attributes))for(let i=1;i<value;i++)await page.getByRole('button',{name:`Increase ${key}`,exact:true}).click();
  await page.getByRole('button',{name:'Next: skills',exact:true}).click();
  for(const [key,value] of Object.entries(build.skills))for(let i=0;i<value;i++)await page.getByRole('button',{name:`Increase ${key}`,exact:true}).click();
  await page.getByRole('button',{name:'Review character',exact:true}).click();
}
export async function startAdventure(page:Page,build=checkpoint.character) {
  await page.getByRole('button',{name:'New Game',exact:true}).click();
  await createCharacter(page,build);
  await page.getByRole('button',{name:'Begin adventure',exact:true}).click();
  await expect(page.getByLabel('Hero health').or(page.getByRole('button',{name:'Start Over',exact:true}))).toBeVisible();
  await expect(page.locator('#screen')).toHaveAttribute('aria-busy','false');
}
export async function seed(page:Page, value = checkpoint) {
  await page.goto('./');
  await page.evaluate(value => localStorage.setItem('simple-rpg.save.v5',JSON.stringify(value)), value);
  await page.reload();
  await page.getByRole('button',{name:'Continue',exact:true}).tap();
  await expect(page.getByLabel('Position')).toBeVisible();
  await expect(page.locator('#screen')).toHaveAttribute('aria-busy','false');
}
export async function steps(page:Page, direction:string, count=1) {
  for(let i=0;i<count;i++) {await page.getByRole('button',{name:`Move ${direction}`,exact:true}).tap();await expect(page.locator('#screen')).toHaveAttribute('aria-busy','false');}
}
export async function enterBattle(page:Page) {
  await seed(page);
  await steps(page,'right',12); await steps(page,'down',12);
  await expect(page.getByRole('button',{name:'Attack',exact:true})).toBeVisible();
  await setCombatFaces(page, [...tradingFaces, 8,8,8,8,8,1,1,1]);
}

export const tradingFaces = [8,8,1,1,1, 1,1,1, 8,8,8, 8,1,1,1];
export const losingFaces = [1,1,1,1,1, 1,1,1, 8,8,8, 1,1,1,1];
declare global { interface Window { __combatOriginal?: () => number } }
export async function setCombatFaces(page: Page, faces: number[]): Promise<void> {
  await page.evaluate(faces => {
    const original = window.__combatOriginal ?? Math.random;
    window.__combatOriginal = original;
    let index = 0;
    Math.random = () => {
      const face = faces[index++];
      if (face === undefined) throw Error('Unexpected extra combat die');
      if (index === faces.length) Math.random = original;
      return (face - 0.5) / 10;
    };
  }, faces);
}
export async function attack(page: Page, faces = tradingFaces): Promise<void> {
  await expect(page.getByRole('button', { name: 'Attack', exact: true })).toBeEnabled();
  const result=page.getByRole('status',{name:'Combat result'}),before=await result.textContent();
  await setCombatFaces(page, faces);
  await page.getByRole('button', { name: 'Attack', exact: true }).tap();
  await expect(result).not.toHaveText(before??'');
  await page.evaluate(() => { Math.random = window.__combatOriginal!; });
}
