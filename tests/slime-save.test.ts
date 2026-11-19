import {expect,it} from 'vitest';
import {parseCheckpoint as parseSave} from '../src/game/save';
import {makeCheckpoint} from './fixtures';
const cp=makeCheckpoint(),raw=JSON.stringify;
it.each([[],null,[cp.world.slimes[0]], [...cp.world.slimes.slice(0,2),{id:'unknown',position:{x:5,y:3}}], [...cp.world.slimes.slice(0,2),{id:'slime-2',position:{x:5,y:3}}], ...[{x:3,y:3},{x:2,y:3},{x:6,y:5},{x:4.5,y:3},{x:8,y:8},null].map(position=>[...cp.world.slimes.slice(0,2),{id:'slime-3',position}])])('rejects invalid slime placement %j',slimes=>expect(parseSave(raw({...cp,world:{...cp.world,slimes}}))).toBeNull());
it('rejects invalid progress and permits standing only on a defeated slime',()=>{
 for(const completedEncounterIds of [['unknown'],['slime-2','slime-2'],[1],null])expect(parseSave(raw({...cp,completedEncounterIds}))).toBeNull();
 expect(parseSave(raw({...cp,position:{x:8,y:8}}))).toBeNull();expect(parseSave(raw({...cp,position:{x:8,y:8},completedEncounterIds:['slime-2']}))).not.toBeNull();
});
it.each([
 {...cp,version:2}, {...cp,hp:0}, {...cp,hp:13}, {...cp,hp:1.5}, {...cp,hp:'12'},
 {...cp,world:{...cp.world,version:1}}, {...cp,world:{...cp.world,width:19}}, {...cp,world:{...cp.world,height:41}},
 {...cp,world:{...cp.world,width:20.5}}, {...cp,world:{...cp.world,layout:'unknown'}},
 {...cp,position:{x:6,y:5}}, {...cp,position:{x:2,y:3}}, {...cp,position:{x:3.5,y:3}},
])('rejects invalid current checkpoint state %j',value=>expect(parseSave(raw(value))).toBeNull());
