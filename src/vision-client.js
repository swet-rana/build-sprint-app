import {encodeScanImage} from './scan-image.js';
import {authClient} from './auth-client.js';
import {api} from '../convex/_generated/api';
export const VISION_FAILURE="We couldn't finish reading this report. Tap Try again.";
const stateKey=()=>`healthstats-pending-vision:${import.meta.env.VITE_CONVEX_URL}:${localStorage.getItem('health-history-upload-session')}`;
export function savedVisionReading(reportIds){
 try{const state=JSON.parse(localStorage.getItem(stateKey())||'null');return state&&JSON.stringify(state.reportIds)===JSON.stringify(reportIds)?state:null;}catch{return null;}
}
function save(state){try{localStorage.setItem(stateKey(),JSON.stringify(state));}catch{}}
export function finishVisionReading(reportIds,failed=false){
 const state=savedVisionReading(reportIds);if(!state)return;
 if(failed)save({...state,status:'failed'});else localStorage.removeItem(stateKey());
}
// The query owns the page status/result. Closing a tab never cancels its server action.
export function awaitVisionJob(client,sessionKey,jobId,onStatus=()=>{}){
 return new Promise((resolve,reject)=>{
  const watch=client.watchQuery(api.visionJobs.get,{sessionKey,jobId});let stop=()=>{};
  const update=()=>{try{
   const job=watch.localQueryResult();if(job===undefined)return;
   if(!job){stop();reject(Error(VISION_FAILURE));return;}
   onStatus({...job,jobId});
   if(job.status==='succeeded'){stop();resolve(job.result);}
   else if(job.status==='failed'){stop();reject(Error(VISION_FAILURE));}
  }catch{stop();reject(Error(VISION_FAILURE));}};
  stop=watch.onUpdate(update);update();
 });
}
// No provider request or provider key ever enters the browser.
export function visionReading(reportIds,{onStatus=()=>{},resume=false}={}){
 const url=import.meta.env.VITE_CONVEX_URL,sessionKey=localStorage.getItem('health-history-upload-session');
 if(!url||!sessionKey)return null;
 const client=authClient();let reading,state=savedVisionReading(reportIds);
 if(!resume&&state&&Date.now()-state.startedAt>3600000)state=null;
 return async(canvas,page,file,diagnostics)=>{
  state??={reportIds,requestKey:crypto.randomUUID(),status:'reading',startedAt:Date.now()};save({...state,status:'reading'});
  reading??=client.mutation(api.vision.begin,{sessionKey,reportIds,requestKey:state.requestKey});
  try{
   const readingId=await reading;state={...state,readingId,status:'reading'};save(state);
   const {image,metadata}=await encodeScanImage(canvas);console.info('Scan page image',{page,...metadata});
   const jobId=await client.mutation(api.visionJobs.enqueue,{sessionKey,readingId,reportId:file.id,page,image,imageMetadata:metadata,retry:!resume,...(diagnostics?{ocrDiagnostics:JSON.stringify(diagnostics)}:{})});
   return await awaitVisionJob(client,sessionKey,jobId,onStatus);
  }catch{const failure=Error(VISION_FAILURE);failure.code='VISION_STOP';throw failure;}
 };
}
