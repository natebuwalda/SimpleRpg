import type { Checkpoint, Direction, Position, WorldDefinition } from './types';

export const MAX_HP = 12;
export const ENCOUNTER_ID = 'slime-1';
export const FOREST_BORDER = 3;
export function generateWorld(random: () => number = Math.random): WorldDefinition {
  return { version: 1, layout: 'woodland', width: 20 + Math.floor(random() * 21), height: 20 + Math.floor(random() * 21) };
}
export function getLandmarks(world: WorldDefinition): { spawn: Position; obstacle: Position; encounter: Position } {
  return world.layout === 'legacy-expanded'
    ? { spawn: { x: 4, y: 4 }, obstacle: { x: 6, y: 5 }, encounter: { x: 8, y: 6 } }
    : { spawn: { x: 3, y: 3 }, obstacle: { x: 6, y: 5 }, encounter: { x: world.width - 5, y: world.height - 5 } };
}
export function isWalkable(world: WorldDefinition, { x, y }: Position): boolean {
  const { obstacle } = getLandmarks(world);
  return Number.isInteger(x) && Number.isInteger(y) && x >= FOREST_BORDER && y >= FOREST_BORDER && x < world.width - FOREST_BORDER && y < world.height - FOREST_BORDER && !(x === obstacle.x && y === obstacle.y);
}
export function move(world: WorldDefinition, position: Position, direction: Direction): Position {
  const offsets: Record<Direction, Position> = { up: { x: 0, y: -1 }, down: { x: 0, y: 1 }, left: { x: -1, y: 0 }, right: { x: 1, y: 0 } };
  const offset = offsets[direction];
  const next = { x: position.x + offset.x, y: position.y + offset.y };
  return isWalkable(world, next) ? next : position;
}
export function atEncounter(world: WorldDefinition, position: Position): boolean {
  const encounter = getLandmarks(world).encounter;
  return position.x === encounter.x && position.y === encounter.y;
}
export function createCheckpoint(world: WorldDefinition): Checkpoint {
  return { version: 2, world, position: getLandmarks(world).spawn, hp: MAX_HP, completedEncounterIds: [] };
}
