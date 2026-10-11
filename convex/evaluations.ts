import {v,ConvexError} from 'convex/values';
import {mutation,action,query,internalQuery,internalMutation} from './_generated/server';
import {internal} from './_generated/api';
import {isSessionKey} from './fileRules.js';

export const begin=mutation({
 args:{sessionKey:v.string(),kind:v.union(v.literal('report-reading'),v.literal('summary')),reportIds:v.array(v.id('reports')),engine:v.string(),runKey:v.optional(v.string())},
 returns:v.id('evaluationRuns'),
 handler:async(ctx,args)=>{
  if(!isSessionKey(args.sessionKey)||args.reportIds.length<1||args.reportIds.length>10||args.engine.length>200)throw new ConvexError('Invalid evaluation request.');
  if(args.runKey){if(args.runKey.length>100)throw new ConvexError('Invalid retry key.');const existing=await ctx.db.query('evaluationRuns').withIndex('by_session_run',q=>q.eq('sessionKey',args.sessionKey).eq('runKey',args.runKey)).first();if(existing)return existing._id;}
  const inputs=[];
  for(const id of args.reportIds){const report=await ctx.db.get('reports',id);if(!report||report.sessionKey!==args.sessionKey||report.deleted)throw new ConvexError('Report not found in this browser.');inputs.push({reportId:id,storageId:report.storageId,name:report.name,contentType:report.contentType,contentHash:report.contentHash??null});}
  return ctx.db.insert('evaluationRuns',{...args,inputs,status:'running',startedAt:Date.now()});
 }
});
export const owned=internalQuery({args:{sessionKey:v.string(),runId:v.id('evaluationRuns')},returns:v.union(v.literal('missing'),v.literal('running'),v.literal('completed')),handler:async(ctx,args)=>{const run=await ctx.db.get('evaluationRuns',args.runId);return !isSessionKey(args.sessionKey)||run?.sessionKey!==args.sessionKey?'missing':run.status==='running'?'running':'completed';}});
export const complete=internalMutation({
 args:{sessionKey:v.string(),runId:v.id('evaluationRuns'),outputStorageId:v.optional(v.id('_storage')),error:v.optional(v.string())},returns:v.boolean(),
 handler:async(ctx,{sessionKey,runId,...result})=>{const run=await ctx.db.get('evaluationRuns',runId);if(!run||run.sessionKey!==sessionKey)throw new ConvexError('Evaluation not found.');if(run.status!=='running')return false;await ctx.db.patch('evaluationRuns',runId,{...result,status:result.error?'failed':'succeeded',finishedAt:Date.now()});return true;}
});
export const finish=action({
 args:{sessionKey:v.string(),runId:v.id('evaluationRuns'),outputJson:v.optional(v.string()),error:v.optional(v.string())},returns:v.null(),
 handler:async(ctx,{sessionKey,runId,outputJson,error}):Promise<null>=>{
  const ownership=await ctx.runQuery(internal.evaluations.owned,{sessionKey,runId});
  if(ownership==='missing')throw new ConvexError('Evaluation not found in this browser.');
  if(ownership==='completed')return null;
  if((outputJson===undefined)===(error===undefined))throw new ConvexError('Provide either an output or an error.');
  if(outputJson!==undefined)JSON.parse(outputJson);
  const outputStorageId=outputJson===undefined?undefined:await ctx.storage.store(new Blob([outputJson],{type:'application/json'}));
  try{const saved=await ctx.runMutation(internal.evaluations.complete,{sessionKey,runId,...(outputStorageId?{outputStorageId}:{}),...(error!==undefined?{error:error.slice(0,10000)||'Unknown error'}:{})});if(!saved&&outputStorageId)await ctx.storage.delete(outputStorageId);return null;}
  catch(failure){if(outputStorageId)await ctx.storage.delete(outputStorageId);throw failure;}
 }
});

export const get=query({
 args:{sessionKey:v.string(),runId:v.id('evaluationRuns')},
 returns:v.union(v.null(),v.object({kind:v.union(v.literal('report-reading'),v.literal('summary')),status:v.union(v.literal('running'),v.literal('succeeded'),v.literal('failed')),reportIds:v.array(v.id('reports')),startedAt:v.number(),finishedAt:v.optional(v.number()),outputUrl:v.union(v.string(),v.null()),error:v.optional(v.string())})),
 handler:async(ctx,{sessionKey,runId})=>{
  const run=await ctx.db.get('evaluationRuns',runId);
  if(!isSessionKey(sessionKey)||!run||run.sessionKey!==sessionKey)return null;
  return {kind:run.kind,status:run.status,reportIds:run.reportIds,startedAt:run.startedAt,...(run.finishedAt!==undefined?{finishedAt:run.finishedAt}:{}),outputUrl:run.outputStorageId?await ctx.storage.getUrl(run.outputStorageId):null,...(run.error!==undefined?{error:run.error}:{})};
 }
});
