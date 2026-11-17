import type { Checkpoint, Direction, Position } from './types';

export const MAX_HP = 12;
export const SIZE = 10;
export const ENCOUNTER_ID = 'slime-1';
export const ENCOUNTER: Position = { x: 6, y: 4 };
export function isWalkable({ x, y }: Position): boolean {
  return Number.isInteger(x) && Number.isInteger(y) && x > 0 && y > 0 && x < SIZE - 1 && y < SIZE - 1 && !(x === 4 && y === 3);
}
export function move(position: Position, direction: Direction): Position {
  const offsets: Record<Direction, Position> = { up: { x: 0, y: -1 }, down: { x: 0, y: 1 }, left: { x: -1, y: 0 }, right: { x: 1, y: 0 } };
  const offset = offsets[direction];
  const next = { x: position.x + offset.x, y: position.y + offset.y };
  return isWalkable(next) ? next : position;
}
export function atEncounter(position: Position): boolean {
  return position.x === ENCOUNTER.x && position.y === ENCOUNTER.y;
}
export function createCheckpoint(): Checkpoint {
  return { version: 1, position: { x: 2, y: 2 }, hp: MAX_HP, completedEncounterIds: [] };
}
