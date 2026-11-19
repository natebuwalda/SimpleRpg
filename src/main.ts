import Phaser from 'phaser';
import {GameScene} from './view/GameScene';
import {mountUi} from './view/ui';
import type {UiAction,Action,Direction} from './game/types';
import {createSession,transition} from './game/session';
import {createRosterStore,type RosterResult} from './game/roster-store';
import type {RosterSlot} from './game/roster';
import {ROSTER_KEY} from './game/save';
import type {SaveLocks} from './game/save-coordinator';
import {VIEWPORT_TILES,TILE_SIZE} from './game/viewport';
import './style.css';

const ui=mountUi(document.querySelector<HTMLElement>('#app')!);
const scene=new GameScene();let state=createSession(),selected:RosterSlot|null=null;
let storage:Storage|null=null,locks:SaveLocks|undefined;
try{storage=window.localStorage;}catch{/* Read failure is visible in the roster. */}
try{locks=navigator.locks;}catch{/* Browsers without locks can resume read-only. */}
const store=createRosterStore(storage,locks,ROSTER_KEY);
let canMutate=!!storage&&!!locks,dirty=false,stale=false,active=true,busy=false,pending=0,queue=Promise.resolve();
const unsaved='Progress cannot be saved in this browser. You can still play.';
let saveStatus='';
const messages:Record<Exclude<RosterResult['kind'],'saved'>,string>={full:'All 10 slots are in use. Return to characters and delete one to make room.',stale:'This adventure changed in another tab. Return to characters to load the latest save.',missing:'This character was deleted in another tab. Return to characters.',invalid:'Saved data could not be read or this change is invalid.',unavailable:unsaved,'write-failed':unsaved};
function observation(){const o=store.read();ui.setRoster(o,canMutate&&o.status!=='unavailable');return o;}
function render(){ui.render(state,saveStatus);scene.renderState(state);ui.setBusy(busy||pending>0);}
function refresh(){if(state.kind!=='title')return;const o=observation();saveStatus=o.status==='invalid'?'Your roster could not be read.':o.status==='unavailable'||!canMutate?unsaved:'';render();}
function failed(result:Exclude<RosterResult,{kind:'saved'}>){
 if(result.kind==='unavailable')canMutate=false;
 saveStatus=messages[result.kind];ui.showCreationMessage(saveStatus);ui.showRosterMessage(saveStatus);
 if(result.kind==='missing'||result.kind==='stale')stale=true;
}
function enter(slot:RosterSlot){
 selected=slot;dirty=false;stale=false;state=createSession();
 state=transition(state,{type:slot.status==='defeated'?'resumeDefeat':'continue',checkpoint:structuredClone(slot.checkpoint)});
 scene.resetViewport();ui.completeCreation();saveStatus=canMutate?'Adventure ready.':unsaved;
}
function returnToRoster(){state=createSession();selected=null;dirty=false;stale=false;refresh();}
async function persist(){
 if(!selected||state.kind==='title'||state.kind==='battle')return;
 if(stale){dirty=true;return;}
 const result=await store.transact({type:'update',id:selected.id,expectedRevision:selected.revision,checkpoint:state.checkpoint,status:state.kind==='defeat'?'defeated':'active'});
 if(result.kind==='saved'){selected=result.slot;dirty=false;saveStatus='Adventure saved on this device.';}
 else{dirty=true;failed(result);}
}
async function process(action:UiAction){
 if(action.type==='newGame'){
  if(state.kind!=='title')return;
  const result=await store.transact({type:'create',character:action.character});
  if(result.kind==='saved'&&result.slot)enter(result.slot);else if(result.kind!=='saved'){observation();failed(result);}return;
 }
 if(action.type==='resumeSlot'){
  if(state.kind!=='title')return;const o=observation(),slot=o.roster?.slots.find(s=>s.id===action.id);
  if(slot)enter(slot);else{saveStatus='This character is no longer available.';ui.showRosterMessage(saveStatus);}return;
 }
 if(action.type==='deleteSlot'||action.type==='resetRoster'||action.type==='restartSlot'||action.type==='restart'){
  if(action.type==='restart'&&(!selected||state.kind!=='defeat'))return;
  if(action.type!=='restart'&&state.kind!=='title')return;
  const command=action.type==='resetRoster'?{type:'reset' as const,expectedRaw:action.raw}:!('id' in action)?{type:'restart' as const,id:selected!.id,expectedRevision:selected!.revision}:{type:action.type==='deleteSlot'?'delete' as const:'restart' as const,id:action.id,expectedRevision:action.revision};
  const result=await store.transact(command);
  if(result.kind==='saved'){
   if(result.slot)enter(result.slot);else{saveStatus='Roster saved on this device.';observation();}
  }else{if(state.kind==='title')observation();failed(result);}return;
 }
 if(action.type==='returnToRoster'){
  if(state.kind==='battle'||state.kind==='title')return;
  if(dirty)ui.confirmDiscard();else returnToRoster();return;
 }
 if(action.type==='discardProgress'){returnToRoster();return;}
 if(action.type==='retrySave'){await persist();return;}
 const previous=state;
 state=transition(state,action as Action);
 if(state!==previous&&state.kind!=='title'&&state.kind!=='battle'&&action.type!=='acknowledgeVictory')await persist();
}
function dispatch(action:UiAction){
 if(!active||pending>0||(busy&&(action.type==='attack'||action.type==='run')))return;
 const resolving=state.kind==='battle'&&(action.type==='attack'||action.type==='run');
 let done=false,delayDone=!resolving;
 const unlock=()=>{if(resolving&&done&&delayDone)busy=false;ui.setBusy(busy||pending>0);};
 if(resolving){busy=true;window.setTimeout(()=>{delayDone=true;unlock();},300);}
 pending++;ui.setCreationPending(true);ui.setBusy(true);
 queue=queue.then(()=>process(action)).catch(()=>{saveStatus=unsaved;ui.showCreationMessage(saveStatus);ui.showRosterMessage(saveStatus);}).finally(()=>{
  pending--;done=true;ui.setCreationPending(false);render();unlock();
 });
}
ui.onAction(dispatch);refresh();
window.addEventListener('storage',refresh);
window.addEventListener('blur',()=>{active=false;});
window.addEventListener('focus',()=>{active=true;refresh();});
document.addEventListener('visibilitychange',()=>{active=!document.hidden;if(active)refresh();});
const directions:Record<string,Direction>={ArrowUp:'up',w:'up',ArrowDown:'down',s:'down',ArrowLeft:'left',a:'left',ArrowRight:'right',d:'right'};
window.addEventListener('keydown',event=>{
 if(event.target instanceof Element&&event.target.closest('input,textarea,select,[contenteditable="true"]'))return;
 if(event.repeat&&(event.key==='Enter'||event.key===' '))event.preventDefault();
 const direction=directions[event.key];const readingDetails=event.target instanceof Element&&event.target.closest('details');
 if(direction&&state.kind==='exploring'&&!readingDetails){event.preventDefault();if(!event.repeat)dispatch({type:'move',direction});}
});
new Phaser.Game({type:Phaser.AUTO,parent:'canvas',width:VIEWPORT_TILES*TILE_SIZE,height:VIEWPORT_TILES*TILE_SIZE,pixelArt:true,backgroundColor:'#223f35',banner:false,scene:[scene],audio:{noAudio:true}});
