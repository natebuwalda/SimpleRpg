import { expect, test } from 'vitest';
import { createStarterCharacter, type Character } from '../src/game/character';
import { createCheckpoint } from '../src/game/world';
import { parseCheckpoint as parseSave,writeRoster } from '../src/game/save';
import { makeCheckpoint } from './fixtures';

const scholar:Character={classId:'warrior',name:'Moss',attributes:{prowess:1,cunning:5,resistance:2},skills:{combat:0,subterfuge:5,lore:0}};
const warrior:Character={classId:'warrior',name:'Fern',attributes:{prowess:5,cunning:1,resistance:2},skills:{combat:5,subterfuge:0,lore:0}};
test.each([[scholar,3],[warrior,7]] as const)('v10 retains allocated character and its Health range %j', (character,maxHp)=>{
  for(let hp=1;hp<=maxHp;hp++){
    const cp={...makeCheckpoint(),version:10 as const,character,hp,completedEncounterIds:['slime-2' as const]};
    let value='';expect(writeRoster({setItem(key,raw){expect(key).toBe('simple-rpg.save.v11');value=raw;}},{version:11,slots:[{id:'00000000-0000-4000-8000-000000000001',revision:1,status:'active',checkpoint:cp}]})).toBe(true);
    expect(parseSave(JSON.stringify(JSON.parse(value).slots[0].checkpoint))).toEqual(cp);
  }
  for(const hp of [0,maxHp+1,1.5])expect(parseSave(JSON.stringify({...makeCheckpoint(),version:10,character,hp}))).toBeNull();
});
test('checkpoint construction copies the chosen build and derives its full Health',()=>{
  const input=structuredClone(scholar), cp=createCheckpoint(makeCheckpoint().world,input);
  expect(cp).toMatchObject({version:10,hp:3,character:scholar});
  input.attributes.prowess=5;input.skills.combat=5;input.name='Changed';
  expect(cp.character).toEqual(scholar);
});
