import {expect,test} from 'vitest';
import {createSaveCoordinator,type SaveLocks} from '../src/game/save-coordinator';

function sharedLocks():SaveLocks{
  let queue=Promise.resolve();
  return {request(name,operation){expect(name).toBe('test-save');const result=queue.then(operation);queue=result.then(()=>undefined,()=>undefined);return result;}};
}
test('different page coordinators sharing a namespace serialize the final comparison and write',async()=>{
  const locks=sharedLocks(),a=createSaveCoordinator(locks,'test-save'),b=createSaveCoordinator(locks,'test-save');
  let saved='';
  const start=(value:string)=>(canWrite:boolean)=>{if(saved!=='')return false;expect(canWrite).toBe(true);saved=value;return true;};
  expect(await Promise.all([a.run(start('first')),b.run(start('second'))])).toEqual([true,false]);expect(saved).toBe('first');
});
test('missing or rejected locks allow volatile play without unsafe persistent writes',async()=>{
  const missing=createSaveCoordinator(undefined,'test-save');expect(await missing.run(canWrite=>canWrite)).toBe(false);
  let calls=0;const rejected=createSaveCoordinator({request(){throw Error('denied');}},'test-save');
  expect(await rejected.run(canWrite=>{calls++;return canWrite;})).toBe(false);expect(calls).toBe(1);
});
test('an operation failure never repeats an operation that already entered its lock',async()=>{
  const coordinator=createSaveCoordinator(sharedLocks(),'test-save');let calls=0;
  await expect(coordinator.run(()=>{calls++;throw Error('operation failed');})).rejects.toThrow('operation failed');
  expect(calls).toBe(1);expect(await coordinator.run(()=>42)).toBe(42);
});
