import {createSaveCoordinator,type SaveLocks} from './save-coordinator';
import {loadRoster,parseCheckpoint,writeRoster} from './save';
import {MAX_CHARACTERS,type RosterObservation,type RosterSave,type RosterSlot} from './roster';
import type {Character,Checkpoint,WorldDefinition} from './types';
import {isValidCharacter} from './character';
import {createCheckpoint,findMoreSlimes,generateWorld,restartCheckpoint} from './world';
import {awardXp,effectiveCharacter,hasSupportedMeleePools,SLIME_XP,spendPoint,type Rating} from './progression';

export type RosterCommand=
 |{type:'create';character:Character}
 |{type:'update';id:string;expectedRevision:number;checkpoint:Checkpoint;status:'active'|'defeated'}
 |{type:'restart';id:string;expectedRevision:number}
 |{type:'delete';id:string;expectedRevision:number}
 |{type:'findMoreSlimes';id:string;expectedRevision:number}
 |{type:'spendPoint';id:string;expectedRevision:number;rating:Rating}
 |{type:'upgrade'}
 |{type:'reset';expectedRaw:string;legacy?:true};
export type RosterResult={kind:'saved';roster:RosterSave;slot:RosterSlot|null}
 |{kind:'full'|'stale'|'missing'|'invalid'|'unavailable'|'write-failed';observation:RosterObservation};
export function createRosterStore(storage:Pick<Storage,'getItem'|'setItem'>|null,locks:SaveLocks|undefined,key:string,dependencies:{newId?:()=>string;newWorld?:()=>WorldDefinition;newWaveRandom?:()=>number}={}){
 const coordinator=createSaveCoordinator(locks,key.replace(/\.v\d+$/,''));
 const read=():RosterObservation=>storage?loadRoster(storage,key):{status:'unavailable',raw:null,roster:null};
 return {read,transact(command:RosterCommand):Promise<RosterResult>{
  return coordinator.run(canWrite=>{
   const observation=read();const fail=(kind:Exclude<RosterResult['kind'],'saved'>):RosterResult=>({kind,observation});
   if(!canWrite||!storage||observation.status==='unavailable')return fail('unavailable');
   let roster=observation.roster,slot:RosterSlot|null=null;
   if(command.type==='upgrade'){
    if(!roster)return fail('invalid');
    if(!observation.legacy)return {kind:'saved',roster,slot:null};
   }else if(command.type==='reset'){
    if(observation.raw!==command.expectedRaw||observation.legacy!==command.legacy)return fail('stale');
    if(observation.status!=='invalid')return fail('invalid');
    roster={version:7,slots:[]};
   }else{
    if(!roster)return fail('invalid');
    if(command.type==='create'){
     if(roster.slots.length>=MAX_CHARACTERS)return fail('full');
     if(!isValidCharacter(command.character))return fail('invalid');
     slot={id:(dependencies.newId??(()=>crypto.randomUUID()))(),revision:1,status:'active',checkpoint:createCheckpoint((dependencies.newWorld??generateWorld)(),command.character)};
     roster={...roster,slots:[...roster.slots,slot]};
    }else{
     const index=roster.slots.findIndex(s=>s.id===command.id),previous=roster.slots[index];
     if(!previous)return fail('missing');
     if(previous.revision!==command.expectedRevision)return fail('stale');
     if(command.type==='delete')roster={...roster,slots:roster.slots.filter(s=>s.id!==command.id)};
     else{
      if(previous.revision===Number.MAX_SAFE_INTEGER)return fail('invalid');
      let checkpoint:Checkpoint;
      let status=previous.status;
      if(command.type==='restart'){
       checkpoint=restartCheckpoint(previous.checkpoint);
       status='active';
      }else{
       if(previous.status==='defeated')return fail('invalid');
       if(command.type==='findMoreSlimes'){
        checkpoint=findMoreSlimes(previous.checkpoint,dependencies.newWaveRandom);
        if(checkpoint===previous.checkpoint)return fail('invalid');
       }else if(command.type==='spendPoint'){
        const progression=spendPoint(previous.checkpoint.progression,command.rating);
        if(progression===previous.checkpoint.progression||!hasSupportedMeleePools(effectiveCharacter(previous.checkpoint.character,progression)))return fail('invalid');
        checkpoint={...previous.checkpoint,progression};
       }else{
       const parsed=parseCheckpoint(JSON.stringify(command.checkpoint));
       if(!parsed||!validUpdate(previous.checkpoint,parsed))return fail('invalid');
       checkpoint=parsed;
       status=command.status;
       }
      }
      slot={...previous,revision:previous.revision+1,checkpoint,status};
      roster={...roster,slots:roster.slots.map((s,i)=>i===index?slot!:s)};
     }
    }
   }
   if(!writeRoster(storage,roster!,key))return fail('write-failed');
   return {kind:'saved',roster:structuredClone(roster!),slot:slot?structuredClone(slot):null};
  });
 }};
}

function validUpdate(previous:Checkpoint,next:Checkpoint):boolean{
 const same=(a:unknown,b:unknown)=>JSON.stringify(a)===JSON.stringify(b);
 if(!same(previous.character,next.character)||!same(previous.world,next.world)||!same(previous.initialSlimes,next.initialSlimes))return false;
 if(!previous.completedEncounterIds.every(id=>next.completedEncounterIds.includes(id)))return false;
 const wins=next.completedEncounterIds.length-previous.completedEncounterIds.length;
 return same(awardXp(previous.progression,wins*SLIME_XP),next.progression);
}
