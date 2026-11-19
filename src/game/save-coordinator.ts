export interface SaveLocks {
  request<T>(name:string,operation:()=>T|PromiseLike<T>):Promise<T>;
}

// Each page queues its own operations; the browser lock serializes other pages.
// If locks are unavailable, the operation can still play but must not persist.
export function createSaveCoordinator(locks:SaveLocks|undefined,name:string){
  let available=!!locks,queue=Promise.resolve();
  return {
    run<T>(operation:(canWrite:boolean)=>T|PromiseLike<T>):Promise<T>{
      const result=queue.then(async()=>{
        if(!available)return operation(false);
        let entered=false;
        try{return await locks!.request(name,()=>{entered=true;return operation(true);});}
        catch(error){if(entered)throw error;available=false;return operation(false);}
      });
      queue=result.then(()=>undefined,()=>undefined);
      return result;
    },
  };
}
