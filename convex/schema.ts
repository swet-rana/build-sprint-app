import { authTables } from "@convex-dev/auth/server";
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  ...authTables,
  reports: defineTable({
    sessionKey: v.string(),
    storageId: v.id("_storage"),
    name: v.string(),
    contentType: v.string(),
    size: v.number(),
    uploadId: v.optional(v.string()),
    serial: v.optional(v.number()),
    contentHash: v.optional(v.string()),
    deleted: v.optional(v.boolean()),
    details: v.optional(v.object({ labName: v.string(), testType: v.string(), patientName: v.string(), testDate: v.string() })),
  }).index("by_session", ["sessionKey"]).index("by_session_upload", ["sessionKey", "uploadId"]).index("by_session_deleted", ["sessionKey", "deleted"]),
  evaluationRuns: defineTable({
    sessionKey:v.string(),kind:v.union(v.literal('report-reading'),v.literal('summary')),
    reportIds:v.array(v.id('reports')),engine:v.string(),runKey:v.optional(v.string()),
    inputs:v.array(v.object({reportId:v.id('reports'),storageId:v.id('_storage'),name:v.string(),contentType:v.string(),contentHash:v.union(v.string(),v.null())})),
    status:v.union(v.literal('running'),v.literal('succeeded'),v.literal('failed')),
    startedAt:v.number(),finishedAt:v.optional(v.number()),outputStorageId:v.optional(v.id('_storage')),error:v.optional(v.string()),
  }).index('by_session',['sessionKey']).index('by_session_run',['sessionKey','runKey']),
  visionReadings: defineTable({sessionKey:v.string(),owner:v.string(),reportIds:v.array(v.id('reports')),pages:v.number(),createdAt:v.number()}).index('by_owner',['owner']),
  visionDaily: defineTable({owner:v.string(),day:v.string(),calls:v.number()}).index('by_owner_day',['owner','day']),
  reportCounters: defineTable({sessionKey:v.string(),nextSerial:v.number()}).index("by_session",["sessionKey"]),
});
