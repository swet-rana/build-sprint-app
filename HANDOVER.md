# Project handover

Updated: 5 October 2026. Read this first in a new chat, then read `PRODUCT.md` and `README.md`.

## Goal and working features

Health history helps someone share blood-test history with a doctor, with recorded values, reference ranges, trends and links to original reports. It must not diagnose.

- Upload originals to Convex and compare 2 or 3 text-readable Apollo/Tata 1mg PDFs from different dates for the same person.
- The blood-report summary appears above the comparable-results table and the unmatched-results table. Both use table layouts.
- Clickable health categories select every test in that category, including unmatched tests, and deselect all others.
- Test selection has Select none and no six-test limit. Printed summaries can span multiple pages.
- Equivalent names such as CHOLESTEROL -LDL and LDL CHOLESTEROL match through explicit aliases. Original names remain visible; different units and distinct test conditions remain separate.
- Unmatched tests can be selected and printed with source values; they have no invented trend or calculated change.

## Files and checks

- `src/analysis.js`: comparison, category selection, summary and printing.
- `src/lab-parser.js`, `src/test-names.js`: PDF extraction and equivalent-name matching.
- `src/health-categories.js`, `src/summary-tests.js`: category mapping and summary markers.
- `src/uploads.js`, `convex/`: original-file storage and protected access.
- `src/style.css`: layout and print styles.
- `references/health-categories.md` and `references/test-name-matching.md`: mapping rules and sources.

Previous checks: 18 tests passed; Convex type check and frontend build passed. Browser checks covered three-report analysis, category selection, unmatched tests, summary order, mobile layout and printing. These checks were completed before this handover; rerun after code changes.

## Access and limits

Project folder: `/Users/swetrana/build-sprint-app`. Start locally with `npm run dev` and use the address it prints (previously `http://localhost:5173`). To resume a terminal chat, run `codex resume` in this folder.

Original uploads persist in Convex. Access depends on a key stored in the same browser profile; clearing browser data loses access. Extracted comparisons are held in memory, so prepare the summary again after refresh. Sign-in and cross-device access are not built. Scanned PDFs/photos can be stored but cannot yet be analyzed.

Code is saved on `main` and backed up to the private GitHub repository https://github.com/swet-rana/build-sprint-app (`origin`). Latest app checkpoint: `fc70493` (summary above both result tables). After future checked changes, commit and run `git push` to update the online backup. The frontend is not published; the Convex development backend is running. `package.json` has no deploy command yet.

## Next work and rules

Suggested next step: set up Convex static hosting, add `npm run deploy`, deploy and check the live page. Use the Convex static-hosting skill for hosting work.

Use Codex for code, GitHub for code backup, and Convex for backend, database, sign-in and hosting. A Git push does not deploy this project. Use plain words, announce actions briefly, and check changes before calling them done.

Product notes and `skills-lock.json` are backed up. Installed `.agents/` skills, private reference PDFs/images, access keys and `.env.local` stay local and are excluded from Git. Preserve local files. This file summarizes project state, not the full conversation.
