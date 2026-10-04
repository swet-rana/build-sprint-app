import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  reports: defineTable({
    sessionKey: v.string(),
    storageId: v.id("_storage"),
    name: v.string(),
    contentType: v.string(),
    size: v.number(),
    uploadId: v.optional(v.string()),
  }).index("by_session", ["sessionKey"]).index("by_session_upload", ["sessionKey", "uploadId"]),
});
