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
