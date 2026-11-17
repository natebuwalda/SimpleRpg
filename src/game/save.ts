import { SLIME_IDS, type Checkpoint, type Position, type WorldDefinition, type SlimePlacement } from './types';
import { getLandmarks, getLivingEncounterAt, isWalkable, placeSlimes } from './world';
import { decodeRecord, validGeometry, validProgress } from './save-validation';
import { parseOlderSave } from './legacy-save';

export const SAVE_KEY = 'simple-rpg.save.v3';
export const PREVIOUS_SAVE_KEY = 'simple-rpg.save.v2';
export const LEGACY_SAVE_KEY = 'simple-rpg.save.v1';
export type MigrationSource = { key: string; raw: string };
export type MigrationResolver = (source: MigrationSource, create: () => Checkpoint | null) => Checkpoint | null;
export function parseSave(raw: string | null): Checkpoint | null {
  const v = decodeRecord(raw);
  if (!v || v.version !== 3 || !validProgress(v, SLIME_IDS) || !validGeometry(v.world) || !v.position || typeof v.position !== 'object') return null;
  const world = v.world as WorldDefinition;
  if (world.version !== 2 || !Array.isArray(world.slimes) || world.slimes.length !== SLIME_IDS.length) return null;
  const spawn = getLandmarks(world).spawn;
  const ids = new Set<string>(), tiles = new Set<string>();
  const slimes: SlimePlacement[] = [];
  for (const slime of world.slimes) {
    if (!slime || !SLIME_IDS.includes(slime.id) || ids.has(slime.id) || !slime.position || typeof slime.position !== 'object' || !isWalkable(world, slime.position)) return null;
    const p = slime.position, key = `${p.x},${p.y}`;
    if (tiles.has(key) || (p.x === spawn.x && p.y === spawn.y)) return null;
    ids.add(slime.id); tiles.add(key); slimes.push({id:slime.id,position:{x:p.x,y:p.y}});
  }
  const position = v.position as Position;
  if (!isWalkable(world, position)) return null;
  const checkpoint: Checkpoint = {version:3,world:{version:2,layout:world.layout,width:world.width,height:world.height,slimes},position:{x:position.x,y:position.y},hp:v.hp as number,completedEncounterIds:[...v.completedEncounterIds as Checkpoint['completedEncounterIds']]};
  return getLivingEncounterAt(checkpoint, position) ? null : checkpoint;
}
export function migrateOlderSave(raw: string | null, random: () => number = Math.random): Checkpoint | null {
  const old = parseOlderSave(raw);
  if (!old) return null;
  const slimes = placeSlimes(old.world, [{id:'slime-1',position:getLandmarks(old.world).encounter}], [old.position], random);
  return {...old,version:3,world:{...old.world,version:2,slimes}};
}
export function loadSave(storage: Pick<Storage, 'getItem'>, random: () => number = Math.random, resolveMigration: MigrationResolver = (_source, create) => create()): { checkpoint: Checkpoint | null; status: 'ready' | 'empty' | 'invalid' | 'unavailable'; migrated: boolean; source: MigrationSource | null } {
  try {
    for (const key of [SAVE_KEY, PREVIOUS_SAVE_KEY, LEGACY_SAVE_KEY]) {
      const raw = storage.getItem(key);
      if (raw === null) continue;
      const source = key === SAVE_KEY ? null : {key,raw};
      const checkpoint = source ? resolveMigration(source, () => migrateOlderSave(raw, random)) : parseSave(raw);
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
