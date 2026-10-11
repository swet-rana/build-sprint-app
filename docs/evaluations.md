# Report and summary evaluation records

New summary preparations create an `evaluationRuns` record for the summary and one for each report-reading attempt. This is local PDF extraction/OCR and comparison, not a remote language-model call.

Each record keeps the browser session, original report IDs, original storage IDs, filenames, content types, content hashes when available, engine label, start/end times, and running/succeeded/failed status. Successful outputs are JSON files in Convex storage referenced by `outputStorageId`. Reading outputs contain the extracted report; summary outputs contain the comparison, selected test keys and finished summary HTML. Failed attempts keep their error message. Old preparations are not reconstructed.

`evaluations.get` requires the same browser session and returns an output download URL only for that session. The Convex dashboard can inspect the table. Original files remain unchanged. Pending inputs and completed outputs are saved in this browser’s IndexedDB and retried after 1, 2, 4, 8, 16, 32, then at most every 60 seconds. Going online or reopening the app also resumes delivery. A per-session retry key reuses the same Convex record, and completed outputs are never overwritten by retries. Logging failures are reported to the browser console and do not prevent report reading. Clearing browser data removes pending records. If browser storage is unavailable, retries continue in memory but cannot survive closing the page. Closing before report reading finishes can leave a running record without an output; retries cannot recreate an unfinished analysis.

## Checks

- `npm test`: expected finished summaries from fictional fertility, blood, semen, cross-lab, scanned and mixed text/scan PDFs; logging payload/error/outage, retry timing, reopening and session-isolation checks; existing reading and comparison checks.
- `npm run check`: backend type checking.
- `EVALUATION_TEST_CONVEX_URL=https://YOUR-DEPLOYMENT.convex.cloud node tests/evaluation-integration.mjs`: explicit live storage/access check. Uploads fictional PDFs in an isolated session, verifies full output retrieval, repeated-start and repeated-finish behavior, rejects other sessions, checks saved errors, then moves those fictional uploads to that session's trash. This tests logging transport; the finished-summary test separately runs actual PDF reading and rendering.

Expected finished results: `tests/fixtures/{fertility,blood,semen,crosslab,scanned,mixed}-summary.expected.json`.
Sample PDFs: `tests/fixtures/{fertility,blood,semen}-sample-{january,july}.pdf`.
Recreate the blood and semen fixtures with `scripts/create-summary-eval-fixtures.py` in a tooling environment with reportlab installed (no app dependency added).
Finished summary check: `tests/finished-summary.test.mjs`.
Logging checks: `tests/evaluation-log.test.mjs` and `tests/evaluation-integration.mjs`.

Coverage includes fertility, blood, semen, two lab brands with different test labels, image-only scanned PDFs, and mixed native/scanned report pairs. Checks cover a missing blood result, correct physical source pages and both directions of normal-range transitions. The scan checks run real PDF rendering and Tesseract recognition with Node worker paths/canvas transport; medical parsing, comparison and summary rendering use production code. No OCR output is mocked. Sample lab branding and values are fictional software fixtures, not evidence of compatibility with all real reports from those labs. This does not prove correctness for every report format or clinical situation.

Scanned fixtures come from `scripts/create-ocr-fixtures.mjs`: copy `tmp/ocr-fixtures/{first,second}-scanned.pdf` to `tests/fixtures/scanned-sample-{early,late}.pdf`. OCR evals use the installed English data locally, with no remote recognition call.
