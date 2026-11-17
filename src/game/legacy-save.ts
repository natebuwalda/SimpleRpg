import type { Position, WorldGeometry } from './types';
import { getLandmarks, isWalkable } from './world';
import { decodeRecord, validGeometry, validProgress } from './save-validation';

export type LegacyCheckpoint = { version: 2; world: WorldGeometry & { version: 1 }; position: Position; hp: number; completedEncounterIds: 'slime-1'[] };
export function parseOlderSave(raw: string | null): LegacyCheckpoint | null {
  const v = decodeRecord(raw);
  if (!v || !validProgress(v, ['slime-1']) || !v.position || typeof v.position !== 'object') return null;
  const { x, y } = v.position as Position;
  const ids = v.completedEncounterIds as 'slime-1'[];
  if (v.version === 1) {
    if (!Number.isInteger(x) || !Number.isInteger(y) || x < 1 || y < 1 || x > 8 || y > 8 || (x === 4 && y === 3) || (x === 6 && y === 4 && !ids.includes('slime-1'))) return null;
    return { version: 2, world: { version: 1, layout: 'legacy-expanded', width: 20, height: 20 }, position: { x: x + 2, y: y + 2 }, hp: v.hp as number, completedEncounterIds: [...ids] };
  }
  if (v.version !== 2 || !validGeometry(v.world) || (v.world as { version?: unknown }).version !== 1) return null;
  const world = v.world as LegacyCheckpoint['world'];
  const encounter = getLandmarks(world).encounter;
  if (!isWalkable(world, { x, y }) || (x === encounter.x && y === encounter.y && !ids.includes('slime-1'))) return null;
  return { version: 2, world: {version:1,layout:world.layout,width:world.width,height:world.height}, position:{x,y}, hp:v.hp as number, completedEncounterIds:[...ids] };
}
