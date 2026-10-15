import {v,ConvexError} from 'convex/values';
import {getAuthUserId} from '@convex-dev/auth/server';
import {mutation,query,internalMutation,internalAction} from './_generated/server';
import type {QueryCtx,MutationCtx} from './_generated/server';
import type {Id} from './_generated/dataModel';
import {internal} from './_generated/api';
import {isSessionKey} from './fileRules.js';
import {readArgs,readPage,scanValidator} from './vision';
export const READING_FAILURE="We couldn't finish reading this report. Tap Try again.";
// Expose the saved operational reason, never a Convex stack trace or arbitrary error payload.
export function failureReason(error=''){
 const quota=error.match(/Scan reading stopped: (?:the limit is \d+ vision pages per summary preparation\. Choose a smaller set of result pages\.|HealthStats has reached its app-wide daily limit of \d+ vision pages\. Try again tomorrow\.)/);
 if(quota)return quota[0];
 const known=['The scan image is too large or invalid. Upload a smaller clear copy.','Invalid scan image.','Invalid OCR details.','This scan reading expired or the report is unavailable. Prepare the summary again.','Scan reading is unavailable: the server API key is missing.','Scheduled scan did not finish within three minutes.','Scan reading stopped: the AI service did not finish this page. Try again.','Scan reading stopped: the AI service returned no readable results. Upload a clearer copy.','Scan reading stopped: the AI service failed. Try again later.'];
 const api=error.match(/Scan reading stopped: the AI service could not read this page \(API \d{3}\)\. Try again later\./);
 return api?.[0]??known.find(reason=>error.includes(reason))??'The server could not finish this page. Try again.';
}
const status=v.union(v.literal('reading'),v.literal('succeeded'),v.literal('failed'));
async function owned(ctx:QueryCtx|MutationCtx,sessionKey:string,readingId:Id<'visionReadings'>){
 const reading=await ctx.db.get('visionReadings',readingId);
 const userId=await getAuthUserId(ctx),owner=userId?`user:${userId}`:`browser:${sessionKey}`;
 if(!isSessionKey(sessionKey)||!reading||reading.sessionKey!==sessionKey||reading.owner!==owner)throw new ConvexError('Report not found in this browser.');
 return reading;
}
export const enqueue=mutation({args:{...readArgs,retry:v.optional(v.boolean())},returns:v.id('visionJobs'),handler:async(ctx,args)=>{
 const reading=await owned(ctx,args.sessionKey,args.readingId),report=await ctx.db.get('reports',args.reportId);
 if(!reading.reportIds.includes(args.reportId)||!report||report.sessionKey!==args.sessionKey||report.deleted||!Number.isInteger(args.page)||args.page<1||args.page>100)throw new ConvexError('Report not found in this browser.');
 if(args.image.length>750000||args.ocrDiagnostics&&args.ocrDiagnostics.length>100000)throw new ConvexError(READING_FAILURE);
 const previous=await ctx.db.query('visionJobs').withIndex('by_reading_report_page',q=>q.eq('readingId',args.readingId).eq('reportId',args.reportId).eq('page',args.page)).unique();
 if(previous&&(previous.status!=='failed'||!args.retry))return previous._id;
 const {retry,...request}=args,attempt=(previous?.attempt??0)+1;
 let jobId:Id<'visionJobs'>;
 if(previous){jobId=previous._id;await ctx.db.patch('visionJobs',jobId,{...request,status:'reading',attempt,startedAt:undefined,finishedAt:undefined,result:undefined,error:undefined});}
 else jobId=await ctx.db.insert('visionJobs',{...request,status:'reading',attempt,createdAt:Date.now()});
 await ctx.scheduler.runAfter(0,internal.visionJobs.run,{jobId,attempt});
 // A killed/timed-out scheduled action must not leave the screen stuck forever.
 await ctx.scheduler.runAfter(180000,internal.visionJobs.expire,{jobId,attempt});
 return jobId;
}});
export const get=query({args:{sessionKey:v.string(),jobId:v.id('visionJobs')},returns:v.union(v.null(),v.object({status,attempt:v.number(),reportId:v.id('reports'),page:v.number(),result:v.optional(scanValidator),error:v.optional(v.string()),failureReason:v.optional(v.string())})),handler:async(ctx,{sessionKey,jobId})=>{
 const job=await ctx.db.get('visionJobs',jobId);if(!job||job.sessionKey!==sessionKey)return null;
 await owned(ctx,sessionKey,job.readingId);
 const report=await ctx.db.get('reports',job.reportId);if(!report||report.deleted||report.sessionKey!==sessionKey)return null;
 return {status:job.status,attempt:job.attempt,reportId:job.reportId,page:job.page,...(job.status==='succeeded'?{result:job.result}:{}),...(job.status==='failed'?{error:READING_FAILURE,failureReason:failureReason(job.error)}:{})};
}});
export const statuses=query({args:{sessionKey:v.string(),readingId:v.id('visionReadings')},returns:v.array(v.object({jobId:v.id('visionJobs'),reportId:v.id('reports'),page:v.number(),status})),handler:async(ctx,{sessionKey,readingId})=>{
 await owned(ctx,sessionKey,readingId);
 const jobs=await ctx.db.query('visionJobs').withIndex('by_reading',q=>q.eq('readingId',readingId)).take(1000);
 return jobs.map(j=>({jobId:j._id,reportId:j.reportId,page:j.page,status:j.status}));
}});
export const claim=internalMutation({args:{jobId:v.id('visionJobs'),attempt:v.number()},returns:v.union(v.null(),v.any()),handler:async(ctx,{jobId,attempt})=>{
 const job=await ctx.db.get('visionJobs',jobId);
 if(!job||job.attempt!==attempt||job.status!=='reading'||job.startedAt)return null;
 await ctx.db.patch('visionJobs',jobId,{startedAt:Date.now()});return job;
}});
export const finish=internalMutation({args:{jobId:v.id('visionJobs'),attempt:v.number(),result:v.optional(scanValidator),error:v.optional(v.string())},returns:v.null(),handler:async(ctx,{jobId,attempt,result,error})=>{
 const job=await ctx.db.get('visionJobs',jobId);if(!job||job.attempt!==attempt||job.status!=='reading')return null;
 await ctx.db.patch('visionJobs',jobId,{status:error?'failed':'succeeded',...(result?{result}:{}),...(error?{error:error.slice(0,10000)}:{}),finishedAt:Date.now(),image:undefined,ocrDiagnostics:undefined});return null;
}});
export const expire=internalMutation({args:{jobId:v.id('visionJobs'),attempt:v.number()},returns:v.null(),handler:async(ctx,{jobId,attempt})=>{
 const job=await ctx.db.get('visionJobs',jobId);if(job?.attempt===attempt&&job.status==='reading')await ctx.db.patch('visionJobs',jobId,{status:'failed',error:'Scheduled scan did not finish within three minutes.',finishedAt:Date.now(),image:undefined,ocrDiagnostics:undefined});return null;
}});
export const run=internalAction({args:{jobId:v.id('visionJobs'),attempt:v.number()},returns:v.null(),handler:async(ctx,{jobId,attempt}):Promise<null>=>{
 const job=await ctx.runMutation(internal.visionJobs.claim,{jobId,attempt});if(!job)return null;
 try{const result=await readPage(ctx,job,jobId);await ctx.runMutation(internal.visionJobs.finish,{jobId,attempt,result});}
 catch(error){await ctx.runMutation(internal.visionJobs.finish,{jobId,attempt,error:error instanceof Error?error.message:String(error)});}return null;
}});
