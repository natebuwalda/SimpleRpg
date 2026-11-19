import { SLIME_IDS, type Checkpoint, type Direction, type Position, type WorldDefinition, type WorldGeometry, type SlimePlacement } from './types';

import { createStarterCharacter, deriveStats, type Character } from './character';
import { SIGHT_BUFFER } from './viewport';
export const FOREST_BORDER = SIGHT_BUFFER;
export function generateWorld(random: () => number = Math.random): WorldDefinition {
  const geometry: WorldGeometry = { layout: 'woodland', width: 20 + Math.floor(random() * 21), height: 20 + Math.floor(random() * 21) };
  return { ...geometry, version: 2, slimes: placeSlimes(geometry, [], [], random) };
}
export function getLandmarks(world: WorldGeometry): { spawn: Position; obstacle: Position; encounter: Position } {
  return world.layout === 'legacy-expanded'
    ? { spawn: { x: 4, y: 4 }, obstacle: { x: 6, y: 5 }, encounter: { x: 8, y: 6 } }
    : { spawn: { x: 3, y: 3 }, obstacle: { x: 6, y: 5 }, encounter: { x: world.width - 5, y: world.height - 5 } };
}
export function isWalkable(world: WorldGeometry, { x, y }: Position): boolean {
  const { obstacle } = getLandmarks(world);
  return Number.isInteger(x) && Number.isInteger(y) && x >= FOREST_BORDER && y >= FOREST_BORDER && x < world.width - FOREST_BORDER && y < world.height - FOREST_BORDER && !(x === obstacle.x && y === obstacle.y);
}
export function move(world: WorldGeometry, position: Position, direction: Direction): Position {
  const offsets: Record<Direction, Position> = { up: { x: 0, y: -1 }, down: { x: 0, y: 1 }, left: { x: -1, y: 0 }, right: { x: 1, y: 0 } };
  const offset = offsets[direction];
  const next = { x: position.x + offset.x, y: position.y + offset.y };
  return isWalkable(world, next) ? next : position;
}
export function createCheckpoint(world: WorldDefinition, chosen: Character = createStarterCharacter()): Checkpoint {
  const character = {name:chosen.name,attributes:{...chosen.attributes},skills:{...chosen.skills}};
  return { version: 5, character, world, position: getLandmarks(world).spawn, hp: deriveStats(character).maxHp, completedEncounterIds: [] };
}

export function placeSlimes(world: WorldGeometry, preserved: SlimePlacement[] = [], excluded: Position[] = [], random: () => number = Math.random): SlimePlacement[] {
  const key = (p: Position) => `${p.x},${p.y}`;
  const occupied = new Set([getLandmarks(world).spawn, ...excluded, ...preserved.map(s => s.position)].map(key));
  const candidates: Position[] = [];
  for (let y = 0; y < world.height; y++) for (let x = 0; x < world.width; x++) {
    const position = { x, y };
    if (isWalkable(world, position) && !occupied.has(key(position))) candidates.push(position);
  }
  const missing = SLIME_IDS.filter(id => !preserved.some(slime => slime.id === id));
  if (candidates.length < missing.length) throw new RangeError('Not enough traversable tiles for three slimes.');
  const added = missing.map(id => ({ id, position: candidates.splice(Math.floor(random() * candidates.length), 1)[0] }));
  return [...preserved.map(s => ({ id: s.id, position: { ...s.position } })), ...added];
}

export function getLivingEncounterAt(checkpoint: Pick<Checkpoint, 'world' | 'completedEncounterIds'>, position: Position): SlimePlacement | null {
  return checkpoint.world.slimes.find(slime => slime.position.x === position.x && slime.position.y === position.y && !checkpoint.completedEncounterIds.includes(slime.id)) ?? null;
}
export function getRemainingSlimeCount(checkpoint: Checkpoint): number {
  return checkpoint.world.slimes.filter(slime => !checkpoint.completedEncounterIds.includes(slime.id)).length;
}
