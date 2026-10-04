import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { fileError, isSessionKey, matchesFileType } from "./fileRules.js";
import type { Id } from "./_generated/dataModel";

const http = httpRouter();
function cors(request: Request): Headers | null {
  const origin = request.headers.get("Origin");
  const allowed = ["http://localhost:5173", "http://127.0.0.1:5173",
    new URL(request.url).origin, process.env.APP_ORIGIN].filter(Boolean);
  if (origin && !allowed.includes(origin)) return null;
  const headers = new Headers({ "Cache-Control": "no-store", "Vary": "Origin",
    "X-Content-Type-Options": "nosniff" });
  if (origin) headers.set("Access-Control-Allow-Origin", origin);
  return headers;
}
function reply(message: string, status: number, headers?: Headers) {
  return new Response(JSON.stringify({ error: message }), {
    status, headers: new Headers({ ...Object.fromEntries(headers ?? []), "Content-Type": "application/json" }),
  });
}
const options = httpAction(async (_ctx, request) => {
  const headers = cors(request);
  if (!headers) return reply("This app address is not allowed.", 403);
  headers.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  headers.set("Access-Control-Allow-Headers", "Content-Type");
  return new Response(null, { status: 204, headers });
});

http.route({ path: "/reports/upload", method: "OPTIONS", handler: options });
http.route({ path: "/reports/upload", method: "POST", handler: httpAction(async (ctx, request) => {
  const headers = cors(request);
  if (!headers) return reply("This app address is not allowed.", 403);
  let form: FormData;
  try { form = await request.formData(); }
  catch { return reply("Choose a report and try uploading again.", 400, headers); }
  const sessionKey = form.get("sessionKey");
  const file = form.get("file");
  const uploadId = form.get("uploadId");
  if (typeof sessionKey !== "string" || !isSessionKey(sessionKey))
    return reply("Open the app again to start an upload session.", 401, headers);
  if (typeof uploadId !== "string" || !/^[a-f0-9-]{36}$/.test(uploadId)) return reply("Choose your reports again and retry.", 400, headers);
  if (!file || typeof file === "string") return reply("Choose a report to upload.", 400, headers);
  const error = fileError(file.size, file.type);
  if (error) return reply(error, 400, headers);
  if (!matchesFileType(new Uint8Array(await file.slice(0, 12).arrayBuffer()), file.type))
    return reply("The file contents do not match its format. Choose a valid PDF or photo.", 400, headers);
  const existing = await ctx.runQuery(internal.reports.findUpload, { sessionKey, uploadId });
  if (existing) { headers.set("Content-Type", "application/json"); return new Response(JSON.stringify({ reportId: existing }), { status: 200, headers }); }
  if (!await ctx.runQuery(internal.reports.canUpload, { sessionKey }))
    return reply("This preview supports up to 20 reports in this browser.", 409, headers);
  const name = file.name.replace(/[\u0000-\u001f\u007f]/g, "").slice(0, 200).trim() || "Untitled report";
  const storageId = await ctx.storage.store(file);
  try {
    const saved = await ctx.runMutation(internal.reports.save, {
      sessionKey, storageId, name, contentType: file.type, size: file.size, uploadId,
    });
    if (saved.reused) await ctx.storage.delete(storageId);
    headers.set("Content-Type", "application/json");
    return new Response(JSON.stringify({ reportId: saved.reportId }), { status: 201, headers });
  } catch {
    await ctx.storage.delete(storageId);
    return reply("The report could not be saved. Check your connection and try again.", 409, headers);
  }
}) });

http.route({ path: "/reports/open", method: "OPTIONS", handler: options });
http.route({ path: "/reports/open", method: "POST", handler: httpAction(async (ctx, request) => {
  const headers = cors(request);
  if (!headers) return reply("This app address is not allowed.", 403);
  let body;
  try { body = await request.json(); }
  catch { return reply("Choose a saved report to open.", 400, headers); }
  if (typeof body?.sessionKey !== "string" || !isSessionKey(body.sessionKey))
    return reply("This browser cannot open that report.", 403, headers);
  if (typeof body?.reportId !== "string") return reply("Choose a saved report to open.", 400, headers);
  let report;
  try {
    report = await ctx.runQuery(internal.reports.getOwned, {
      sessionKey: body.sessionKey, reportId: body.reportId as Id<"reports">,
    });
  } catch { return reply("Report not found in this browser.", 404, headers); }
  if (!report) return reply("Report not found in this browser.", 404, headers);
  const file = await ctx.storage.get(report.storageId);
  if (!file) return reply("This file is unavailable. Upload the original again.", 404, headers);
  headers.set("Content-Type", report.contentType);
  headers.set("Content-Disposition", `inline; filename*=UTF-8''${encodeURIComponent(report.name)}`);
  return new Response(file, { status: 200, headers });
}) });
export default http;
