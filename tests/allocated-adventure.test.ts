import { expect,test } from 'vitest';
import { createSession,transition } from '../src/game/session';
import type { Character,GameState } from '../src/game/types';
import { makeWorld } from './fixtures';
import { scriptedFaces } from './rolls';
const character:Character={classId:'warrior',name:'Moss',attributes:{prowess:1,cunning:5,resistance:2},skills:{combat:0,subterfuge:5,lore:0}};
const world=makeWorld();
function enter(hp=3):GameState{
  const state=transition(createSession(),{type:'newGame',world,character});
  if(state.kind!=='exploring')throw Error('Expected exploring');
  return transition({...state,checkpoint:{...state.checkpoint,hp,position:{x:14,y:15},completedEncounterIds:['slime-2']}},{type:'move',direction:'right'},()=>0);
}
test('nonstarter New Game copies the character and rejects illegal budgets',()=>{
  const input=structuredClone(character),state=transition(createSession(),{type:'newGame',world,character:input});
  input.name='Changed';input.attributes.prowess=5;
  expect(state).toMatchObject({kind:'exploring',checkpoint:{hp:3,character}});
  const title=createSession();expect(transition(title,{type:'newGame',world,character:{...character,skills:{...character.skills,combat:1}}})).toBe(title);
});
test('Combat zero uses pools 1/2, Run retains damage and Continue preserves the snapshot',()=>{
  const battle=enter();expect(battle).toMatchObject({kind:'battle',battle:{heroPools:{attack:1,defense:2}}});
  const turn=transition(battle,{type:'melee'},scriptedFaces(1, 1,1,1, 8,1,1, 1,1));
  expect(turn).toMatchObject({kind:'battle',battle:{heroHp:2,enemyHp:3}});
  const escaped=transition(turn,{type:'run'});expect(escaped).toMatchObject({kind:'exploring',checkpoint:{hp:2,character}});
  if(escaped.kind!=='exploring')throw Error('Expected exploration');
  expect(transition(createSession(),{type:'continue',checkpoint:escaped.checkpoint})).toEqual(escaped);
});
test('victory heals to the actual maximum and Restart retains the same character and world',()=>{
  const victory=transition(enter(1),{type:'melee'},scriptedFaces(10,10, 1,1,1, 1,1,1, 1,1));
  expect(victory).toMatchObject({kind:'battle',battle:{enemyHp:1,heroHp:1}});
  const won=transition(victory,{type:'melee'},scriptedFaces(8, 1,1,1));
  expect(won).toMatchObject({kind:'victory',checkpoint:{hp:3,character,completedEncounterIds:['slime-2','slime-1']}});
  const defeat=transition(enter(1),{type:'melee'},scriptedFaces(1, 1,1,1, 8,8,8, 1,1));
  expect(defeat.kind).toBe('defeat');
  expect(transition(defeat,{type:'restart'})).toMatchObject({kind:'exploring',checkpoint:{hp:3,character,world,position:{x:3,y:3},completedEncounterIds:[]}});
});
