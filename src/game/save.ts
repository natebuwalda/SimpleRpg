import type {Checkpoint} from './types';
import {decodeRecord,parsePlacedProgress,parsePlacements} from './save-validation';
import {deriveStats,isValidCharacter} from './character';
import {getSaveKeys} from './save-keys';
import {MAX_CHARACTERS,type LegacyRosterVersion,type RosterSave,type RosterObservation} from './roster';
import {createProgression,effectiveCharacter,hasSupportedCombatPools,parseProgression} from './progression';
import { FIRST_SLIME_LEVEL, isSlimeLevel } from './slime';
export const ROSTER_KEY=getSaveKeys(import.meta.env.BASE_URL).current;
export function parseCheckpoint(raw: string | null): Checkpoint | null {
  return decodeCheckpoint(raw, 9);
}
function decodeCheckpoint(raw: string | null, version: number): Checkpoint | null {
  const v = decodeRecord(raw);
  if (!v || v.version !== version || !v.character || typeof v.character !== 'object' || Array.isArray(v.character)) return null;
  const stored = version < 8 ? { ...v.character, classId: 'warrior' } : v.character;
  if (!isValidCharacter(stored) || (version < 9 && stored.classId === 'rogue')) return null;
  const {name,classId,attributes:a,skills:s}=stored;
  const character={name,classId,attributes:{prowess:a.prowess,cunning:a.cunning,resistance:a.resistance},skills:{combat:s.combat,subterfuge:s.subterfuge,lore:s.lore}};
  const progression = version === 5 ? createProgression() : parseProgression(v.progression);
  const slimeLevel = version >= 7 ? v.slimeLevel : FIRST_SLIME_LEVEL;
  if (!progression || !isSlimeLevel(slimeLevel)) return null;
  const hero = effectiveCharacter(character, progression);
  if (!hasSupportedCombatPools(hero)) return null;
  const progress = parsePlacedProgress(v, deriveStats(hero).maxHp);
  if (!progress) return null;
  const initialSlimes = parsePlacements(progress.world, version === 5 ? progress.world.slimes : v.initialSlimes);
  return initialSlimes ? { ...progress, version: 9, character, progression, initialSlimes, slimeLevel } : null;
}

export function parseRoster(raw:string|null):RosterSave|null{
  return decodeRoster(raw, 10);
}

export function upgradeRoster(raw: string | null): RosterSave | null {
  const version = decodeRecord(raw)?.version;
  return version === 6 || version === 7 || version === 8 || version === 9 ? decodeRoster(raw, version) : null;
}

function decodeRoster(raw: string | null, version: LegacyRosterVersion | RosterSave['version']): RosterSave | null {
  const value=decodeRecord(raw);
  if(!value||value.version!==version||!Array.isArray(value.slots)||value.slots.length>MAX_CHARACTERS)return null;
  const ids=new Set<string>(),slots:RosterSave['slots']=[];
  for(const item of value.slots){
    if(!item||typeof item!=='object'||typeof item.id!=='string'||! /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(item.id)||ids.has(item.id)
      ||!Number.isSafeInteger(item.revision)||item.revision<1||!['active','defeated'].includes(item.status))return null;
    const checkpoint=decodeCheckpoint(JSON.stringify(item.checkpoint), version - 1);if(!checkpoint)return null;
    ids.add(item.id);slots.push({id:item.id,revision:item.revision,status:item.status,checkpoint});
  }
  return {version:10,slots};
}
export function loadRoster(storage:Pick<Storage,'getItem'>,key=ROSTER_KEY):RosterObservation{
  try {
    const raw = storage.getItem(key);
    if (raw !== null) {
      const roster = parseRoster(raw);
      return { status: roster ? 'ready' : 'invalid', raw, roster };
    }
    if (key.endsWith('.v10')) {
      for (const legacy of [9, 8, 7, 6] as const) {
        const previous = storage.getItem(key.replace(/\.v10$/, `.v${legacy}`));
        if (previous !== null) {
          const roster = decodeRoster(previous, legacy);
          return { status: roster ? 'ready' : 'invalid', raw: previous, roster, legacy };
        }
      }
    }
    return { status: 'empty', raw, roster: { version: 10, slots: [] } };
  }catch{return {status:'unavailable',raw:null,roster:null};}
}
export function writeRoster(storage:Pick<Storage,'setItem'>,save:RosterSave,key=ROSTER_KEY):boolean{
  try{const canonical=parseRoster(JSON.stringify(save));if(!canonical)return false;storage.setItem(key,JSON.stringify(canonical));return true;}catch{return false;}
}
