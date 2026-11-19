import Phaser from 'phaser';
import { GameScene } from './view/GameScene';
import { mountUi } from './view/ui';
import type { UiAction, Direction, Checkpoint } from './game/types';
import { createSession, transition } from './game/session';
import { loadSave, saveGame, checkpointSignature, SAVE_KEY, type MigrationResolver, type MigrationSource } from './game/save';
import { createSaveCoordinator, type SaveLocks } from './game/save-coordinator';
import { VIEWPORT_TILES, TILE_SIZE } from './game/viewport';
import { generateWorld } from './game/world';
import { isValidCharacter } from './game/character';
import './style.css';

const ui = mountUi(document.querySelector<HTMLElement>('#app')!);
let state = createSession();
const scene = new GameScene();
let storage: Storage | null = null;
try { storage = window.localStorage; } catch { /* Play without persistent storage. */ }
let locks:SaveLocks|undefined;
try { locks=navigator.locks; } catch { /* Continue read-only if locks are unavailable. */ }
const coordinator=createSaveCoordinator(locks,SAVE_KEY.replace(/\.v\d+$/,''));
let persistenceAvailable=!!locks;
let migrationCache: {source:MigrationSource;checkpoint:Checkpoint|null} | null = null;
let migrationWriteFailed=false;
const resolveMigration: MigrationResolver = (source, create) => {
  if (!migrationCache || migrationCache.source.key !== source.key || migrationCache.source.raw !== source.raw) {migrationWriteFailed=false;migrationCache = {source,checkpoint:create()};}
  return migrationCache.checkpoint;
};
// Observations are synchronous and never write; every writer uses coordinator.
function readSave() {
  const result = storage ? loadSave(storage, Math.random, resolveMigration) : { checkpoint: null, status: 'unavailable' as const, migrated: false, source:null };
  return {...result,canRead:result.status!=='unavailable',status:!persistenceAvailable||(result.migrated&&migrationWriteFailed)?'unavailable' as const:result.status};
}
const statusMessages={
  ready:'Your adventure is ready to continue.',
  empty:'No saved adventure yet.',
  invalid:'Your saved adventure could not be read. Start a new game.',
  unavailable:'Progress cannot be saved in this browser. You can still play.',
};
const loaded=readSave();
let saved=loaded.checkpoint,saveStatus=statusMessages[loaded.status];
let activeSignature=checkpointSignature(saved),staleSave=false,migrationPending=false;
ui.setSaved(saved);
function applyLoaded(current:ReturnType<typeof readSave>){
  saved=current.checkpoint;saveStatus=statusMessages[current.status];
  ui.setSaved(saved);ui.render(state,saveStatus);
}
function persistMigration(migrated:boolean){
  if(!migrated||migrationPending)return;
  migrationPending=true;
  void coordinator.run(canWrite=>{
    persistenceAvailable=canWrite;
    const current=readSave();
    if(!current.migrated||!current.checkpoint)return;
    const success=canWrite&&storage&&saveGame(storage,current.checkpoint);
    migrationWriteFailed=!success;
    if(state.kind==='title')applyLoaded({...current,status:success?'ready':'unavailable'});
  }).finally(()=>{migrationPending=false;});
}
function refreshTitleSave() {
  if(state.kind!=='title')return;
  const current=readSave();applyLoaded(current);persistMigration(current.migrated);
}
ui.onTitleAction(refreshTitleSave);
window.addEventListener('storage', refreshTitleSave);
window.addEventListener('focus', refreshTitleSave);
let active=true,busy=false,starting=false,pendingOperations=0;
const syncBusy=()=>ui.setBusy(busy||pendingOperations>0);
function dispatch(action:UiAction){
  if(!active||(busy&&(action.type==='attack'||action.type==='run')))return;
  if(action.type==='newGame'&&(starting||state.kind!=='title'||!isValidCharacter(action.character)))return;
  const resolving=state.kind==='battle'&&(action.type==='attack'||action.type==='run');
  let operationDone=false,delayDone=!resolving;
  const unlock=()=>{if(resolving&&operationDone&&delayDone)busy=false;syncBusy();};
  if(resolving){
    busy=true;
    window.setTimeout(()=>{delayDone=true;unlock();},300);
  }
  if(action.type==='newGame'){starting=true;ui.setStarting(true);}
  pendingOperations++;syncBusy();
  void coordinator.run(canWrite=>{
    persistenceAvailable=canWrite;
    const current=readSave();
    const writable=!!(canWrite&&storage&&current.canRead);
    if(action.type==='newGame'){
      if(state.kind!=='title')return;
      // Comparison and replacement share the same cross-tab critical section.
      if(writable&&checkpointSignature(current.checkpoint)!==action.expectedSave){
        saved=current.checkpoint;saveStatus=statusMessages[current.status];ui.setSaved(saved);
        ui.setStarting(false);ui.confirmChangedSave();return;
      }
      activeSignature=checkpointSignature(current.checkpoint);staleSave=false;
    }
    if(action.type==='continue'){
      if(state.kind!=='title')return;
      if(!current.checkpoint){applyLoaded(current);return;}
      action={type:'continue',checkpoint:current.checkpoint};
      activeSignature=checkpointSignature(current.checkpoint);staleSave=false;
      saveStatus=statusMessages[current.status];
      if(current.migrated){const success=writable&&saveGame(storage!,current.checkpoint);migrationWriteFailed=!success;saveStatus=statusMessages[success?'ready':'unavailable'];}
    }
    if(action.type==='newGame'||action.type==='continue'||action.type==='restart')scene.resetViewport();
    const previous=state;
    state=transition(state,action.type==='newGame'?{type:'newGame',character:action.character,world:generateWorld()}:action);
    if(state!==previous&&(state.kind==='exploring'||state.kind==='victory')&&action.type!=='continue'&&action.type!=='acknowledgeVictory'){
      if(action.type!=='newGame'&&writable&&checkpointSignature(current.checkpoint)!==activeSignature)staleSave=true;
      if(!staleSave&&writable&&saveGame(storage!,state.checkpoint)){
        saved=state.checkpoint;activeSignature=checkpointSignature(saved);saveStatus='Adventure saved on this device.';
      }else if(staleSave){
        saved=current.checkpoint;saveStatus='Another tab changed this adventure. Reload to Continue the latest save.';
      }else saveStatus=statusMessages.unavailable;
      ui.setSaved(saved);
    }
    if(action.type==='newGame'&&state.kind==='exploring')ui.completeCreation();
    ui.render(state,saveStatus);scene.renderState(state);syncBusy();
  }).finally(()=>{
    pendingOperations--;operationDone=true;unlock();
    if(action.type==='newGame'){starting=false;ui.setStarting(false);}
  });
}
ui.onAction(dispatch);
ui.render(state,saveStatus);
syncBusy();
persistMigration(loaded.migrated);
window.addEventListener('blur',()=>{active=false;});
window.addEventListener('focus',()=>{active=true;});
document.addEventListener('visibilitychange',()=>{active=!document.hidden;});
const directions:Record<string,Direction>={ArrowUp:'up',w:'up',ArrowDown:'down',s:'down',ArrowLeft:'left',a:'left',ArrowRight:'right',d:'right'};
window.addEventListener('keydown',event=>{
  if(event.target instanceof Element&&event.target.closest('input,textarea,select,[contenteditable="true"]'))return;
  if(event.repeat&&(event.key==='Enter'||event.key===' '))event.preventDefault();
  const direction=directions[event.key];
  const readingDetails=event.target instanceof Element&&event.target.closest('details');
  if(direction&&state.kind==='exploring'&&!readingDetails){event.preventDefault();if(!event.repeat)dispatch({type:'move',direction});}
});
new Phaser.Game({
  type:Phaser.AUTO,parent:'canvas',width:VIEWPORT_TILES*TILE_SIZE,height:VIEWPORT_TILES*TILE_SIZE,pixelArt:true,
  backgroundColor:'#223f35',banner:false,scene:[scene],audio:{noAudio:true},
});
