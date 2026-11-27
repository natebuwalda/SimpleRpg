import {describe,it,expect,vi} from 'vitest';
import {parseRoster,loadRoster,writeRoster} from '../src/game/save';
import {getSaveKeys} from '../src/game/save-keys';
import {makeCheckpoint} from './fixtures';
export const slot=(i=1)=>({id:`00000000-0000-4000-8000-${String(i).padStart(12,'0')}`,revision:1,status:'active' as const,checkpoint:makeCheckpoint()});
export const roster=(n=1)=>({version:10 as const,slots:Array.from({length:n},(_,i)=>slot(i+1))});
describe('combined roster',()=>{
 it('accepts zero or ten independent slots and duplicate names',()=>{
  for(const n of [0,10])expect(parseRoster(JSON.stringify(roster(n)))).toEqual(roster(n));
 });
 it.each(['capacity','duplicate','id','revision','overflow','status','budget','name','health','world','slimes','position','completion'])('rejects whole document for %s',kind=>{
  const r:any=roster();const s=r.slots[0],c=s.checkpoint;
  switch(kind){case 'capacity':r.slots=roster(11).slots;break;case 'duplicate':r.slots.push(structuredClone(s));break;case 'id':s.id='Rowan';break;case 'revision':s.revision=0;break;case 'overflow':s.revision=Number.MAX_SAFE_INTEGER+1;break;case 'status':s.status='battle';break;case 'budget':c.character.skills.combat=5;break;case 'name':c.character.name=' ';break;case 'health':c.hp=100;break;case 'world':c.world.width=400;break;case 'slimes':c.world.slimes[1]=c.world.slimes[0];break;case 'position':c.position={x:0,y:0};break;case 'completion':c.completedEncounterIds=['bad'];}
  expect(parseRoster(JSON.stringify(r))).toBeNull();
 });
 it('returns canonical independent snapshots',()=>{const input:any=roster();input.extra='drop';const parsed=parseRoster(JSON.stringify(input))!;expect(parsed).toEqual(roster());parsed.slots[0].checkpoint.character.name='changed';expect(input.slots[0].checkpoint.character.name).not.toBe('changed');});
 it('ignores keys older than v6 and never falls back after invalid data',()=>{
  const storage={getItem:vi.fn((key:string)=>/\.v(?:[6789]|10)$/.test(key)?null:JSON.stringify(makeCheckpoint()))};
  expect(loadRoster(storage).status).toBe('empty');expect(storage.getItem.mock.calls).toEqual([['simple-rpg.save.v10'],['simple-rpg.save.v9'],['simple-rpg.save.v8'],['simple-rpg.save.v7'],['simple-rpg.save.v6']]);
  storage.getItem.mockImplementation(()=>'{');expect(loadRoster(storage).status).toBe('invalid');
  storage.getItem.mockImplementation(()=>{throw Error()});expect(loadRoster(storage).status).toBe('unavailable');
 });
 it('writes validated combined data only and isolates acceptance',()=>{
  expect(getSaveKeys('/SimpleRpg/').current).toBe('simple-rpg.save.v10');expect(getSaveKeys('/SimpleRpg/acceptance/').current).toBe('simple-rpg.acceptance.save.v10');
  const storage={setItem:vi.fn()};expect(writeRoster(storage,roster())).toBe(true);expect(storage.setItem).toHaveBeenCalledTimes(1);
  expect(writeRoster(storage,roster(11))).toBe(false);expect(storage.setItem).toHaveBeenCalledTimes(1);
 });
});
