import type {Checkpoint} from './types';
import {decodeRecord,parsePlacedProgress,parsePlacements} from './save-validation';
import {deriveStats,isValidCharacter} from './character';
import {getSaveKeys} from './save-keys';
import {MAX_CHARACTERS,type RosterSave,type RosterObservation} from './roster';
import {createProgression,effectiveCharacter,hasSupportedMeleePools,parseProgression} from './progression';
export const ROSTER_KEY=getSaveKeys(import.meta.env.BASE_URL).current;
export function parseCheckpoint(raw: string | null): Checkpoint | null {
  return decodeCheckpoint(raw, false);
}
function decodeCheckpoint(raw: string | null, legacy: boolean): Checkpoint | null {
  const v = decodeRecord(raw);
  if (!v || v.version !== (legacy ? 5 : 6) || !isValidCharacter(v.character)) return null;
  const {name,attributes:a,skills:s}=v.character;
  const character={name,attributes:{prowess:a.prowess,cunning:a.cunning,resistance:a.resistance},skills:{combat:s.combat,subterfuge:s.subterfuge,lore:s.lore}};
  const progression = legacy ? createProgression() : parseProgression(v.progression);
  if (!progression) return null;
  const hero = effectiveCharacter(character, progression);
  if (!hasSupportedMeleePools(hero)) return null;
  const progress = parsePlacedProgress(v, deriveStats(hero).maxHp);
  if (!progress) return null;
  const initialSlimes = parsePlacements(progress.world, legacy ? progress.world.slimes : v.initialSlimes);
  return initialSlimes ? { ...progress, version: 6, character, progression, initialSlimes } : null;
}

export function parseRoster(raw:string|null):RosterSave|null{
  return decodeRoster(raw, false);
}

export function upgradeRoster(raw: string | null): RosterSave | null {
  return decodeRoster(raw, true);
}

function decodeRoster(raw: string | null, legacy: boolean): RosterSave | null {
  const value=decodeRecord(raw);
  if(!value||value.version!==(legacy ? 6 : 7)||!Array.isArray(value.slots)||value.slots.length>MAX_CHARACTERS)return null;
  const ids=new Set<string>(),slots:RosterSave['slots']=[];
  for(const item of value.slots){
    if(!item||typeof item!=='object'||typeof item.id!=='string'||! /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(item.id)||ids.has(item.id)
      ||!Number.isSafeInteger(item.revision)||item.revision<1||!['active','defeated'].includes(item.status))return null;
    const checkpoint=decodeCheckpoint(JSON.stringify(item.checkpoint), legacy);if(!checkpoint)return null;
    ids.add(item.id);slots.push({id:item.id,revision:item.revision,status:item.status,checkpoint});
  }
  return {version:7,slots};
}
export function loadRoster(storage:Pick<Storage,'getItem'>,key=ROSTER_KEY):RosterObservation{
  try {
    const raw = storage.getItem(key);
    if (raw !== null) {
      const roster = parseRoster(raw);
      return { status: roster ? 'ready' : 'invalid', raw, roster };
    }
    if (key.endsWith('.v7')) {
      const previous = storage.getItem(key.replace(/\.v7$/, '.v6'));
      if (previous !== null) {
        const roster = upgradeRoster(previous);
        return { status: roster ? 'ready' : 'invalid', raw: previous, roster, legacy: true };
      }
    }
    return { status: 'empty', raw, roster: { version: 7, slots: [] } };
  }catch{return {status:'unavailable',raw:null,roster:null};}
}
export function writeRoster(storage:Pick<Storage,'setItem'>,save:RosterSave,key=ROSTER_KEY):boolean{
  try{const canonical=parseRoster(JSON.stringify(save));if(!canonical)return false;storage.setItem(key,JSON.stringify(canonical));return true;}catch{return false;}
}
