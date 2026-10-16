// OCR stays sequential; only screened vision pages share these three slots.
export function visionPageQueue(limit=3){
 const pending=new Set();let failure;
 const check=()=>{if(failure)throw failure;};
 return {
  get error(){return failure;},
  check,
  async add(read){
   check();while(pending.size>=limit){await Promise.race(pending);check();}
   let task;task=Promise.resolve().then(read).catch(error=>{failure??=error;}).finally(()=>pending.delete(task));pending.add(task);
  },
  async finish(){await Promise.all(pending);check();},
  async settle(){await Promise.all(pending);},
 };
}
