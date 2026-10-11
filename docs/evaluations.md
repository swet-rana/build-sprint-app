# Report and summary evaluation records

New summary preparations create an `evaluationRuns` record for the summary and one for each report-reading attempt. This is local PDF extraction/OCR and comparison, not a remote language-model call.

Each record keeps the browser session, original report IDs, original storage IDs, filenames, content types, content hashes when available, engine label, start/end times, and running/succeeded/failed status. Successful outputs are JSON files in Convex storage referenced by `outputStorageId`. Reading outputs contain the extracted report; summary outputs contain the comparison, selected test keys and finished summary HTML. Failed attempts keep their error message. Old preparations are not reconstructed.

`evaluations.get` requires the same browser session and returns an output download URL only for that session. The Convex dashboard can inspect the table. Original files remain unchanged. A closed browser can leave a run marked running; logging/network errors are reported to the browser console and do not prevent report reading. No durable retry queue is implemented, so an offline logging attempt is not guaranteed to be recorded.

## Checks

- `npm test`: expected finished summary from the fictional fertility PDFs; logging payload/error/outage checks; existing reading and comparison checks.
- `npm run check`: backend type checking.
- `EVALUATION_TEST_CONVEX_URL=https://YOUR-DEPLOYMENT.convex.cloud node tests/evaluation-integration.mjs`: explicit live storage/access check. Uploads fictional PDFs in an isolated session, verifies full output retrieval, rejects other sessions, checks saved errors, then moves those fictional uploads to that session's trash. This tests logging transport; the finished-summary test separately runs actual PDF reading and rendering.

Expected finished results: `tests/fixtures/fertility-summary.expected.json`.
Finished summary check: `tests/finished-summary.test.mjs`.
Logging checks: `tests/evaluation-log.test.mjs` and `tests/evaluation-integration.mjs`.

Coverage currently includes one paired fertility summary. This does not prove correctness for every report format or clinical situation.
