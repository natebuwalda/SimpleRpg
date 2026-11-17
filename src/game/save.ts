import type { Checkpoint, Position } from './types';
import { atEncounter, ENCOUNTER_ID, isWalkable, MAX_HP } from './world';

export const SAVE_KEY = 'simple-rpg.save.v1';
export function parseSave(raw: string | null): Checkpoint | null {
  if (raw === null) return null;
  try {
    const value: unknown = JSON.parse(raw);
    if (!value || typeof value !== 'object') return null;
    const v = value as Record<string, unknown>;
    if (v.version !== 1 || typeof v.hp !== 'number' || !Number.isInteger(v.hp) || v.hp < 1 || v.hp > MAX_HP) return null;
    if (!v.position || typeof v.position !== 'object') return null;
    const position = v.position as Position;
    if (!isWalkable(position)) return null;
    if (!Array.isArray(v.completedEncounterIds) || v.completedEncounterIds.some(id => id !== ENCOUNTER_ID) || new Set(v.completedEncounterIds).size !== v.completedEncounterIds.length) return null;
    if (atEncounter(position) && !v.completedEncounterIds.includes(ENCOUNTER_ID)) return null;
    return { version: 1, position: { x: position.x, y: position.y }, hp: v.hp, completedEncounterIds: [...v.completedEncounterIds] };
  } catch { return null; }
}
export function loadSave(storage: Pick<Storage, 'getItem'>): { checkpoint: Checkpoint | null; status: 'ready' | 'empty' | 'invalid' | 'unavailable' } {
  try {
    const raw = storage.getItem(SAVE_KEY);
    const checkpoint = parseSave(raw);
    return { checkpoint, status: raw === null ? 'empty' : checkpoint ? 'ready' : 'invalid' };
  } catch { return { checkpoint: null, status: 'unavailable' }; }
}
export function saveGame(storage: Pick<Storage, 'setItem'>, checkpoint: Checkpoint): boolean {
  try {
    const raw = JSON.stringify(checkpoint);
    if (!parseSave(raw)) return false;
    storage.setItem(SAVE_KEY, raw);
    return true;
  } catch { return false; }
}
