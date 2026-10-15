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
  testNameMappings: defineTable({key:v.string(),name:v.string(),unit:v.string(),specimen:v.string(),method:v.string(),status:v.string(),startedAt:v.number(),finishedAt:v.optional(v.number()),standardId:v.optional(v.string()),error:v.optional(v.string())}).index('by_key',['key']),
  visionReadings: defineTable({sessionKey:v.string(),owner:v.string(),reportIds:v.array(v.id('reports')),pages:v.number(),createdAt:v.number(),requestKey:v.optional(v.string())}).index('by_owner',['owner']).index('by_session_request',['sessionKey','requestKey']),
  visionJobs: defineTable({sessionKey:v.string(),readingId:v.id('visionReadings'),reportId:v.id('reports'),page:v.number(),status:v.union(v.literal('reading'),v.literal('succeeded'),v.literal('failed')),attempt:v.number(),createdAt:v.number(),startedAt:v.optional(v.number()),finishedAt:v.optional(v.number()),image:v.optional(v.string()),ocrDiagnostics:v.optional(v.string()),imageMetadata:v.optional(v.any()),result:v.optional(v.any()),error:v.optional(v.string())}).index('by_reading',['readingId']).index('by_reading_report_page',['readingId','reportId','page']),
  visionDaily: defineTable({owner:v.string(),day:v.string(),calls:v.number()}).index('by_owner_day',['owner','day']).index('by_day',['day']),
  visionAppDaily: defineTable({day:v.string(),pages:v.number()}).index('by_day',['day']),
  reportCounters: defineTable({sessionKey:v.string(),nextSerial:v.number()}).index("by_session",["sessionKey"]),
});
