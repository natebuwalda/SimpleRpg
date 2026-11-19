import {SLIME_IDS,type Checkpoint,type WorldGeometry,type WorldDefinition,type SlimePlacement,type Position} from './types';
import {getLandmarks,getLivingEncounterAt,isWalkable} from './world';

export function decodeRecord(raw: string | null): Record<string, unknown> | null {
  try {
    const value: unknown = JSON.parse(raw ?? 'null');
    return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null;
  } catch { return null; }
}
export function validProgress(value: Record<string, unknown>, allowedIds: readonly string[], maxHp: number): boolean {
  return typeof value.hp === 'number' && Number.isInteger(value.hp) && value.hp >= 1 && value.hp <= maxHp
    && Array.isArray(value.completedEncounterIds) && value.completedEncounterIds.every(id => allowedIds.includes(id))
    && new Set(value.completedEncounterIds).size === value.completedEncounterIds.length;
}
export function validGeometry(value: unknown): value is WorldGeometry {
  if (!value || typeof value !== 'object') return false;
  const v = value as WorldGeometry;
  return ['woodland', 'legacy-expanded'].includes(v.layout)
    && Number.isInteger(v.width) && Number.isInteger(v.height) && v.width >= 20 && v.width <= 40 && v.height >= 20 && v.height <= 40
    && (v.layout !== 'legacy-expanded' || (v.width === 20 && v.height === 20));
}
export type PlacedProgress=Omit<Checkpoint,'version'|'character'>;
export function parsePlacedProgress(v: Record<string, unknown>, maxHp: number): PlacedProgress | null {
  if (!validProgress(v, SLIME_IDS, maxHp) || !validGeometry(v.world) || !v.position || typeof v.position !== 'object') return null;
  const world = v.world as WorldDefinition;
  if (world.version !== 2 || !Array.isArray(world.slimes) || world.slimes.length !== SLIME_IDS.length) return null;
  const spawn = getLandmarks(world).spawn;
  const ids = new Set<string>(), tiles = new Set<string>();
  const slimes: SlimePlacement[] = [];
  for (const slime of world.slimes) {
    if (!slime || !SLIME_IDS.includes(slime.id) || ids.has(slime.id) || !slime.position || typeof slime.position !== 'object' || !isWalkable(world, slime.position)) return null;
    const p = slime.position, key = `${p.x},${p.y}`;
    if (tiles.has(key) || (p.x === spawn.x && p.y === spawn.y)) return null;
    ids.add(slime.id); tiles.add(key); slimes.push({ id: slime.id, position: { x: p.x, y: p.y } });
  }
  const position = v.position as Position;
  if (!isWalkable(world, position)) return null;
  const progress: PlacedProgress = { world: { version: 2, layout: world.layout, width: world.width, height: world.height, slimes }, position: { x: position.x, y: position.y }, hp: v.hp as number, completedEncounterIds: [...v.completedEncounterIds as Checkpoint['completedEncounterIds']] };
  return getLivingEncounterAt(progress, position) ? null : progress;
}
