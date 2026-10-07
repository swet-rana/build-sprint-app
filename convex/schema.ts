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
  reportCounters: defineTable({sessionKey:v.string(),nextSerial:v.number()}).index("by_session",["sessionKey"]),
});
