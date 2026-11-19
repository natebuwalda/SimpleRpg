import { expect, test } from 'vitest';
import { createCharacterDraft, remainingPoints, allocatePoint, finishCharacter } from '../src/game/creation';
import { deriveStats, getMeleePools, isValidCharacter, isStarterCharacter, type Character } from '../src/game/character';

const scholar: Character = { name:'Moss', attributes:{prowess:1,cunning:5,resistance:2}, skills:{combat:0,subterfuge:5,lore:0} };
const warrior: Character = { name:'Fern', attributes:{prowess:5,cunning:1,resistance:2}, skills:{combat:5,subterfuge:0,lore:0} };
test('base draft has independent five-point budgets', () => {
  const draft=createCharacterDraft();
  expect(draft).toEqual({name:'',attributes:{prowess:1,cunning:1,resistance:1},skills:{combat:0,subterfuge:0,lore:0}});
  expect(remainingPoints(draft,'attributes')).toBe(5);expect(remainingPoints(draft,'skills')).toBe(5);
  expect(finishCharacter(draft)).toBeNull();
});
test('allocation reclaims points and rejects base, maximum and budget violations immutably', () => {
  const original=createCharacterDraft();
  expect(allocatePoint(original,{group:'attributes',key:'prowess',delta:-1})).toBe(original);
  expect(allocatePoint(original,{group:'skills',key:'combat',delta:-1})).toBe(original);
  let draft=original;
  for(let i=0;i<4;i++)draft=allocatePoint(draft,{group:'attributes',key:'prowess',delta:1});
  expect(allocatePoint(draft,{group:'attributes',key:'prowess',delta:1})).toBe(draft);
  draft=allocatePoint(draft,{group:'attributes',key:'resistance',delta:1});
  expect(remainingPoints(draft,'attributes')).toBe(0);
  expect(allocatePoint(draft,{group:'attributes',key:'cunning',delta:1})).toBe(draft);
  draft=allocatePoint(draft,{group:'attributes',key:'prowess',delta:-1});
  expect(remainingPoints(draft,'attributes')).toBe(1);expect(original.attributes.prowess).toBe(1);
  for(let i=0;i<5;i++)draft=allocatePoint(draft,{group:'skills',key:'lore',delta:1});
  expect(allocatePoint(draft,{group:'skills',key:'combat',delta:1})).toBe(draft);
  expect(allocatePoint(draft,{group:'skills',key:'lore',delta:1})).toBe(draft);
});
test('different valid builds derive actual Health and melee pools, including Combat zero', () => {
  expect(isValidCharacter(scholar)).toBe(true);expect(isValidCharacter(warrior)).toBe(true);
  expect(deriveStats(scholar)).toEqual({maxHp:3,initiative:6,resourceCapacity:7});
  expect(getMeleePools(scholar)).toEqual({attack:1,defense:2});
  expect(deriveStats(warrior).maxHp).toBe(7);expect(getMeleePools(warrior)).toEqual({attack:10,defense:7});
  expect(isStarterCharacter(scholar)).toBe(false);
});
test('both independent budgets can allocate the original two/two/one spend', () => {
  let draft={...createCharacterDraft(),name:'Rowan'};
  for(const key of ['prowess','prowess','cunning','cunning','resistance'] as const)draft=allocatePoint(draft,{group:'attributes',key,delta:1});
  for(const key of ['combat','combat','subterfuge','subterfuge','lore'] as const)draft=allocatePoint(draft,{group:'skills',key,delta:1});
  expect(finishCharacter(draft)).toEqual({name:'Rowan',attributes:{prowess:3,cunning:3,resistance:2},skills:{combat:2,subterfuge:2,lore:1}});
});
test('finishing trims names and copies all nested ratings', () => {
  const draft={...scholar,name:'  Moss & <b>葉</b>  '};
  const result=finishCharacter(draft)!;
  expect(result.name).toBe('Moss & <b>葉</b>');
  result.attributes.prowess=5;result.skills.combat=5;
  expect(draft.attributes.prowess).toBe(1);expect(draft.skills.combat).toBe(0);
});
test('canonical name boundaries and historical unnamed guard remain distinct', () => {
  expect(isValidCharacter({...scholar,name:'x'.repeat(24)})).toBe(true);
  for(const name of ['', '  ', ' Moss ', 'x'.repeat(25), null, 1])expect(isValidCharacter({...scholar,name})).toBe(false);
  for(const name of ['', '   ', 'x'.repeat(25)])expect(finishCharacter({...scholar,name})).toBeNull();
  expect(isStarterCharacter({attributes:{prowess:3,cunning:3,resistance:2},skills:{combat:2,subterfuge:2,lore:1}})).toBe(true);
});
test('incomplete, malformed and out-of-range ratings cannot finish', () => {
  for(const value of [null, {}, {...scholar,attributes:null}, {...scholar,skills:undefined},
    ...[0,6,1.5,'1',NaN,Infinity,undefined].map(prowess=>({...scholar,attributes:{...scholar.attributes,prowess}})),
    ...[-1,6,.5,'0',NaN,Infinity,undefined].map(combat=>({...scholar,skills:{...scholar.skills,combat}})),
    {...scholar,attributes:{...scholar.attributes,cunning:4}}, {...scholar,skills:{...scholar.skills,lore:1}}])expect(isValidCharacter(value)).toBe(false);
});
