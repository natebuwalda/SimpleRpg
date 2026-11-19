import { expect, test } from 'vitest';
import { getSaveKeys } from '../src/game/save-keys';

test('production retains every existing save and recovery key', () => {
  expect(getSaveKeys('/SimpleRpg/')).toEqual({ current:'simple-rpg.save.v5', v4:'simple-rpg.save.v4', v3:'simple-rpg.save.v3', v2:'simple-rpg.save.v2', v1:'simple-rpg.save.v1' });
});
test('acceptance saves and every migration source are isolated from production', () => {
  expect(getSaveKeys('/SimpleRpg/acceptance/')).toEqual({ current:'simple-rpg.acceptance.save.v5', v4:'simple-rpg.acceptance.save.v4', v3:'simple-rpg.acceptance.save.v3', v2:'simple-rpg.acceptance.save.v2', v1:'simple-rpg.acceptance.save.v1' });
});
