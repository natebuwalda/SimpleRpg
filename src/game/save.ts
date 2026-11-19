import type { Checkpoint } from './types';
import { getLandmarks, placeSlimes } from './world';
import { decodeRecord } from './save-validation';
import { parseOlderSave, parsePlacedProgress, parseV3Save, parseV4Save } from './legacy-save';
import { createStarterCharacter, deriveStats, isValidCharacter } from './character';
import { getSaveKeys } from './save-keys';
import {MAX_CHARACTERS,type RosterSave,type RosterObservation} from './roster';

const keys = getSaveKeys(import.meta.env.BASE_URL);
export const ROSTER_KEY = keys.current;
// Temporary single-adventure adapter, removed when the application adopts the roster.
export const SAVE_KEY = keys.current.replace(/v6$/,'v5');
export const V4_SAVE_KEY = keys.v4;
export const V3_SAVE_KEY = keys.v3;
export const PREVIOUS_SAVE_KEY = keys.v2;
export const LEGACY_SAVE_KEY = keys.v1;
export type MigrationSource = { key: string; raw: string };
export type MigrationResolver = (source: MigrationSource, create: () => Checkpoint | null) => Checkpoint | null;
export function checkpointSignature(checkpoint:Checkpoint|null):string {
  return JSON.stringify(checkpoint ? parseSave(JSON.stringify(checkpoint)) : null);
}
export function parseSave(raw: string | null): Checkpoint | null {
  const v = decodeRecord(raw);
  if (!v || v.version !== 5 || !isValidCharacter(v.character)) return null;
  const {name,attributes:a,skills:s}=v.character;
  const character={name,attributes:{prowess:a.prowess,cunning:a.cunning,resistance:a.resistance},skills:{combat:s.combat,subterfuge:s.subterfuge,lore:s.lore}};
  const progress = parsePlacedProgress(v, deriveStats(character).maxHp);
  return progress ? { ...progress, version: 5, character } : null;
}
export function migrateOlderSave(raw: string | null, random: () => number = Math.random): Checkpoint | null {
  const character = createStarterCharacter();
  const v4=parseV4Save(raw);
  if(v4)return {...v4,version:5,character:{...v4.character,name:'Adventurer'}};
  const placed = parseV3Save(raw);
  if (placed) return { ...placed, version: 5, character, hp: Math.min(placed.hp, deriveStats(character).maxHp) };
  const old = parseOlderSave(raw);
  if (!old) return null;
  const slimes = placeSlimes(old.world, [{id:'slime-1',position:getLandmarks(old.world).encounter}], [old.position], random);
  return {...old,version:5,character,hp:Math.min(old.hp,deriveStats(character).maxHp),world:{...old.world,version:2,slimes}};
}
export function loadSave(storage: Pick<Storage, 'getItem'>, random: () => number = Math.random, resolveMigration: MigrationResolver = (_source, create) => create()): { checkpoint: Checkpoint | null; status: 'ready' | 'empty' | 'invalid' | 'unavailable'; migrated: boolean; source: MigrationSource | null } {
  try {
    for (const [key, expectedVersion] of [[SAVE_KEY,5],[V4_SAVE_KEY,4],[V3_SAVE_KEY,3],[PREVIOUS_SAVE_KEY,2],[LEGACY_SAVE_KEY,1]] as const) {
      const raw = storage.getItem(key);
      if (raw === null) continue;
      const source = key === SAVE_KEY ? null : {key,raw};
      const checkpoint = source ? resolveMigration(source, () => decodeRecord(raw)?.version === expectedVersion ? migrateOlderSave(raw, random) : null) : parseSave(raw);
      return {checkpoint,status:checkpoint?'ready':'invalid',migrated:source !== null && checkpoint !== null,source};
    }
    return {checkpoint:null,status:'empty',migrated:false,source:null};
  } catch { return { checkpoint: null, status: 'unavailable', migrated: false, source:null }; }
}
export function saveGame(storage: Pick<Storage, 'setItem'>, checkpoint: Checkpoint): boolean {
  try {
    const raw = JSON.stringify(checkpoint);
    if (!parseSave(raw)) return false;
    storage.setItem(SAVE_KEY, raw);
    return true;
  } catch { return false; }
}

export const parseCheckpoint=parseSave;
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
