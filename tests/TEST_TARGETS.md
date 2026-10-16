# Test deployment safety

Standalone integration and diagnostic scripts default to development:
`https://elegant-schnauzer-503.convex.cloud`.

Use `--convex-url URL` (or `--convex-url=URL`) to select a target.
The script-specific environment variable is also supported, followed by
`TEST_CONVEX_URL`, `VITE_CONVEX_URL`, and `CONVEX_URL`. The scripts do not
silently take a production target from `.env.local`.

Production requires the literal `--allow-prod` argument. Unknown deployments
are rejected. Local-only diagnostics validate an explicitly supplied target
but still do their work locally.

The phone HTML harnesses check their configured backend and page origin
before importing app code or loading the nested harness. Their explicit
browser flag is `?--allow-prod`, propagated to the nested frame.

`report-viewer.browser.mjs` is always dev-only, including with `--allow-prod`.
It creates its own fictional fixture upload and isolated browser context;
it never opens the first report in a real user's browser session.

`node tests/check-production-refusals.mjs` checks every standalone entry point
against production without the permission flag. Child-process network access
is blocked. The HTML module guards are executed locally, before app imports.
Ordinary `npm test` uses local fixtures and mocked transports, not live data.

`tests/vision-reconnect-browser.html` is dev-only and uses the fictional three-page
`vision-reconnect-multipage.pdf`. Its close-during-read button opens a reading tab
that closes itself as soon as the saved job query says `reading`. The observer tab
never starts an action. Reopen the normal harness URL to restore the saved result.
`vision-reconnect-observe.mjs --receipt <fictional-receipt.json>` queries that job
while the reading tab is closed. Both refuse production, even with `--allow-prod`.
No provider key is used by either test client.

`vision-retry-browser.html` is dev-only. It reads a fictional four-page scan plus
an existing fictional text PDF through the actual Summary screen. The first
page-4 request deliberately supplies invalid OCR diagnostics to force a stored
failure before provider spending. Tap the real Try again button: page 3 stays
at attempt 1, page 4 succeeds at attempt 2, and the actual summary is displayed.
The test never modifies an API key, prompt, model, spend counter, or cap.

`vision-report-identity-browser.html` is dev-only. Its fictional scanned PDF has
identity on the cover alone and separate results on pages 2 and 3. It checks
that actual vision jobs return missing identity on those result pages, while
whole-report reading retains their known results and completes comparison.
Its output prints counts and status only, with no names, dates or medical values.

`scan-highlight-browser.html` is dev-only. It uploads a fictional scanned PDF
with a same-name section heading above its result row, opens the actual viewer,
and checks that local OCR boxes enclose the result row. Its second button checks
that an unmatched name opens the page without a highlight. It makes no AI calls.

`unitless-ratio-integration.mjs` defaults to development and refuses production
without `--allow-prod`. It uploads one fictional image-only PDF, checks existing
OCR screening, schedules an actual server vision job, and verifies unitless ratio
acceptance and unit-sensitive comparison. Output contains counts and reasons only.

`name-variants-integration.mjs` defaults to development and refuses production
without `--allow-prod`. It reads a fictional three-page image-only PDF through
local OCR screening and real scheduled vision jobs. It checks name variants,
labelled referrer exclusion, unchanged known results and page-specific rejection
of a clearly different person. Output contains counts and reasons only.

`specimen-browser.html` is dev-only. It uploads two fictional image-only PDFs
with separate urine and stool pages on two dates, reads them through the actual
Summary workflow and scheduled vision jobs, and checks all printed numeric,
written and ranged results, specimen separation, Other tests placement and source
links. It never uploads real reports or prints their values.

`vision-limits-browser.html` is development-only. It reads fictional PDFs on dev, then simulates a daily-cap transport response without changing the shared quota counter.

`page-coverage-browser.html` is development-only and uses fictional mixed PDFs. Its second preparation omits text-page display notes from the returned cache clone to check older-reading compatibility; it never changes cached results.

`vision-throughput.mjs` is dev-only and builds a fictional 27-page PDF in memory. It checks the unchanged 18 skipped pages and six vision pages, single-worker OCR, OCR/vision overlap and the three-page vision concurrency bound.

`hits-misses-browser.html` is dev-only: fictional one/two-report summaries and a simulated smart-writing failure. It never uses real reports.
