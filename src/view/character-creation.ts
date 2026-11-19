import { deriveStats, getMeleePools, type Character } from '../game/character';
import { allocatePoint, createCharacterDraft, finishCharacter, remainingPoints, type AllocationChange, type AllocationGroup } from '../game/creation';

type Callbacks = { onBegin(character:Character):void; onConfirm(character:Character):void; onCancel():void };
const descriptions:Record<string,string>={prowess:'Attack · Health · Initiative',cunning:'Initiative · Resource capacity',resistance:'Health · Defense · Resource capacity',combat:'Melee attack and defense',subterfuge:'Actions arrive in a later iteration',lore:'Actions arrive in a later iteration'};
const label=(key:string)=>key[0].toUpperCase()+key.slice(1);

export function mountCharacterCreation(root:HTMLElement,callbacks:Callbacks) {
  let draft=createCharacterDraft(),step=0,confirming=false;
  let pending=false,confirmReady=false,pointerAllowed=false,confirmTimer:number|undefined;
  const controller=new AbortController();
  root.innerHTML=`<section class="creation" aria-label="Character creation"><div class="creation-body"></div><footer class="creation-actions"></footer></section><p class="sr-only" role="status" aria-label="Creation result" aria-atomic="true"></p>`;
  const body=root.querySelector<HTMLElement>('.creation-body')!, actions=root.querySelector<HTMLElement>('.creation-actions')!, live=root.querySelector<HTMLElement>('[role="status"]')!;
  const readyForNext=()=>step===0 ? !!draft.name.trim() && draft.name.trim().length<=24 && remainingPoints(draft,'attributes')===0 : step===1 ? remainingPoints(draft,'skills')===0 : !!finishCharacter(draft);
  function stats(){
    const stats=deriveStats(draft),pools=getMeleePools(draft);
    return `<section class="creation-derived" aria-label="Derived stats"><h2>Your build</h2><div class="creation-stats"><div>Health<strong aria-label="Maximum Health">${stats.maxHp}</strong></div><div>Initiative<strong aria-label="Creation initiative">${stats.initiative}</strong></div><div>Resource capacity<strong aria-label="Creation resource capacity">${stats.resourceCapacity}</strong></div></div><div class="creation-pools"><span>Attack <strong aria-label="Creation attack pool">${pools.attack}d10</strong></span><span>Defense <strong aria-label="Creation defense pool">${pools.defense}d10</strong></span></div></section>`;
  }
  function rows(group:AllocationGroup){return Object.entries(draft[group]).map(([key,value])=>`<div class="allocation-row"><div><strong>${label(key)}</strong><small>${descriptions[key]}</small></div><button type="button" data-group="${group}" data-key="${key}" data-delta="-1" aria-label="Decrease ${key}">−</button><output aria-label="${label(key)} rating" data-rating="${key}">${value}</output><button type="button" data-group="${group}" data-key="${key}" data-delta="1" aria-label="Increase ${key}">+</button></div>`).join('');}
  function summary(group:AllocationGroup){return `<section class="creation-summary"><h2>${label(group)}</h2>${Object.entries(draft[group]).map(([key,value])=>`<p><span>${label(key)}</span><strong>${value}</strong></p>`).join('')}</section>`;}
  function updateAllocation(){
    const focused=document.activeElement;
    root.querySelectorAll<HTMLButtonElement>('button[data-delta]').forEach(button=>{
      const group=button.dataset.group as AllocationGroup,key=button.dataset.key!,delta=Number(button.dataset.delta);
      const value=(draft[group] as Record<string,number>)[key];
      button.disabled=delta<0?value===(group==='attributes'?1:0):value===5||remainingPoints(draft,group)===0;
      root.querySelector(`[data-rating="${key}"]`)!.textContent=String(value);
    });
    const group=step===0?'attributes':'skills';
    const counter=root.querySelector('[data-points]');if(counter)counter.textContent=`${remainingPoints(draft,group)} points left`;
    const statsElement=root.querySelector('.creation-derived');if(statsElement)statsElement.outerHTML=stats();
    const next=root.querySelector<HTMLButtonElement>('[data-creation-action="next"], [data-creation-action="begin"]');if(next)next.disabled=!readyForNext();
    if(focused instanceof HTMLButtonElement && focused.disabled && focused.dataset.key){
      root.querySelector<HTMLButtonElement>(`[data-key="${focused.dataset.key}"][data-delta="${focused.dataset.delta==='1'?'-1':'1'}"]`)?.focus({preventScroll:true});
    }
  }
  function render(focus=true,changed=false){
    if(confirming){
      body.innerHTML=`<div class="eyebrow">A FRESH START</div><h1 tabindex="-1">Begin again?</h1><p class="description">Starting over will replace your saved adventure.</p>${changed?'<p class="creation-notice">Your saved adventure changed. Confirm again to replace it.</p>':''}`;
      actions.innerHTML=`<button type="button" data-creation-action="cancel-confirm">Cancel</button><button type="button" class="primary" data-creation-action="confirm" ${!confirmReady||pending?'disabled':''}>Start Over</button>`;
      if(changed)live.textContent='Your saved adventure changed. Confirm again to replace it.';
      if(focus)actions.querySelector<HTMLButtonElement>('button')!.focus();
      body.scrollTop=0;return;
    }
    const progress=['Attributes','Skills','Review'].map((text,index)=>`<span ${step===index?'aria-current="step"':''}>${index+1} ${text}</span>`).join('<span aria-hidden="true"> / </span>');
    const heading=step===0?'Who will you be?':step===1?'Choose your skills.':'';
    body.innerHTML=`<nav class="creation-progress" aria-label="Creation progress">${progress}</nav><h1 tabindex="-1" data-review-name>${heading}</h1>${step===0?`<p class="description">Give your hero a name and a starting build.</p><label class="creation-name">Character name<input type="text" id="character-name" maxlength="24" autocomplete="off" required></label>`:step===1?'<p class="description">Decide where your strengths will lie.</p>':'<p class="description">Your starting character</p>'}${step<2?`<div class="creation-group-title"><h2>${step===0?'Attributes':'Skills'}</h2><span data-points aria-label="${step===0?'Attribute':'Skill'} points remaining"></span></div><p class="creation-rule">Start at ${step===0?1:0}. Spend 5 points. Maximum 5.</p>${rows(step===0?'attributes':'skills')}`:''}${stats()}${step===1?'<p class="creation-rule">Combat may stay at 0. For now, only melee is playable.</p>':''}${step===2?`${summary('attributes')}${summary('skills')}<p class="creation-rule">You can change these before you begin. During the adventure, this sheet is read-only.</p>`:''}`;
    if(step===2)body.querySelector('[data-review-name]')!.textContent=draft.name.trim();
    const input=body.querySelector<HTMLInputElement>('input');if(input)input.value=draft.name;
    actions.innerHTML=`<button type="button" data-creation-action="${step?'back':'cancel'}">${step?'Back':'Cancel'}</button><button type="button" class="primary" data-creation-action="${step===2?'begin':'next'}">${step===0?'Next: skills':step===1?'Review character':'Begin adventure'}</button>`;
    updateAllocation();body.scrollTop=0;
    if(focus)(step===0?input:body.querySelector<HTMLElement>('h1'))?.focus({preventScroll:true});
  }
  root.addEventListener('input',event=>{
    if(event.target instanceof HTMLInputElement && event.target.id==='character-name'){
      draft={...draft,name:event.target.value};
      root.querySelector<HTMLButtonElement>('[data-creation-action="next"]')!.disabled=!readyForNext();
    }
  },{signal:controller.signal});
  root.addEventListener('pointerdown',event=>{
    const button=(event.target as Element).closest<HTMLButtonElement>('button');
    pointerAllowed=!!button&&!button.disabled&&!pending;
  },{capture:true,signal:controller.signal});
  root.addEventListener('pointercancel',()=>{pointerAllowed=false;},{signal:controller.signal});
  root.addEventListener('click',event=>{
    const button=(event.target as Element).closest<HTMLButtonElement>('button');if(!button||button.disabled||pending||(event.detail>0&&!pointerAllowed))return;
    pointerAllowed=false;
    if(button.dataset.delta){
      const change={group:button.dataset.group,key:button.dataset.key,delta:Number(button.dataset.delta)} as AllocationChange;
      const next=allocatePoint(draft,change);if(next===draft)return;draft=next;updateAllocation();
      live.textContent=`${label(change.key)} ${(draft[change.group] as Record<string,number>)[change.key]}. ${remainingPoints(draft,change.group)} points left. Health ${deriveStats(draft).maxHp}. Attack ${getMeleePools(draft).attack} dice.`;
      return;
    }
    switch(button.dataset.creationAction){
      case 'next': if(readyForNext()&&step<2){step++;render();}break;
      case 'back': if(step>0){step--;render();}break;
      case 'cancel': callbacks.onCancel();break;
      case 'cancel-confirm': confirming=false;render();break;
      case 'begin': {const character=finishCharacter(draft);if(!confirming&&step===2&&character)callbacks.onBegin(character);break;}
      case 'confirm': {const character=finishCharacter(draft);if(confirming&&confirmReady&&character)callbacks.onConfirm(character);break;}
    }
  },{signal:controller.signal});
  render();
  return {
    showOverwriteConfirmation(changed=false){
      confirming=true;confirmReady=false;pointerAllowed=false;window.clearTimeout(confirmTimer);render(true,changed);
      confirmTimer=window.setTimeout(()=>{confirmReady=true;if(!pending&&confirming)actions.querySelector<HTMLButtonElement>('[data-creation-action="confirm"]')!.disabled=false;},300);
    },
    setPending(value:boolean){
      pending=value;root.setAttribute('aria-busy',String(value));
      root.querySelectorAll<HTMLInputElement|HTMLButtonElement>('input,button').forEach(element=>{element.disabled=value;});
      if(!value){if(confirming)actions.querySelector<HTMLButtonElement>('[data-creation-action="confirm"]')!.disabled=!confirmReady;else updateAllocation();}
    },
    destroy(){window.clearTimeout(confirmTimer);controller.abort();root.removeAttribute('aria-busy');root.replaceChildren();},
  };
}
