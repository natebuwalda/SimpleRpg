import {expect,it} from 'vitest';
import {parseSave,loadSave,saveGame,migrateOlderSave} from '../src/game/save';
import {makeCheckpoint} from './fixtures';
const cp=makeCheckpoint(), raw=JSON.stringify;
const old={version:2,world:{version:1,layout:'woodland',width:20,height:20},position:{x:14,y:15},hp:10,completedEncounterIds:[]};
const v1={version:1,position:{x:5,y:4},hp:10,completedEncounterIds:[]};
it('round trips a v3 world with exact placements and partial completion',()=>{
 const partial={...cp,completedEncounterIds:['slime-2' as const]};let value:string|null=null;
 expect(saveGame({setItem(key,v){expect(key).toBe('simple-rpg.save.v4');value=v;}},partial)).toBe(true);
 expect(parseSave(value)).toEqual(partial);
 expect(loadSave({getItem:()=>value})).toEqual({checkpoint:partial,status:'ready',migrated:false,source:null});
});
it('keeps the v2 original slime, progress and geometry and adds two',()=>{
 const done=migrateOlderSave(raw({...old,completedEncounterIds:['slime-1']}),()=>0)!;
 expect(done).toEqual({version:4,character:cp.character,world:{...old.world,version:2,slimes:[{id:'slime-1',position:{x:15,y:15}},{id:'slime-2',position:{x:4,y:3}},{id:'slime-3',position:{x:5,y:3}}]},position:old.position,hp:5,completedEncounterIds:['slime-1']});
 expect(parseSave(raw(done))).toEqual(done);
 const underHero=migrateOlderSave(raw({...old,position:{x:4,y:3}}),()=>0)!;
 expect(underHero.world.slimes.some(s=>s.position.x===4&&s.position.y===3)).toBe(false);
});
it('translates v1 once and preserves a defeated slime beneath the hero',()=>{
 const migrated=migrateOlderSave(raw(v1),()=>0)!;
 expect(migrated).toMatchObject({version:4,position:{x:7,y:6},hp:5,world:{version:2,layout:'legacy-expanded',width:20,height:20,slimes:[{id:'slime-1',position:{x:8,y:6}},{id:'slime-2',position:{x:3,y:3}},{id:'slime-3',position:{x:4,y:3}}]}});
 const done=migrateOlderSave(raw({...v1,position:{x:6,y:4},completedEncounterIds:['slime-1']}),()=>0)!;
 expect(done.position).toEqual({x:8,y:6});expect(parseSave(raw(done))).toEqual(done);
});
it.each([[],null,[cp.world.slimes[0]], [...cp.world.slimes.slice(0,2),{id:'unknown',position:{x:5,y:3}}], [...cp.world.slimes.slice(0,2),{id:'slime-2',position:{x:5,y:3}}], ...[{x:3,y:3},{x:2,y:3},{x:6,y:5},{x:4.5,y:3},{x:8,y:8},null].map(position=>[...cp.world.slimes.slice(0,2),{id:'slime-3',position}])])('rejects invalid slime placement %j',slimes=>expect(parseSave(raw({...cp,world:{...cp.world,slimes}}))).toBeNull());
it('rejects invalid progress and permits standing only on a defeated slime',()=>{
 for(const completedEncounterIds of [['unknown'],['slime-2','slime-2'],[1],null])expect(parseSave(raw({...cp,completedEncounterIds}))).toBeNull();
 expect(parseSave(raw({...cp,position:{x:8,y:8}}))).toBeNull();expect(parseSave(raw({...cp,position:{x:8,y:8},completedEncounterIds:['slime-2']}))).not.toBeNull();
});
it('never falls back past a present invalid newer save',()=>{
 const reads:string[]=[];expect(loadSave({getItem(key){reads.push(key);return raw(cp);}}).checkpoint).toEqual(cp);expect(reads).toEqual(['simple-rpg.save.v4']);
 expect(loadSave({getItem:key=>key.endsWith('v4')?'bad':raw(old)})).toMatchObject({status:'invalid',checkpoint:null,migrated:false});
 expect(loadSave({getItem:key=>(key.endsWith('v4')||key.endsWith('v3'))?null:key.endsWith('v2')?'bad':raw(v1)})).toMatchObject({status:'invalid',checkpoint:null});
 expect(loadSave({getItem:key=>key.endsWith('v2')?raw(old):null},()=>0)).toMatchObject({status:'ready',migrated:true,checkpoint:{position:old.position}});
 expect(loadSave({getItem:key=>key.endsWith('v1')?raw(v1):null},()=>0)).toMatchObject({status:'ready',migrated:true,checkpoint:{position:{x:7,y:6}}});
});
it('passes exact source contents to the migration resolver',()=>{
 const source={key:'simple-rpg.save.v2',raw:raw(old)};let calls=0;
 const result=loadSave({getItem:key=>key===source.key?source.raw:null},()=>0,(actual,create)=>{expect(actual).toEqual(source);calls++;return create();});
 expect(result.source).toEqual(source);expect(result.checkpoint?.world.slimes).toHaveLength(3);expect(calls).toBe(1);
});
it('does not reinterpret an older key containing the wrong schema version',()=>{
 expect(loadSave({getItem:key=>key.endsWith('v2')?raw(v1):null},()=>0)).toMatchObject({status:'invalid',checkpoint:null});
 expect(loadSave({getItem:key=>key.endsWith('v1')?raw(old):null},()=>0)).toMatchObject({status:'invalid',checkpoint:null});
});
it.each([
 {...cp,version:2}, {...cp,hp:0}, {...cp,hp:13}, {...cp,hp:1.5}, {...cp,hp:'12'},
 {...cp,world:{...cp.world,version:1}}, {...cp,world:{...cp.world,width:19}}, {...cp,world:{...cp.world,height:41}},
 {...cp,world:{...cp.world,width:20.5}}, {...cp,world:{...cp.world,layout:'unknown'}},
 {...cp,position:{x:6,y:5}}, {...cp,position:{x:2,y:3}}, {...cp,position:{x:3.5,y:3}},
])('rejects invalid current checkpoint state %j',value=>expect(parseSave(raw(value))).toBeNull());
