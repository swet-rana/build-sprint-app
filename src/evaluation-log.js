import {ConvexHttpClient} from 'convex/browser';
import {api} from '../convex/_generated/api';
import {memoryRetryStore,browserRetryStore} from './evaluation-retry-store.js';

export function createEvaluationLogger(client,sessionKey,onFailure=error=>console.warn('Evaluation logging failed:',error),{store=memoryRetryStore(),schedule=(fn,ms)=>setTimeout(fn,ms),cancel=clearTimeout,makeId=()=>crypto.randomUUID()}={}){
 let running,timer,delay=1000,closed=false,saving=Promise.resolve();
 async function flush(){
  if(closed)return;
  if(running)return running;
  if(timer){cancel(timer);timer=null;}
  running=(async()=>{
   let failed=false;
   for(const job of await store.list()){
    if(job.sessionKey!==sessionKey)continue;
    try{
     if(!job.runId){job.runId=await client.mutation(api.evaluations.begin,{sessionKey,kind:job.kind,reportIds:job.reportIds,engine:job.engine,runKey:job.id});await store.put(job);}
     if(job.result){await client.action(api.evaluations.finish,{sessionKey,runId:job.runId,...job.result});await store.remove(job.id);}
    }catch(error){failed=true;onFailure(error);}
   }
   if(failed&&!closed){timer=schedule(()=>{timer=null;void flush();},delay);timer?.unref?.();delay=Math.min(delay*2,60000);}else delay=1000;
  })().catch(onFailure).finally(()=>{running=null;});
  return running;
 }
 // Serialize saves behind active flushes so a late begin response cannot overwrite a finish.
 function save(job){const pending=saving.then(async()=>{if(running)await running;await store.put(job);await flush();});saving=pending.catch(onFailure);return pending;}
 return {
  async begin(kind,reportIds,engine){const id=makeId();await save({id,sessionKey,kind,reportIds,engine});return id;},
  async finish(id,output,error){if(!id)return;if(running)await running;const job=await store.get(id);if(!job)return;job.result=error?{error:String(error.message||error)}:{outputJson:JSON.stringify(output)};await save(job);},
  flush,dispose(){closed=true;if(timer)cancel(timer);},
 };
}
let active,activeSession;
export function evaluationLogger(){
 const url=import.meta.env.VITE_CONVEX_URL,sessionKey=localStorage.getItem('health-history-upload-session');
 if(!url||!sessionKey)return {begin:async()=>null,finish:async()=>{}};
 if(activeSession!==sessionKey){active?.dispose();activeSession=sessionKey;active=createEvaluationLogger(new ConvexHttpClient(url),sessionKey,undefined,{store:browserRetryStore(error=>console.warn('Evaluation retry storage unavailable:',error))});void active.flush();}
 return active;
}
if(typeof window!=='undefined')window.addEventListener('online',()=>{void evaluationLogger().flush?.();});
