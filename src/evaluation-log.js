import {ConvexHttpClient} from 'convex/browser';
import {api} from '../convex/_generated/api';

export function createEvaluationLogger(client,sessionKey,onFailure=error=>console.warn('Evaluation logging failed:',error)){
 return {
  async begin(kind,reportIds,engine){try{return await client.mutation(api.evaluations.begin,{sessionKey,kind,reportIds,engine});}catch(error){onFailure(error);return null;}},
  async finish(runId,output,error){if(!runId)return;try{await client.action(api.evaluations.finish,{sessionKey,runId,...(error?{error:String(error.message||error)}:{outputJson:JSON.stringify(output)})});}catch(failure){onFailure(failure);}},
 };
}
export function evaluationLogger(){
 const url=import.meta.env.VITE_CONVEX_URL,sessionKey=localStorage.getItem('health-history-upload-session');
 return url&&sessionKey?createEvaluationLogger(new ConvexHttpClient(url),sessionKey):{begin:async()=>null,finish:async()=>{}};
}
