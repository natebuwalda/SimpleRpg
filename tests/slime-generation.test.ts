import { expect, it } from 'vitest';
import { generateWorld, placeSlimes, isWalkable, move, getLivingEncounterAt, getRemainingSlimeCount } from '../src/game/world';
import { makeWorld, makeCheckpoint } from './fixtures';
it('draws dimensions independently then three distinct positions',()=>{
  const draws=[0,.999999,0,0,0];let calls=0;
  expect(generateWorld(()=>draws[calls++]!)).toEqual({version:2,layout:'woodland',width:20,height:40,slimes:[
    {id:'slime-1',position:{x:4,y:3}},{id:'slime-2',position:{x:5,y:3}},{id:'slime-3',position:{x:6,y:3}},
  ]});expect(calls).toBe(5);
});
it('constant RNG terminates without duplicate positions',()=>{
  expect(placeSlimes(makeWorld(),[],[],()=>0)).toEqual([
    {id:'slime-1',position:{x:4,y:3}},{id:'slime-2',position:{x:5,y:3}},{id:'slime-3',position:{x:6,y:3}},
  ]);
  expect(placeSlimes(makeWorld(),[],[],()=>.999999)).toEqual([
    {id:'slime-1',position:{x:16,y:16}},{id:'slime-2',position:{x:15,y:16}},{id:'slime-3',position:{x:14,y:16}},
  ]);
});
it('preserves old placements and excludes the hero and start',()=>{
  expect(placeSlimes(makeWorld(),[{id:'slime-1',position:{x:4,y:3}}],[{x:5,y:3}],()=>0)).toEqual([
    {id:'slime-1',position:{x:4,y:3}},{id:'slime-2',position:{x:6,y:3}},{id:'slime-3',position:{x:7,y:3}},
  ]);
  expect(()=>placeSlimes({layout:'woodland',width:7,height:7},[],[],()=>0)).toThrow(RangeError);
});
it.each([[20,20],[20,40],[40,20],[40,40]])('placements are traversable and reachable in %sx%s',(width,height)=>{
  const geometry={layout:'woodland' as const,width,height};const positions=placeSlimes(geometry,[],[],()=>.5);
  const seen=new Set<string>(), queue=[{x:3,y:3}];
  while(queue.length){const p=queue.shift()!,key=`${p.x},${p.y}`;if(seen.has(key))continue;seen.add(key);for(const d of ['up','down','left','right'] as const)queue.push(move(geometry,p,d));}
  expect(new Set(positions.map(s=>s.id)).size).toBe(3);expect(new Set(positions.map(s=>`${s.position.x},${s.position.y}`)).size).toBe(3);
  for(const s of positions){expect(isWalkable(geometry,s.position)).toBe(true);expect(s.position).not.toEqual({x:3,y:3});expect(seen.has(`${s.position.x},${s.position.y}`)).toBe(true);}
});
it('looks up and counts living encounters independently',()=>{
 const cp=makeCheckpoint();expect(getLivingEncounterAt(cp,{x:8,y:8})?.id).toBe('slime-2');expect(getRemainingSlimeCount(cp)).toBe(3);
 const partial={...cp,completedEncounterIds:['slime-2' as const]};expect(getLivingEncounterAt(partial,{x:8,y:8})).toBeNull();expect(getRemainingSlimeCount(partial)).toBe(2);
});
