import {withoutPatientNames} from '../src/private-log.js';
import {v,ConvexError} from 'convex/values';
import {getAuthUserId} from '@convex-dev/auth/server';
import {action,mutation,internalMutation} from './_generated/server';
import {internal,api} from './_generated/api';
import type {Id} from './_generated/dataModel';
import type {ActionCtx} from './_generated/server';
import {isSessionKey,matchesFileType} from './fileRules.js';
import {DAILY_VISION_PAGES} from '../src/vision-limits.js';
import {VISION_MODEL,VISION_PROMPT,VISION_SCHEMA,validateScan,visionDay,visionLimitError} from './visionRules.js';
export const scanValidator=v.object({reportKind:v.union(v.literal('blood'),v.literal('semen'),v.literal('urine'),v.literal('stool'),v.literal('other')),specimen:v.optional(v.union(v.literal('blood'),v.literal('semen'),v.literal('urine'),v.literal('stool'),v.literal('other'),v.literal('unknown'))),originalReportKind:v.optional(v.literal('other')),patientName:v.union(v.string(),v.null()),reportDate:v.union(v.string(),v.null()),tests:v.array(v.object({name:v.string(),value:v.union(v.string(),v.null()),unit:v.union(v.string(),v.null()),referenceRange:v.union(v.string(),v.null()),readable:v.boolean(),sourceTop:v.union(v.number(),v.null())}))});
export const begin=mutation({args:{sessionKey:v.string(),reportIds:v.array(v.id('reports')),requestKey:v.optional(v.string()),retry:v.optional(v.boolean())},returns:v.id('visionReadings'),handler:async(ctx,{sessionKey,reportIds,requestKey,retry})=>{
 if(!isSessionKey(sessionKey)||!reportIds.length||reportIds.length>10)throw new ConvexError('Invalid scan reading request.');
 for(const id of reportIds){const r=await ctx.db.get('reports',id);if(!r||r.sessionKey!==sessionKey||r.deleted)throw new ConvexError('Report not found in this browser.');}
 const userId=await getAuthUserId(ctx),owner=userId?`user:${userId}`:`browser:${sessionKey}`;
 if(requestKey){
  if(requestKey.length>100)throw new ConvexError('Invalid scan request key.');
  const previous=await ctx.db.query('visionReadings').withIndex('by_session_request',q=>q.eq('sessionKey',sessionKey).eq('requestKey',requestKey)).first();
  if(previous){if(previous.owner!==owner||JSON.stringify(previous.reportIds)!==JSON.stringify(reportIds))throw new ConvexError('Invalid scan reading request.');if(retry&&Date.now()-previous.createdAt>3600000)await ctx.db.patch('visionReadings',previous._id,{createdAt:Date.now()});return previous._id;}
 }
 return ctx.db.insert('visionReadings',{sessionKey,owner,reportIds,pages:0,createdAt:Date.now(),...(requestKey?{requestKey}:{})});
}});
export const reserve=internalMutation({args:{sessionKey:v.string(),readingId:v.id('visionReadings'),reportId:v.id('reports'),page:v.number(),jobId:v.optional(v.id('visionJobs'))},returns:v.id('evaluationRuns'),handler:async(ctx,{sessionKey,readingId,reportId,page,jobId})=>{
 const reading=await ctx.db.get('visionReadings',readingId),report=await ctx.db.get('reports',reportId),userId=await getAuthUserId(ctx);
 const job=jobId?await ctx.db.get('visionJobs',jobId):null;
 if(jobId&&(!job||job.sessionKey!==sessionKey||job.readingId!==readingId||job.reportId!==reportId||job.page!==page||job.status!=='reading'||!job.startedAt))throw new ConvexError('Invalid scheduled scan job.');
 // Scheduled functions have no browser auth context: ownership was checked by enqueue.
 const owner=job?reading?.owner:userId?`user:${userId}`:`browser:${sessionKey}`;
 if(!isSessionKey(sessionKey)||!reading||reading.sessionKey!==sessionKey||reading.owner!==owner||!reading.reportIds.includes(reportId)||!report||report.sessionKey!==sessionKey||report.deleted||!Number.isInteger(page)||page<1||page>100||Date.now()-reading.createdAt>3600000)throw new ConvexError('This scan reading expired or the report is unavailable. Prepare the summary again.');
 const day=visionDay(Date.now()),daily=await ctx.db.query('visionAppDaily').withIndex('by_day',q=>q.eq('day',day)).first();
 // Include reservations made under the old per-user limit earlier today. This
 // migration is bounded and conservative: 401 nonzero legacy owners already exceed the cap.
 const used=daily?.pages??(await ctx.db.query('visionDaily').withIndex('by_day',q=>q.eq('day',day)).take(DAILY_VISION_PAGES+1)).reduce((sum,row)=>sum+row.calls,0);
 const limit=visionLimitError(reading.pages,used);if(limit)throw new ConvexError(limit);
 // Both counters are reserved in the same Convex transaction, before any provider IO.
 await ctx.db.patch('visionReadings',readingId,{pages:reading.pages+1});
 if(daily)await ctx.db.patch('visionAppDaily',daily._id,{pages:used+1});else await ctx.db.insert('visionAppDaily',{day,pages:used+1});
 return ctx.db.insert('evaluationRuns',{sessionKey,kind:'report-reading',reportIds:[reportId],engine:`OpenAI ${VISION_MODEL} vision / page ${page}`,inputs:[{reportId,storageId:report.storageId,name:report.name,contentType:report.contentType,contentHash:report.contentHash??null}],status:'running',startedAt:Date.now()});
}});
export const readArgs={sessionKey:v.string(),readingId:v.id('visionReadings'),reportId:v.id('reports'),page:v.number(),image:v.string(),ocrDiagnostics:v.optional(v.string()),imageMetadata:v.optional(v.object({width:v.number(),height:v.number(),sourceWidth:v.number(),sourceHeight:v.number(),fileType:v.string(),byteSize:v.number(),dataUrlCharacters:v.number()}))};
// Retained for existing diagnostics; the application uses the durable job mutation.
export const read=action({args:readArgs,returns:scanValidator,handler:(ctx,args)=>readPage(ctx,args)});
export async function readPage(ctx:ActionCtx,{sessionKey,readingId,reportId,page,image,ocrDiagnostics,imageMetadata}:any,jobId?:Id<'visionJobs'>):Promise<any>{
 if(!process.env.OPENAI_API_KEY)throw new ConvexError('Scan reading is unavailable: the server API key is missing.');
 const payload=image.split(',')[1]??'',imageCheck={page,width:imageMetadata?.width??null,height:imageMetadata?.height??null,fileType:image.match(/^data:([^;,]+)/)?.[1]??'invalid',byteSize:Math.max(0,Math.floor(payload.length*3/4)-(payload.endsWith('==')?2:payload.endsWith('=')?1:0)),dataUrlCharacters:image.length};
 const rejected=image.length>750000||!/^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(image);
 console.info('Scan image check',{...imageCheck,rejected,rule:'image.length>750000 || !/^data:image\\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(image)'});
 if(rejected){
  const error='The scan image is too large or invalid. Upload a smaller clear copy.';
  try{const runId=await ctx.runMutation(api.evaluations.begin,{sessionKey,kind:'report-reading',reportIds:[reportId],engine:`Vision image validation / page ${page}`});const outputStorageId=await ctx.storage.store(new Blob([JSON.stringify({imageCheck,rejected:true,rule:'image.length>750000 || !/^data:image\\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(image)'})],{type:'application/json'}));await ctx.runMutation(internal.evaluations.complete,{sessionKey,runId,outputStorageId,error});}catch{console.warn('Scan image rejection log could not be saved.');}
  throw new ConvexError(error);
 }
 const bytes=Uint8Array.from(atob(image.split(',')[1]),c=>c.charCodeAt(0));if(!matchesFileType(bytes,'image/jpeg'))throw new ConvexError('Invalid scan image.');
 if(ocrDiagnostics&&(ocrDiagnostics.length>100000||!JSON.parse(ocrDiagnostics)))throw new ConvexError('Invalid OCR details.');
 const runId=await ctx.runMutation(internal.vision.reserve,{sessionKey,readingId,reportId,page,...(jobId?{jobId}:{})});
 let imageStorageId:Id<"_storage">|undefined,rawResponse:any,request:any,validationFailed=false;
 try{
  imageStorageId=await ctx.storage.store(new Blob([bytes],{type:'image/jpeg'}));
  request={model:VISION_MODEL,store:false,input:[{role:'user',content:[{type:'input_text',text:VISION_PROMPT},{type:'input_image',image_url:image,detail:'high'}]}],text:{format:{type:'json_schema',name:'medical_scan',strict:true,schema:VISION_SCHEMA}},max_output_tokens:10000};
  const response=await fetch('https://api.openai.com/v1/responses',{method:'POST',headers:{Authorization:`Bearer ${process.env.OPENAI_API_KEY}`,'Content-Type':'application/json'},body:JSON.stringify(request),signal:AbortSignal.timeout(90000)});
  rawResponse=await response.json();
  if(!response.ok)throw Error(`Scan reading stopped: the AI service could not read this page (API ${response.status}). Try again later.`);
  if(rawResponse.status!=='completed')throw Error('Scan reading stopped: the AI service did not finish this page. Try again.');
  const text=rawResponse.output?.flatMap((item:any)=>item.content??[]).filter((part:any)=>part.type==='output_text').map((part:any)=>part.text).join('');
  if(!text)throw Error('Scan reading stopped: the AI service returned no readable results. Upload a clearer copy.');
  let result;try{result=validateScan(JSON.parse(text));}catch(error){validationFailed=true;throw error;}
  await save({result});return result;
 }catch(error){const message=error instanceof Error?error.message:'Unknown scan reading error';await save({error:message});throw new ConvexError(validationFailed?`We couldn't read some rows on page ${page}`:message.startsWith('Scan reading stopped:')?message:'Scan reading stopped: the AI service failed. Try again later.');}
 async function save(outcome:object){
  const loggedRequest=request?{...request,input:[{role:'user',content:[{type:'input_text',text:VISION_PROMPT},{type:'input_image',storageId:imageStorageId,detail:'high'}]}]}:null;
  const outputStorageId=await ctx.storage.store(new Blob([JSON.stringify(withoutPatientNames({imageCheck,page,imageStorageId: imageStorageId??null,ocrDiagnostics:ocrDiagnostics?JSON.parse(ocrDiagnostics):null,request:loggedRequest,rawResponse:rawResponse??null,...outcome}))],{type:'application/json'}));
  await ctx.runMutation(internal.evaluations.complete,{sessionKey,runId,outputStorageId,...('error' in outcome?{error:String(outcome.error)}:{})});
 }
}
