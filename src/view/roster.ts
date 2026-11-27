import {deriveStats} from '../game/character';
import {CLASS_DEFINITIONS,OFFENSIVE_ACTIONS,getCombatPools,offenseFor} from '../game/combat-actions';
import {MAX_CHARACTERS,type LegacyRosterVersion,type RosterObservation} from '../game/roster';
import {classActionDetails,resourceText} from './class-action';
import {mountConfirmation} from './confirmation';
import {effectiveCharacter,progressionSummary} from '../game/progression';
type Callbacks={onCreate():void;onResume(id:string):void;onRestart(id:string,revision:number):void;onDelete(id:string,revision:number):void;onReset(raw:string,legacy?:LegacyRosterVersion):void};
export function mountRoster(root:HTMLElement,callbacks:Callbacks){
 let observation:RosterObservation={status:'empty',raw:null,roster:{version:11,slots:[]}},canMutate=false,pending=false;
 let rendered=false;
 let selected:string|null=null,mode:'list'|'detail'|'delete'|'reset'='list',source:string|null=null,message='';
 let resetLegacy:LegacyRosterVersion|undefined;
 let confirmation:ReturnType<typeof mountConfirmation>|null=null;
 const controller=new AbortController();
 const find=()=>observation.roster?.slots.find(s=>s.id===selected);
 function render(focus=true){
  rendered=true;
  const focused=document.activeElement instanceof HTMLElement&&root.contains(document.activeElement)?(document.activeElement.tagName==='H1'?'heading':document.activeElement.dataset.focus):null;
  confirmation?.destroy();confirmation=null;
  const slot=find();if(selected&&!slot){mode='list';selected=null;message='This character is no longer available.';focus=true;}
  if(mode==='delete'&&slot){
   source=String(slot.revision);
   confirmation=mountConfirmation(root,{title:'End this story?',message:`Delete ${slot.checkpoint.character.name} and their saved adventure? This cannot be undone.`,cancel:'Keep character',confirm:'Delete permanently',onCancel(){mode='detail';render();},onConfirm(){callbacks.onDelete(slot.id,slot.revision);}});
  }else if(mode==='reset'){
   source=observation.raw;
   resetLegacy=observation.legacy;
   confirmation=mountConfirmation(root,{title:'Reset unreadable roster?',message:'This permanently removes the unreadable roster and all adventures in it. This cannot be undone.',cancel:'Keep data',confirm:'Reset roster',onCancel(){mode='list';render();},onConfirm(){if(source!==null)callbacks.onReset(source,resetLegacy);}});
  }else if(mode==='detail'&&slot){
   const {progression}=slot.checkpoint;
   const c=effectiveCharacter(slot.checkpoint.character,progression),stats=deriveStats(c),offense=offenseFor(c.classId),pools=getCombatPools(c,offense);
   root.innerHTML=`<div class="eyebrow">CHARACTER & ADVENTURE</div><h1 tabindex="-1" data-name></h1><p class="description" aria-label="Character class">${CLASS_DEFINITIONS[c.classId].label}</p><p class="description" aria-label="Character progression">${progressionSummary(progression)}</p><p class="description">${slot.status==='defeated'?'Defeated':`${slot.checkpoint.hp} / ${stats.maxHp} Health`} · ${slot.checkpoint.completedEncounterIds.length} / 3 slimes defeated</p><div class="roster-sheet">${[...Object.entries(c.attributes),...Object.entries(c.skills)].map(([key,value])=>`<p><span>${key[0].toUpperCase()+key.slice(1)}</span><strong>${value}</strong></p>`).join('')}</div><p class="description">Health ${stats.maxHp} · Initiative ${stats.initiative} · Resource capacity ${stats.resourceCapacity}<br>${OFFENSIVE_ACTIONS[offense].label} ${pools.attack}d10 · Defense ${pools.defense}d10</p>${slot.checkpoint.currentResources === undefined ? '' : `<p aria-label="Resources">${resourceText(slot.checkpoint.currentResources, stats.resourceCapacity)}</p>`}${classActionDetails(c)}<button class="primary roster-wide" data-roster="play" data-focus="detail-play">${slot.status==='defeated'?'Restart adventure':'Resume adventure'}</button><div class="actions"><button data-roster="back" data-focus="detail-back">Back</button><button class="danger" data-roster="delete" data-focus="detail-delete">Delete character</button></div><p class="roster-message" role="status"></p>`;
   root.querySelector('[data-name]')!.textContent=c.name;
   root.querySelector<HTMLButtonElement>('[data-roster="play"]')!.disabled=slot.status==='defeated'&&!canMutate;
   root.querySelector<HTMLButtonElement>('[data-roster="delete"]')!.disabled=!canMutate;
  }else{
   const slots=observation.roster?.slots??[];
   root.innerHTML=`<div class="eyebrow">EVERY HERO HAS A JOURNEY</div><h1 tabindex="-1">Your adventures</h1><p class="description">Choose a character to pick up where you left off.</p><div class="roster-count"><strong>Characters</strong><span aria-label="Roster capacity">${slots.length} / 10 slots</span></div><button data-roster="create" data-focus="create" class="primary roster-wide" ${!canMutate||!observation.roster||slots.length>=MAX_CHARACTERS?'disabled':''}>New Character</button>${slots.length>=MAX_CHARACTERS?'<p class="creation-notice">All 10 slots are in use. Delete a character to make room for a new one.</p>':''}${observation.status==='invalid'?'<p class="creation-notice">Your roster could not be read.</p><button data-roster="reset" '+(!canMutate?'disabled':'')+'>Reset roster</button>':''}<div data-slots></div><p class="roster-message" role="status"></p><p class="save-status">Each character has their own adventure. Progress is saved in this browser.</p>`;
   const container=root.querySelector('[data-slots]')!;
   for(const s of slots){
    const article=document.createElement('article');article.className='roster-slot';article.setAttribute('aria-label',s.checkpoint.character.name);
    article.innerHTML=`<div class="roster-slot-title"><h2></h2><span>${s.status==='defeated'?'Defeated':`${s.checkpoint.hp} / ${deriveStats(effectiveCharacter(s.checkpoint.character,s.checkpoint.progression)).maxHp} HP`}</span></div><p>${s.checkpoint.completedEncounterIds.length} / 3 slimes defeated</p><div class="actions"><button class="primary" data-roster="slot-play">${s.status==='defeated'?'Restart':'Resume'}</button><button data-roster="view">View</button></div>`;
    article.querySelector('h2')!.textContent=s.checkpoint.character.name;
    for(const b of article.querySelectorAll<HTMLButtonElement>('button')){b.dataset.id=s.id;b.dataset.focus=`${b.dataset.roster}-${s.id}`;}
    article.querySelector<HTMLButtonElement>('[data-roster="slot-play"]')!.disabled=s.status==='defeated'&&!canMutate;
    container.append(article);
   }
   if(!slots.length&&observation.status==='empty')container.innerHTML='<p class="description">Your first story starts here. Create a character to begin an adventure.</p>';
  }
  if(confirmation){confirmation.showMessage(message);confirmation.setPending(pending);}
  else{root.querySelector('.roster-message')!.textContent=message;if(pending)root.querySelectorAll<HTMLButtonElement>('button').forEach(b=>{b.disabled=true});}
  if(focus&&!confirmation)root.querySelector<HTMLElement>('h1')?.focus({preventScroll:true});
  else if(focused==='heading'&&!confirmation)root.querySelector<HTMLElement>('h1')?.focus({preventScroll:true});
  else if(focused&&!confirmation)Array.from(root.querySelectorAll<HTMLButtonElement>('button')).find(b=>b.dataset.focus===focused)?.focus({preventScroll:true});
 }
 root.addEventListener('click',event=>{
  if(confirmation||pending)return;const button=(event.target as Element).closest<HTMLButtonElement>('button[data-roster]');if(!button||button.disabled)return;
  if(button.dataset.id)selected=button.dataset.id;
  switch(button.dataset.roster){
   case 'create':callbacks.onCreate();break;
   case 'view':mode='detail';message='';render();break;
   case 'slot-play':case 'play':{const slot=find();if(slot){if(slot.status==='defeated')callbacks.onRestart(slot.id,slot.revision);else callbacks.onResume(slot.id);}break;}
   case 'back':mode='list';selected=null;message='';render();break;
   case 'delete':mode='delete';message='';render();break;
   case 'reset':mode='reset';message='';render();break;
  }
 },{signal:controller.signal});
 return {
  update(next:RosterObservation,allow:boolean){const before=observation,oldPermission=canMutate;observation=next;canMutate=allow;
   if(confirmation&&((mode==='delete'&&source===String(find()?.revision))||(mode==='reset'&&source===next.raw&&resetLegacy===next.legacy)))return;
   if(confirmation)message='Saved data changed. Review and confirm again.';
   if(mode==='reset'&&next.status!=='invalid')mode='list';
   if(!rendered||JSON.stringify(before)!==JSON.stringify(next)||oldPermission!==allow)render(!rendered);
  },
  setPending(value:boolean){pending=value;if(confirmation)confirmation.setPending(value);else render(false);},
  showMessage(value:string){message=value;if(confirmation)confirmation.showMessage(value);else root.querySelector('.roster-message')!.textContent=value;},
  destroy(){confirmation?.destroy();controller.abort();root.replaceChildren();},
 };
}
