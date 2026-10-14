import {encodeScanImage} from './scan-image.js';
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
  let encoded;
  try{encoded=await encodeScanImage(canvas);}catch(error){error.code='VISION_STOP';throw error;}
  const {image,metadata}=encoded;console.info('Scan page image',{page,...metadata});
  try{return await client.action(api.vision.read,{sessionKey,readingId,reportId:file.id,page,image,imageMetadata:metadata,...(diagnostics?{ocrDiagnostics:JSON.stringify(diagnostics)}:{})});}
  catch(error){let message=error.data??error.message;if(typeof message!=='string')message='Scan reading stopped: the AI service failed. Try again later.';const failure=Error(message);failure.code='VISION_STOP';throw failure;}
 };
}
