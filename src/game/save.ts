import type { Checkpoint, Position, WorldDefinition } from './types';
import { atEncounter, ENCOUNTER_ID, isWalkable, MAX_HP } from './world';

export const SAVE_KEY = 'simple-rpg.save.v2';
export const LEGACY_SAVE_KEY = 'simple-rpg.save.v1';
function validProgress(v: Record<string, unknown>): boolean {
  return typeof v.hp === 'number' && Number.isInteger(v.hp) && v.hp >= 1 && v.hp <= MAX_HP
    && Array.isArray(v.completedEncounterIds) && v.completedEncounterIds.every(id => id === ENCOUNTER_ID)
    && new Set(v.completedEncounterIds).size === v.completedEncounterIds.length;
}
function decode(raw: string | null): Record<string, unknown> | null {
  try { const v: unknown = JSON.parse(raw ?? 'null'); return v && typeof v === 'object' && !Array.isArray(v) ? v as Record<string, unknown> : null; } catch { return null; }
}
export function parseSave(raw: string | null): Checkpoint | null {
  const v = decode(raw);
  if (!v || v.version !== 2 || !validProgress(v) || !v.world || typeof v.world !== 'object' || !v.position || typeof v.position !== 'object') return null;
  const world = v.world as WorldDefinition;
  if (world.version !== 1 || !['woodland', 'legacy-expanded'].includes(world.layout)
    || !Number.isInteger(world.width) || !Number.isInteger(world.height) || world.width < 20 || world.width > 40 || world.height < 20 || world.height > 40
    || (world.layout === 'legacy-expanded' && (world.width !== 20 || world.height !== 20))) return null;
  const position = v.position as Position;
  const ids = v.completedEncounterIds as string[];
  if (!isWalkable(world, position) || (atEncounter(world, position) && !ids.includes(ENCOUNTER_ID))) return null;
  return { version: 2, world: { version: 1, layout: world.layout, width: world.width, height: world.height }, position: { x: position.x, y: position.y }, hp: v.hp as number, completedEncounterIds: [...ids] };
}
export function migrateLegacySave(raw: string | null): Checkpoint | null {
  const v = decode(raw);
  if (!v || v.version !== 1 || !validProgress(v) || !v.position || typeof v.position !== 'object') return null;
  const { x, y } = v.position as Position;
  const ids = v.completedEncounterIds as string[];
  if (!Number.isInteger(x) || !Number.isInteger(y) || x < 1 || y < 1 || x > 8 || y > 8 || (x === 4 && y === 3) || (x === 6 && y === 4 && !ids.includes(ENCOUNTER_ID))) return null;
  return { version: 2, world: { version: 1, layout: 'legacy-expanded', width: 20, height: 20 }, position: { x: x + 2, y: y + 2 }, hp: v.hp as number, completedEncounterIds: [...ids] };
}
export function loadSave(storage: Pick<Storage, 'getItem'>): { checkpoint: Checkpoint | null; status: 'ready' | 'empty' | 'invalid' | 'unavailable'; migrated: boolean } {
  try {
    const current = storage.getItem(SAVE_KEY);
    const raw = current === null ? storage.getItem(LEGACY_SAVE_KEY) : current;
    const checkpoint = current === null ? migrateLegacySave(raw) : parseSave(raw);
    return { checkpoint, status: raw === null ? 'empty' : checkpoint ? 'ready' : 'invalid', migrated: current === null && checkpoint !== null };
  } catch { return { checkpoint: null, status: 'unavailable', migrated: false }; }
}
export function saveGame(storage: Pick<Storage, 'setItem'>, checkpoint: Checkpoint): boolean {
  try {
    const raw = JSON.stringify(checkpoint);
    if (!parseSave(raw)) return false;
    storage.setItem(SAVE_KEY, raw);
    return true;
  } catch { return false; }
}
