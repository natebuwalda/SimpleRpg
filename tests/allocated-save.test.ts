import { expect, test } from 'vitest';
import { createStarterCharacter, type Character } from '../src/game/character';
import { createCheckpoint } from '../src/game/world';
import { loadSave, parseSave, saveGame } from '../src/game/save';
import { makeCheckpoint } from './fixtures';

const scholar:Character={name:'Moss',attributes:{prowess:1,cunning:5,resistance:2},skills:{combat:0,subterfuge:5,lore:0}};
const warrior:Character={name:'Fern',attributes:{prowess:5,cunning:1,resistance:2},skills:{combat:5,subterfuge:0,lore:0}};
test.each([[scholar,3],[warrior,7]] as const)('v5 retains allocated character and its Health range %j', (character,maxHp)=>{
  for(let hp=1;hp<=maxHp;hp++){
    const cp={...makeCheckpoint(),version:5 as const,character,hp,completedEncounterIds:['slime-2' as const]};
    let value='';expect(saveGame({setItem(key,raw){expect(key).toBe('simple-rpg.save.v5');value=raw;}},cp)).toBe(true);
    expect(parseSave(value)).toEqual(cp);
  }
  for(const hp of [0,maxHp+1,1.5])expect(parseSave(JSON.stringify({...makeCheckpoint(),version:5,character,hp}))).toBeNull();
});
test('checkpoint construction copies the chosen build and derives its full Health',()=>{
  const input=structuredClone(scholar), cp=createCheckpoint(makeCheckpoint().world,input);
  expect(cp).toMatchObject({version:5,hp:3,character:scholar});
  input.attributes.prowess=5;input.skills.combat=5;input.name='Changed';
  expect(cp.character).toEqual(scholar);
});
test('v4 upgrades exact placements/progress at the old cap without dice or rerolls',()=>{
  const old={...makeCheckpoint(),version:4,character:{attributes:{prowess:3,cunning:3,resistance:2},skills:{combat:2,subterfuge:2,lore:1}},hp:2,completedEncounterIds:['slime-2']};
  const raw=JSON.stringify(old), reads:string[]=[];
  const result=loadSave({getItem(key){reads.push(key);return key.endsWith('v4')?raw:null;}},()=>{throw Error('Unexpected RNG');});
  expect(reads).toEqual(['simple-rpg.save.v5','simple-rpg.save.v4']);
  expect(result).toMatchObject({status:'ready',migrated:true,checkpoint:{...old,version:5,character:createStarterCharacter()}});
  for(const changes of [{hp:6},{character:scholar},{character:undefined}])expect(loadSave({getItem:key=>key.endsWith('v4')?JSON.stringify({...old,...changes}):null}).status).toBe('invalid');
});
test('invalid newest v5 never falls back and exact historical key/schema agreement remains required',()=>{
  const v5={...makeCheckpoint(),version:5,character:scholar,hp:3};
  for(const changes of [{character:{...scholar,name:' Moss '}},{character:{...scholar,name:' '}},{character:{...scholar,skills:{...scholar.skills,lore:1}}},{hp:4}]){
    const reads:string[]=[];
    expect(loadSave({getItem(key){reads.push(key);return JSON.stringify({...v5,...changes});}}).status).toBe('invalid');
    expect(reads).toEqual(['simple-rpg.save.v5']);
  }
  expect(loadSave({getItem:key=>key.endsWith('v4')?JSON.stringify(v5):null}).status).toBe('invalid');
});
