import { SLIME_IDS, type Checkpoint, type Position, type WorldGeometry, type WorldDefinition, type SlimePlacement } from './types';
import { getLandmarks, getLivingEncounterAt, isWalkable } from './world';
import { decodeRecord, validGeometry, validProgress } from './save-validation';
import { isStarterCharacter, type CharacterRatings } from './character';

export type LegacyCheckpoint = { version: 2; world: WorldGeometry & { version: 1 }; position: Position; hp: number; completedEncounterIds: 'slime-1'[] };
export function parseOlderSave(raw: string | null): LegacyCheckpoint | null {
  const v = decodeRecord(raw);
  if (!v || !validProgress(v, ['slime-1'], 12) || !v.position || typeof v.position !== 'object') return null;
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

export type PlacedProgress = Omit<Checkpoint, 'version' | 'character'>;
export type V3Checkpoint = PlacedProgress & { version: 3 };
export function parseV4Save(raw: string | null): (PlacedProgress & {version:4;character:CharacterRatings}) | null {
  const v=decodeRecord(raw);
  if(!v || v.version!==4 || !isStarterCharacter(v.character))return null;
  const progress=parsePlacedProgress(v,5);
  if(!progress)return null;
  const {attributes:a,skills:s}=v.character;
  return {...progress,version:4,character:{attributes:{prowess:a.prowess,cunning:a.cunning,resistance:a.resistance},skills:{combat:s.combat,subterfuge:s.subterfuge,lore:s.lore}}};
}
export function parseV3Save(raw: string | null): V3Checkpoint | null {
  const v = decodeRecord(raw);
  if (!v || v.version !== 3) return null;
  const progress = parsePlacedProgress(v, 12);
  return progress ? { ...progress, version: 3 } : null;
}
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
