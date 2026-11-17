import type { Position, WorldDefinition } from './types';
export const VIEWPORT_TILES = 10;
export const TILE_SIZE = 16;
export const SIGHT_BUFFER = 3;

function axis(size: number, hero: number, previous: number): number {
  const clamp = (value: number) => Math.max(0, Math.min(size - VIEWPORT_TILES, value));
  const origin = clamp(previous);
  if (hero - origin < SIGHT_BUFFER) return clamp(hero - SIGHT_BUFFER);
  if (hero - origin > VIEWPORT_TILES - SIGHT_BUFFER - 1) return clamp(hero - (VIEWPORT_TILES - SIGHT_BUFFER - 1));
  return origin;
}
export function updateViewport(world: WorldDefinition, hero: Position, previous: Position): Position {
  return { x: axis(world.width, hero.x, previous.x), y: axis(world.height, hero.y, previous.y) };
}
export function worldToScreen(position: Position, viewport: Position): Position {
  return { x: position.x - viewport.x, y: position.y - viewport.y };
}
