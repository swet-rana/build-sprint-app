import { internalMutation, internalQuery, query } from "./_generated/server";
import { v, ConvexError } from "convex/values";
import { fileError, isSessionKey, MAX_REPORTS } from "./fileRules.js";

export const list = query({
  args: { sessionKey: v.string() },
  returns: v.array(v.object({
    id: v.id("reports"), name: v.string(), contentType: v.string(),
    size: v.number(), uploadedAt: v.number(),
  })),
  handler: async (ctx, { sessionKey }) => {
    if (!isSessionKey(sessionKey)) throw new ConvexError("Open the app again to start an upload session.");
    const reports = await ctx.db.query("reports")
      .withIndex("by_session", q => q.eq("sessionKey", sessionKey))
      .order("desc").take(MAX_REPORTS);
    return reports.map(r => ({ id: r._id, name: r.name, contentType: r.contentType,
      size: r.size, uploadedAt: r._creationTime }));
  },
});

export const canUpload = internalQuery({
  args: { sessionKey: v.string() },
  returns: v.boolean(),
  handler: async (ctx, { sessionKey }) => {
    if (!isSessionKey(sessionKey)) return false;
    const reports = await ctx.db.query("reports")
      .withIndex("by_session", q => q.eq("sessionKey", sessionKey)).take(MAX_REPORTS);
    return reports.length < MAX_REPORTS;
  },
});

export const save = internalMutation({
  args: { sessionKey: v.string(), storageId: v.id("_storage"), name: v.string(),
    contentType: v.string(), size: v.number(), uploadId: v.string() },
  returns: v.object({ reportId: v.id("reports"), reused: v.boolean() }),
  handler: async (ctx, args) => {
    if (!isSessionKey(args.sessionKey)) throw new ConvexError("Invalid upload session.");
    const existing = await ctx.db.query("reports").withIndex("by_session_upload", q => q.eq("sessionKey", args.sessionKey).eq("uploadId", args.uploadId)).first();
    if (existing) return { reportId: existing._id, reused: true };
    const error = fileError(args.size, args.contentType);
    if (error) throw new ConvexError(error);
    const reports = await ctx.db.query("reports")
      .withIndex("by_session", q => q.eq("sessionKey", args.sessionKey)).take(MAX_REPORTS);
    if (reports.length >= MAX_REPORTS) throw new ConvexError("This preview supports up to 20 reports in this browser.");
    return { reportId: await ctx.db.insert("reports", args), reused: false };
  },
});

export const getOwned = internalQuery({
  args: { sessionKey: v.string(), reportId: v.id("reports") },
  returns: v.union(v.null(), v.object({ storageId: v.id("_storage"),
    name: v.string(), contentType: v.string() })),
  handler: async (ctx, { sessionKey, reportId }) => {
    if (!isSessionKey(sessionKey)) return null;
    const report = await ctx.db.get("reports", reportId);
    if (!report || report.sessionKey !== sessionKey) return null;
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
