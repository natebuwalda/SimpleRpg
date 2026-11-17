import {expect,it} from 'vitest';
import {transition as reduce} from '../src/game/session';
import {getLivingEncounterAt,getRemainingSlimeCount} from '../src/game/world';
import type {Checkpoint,GameState,SlimeId} from '../src/game/types';
import {makeCheckpoint,makeWorld} from './fixtures';
import {scriptedFaces, losingFaces, tradingFaces} from './rolls';
const transition: typeof reduce = (state, action, rng = () => .7) => reduce(state, action, rng);
const world={...makeWorld(),slimes:[{id:'slime-1' as const,position:{x:5,y:3}},{id:'slime-2' as const,position:{x:8,y:6}},{id:'slime-3' as const,position:{x:15,y:15}}]};
function enter(cp:Checkpoint,id:SlimeId):GameState{
 const p=cp.world.slimes.find(s=>s.id===id)!.position;
 return transition({kind:'exploring',checkpoint:{...cp,position:{x:p.x-1,y:p.y}}},{type:'move',direction:'right'});
}
it('binds battle to slime2 and defeats only that identity',()=>{
 const cp=makeCheckpoint(world),battle=enter(cp,'slime-2');
 expect(battle).toMatchObject({kind:'battle',encounterId:'slime-2'});
 expect(transition(battle,{type:'move',direction:'down'})).toEqual(battle);
 const victory=transition(transition(battle,{type:'attack'}),{type:'attack'});
 expect(victory).toMatchObject({kind:'victory',checkpoint:{completedEncounterIds:['slime-2'],hp:5,position:{x:7,y:6}}});
 if(victory.kind!=='victory')throw Error('Expected victory');
 expect(victory.checkpoint.world).toEqual(world);expect(getRemainingSlimeCount(victory.checkpoint)).toBe(2);
 expect(getLivingEncounterAt(victory.checkpoint,{x:5,y:3})?.id).toBe('slime-1');
 expect(getLivingEncounterAt(victory.checkpoint,{x:15,y:15})?.id).toBe('slime-3');
 const exploring=transition(victory,{type:'acknowledgeVictory'});
 expect(transition(exploring,{type:'move',direction:'right'})).toMatchObject({kind:'exploring',checkpoint:{position:{x:8,y:6}}});
 expect(cp.completedEncounterIds).toEqual([]);
});
it('clears all three in a different order without duplicate completions',()=>{
 let cp=makeCheckpoint(world);
 const order:SlimeId[]=['slime-2','slime-3','slime-1'];
 for(let i=0;i<order.length;i++){
  const victory=transition(transition(enter(cp,order[i]),{type:'attack'}),{type:'attack'});
  expect(victory.kind).toBe('victory');expect(transition(victory,{type:'attack'})).toEqual(victory);
  if(victory.kind!=='victory')throw Error('Expected victory');cp=victory.checkpoint;
  expect(cp.completedEncounterIds).toEqual(order.slice(0,i+1));expect(getRemainingSlimeCount(cp)).toBe(2-i);
 }
 expect(cp.world).toEqual(world);
});
it('Run retains damage and all independent placements/completions',()=>{
 const cp={...makeCheckpoint(world),completedEncounterIds:['slime-2' as const]};
 const escaped=transition(transition(enter(cp,'slime-3'),{type:'attack'},scriptedFaces(...tradingFaces)),{type:'run'});
 expect(escaped).toEqual({kind:'exploring',checkpoint:{...cp,position:{x:14,y:15},hp:3}});
 expect(enter((escaped as Extract<GameState,{kind:'exploring'}>).checkpoint,'slime-3').kind).toBe('battle');
});
it('Restart after partial progress and defeat restores the exact three placements',()=>{
 const cp={...makeCheckpoint(world),completedEncounterIds:['slime-1' as const],hp:2};
 const defeat=transition(enter(cp,'slime-2'),{type:'attack'},scriptedFaces(...losingFaces));
 expect(defeat).toMatchObject({kind:'defeat',checkpoint:{hp:2,completedEncounterIds:['slime-1']}});
 expect(transition(defeat,{type:'restart'})).toEqual({kind:'exploring',checkpoint:makeCheckpoint(world)});
});
