import type {Checkpoint} from './types';
import {decodeRecord,parsePlacedProgress} from './save-validation';
import {deriveStats,isValidCharacter} from './character';
import {getSaveKeys} from './save-keys';
import {MAX_CHARACTERS,type RosterSave,type RosterObservation} from './roster';
export const ROSTER_KEY=getSaveKeys(import.meta.env.BASE_URL).current;
export function parseCheckpoint(raw: string | null): Checkpoint | null {
  const v = decodeRecord(raw);
  if (!v || v.version !== 5 || !isValidCharacter(v.character)) return null;
  const {name,attributes:a,skills:s}=v.character;
  const character={name,attributes:{prowess:a.prowess,cunning:a.cunning,resistance:a.resistance},skills:{combat:s.combat,subterfuge:s.subterfuge,lore:s.lore}};
  const progress = parsePlacedProgress(v, deriveStats(character).maxHp);
  return progress ? { ...progress, version: 5, character } : null;
}

export function parseRoster(raw:string|null):RosterSave|null{
  const value=decodeRecord(raw);
  if(!value||value.version!==6||!Array.isArray(value.slots)||value.slots.length>MAX_CHARACTERS)return null;
  const ids=new Set<string>(),slots:RosterSave['slots']=[];
  for(const item of value.slots){
    if(!item||typeof item!=='object'||typeof item.id!=='string'||! /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(item.id)||ids.has(item.id)
      ||!Number.isSafeInteger(item.revision)||item.revision<1||!['active','defeated'].includes(item.status))return null;
    const checkpoint=parseCheckpoint(JSON.stringify(item.checkpoint));if(!checkpoint)return null;
    ids.add(item.id);slots.push({id:item.id,revision:item.revision,status:item.status,checkpoint});
  }
  return {version:6,slots};
}
export function loadRoster(storage:Pick<Storage,'getItem'>,key=ROSTER_KEY):RosterObservation{
  try{const raw=storage.getItem(key);if(raw===null)return {status:'empty',raw,roster:{version:6,slots:[]}};
    const roster=parseRoster(raw);return {status:roster?'ready':'invalid',raw,roster};
  }catch{return {status:'unavailable',raw:null,roster:null};}
}
export function writeRoster(storage:Pick<Storage,'setItem'>,save:RosterSave,key=ROSTER_KEY):boolean{
  try{const canonical=parseRoster(JSON.stringify(save));if(!canonical)return false;storage.setItem(key,JSON.stringify(canonical));return true;}catch{return false;}
}
