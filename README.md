# Health history

Upload original blood reports (PDF, JPG, PNG or WebP, up to 10 MB each) and open saved files. A separate sample view compares fictional March and September 2025 results.

## Run locally

1. Run `npm install`.
2. Run `npx convex dev --once` against the existing Convex development project. This creates `.env.local`; the frontend needs `VITE_CONVEX_URL`, as shown in `.env.example`.
3. Run `npm run dev` and open the local address shown in the terminal.

`npm run build` produces the frontend in `dist/`. The frontend has not been published; backend functions are running on the existing Convex development deployment.

## Storage and access

Reports are saved in Convex with a random, browser-specific access key held in local storage. Listings and opening files require that key; direct public file URLs are not returned. The app fetches original files through a protected Convex HTTP action, then opens a temporary local browser URL. Clearing browser data loses access. Sign-in and cross-device access are not built yet.

The preview supports 20 files per browser. File type, size, and format headers are checked on the server; this does not verify that a document is medical or extract any results. A retry of the same pending upload reuses its upload ID to prevent duplicates.

My summary reads two or three text-readable Apollo or Tata 1mg PDFs with dated blood-test tables and compares tests only when their names and units match. Within one lab, patient IDs must agree; across these labs, patient names must agree because their IDs are different. Choose any number of tests for the printable summary; all matching results and results without a match remain available below it. Each result links to its original report page. Reports are ordered by collection date. Tests appearing in at least two selected reports are compared; missing values are marked Not reported and chart lines stop at gaps. Changes use the first and last available values, with their dates shown. Photos, scanned-only PDFs, and other table layouts are not supported yet.

The comparison shows recorded changes and printed reference ranges, without diagnoses. Check the draft against the originals before sharing. Extracted results stay in browser memory; after refreshing, prepare the summary again. Original uploads remain saved in Convex. Sign-in and Convex static hosting remain to be built.

## Checks

- `npm test` checks supported file types, size limits, format headers and access key shape.
- `npm run check` checks Convex code types.
- `npm run test:storage` checks upload, original bytes, browser isolation, retry behavior and invalid files against the configured development deployment. Each run creates one small fictional report under an isolated random access key. It never reads personal reports.

Browser verification covered desktop/mobile upload layouts and persistence after reload. File-storage integration checks confirmed opening the original fixture without changing its bytes.

Health-category blocks filter both comparable and unmatched results using common Indian lab-panel groups. Clicking a category selects all its tests and clears other summary selections. Printing continues across multiple pages when needed. Shared tests can appear in multiple groups; unknown tests remain in Other tests. Mapping sources are documented in references/health-categories.md.

Category selection includes tests without a matching result or unit. These tests are selectable individually and printable with recorded dates, values, reference ranges and source pages. They show a single-report label without a trend line or calculated change. Different units remain separate.

Test matching uses checked equivalent-name aliases, with the original printed name shown beside each summary value when different. Numeric units and distinct test conditions remain separate. The alias rules and sources are recorded in references/test-name-matching.md.

My reports now includes lab, person, test type and test date, with an inline Edit details form. Supported PDFs supply patient and collection date, explicit recognized lab branding, and blood-test groups derived from their readable results. Unknown details stay blank and can be entered manually; details are browsing labels and do not change the source PDF or comparison rules. Existing uploads are read when the report list loads. Connection failures can be retried by reloading.

Test type uses short descriptions such as Comprehensive blood tests. The serial/duplicate/delete update gives each report a stable number, compares exact file contents (SHA-256), and marks duplicates using the earliest active report's number. Delete moves a report to a paginated, live Deleted reports section with Restore; originals remain stored. Active uploads are still capped at 20; restoring at that limit requires making room first. Deleted reports cannot be opened or included in comparisons. The user activated this backend update; the browser showed report #4 as a duplicate of #3 and enabled Delete. Actual deletion and restoration still need a fixture-based browser check.

My Reports uses the Premium Cards direction from the local Reports-design reference: a lavender report surface, white cards, real first-page previews, indigo Open report buttons, and three-dot Edit/Delete menus. Search covers filenames, lab, patient, test type, date and serial. Filters separate blood-test descriptions from photo files. Upload opens the existing inline form. The layout is scoped to My Reports; comparison and sample views retain their existing appearance. Desktop and 390px phone views, search, filters, upload toggle, inline editor and all four real previews were checked in the browser.

Verified in the browser on 6 October 2026 after the user updated Convex: all four existing report rows populated, the details editor saved successfully, and saved details remained after refresh. Desktop and 390px phone layouts were checked without horizontal overflow. The command-line storage integration check could not run because this session still cannot reach Convex; its ownership and persistence assertions remain available for the next unrestricted run.

My Reports selection: middle-right “For summary” checkboxes carry selected IDs into My Summary, stored in this browser. Summary lists serial, short type, lab, person, date and duplicate notice; no automatic report selection. At least two text-readable PDFs required; the former three-report maximum is removed (up to the current 20 saved reports). Duplicate dates and different people still fail validation; selecting an exact duplicate with its original produces an early warning. Changing selections clears the draft and prevents an older in-flight reading from publishing. Deleted reports are removed from selection. Results wrap across rows for larger selections. Automated comparison checks cover 4 and 20 reports.

My Summary now shares My Reports’ Premium Cards styling through src/summary.css: Public Sans, lavender surface, indigo actions/charts, white rounded cards and matching category controls/tables. This supersedes the earlier clinical-blue description for the interactive My Summary view; print and Sample summary retain their established styles. Browser verified successful analysis (current two selected PDFs, 27 matching tests), category selection, desktop and 390px phone views with no horizontal overflow. Reviewer passed; 27 tests, type check, build pass, detector clean. Screenshots: .impeccable/review/premium-summary-desktop.png and premium-summary-mobile.png.

Photo and scanned-PDF reading now uses local Tesseract assets (this supersedes earlier notes that photos/scans are unsupported). Install dependencies, then npm run dev or npm run build prepares assets automatically. Clear upright English blood reports with printed patient, collection date and numeric test/result/unit/reference columns are supported; unreadable or uncertain data produces a reading error. The original file stays uploaded. Recognized values must be checked against the originals. npm run test:ocr checks real recognition with fictional photo, image-only PDF and unreadable fixtures. No external recognition service is used.

If only some scanned PDF pages lack readable supported blood tables, the summary shows a reading-error notice and lists excluded page numbers under “What was included”. A file with no readable dated results fails instead of producing a summary. Low-confidence result rows also fail. Photo/scanned recognition test passes; fresh browser test uploads were not verified because file-picker permission was declined.
