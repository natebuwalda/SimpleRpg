import { expect, it } from 'vitest';
import { loadSave, saveGame } from '../src/game/save';
import { parseOlderSave as migrateLegacySave } from '../src/game/legacy-save';
import { makeCheckpoint } from './fixtures';
const parseSave = (value:string|null) => { try {return JSON.parse(value ?? 'null')?.version === 2 ? migrateLegacySave(value) : null;} catch {return null;} };
const world = {version:1 as const,layout:'woodland' as const,width:20,height:40};
const checkpoint = {version:2 as const,world,position:{x:3,y:3},hp:12,completedEncounterIds:[] as string[]};
const legacy = {version:1,position:{x:5,y:4},hp:10,completedEncounterIds:[] as string[]};
const raw = (v:unknown) => JSON.stringify(v);
it('round trips a complete world', () => {
 let value:string|null=null;
 const modern=makeCheckpoint();
 expect(saveGame({setItem(key,v){expect(key).toBe('simple-rpg.save.v5');value=v;}},modern)).toBe(true);
 expect(loadSave({getItem:()=>value})).toEqual({checkpoint:modern,status:'ready',migrated:false,source:null});
});
it('translates legacy hero and landmarks without losing progress', () => {
 expect(migrateLegacySave(raw(legacy))).toEqual({version:2,world:{version:1,layout:'legacy-expanded',width:20,height:20},position:{x:7,y:6},hp:10,completedEncounterIds:[]});
 expect(migrateLegacySave(raw({...legacy,position:{x:6,y:4}}))).toBeNull();
 expect(migrateLegacySave(raw({...legacy,position:{x:6,y:4},completedEncounterIds:['slime-1']}))).toMatchObject({position:{x:8,y:6},hp:10,completedEncounterIds:['slime-1']});
});
it.each([null,'broken','null','[]','7','{}', ...[0,13,1.5,'12',null].map(hp=>raw({...checkpoint,hp})), ...[{x:2,y:3},{x:17,y:3},{x:6,y:5},{x:3.5,y:3},{x:15,y:35},null].map(position=>raw({...checkpoint,position})), ...[['unknown'],['slime-1','slime-1'],[5],null].map(completedEncounterIds=>raw({...checkpoint,completedEncounterIds})), ...[{...world,width:19},{...world,height:41},{...world,width:20.5},{...world,version:2},{...world,layout:'unknown'},{...world,layout:'legacy-expanded'},null].map(world=>raw({...checkpoint,world})),raw({...checkpoint,version:1})])('rejects malformed v2 %s', value=>expect(parseSave(value)).toBeNull());
it.each([...[0,13,1.5,'12',null].map(hp=>({...legacy,hp})), ...[{x:0,y:2},{x:9,y:2},{x:4,y:3},{x:2.5,y:2},null].map(position=>({...legacy,position})), ...[['unknown'],['slime-1','slime-1'],[5],null].map(completedEncounterIds=>({...legacy,completedEncounterIds})),{...legacy,version:2}])('validates legacy before translation %o', value=>expect(migrateLegacySave(raw(value))).toBeNull());
it('allows only cleared encounter tiles',()=>{
 const completed={...checkpoint,position:{x:15,y:35},completedEncounterIds:['slime-1']};
 expect(parseSave(raw(completed))).toEqual(completed);
});
it('prefers v2 and never resurrects stale v1',()=>{
 const reads:string[]=[];
 expect(loadSave({getItem(key){reads.push(key);return (key.endsWith('v5')||key.endsWith('v4')||key.endsWith('v3'))?null:key.endsWith('v2')?raw(checkpoint):raw(legacy);}},()=>0)).toMatchObject({checkpoint:{position:checkpoint.position},status:'ready',migrated:true});
 expect(reads).toEqual(['simple-rpg.save.v5','simple-rpg.save.v4','simple-rpg.save.v3','simple-rpg.save.v2']);
 expect(loadSave({getItem:key=>(key.endsWith('v5')||key.endsWith('v4')||key.endsWith('v3'))?null:key.endsWith('v2')?'broken':raw(legacy)})).toMatchObject({checkpoint:null,status:'invalid',migrated:false});
});
it('falls back only when v2 absent',()=>{
 expect(loadSave({getItem:key=>key.endsWith('v1')?raw(legacy):null})).toMatchObject({status:'ready',migrated:true,checkpoint:{position:{x:7,y:6}}});
 expect(loadSave({getItem:()=>null})).toEqual({checkpoint:null,status:'empty',migrated:false,source:null});
 expect(loadSave({getItem:key=>key.endsWith('v1')?'broken':null})).toMatchObject({checkpoint:null,status:'invalid',migrated:false});
});
it('guards storage reads and writes',()=>{
 expect(loadSave({getItem(){throw Error('blocked');}})).toEqual({checkpoint:null,status:'unavailable',migrated:false,source:null});
 expect(saveGame({setItem(){throw Error('quota');}},makeCheckpoint())).toBe(false);
 let writes=0; expect(saveGame({setItem(){writes++;}},{...makeCheckpoint(),hp:0})).toBe(false); expect(writes).toBe(0);
});
