import {expect,it} from 'vitest';
import {updateViewport,worldToScreen} from '../src/game/viewport';
import {move} from '../src/game/world';
const world={version:1 as const,layout:'woodland' as const,width:20,height:20};
it.each([
 [0,0,3,3,0,0],[0,0,6,6,0,0],[0,0,7,6,1,0],[0,0,6,7,0,1],
 [5,5,8,8,5,5],[5,5,7,8,4,5],[5,5,8,7,5,4],[10,10,16,16,10,10],
 [0,0,16,16,10,10],[-100,100,3,16,0,10],[100,-100,16,3,10,0],
])('minimally shifts (%s,%s) for hero(%s,%s)',(x,y,hx,hy,ox,oy)=>expect(updateViewport(world,{x:hx,y:hy},{x,y})).toEqual({x:ox,y:oy}));
it('converts world tiles to view tiles',()=>expect(worldToScreen({x:8,y:7},{x:4,y:3})).toEqual({x:4,y:4}));
it('reverses through the middle before shifting the opposite way',()=>{
 let view={x:5,y:5};
 for(const x of [11,10,9,8]) {view=updateViewport(world,{x,y:8},view);expect(view).toEqual({x:5,y:5});}
 expect(updateViewport(world,{x:7,y:8},view)).toEqual({x:4,y:5});
});
it.each([20,40])('keeps three visible tiles at every corner in20x%s',height=>{
 const map={...world,height};let hero={x:3,y:3};let view={x:0,y:0};
 for(const [direction,count] of [['right',13],['down',height-7],['left',13],['up',height-7]] as const) {
   for(let n=0;n<count+1;n++) {
     const next=move(map,hero,direction);const updated=updateViewport(map,next,view);
     if(next===hero) expect(updated).toEqual(view);
     hero=next;view=updated;const p=worldToScreen(hero,view);
     expect(p.x).toBeGreaterThanOrEqual(3);expect(p.x).toBeLessThanOrEqual(6);
     expect(p.y).toBeGreaterThanOrEqual(3);expect(p.y).toBeLessThanOrEqual(6);
     expect(view.x).toBeGreaterThanOrEqual(0);expect(view.x).toBeLessThanOrEqual(10);
     expect(view.y).toBeGreaterThanOrEqual(0);expect(view.y).toBeLessThanOrEqual(height-10);
   }
 }
 expect(hero).toEqual({x:3,y:3});expect(view).toEqual({x:0,y:0});
});
