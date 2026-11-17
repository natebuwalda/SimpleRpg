import { describe, expect, it } from 'vitest';
import { move, isWalkable } from '../src/game/world';

describe('exploration', () => {
  it('moves right from spawn', () => expect(move({ x: 2, y: 2 }, 'right')).toEqual({ x: 3, y: 2 }));
  it.each([
    [{ x: 1, y: 1 }, 'left', { x: 1, y: 1 }],
    [{ x: 8, y: 8 }, 'down', { x: 8, y: 8 }],
    [{ x: 3, y: 3 }, 'right', { x: 3, y: 3 }],
  ] as const)('blocks walls and obstacle from %o going %s', (position, direction, expected) => {
    expect(move(position, direction)).toEqual(expected);
  });
  it('rejects invalid coordinates', () => {
    for (const position of [{ x: -1, y: 2 }, { x: 10, y: 2 }, { x: 2.5, y: 2 }, { x: NaN, y: 2 }]) expect(isWalkable(position)).toBe(false);
  });
});
