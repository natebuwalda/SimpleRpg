// A destructive action needs a fresh press after the confirmation becomes ready.
export function mountConfirmation(root:HTMLElement,options:{title:string;message:string;confirm:string;cancel:string;onConfirm():void;onCancel():void}){
 const controller=new AbortController();let ready=false,pending=false,pointer=false;
 root.innerHTML='<section class="confirmation"><h1 tabindex="-1"></h1><p class="description"></p><div class="actions"><button class="primary" data-cancel></button><button class="danger" data-confirm disabled></button></div><p role="status" aria-label="Confirmation status"></p></section>';
 root.querySelector('h1')!.textContent=options.title;root.querySelector('.description')!.textContent=options.message;
 const cancel=root.querySelector<HTMLButtonElement>('[data-cancel]')!,confirm=root.querySelector<HTMLButtonElement>('[data-confirm]')!;
 cancel.textContent=options.cancel;confirm.textContent=options.confirm;cancel.focus();
 const signal=controller.signal;
 root.addEventListener('pointerdown',e=>{pointer=ready&&!pending&&!(e.target as HTMLButtonElement).disabled;},{capture:true,signal});
 root.addEventListener('pointercancel',()=>{pointer=false;},{signal});
 root.addEventListener('keydown',e=>{if((e.key==='Enter'||e.key===' ')&&(e.repeat||!ready||pending))e.preventDefault();},{signal});
 root.addEventListener('click',e=>{
  const button=(e.target as Element).closest('button');if(!button||button.disabled||pending)return;
  if(button===cancel){options.onCancel();return;}
  if(!ready||(e.detail>0&&!pointer)||document.hidden)return;
  pointer=false;options.onConfirm();
 },{signal});
 window.addEventListener('blur',()=>{pointer=false;},{signal});
 const timer=window.setTimeout(()=>{ready=true;confirm.disabled=pending;},300);
 return {setPending(value:boolean){pending=value;cancel.disabled=value;confirm.disabled=value||!ready;},showMessage(message:string){root.querySelector('[role="status"]')!.textContent=message;},destroy(){clearTimeout(timer);controller.abort();root.replaceChildren();}};
}
