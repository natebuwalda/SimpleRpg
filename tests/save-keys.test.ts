import { expect, test } from 'vitest';
import { getSaveKeys } from '../src/game/save-keys';

test('production uses the v7 roster key', () => {
  expect(getSaveKeys('/SimpleRpg/').current).toEqual('simple-rpg.save.v8');
});
test('acceptance saves and every migration source are isolated from production', () => {
  expect(getSaveKeys('/SimpleRpg/acceptance/').current).toEqual('simple-rpg.acceptance.save.v8');
});
