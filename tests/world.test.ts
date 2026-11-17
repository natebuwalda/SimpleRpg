import { expect, it } from 'vitest';
import { generateWorld, getLandmarks, isWalkable, move, getLivingEncounterAt, createCheckpoint } from '../src/game/world';
import { makeWorld, makeCheckpoint } from './fixtures';

it.each([[0, .999999, 20, 40], [.999999, 0, 40, 20], [.5, .5, 30, 30]])('draws dimensions independently (%s,%s)', (a,b,width,height) => {
  const draws = [a,b]; let calls = 0;
  expect(generateWorld(() => draws[calls++] ?? 0)).toMatchObject({ version: 2, layout: 'woodland', width, height });
  expect(calls).toBe(5);
});
it.each([[20,40],[40,20],[20,20],[40,40]])('has reachable landmarks in %sx%s', (width,height) => {
  const world = makeWorld(width,height);
  const {spawn, obstacle, encounter} = getLandmarks(world);
  expect(spawn).toEqual({x:3,y:3}); expect(obstacle).toEqual({x:6,y:5});
  expect(encounter).toEqual({x:width-5,y:height-5});
  expect(createCheckpoint(world)).toEqual(makeCheckpoint(world));
  for (const p of [{x:2,y:3},{x:width-3,y:3},{x:3,y:2},{x:3,y:height-3},obstacle,{x:3.5,y:3},{x:NaN,y:3}]) expect(isWalkable(world,p)).toBe(false);
  expect(move(world,spawn,'left')).toBe(spawn);
  expect(move(world,spawn,'right')).toEqual({x:4,y:3});
  expect(getLivingEncounterAt(createCheckpoint(world),encounter)?.id).toBe('slime-1');
  const seen = new Set<string>(); const queue = [spawn];
  while(queue.length) { const p = queue.shift()!; const key = `${p.x},${p.y}`; if(seen.has(key)) continue; seen.add(key); for(const direction of ['up','down','left','right'] as const) queue.push(move(world,p,direction)); }
  expect(seen.has(`${width-5},${height-5}`)).toBe(true);
});
