import { internalMutation, internalQuery, query, mutation } from "./_generated/server";
import { v, ConvexError } from "convex/values";
import { fileError, isSessionKey } from "./fileRules.js";
import { cleanDetails } from "./reportDetails.js";
import type { MutationCtx } from "./_generated/server";
import type { Doc } from "./_generated/dataModel";
import { paginationOptsValidator, paginationResultValidator } from "convex/server";
const detailsValidator = v.object({ labName: v.string(), testType: v.string(), patientName: v.string(), testDate: v.string() });
const reportValidator = v.object({
  id:v.id("reports"),name:v.string(),contentType:v.string(),size:v.number(),uploadedAt:v.number(),pageCount:v.optional(v.number()),
  details:v.optional(detailsValidator),serial:v.optional(v.number()),contentHash:v.optional(v.string()),
});
const toListed = (r: Doc<"reports">) => ({id:r._id,name:r.name,contentType:r.contentType,size:r.size,uploadedAt:r._creationTime,
  ...(r.pageCount?{pageCount:r.pageCount}:{}),...(r.details?{details:r.details}:{}),...(r.serial?{serial:r.serial}:{}),...(r.contentHash?{contentHash:r.contentHash}:{})});
async function counterFor(ctx: MutationCtx, sessionKey: string) {
  const counter=await ctx.db.query("reportCounters").withIndex("by_session",q=>q.eq("sessionKey",sessionKey)).first();
  if(counter)return counter;
  const reports=await ctx.db.query("reports").withIndex("by_session",q=>q.eq("sessionKey",sessionKey)).order("asc").take(20);
  for(let i=0;i<reports.length;i++)await ctx.db.patch("reports",reports[i]._id,{serial:i+1});
  const id=await ctx.db.insert("reportCounters",{sessionKey,nextSerial:reports.length+1});
  return {_id:id,nextSerial:reports.length+1};
}
export const ensureNumbers = mutation({args:{sessionKey:v.string()},returns:v.null(),handler:async(ctx,{sessionKey})=>{
  if(!isSessionKey(sessionKey))throw new ConvexError("Invalid upload session.");
  await counterFor(ctx,sessionKey);return null;
}});

export const list = query({
  args: { sessionKey: v.string() },
  returns: v.array(reportValidator),
  handler: async (ctx, { sessionKey }) => {
    if (!isSessionKey(sessionKey)) throw new ConvexError("Open the app again to start an upload session.");
    const reports = await ctx.db.query("reports")
      .withIndex("by_session_deleted", q => q.eq("sessionKey", sessionKey).eq("deleted",undefined))
      .order("desc").take(20);
    return reports.map(toListed);
  },
});

export const updateDetails = mutation({
  args: { sessionKey: v.string(), reportId: v.id("reports"), details: detailsValidator, onlyIfMissing: v.optional(v.boolean()) },
  returns: v.null(),
  handler: async (ctx, { sessionKey, reportId, details, onlyIfMissing }) => {
    if (!isSessionKey(sessionKey)) throw new ConvexError("Invalid upload session.");
    const report = await ctx.db.get("reports", reportId);
    if (!report || report.sessionKey !== sessionKey || report.deleted) throw new ConvexError("Report not found in this browser.");
    if (onlyIfMissing && report.details) return null;
    let cleaned;
    try { cleaned = cleanDetails(details); }
    catch (error) { throw new ConvexError(error instanceof Error ? error.message : "Check the report details."); }
    await ctx.db.patch("reports", reportId, { details: cleaned });
    return null;
  },
});

export const canUpload = internalQuery({
  args: { sessionKey: v.string() },
  returns: v.boolean(),
  handler: async (ctx, { sessionKey }) => {
    if (!isSessionKey(sessionKey)) return false;
    return true;
  },
});

export const save = internalMutation({
  args: { sessionKey: v.string(), storageId: v.id("_storage"), name: v.string(),
    contentType: v.string(), size: v.number(), uploadId: v.string(), contentHash:v.optional(v.string()) },
  returns: v.object({ reportId: v.id("reports"), reused: v.boolean() }),
  handler: async (ctx, args) => {
    if (!isSessionKey(args.sessionKey)) throw new ConvexError("Invalid upload session.");
    const existing = await ctx.db.query("reports").withIndex("by_session_upload", q => q.eq("sessionKey", args.sessionKey).eq("uploadId", args.uploadId)).first();
    if (existing) return { reportId: existing._id, reused: true };
    const error = fileError(args.size, args.contentType);
    if (error) throw new ConvexError(error);
    const counter=await counterFor(ctx,args.sessionKey);
    const serial=counter.nextSerial;
    await ctx.db.patch("reportCounters",counter._id,{nextSerial:serial+1});
    return { reportId: await ctx.db.insert("reports", {...args,serial}), reused: false };
  },
});

export const getOwned = internalQuery({
  args: { sessionKey: v.string(), reportId: v.id("reports") },
  returns: v.union(v.null(), v.object({ storageId: v.id("_storage"),
    name: v.string(), contentType: v.string() })),
  handler: async (ctx, { sessionKey, reportId }) => {
    if (!isSessionKey(sessionKey)) return null;
    const report = await ctx.db.get("reports", reportId);
    if (!report || report.sessionKey !== sessionKey || report.deleted) return null;
    return { storageId: report.storageId, name: report.name, contentType: report.contentType };
  },
});

export const findUpload = internalQuery({
  args: { sessionKey: v.string(), uploadId: v.string() },
  returns: v.union(v.null(), v.id("reports")),
  handler: async (ctx, { sessionKey, uploadId }) => {
    if (!isSessionKey(sessionKey)) return null;
    const report = await ctx.db.query("reports").withIndex("by_session_upload", q => q.eq("sessionKey", sessionKey).eq("uploadId", uploadId)).first();
    return report?._id ?? null;
  },
});

export const setContentHash = mutation({
 args:{sessionKey:v.string(),reportId:v.id("reports"),contentHash:v.string()},returns:v.null(),
 handler:async(ctx,{sessionKey,reportId,contentHash})=>{
  if(!isSessionKey(sessionKey)||!/^[a-f0-9]{64}$/.test(contentHash))throw new ConvexError("Invalid report fingerprint.");
  const report=await ctx.db.get("reports",reportId);
  if(!report||report.sessionKey!==sessionKey||report.deleted)throw new ConvexError("Report not found in this browser.");
  if(!report.contentHash)await ctx.db.patch("reports",reportId,{contentHash});return null;
 }
});
export const trash = query({args:{sessionKey:v.string(),paginationOpts:paginationOptsValidator},returns:paginationResultValidator(reportValidator),handler:async(ctx,{sessionKey,paginationOpts})=>{
 if(!isSessionKey(sessionKey))throw new ConvexError("Invalid upload session.");
 const reports=await ctx.db.query("reports").withIndex("by_session_deleted",q=>q.eq("sessionKey",sessionKey).eq("deleted",true)).order("desc").paginate(paginationOpts);
 return {...reports,page:reports.page.map(toListed)};
}});
export const setDeleted = mutation({
 args:{sessionKey:v.string(),reportId:v.id("reports"),deleted:v.boolean()},returns:v.null(),
 handler:async(ctx,{sessionKey,reportId,deleted})=>{
  if(!isSessionKey(sessionKey))throw new ConvexError("Invalid upload session.");
  const report=await ctx.db.get("reports",reportId);
  if(!report||report.sessionKey!==sessionKey)throw new ConvexError("Report not found in this browser.");
  await counterFor(ctx,sessionKey);
  await ctx.db.patch("reports",reportId,{deleted:deleted?true:undefined});return null;
 }
});

export const listPage = query({
 args:{sessionKey:v.string(),paginationOpts:paginationOptsValidator},
 returns:paginationResultValidator(reportValidator),
 handler:async(ctx,{sessionKey,paginationOpts})=>{
  if(!isSessionKey(sessionKey))throw new ConvexError("Invalid upload session.");
  const result=await ctx.db.query("reports").withIndex("by_session_deleted",q=>q.eq("sessionKey",sessionKey).eq("deleted",undefined)).order("desc").paginate(paginationOpts);
  return {...result,page:result.page.map(toListed)};
 }
});

export const setPageCount=mutation({
 args:{sessionKey:v.string(),reportId:v.id('reports'),pageCount:v.number()},returns:v.null(),
 handler:async(ctx,{sessionKey,reportId,pageCount})=>{
  if(!isSessionKey(sessionKey))throw new ConvexError('Invalid upload session.');
  const report=await ctx.db.get('reports',reportId);
  if(!report||report.sessionKey!==sessionKey||report.deleted)throw new ConvexError('Report not found in this browser.');
  if(!Number.isSafeInteger(pageCount)||pageCount<1)throw new ConvexError('Invalid report page count.');
  if(report.pageCount!==pageCount)await ctx.db.patch('reports',reportId,{pageCount});
  return null;
 }
});
