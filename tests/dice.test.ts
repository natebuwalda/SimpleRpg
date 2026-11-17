import { expect, test } from 'vitest';
import { rollPool, rollOpposed } from '../src/game/dice';

function faces(...values: number[]) {
  let calls = 0;
  return { rng: () => { const face = values[calls++]; if (face === undefined) throw new Error('Unexpected roll'); return (face - 0.5) / 10; }, calls: () => calls };
}
test('only 8, 9, and 10 succeed; ones do not cancel', () => {
  expect(rollPool(4, faces(1, 7, 8, 9).rng)).toEqual({ original: [1, 7, 8, 9], bonus: [], successes: 2 });
});
test('original tens keep successes and bonus tens do not chain', () => {
  const source = faces(10, 8, 3, 10);
  expect(rollPool(3, source.rng)).toEqual({ original: [10, 8, 3], bonus: [10], successes: 3 });
  expect(source.calls()).toBe(4);
});
test('all original dice precede one bonus per original ten', () => {
  const source = faces(10, 10, 1, 10);
  expect(rollPool(2, source.rng)).toEqual({ original: [10, 10], bonus: [1, 10], successes: 3 });
  expect(source.calls()).toBe(4);
});
test('zero pools do not roll; invalid sizes are rejected', () => {
  expect(rollPool(0, faces().rng)).toEqual({ original: [], bonus: [], successes: 0 });
  for (const size of [-1, 1.5, NaN, Infinity]) expect(() => rollPool(size)).toThrow(RangeError);
});
test('opposed pools complete attack before defense and deal the margin', () => {
  const result = rollOpposed(2, 2, faces(10, 8, 9, 8, 1).rng);
  expect(result).toEqual({ attack: { original: [10, 8], bonus: [9], successes: 3 }, defense: { original: [8, 1], bonus: [], successes: 1 }, damage: 2 });
});
test.each([[8, 8], [1, 8], [1, 1]])('ties, defender wins and misses cause no damage (%i vs %i)', (attack, defense) => {
  expect(rollOpposed(1, 1, faces(attack, defense).rng).damage).toBe(0);
});
