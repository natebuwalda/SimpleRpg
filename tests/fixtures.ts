import type { Checkpoint, WorldDefinition } from '../src/game/types';
import { createStarterCharacter } from '../src/game/character';
export function makeWorld(width = 20, height = 20): WorldDefinition {
  return {version:2,layout:'woodland',width,height,slimes:[
    {id:'slime-1',position:{x:width-5,y:height-5}},
    {id:'slime-2',position:{x:8,y:8}},
    {id:'slime-3',position:{x:10,y:10}},
  ]};
}
export function makeCheckpoint(world = makeWorld()): Checkpoint {
  return {version:5,character:createStarterCharacter(),world,position:{x:3,y:3},hp:5,completedEncounterIds:[]};
}
