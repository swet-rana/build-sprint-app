import {authClient} from './auth-client.js';
import {api} from '../convex/_generated/api';
// No provider request or provider key ever enters the browser.
export function visionReading(reportIds){
 const url=import.meta.env.VITE_CONVEX_URL,sessionKey=localStorage.getItem('health-history-upload-session');
 if(!url||!sessionKey)return null;
 const client=authClient();let reading;
 return async(canvas,page,file,diagnostics)=>{
  reading??=client.mutation(api.vision.begin,{sessionKey,reportIds});
  const readingId=await reading;
  const scale=Math.min(1,1600/Math.max(canvas.width,canvas.height)),small=document.createElement('canvas');small.width=Math.round(canvas.width*scale);small.height=Math.round(canvas.height*scale);small.getContext('2d').drawImage(canvas,0,0,small.width,small.height);
  let image=small.toDataURL('image/jpeg',0.85);
  if(image.length>750000)image=small.toDataURL('image/jpeg',0.65);
  small.width=small.height=0;
  try{return await client.action(api.vision.read,{sessionKey,readingId,reportId:file.id,page,image,...(diagnostics?{ocrDiagnostics:JSON.stringify(diagnostics)}:{})});}
  catch(error){let message=error.data??error.message;if(typeof message!=='string')message='Scan reading stopped: the AI service failed. Try again later.';const failure=Error(message);failure.code='VISION_STOP';throw failure;}
 };
}
