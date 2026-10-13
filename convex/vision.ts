import {v,ConvexError} from 'convex/values';
import {getAuthUserId} from '@convex-dev/auth/server';
import {action,mutation,internalMutation} from './_generated/server';
import {internal} from './_generated/api';
import type {Id} from './_generated/dataModel';
import {isSessionKey,matchesFileType} from './fileRules.js';
import {VISION_MODEL,VISION_PROMPT,VISION_SCHEMA,validateScan,visionDay,visionLimitError} from './visionRules.js';
const scanValidator=v.object({reportKind:v.union(v.literal('blood'),v.literal('semen'),v.literal('other')),patientName:v.union(v.string(),v.null()),reportDate:v.union(v.string(),v.null()),tests:v.array(v.object({name:v.string(),value:v.union(v.string(),v.null()),unit:v.union(v.string(),v.null()),referenceRange:v.union(v.string(),v.null()),readable:v.boolean(),sourceTop:v.union(v.number(),v.null())}))});
export const begin=mutation({args:{sessionKey:v.string(),reportIds:v.array(v.id('reports'))},returns:v.id('visionReadings'),handler:async(ctx,{sessionKey,reportIds})=>{
 if(!isSessionKey(sessionKey)||!reportIds.length||reportIds.length>10)throw new ConvexError('Invalid scan reading request.');
 for(const id of reportIds){const r=await ctx.db.get('reports',id);if(!r||r.sessionKey!==sessionKey||r.deleted)throw new ConvexError('Report not found in this browser.');}
 const userId=await getAuthUserId(ctx),owner=userId?`user:${userId}`:`browser:${sessionKey}`;
 return ctx.db.insert('visionReadings',{sessionKey,owner,reportIds,pages:0,createdAt:Date.now()});
}});
export const reserve=internalMutation({args:{sessionKey:v.string(),readingId:v.id('visionReadings'),reportId:v.id('reports'),page:v.number()},returns:v.id('evaluationRuns'),handler:async(ctx,{sessionKey,readingId,reportId,page})=>{
 const reading=await ctx.db.get('visionReadings',readingId),report=await ctx.db.get('reports',reportId),userId=await getAuthUserId(ctx),owner=userId?`user:${userId}`:`browser:${sessionKey}`;
 if(!isSessionKey(sessionKey)||!reading||reading.sessionKey!==sessionKey||reading.owner!==owner||!reading.reportIds.includes(reportId)||!report||report.sessionKey!==sessionKey||report.deleted||!Number.isInteger(page)||page<1||page>100||Date.now()-reading.createdAt>3600000)throw new ConvexError('This scan reading expired or the report is unavailable. Prepare the summary again.');
 const day=visionDay(Date.now()),daily=await ctx.db.query('visionDaily').withIndex('by_owner_day',q=>q.eq('owner',owner).eq('day',day)).first();
 const limit=visionLimitError(reading.pages,daily?.calls??0);if(limit)throw new ConvexError(limit);
 await ctx.db.patch('visionReadings',readingId,{pages:reading.pages+1});
 if(daily)await ctx.db.patch('visionDaily',daily._id,{calls:daily.calls+1});else await ctx.db.insert('visionDaily',{owner,day,calls:1});
 return ctx.db.insert('evaluationRuns',{sessionKey,kind:'report-reading',reportIds:[reportId],engine:`OpenAI ${VISION_MODEL} vision / page ${page}`,inputs:[{reportId,storageId:report.storageId,name:report.name,contentType:report.contentType,contentHash:report.contentHash??null}],status:'running',startedAt:Date.now()});
}});
export const read=action({args:{sessionKey:v.string(),readingId:v.id('visionReadings'),reportId:v.id('reports'),page:v.number(),image:v.string(),ocrDiagnostics:v.optional(v.string())},returns:scanValidator,handler:async(ctx,{sessionKey,readingId,reportId,page,image,ocrDiagnostics}):Promise<any>=>{
 if(!process.env.OPENAI_API_KEY)throw new ConvexError('Scan reading is unavailable: the server API key is missing.');
 if(image.length>750000||!/^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(image))throw new ConvexError('The scan image is too large or invalid. Upload a smaller clear copy.');
 const bytes=Uint8Array.from(atob(image.split(',')[1]),c=>c.charCodeAt(0));if(!matchesFileType(bytes,'image/jpeg'))throw new ConvexError('Invalid scan image.');
 if(ocrDiagnostics&&(ocrDiagnostics.length>100000||!JSON.parse(ocrDiagnostics)))throw new ConvexError('Invalid OCR details.');
 const runId=await ctx.runMutation(internal.vision.reserve,{sessionKey,readingId,reportId,page});
 let imageStorageId:Id<"_storage">|undefined,rawResponse:any,request:any;
 try{
  imageStorageId=await ctx.storage.store(new Blob([bytes],{type:'image/jpeg'}));
  request={model:VISION_MODEL,store:false,input:[{role:'user',content:[{type:'input_text',text:VISION_PROMPT},{type:'input_image',image_url:image,detail:'high'}]}],text:{format:{type:'json_schema',name:'medical_scan',strict:true,schema:VISION_SCHEMA}},max_output_tokens:10000};
  const response=await fetch('https://api.openai.com/v1/responses',{method:'POST',headers:{Authorization:`Bearer ${process.env.OPENAI_API_KEY}`,'Content-Type':'application/json'},body:JSON.stringify(request),signal:AbortSignal.timeout(90000)});
  rawResponse=await response.json();
  if(!response.ok)throw Error(`Scan reading stopped: the AI service could not read this page (API ${response.status}). Try again later.`);
  if(rawResponse.status!=='completed')throw Error('Scan reading stopped: the AI service did not finish this page. Try again.');
  const text=rawResponse.output?.flatMap((item:any)=>item.content??[]).filter((part:any)=>part.type==='output_text').map((part:any)=>part.text).join('');
  if(!text)throw Error('Scan reading stopped: the AI service returned no readable results. Upload a clearer copy.');
  const result=validateScan(JSON.parse(text));
  await save({result});return result;
 }catch(error){const message=error instanceof Error?error.message:'Unknown scan reading error';await save({error:message});throw new ConvexError(message.startsWith('Scan reading stopped:')?message:'Scan reading stopped: the AI service failed. Try again later.');}
 async function save(outcome:object){
  const loggedRequest=request?{...request,input:[{role:'user',content:[{type:'input_text',text:VISION_PROMPT},{type:'input_image',storageId:imageStorageId,detail:'high'}]}]}:null;
  const outputStorageId=await ctx.storage.store(new Blob([JSON.stringify({page,imageStorageId: imageStorageId??null,ocrDiagnostics:ocrDiagnostics?JSON.parse(ocrDiagnostics):null,request:loggedRequest,rawResponse:rawResponse??null,...outcome})],{type:'application/json'}));
  await ctx.runMutation(internal.evaluations.complete,{sessionKey,runId,outputStorageId,...('error' in outcome?{error:String(outcome.error)}:{})});
 }
}});
