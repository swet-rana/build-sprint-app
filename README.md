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

Health-category blocks filter both comparable and unmatched results using common Indian lab-panel groups. Clicking a category selects all its comparable tests and clears other summary selections. Printing continues across multiple pages when needed. Shared tests can appear in multiple groups; unknown tests remain in Other tests. Mapping sources are documented in references/health-categories.md.
